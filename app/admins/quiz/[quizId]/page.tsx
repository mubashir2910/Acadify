import { QuizDetailSection } from "@/components/quiz/QuizDetailSection"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ quizId: string }>
}

export default async function AdminQuizDetailPage({ params }: PageProps) {
  const { quizId } = await params
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admins/quiz"
          className="text-muted-foreground hover:text-muted-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Contest Details</h1>
      </div>
      <QuizDetailSection quizId={quizId} />
    </div>
  )
}
