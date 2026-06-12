import SuperAdminFeesSection from "./components/SuperAdminFeesSection"

interface PageProps {
  params: Promise<{ schoolCode: string }>
}

export default async function SuperAdminFeesPage({ params }: PageProps) {
  const { schoolCode } = await params
  return (
    <div className="space-y-6 p-6">
      <SuperAdminFeesSection schoolCode={schoolCode} />
    </div>
  )
}
