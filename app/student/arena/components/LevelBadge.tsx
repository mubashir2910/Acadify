"use client"

import { useId } from "react"

// Shield silhouette: gently domed flat top with rounded corners → rounded point.
const SHIELD = "M16 12 Q50 8 84 12 Q90 12 90 18 L90 52 Q90 86 50 104 Q10 86 10 52 L10 18 Q10 12 16 12 Z"

/** Violet shield badge with the level number inside (replaces the square box). */
export function LevelBadge({ level, size = 64 }: { level: number; size?: number }) {
  const id = useId()
  const fontSize = level >= 10 ? 32 : 42

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 112"
      className="flex-shrink-0 drop-shadow-[0_0_14px_rgba(56,189,248,0.5)]"
      role="img"
      aria-label={`Level ${level}`}
    >
      <defs>
        <linearGradient id={`${id}-outer`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id={`${id}-inner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      {/* Outer shield + rim */}
      <path d={SHIELD} fill={`url(#${id}-outer)`} stroke="#BAE6FD" strokeWidth="2.5" strokeOpacity="0.75" />
      {/* Inner shield for depth */}
      <g transform="translate(50 56) scale(0.78) translate(-50 -56)">
        <path d={SHIELD} fill={`url(#${id}-inner)`} fillOpacity="0.5" />
      </g>

      {/* Level number */}
      <text
        x="50"
        y="55"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="800"
        fill="#ffffff"
        style={{ paintOrder: "stroke" }}
      >
        {level}
      </text>
    </svg>
  )
}
