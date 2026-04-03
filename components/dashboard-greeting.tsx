"use client"

interface DashboardGreetingProps {
  name: string
  subtitle: string
}

export function DashboardGreeting({ name, subtitle }: DashboardGreetingProps) {
  // Compute IST hour at render time — no state needed since greeting only needs to be right on load
  const hourStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).format(new Date())

  const hour = parseInt(hourStr, 10)

  const greeting =
    hour >= 4 && hour < 12  ? "Good Morning"   :
    hour >= 12 && hour < 16 ? "Good Afternoon" :
    hour >= 16 && hour < 20 ? "Good Evening"   :
                              "Good Night"

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{greeting}, {name}!</h1>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  )
}
