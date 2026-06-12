import Image from 'next/image'
import {
    BookOpen,
    Code2,
    Presentation,
    School,
    type LucideIcon,
} from 'lucide-react'

type Philosophy = {
    icon: LucideIcon
    title: string
    verb: string
    iconText: string
    verbText: string
}

const philosophy: Philosophy[] = [
    {
        icon: Presentation,
        title: 'Teachers',
        verb: 'teach.',
        iconText: 'text-blue-500',
        verbText: 'text-blue-600',
    },
    {
        icon: BookOpen,
        title: 'Students',
        verb: 'learn.',
        iconText: 'text-emerald-500',
        verbText: 'text-emerald-600',
    },
    {
        icon: School,
        title: 'Schools',
        verb: 'grow.',
        iconText: 'text-violet-500',
        verbText: 'text-violet-600',
    },
    {
        icon: Code2,
        title: 'Software',
        verb: 'simply works.',
        iconText: 'text-amber-500',
        verbText: 'text-amber-600',
    },
]

export default function Vision() {
    return (
        <section id="vision" className="bg-white py-20 md:py-18">
            <div className="mx-auto max-w-7xl px-6">
                <div className="rounded-[2.5rem] bg-gradient-to-b from-blue-50 to-blue-50/30 p-6 md:p-10 lg:p-12">
                    {/* Top: vision text + scoreboard visual */}
                    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
                        {/* Left: copy */}
                        <div className="text-center lg:text-left">
                            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-blue-600 ring-1 ring-blue-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                Our Vision
                            </span>

                            <h2 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
                                Beyond school
                                <br />
                                <span className="text-blue-600">management.</span>
                            </h2>

                            <p className="mx-auto mt-6 max-w-md text-lg font-medium leading-relaxed text-gray-700 lg:mx-0">
                                We’re building an ecosystem where schools don’t
                                compete in isolation.
                            </p>
                            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-gray-500 lg:mx-0">
                                Students will participate in inter-school academic
                                and sports competitions, earn achievements, level
                                up through Arena, and receive AI-generated learning
                                insights — all within the same platform.
                            </p>
                            <p className="mt-4 text-base font-semibold text-gray-800">
                                That’s the future we’re building.
                            </p>
                        </div>

                        {/* Right: scoreboard visual (floating pills are baked into the
                            asset). A soft glow behind + a top/bottom mask fade let the
                            image sink into the section background instead of showing a
                            hard rectangular edge. Sides aren't faded — the baked-in pills
                            sit right against the left/right edges. */}
                        <div className="relative">
                            <div
                                aria-hidden
                                className="absolute -inset-x-4 -top-2 bottom-2 rounded-[3rem] bg-blue-400/20 blur-3xl"
                            />
                            <Image
                                src="/assets/landing/usp.png"
                                alt="Acadify Arena — inter-school academics, sports, achievements and AI insights"
                                width={1457}
                                height={1080}
                                draggable={false}
                                className="relative h-auto w-full pointer-events-none [mask-image:linear-gradient(to_bottom,transparent_0%,#000_8%,#000_86%,transparent_100%)]"
                                sizes="(min-width: 1024px) 50vw, 92vw"
                                priority={false}
                            />
                        </div>
                    </div>

                    {/* Our Philosophy bar */}
                    <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 md:mt-10 md:p-8">
                        <h3 className="text-center text-2xl font-bold text-gray-900">
                            Our Philosophy
                        </h3>
                        <div className="mt-4 grid grid-cols-2 sm:mt-6 sm:grid-cols-4">
                            {philosophy.map((item, idx) => {
                                const Icon = item.icon
                                return (
                                    <div
                                        key={item.title}
                                        className={`flex flex-col items-center justify-center gap-2 px-3 py-6 text-center sm:flex-row sm:gap-3 sm:py-4 sm:text-left ${
                                            idx < 2 ? 'border-b sm:border-b-0' : ''
                                        } ${idx % 2 === 0 ? 'border-r' : ''} ${
                                            idx === 1 ? 'sm:border-r' : ''
                                        } border-gray-200`}
                                    >
                                        <Icon
                                            className={`h-8 w-8 shrink-0 ${item.iconText}`}
                                            strokeWidth={1.75}
                                        />
                                        <div className="leading-tight">
                                            <p className="font-bold text-gray-900">
                                                {item.title}
                                            </p>
                                            <p className={`font-semibold ${item.verbText}`}>
                                                {item.verb}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
