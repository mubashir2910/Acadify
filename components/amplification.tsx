'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import FeaturesBook from '@/components/features-book'

const words = ['Attendance', 'Fees', 'Results', 'Communication', 'Class Log', 'ACADIFY']

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
            <div className="mx-auto mt-12 max-w-7xl px-6">
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

                    {/* Features Book — flip through every feature, one page at a time */}
                    <div className="mt-16">
                        <FeaturesBook />
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