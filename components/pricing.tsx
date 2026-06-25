import Image from 'next/image'
import {
    ArrowRight,
    CircleCheck,
    Heart,
    Phone,
    Rocket,
    ShieldCheck,
    Star,
    UploadCloud,
    UserRound,
    Users,
    type LucideIcon,
} from 'lucide-react'

type Pill = {
    icon?: LucideIcon
    label?: string // for the "AI" text tile
    tileBg: string
    tileText: string
    title: string
    wide?: boolean
}

const pills: Pill[] = [
    {
        icon: Users,
        tileBg: 'bg-emerald-100',
        tileText: 'text-emerald-600',
        title: 'Student-based pricing',
    },
    {
        icon: Rocket,
        tileBg: 'bg-violet-100',
        tileText: 'text-violet-600',
        title: 'Free onboarding & migration',
    },
    {
        label: 'AI',
        tileBg: 'bg-blue-600',
        tileText: 'text-white',
        title: 'AI features included',
    },
    {
        icon: ShieldCheck,
        tileBg: 'bg-amber-500',
        tileText: 'text-white',
        title: 'No hidden charges',
    },
    // {
    //     icon: Star,
    //     tileBg: 'bg-blue-100',
    //     tileText: 'text-blue-600',
    //     title: 'Free trial available',
    //     wide: true,
    // },
]

type Assurance = { icon: LucideIcon; iconText: string; label: string }

const assurances: Assurance[] = [
    { icon: CircleCheck, iconText: 'text-emerald-500', label: 'Free Trial' },
    { icon: UploadCloud, iconText: 'text-violet-500', label: 'Free Data Migration' },
    { icon: UserRound, iconText: 'text-orange-500', label: 'Setup Assistance' },
    { icon: ShieldCheck, iconText: 'text-blue-500', label: 'Cancel Anytime' },
]

function PillCard({ pill }: { pill: Pill }) {
    const Icon = pill.icon
    return (
        <div
            className={`flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${
                pill.wide ? 'col-span-2' : ''
            }`}
        >
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${pill.tileBg} ${pill.tileText}`}
            >
                {Icon ? (
                    <Icon className="h-5 w-5" strokeWidth={2} />
                ) : (
                    <span className="text-sm font-bold">{pill.label}</span>
                )}
            </div>
            <span className="text-sm font-semibold leading-snug text-gray-900">
                {pill.title}
            </span>
        </div>
    )
}

export default function Pricing() {
    return (
        <section id="pricing" className="bg-gray-100 py-20 md:py-18">
            <div className="mx-auto max-w-7xl px-6">
                {/* Header */}
                <div className="text-center">
                    <h2 className="inline-block text-3xl font-bold text-gray-900 md:text-4xl">
                        Pricing Details
                        <span className="mt-2 block h-1 w-full rounded-full bg-gray-900" />
                    </h2>
                    <p className="mt-5 text-base font-medium text-gray-500 md:text-lg">
                        *All Plans include a FREE trial!
                    </p>
                </div>

                {/* Card */}
                <div className="mx-auto mt-12 max-w-6xl rounded-[2rem] bg-gray-50 p-6 shadow-sm ring-1 ring-gray-100 md:p-10 lg:p-12">
                    <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-14">
                        {/* 1. Intro */}
                        <div className="text-center lg:col-start-1 lg:row-start-1 lg:text-left">
                            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-blue-600">
                                <Heart className="h-4 w-4 fill-blue-600" />
                                Fair Pricing
                            </span>
                            <h3 className="mt-6 text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
                                Transparent pricing.
                                <br />
                                Built for{' '}
                                <span className="text-blue-600">every school.</span>
                            </h3>
                            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-gray-500 lg:mx-0">
                                Every school deserves a modern digital platform.
                                That’s why pricing scales with your student
                                strength — keeping it affordable for growing
                                institutions while remaining fair for larger
                                schools.
                            </p>
                        </div>

                        {/* 2. Illustration (mobile: 2nd; desktop: right column).
                            The asset already bakes in the “Pay for your school…”
                            quote + its light-blue card, so it's used as-is. */}
                        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start">
                            <Image
                                src="/assets/landing/pricing.png"
                                alt="Pay for your school, not someone else’s size"
                                width={1448}
                                height={1086}
                                draggable={false}
                                className="mx-auto h-auto w-full max-w-xl rounded-2xl pointers-events-none"
                                sizes="(min-width: 1024px) 45vw, 90vw"
                            />
                        </div>

                        {/* 3. Feature pills (hidden on mobile) */}
                        <div className="hidden sm:block lg:col-start-1 lg:row-start-2">
                            <div className="grid grid-cols-2 gap-3">
                                {pills.map((pill) => (
                                    <PillCard key={pill.title} pill={pill} />
                                ))}
                            </div>
                        </div>

                    {/* Bottom assurance bar */}
                    <div className="mt-5 border-t border-gray-400 pt-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4">
                            {assurances.map((item, idx) => {
                                const Icon = item.icon
                                return (
                                    <div
                                        key={item.label}
                                        className={`flex flex-col items-center justify-center gap-2 px-3 py-4 text-center sm:flex-row sm:gap-2.5 sm:text-left ${
                                            idx < 2 ? 'border-b sm:border-b-0' : ''
                                        } ${
                                            idx % 2 === 0 ? 'border-r sm:border-r' : 'sm:border-r'
                                        } ${
                                            idx === assurances.length - 1 ? 'border-r-0' : ''
                                        } border-gray-200`}
                                    >
                                        <Icon
                                            className={`h-6 w-6 shrink-0 ${item.iconText}`}
                                            strokeWidth={2}
                                        />
                                        <span className="text-sm font-semibold text-gray-800">
                                            {item.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                        {/* 4. CTA */}
                        <div className="lg:col-start-1 lg:row-start-3">
                            <button
                                data-cal-namespace="acadify-demo"
                                data-cal-link="mubashir2910/acadify-demo"
                                data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                                className="relative flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:bg-primary/90 hover:shadow-xl active:scale-[0.99]"
                            >
                                <Phone className="h-5 w-5" />
                                Book a Pricing Demo
                                <ArrowRight className="absolute right-6 h-5 w-5" />
                            </button>
                            <p className="mt-3 text-center text-sm text-gray-500 lg:text-left">
                                Get a customized quote in under 15 minutes.
                            </p>
                        </div>
                    </div>                  
                </div>
            </div>
        </section>
    )
}
