"use client"

import { useEffect, useState } from "react"
import { Copy, Check, KeyRound, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ResetPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  userId: string
}

export default function ResetPasswordModal({
  open,
  onOpenChange,
  userName,
  userId,
}: ResetPasswordModalProps) {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Trigger reset as soon as the modal opens
  useEffect(() => {
    if (!open) return
    setTemporaryPassword(null)
    setError(null)
    setCopied(false)
    setLoading(true)

    fetch(`/api/users/${userId}/reset-password`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? "Failed to reset password")
        setTemporaryPassword(data.temporaryPassword)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [open, userId])

  function handleCopy() {
    if (!temporaryPassword) return
    navigator.clipboard.writeText(temporaryPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    // Clear password from state before closing — it should not be visible again
    setTemporaryPassword(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            A new temporary password has been generated for{" "}
            <span className="font-medium text-foreground">{userName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {temporaryPassword && (
            <>
              <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-4 py-3">
                <span className="flex-1 font-mono text-lg font-semibold tracking-widest text-slate-900">
                  {temporaryPassword}
                </span>
                <button
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy password"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Share this password with {userName} directly. It will not be shown again once you close this dialog. They will be required to set a new password on next login.
              </div>
            </>
          )}

          <Button
            onClick={handleClose}
            className="w-full"
            variant={temporaryPassword ? "default" : "outline"}
          >
            {temporaryPassword ? "Done" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
