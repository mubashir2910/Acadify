import { HeroHeader } from '@/components/header'

export default function AboutPage() {
    return (
        <>
            {/* <HeroHeader /> */}
            <main className="relative min-h-screen bg-white">
                <div className="mx-auto max-w-3xl px-6 pt-32 pb-24 md:pb-32">

                    {/* Heading */}
                    <h1 className="mt-10 text-center text-3xl font-bold text-primary md:text-4xl">
                        <span className="border-b-4 border-primary pb-2">About Acadify</span>
                    </h1>

                    {/* Content */}
                    <div className="mt-10 space-y-6 text-base leading-relaxed text-gray-600 md:text-lg">
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
        </>
    )
}
