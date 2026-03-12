import Link from "next/link"
import { Button } from "@/components/ui/button"
import TeachersTable from "./components/TeachersTable"

interface PageProps {
  params: Promise<{ schoolCode: string }>
}

export default async function TeachersPage({ params }: PageProps) {
  const { schoolCode } = await params

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/super-admins/${schoolCode}`}>← Back</Link>
        </Button>
        <h1 className="text-2xl font-bold">Teachers — {schoolCode}</h1>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Teachers</h2>
        <TeachersTable schoolCode={schoolCode} />
      </section>
    </div>
  )
}
