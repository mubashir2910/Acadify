'use client'

/**
 * PlaybookBook — the interactive "Acadify Playbook".
 *
 * One state machine, two layouts:
 *   • Desktop (lg+, "2up"): a two-page spread. The stage always reserves the
 *     open landscape footprint; the closed cover is just a portrait leaf
 *     painted on the RIGHT half and translated to centre. "Opening" is simply
 *     paginate(1) — the cover leaf flips left over the spine. A page turn
 *     flips one half-sheet over the spine (right→left forward, left→right back).
 *   • Mobile (<lg, "1up"): a single full page that flips around its left edge,
 *     each page showing the chapter copy with the image as a thumbnail below.
 *
 * Only ever two pages (≤ four half-faces) are mounted: a static "base" beneath
 * and a single rotating "flipper". The grounding shadow is kept OUTSIDE the
 * preserve-3d node — a CSS filter on a preserve-3d element flattens the 3D.
 */

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
    CHAPTER_COUNT,
    LAST_PAGE,
    playbookPages,
    type PlaybookPage,
} from './playbook-data'
import {
    ChapterImage,
    ChapterText,
    PaperBack,
    PlaybookBackCover,
    PlaybookCover,
    Ribbon,
} from './playbook-faces'

const PAGE_DURATION = 0.7
const PAGE_EASE = [0.645, 0.045, 0.355, 1] as const

type Turning = { dir: 1 | -1; target: number }
type Half = 'left' | 'right'

// ---- face selectors --------------------------------------------------------

/** Content for one half of a spread (desktop 2up). */
function spreadHalf(index: number, half: Half): ReactNode {
    const page: PlaybookPage = playbookPages[index]
    if (page.kind === 'cover') return half === 'right' ? <PlaybookCover /> : null
    // The closing back cover is a single centred leaf on the LEFT; right is empty.
    if (page.kind === 'cta') return half === 'left' ? <PlaybookBackCover /> : null
    return half === 'left' ? (
        <ChapterText chapter={page.chapter} spineSide="right" />
    ) : (
        <ChapterImage chapter={page.chapter} spineSide="left" />
    )
}

/** Content for a full page (mobile 1up). */
function fullPage(index: number): ReactNode {
    const page: PlaybookPage = playbookPages[index]
    if (page.kind === 'cover') return <PlaybookCover />
    if (page.kind === 'cta') return <PlaybookBackCover />
    return <ChapterText chapter={page.chapter} spineSide="left" withThumbnail />
}

function announcement(index: number): string {
    const page = playbookPages[index]
    if (page.kind === 'cover') return 'Playbook cover. Press Enter to open.'
    if (page.kind === 'cta') return 'Final page. Ready to level up?'
    return `Page ${page.chapter.chapterNo} of ${CHAPTER_COUNT}: ${page.chapter.title}.`
}

// ---------------------------------------------------------------------------

