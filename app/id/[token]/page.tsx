import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getDigitalIdByToken } from "@/services/digital-id.service"
import { PublicDigitalId } from "@/components/digital-id/public-digital-id"

// Standalone public page (no sidebar / dashboard chrome) — anyone with the link
// can view the card. Lookup is by an unguessable token, never the Acadify ID.

interface PageProps {
  params: Promise<{ token: string }>
}

export const metadata: Metadata = {
  title: "Digital ID · Acadify",
  // Don't let search engines index shared cards.
  robots: { index: false, follow: false },
}

export default async function PublicDigitalIdPage({ params }: PageProps) {
  const { token } = await params
  const card = await getDigitalIdByToken(token)
  if (!card) notFound()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12">
      <PublicDigitalId card={card} />
      <a
        href="https://acadify.tech"
        className="text-xs text-white/50 transition-colors hover:text-white/80"
      >
        Powered by Acadify
      </a>
    </main>
  )
}
