import { Fragment } from 'react'
import Image from 'next/image'
import {
    Heart,
    ShieldCheck,
    Sparkle,
    Target,
    Users,
    type LucideIcon,
} from 'lucide-react'

type Value = {
    icon: LucideIcon
    title: string
    description: string
}

const values: Value[] = [
    {
        icon: Target,
        title: 'Our Mission',
        description:
            'To simplify school operations and improve communication for better education.',
    },
    {
        icon: Users,
        title: 'What We Do',
        description:
            'One unified platform for attendance, fees, results, communication & more.',
    },
    {
        icon: ShieldCheck,
        title: 'Built for Everyone',
        description:
            'Designed for schools of all sizes — from small institutions to large academies.',
    },
    {
        icon: Sparkle,
        title: 'Our Vision',
        description:
            'A future where every school in India is modern, connected, and student-first.',
    },
]

type Trust = { icon: LucideIcon; label: string }

const trust: Trust[] = [
    { icon: ShieldCheck, label: 'Secure' },
    { icon: Users, label: 'Reliable' },
    { icon: Heart, label: 'Built with Purpose' },
]

function ValueCard({ value }: { value: Value }) {
    const Icon = value.icon
    return (
        <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-6 lg:flex-col lg:items-center lg:gap-0 lg:text-center">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-100 text-primary">
                <Icon className="h-7 w-7" strokeWidth={2} />
            </div>
            <div className="lg:contents">
                <h3 className="text-lg font-bold text-primary lg:mt-5">
                    {value.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500 lg:mt-2">
                    {value.description}
                </p>
            </div>
            {/* Desktop-only accent underline */}
            <span className="hidden h-1 w-8 rounded-full bg-primary lg:mt-5 lg:block" />
        </div>
    )
}

export default function AboutStory() {
    return (
        <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-[2.5rem] bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-7 md:p-8">
                {/* Header */}
                <div className="lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                            Our Story
                        </p>
                        <span className="mt-3 block h-1 w-10 rounded-full bg-primary" />

                        <h1 className="mt-5 text-4xl font-bold tracking-tight text-primary md:text-6xl">
                            About Acadify
                        </h1>
                        <p className="mt-5 max-w-md text-lg leading-relaxed text-gray-500">
                            A modern platform built by students who lived the
                            problem.
                        </p>
                        <span className="mt-7 block h-1 w-12 rounded-full bg-primary" />
                    </div>

                    {/* Book + cap emblem — desktop only */}
                    <div className="relative hidden lg:block">
                        <span className="absolute -left-2 top-6 h-2.5 w-2.5 rounded-full bg-blue-300" />
                        <span className="absolute -right-1 top-24 h-2 w-2 rounded-full bg-blue-200" />
                        <span className="absolute right-10 -top-1 h-1.5 w-1.5 rounded-full bg-primary/40" />
                        <Image
                            src="/assets/landing/book.png"
                            alt="Acadify — an open book with a graduation-cap emblem"
                            width={1416}
                            height={1111}
                            draggable={false}
                            className="h-auto w-[320px] pointers-events-none"
                            priority={false}
                        />
                    </div>
                </div>

                {/* Intro paragraph */}
                <p className="mx-auto mt-8 max-w-3xl text-center text-lg leading-relaxed text-gray-600 md:mt-4">
                    Acadify was born out of real, lived experience. As students
                    who spent years navigating the traditional school system, we
                    saw firsthand how outdated and fragmented school management
                    really was — attendance on paper registers, fee receipts
                    stuffed in folders, results announced weeks late, and
                    communication between parents and teachers that barely
                    existed.
                </p>

                {/* Value cards */}
                <div className="mt-10 grid grid-cols-1 gap-4 md:mt-12 lg:grid-cols-4">
                    {values.map((value) => (
                        <ValueCard key={value.title} value={value} />
                    ))}
                </div>

                {/* Quote card */}
                <div className="mt-4 rounded-2xl bg-slate-50 p-5 sm:p-6 md:p-8">
                    <div className="flex gap-3 sm:gap-4">
                        <span className="font-serif text-5xl leading-none text-primary/30 sm:text-6xl">
                            &ldquo;
                        </span>
                        <p className="border-l border-gray-300 pl-4 text-base leading-relaxed text-gray-700 md:text-lg">
                            We&rsquo;re a team of young builders, developers, and
                            dreamers who believe that digitalization isn&rsquo;t a
                            luxury — it&rsquo;s a necessity. Acadify isn&rsquo;t
                            just a product, it&rsquo;s a movement to modernize
                            education, one school at a time.
                        </p>
                    </div>

                    {/* Trust chips */}
                    <div className="mt-6 flex items-center justify-center gap-1.5 md:mt-8 md:gap-0">
                        {trust.map((item, idx) => {
                            const Icon = item.icon
                            return (
                                <Fragment key={item.label}>
                                    {idx > 0 && (
                                        <span
                                            aria-hidden
                                            className="h-6 w-px shrink-0 bg-gray-300 md:mx-5"
                                        />
                                    )}
                                    <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 ring-1 ring-gray-200 sm:gap-2 sm:px-3 md:bg-transparent md:px-2 md:py-0 md:ring-0">
                                        <Icon
                                            className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5"
                                            strokeWidth={2}
                                        />
                                        <span className="whitespace-nowrap text-[11px] font-semibold text-gray-800 sm:text-sm">
                                            {item.label}
                                        </span>
                                    </span>
                                </Fragment>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
