import Image from "next/image"
import { LoginForm } from "@/components/forms/login-form"
import { Logo } from "@/components/logo"
import CalInit from "@/components/cal-init"
import { ForceLight } from "@/components/force-theme"
import { GraduationCap, School, ShieldCheck } from "lucide-react"

export default function LoginPage() {
    return (
        <ForceLight>
            {/* Initializes Cal.com embed for the inline "Book a Demo" button */}
            <CalInit />

            <main className="min-h-screen bg-white lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
                {/* Left: form column — desktop is three zones (logo top, login box
                    centred in the middle, info boxes + footer pinned to the bottom). */}
                <div className="flex flex-col lg:h-screen">
                    {/* Desktop logo (top) */}
                    <div className="hidden p-6 lg:block">
                        <a href="https://acadify.tech">
                            <Logo />
                        </a>
                    </div>

                    {/* Mobile: logo on top (no nav menu on the login page) */}
                    <div className="px-5 py-4 lg:hidden">
                        <a href="https://acadify.tech">
                            <Logo />
                        </a>
                    </div>

                    {/* Login box — desktop: centred card in the middle (flex-1);
                        mobile: a card just below the logo (no hero image). */}
                    <div className="px-5 pt-30 lg:flex lg:flex-1 lg:items-center lg:justify-center lg:px-10 lg:pt-0">
                        <div className="w-full lg:mx-auto lg:max-w-sm">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:rounded-3xl lg:p-5">
                                <LoginForm />
                            </div>
                        </div>
                    </div>

                    {/* Bottom: two info boxes (full width) + footer */}
                    <div className="px-6 pb-6 pt-4 lg:px-10 lg:pt-0">
                        <div className="grid gap-3 lg:grid-cols-2">
                            {/* Student or Teacher */}
                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                                    <GraduationCap className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold leading-snug text-slate-800">
                                        Student or Teacher?
                                    </p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                        Your credentials are provided by your school admin.
                                        Contact your school if you haven&apos;t received them
                                        yet.
                                    </p>
                                </div>
                            </div>

                            {/* School not on Acadify */}
                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                                    <School className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold leading-snug text-slate-800">
                                        School not on Acadify?
                                    </p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                        Book a free demo and get your school set up in no
                                        time.
                                    </p>
                                    <button
                                        type="button"
                                        data-cal-namespace="acadify-demo"
                                        data-cal-link="mubashir2910/acadify-demo"
                                        data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                                        className="mt-3 inline-block cursor-pointer rounded-lg border border-primary/40 px-4 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-blue-50"
                                    >
                                        Book a Demo
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                            <ShieldCheck className="h-4 w-4 text-slate-400" />
                            Secure. Reliable. Built for Education.
                        </div>
                    </div>
                </div>

                {/* Right: desktop image (marketing text + AI card baked in) */}
                <div className="relative hidden lg:block">
                    <Image
                        src="/assets/landing/login_desktop.png"
                        alt="Simplifying school management, empowering education"
                        fill
                        priority
                        sizes="50vw"
                        draggable={false}
                        className="object-cover pointers-events-none"
                    />
                    {/* Fade the left edge into the white form panel so it blends */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 w-18 bg-gradient-to-r from-white via-white/10 to-transparent"
                    />
                </div>
            </main>
        </ForceLight>
    )
}
