"use client"

import { toast } from "sonner"
import { DigitalIdCard } from "./digital-id-card"
import type { DigitalIdCard as DigitalIdCardData } from "@/schemas/digital-id.schema"

/**
 * Read-only public rendering of a Digital ID (the /id/[token] page). The in-card
 * button re-shares the current public URL via the native share sheet, falling
 * back to clipboard copy.
 */
export function PublicDigitalId({ card }: { card: DigitalIdCardData }) {
  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Acadify Digital ID",
          text: `${card.name} — ${card.acadifyId}`,
          url,
        })
        return
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Couldn't copy the link")
    }
  }

  return (
    <div className="w-full max-w-[300px] sm:max-w-[380px]">
      <DigitalIdCard card={card} onContactClick={handleShare} />
    </div>
  )
}
