'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
    BookOpen,
    CreditCard,
    BarChart3,
    MessageSquare,
    FolderArchive,
    ClipboardCheck,
} from 'lucide-react'

const words = ['Attendance', 'Fees', 'Results', 'Communication', 'Class Log', 'ACADIFY']

const features = [
    {
        icon: ClipboardCheck,
        title: 'Attendance Tracking',
        description:
            'Mark and monitor student attendance digitally with real-time updates for parents and staff.',
    },
    {
        icon: FolderArchive,
        title: 'Class Log',
        description:
            'Teachers and parents can easily track what has been taught in school daily, subject-wise.',
    },
    {
        icon: MessageSquare,
        title: 'Communication Hub*',
        description:
            'Seamless messaging between teachers, parents, and administration in one unified platform.',
    },
    {
        icon: CreditCard,
        title: 'Fee Management*',
        description:
            'Streamlined fee collection, invoicing, and tracking with automated reminders and receipts.',
    },
    {
        icon: BarChart3,
        title: 'Result Management*',
        description:
            'Generate report cards, track academic progress, and share results with parents instantly.',
    },

    {
        icon: BookOpen,
        title: 'Academic Planning*',
        description:
            'Create timetables, manage syllabi, and plan academic calendars with ease and flexibility.',
    },
]

export default function Amplification() {
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const duration = words[currentIndex] === 'ACADIFY' ? 4000 : 1500
        const timeout = setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % words.length)
        }, duration)
        return () => clearTimeout(timeout)
    }, [currentIndex])

    return (
        <section id="features" className="bg-gray-100 py-16 border-y border-gray-200 mt-16">
            <div className="mx-auto max-w-7xl px-6">
                <div className="text-center">
                    {/* Main Heading */}
                    <h1 className="text-4xl font-bold">
                        Running a school shouldn&apos;t feel like running{' '}
                        <span className="italic text-red-600">
                            five different systems.
                        </span>
                    </h1>



                    {/* Hook Line */}
                    <div className="mt-10">
                        <h2 className="text-xl font-bold text-gray-900 md:text-4xl">
                            The{' '}
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={words[currentIndex]}
                                    initial={{ y: 16, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -16, opacity: 0 }}
                                    transition={{
                                        duration: 0.4,
                                        ease: 'easeInOut',
                                    }}
                                    className="inline-block rounded-lg bg-primary px-3 py-1 text-white"
                                >
                                    {words[currentIndex]}
                                </motion.span>
                            </AnimatePresence>{' '}
                            System
                        </h2>
                        <p className="mt-4 text-md lg:text-2xl text-zinc-500 font-medium">
                            Everything under one roof.
                        </p>

                    </div>

                    {/* Features Grid */}
                    <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => (
                            <motion.div
                                key={feature.title}
                                className="group rounded-2xl bg-white p-8 text-center shadow-sm border border-gray-200 transition-shadow duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer"
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
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors duration-300 group-hover:bg-sky-50 group-hover:text-sky-500">
                                    <feature.icon className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="mt-5 text-lg font-bold text-gray-900">
                                    {feature.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Closing Line */}
                    <p className="mt-14 text-4xl font-bold text-gray-500">
                        One ecosystem.{' '}
                        <span className="italic text-primary">Zero chaos.</span>
                    </p>
                </div>
            </div>
        </section>
    )
}