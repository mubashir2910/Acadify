"use client"

import { AnimatePresence, motion } from "motion/react"

interface FieldErrorProps {
  message?: string
}

// Validation errors are high-frequency, so the motion stays subtle and fast:
// a short fade + slide-down on enter, and a faster fade on exit (asymmetric
// timing — the system responds quicker than the user deliberates). Movement is
// collapsed automatically under prefers-reduced-motion via the global CSS rule.
export function FieldError({ message }: FieldErrorProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {message && (
        <motion.p
          key={message}
          className="text-sm text-destructive"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{
            duration: 0.15,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
