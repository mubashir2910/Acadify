"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import type { PlatformStats } from "@/schemas/school.schema"
import DashboardStats from "./DashboardStats"
import SubscriptionInsights from "./SubscriptionInsights"
import SchoolsGrowthChart from "./SchoolsGrowthChart"
import UserDistributionChart from "./UserDistributionChart"

export default function DashboardAnalytics() {
    const [stats, setStats] = useState<PlatformStats | null>(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        fetch("/api/super-admin/dashboard-stats")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load")
                return res.json() as Promise<PlatformStats>
            })
            .then(setStats)
            .catch(() => setError(true))
    }, [])

    if (error) {
        return (
            <p className="text-sm text-muted-foreground">
                Could not load platform analytics. Please refresh the page.
            </p>
        )
    }

    if (!stats) {
        return (
            <div className="space-y-6">
                {/* Stat card skeletons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[100px] rounded-xl" />
                    ))}
                </div>
                {/* Chart skeletons */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-[220px] rounded-xl" />
                    <Skeleton className="h-[220px] rounded-xl" />
                </div>
                <Skeleton className="h-[300px] rounded-xl" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <DashboardStats stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SubscriptionInsights
                    breakdown={stats.subscriptionBreakdown}
                    totalSchools={stats.totalSchools}
                />
                <UserDistributionChart data={stats.userDistribution} />
            </div>
            <SchoolsGrowthChart data={stats.schoolsGrowth} />
        </div>
    )
}
