import { FileText, Image, ExternalLink, User } from "lucide-react"

interface ClassLogCardProps {
  id: string
  subject: string
  periodLabel: string
  teacherName: string
  topic: string
  description: string | null
  attachmentUrl: string | null
  attachmentType: string | null
}

export function ClassLogCard({
  subject,
  periodLabel,
  teacherName,
  topic,
  description,
  attachmentUrl,
  attachmentType,
}: ClassLogCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{subject}</span>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <User className="h-3 w-3" /> {teacherName}
          </p>
        </div>
        {attachmentUrl && (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
          >
            {attachmentType === "pdf" ? (
              <FileText className="h-3.5 w-3.5" />
            ) : (
              <Image className="h-3.5 w-3.5" />
            )}
            {attachmentType === "pdf" ? "PDF" : "Image"}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div>
        <p className="text-sm text-foreground">
          <span className="font-medium">Topic:</span> {topic}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  )
}
