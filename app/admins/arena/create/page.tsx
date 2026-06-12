import { CreateQuizWizard } from "@/components/quiz/CreateQuizWizard"

export default function AdminScheduleContestPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Schedule Contest</h1>
        <p className="text-muted-foreground mt-1">Create a new Arena contest for students.</p>
      </div>
      <CreateQuizWizard successRedirect="/admins/arena" />
    </div>
  )
}
