import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DataErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  variant?: "card" | "compact"
  className?: string
}

export function DataErrorState({
  title = "Couldn't load this section",
  description = "Something went wrong on our side.",
  onRetry,
  retryLabel = "Retry",
  variant = "card",
  className,
}: DataErrorStateProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <span className="flex-1 min-w-0">{title}</span>
        {onRetry && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> {retryLabel}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn("border-destructive/50 bg-destructive/5", className)}>
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 self-center md:self-start md:mt-0.5" />
        <div className="flex-1 text-center md:text-left">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="w-full md:w-auto"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
