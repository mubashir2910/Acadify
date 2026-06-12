import Image from 'next/image'
import {
    BarChart3,
    Calendar,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Headphones,
    ShieldCheck,
    Star,
    TrendingUp,
    UploadCloud,
    Users,
    Zap,
    type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Fragment } from 'react'

// Faint leather/paper grain — inlined as a data URI (no extra request).
const NOISE_BG =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

type Step = {
    number: string
    icon: LucideIcon
    iconBg: string
    iconText: string
    title: string
    description: string
}

const steps: Step[] = [
    {
        number: '01',
        icon: CalendarDays,
        iconBg: 'bg-blue-50',
        iconText: 'text-blue-500',
        title: 'Book a Demo',
        description:
            'Schedule a quick call with our team to see how Acadify fits your school.',
    },
    {
        number: '02',
        icon: UploadCloud,
        iconBg: 'bg-emerald-50',
        iconText: 'text-emerald-500',
        title: 'We Import Your Data',
        description:
            'The Acadify team handles migrating your existing school records and data seamlessly.',
    },
    {
        number: '03',
        icon: BarChart3,
        iconBg: 'bg-violet-50',
        iconText: 'text-violet-500',
        title: 'Dashboards for Everyone',
        description:
            'Staff, Admins, and Parents each get their own tailored dashboard from day one.',
    },
    {
        number: '04',
        icon: Users,
        iconBg: 'bg-amber-50',
        iconText: 'text-amber-500',
        title: 'Manage & Share Hassle-Free',
        description:
            'Run attendance, fees, results, and communication — all from a single platform.',
    },
]

type Trust = {
    icon: LucideIcon
    iconText: string
    title: string
    description: string
}

const trust: Trust[] = [
    {
        icon: Zap,
        iconText: 'text-indigo-500',
        title: 'Quick Onboarding',
        description: 'Go live in days, not months',
    },
    {
        icon: ShieldCheck,
        iconText: 'text-emerald-500',
        title: 'Secure & Reliable',
        description: 'Your data is always protected',
    },
    {
        icon: Headphones,
        iconText: 'text-blue-500',
        title: 'Expert Support',
        description: 'We’re with you every step',
    },
    {
        icon: TrendingUp,
        iconText: 'text-rose-500',
        title: 'Scalable for Growth',
        description: 'Built for schools of all sizes',
    },
]

