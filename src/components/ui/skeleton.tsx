import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Table Skeleton
function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Table Header */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                "h-4 flex-1",
                colIndex === columns - 1 && "w-20" // Make last column smaller
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card Skeleton
function CardSkeleton({
  showHeader = true,
  showFooter = false,
  lines = 3,
  className,
}: {
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
      {showFooter && (
        <div className="flex justify-end p-6 pt-0">
          <Skeleton className="h-9 w-20" />
        </div>
      )}
    </Card>
  );
}

// Form Skeleton
function FormSkeleton({
  fields = 4,
  showButtons = true,
  className,
}: {
  fields?: number;
  showButtons?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      {showButtons && (
        <div className="flex justify-end gap-3">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </div>
  );
}

// Stats Card Skeleton
function StatsCardSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-[80px] mb-1" />
            <Skeleton className="h-3 w-[100px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// List Skeleton
function ListSkeleton({
  items = 5,
  showAvatar = false,
  className,
}: {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Chart Skeleton
function ChartSkeleton({
  type = "bar",
  className,
}: {
  type?: "bar" | "line" | "pie";
  className?: string;
}) {
  if (type === "pie") {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <Skeleton className="h-48 w-48 rounded-full" />
        <div className="ml-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Chart Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-64 flex items-end justify-between gap-2">
        {Array.from({ length: type === "line" ? 12 : 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "flex-1 rounded-t",
              type === "line" ? "h-32" : `h-${Math.floor(Math.random() * 32) + 16}`
            )}
          />
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

export {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  FormSkeleton,
  StatsCardSkeleton,
  ListSkeleton,
  ChartSkeleton,
}
