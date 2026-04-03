"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlatformStats } from "@/schemas/school.schema"

interface Props {
    data: PlatformStats["userDistribution"]
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"]

export default function UserDistributionChart({ data }: Props) {
    const total = data.reduce((sum, d) => sum + d.value, 0)
    const isEmpty = total === 0

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">User Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                {isEmpty ? (
                    <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                        No users on the platform yet
                    </div>
                ) : (
                    <>
                        <div className="relative h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {data.map((_, index) => (
                                            <Cell
                                                key={index}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name: string) => [
                                            value.toLocaleString(),
                                            name,
                                        ]}
                                        contentStyle={{
                                            borderRadius: "8px",
                                            border: "1px solid hsl(var(--border))",
                                            fontSize: "12px",
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center label */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold">{total.toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground">Total Users</span>
                            </div>
                        </div>
                        {/* Custom legend */}
                        <div className="flex justify-center gap-4 mt-2 flex-wrap">
                            {data.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-1.5">
                                    <div
                                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {entry.name}
                                    </span>
                                    <span className="text-xs font-medium">
                                        {entry.value.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
