'use client'

/**
 * Page faces for the Acadify Playbook.
 *
 * Every face fills its container (`absolute inset-0`) so the exact same
 * component works as a full page (mobile 1-up) or as one half of a spread
 * (desktop 2-up). The engine in `playbook-book.tsx` positions the containers;
 * these components only paint content.
 */

import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'
import { Star } from 'lucide-react'
import { type Chapter, CHAPTER_COUNT, toRoman } from './playbook-data'

/** Which edge carries the book's binding shadow. */
type SpineSide = 'left' | 'right'

// Faint paper/leather grain. Inlined so there's no extra network request.
const NOISE_BG =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/** Soft binding shadow drawn along the spine edge of a paper page. */
function SpineShade({ side }: { side: SpineSide }) {
    return (
        <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 w-8 ${
                side === 'left'
                    ? 'left-0 bg-gradient-to-r'
                    : 'right-0 bg-gradient-to-l'
            } from-black/12 via-black/[0.04] to-transparent`}
        />
    )
}

/** The Acadify-blue bookmark ribbon that overhangs the top edge. */
export function Ribbon({ className = '' }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={`pointer-events-none absolute -top-2 z-20 h-16 w-9 bg-gradient-to-b from-primary to-primary/85 shadow-md ${className}`}
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)' }}
        >
            <Star className="mx-auto mt-2 h-4 w-4 fill-amber-300 text-amber-300" />
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Cover                                                                       */
/* -------------------------------------------------------------------------- */

export function PlaybookCover() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-l-sm rounded-r-lg bg-primary text-white">
            {/* Leather grain + lighting */}
            <div
                aria-hidden
                className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                style={{ backgroundImage: NOISE_BG }}
            />
            <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(120%_90%_at_25%_15%,rgba(255,255,255,0.18),transparent_55%)]"
            />
            {/* Gilded fore-edge (pages) on the right */}
            <div
                aria-hidden
                className="absolute inset-y-3 right-0 w-[6px] rounded-r-lg bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300/70"
            />
            {/* Inner emboss frame */}
            <div
                aria-hidden
                className="absolute inset-4 rounded-md border border-white/12 sm:inset-5"
            />

            <Ribbon className="right-10" />

            {/* Faint embossed owl */}
            <Image
                src="/acadify.png"
                alt=""
                aria-hidden
                width={320}
                height={320}
                className="pointer-events-none absolute -bottom-6 left-1/2 h-64 w-64 -translate-x-1/2 select-none opacity-[0.08] grayscale mix-blend-overlay"
            />

            <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-white/55">
                    The
                </span>
                <h3
                    className="font-[family-name:var(--font-libre-baskerville)] text-4xl leading-[1.05] tracking-wide text-white/95 sm:text-5xl"
                    style={{
                        textShadow:
                            '0 1px 0 rgba(0,0,0,0.35), 0 -1px 0 rgba(255,255,255,0.12)',
                    }}
                >
                    ACADIFY
                </h3>
                <span className="mt-1 font-[family-name:var(--font-libre-baskerville)] text-lg uppercase tracking-[0.5em] text-white/80 sm:text-xl">
                    Playbook
                </span>

                <span className="mt-6 h-px w-12 bg-white/25" />
                <p className="mt-5 max-w-[15rem] text-sm leading-relaxed text-white/60">
                    Everything your school needs, in one place.
                </p>
            </div>

            {/* Wordmark */}
            <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2 text-white/80">
                <Image
                    src="/acadify.png"
                    alt=""
                    aria-hidden
                    width={24}
                    height={24}
                    className="h-5 w-5 select-none"
                />
                <span className="text-sm font-semibold tracking-[0.2em]">
                    ACADIFY
                </span>
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Chapter — text page (left / full)                                           */
/* -------------------------------------------------------------------------- */

export function ChapterText({
    chapter,
    spineSide,
    withThumbnail = false,
}: {
    chapter: Chapter
    spineSide: SpineSide
    withThumbnail?: boolean
}) {
    const Icon = chapter.icon
    return (
        <div className="absolute inset-0 flex flex-col rounded-l-lg rounded-r-sm bg-[#fcfcfb] p-6 sm:p-9">
            <SpineShade side={spineSide} />

            <span className={`text-xs font-semibold uppercase tracking-[0.3em] ${chapter.accentText}`}>
                Chapter {toRoman(chapter.chapterNo)}
            </span>

            <div
                className={`mt-5 flex h-12 w-12 items-center justify-center rounded-2xl sm:mt-6 sm:h-14 sm:w-14 ${chapter.accentBg} ${chapter.accentText}`}
            >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
            </div>

            <h3 className="mt-5 text-2xl font-bold leading-tight text-gray-900 sm:mt-6 sm:text-[1.7rem]">
                {chapter.title}
            </h3>
            <p className={`mt-2 text-base font-semibold ${chapter.accentText}`}>
                {chapter.benefit}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500 sm:mt-3">
                {chapter.description}
            </p>

            {/* Mobile (1-up) shows the image inline beneath the copy. */}
            {withThumbnail && (
                <div className="relative mt-4 w-full shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <div className="relative h-24 w-full">
                        <Image
                            src={chapter.image}
                            alt={`${chapter.title} preview`}
                            fill
                            className="object-contain p-2"
                            sizes="80vw"
                        />
                    </div>
                </div>
            )}

            {/* Footer is decorative — hidden on the tighter mobile page. */}
            {!withThumbnail && (
                <div className="mt-auto flex items-center gap-3 pt-6 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-gray-400">
                    <span>Learn</span>
                    <span className="text-gray-300">·</span>
                    <span>Manage</span>
                    <span className="text-gray-300">·</span>
                    <span>Grow</span>
                </div>
            )}
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Chapter — image page (right)                                                */
/* -------------------------------------------------------------------------- */

export function ChapterImage({
    chapter,
    spineSide,
}: {
    chapter: Chapter
    spineSide: SpineSide
}) {
    return (
        <div className="absolute inset-0 flex flex-col rounded-l-sm rounded-r-lg bg-[#fcfcfb] p-7 sm:p-9">
            <SpineShade side={spineSide} />

            <div className="flex justify-end">
                <span className="text-sm font-semibold tabular-nums tracking-wide text-gray-300">
                    {String(chapter.chapterNo).padStart(2, '0')}{' '}
                    <span className="text-gray-200">
                        / {String(CHAPTER_COUNT).padStart(2, '0')}
                    </span>
                </span>
            </div>

            <div className="relative flex flex-1 items-center justify-center">
                {/* Soft accent glow behind the floating preview */}
                <div
                    aria-hidden
                    className={`absolute h-40 w-40 rounded-full ${chapter.accentBg} blur-3xl`}
                />
                <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <div className="relative aspect-[4/3] w-full">
                        <Image
                            src={chapter.image}
                            alt={`${chapter.title} preview`}
                            fill
                            className="object-contain p-3"
                            sizes="(min-width: 1024px) 40vw, 80vw"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Closing back cover                                                          */
/* -------------------------------------------------------------------------- */

function BookDemoButton() {
    const reduce = useReducedMotion()
    return (
        <motion.button
            type="button"
            data-cal-namespace="acadify-demo"
            data-cal-link="mubashir2910/acadify-demo"
            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            className="mt-6 cursor-pointer rounded-xl bg-white px-7 py-3 text-sm font-semibold text-primary shadow-lg shadow-black/20 transition-colors hover:bg-white/90"
            initial={reduce ? false : { scale: 0.96, opacity: 0 }}
            animate={reduce ? undefined : { scale: [0.96, 1.04, 1], opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
            Book a Demo
        </motion.button>
    )
}

/**
 * The back cover — shown when the book "closes" at the end. It mirrors the
 * front cover (a single centred leaf) but with the gilded fore-edge on the
 * LEFT, and it carries the closing message + CTA. The right half of the book
 * is left empty so it reads as a closed book.
 */
export function PlaybookBackCover() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-l-lg rounded-r-sm bg-primary text-white">
            <div
                aria-hidden
                className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                style={{ backgroundImage: NOISE_BG }}
            />
            <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(120%_90%_at_75%_15%,rgba(255,255,255,0.18),transparent_55%)]"
            />
            {/* Gilded fore-edge on the LEFT (mirror of the front cover) */}
            <div
                aria-hidden
                className="absolute inset-y-3 left-0 w-[6px] rounded-l-lg bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300/70"
            />
            <div
                aria-hidden
                className="absolute inset-4 rounded-md border border-white/12 sm:inset-5"
            />

            <Ribbon className="right-10" />

            <Image
                src="/acadify.png"
                alt=""
                aria-hidden
                width={320}
                height={320}
                className="pointer-events-none absolute -bottom-6 left-1/2 h-64 w-64 -translate-x-1/2 select-none opacity-[0.08] grayscale mix-blend-overlay"
            />

            <div className="relative flex h-full flex-col items-center justify-center px-7 text-center">
                <span className="text-[0.7rem] font-medium uppercase tracking-[0.4em] text-white/55">
                    The end is the beginning
                </span>
                <p className="mt-3 font-[family-name:var(--font-libre-baskerville)] text-lg italic text-white/65">
                    One ecosystem. Zero chaos.
                </p>
                {/* <p className="mt-4 max-w-[15rem] text-sm leading-relaxed text-white/70">
                    One intelligent platform for Students, Teachers &amp; Schools.
                </p> */}
                <BookDemoButton />
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Blank sheet (verso seen mid-turn in 1-up mode)                              */
/* -------------------------------------------------------------------------- */

export function PaperBack() {
    return (
        <div className="absolute inset-0 flex items-center justify-center rounded-l-sm rounded-r-lg bg-[linear-gradient(90deg,#e9eaee_0%,#f6f7f9_8%,#fbfbfc_100%)]">
            <span className="select-none text-2xl font-bold tracking-[0.3em] text-gray-200">
                ACADIFY
            </span>
        </div>
    )
}
