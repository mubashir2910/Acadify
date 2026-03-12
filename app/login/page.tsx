import { LoginForm } from "@/components/forms/login-form"
import { Logo } from "@/components/logo"
import CalInit from "@/components/cal-init"
import Link from "next/link"

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">

                {/* Initializes Cal.com embed for the inline "Book a call" button */}
                <CalInit />

                {/* Centered logo */}
                <div className="flex justify-center mb-8">
                    <Logo />
                </div>

                {/* Login card */}
                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-8 py-10 md:px-10 md:py-12">
                    <LoginForm />

                    {/* Separator */}
                    <div className="relative my-7">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-3 text-muted-foreground tracking-widest font-medium">
                                Not registered?
                            </span>
                        </div>
                    </div>

                    {/* Guidance for unregistered users */}
                    <div className="space-y-3 text-sm text-gray-500 text-center">
                        <p>
                            <span className="font-semibold text-gray-700">Student?</span>{' '}
                            Your school may not be on Acadify yet. Fill our{' '}
                            <Link href="/contact-us" className="text-primary font-medium hover:underline">
                                contact form
                            </Link>{' '}
                            and we&apos;ll get in touch.
                        </p>
                        <p>
                            <span className="font-semibold text-gray-700">Teacher / Staff / School Owner?</span>{' '}
                            <button
                                data-cal-namespace="acadify-demo"
                                data-cal-link="mubashir2910/acadify-demo"
                                data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                                className="text-primary font-medium hover:underline cursor-pointer"
                            >
                                Book a call now
                            </button>{' '}
                            and automate your school today.
                        </p>
                    </div>
                </div>

            </div>
        </main>
    )
}
