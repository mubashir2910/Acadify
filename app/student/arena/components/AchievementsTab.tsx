"use client"

import {
  Crown,
  FlaskConical,
  Swords,
  Flame,
  Zap,
  Sigma,
  TrendingUp,
  CalendarCheck,
  Lock,
  Sparkles,
} from "lucide-react"

interface BadgeDef {
  name: string
  icon: React.ComponentType<{ className?: string }>
  /** Muted accent shown behind the locked badge for a premium feel. */
  tint: string
}

// Every badge is locked for now — this page is an intentional teaser for the
// upcoming Achievement & Badge Collection system.
const FEATURED: BadgeDef[] = [
  { name: "Arena Champion", icon: Crown, tint: "#FACC15" },
  { name: "Science Master", icon: FlaskConical, tint: "#22D3EE" },
  { name: "Quiz Warrior", icon: Swords, tint: "#A855F7" },
]

const MORE: BadgeDef[] = [
  { name: "Consistency King", icon: Flame, tint: "#FB923C" },
  { name: "Lightning Solver", icon: Zap, tint: "#FACC15" },
  { name: "Mathematics Expert", icon: Sigma, tint: "#3B82F6" },
  { name: "Top Performer", icon: TrendingUp, tint: "#22C55E" },
  { name: "Attendance Hero", icon: CalendarCheck, tint: "#F472B6" },
]

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"

function FeaturedBadge({ badge }: { badge: BadgeDef }) {
  const Icon = badge.icon
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Hexagon badge — muted while locked */}
        <div
          className="w-20 h-[88px] flex items-center justify-center bg-gradient-to-br from-[#1A2236] to-[#0F1521] border border-white/10"
          style={{ clipPath: HEX_CLIP }}
        >
          <Icon className="h-8 w-8 text-slate-500" />
        </div>
        {/* Lock overlay */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#0B0F1A] border border-white/15 flex items-center justify-center">
          <Lock className="h-3 w-3 text-slate-400" />
        </div>
      </div>
      <p className="text-xs font-medium text-slate-300 text-center leading-tight">{badge.name}</p>
      <span className="text-[10px] text-slate-500 uppercase tracking-wide">Locked</span>
    </div>
  )
}

function BadgeCard({ badge }: { badge: BadgeDef }) {
  const Icon = badge.icon
  return (
    <div className="relative bg-[#121826] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 overflow-hidden">
      {/* Subtle premium tint glow */}
      <div
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-2xl opacity-[0.07]"
        style={{ backgroundColor: badge.tint }}
      />
      <div className="relative w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
        <Icon className="h-6 w-6 text-slate-500" />
        <div className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-[#0B0F1A] border border-white/15 flex items-center justify-center">
          <Lock className="h-2.5 w-2.5 text-slate-400" />
        </div>
      </div>
      <p className="text-xs font-medium text-slate-300 text-center leading-tight">{badge.name}</p>
      <span className="text-[10px] text-slate-600">Locked</span>
    </div>
  )
}

export function AchievementsTab() {
  return (
    <div className="space-y-6">
      {/* Featured */}
      <section>
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#FACC15]" /> Achievements
        </h2>
        <div className="flex items-start justify-around gap-2 bg-gradient-to-b from-[#121826] to-[#0F1521] border border-white/5 rounded-2xl p-5">
          {FEATURED.map((b) => (
            <FeaturedBadge key={b.name} badge={b} />
          ))}
        </div>
      </section>

      {/* Teaser message */}
      <div className="text-center bg-gradient-to-br from-[#3B82F6]/10 to-[#22D3EE]/10 border border-[#3B82F6]/20 rounded-2xl p-5">
        <p className="text-2xl mb-1">🏅</p>
        <p className="text-sm font-semibold text-white">Keep participating and collecting XP!</p>
        <p className="text-xs text-slate-400 mt-1">
          The full Achievement &amp; Badge Collection system is coming soon with exciting rewards.
        </p>
      </div>

      {/* More badges */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">More Badges</p>
        <div className="grid grid-cols-3 gap-3">
          {MORE.map((b) => (
            <BadgeCard key={b.name} badge={b} />
          ))}
        </div>
      </section>
    </div>
  )
}
