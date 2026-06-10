import { LoginForm } from "@/components/forms/login-form"
import { Logo } from "@/components/logo"
import CalInit from "@/components/cal-init"
import Link from "next/link"
import { ForceLight } from "@/components/force-theme"
import { GraduationCap, School } from "lucide-react"

export default function LoginPage() {
    return (
        <ForceLight>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">

                {/* Initializes Cal.com embed for the inline "Book a call" button */}
                <CalInit />

                {/* Centered logo */}
                <div className="flex justify-center mb-8">
                    <a href="https://acadify.tech">
                    <Logo/>
                    </a>
                </div>

                {/* Login card */}
                <div className="rounded-2xl bg-card border border-border shadow-sm px-8 py-10 md:px-10 md:py-12">
                    <LoginForm />
                </div>

                {/* Info blocks */}
                <div className="mt-5 space-y-3">
                    {/* Student or Teacher block */}
                    <div className="flex items-start gap-4 rounded-xl bg-white border border-slate-200/80 px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                        <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-emerald-50 mt-0.5">
                            <GraduationCap className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 leading-snug">
                                Student or Teacher?
                            </p>
                            <p className="text-[13px] text-slate-500 leading-relaxed mt-0.5">
                                Your credentials are provided by your school admin. Contact your school if you haven&apos;t received them yet.
                            </p>
                        </div>
                    </div>

                    {/* School not on Acadify block */}
                    <div className="flex items-start gap-4 rounded-xl bg-white border border-slate-200/80 px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                        <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-emerald-50 mt-0.5">
                            <School className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 leading-snug">
                                School not on Acadify?
                            </p>
                            <p className="text-[13px] text-slate-500 leading-relaxed mt-0.5">
                                Book a free demo and get your school set up in no time.
                            </p>
                        </div>
                        <a
                            href="https://cal.com/mubashir2910/acadify-demo"
                            target="_blank"
                            rel="noopener noreferrer"
                            data-cal-namespace="acadify-demo"
                            data-cal-link="mubashir2910/acadify-demo"
                            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                            className="flex-shrink-0 self-center text-[13px] font-medium text-primary border border-slate-200 rounded-lg px-4 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            Book a Demo
                        </a>
                    </div>
                </div>

            </div>
        </main>
        </ForceLight>
    )
}
