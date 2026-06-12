import { SUBJECT_GROUPS, type SubjectGroup } from "@/schemas/quiz.schema"

// ─── Subject-group cosmetics ─────────────────────────────────────────────────
// UI-only mapping: each subject group gets a consistent accent color and an icon
// image (served from public/assets/arena/<lowercase group>.png). Used to theme
// the dashboard challenge cards and history cards.

export interface SubjectGroupVisual {
  color: string
  icon: string
}

export const SUBJECT_GROUP_VISUALS: Record<SubjectGroup, SubjectGroupVisual> = {
  SCIENCE: { color: "#22C55E", icon: "/assets/arena/science.png" }, // green
  MATHEMATICS: { color: "#3B82F6", icon: "/assets/arena/mathematics.png" }, // blue
  SOCIAL_SCIENCE: { color: "#D97706", icon: "/assets/arena/social_science.png" }, // amber/brown
  LANGUAGES: { color: "#A855F7", icon: "/assets/arena/languages.png" }, // purple
  COMPUTER_SCIENCE: { color: "#22D3EE", icon: "/assets/arena/computer_science.png" }, // cyan
  COMMERCE: { color: "#14B8A6", icon: "/assets/arena/commerce.png" }, // teal
  ARTS: { color: "#EC4899", icon: "/assets/arena/arts.png" }, // pink
  GENERAL_KNOWLEDGE: { color: "#6366F1", icon: "/assets/arena/general_knowledge.png" }, // indigo
}

// Fallback used when a quiz has no subject group (defaults to GENERAL_KNOWLEDGE).
const FALLBACK: SubjectGroupVisual = SUBJECT_GROUP_VISUALS.GENERAL_KNOWLEDGE

export function subjectGroupVisual(group?: SubjectGroup): SubjectGroupVisual {
  if (group && SUBJECT_GROUPS.includes(group)) return SUBJECT_GROUP_VISUALS[group]
  return FALLBACK
}

export function subjectGroupColor(group?: SubjectGroup): string {
  return subjectGroupVisual(group).color
}

export function subjectGroupIcon(group?: SubjectGroup): string {
  return subjectGroupVisual(group).icon
}
