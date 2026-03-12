import SchoolManageSection from "./components/SchoolManageSection"

interface PageProps {
  params: Promise<{ schoolCode: string }>
}

export default async function SchoolManagePage({ params }: PageProps) {
  const { schoolCode } = await params
  return (
    <div className="p-6">
      <SchoolManageSection schoolCode={schoolCode} />
    </div>
  )
}
