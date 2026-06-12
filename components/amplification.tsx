import FeaturesBook from '@/components/features-book'

/**
 * The "#features" section.
 *
 * A two-column layout: an intro column on the left and the interactive
 * Acadify Playbook (the feature book) on the right. On smaller screens the
 * intro stacks above the book. The detailed feature comparison lives in the
 * section above this one (ComparisonSection), so this section is the visual
 * product tour / brand moment rather than another text list.
 */
export default function Amplification() {
    return (
        <section
            id="features"
            className="relative overflow-hidden border-y border-gray-200 bg-gray-100 py-20 md:py-28"
        >
            {/* Soft radial lighting behind the book — minimal, no banding. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_50%_at_72%_38%,rgba(11,42,76,0.07),transparent_70%)]"
            />

            <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-8">
                {/* Intro column */}
                <div className="text-center lg:text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                        The Feature Tour
                    </span>

                    <h2 className="mt-4 font-[family-name:var(--font-libre-baskerville)] text-4xl leading-[1.1] text-gray-900 md:text-5xl">
                        The Acadify
                        <br className="hidden sm:block" /> Playbook
                    </h2>

                    <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-gray-500 lg:mx-0">
                        Explore the complete ecosystem that helps schools learn,
                        manage and grow — together. Every feature, one page at a
                        time.
                    </p>

                    {/* Handwritten "click to open" cue pointing at the book. */}
                    <div className="mt-8 flex items-center justify-center gap-3 lg:justify-start">
                        <span className="font-[family-name:var(--font-libre-baskerville)] text-lg italic text-primary/80">
                            Click to open the playbook
                        </span>
                        {/* Desktop: points right, toward the book beside it. */}
                        <svg
                            aria-hidden
                            viewBox="0 0 80 40"
                            className="hidden h-8 w-20 text-primary/60 lg:block"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M2 10C25 30 50 30 74 20" />
                            <path d="M64 13l12 7-12 7" />
                        </svg>
                        {/* Mobile: points down, toward the book stacked below. */}
                        <svg
                            aria-hidden
                            viewBox="0 0 64 40"
                            className="h-9 w-14 rotate-90 text-primary/60 lg:hidden"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M2 8c18 2 34 10 44 24" />
                            <path d="M36 30l11 3 2-12" />
                        </svg>
                    </div>
                </div>

                {/* The book */}
                <div className="flex justify-center lg:justify-end">
                    <FeaturesBook />
                </div>
            </div>
        </section>
    )
}
