"use client"

import { cn } from "@/lib/utils"

interface ClassFilterProps {
  classSections: { class: string; section: string }[]
  selected: string
  onChange: (value: string) => void
}

export default function ClassFilter({
  classSections,
  selected,
  onChange,
}: ClassFilterProps) {
  const options = [
    { label: "All Classes", value: "all" },
    ...classSections.map((cs) => ({
      label: `${cs.class}-${cs.section}`,
      value: `${cs.class}|${cs.section}`,
    })),
  ]

  return (
    <>
      {/* Mobile: dropdown */}
      <div className="lg:hidden">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: pills */}
      <div className="hidden lg:flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
              selected === opt.value
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-card text-muted-foreground border-border hover:bg-muted/50"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  )
}
