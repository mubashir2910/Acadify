'use client'

import { motion } from 'motion/react'
import { Banknote, Phone } from 'lucide-react'
import MyApp from './book-demo'

export default function Pricing() {
    return (
        <section className="bg-gray-100 border-y border-gray-200 py-15" id="pricing">
            <div className="mx-auto mt-12 max-w-7xl px-6">
                {/* Section Header */}
                <div className="text-center">
                    <h2 className="inline-block text-3xl md:text-4xl font-extrabold text-gray-900">
                        Pricing Details
                        <span className="mt-2 block h-1 w-full rounded-full bg-gray-900" />
                    </h2>
                    <p className="mt-4 text-base md:text-lg text-gray-500 font-medium">
                        *All Plans include a FREE trial!
                    </p>
                </div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="mx-auto mt-14 max-w-xl rounded-2xl border border-gray-200 bg-gradient-to-br from-sky-50 via-white to-sky-50 p-10 shadow-lg lg:max-w-2xl"
                >
                    <div className="text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-sky-100">
                            <Banknote className="h-7 w-7 text-primary" />
                        </div>

                        <h3 className="mt-6 text-2xl font-bold text-gray-900">
                            A Digital Evolution for <span className="text-primary">Every School</span>
                        </h3>

                        <p className="mt-5 text-base leading-relaxed text-gray-600">
                            At <span className="font-semibold text-primary">Acadify</span>, we believe that
                            every school — big or small — deserves a powerful digital platform.
                            That&apos;s why our pricing is tailored based on the{' '}
                            <span className="font-semibold text-gray-900">strength of students</span> in
                            your institution, ensuring it stays affordable and fair for everyone.
                        </p>

                        <p className="mt-4 text-base leading-relaxed text-gray-600">
                            Book a call with our team to understand everything we offer and get a
                            pricing plan customised for your school.
                        </p>

                        <button
                            data-cal-namespace="acadify-demo"
                            data-cal-link="mubashir2910/acadify-demo"
                            data-cal-config='{"layout":"month_view"}'
                            className="mt-8 cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                        >
                            <Phone className="h-4 w-4" />
                            Book a Call With Us
                        </button>
                        
                    </div>
                </motion.div>
            </div>
        </section>
    )
}