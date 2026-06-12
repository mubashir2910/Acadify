import StudentFeesSection from "./components/StudentFeesSection"

export default function StudentFeesPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Fees</h1>
      <StudentFeesSection />
    </div>
  )
}
