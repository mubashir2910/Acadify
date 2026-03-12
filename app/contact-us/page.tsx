import { HeroHeader } from '@/components/header'
import { ContactUsForm } from '@/components/forms/contact-us-form'
import { Mail } from 'lucide-react'
import BookDemo from '@/components/book-demo'
import Footer from '@/components/footer'

export default function ContactUsPage() {
    return (
        <>
            <BookDemo />
            <HeroHeader />
            <main className="relative min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-24 pb-24">
                {/* Page heading */}
                <div className="mx-auto max-w-2xl px-6 mb-8">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 px-10 py-8">
                        <div className="absolute right-8 top-8 opacity-10 pointer-events-none select-none">
                            <Mail className="size-24" />
                        </div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-primary/60 mb-3">
                            Get In Touch
                        </p>
                        <h1 className="text-4xl font-bold text-primary md:text-5xl">
                            Contact Us
                        </h1>
                        <p className="mt-4 max-w-xl text-muted-foreground text-lg">
                            Have a question or want to learn more? We&apos;d love to hear from you.
                        </p>
                    </div>
                </div>

                {/* Form card */}
                <div className="mx-auto max-w-2xl px-6">
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-8 py-10 md:px-12 md:py-12">
                        <ContactUsForm />
                    </div>
                </div>

            </main>
            <Footer />
        </>
    )
}
