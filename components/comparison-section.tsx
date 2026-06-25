'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Sparkles, X } from 'lucide-react'

// A single contrast point: the painful "without" reality vs. the Acadify outcome.
type Point = {
    title: string
    subtitle: string
}

// Pain points of running a school across disconnected tools.
const withoutPoints: Point[] = [
    {
        title: 'Separate apps for attendance, fees & results',
        subtitle: 'Five tools, five logins, five bills',
    },
    {
        title: 'Mark attendance on paper, tally by hand',
        subtitle: 'Hours lost every single week',
    },
    {
        title: 'Crunch monthly reports by hand',
        subtitle: 'Insights arrive too late to act on',
    },
    {
        title: 'One-size-fits-all teaching',
        subtitle: 'Strugglers and toppers get the same lessons',
    },
    {
        title: 'Chase parents over calls & WhatsApp',
        subtitle: 'Updates slip through the cracks',
    },
    {
        title: 'Track fees in messy spreadsheets',
        subtitle: 'Missed dues and manual receipts',
    },
    {
        title: 'Compile results manually each term',
        subtitle: 'Report cards always run late',
    },
    {
        title: '…and that’s about it',
        subtitle: 'A handful of basic features, nothing more',
    },
]

// The same jobs, handled inside one Acadify platform.
const withPoints: Point[] = [
    {
        title: 'One platform for everything',
        subtitle: 'Attendance, fees, results — a single login',
    },
    {
        title: 'One-tap digital attendance',
        subtitle: 'Totals & percentages auto-calculated',
    },
    {
        title: 'AI-generated monthly reports',
        subtitle: "Every student's progress, written for you",
    },
    {
        title: 'AI Learn Path',
        subtitle: 'ACADIFY builds a personalized path for each student',
    },
    {
        title: 'Instant notifications to every parent',
        subtitle: 'One click reaches the whole class',
    },
    {
        title: 'Automated fee tracking & receipts',
        subtitle: "See who's paid at a glance",
    },
    {
        title: 'Results & report cards in minutes',
        subtitle: 'Generated automatically, ready instantly',
    },
    {
        title: '…and so much more',
        subtitle: 'Gamified quizzes, smart timetables & AI insights — all built in',
    },
]

export default function ComparisonSection() {
    // Drives the mobile-only toggle; desktop renders both columns regardless.
    const [view, setView] = useState<'without' | 'with'>('without')

    return (
        <section id="why-acadify" className="bg-background py-16 md:py-24">
            <div className="mx-auto max-w-6xl px-6">
                {/* Split heading: sans-serif statement + highlighted serif phrase */}
                <h2 className="text-center text-3xl font-bold tracking-tight md:text-5xl">
                    You don&apos;t need 10 systems{' '}
                    <span className="font-[family-name:var(--font-libre-baskerville)] italic font-normal rounded-md bg-zinc-100 px-2 py-0.5 text-foreground shadow-sm">
                        to manage a school
                    </span>
                </h2>

                {/* Mobile-only segmented toggle between the two columns */}
                <div className="mt-8 flex justify-center md:hidden">
                    <div className="inline-flex rounded-full border bg-muted p-1">
                        <button
                            type="button"
                            onClick={() => setView('without')}
                            className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                                view === 'without'
                                    ? 'bg-foreground text-background'
                                    : 'text-muted-foreground'
                            }`}
                        >
                            Without
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('with')}
                            className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                                view === 'with'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground animate-brand-glow'
                            }`}
                        >
                            With Acadify
                        </button>
                    </div>
                </div>

                {/* Two columns — both visible on desktop; mobile shows the toggled one */}
                <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                    {/* WITHOUT column */}
                    <div className={`${view === 'without' ? 'block' : 'hidden'} md:block`}>
                        {/* Image card */}
                        <div className="rounded-2xl border bg-gradient-to-b from-zinc-100 to-zinc-50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-zinc-700">
                                    Without Acadify — multiple tools
                                </span>
                                <span className="shrink-0 rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600">
                                    Hours every week
                                </span>
                            </div>
                            <Image
                                src="/assets/landing/Without.png"
                                alt="Juggling multiple disconnected school tools"
                                width={1200}
                                height={800}
                                draggable={false}
                                className="h-auto w-full select-none rounded-xl pointer-events-none"
                                sizes="(min-width: 768px) 50vw, 100vw"
                            />
                        </div>

                        {/* Pain points */}
                        <ul className="mt-2">
                            {withoutPoints.map((point, i) => {
                                // Last row is a muted "trails off" capstone
                                const isLast = i === withoutPoints.length - 1
                                return (
                                    <li
                                        key={point.title}
                                        className="flex min-h-[76px] items-center gap-4 border-t py-4"
                                    >
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-600">
                                            <X className="size-4" />
                                        </span>
                                        <div>
                                            <p
                                                className={`text-foreground ${
                                                    isLast
                                                        ? 'font-medium italic text-muted-foreground'
                                                        : 'font-semibold'
                                                }`}
                                            >
                                                {point.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {point.subtitle}
                                            </p>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>

                    {/* WITH column */}
                    <div className={`${view === 'with' ? 'block' : 'hidden'} md:block`}>
                        {/* Image card */}
                        <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-primary/5 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-primary">
                                    With Acadify — one platform
                                </span>
                                <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                    Minutes a day
                                </span>
                            </div>
                            <Image
                                src="/assets/landing/With.png"
                                alt="Acadify — one platform for the whole school"
                                width={1200}
                                height={800}
                                draggable={false}
                                className="h-auto w-full select-none rounded-xl pointer-events-none"
                                sizes="(min-width: 768px) 50vw, 100vw"
                            />
                        </div>

                        {/* Outcomes */}
                        <ul className="mt-2">
                            {withPoints.map((point, i) => {
                                // Last row is an emphasized "and so much more" capstone
                                const isLast = i === withPoints.length - 1
                                return (
                                    <li
                                        key={point.title}
                                        className={`flex min-h-[76px] items-center gap-4 py-4 ${
                                            isLast
                                                ? '-mx-3 mt-1 rounded-xl bg-primary/5 px-3'
                                                : 'border-t'
                                        }`}
                                    >
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                            {isLast ? (
                                                <Sparkles className="size-4" />
                                            ) : (
                                                <Check className="size-4" />
                                            )}
                                        </span>
                                        <div>
                                            <p
                                                className={
                                                    isLast
                                                        ? 'font-bold text-primary'
                                                        : 'font-semibold text-foreground'
                                                }
                                            >
                                                {point.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {point.subtitle}
                                            </p>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    )
}
