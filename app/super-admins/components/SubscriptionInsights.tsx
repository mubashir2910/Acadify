"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlatformStats } from "@/schemas/school.schema"

interface Props {
    breakdown: PlatformStats["subscriptionBreakdown"]
    totalSchools: number
}

const statuses = [
    {
        key: "ACTIVE" as const,
        label: "Active",
        borderColor: "border-l-green-500",
        textColor: "text-green-600",
        badgeBg: "bg-green-50",
        description: "Paying subscribers",
    },
    {
        key: "TRIAL" as const,
        label: "Trial",
        borderColor: "border-l-yellow-500",
        textColor: "text-yellow-600",
        badgeBg: "bg-yellow-50",
        description: "60-day free trial",
    },
    {
        key: "SUSPENDED" as const,
        label: "Suspended",
        borderColor: "border-l-red-500",
        textColor: "text-red-600",
        badgeBg: "bg-red-50",
        description: "Access restricted",
    },
    {
        key: "CANCELLED" as const,
        label: "Cancelled",
        borderColor: "border-l-gray-400",
        textColor: "text-gray-500",
        badgeBg: "bg-gray-50",
        description: "Subscription ended",
    },
]

export default function SubscriptionInsights({ breakdown, totalSchools }: Props) {
    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base">Subscription Overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {totalSchools} school{totalSchools !== 1 ? "s" : ""} on the platform
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {statuses.map(({ key, label, borderColor, textColor, badgeBg, description }) => (
                        <div
                            key={key}
                            className={`border-l-4 ${borderColor} ${badgeBg} rounded-r-lg px-3 py-2`}
                        >
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={`text-2xl font-bold ${textColor}`}>
                                {breakdown[key]}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
