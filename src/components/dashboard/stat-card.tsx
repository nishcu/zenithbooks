"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Skeleton } from "../ui/skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"

type StatCardProps = {
  title: string
  value: string
  icon: LucideIcon
  description?: string
  className?: string
  loading?: boolean
  trend?: {
    value: number // percentage change
    label?: string // e.g., "vs last month"
  }
}

export function StatCard({ title, value, icon: Icon, description, className, loading, trend }: StatCardProps) {
  const isPositive = trend ? trend.value >= 0 : null;
  const TrendIcon = isPositive !== null ? (isPositive ? TrendingUp : TrendingDown) : null;

  return (
    <Card className={cn("hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </>
        ) : (
          <>
            <div className="text-xl font-bold break-words mb-1">{value}</div>
            {trend && TrendIcon && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(trend.value).toFixed(1)}%</span>
                {trend.label && <span className="text-muted-foreground">({trend.label})</span>}
              </div>
            )}
            {description && !trend && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}