function StepCard({ step }: { step: Step }) {
    const Icon = step.icon
    return (
        <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md md:p-7">
            <div className="flex items-center gap-4">
                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${step.iconBg} ${step.iconText}`}
                >
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <span className="text-3xl font-extrabold tabular-nums text-gray-900 md:text-4xl">
                    {step.number}
                </span>
            </div>
            <h3 className="mt-5 text-lg font-bold text-gray-900">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {step.description}
            </p>
        </div>
    )
}

/** Dashed snake connectors between the four step cards (desktop only). */
function Connectors() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
            {/* 01 → 02 (top row) */}
            <div className="absolute left-1/2 top-[26%] flex w-16 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-gray-300 bg-blue-500 " />
                <span className="flex-1 border-t-2 border-dashed border-blue-200 bg-blue-500" />
                <ChevronRight className="h-4 w-4 shrink-0 text-blue-500" />
            </div>

            {/* 02 → 04 (down the right side) */}
            <div className="absolute bottom-[26%] right-[-16px] top-[26%] w-4 rounded-r-2xl border-y-2 border-r-2 border-dashed border-blue-500" />
            <span className="absolute right-0 top-[26%] h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-gray-300 bg-blue-500" />
            <span className="absolute bottom-[26%] right-0 h-2.5 w-2.5 translate-x-1/2 translate-y-1/2 rounded-full border-2 border-gray-300 bg-blue-500" />

            {/* 04 → 03 (bottom row, pointing left) */}
            <div className="absolute left-1/2 top-[74%] flex w-16 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5">
                <ChevronLeft className="h-4 w-4 shrink-0 text-blue-500" />
                <span className="flex-1 border-t-2 border-dashed bg-blue-500" />
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-gray-300 bg-blue-500" />
            </div>
        </div>
    )
}

/** Curved dotted connector running down one side, joining two centred mobile
    step cards. Sides alternate (right, left, right…) for a serpentine flow. */
function SideConnector({ side }: { side: 'right' | 'left' }) {
    return (
        <div aria-hidden className="w-full">
            <svg
                viewBox="0 0 320 52"
                className={`h-auto w-full text-blue-400 ${
                    side === 'left' ? '-scale-x-100' : ''
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* dotted curve from one card's lower corner to the next card's
                    upper corner, bulging into the outer margin */}
                <path d="M291 5 C 314 18, 314 34, 291 47" strokeDasharray="2 9" />
                {/* arrowhead pointing down into the next card */}
                <path d="M284 40l7 8 8-7" />
            </svg>
        </div>
    )
}

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="bg-white py-20 md:py-18">
            <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20">
                {/* Header */}
                <div className="mx-auto max-w-2xl text-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        How It Works
                    </span>
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
                        Simple steps. Powerful results.
                    </h2>
                    <p className="mt-5 text-lg leading-relaxed text-gray-500">
                        Getting started with Acadify is quick and effortless.{' '}
                        <br className="hidden sm:block" />
                        From onboarding to daily use — we’ve got you covered.
                    </p>
                </div>

                {/* Book card + step grid */}
                <div className="mt-14 grid items-stretch gap-8 lg:grid-cols-2">
                    {/* Left: book-cover styled process card */}
                    <div className="relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-3xl bg-primary p-8 text-white shadow-xl md:p-10">
                        <div
                            aria-hidden
                            className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                            style={{ backgroundImage: NOISE_BG }}
                        />
                        <div
                            aria-hidden
                            className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_8%,rgba(255,255,255,0.16),transparent_55%)]"
                        />
                        {/* Spine shadow on the left edge */}
                        <div
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 to-transparent"
                        />
                        {/* Bookmark ribbon (top-left) */}
                        <div
                            aria-hidden
                            className="absolute -top-1 left-9 h-14 w-9 bg-gradient-to-b from-white/15 to-white/[0.04]"
                            style={{
                                clipPath:
                                    'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
                            }}
                        >
                            <Star className="mx-auto mt-2.5 h-4 w-4 text-white/70" />
                        </div>
                        {/* Faint embossed owl */}
                        <Image
                            src="/acadify.png"
                            alt=""
                            aria-hidden
                            width={240}
                            height={240}
                            className="pointer-events-none absolute -bottom-4 right-1 h-48 w-48 select-none opacity-[0.08] grayscale mix-blend-overlay"
                        />

                        <div className="relative">
                            <h3 className="max-w-xs text-3xl font-bold leading-tight md:text-4xl">
                                Our Working Process —{' '}
                                <span className="text-sky-300">
                                    Built for Your School Success
                                </span>
                            </h3>
                            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70 md:text-base">
                                We make school management simple with a smooth,
                                guided process that saves time and brings
                                everything together.
                            </p>
                        </div>

                        <div className="relative mt-10">
                            <Button
                                asChild
                                size="lg"
                                className="cursor-pointer rounded-xl bg-white px-6 text-base font-semibold text-primary shadow-md hover:bg-white/90"
                            >
                                <button
                                    data-cal-namespace="acadify-demo"
                                    data-cal-link="mubashir2910/acadify-demo"
                                    data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                                >
                                    <Calendar className="h-4 w-4" />
                                    Book a Call With Us
                                </button>
                            </Button>
                        </div>
                    </div>

                    {/* Right: step cards. sm+ = 2×2 grid with snake connectors;
                        mobile = slimmer zig-zag flow with curved arrows. */}
                    <div>
                        {/* sm and up: 2×2 grid */}
                        <div className="relative hidden h-full gap-5 sm:grid sm:grid-cols-2 sm:grid-rows-2">
                            {steps.map((step) => (
                                <StepCard key={step.number} step={step} />
                            ))}
                            <Connectors />
                        </div>

                        {/* mobile: narrower centred cards joined by alternating-side arrows */}
                        <div className="flex flex-col items-center sm:hidden">
                            {steps.map((step, i) => (
                                <Fragment key={step.number}>
                                    <div className="w-[82%]">
                                        <StepCard step={step} />
                                    </div>
                                    {i < steps.length - 1 && (
                                        <SideConnector
                                            side={i % 2 === 0 ? 'right' : 'left'}
                                        />
                                    )}
                                </Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Trust bar */}
                <div className="hidden sm:grid mt-8  grid-cols-1 gap-6 rounded-2xl bg-slate-50 px-6 py-7 ring-1 ring-gray-100 sm:grid-cols-2 md:grid-cols-4 md:px-10">
                    {trust.map((item) => {
                        const Icon = item.icon
                        return (
                            <div key={item.title} className="flex items-center gap-3">
                                <Icon
                                    className={`h-7 w-7 shrink-0 ${item.iconText}`}
                                    strokeWidth={1.75}
                                />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
