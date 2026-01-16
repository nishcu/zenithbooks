/**
 * Task Card Component
 * Displays task post information
 */

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, IndianRupee, Building2, Clock } from "lucide-react";
import { format } from "date-fns";
import type { TaskPost } from "@/lib/professionals/types";

interface TaskCardProps {
  task: TaskPost;
}

const statusColors = {
  open: "bg-green-100 text-green-700",
  assigned: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

export function TaskCard({ task }: TaskCardProps) {
  const deadlineDate = task.deadline instanceof Date 
    ? task.deadline 
    : new Date(task.deadline);

  return (
    <Link href={`/tasks/view/${task.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base line-clamp-2 mb-1">
                {task.title}
              </h3>
              <Badge className={statusColors[task.status]}>
                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Category */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{task.category}</Badge>
            {task.onSite && (
              <Badge variant="secondary" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                On-site
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{task.location}</span>
          </div>

          {/* Budget & Deadline */}
          <div className="flex items-center justify-between text-sm">
            {task.budget ? (
              <div className="flex items-center gap-1 text-green-700 font-medium">
                <IndianRupee className="h-4 w-4" />
                <span>{task.budget.toLocaleString('en-IN')}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Budget not specified</span>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(deadlineDate, "MMM dd, yyyy")}</span>
            </div>
          </div>

          {/* Posted by */}
          {task.postedByName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="h-3 w-3" />
              <span>Posted by {task.postedByName}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

