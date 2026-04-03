"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft } from "lucide-react"
import PeriodStructureManager from "./PeriodStructureManager"
import TimetableGridView from "@/components/timetable-grid-view"
import AssignCellModal from "./AssignCellModal"
import type { TimetableGrid, PeriodRow, TimetableCell, DayOfWeek } from "@/schemas/timetable.schema"

interface TimetableEditSectionProps {
  periods: PeriodRow[]
  grid: TimetableGrid
  onRefresh: () => void
}

interface ModalState {
  open: boolean
  period: PeriodRow | null
  day: DayOfWeek | null
  existingCell?: TimetableCell
}

export default function TimetableEditSection({ periods, grid, onRefresh }: TimetableEditSectionProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [modal, setModal] = useState<ModalState>({ open: false, period: null, day: null })

  function handleCellClick(period: PeriodRow, day: DayOfWeek, existingCell?: TimetableCell) {
    setModal({ open: true, period, day, existingCell })
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className={step === 1 ? "font-semibold text-slate-900" : "text-muted-foreground"}>
          1. Define Periods
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className={step === 2 ? "font-semibold text-slate-900" : "text-muted-foreground"}>
          2. Assign Classes
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <PeriodStructureManager periods={periods} onRefresh={onRefresh} />
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={periods.length === 0} className="gap-2">
              Next: Assign Classes
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <p className="text-sm text-muted-foreground">
              Click any cell to assign or edit a class. Break cells cannot be assigned.
            </p>
          </div>
          <TimetableGridView grid={grid} onCellClick={handleCellClick} />
        </div>
      )}

      {modal.open && modal.period && modal.day && (
        <AssignCellModal
          open={modal.open}
          period={modal.period}
          dayOfWeek={modal.day}
          existingCell={modal.existingCell}
          onClose={() => setModal({ open: false, period: null, day: null })}
          onSuccess={() => {
            setModal({ open: false, period: null, day: null })
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
