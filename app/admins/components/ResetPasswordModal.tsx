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

type Stage = "confirm" | "loading" | "result"

export default function ResetPasswordModal({
  open,
  onOpenChange,
  userName,
  userId,
}: ResetPasswordModalProps) {
  const [stage, setStage] = useState<Stage>("confirm")
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Reset state every time the modal is (re-)opened so an admin who closes
  // mid-flow always starts from the confirmation prompt next time.
  useEffect(() => {
    if (!open) return
    setStage("confirm")
    setTemporaryPassword(null)
    setError(null)
    setCopied(false)
  }, [open])

  async function handleConfirm() {
    setStage("loading")
    setError(null)
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? "Failed to reset password")
      setTemporaryPassword(data.temporaryPassword)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
    } finally {
      setStage("result")
    }
  }

  function handleCopy() {
    if (!temporaryPassword) return
    navigator.clipboard.writeText(temporaryPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    // Clear sensitive state before closing — password should not be re-revealed
    setTemporaryPassword(null)
    setError(null)
    setStage("confirm")
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
            {stage === "confirm"
              ? "You're about to generate a new temporary password."
              : `A new temporary password has been generated for `}
            {stage !== "confirm" && (
              <span className="font-medium text-foreground">{userName}</span>
            )}
            {stage !== "confirm" && "."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* ── Stage: confirm ─────────────────────────────────────── */}
          {stage === "confirm" && (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-200 p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This will create a new temporary password for{" "}
                  <span className="font-medium">{userName}</span>. Their current
                  password will stop working immediately and they will be
                  required to set a new one on next login.
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleConfirm} className="flex-1">
                  Create Password
                </Button>
              </div>
            </>
          )}

          {/* ── Stage: loading ─────────────────────────────────────── */}
          {stage === "loading" && (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {/* ── Stage: result ──────────────────────────────────────── */}
          {stage === "result" && (
            <>
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {temporaryPassword && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
                    <span className="flex-1 font-mono text-lg font-semibold tracking-widest text-foreground">
                      {temporaryPassword}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Copy password"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-200 p-3 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Share this password with {userName} directly. It will not be
                    shown again once you close this dialog. They will be
                    required to set a new password on next login.
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
