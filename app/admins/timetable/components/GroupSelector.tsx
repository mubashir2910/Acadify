"use client"

import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimetableGroupRow } from "@/schemas/timetable-group.schema"
import GroupSettingsMenu from "./GroupSettingsMenu"

interface GroupSelectorProps {
  groups: TimetableGroupRow[]
  selectedGroupId: string | null
  onSelect: (groupId: string) => void
  onAddGroup: () => void
  onGroupUpdated: () => void
  /** Hide the "+ Add Group" pill while editing — admins shouldn't add new structures mid-edit */
  hideAddButton?: boolean
}

export default function GroupSelector({
  groups,
  selectedGroupId,
  onSelect,
  onAddGroup,
  onGroupUpdated,
  hideAddButton = false,
}: GroupSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {groups.map((group) => {
        const active = selectedGroupId === group.id
        return (
          <div
            key={group.id}
            className={cn(
              "inline-flex items-stretch rounded-full overflow-hidden text-sm transition-colors",
              active
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(group.id)}
              className="px-3.5 py-1.5 font-medium"
            >
              {group.name}
              <span className={cn(
                "ml-1.5 text-[10px]",
                active ? "text-background/70" : "text-muted-foreground/70",
              )}>
                {group.classes.length} class{group.classes.length === 1 ? "" : "es"}
              </span>
            </button>
            <GroupSettingsMenu
              group={group}
              triggerClassName={cn(
                "px-2 border-l",
                active ? "border-background/20" : "border-border",
              )}
              onUpdated={onGroupUpdated}
            />
          </div>
        )
      })}

      {!hideAddButton && (
        <button
          type="button"
          onClick={onAddGroup}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Group
        </button>
      )}
    </div>
  )
}
