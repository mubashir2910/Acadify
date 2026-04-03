import { ResetPasswordForm } from "./components/reset-password-form"
import { Logo } from "@/components/logo"

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Centered logo */}
        <div className="flex justify-center mb-8">
          <a href="https://acadify.tech">
            <Logo />
          </a>
        </div>

        {/* Reset password card */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-8 py-10 md:px-10 md:py-12">
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  )
}
