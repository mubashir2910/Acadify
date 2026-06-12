"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import PeriodStructureManager from "./PeriodStructureManager"
import type { PeriodRow } from "@/schemas/timetable.schema"

interface ManagePeriodsSheetProps {
  open: boolean
  groupId: string
  groupName: string
  periods: PeriodRow[]
  onRefresh: () => void
  onClose: () => void
}

export default function ManagePeriodsSheet({
  open,
  groupId,
  groupName,
  periods,
  onRefresh,
  onClose,
}: ManagePeriodsSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Periods · {groupName}</SheetTitle>
          <SheetDescription>
            Define the period structure for this group. Breaks are highlighted and cannot have
            assignments.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <PeriodStructureManager groupId={groupId} periods={periods} onRefresh={onRefresh} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
