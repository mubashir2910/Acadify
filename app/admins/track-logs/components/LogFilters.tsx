"use client"

import { CalendarDays } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { getNowIST } from "@/lib/working-days"

interface ClassSection { class: string; section: string }

interface LogFiltersProps {
  classSections: ClassSection[]
  selectedClass: string
  selectedSection: string
  from: string
  to: string
  onClassChange: (cls: string) => void
  onSectionChange: (section: string) => void
  onFromChange: (date: string) => void
  onToChange: (date: string) => void
}

export function LogFilters({
  classSections,
  selectedClass,
  selectedSection,
  from,
  to,
  onClassChange,
  onSectionChange,
  onFromChange,
  onToChange,
}: LogFiltersProps) {
  const uniqueClasses = Array.from(new Set(classSections.map((cs) => cs.class))).sort()
  const sections = classSections
    .filter((cs) => !selectedClass || cs.class === selectedClass)
    .map((cs) => cs.section)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .sort()

  return (
    <div className="flex flex-wrap gap-3 items-center bg-muted/50 rounded-xl px-4 py-3">
      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />

      <Select value={selectedClass || "_all"} onValueChange={(v) => { onClassChange(v === "_all" ? "" : v); onSectionChange("") }}>
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Classes</SelectItem>
          {uniqueClasses.map((c) => (
            <SelectItem key={c} value={c}>Class {c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedSection || "_all"} onValueChange={(v) => onSectionChange(v === "_all" ? "" : v)}>
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue placeholder="All Sections" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Sections</SelectItem>
          {sections.map((s) => (
            <SelectItem key={s} value={s}>Section {s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="a-from" className="font-medium">From</label>
        <input
          id="a-from"
          type="date"
          value={from}
          max={to}
          onChange={(e) => onFromChange(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="a-to" className="font-medium">To</label>
        <input
          id="a-to"
          type="date"
          value={to}
          min={from}
          max={getNowIST().toISOString().split("T")[0]}
          onChange={(e) => onToChange(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>
    </div>
  )
}
