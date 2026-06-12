"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"

const ICON_SEQUENCE = [
  "contest",
  "trophy",
  "flame",
  "star",
  "xp",
  "rank",
  "accuracy",
] as const

const DEFAULT_TAGLINES = [
  "Customizing your Arena",
  "Matching Challenges",
  "Sharpening Swords",
  "Loading the Battlefield",
]

const ICON_INTERVAL_MS = 450
const TAGLINE_INTERVAL_MS = 2000

type Size = "sm" | "md" | "lg"
type Tone = "dark" | "light"

const SIZE_PX: Record<Size, number> = {
  sm: 48,
  md: 72,
  lg: 112,
}

interface ArenaSpinnerProps {
  tagline?: string
  size?: Size
  fullscreen?: boolean
  tone?: Tone
  className?: string
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return reduced
}

export function ArenaSpinner({
  tagline,
  size = "md",
  fullscreen = false,
  tone = "dark",
  className,
}: ArenaSpinnerProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [iconIdx, setIconIdx] = useState(0)
  const [taglineIdx, setTaglineIdx] = useState(0)

  const rotateTagline = tagline === undefined

  useEffect(() => {
    if (reducedMotion) return
    const id = window.setInterval(() => {
      setIconIdx((i) => (i + 1) % ICON_SEQUENCE.length)
    }, ICON_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion || !rotateTagline) return
    const id = window.setInterval(() => {
      setTaglineIdx((i) => (i + 1) % DEFAULT_TAGLINES.length)
    }, TAGLINE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [reducedMotion, rotateTagline])

  const px = SIZE_PX[size]
  const iconName = ICON_SEQUENCE[iconIdx]
  const displayTagline = tagline ?? DEFAULT_TAGLINES[taglineIdx]

  const textColor = tone === "dark" ? "text-slate-300" : "text-slate-600"
  const dotColor = tone === "dark" ? "bg-[#3B82F6]" : "bg-slate-400"

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        className
      )}
    >
      {/* Icon carousel */}
      <div
        style={{ width: px, height: px }}
        className="relative flex items-center justify-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={iconName}
            src={`/assets/arena/${iconName}.png`}
            alt=""
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ width: px, height: px }}
            className="object-contain drop-shadow-[0_0_18px_rgba(34,211,238,0.25)]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.visibility = "hidden"
            }}
          />
        </AnimatePresence>
      </div>

      {/* Tagline */}
      <div className="min-h-5 text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={displayTagline}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "text-sm font-medium tracking-tight",
              textColor
            )}
          >
            {displayTagline}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Pulsing dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={
              reducedMotion ? { opacity: 0.6 } : { opacity: [0.3, 1, 0.3] }
            }
            transition={
              reducedMotion
                ? undefined
                : { duration: 1, repeat: Infinity, delay: i * 0.2 }
            }
            className={cn("w-1.5 h-1.5 rounded-full", dotColor)}
          />
        ))}
      </div>
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F1A]">
        {content}
      </div>
    )
  }

  return content
}
