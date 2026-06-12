"use client"

import { motion } from "motion/react"
import { getLevelProgress, getLevelIconPath } from "@/lib/arena-levels"
import { LevelBadge } from "./LevelBadge"

// Hide a level/subject icon gracefully if its asset file isn't present yet.
function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none"
}

export function DashboardLevelCard({ totalXp }: { totalXp: number }) {
  const lvl = getLevelProgress(totalXp)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A2236] to-[#121826] p-4">
      {/* Top row: shield + level info + current-level icon */}
      <div className="flex items-center gap-4">
        <LevelBadge level={lvl.level} size={64} />

        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-slate-400">Level {lvl.level}</p>
          <p className="text-lg font-bold text-white leading-tight truncate">{lvl.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {lvl.isMax ? `${lvl.totalXp} XP` : `${lvl.xpIntoLevel} / ${lvl.xpForLevel} XP`}
          </p>
        </div>

        <img
          src={getLevelIconPath(lvl.title)}
          alt={lvl.title}
          onError={hideOnError}
          className="w-14 h-14 object-contain flex-shrink-0 drop-shadow-[0_4px_16px_rgba(34,211,238,0.25)]"
        />
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mt-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${lvl.progressPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#22D3EE]"
        />
      </div>

      {/* Next reward = the next level title */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2.5">
        {!lvl.isMax && (
          <img
            src={getLevelIconPath(lvl.nextTitle as string)}
            alt={lvl.nextTitle ?? ""}
            onError={hideOnError}
            className="w-8 h-8 object-contain flex-shrink-0 opacity-90"
          />
        )}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Next Reward</p>
          <p className="text-sm font-semibold text-white truncate">
            {lvl.isMax ? "Max level reached 🏆" : lvl.nextTitle}
          </p>
        </div>
        {!lvl.isMax && (
          <span className="ml-auto text-[11px] font-medium text-[#FACC15] flex-shrink-0">
            {lvl.xpToNext} XP to go
          </span>
        )}
      </div>
    </div>
  )
}
