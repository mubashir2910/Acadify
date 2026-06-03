"use client"

import { motion } from "motion/react"
import { Swords } from "lucide-react"

const words = ["Educate", "Compete", "Win"]

export function ArenaLoader() {
  return (
    <div className="fixed inset-0 bg-[#0B0F1A] flex flex-col items-center justify-center gap-8 z-50">
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#22D3EE] flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.35)]"
        >
          <Swords className="h-10 w-10 text-white" />
        </motion.div>
        {/* Glow ring */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-2xl border border-[#22D3EE]/30"
        />
      </motion.div>

      {/* Brand name */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center"
      >
        <p className="text-2xl font-bold tracking-tight text-white">
          ACADIFY <span className="text-[#22D3EE]">ARENA</span>
        </p>
      </motion.div>

      {/* Staggered tagline words */}
      <div className="flex items-center gap-3 text-sm font-medium">
        {words.map((word, i) => (
          <motion.span
            key={word}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15, duration: 0.4 }}
            className={i === 1 ? "text-[#22D3EE]" : "text-slate-400"}
          >
            {word}
            {i < words.length - 1 && (
              <span className="text-slate-600 ml-3">•</span>
            )}
          </motion.span>
        ))}
      </div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex gap-1.5"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"
          />
        ))}
      </motion.div>
    </div>
  )
}
