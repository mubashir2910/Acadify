"use client"

import { motion } from "motion/react"
import { BarChart3, Swords, Trophy } from "lucide-react"

export type ArenaTab = "performance" | "attempt" | "leaderboard"

interface ArenaBottomNavProps {
  active: ArenaTab
  onChange: (tab: ArenaTab) => void
}

const TABS: { id: ArenaTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "performance", label: "My Performance", icon: BarChart3 },
  { id: "attempt", label: "Attempt", icon: Swords },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
]

export function ArenaBottomNav({ active, onChange }: ArenaBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0B0F1A]/95 backdrop-blur-md safe-area-pb">
      <div className="flex items-end justify-around max-w-lg mx-auto px-2 pt-2 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.id
          const isCenter = tab.id === "attempt"

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                isCenter ? "relative -top-4" : ""
              }`}
            >
              {isCenter ? (
                /* Center primary button */
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
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
                  className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
                    isActive ? "text-[#3B82F6]" : "text-slate-500"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              )}
              <span
                className={`text-[10px] font-medium ${
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
