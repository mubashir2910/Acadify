import { MyContestsSection } from "@/components/quiz/MyContestsSection"

export default function AdminMyContestsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Contests</h1>
      <MyContestsSection detailBasePath="/admins/quiz" />
    </div>
  )
}
