import { Toaster } from "sonner"

// Full-screen immersive layout — covers the parent DashboardShell (sidebar + header)
// using fixed positioning so navigation back to dashboard restores the shell naturally.
export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0B0F1A] text-white overflow-y-auto">
      {children}
      <Toaster position="top-center" richColors />
    </div>
  )
}
