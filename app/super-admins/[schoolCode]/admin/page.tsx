import Link from "next/link"
import { Button } from "@/components/ui/button"
import AdminSection from "./components/AdminSection"

interface PageProps {
  params: Promise<{ schoolCode: string }>
}

export default async function AdminPage({ params }: PageProps) {
  const { schoolCode } = await params

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/super-admins/${schoolCode}`}>← Back</Link>
        </Button>
        <h1 className="text-2xl font-bold">Admin — {schoolCode}</h1>
      </div>

      <AdminSection schoolCode={schoolCode} />
    </div>
  )
}
