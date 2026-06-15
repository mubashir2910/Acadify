"use client"

import ProfileCard from "@/components/ui/profile-card"
import type { DigitalIdCard as DigitalIdCardData } from "@/schemas/digital-id.schema"

interface DigitalIdCardProps {
  card: DigitalIdCardData
  /** In-card button handler (Share ID). */
  onContactClick?: () => void
  contactText?: string
}

/**
 * Maps the Acadify Digital ID payload onto the react-bits ProfileCard slots:
 *   - name     → name
 *   - title    → "Role · School"
 *   - line 1   → class-section (e.g. III-A) when present, else the Acadify ID
 *   - line 2   → Acadify ID (only when line 1 is the class-section)
 *   - button   → "Share ID"
 * Shared by both the owner page and the public /id/[token] page.
 */
export function DigitalIdCard({
  card,
  onContactClick,
  contactText = "Share ID",
}: DigitalIdCardProps) {
  const title = [card.roleLabel, card.schoolName].filter(Boolean).join(" · ")

  // Students / class teachers show class-sec on top with the ID below; everyone
  // else (admins, non-class teachers) just shows the ID on the first line.
  const line1 = card.classSection || card.acadifyId
  const line2 = card.classSection ? card.acadifyId : ""

  return (
    <ProfileCard
      name={card.name}
      title={title}
      handle={line1}
      status={line2}
      contactText={contactText}
      avatarUrl={card.photoUrl ?? undefined}
      miniAvatarUrl={card.photoUrl ?? undefined}
      showUserInfo
      enableTilt
      enableMobileTilt
      behindGlowEnabled
      onContactClick={onContactClick}
    />
  )
}
