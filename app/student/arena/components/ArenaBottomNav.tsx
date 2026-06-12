"use client"

import { motion } from "motion/react"
import { BarChart3, Swords, Trophy, Medal, History } from "lucide-react"

export type ArenaTab = "achievements" | "statistics" | "arena" | "leaderboard" | "history"

interface ArenaBottomNavProps {
  active: ArenaTab
  onChange: (tab: ArenaTab) => void
}

const TABS: { id: ArenaTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "achievements", label: "Achievements", icon: Medal },
  { id: "statistics", label: "Statistics", icon: BarChart3 },
  { id: "arena", label: "Arena", icon: Swords },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "history", label: "History", icon: History },
]

export function ArenaBottomNav({ active, onChange }: ArenaBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F1A]/95 backdrop-blur-md safe-area-pb">
      {/* Divider line — lowered so the (unshifted) center Arena icon sits across it.
          Adjust `top-7` to move the line up/down. */}
      <div aria-hidden className="pointer-events-none absolute top-7 left-0 right-0 border-t border-white/10" />
      <div className="flex items-end justify-around max-w-lg mx-auto px-1 pt-2 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.id
          const isCenter = tab.id === "arena"

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 min-w-0 flex-1 transition-all duration-200 ${
                isCenter ? "relative z-10" : ""
              }`}
            >
              {isCenter ? (
                /* Center primary button */
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-[#3B82F6] to-[#22D3EE] shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                      : "bg-[#121826] border border-[#3B82F6]/30"
                  }`}
                >
                  <Icon className={`h-7 w-7 ${isActive ? "text-white" : "text-[#3B82F6]"}`} />
                </motion.div>
              ) : (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded-xl transition-all ${
                    isActive ? "text-[#3B82F6]" : "text-slate-500"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              )}
              <span
                className={`text-[9px] font-medium whitespace-nowrap ${
                  isActive ? "text-[#3B82F6]" : "text-slate-500"
                } ${isCenter ? "mt-1" : ""}`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
