"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, School, UserCheck, Users } from "lucide-react"
import type { PlatformStats } from "@/schemas/school.schema"

interface Props {
    stats: PlatformStats
}

const statCards = [
    {
        key: "totalSchools" as const,
        label: "Total Schools",
        icon: School,
        color: "text-blue-600",
        bg: "bg-blue-50",
    },
    {
        key: "totalStudents" as const,
        label: "Total Students",
        icon: Users,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
    },
    {
        key: "totalTeachers" as const,
        label: "Total Teachers",
        icon: GraduationCap,
        color: "text-violet-600",
        bg: "bg-violet-50",
    },
    {
        key: "totalAdmins" as const,
        label: "Total Admins",
        icon: UserCheck,
        color: "text-amber-600",
        bg: "bg-amber-50",
    },
]

export default function DashboardStats({ stats }: Props) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(({ key, label, icon: Icon, color, bg }) => (
                <Card key={key}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {label}
                        </CardTitle>
                        <div className={`p-2 rounded-lg ${bg}`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats[key].toLocaleString()}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
