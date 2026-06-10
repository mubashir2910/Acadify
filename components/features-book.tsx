'use client'

/**
 * FeaturesBook
 *
 * A 3D, page-turning "book" that showcases Acadify's feature set.
 *
 * Interaction model (mirrors the requested reference experience):
 *   1. When the section scrolls into view, the closed book rises up from the
 *      bottom and settles into place.
 *   2. Tapping the closed cover opens the book (the cover flips away).
 *   3. Forward / backward arrows (and the page itself) flip between feature
 *      pages one at a time, with a real 3D page-turn.
 *
 * Rendering strategy:
 *   Only ever two pages are mounted at once — a static "base" page sitting
 *   underneath, and a "flipper" page rotating around the spine (left edge).
 *   This keeps the DOM tiny, the z-ordering trivial, and the animation smooth
 *   regardless of how many pages exist. See `paginate()` for the state machine.
 *
 * Props: none. The feature content is self-contained so the component can be
 * dropped anywhere (it currently replaces the features grid in Amplification).
 */

import { useCallback, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import {
    BookOpen,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    CreditCard,
    FolderArchive,
    MessageSquare,
    type LucideIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

type Feature = {
    icon: LucideIcon
    title: string
    description: string
    /** Static Tailwind classes (can't be generated dynamically). */
    iconText: string
    iconBg: string
}

const features: Feature[] = [
    {
        icon: ClipboardCheck,
        title: 'Attendance Tracking',
        description:
            'Mark and monitor student attendance digitally with real-time updates for parents and staff.',
        iconText: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
    },
    {
        icon: FolderArchive,
        title: 'Class Log',
        description:
            'Teachers and parents can easily track what has been taught in school daily, subject-wise.',
        iconText: 'text-violet-600',
        iconBg: 'bg-violet-50',
    },
    {
        icon: MessageSquare,
        title: 'Communication Hub*',
        description:
            'Seamless messaging between teachers, parents, and administration in one unified platform.',
        iconText: 'text-sky-600',
        iconBg: 'bg-sky-50',
    },
    {
        icon: CreditCard,
        title: 'Fee Management*',
        description:
            'Streamlined fee collection, invoicing, and tracking with automated reminders and receipts.',
        iconText: 'text-amber-600',
        iconBg: 'bg-amber-50',
    },
    {
        icon: BarChart3,
        title: 'Result Management*',
        description:
            'Generate report cards, track academic progress, and share results with parents instantly.',
        iconText: 'text-rose-600',
        iconBg: 'bg-rose-50',
    },
    {
        icon: BookOpen,
        title: 'Academic Planning*',
        description:
            'Create timetables, manage syllabi, and plan academic calendars with ease and flexibility.',
        iconText: 'text-indigo-600',
        iconBg: 'bg-indigo-50',
    },
]

// A "page" is either the cover, one of the features, or the back cover.
type Page =
    | { kind: 'cover' }
    | { kind: 'feature'; index: number }
    | { kind: 'back' }

const pages: Page[] = [
    { kind: 'cover' },
    ...features.map((_, index) => ({ kind: 'feature', index }) as Page),
    { kind: 'back' },
]

const LAST = pages.length - 1
// Smooth, slightly weighted easing — the "page" decelerates as it lands.
const PAGE_EASE = [0.645, 0.045, 0.355, 1] as const
const PAGE_DURATION = 0.7

// ---------------------------------------------------------------------------
// Page faces
// ---------------------------------------------------------------------------

/** The reverse side of a sheet — plain paper with a faint watermark. */
function PaperBack() {
    return (
        <div className="absolute inset-0 flex items-center justify-center rounded-r-lg rounded-l-sm bg-[linear-gradient(90deg,#e9eaee_0%,#f6f7f9_8%,#fbfbfc_100%)]">
            <span className="select-none text-2xl font-bold tracking-[0.3em] text-gray-300">
                ACADIFY
            </span>
        </div>
    )
}

function CoverFace() {
    return (
        <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-r-lg rounded-l-sm bg-gradient-to-br from-primary to-primary/80 p-7 text-white sm:p-9">
            {/* Decorative emboss rings */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full border border-white/10" />

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                <span className="h-px w-6 bg-white/40" />
                Acadify
            </div>

            <div>
                <BookOpen className="mb-5 h-10 w-10 text-white/90" strokeWidth={1.5} />
                <h3 className="text-3xl font-bold leading-tight sm:text-4xl">
                    Everything your school needs.
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
                    One ecosystem for attendance, fees, results and more — bound
                    into a single platform.
                </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                    <ChevronRight className="h-4 w-4" />
                </span>
                Tap to open the book
            </div>
        </div>
    )
}

function FeatureFace({ feature, page }: { feature: Feature; page: number }) {
    const Icon = feature.icon
    return (
        <div className="relative flex h-full flex-col rounded-r-lg rounded-l-sm bg-white p-7 sm:p-9">
            {/* Spine shadow along the bound (left) edge */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 rounded-l-sm bg-gradient-to-r from-black/10 to-transparent" />

            <div className="flex items-center justify-between">
                <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${feature.iconBg} ${feature.iconText}`}
                >
                    <Icon className="h-7 w-7" strokeWidth={1.75} />
                </div>
                <span className="text-sm font-semibold tabular-nums text-gray-300">
                    {String(page).padStart(2, '0')}{' '}
                    <span className="text-gray-200">/ {String(features.length).padStart(2, '0')}</span>
                </span>
            </div>

            <h3 className="mt-8 text-2xl font-bold text-gray-900">
                {feature.title}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-gray-500">
                {feature.description}
            </p>

            <div className="mt-auto flex items-center gap-2 pt-6 text-xs font-medium uppercase tracking-widest text-gray-300">
                <span className="h-px flex-1 bg-gray-100" />
                Acadify
            </div>
        </div>
    )
}

function BackFace() {
    return (
        <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden rounded-r-lg rounded-l-sm bg-gradient-to-br from-primary to-primary/80 p-8 text-center text-white">
            <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
            <h3 className="text-3xl font-bold leading-tight">
                One ecosystem.
                <br />
                <span className="italic text-white/70">Zero chaos.</span>
            </h3>
            <p className="max-w-xs text-sm leading-relaxed text-white/70">
                Bring every part of your school together with Acadify.
            </p>
            <button
                type="button"
                data-cal-namespace="acadify-demo"
                data-cal-link="mubashir2910/acadify-demo"
                data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                className="mt-2 cursor-pointer rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-md transition-colors hover:bg-white/90"
            >
                Book a Demo
            </button>
        </div>
    )
}

/** Renders the front face for a given page index. */
function PageFront({ page }: { page: number }) {
    const descriptor = pages[page]
    if (descriptor.kind === 'cover') return <CoverFace />
    if (descriptor.kind === 'back') return <BackFace />
    return (
        <FeatureFace
            feature={features[descriptor.index]}
            page={descriptor.index + 1}
        />
    )
}

// ---------------------------------------------------------------------------
// Book
// ---------------------------------------------------------------------------

type Turning = { dir: 1 | -1; target: number }

export default function FeaturesBook() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const inView = useInView(sectionRef, { once: true, amount: 0.4 })

    const [current, setCurrent] = useState(0)
    const [turning, setTurning] = useState<Turning | null>(null)

    const isOpen = current > 0 || turning !== null

    // Start a page turn. Guards against double-clicks mid-animation and bounds.
    const paginate = useCallback(
        (dir: 1 | -1) => {
            if (turning) return
            const target = current + dir
            if (target < 0 || target > LAST) return
            setTurning({ dir, target })
        },
        [turning, current],
    )

    // Commit the page change once the flip finishes.
    const onFlipDone = useCallback(() => {
        if (!turning) return
        setCurrent(turning.target)
        setTurning(null)
    }, [turning])

    // Which page sits underneath (static) during a turn:
    //   forward  → reveal the destination page
    //   backward → keep the current page until the incoming page covers it
    const basePage = turning ? (turning.dir > 0 ? turning.target : current) : current
    // The flipping sheet itself.
    const flipPage = turning ? (turning.dir > 0 ? current : turning.target) : current
    const flipFrom = turning?.dir === -1 ? -180 : 0
    const flipTo = turning?.dir === 1 ? -180 : 0

    return (
        <div className="flex flex-col items-center">
            {/* Stage: holds the 3D perspective + scroll-in entrance. */}
            <motion.div
                ref={sectionRef}
                className="relative [perspective:2000px]"
                initial={{ opacity: 0, y: 160, rotateX: 18, scale: 0.92 }}
                animate={
                    inView
                        ? { opacity: 1, y: 0, rotateX: 0, scale: 1 }
                        : undefined
                }
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                aria-roledescription="Interactive feature book"
            >
                {/* Grounding shadow — kept outside the 3D context so a CSS
                    filter never flattens the page-turn transforms. */}
                <div className="pointer-events-none absolute inset-x-4 bottom-4 top-12 -z-10 rounded-[2rem] bg-slate-900/30 blur-2xl" />

                <div className="relative aspect-[3/4] w-[78vw] max-w-[400px] [transform-style:preserve-3d] sm:w-[420px]">
                    {/* Page-stack thickness on the fore (right) edge. */}
                    <div className="pointer-events-none absolute inset-y-2 right-[-3px] w-2 rounded-r-md bg-gradient-to-r from-gray-200 to-gray-300" />
                    <div className="pointer-events-none absolute inset-y-3 right-[-6px] w-2 rounded-r-md bg-gradient-to-r from-gray-100 to-gray-200" />

                    {/* Base (static) page underneath. */}
                    <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ zIndex: 1 }}>
                        <div className="absolute inset-0 [backface-visibility:hidden]">
                            <PageFront page={basePage} />
                        </div>
                    </div>

                    {/* Flipping sheet (only while turning) OR the clickable cover. */}
                    {(turning || !isOpen) && (
                        <motion.div
                            key={turning ? `flip-${flipPage}-${turning.dir}` : 'cover'}
                            className="absolute inset-0 origin-left [transform-style:preserve-3d]"
                            style={{ zIndex: 2 }}
                            initial={{ rotateY: flipFrom }}
                            animate={{ rotateY: turning ? flipTo : 0 }}
                            transition={
                                turning
                                    ? { duration: PAGE_DURATION, ease: PAGE_EASE }
                                    : { duration: 0 }
                            }
                            onClick={!isOpen ? () => paginate(1) : undefined}
                            onAnimationComplete={turning ? onFlipDone : undefined}
                            role={!isOpen ? 'button' : undefined}
                            tabIndex={!isOpen ? 0 : undefined}
                            onKeyDown={
                                !isOpen
                                    ? (e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault()
                                              paginate(1)
                                          }
                                      }
                                    : undefined
                            }
                            aria-label={!isOpen ? 'Open the features book' : undefined}
                        >
                            {/* Front face */}
                            <div
                                className={`absolute inset-0 [backface-visibility:hidden] ${
                                    !isOpen ? 'cursor-pointer' : ''
                                }`}
                            >
                                <PageFront page={flipPage} />
                            </div>
                            {/* Back of the sheet (seen mid-turn) */}
                            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                <PaperBack />
                            </div>
                            {/* Travelling shade for depth during the turn */}
                            {turning && (
                                <motion.div
                                    className="pointer-events-none absolute inset-0 rounded-r-lg bg-black"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.35, 0] }}
                                    transition={{ duration: PAGE_DURATION, ease: 'easeInOut' }}
                                />
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Controls — only meaningful once the book is open. */}
            <div
                className={`mt-10 flex items-center gap-6 transition-opacity duration-500 ${
                    isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            >
                <button
                    type="button"
                    onClick={() => paginate(-1)}
                    disabled={current === 0 || turning !== null}
                    aria-label="Previous page"
                    className="grid h-12 w-12 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Progress dots */}
                <div className="flex items-center gap-2">
                    {features.map((_, i) => {
                        const active = current === i + 1
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

                <button
                    type="button"
                    onClick={() => paginate(1)}
                    disabled={current === LAST || turning !== null}
                    aria-label="Next page"
                    className="grid h-12 w-12 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}
