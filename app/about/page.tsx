import { HeroHeader } from '@/components/header'
import BookDemo from '@/components/book-demo'
import Footer from '@/components/footer'

export default function AboutPage() {
    return (
        <>
            <BookDemo />
            <HeroHeader />
            <main className="relative min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-24 pb-24">

                {/* Hero banner */}
                <div className="mx-auto max-w-3xl px-6 mb-8">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 px-10 py-8">
                        <p className="text-sm font-semibold uppercase tracking-widest text-primary/60 mb-3">
                            Our Story
                        </p>
                        <h1 className="text-4xl font-bold text-primary md:text-5xl">
                            About Acadify
                        </h1>
                        <p className="mt-4 max-w-xl text-muted-foreground text-lg">
                            A modern platform built by students who lived the problem.
                        </p>
                    </div>
                </div>

                {/* Content card */}
                <div className="mx-auto max-w-3xl px-6">
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-8 py-10 md:px-12 md:py-12 space-y-6 text-base leading-relaxed text-gray-600 md:text-lg">
                        <p>
                            Acadify was born out of a real, lived experience. As students who spent years
                            navigating the traditional school system, we saw firsthand how outdated and
                            fragmented school management really was — attendance on paper registers, fee
                            receipts stuffed in folders, results announced weeks late, and communication
                            between parents and teachers that barely existed.
                        </p>

                        <p>
                            We always wondered: in a world where everything is going digital, why are
                            schools still stuck in the past? That question stayed with us long after we
                            left school, and it became the spark behind Acadify. We didn&apos;t just want to
                            build another software product — we wanted to solve a problem we personally
                            understood and deeply cared about.
                        </p>

                        <p>
                            Acadify is our answer to the chaos. A single, unified platform that brings
                            attendance, fee management, results, class logs, and parent-teacher
                            communication under one roof. No more juggling five different tools or
                            drowning in paperwork. We designed it to be simple enough for any school —
                            whether it&apos;s a small-town institution with 200 students or a large academy
                            with thousands.
                        </p>

                        <p>
                            What drives us is the belief that every school deserves access to modern
                            technology, not just the ones with massive budgets. That&apos;s why Acadify is
                            built to be affordable, easy to adopt, and tailored to the real needs of
                            schools in India and beyond. We handle the heavy lifting — from data migration
                            to onboarding — so schools can focus on what truly matters: educating students.
                        </p>

                        <p>
                            We&apos;re a team of young builders, developers, and dreamers who believe that
                            digitalization isn&apos;t a luxury — it&apos;s a necessity. And we&apos;re just getting
                            started. Acadify isn&apos;t just a product; it&apos;s a movement to modernize education,
                            one school at a time.
                        </p>
                    </div>
                </div>

            </main>
            <Footer />
        </>
    )
}
