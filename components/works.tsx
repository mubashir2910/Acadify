'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'

const steps = [
    {
        number: '01',
        title: 'Book a Demo',
        description:
            'Schedule a quick call with our team to see how Acadify fits your school.',
        accent: 'text-sky-500',
    },
    {
        number: '02',
        title: 'We Import Your Data',
        description:
            'The Acadify team handles migrating your existing school records and data seamlessly.',
        accent: 'text-emerald-500',
    },
    {
        number: '03',
        title: 'Dashboards for Everyone',
        description:
            'Staff, Admins, and Parents each get their own tailored dashboard from day one.',
        accent: 'text-violet-500',
    },
    {
        number: '04',
        title: 'Manage & Share Hassle-Free',
        description:
            'Run attendance, fees, results, and communication — all from a single platform.',
        accent: 'text-amber-500',
    },
]

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="py-20">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
                        How It Works
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* Hero Card */}
                    <div className="row-span-1 lg:row-span-2 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-sky-400 to-sky-600 p-10 text-white shadow-lg md:p-12">
                        <div>
                            <h2 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
                                Our Working Process —{' '}
                                <span className="text-sky-100">
                                    How We Work For Your School
                                </span>
                            </h2>
                            <p className="mt-6 max-w-md text-base leading-relaxed text-sky-100/90 md:text-lg">
                                Getting started with Acadify is simple. We
                                handle the heavy lifting so your school can
                                focus on what matters most — educating students.
                            </p>
                        </div>
                        <div className="mt-10">
                            <Button
                                asChild
                                size="lg"
                                className="rounded-xl bg-white px-6 text-base font-semibold text-sky-600 shadow-md hover:bg-sky-50"
                            >
                                <Link href="#link">Get Started</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Step Cards - 2x2 Grid */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {steps.map((step) => (
                            <motion.div
                                key={step.number}
                                className="group rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer"
                                whileTap={{ scale: 1.05 }}
                                transition={{ type: 'spring' as const, stiffness: 300, damping: 15 }}
                                onTap={(e) => {
                                    const target = e.target as HTMLElement
                                    const card = target.closest('[data-bulge]') as HTMLElement
                                    if (card) {
                                        card.style.transform = 'scale(1.04)'
                                        card.style.transition = 'transform 0.3s ease'
                                        setTimeout(() => {
                                            card.style.transform = 'scale(1)'
                                        }, 2000)
                                    }
                                }}
                                data-bulge
                            >
                                <span
                                    className={`text-4xl font-bold ${step.accent} md:text-5xl`}
                                >
                                    {step.number}
                                </span>
                                <h3 className="mt-4 text-lg font-bold text-gray-900">
                                    {step.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                    {step.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}