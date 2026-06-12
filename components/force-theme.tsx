import { cn } from "@/lib/utils"

interface ForceThemeProps {
  children: React.ReactNode
  className?: string
}

// Wrap a layout or page with <ForceLight> to keep it in light mode regardless
// of the user's theme choice. Useful for marketing pages, public pages, or any
// surface that must remain fixed (e.g. printable receipts).
export function ForceLight({ children, className }: ForceThemeProps) {
  return (
    <div className={cn("force-light bg-background text-foreground", className)}>
      {children}
    </div>
  )
}

// Symmetric counterpart — locks a subtree to the dark palette.
export function ForceDark({ children, className }: ForceThemeProps) {
  return (
    <div className={cn("force-dark bg-background text-foreground", className)}>
      {children}
    </div>
  )
}
