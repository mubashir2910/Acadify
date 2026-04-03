"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import type { PlatformStats } from "@/schemas/school.schema"

interface Props {
    data: PlatformStats["schoolsGrowth"]
}

const chartConfig = {
    count: {
        label: "Schools Added",
        color: "hsl(221.2 83.2% 53.3%)",
    },
} satisfies ChartConfig

export default function SchoolsGrowthChart({ data }: Props) {
    const isEmpty = data.every((d) => d.count === 0)

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base">Schools Added (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
                {isEmpty ? (
                    <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                        No schools added in the last 6 months
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                                tick={{ fontSize: 11 }}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar
                                dataKey="count"
                                fill="var(--color-count)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={48}
                            />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