export default function PlaybookBook() {
    const rootRef = useRef<HTMLDivElement>(null)
    const inView = useInView(rootRef, { once: true, amount: 0.3 })
    const reduce = useReducedMotion()

    const [current, setCurrent] = useState(0)
    const [turning, setTurning] = useState<Turning | null>(null)
    const [mode, setMode] = useState<'1up' | '2up'>('1up')

    // Keep a live ref so the resize listener can read `turning` without re-binding.
    const turningRef = useRef<Turning | null>(null)
    useEffect(() => {
        turningRef.current = turning
    }, [turning])

    // Responsive mode (client-only). Never switch geometry mid-flip.
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        setMode(mq.matches ? '2up' : '1up')
        const onChange = () => {
            if (!turningRef.current) setMode(mq.matches ? '2up' : '1up')
        }
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    const paginate = useCallback(
        (dir: 1 | -1) => {
            if (turning) return
            const target = current + dir
            if (target < 0 || target > LAST_PAGE) return
            // Reduced motion: skip the flip, swap instantly (nav still reaches CTA).
            if (reduce) {
                setCurrent(target)
                return
            }
            setTurning({ dir, target })
        },
        [turning, current, reduce],
    )

    const onFlipDone = useCallback(() => {
        if (!turning) return
        setCurrent(turning.target)
        setTurning(null)
    }, [turning])

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            paginate(1)
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            paginate(-1)
        } else if ((e.key === 'Enter' || e.key === ' ') && current === 0) {
            e.preventDefault()
            paginate(1)
        }
    }

    const isOpen = current > 0 || turning !== null

    return (
        <div
            ref={rootRef}
            className="flex w-full flex-col items-center"
        >
            <motion.div
                className="relative [perspective:2200px]"
                initial={
                    reduce
                        ? { opacity: 0 }
                        : { opacity: 0, y: 140, rotateX: 14, scale: 0.93 }
                }
                animate={
                    inView
                        ? reduce
                            ? { opacity: 1 }
                            : { opacity: 1, y: 0, rotateX: 0, scale: 1 }
                        : undefined
                }
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                role="group"
                aria-roledescription="book"
                aria-label="The Acadify Playbook — interactive feature tour"
                tabIndex={0}
                onKeyDown={onKeyDown}
            >
                {mode === '2up'
                    ? renderTwoUp({ current, turning, paginate, onFlipDone })
                    : renderOneUp({ current, turning, paginate, onFlipDone })}

                {/* Desktop arrows — page-turn controls in the spread corners. */}
                {mode === '2up' && (
                    <Arrows
                        current={current}
                        turning={turning}
                        paginate={paginate}
                    />
                )}
            </motion.div>

            {/* Mobile arrows + shared dots indicator. */}
            <div className="mt-8 flex items-center gap-6">
                {mode === '1up' && (
                    <ArrowButton
                        dir={-1}
                        disabled={current === 0 || turning !== null}
                        onClick={() => paginate(-1)}
                    />
                )}
                <Dots current={current} />
                {mode === '1up' && (
                    <ArrowButton
                        dir={1}
                        disabled={current === LAST_PAGE || turning !== null}
                        onClick={() => paginate(1)}
                    />
                )}
            </div>

            <div aria-live="polite" className="sr-only">
                {turning ? '' : announcement(current)}
            </div>

            {!isOpen && (
                <p className="mt-3 text-sm text-gray-400">
                    Tap the cover to open the playbook
                </p>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Desktop: two-page spread
// ---------------------------------------------------------------------------

type RenderArgs = {
    current: number
    turning: Turning | null
    paginate: (dir: 1 | -1) => void
    onFlipDone: () => void
}

function renderTwoUp({ current, turning, paginate, onFlipDone }: RenderArgs) {
    const dir = turning?.dir
    // The book has two "closed" states: the front cover (right-half leaf, shifted
    // to centre) and the back cover (left-half leaf, shifted to centre). The
    // spread (both pages) is only shown in between.
    const closedFront = turning ? turning.target === 0 : current === 0
    const closedBack = turning ? turning.target === LAST_PAGE : current === LAST_PAGE
    const spreadOpen = !closedFront && !closedBack

    // Static base halves revealed beneath the flipping sheet.
    const baseLeftIdx = !turning ? current : dir === 1 ? current : current - 1
    const baseRightIdx = !turning ? current : dir === 1 ? current + 1 : current

    // The single flipping half-sheet.
    let flipRegion: Half | null = null
    let flipFront: ReactNode = null
    let flipBack: ReactNode = null
    let flipTo = 0
    if (turning) {
        if (dir === 1) {
            flipRegion = 'right'
            flipFront = spreadHalf(current, 'right')
            flipBack = spreadHalf(current + 1, 'left')
            flipTo = -180
        } else {
            flipRegion = 'left'
            flipFront = spreadHalf(current, 'left')
            flipBack = spreadHalf(current - 1, 'right')
            flipTo = 180
        }
    }

    return (
        <div className="relative aspect-[3/2] w-[min(48vw,600px)]">
            {/* Grounding shadow — outside the 3D context. Book stays centred in
                both closed and open states, so a static shadow aligns with both. */}
            <div className="pointer-events-none absolute inset-x-[15%] bottom-3 top-10 -z-10 rounded-[2rem] bg-slate-900/25 blur-2xl" />

            {/* Centring wrapper: shifts the right-half cover to centre when closed. */}
            <motion.div
                className="absolute inset-0 [transform-style:preserve-3d]"
                animate={{ x: closedFront ? '-25%' : closedBack ? '25%' : '0%' }}
                transition={{ duration: PAGE_DURATION, ease: PAGE_EASE }}
            >
                {/* Base left half */}
                <div className="absolute inset-y-0 left-0 w-1/2 [transform-style:preserve-3d]" style={{ zIndex: 1 }}>
                    <div className="absolute inset-0 [backface-visibility:hidden]">
                        {spreadHalf(baseLeftIdx, 'left')}
                    </div>
                </div>
                {/* Base right half */}
                <div className="absolute inset-y-0 right-0 w-1/2 [transform-style:preserve-3d]" style={{ zIndex: 1 }}>
                    <div className="absolute inset-0 [backface-visibility:hidden]">
                        {spreadHalf(baseRightIdx, 'right')}
                    </div>
                </div>

                {/* Spine gutter + ribbon (open spread only) */}
                {spreadOpen && (
                    <>
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-y-0 left-1/2 z-[2] w-16 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.09)_46%,rgba(0,0,0,0.13)_50%,rgba(0,0,0,0.09)_54%,transparent)]"
                        />
                        <Ribbon className="left-1/2 z-[3] -translate-x-1/2" />
                    </>
                )}

                {/* Flipping half-sheet */}
                {turning && (
                    <motion.div
                        key={`flip-${current}-${dir}`}
                        className={`absolute inset-y-0 w-1/2 [transform-style:preserve-3d] ${
                            flipRegion === 'right'
                                ? 'right-0 origin-left'
                                : 'left-0 origin-right'
                        }`}
                        style={{ zIndex: 5 }}
                        initial={{ rotateY: 0 }}
                        animate={{ rotateY: flipTo }}
                        transition={{ duration: PAGE_DURATION, ease: PAGE_EASE }}
                        onAnimationComplete={onFlipDone}
                    >
                        <div className="absolute inset-0 [backface-visibility:hidden]">
                            {flipFront}
                        </div>
                        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                            {flipBack}
                        </div>
                        {/* Travelling page-curl shade */}
                        <motion.div
                            className="pointer-events-none absolute inset-0 rounded-lg bg-black"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.3, 0] }}
                            transition={{ duration: PAGE_DURATION, ease: 'easeInOut' }}
                        />
                    </motion.div>
                )}

                {/* Clickable front cover (closed only) */}
                {closedFront && !turning && (
                    <div
                        aria-hidden
                        onClick={() => paginate(1)}
                        className="absolute inset-y-0 right-0 z-[6] w-1/2 cursor-pointer"
                    />
                )}
            </motion.div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Mobile: single-page flip
