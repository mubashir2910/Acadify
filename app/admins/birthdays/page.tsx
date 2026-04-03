import { BirthdaysSection } from "@/components/birthdays-section"

export default function AdminBirthdaysPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Birthdays</h1>
      <BirthdaysSection />
    </div>
  )
}
