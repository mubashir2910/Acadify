// ─── Arena Level & XP Progression Config ─────────────────────────────────────
// Single source of truth for the Arena gamification level system.
// "XP" is the student's lifetime accumulated contest points (sum of attempt
// scores) — a pure UI concept layered on top of existing point data.
//
// Progression is intentionally non-linear (each level costs more than the last)
// so advancing stays meaningful. Adding future levels is a one-line append:
// push a new entry and bump LEVEL_CAP_XP.

export interface ArenaLevel {
  level: number
  title: string
  /** Cumulative total XP at which a student ENTERS this level. */
  minXp: number
}

// minXp = cumulative XP to reach the level (increments 100/150/200/300/350/400/500).
// A student starts at Explorer (Lv1) with 0 XP and advances as XP crosses each floor.
export const ARENA_LEVELS: ArenaLevel[] = [
  { level: 1, title: "Explorer", minXp: 0 },
  { level: 2, title: "Learner", minXp: 100 },
  { level: 3, title: "Scholar", minXp: 250 },
  { level: 4, title: "Achiever", minXp: 450 },
  { level: 5, title: "Champion", minXp: 750 },
  { level: 6, title: "Master", minXp: 1100 },
  { level: 7, title: "Legend", minXp: 1500 },
]

// XP that "clears" the highest defined level — i.e. the entry floor a future
// Level 8 would use. Keeps the top level's progress bar meaningful.
export const LEVEL_CAP_XP = 2000

export interface LevelProgress {
  level: number
  title: string
  /** Title of the next level, or null when at the max defined level. */
  nextTitle: string | null
  /** The student's lifetime XP. */
  totalXp: number
  /** XP floor of the current level. */
  currentFloor: number
  /** XP floor of the next level (or LEVEL_CAP_XP at the top). */
  nextFloor: number
  /** XP earned within the current level band. */
  xpIntoLevel: number
  /** Total XP span of the current level band. */
  xpForLevel: number
  /** XP still required to reach the next level (0 when maxed). */
  xpToNext: number
  /** Progress through the current band, 0–100 (clamped). */
  progressPct: number
  /** True when the student has reached/exceeded the top level cap. */
  isMax: boolean
}

/**
 * Resolve a student's level + progression from their lifetime XP.
 * Pure + deterministic — safe to call on every render.
 */
export function getLevelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp || 0))

  // Current level = the last level whose floor we've reached.
  let idx = 0
  for (let i = 0; i < ARENA_LEVELS.length; i++) {
    if (xp >= ARENA_LEVELS[i].minXp) idx = i
    else break
  }

  const current = ARENA_LEVELS[idx]
  const next = ARENA_LEVELS[idx + 1] ?? null

  const currentFloor = current.minXp
  const nextFloor = next ? next.minXp : LEVEL_CAP_XP
  const isMax = !next && xp >= LEVEL_CAP_XP

  const xpForLevel = Math.max(1, nextFloor - currentFloor)
  const xpIntoLevel = Math.min(xp - currentFloor, xpForLevel)
  const xpToNext = isMax ? 0 : Math.max(0, nextFloor - xp)
  const progressPct = isMax
    ? 100
    : Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpForLevel) * 100)))

  return {
    level: current.level,
    title: current.title,
    nextTitle: isMax ? null : next?.title ?? null,
    totalXp: xp,
    currentFloor,
    nextFloor,
    xpIntoLevel,
    xpForLevel,
    xpToNext,
    progressPct,
    isMax,
  }
}

/** Convenience: just the title for a given XP (used in compact chips). */
export function getLevelTitle(totalXp: number): string {
  return getLevelProgress(totalXp).title
}

/**
 * Path to a level's badge artwork, served from public/assets/arena/<title>.png
 * (e.g. "Explorer" → "/assets/arena/explorer.png").
 */
export function getLevelIconPath(title: string): string {
  return `/assets/arena/${title.toLowerCase()}.png`
}
