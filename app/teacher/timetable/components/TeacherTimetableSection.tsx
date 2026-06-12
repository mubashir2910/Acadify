"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MyRoutineView from "./MyRoutineView"
import TeacherGroupGrid from "./TeacherGroupGrid"

export default function TeacherTimetableSection() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your schedule and the full school timetable
        </p>
      </div>

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">My Routine</TabsTrigger>
          <TabsTrigger value="others">Others</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          <MyRoutineView />
        </TabsContent>

        <TabsContent value="others" className="mt-4">
          <TeacherGroupGrid />
        </TabsContent>
      </Tabs>
    </div>
  )
}
