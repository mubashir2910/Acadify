"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Star, Crown, ChevronDown } from "lucide-react"
import { motion } from "motion/react"

interface MonthOption {
  value: string
  label: string
}

function currentMonthValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

interface LeaderboardEntry {
  rank: number
  name: string
  totalPoints: number
  totalTimeMs: number
  avatarUrl?: string | null
  isCurrentUser?: boolean
}

interface ArenaLeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  disclaimer: string
}

// Medal artwork for the top 3 podium spots (gold / silver / bronze)
const RANK_MEDAL: Record<number, string> = {
  1: "/assets/arena/rank-1.png",
  2: "/assets/arena/rank-2.png",
  3: "/assets/arena/rank-3.png",
}

// Per-place accent colors used for avatar rings + points text
const PLACE_ACCENT: Record<number, string> = {
  1: "#FACC15", // gold
  2: "#3B82F6", // blue
  3: "#FB923C", // bronze
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/** Circular avatar with photo → initials fallback, sized + ring per usage. */
function PlayerAvatar({
  entry,
  className,
  ringColor,
}: {
  entry: LeaderboardEntry
  className?: string
  ringColor?: string
}) {
  const ringStyle = ringColor
    ? ({ "--tw-ring-color": ringColor } as React.CSSProperties)
    : undefined
  return (
    <Avatar
      className={`ring-2 ring-offset-2 ring-offset-[#0B0F1A] ${className ?? ""}`}
      style={ringStyle}
    >
      {entry.avatarUrl ? <AvatarImage src={entry.avatarUrl} alt={entry.name} className="object-cover" /> : null}
      <AvatarFallback className="bg-[#1A2236] text-slate-200 font-semibold">
        {getInitials(entry.name)}
      </AvatarFallback>
    </Avatar>
  )
}

/** One podium column. `place` (1|2|3) drives the medal image, ring color and pedestal height. */
function PodiumSpot({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  const accent = PLACE_ACCENT[place]
  const isFirst = place === 1
  const pedestalHeight = place === 1 ? "h-24" : place === 2 ? "h-16" : "h-12"

  return (
    <div className={`flex flex-col items-center min-w-0 ${isFirst ? "flex-[1.3]" : "flex-1"}`}>
      {/* Crown above the champion */}
      {isFirst && <Crown className="h-5 w-5 text-[#FACC15] mb-1 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]" />}

      {/* Avatar with overlapping medal badge */}
      <div className="relative">
        <PlayerAvatar
          entry={entry}
          ringColor={accent}
          className={`${isFirst ? "size-20" : "size-14"} ${
            isFirst ? "shadow-[0_0_24px_rgba(250,204,21,0.45)]" : ""
          }`}
        />
        <Image
          src={RANK_MEDAL[place]}
          alt={`Rank ${place}`}
          width={isFirst ? 34 : 26}
          height={isFirst ? 34 : 26}
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 drop-shadow-md"
        />
      </div>

      {/* Name + points */}
      <p
        className={`mt-4 text-center font-semibold truncate max-w-full px-1 ${
          isFirst ? "text-sm text-white" : "text-xs text-slate-200"
        }`}
        title={entry.name}
      >
        {entry.isCurrentUser ? "You" : entry.name}
      </p>
      <p className="text-xs font-bold" style={{ color: accent }}>
        {entry.totalPoints} XP
      </p>

      {/* Pedestal riser — champion gets a trophy, others are plain colored steps */}
      <div
        className={`mt-2 w-full ${pedestalHeight} rounded-t-xl border-t border-x flex items-start justify-center pt-2.5`}
        style={{
          background: `linear-gradient(to bottom, ${accent}22, transparent)`,
          borderColor: `${accent}55`,
        }}
      >
        {isFirst && <Trophy className="h-5 w-5" style={{ color: accent }} />}
      </div>
    </div>
  )
}

function Podium({ top }: { top: LeaderboardEntry[] }) {
  if (top.length === 0) return null
  // Render order: #2 (left) · #1 (center, elevated) · #3 (right). Only filled spots show.
  const order = [2, 1, 3].filter((p) => top[p - 1])
  return (
    <div className="flex items-end justify-center gap-2 px-2 max-w-sm mx-auto">
      {order.map((place) => (
        <PodiumSpot key={place} entry={top[place - 1]} place={place} />
      ))}
    </div>
  )
}

/** List row for ranks 4+. Highlights the current student. */
function ListRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
        entry.isCurrentUser
          ? "bg-gradient-to-r from-[#7C3AED]/30 to-[#3B82F6]/30 border-[#7C3AED]/50 shadow-[0_0_16px_rgba(124,58,237,0.25)]"
          : "bg-[#121826] border-white/5"
      }`}
    >
      <span
        className={`w-6 text-center text-sm font-semibold flex-shrink-0 ${
          entry.isCurrentUser ? "text-white" : "text-slate-500"
        }`}
      >
        {entry.rank}
      </span>
      <PlayerAvatar entry={entry} className="size-9 ring-0 ring-offset-0" ringColor="transparent" />
      <p
        className={`flex-1 truncate text-sm ${
          entry.isCurrentUser ? "text-white font-semibold" : "text-slate-300"
        }`}
      >
        {entry.isCurrentUser ? `You (${entry.name})` : entry.name}
      </p>
      <span
        className={`text-sm font-semibold flex-shrink-0 ${
          entry.isCurrentUser ? "text-white" : "text-slate-200"
        }`}
      >
        {entry.totalPoints} XP
      </span>
    </div>
  )
}

function LeaderboardView({
  data,
  loading,
  disclaimer,
}: {
  data: LeaderboardEntry[]
  loading: boolean
  disclaimer: string
}) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy>
        {/* Podium skeleton */}
        <div className="flex items-end justify-center gap-2 px-2">
          {["h-28", "h-36", "h-24"].map((h, i) => (
            <div key={i} className={`flex-1 max-w-[33%] ${h} rounded-xl bg-white/5 animate-pulse`} />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-[#121826] border border-white/5 rounded-xl p-3 animate-pulse"
          >
            <div className="h-7 w-7 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 bg-white/10 rounded" />
              <div className="h-2.5 w-1/4 bg-white/10 rounded" />
            </div>
            <div className="h-4 w-10 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No data yet.</p>
      </div>
    )
  }

  const top = data.slice(0, 3)
  const rest = data.slice(3)

  return (
    <div className="space-y-4">
      <Podium top={top} />

      {rest.length > 0 && (
        <div className="space-y-2 pt-2">
          {rest.map((entry) => (
            <ListRow key={`${entry.rank}-${entry.name}`} entry={entry} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-slate-500 text-center pt-1">{disclaimer}</p>
    </div>
  )
}

function PrizesSection() {
  return (
    <div className="flex items-center justify-center gap-2 mb-4 text-xs text-[#FACC15]">
      <Trophy className="h-3.5 w-3.5 flex-shrink-0" />
      <span>Exclusive reward for the top performer every month.</span>
    </div>
  )
}

export function LeaderboardTab() {
  const [activeTab, setActiveTab] = useState<"monthly" | "accumulated">("monthly")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonthValue())

  const [months, setMonths] = useState<MonthOption[]>([])
  const [monthsLoading, setMonthsLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  const [monthly, setMonthly] = useState<LeaderboardEntry[]>([])
  const [accumulated, setAccumulated] = useState<LeaderboardEntry[]>([])
  const [disclaimer, setDisclaimer] = useState("")
  const [loadingMonthly, setLoadingMonthly] = useState(true)
  const [loadingAccumulated, setLoadingAccumulated] = useState(true)

  // Fetch the available month list (anchored to school session_started_on)
  useEffect(() => {
    setMonthsLoading(true)
    fetch("/api/arena/months", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { months: MonthOption[] }) => setMonths(data.months ?? []))
      .catch(() => setMonths([]))
      .finally(() => setMonthsLoading(false))
  }, [])

  const fetchMonthly = useCallback((month: string) => {
    if (!month) return
    setLoadingMonthly(true)
    fetch(`/api/arena/leaderboard?type=monthly&month=${month}`)
      .then((r) => r.json())
      .then((data: ArenaLeaderboardResponse) => {
        setMonthly(data.leaderboard ?? [])
        setDisclaimer(data.disclaimer ?? "")
      })
      .catch(() => setMonthly([]))
      .finally(() => setLoadingMonthly(false))
  }, [])

  const fetchAccumulated = useCallback(() => {
    setLoadingAccumulated(true)
    fetch("/api/arena/leaderboard?type=accumulated")
      .then((r) => r.json())
      .then((data: ArenaLeaderboardResponse) => setAccumulated(data.leaderboard ?? []))
      .catch(() => setAccumulated([]))
      .finally(() => setLoadingAccumulated(false))
  }, [])

  useEffect(() => {
    fetchMonthly(selectedMonth)
  }, [selectedMonth, fetchMonthly])

  useEffect(() => {
    fetchAccumulated()
  }, [fetchAccumulated])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-[#3B82F6]" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3B82F6]">Rankings</p>
      </div>

      {/* Monthly / All-Time toggle. Monthly button is also the month-picker trigger. */}
      <div className="flex w-full gap-2">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={() => setActiveTab("monthly")}
              className={`flex-1 text-sm py-2 rounded-full border inline-flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "monthly"
                  ? "bg-[#3B82F6] border-[#3B82F6] text-white shadow-[0_0_14px_rgba(59,130,246,0.35)]"
                  : "border-white/15 text-slate-300 hover:text-white hover:border-white/30"
              }`}
            >
              <Star className="h-3.5 w-3.5" /> Monthly
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="z-[10000] w-44 p-1 max-h-72 overflow-y-auto bg-[#121826] border border-white/10"
          >
            {monthsLoading ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-7 rounded bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : months.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-3">No months available</p>
            ) : (
              months.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(m.value)
                    setPickerOpen(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${
                    m.value === selectedMonth
                      ? "bg-[#3B82F6]/20 text-white font-medium"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {m.label}
                </button>
              ))
            )}
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={() => setActiveTab("accumulated")}
          className={`flex-1 text-sm py-2 rounded-full border inline-flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "accumulated"
              ? "bg-[#3B82F6] border-[#3B82F6] text-white shadow-[0_0_14px_rgba(59,130,246,0.35)]"
              : "border-white/15 text-slate-300 hover:text-white hover:border-white/30"
          }`}
        >
          <Trophy className="h-3.5 w-3.5" /> All-Time
        </button>
      </div>

      {activeTab === "monthly" && (
        <motion.div
          key={selectedMonth}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mt-4"
        >
          <PrizesSection />
          <LeaderboardView data={monthly} loading={loadingMonthly} disclaimer={disclaimer} />
        </motion.div>
      )}

      {activeTab === "accumulated" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mt-4"
        >
          <LeaderboardView data={accumulated} loading={loadingAccumulated} disclaimer={disclaimer} />
        </motion.div>
      )}
    </div>
  )
}
