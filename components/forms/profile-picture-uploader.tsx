"use client"

import { useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"

interface ProfilePictureUploaderProps {
  currentUrl?: string | null
  onUpload: (url: string) => void
  name?: string
}

export function ProfilePictureUploader({
  currentUrl,
  onUpload,
  name,
}: ProfilePictureUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getInitials(n?: string) {
    if (!n) return "?"
    return n
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB")
      return
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload/profile-picture", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? "Upload failed")
      }

      const { url } = await res.json()
      setPreviewUrl(url)
      onUpload(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setPreviewUrl(currentUrl ?? null)
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative group"
      >
        {/* Circle avatar */}
        <div className="h-24 w-24 rounded-full overflow-hidden bg-[#1e2a4a] flex items-center justify-center text-white text-2xl font-semibold">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(name)
          )}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        {uploading ? "Uploading..." : "Click to upload photo"}
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
