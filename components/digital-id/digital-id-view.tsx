"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Share2, Camera, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DigitalIdCard } from "./digital-id-card"
import type { DigitalIdCard as DigitalIdCardData } from "@/schemas/digital-id.schema"

// localStorage key suppresses the first-visit photo prompt once the user has made
// a choice (uploaded a photo OR explicitly opted to use their profile picture).
const setupKey = (acadifyId: string) => `acadify_digital_id_setup_${acadifyId}`

export function DigitalIdView() {
  const [card, setCard] = useState<DigitalIdCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sharing, setSharing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadCard() {
    try {
      const res = await fetch("/api/digital-id")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? "Failed to load Digital ID")
      }
      const data: DigitalIdCardData = await res.json()
      setCard(data)

      // First visit: prompt for a photo unless they've already chosen.
      const dismissed =
        typeof window !== "undefined" && localStorage.getItem(setupKey(data.acadifyId))
      if (!data.hasCustomPhoto && !dismissed) {
        setOnboardingOpen(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Digital ID")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCard()
  }, [])

  function markSetupDone() {
    if (card) localStorage.setItem(setupKey(card.acadifyId), "1")
  }

  // Upload a new ID photo → persist → refresh the card.
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload/digital-id-photo", {
        method: "POST",
        body: formData,
      })
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}))
        throw new Error(data.message ?? "Upload failed")
      }
      const { url } = await uploadRes.json()

      const saveRes = await fetch("/api/digital-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digitalIdPhoto: url }),
      })
      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}))
        throw new Error(data.message ?? "Failed to save photo")
      }

      markSetupDone()
      setOnboardingOpen(false)
      await loadCard()
      toast.success("ID photo updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Keep the existing profile picture (no dedicated photo) and stop prompting.
  function handleUseProfilePicture() {
    markSetupDone()
    setOnboardingOpen(false)
  }

  // Create (if needed) the public token, then share the link via the native
  // share sheet, falling back to clipboard copy on unsupported browsers.
  async function handleShare() {
    setSharing(true)
    try {
      const res = await fetch("/api/digital-id/share", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? "Failed to create share link")
      }
      const { token } = await res.json()
      const url = `${window.location.origin}/id/${token}`

      if (navigator.share) {
        try {
          await navigator.share({
            title: "My Acadify Digital ID",
            text: card ? `${card.name} — ${card.acadifyId}` : "My Acadify Digital ID",
            url,
          })
        } catch (shareErr) {
          // User dismissed the share sheet — not an error worth surfacing.
          if ((shareErr as Error)?.name !== "AbortError") {
            await navigator.clipboard.writeText(url)
            toast.success("Share link copied to clipboard")
          }
        }
      } else {
        await navigator.clipboard.writeText(url)
        toast.success("Share link copied to clipboard")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to share")
    } finally {
      setSharing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div
          className="w-full max-w-[300px] sm:max-w-[380px] animate-pulse rounded-[30px] bg-muted"
          style={{ aspectRatio: "0.718", maxHeight: "540px" }}
        />
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">{error ?? "Digital ID unavailable"}</p>
        <Button variant="outline" onClick={() => { setLoading(true); setError(null); loadCard() }}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-[300px] sm:max-w-[380px]">
        <DigitalIdCard card={card} onContactClick={handleShare} />
      </div>

      {/* Visible, mobile-friendly actions below the card */}
      <div className="flex w-full max-w-[300px] sm:max-w-[380px] flex-col gap-3 sm:flex-row">
        <Button className="flex-1" onClick={handleShare} disabled={sharing}>
          {sharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
          Share ID
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {card.hasCustomPhoto ? "Change photo" : "Add photo"}
        </Button>
      </div>

      <p className="max-w-[300px] sm:max-w-[380px] text-center text-xs text-muted-foreground">
        Tilt the card to see the holographic effect. Share your link to show it off anywhere.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* First-visit onboarding */}
      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up your Digital ID</DialogTitle>
            <DialogDescription>
              Add a clear, half-body photo of yourself for the best-looking card, or just use
              your existing profile picture. You can change this anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              Upload a photo
            </Button>
            <Button variant="outline" onClick={handleUseProfilePicture} disabled={uploading}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Use my profile picture
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