// ---------------------------------------------------------------------------

function renderOneUp({ current, turning, paginate, onFlipDone }: RenderArgs) {
    const isOpen = current > 0 || turning !== null
    const basePageIdx = turning ? (turning.dir > 0 ? turning.target : current) : current
    const flipIdx = turning ? (turning.dir > 0 ? current : turning.target) : current
    const flipFrom = turning?.dir === -1 ? -180 : 0
    const flipTo = turning?.dir === 1 ? -180 : 0

    return (
        <div className="relative aspect-[3/4] w-[80vw] max-w-[360px]">
            <div className="pointer-events-none absolute inset-x-6 bottom-3 top-10 -z-10 rounded-[2rem] bg-slate-900/25 blur-2xl" />

            {/* Base page */}
            <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ zIndex: 1 }}>
                <div className="absolute inset-0 [backface-visibility:hidden]">
                    {fullPage(basePageIdx)}
                </div>
            </div>

            {(turning || !isOpen) && (
                <motion.div
                    key={turning ? `flip-${flipIdx}-${turning.dir}` : 'cover'}
                    className="absolute inset-0 origin-left [transform-style:preserve-3d]"
                    style={{ zIndex: 2 }}
                    initial={{ rotateY: flipFrom }}
                    animate={{ rotateY: turning ? flipTo : 0 }}
                    transition={
                        turning ? { duration: PAGE_DURATION, ease: PAGE_EASE } : { duration: 0 }
                    }
                    onClick={!isOpen ? () => paginate(1) : undefined}
                    onAnimationComplete={turning ? onFlipDone : undefined}
                >
                    <div className={`absolute inset-0 [backface-visibility:hidden] ${!isOpen ? 'cursor-pointer' : ''}`}>
                        {fullPage(flipIdx)}
                    </div>
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <PaperBack />
                    </div>
                    {turning && (
                        <motion.div
                            className="pointer-events-none absolute inset-0 rounded-lg bg-black"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.3, 0] }}
                            transition={{ duration: PAGE_DURATION, ease: 'easeInOut' }}
                        />
                    )}
                </motion.div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function ArrowButton({
    dir,
    disabled,
    onClick,
    className = '',
}: {
    dir: 1 | -1
    disabled: boolean
    onClick: () => void
    className?: string
}) {
    const Icon = dir === 1 ? ChevronRight : ChevronLeft
    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={dir === 1 ? 'Next page' : 'Previous page'}
            whileHover={disabled ? undefined : { scale: 1.08, x: dir * 2 }}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            className={`grid h-11 w-11 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-0 ${className}`}
        >
            <Icon className="h-5 w-5" />
        </motion.button>
    )
}

/** Desktop arrows tucked into the bottom corners of the open spread. */
function Arrows({
    current,
    turning,
    paginate,
}: {
    current: number
    turning: Turning | null
    paginate: (dir: 1 | -1) => void
}) {
    if (current === 0 && !turning) return null
    return (
        <>
            <ArrowButton
                dir={-1}
                disabled={current === 0 || turning !== null}
                onClick={() => paginate(-1)}
                className="absolute bottom-5 left-5 z-10"
            />
            <ArrowButton
                dir={1}
                disabled={current === LAST_PAGE || turning !== null}
                onClick={() => paginate(1)}
                className="absolute bottom-5 right-5 z-10"
            />
        </>
    )
}

function Dots({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-2">
            {playbookPages.map((page, i) => {
                if (page.kind !== 'chapter') return null
                const active = current === i
                return (
                    <span
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            active ? 'w-6 bg-primary' : 'w-2 bg-gray-300'
                        }`}
                    />
                )
            })}
        </div>
    )
}
