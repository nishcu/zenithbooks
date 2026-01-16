/**
 * Task View Page
 */

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Calendar, IndianRupee, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { getTaskPost, getTaskApplications } from "@/lib/tasks/firestore";
import { ApplyModal } from "@/components/tasks/apply-modal";
import type { TaskPost, TaskApplication } from "@/lib/professionals/types";
import Link from "next/link";

export default function TaskViewPage() {
  const params = useParams();
  const taskId = params.id as string;
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [task, setTask] = useState<TaskPost | null>(null);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    loadTask();
    loadApplications();
  }, [taskId]);

  const loadTask = async () => {
    try {
      const t = await getTaskPost(taskId);
      setTask(t);
    } catch (error) {
      console.error("Error loading task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const apps = await getTaskApplications(taskId);
      setApplications(apps);
    } catch (error) {
      console.error("Error loading applications:", error);
    }
  };

  const canApply = user && task && task.status === "open" && task.postedBy !== user.uid;
  const isPoster = user && task && task.postedBy === user.uid;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              Task not found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deadlineDate = task.deadline instanceof Date 
    ? task.deadline 
    : new Date(task.deadline);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{task.title}</h1>
                <Badge
                  className={
                    task.status === "open"
                      ? "bg-green-100 text-green-700"
                      : task.status === "assigned"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }
                >
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </Badge>
              </div>
              <Badge variant="outline" className="mb-2">
                {task.category}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span>{task.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span>Deadline: {format(deadlineDate, "MMM dd, yyyy")}</span>
            </div>
            {task.budget && (
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-green-700" />
                <span className="font-semibold text-green-700">
                  ₹{task.budget.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            {task.onSite && (
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span>On-site work required</span>
              </div>
            )}
          </div>

          {task.postedByName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Posted by {task.postedByName}</span>
            </div>
          )}

          {canApply && (
            <Button onClick={() => setShowApplyModal(true)} className="w-full">
              Apply for this Task
            </Button>
          )}

          {isPoster && task.status === "open" && (
            <Link href={`/tasks/manage/${taskId}`}>
              <Button variant="outline" className="w-full">
                Manage Applications
              </Button>
            </Link>
          )}

          {isPoster && task.status === "assigned" && (
            <div className="space-y-2">
              <Link href={`/tasks/chat/${taskId}`}>
                <Button className="w-full">Open Chat</Button>
              </Link>
              <Link href={`/tasks/manage/${taskId}`}>
                <Button variant="outline" className="w-full">
                  Manage Task
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {isPoster && applications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applications ({applications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{app.applicantName}</h4>
                      <Badge
                        variant={
                          app.status === "accepted"
                            ? "default"
                            : app.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {app.status}
                      </Badge>
                    </div>
                    {app.bidAmount && (
                      <div className="text-lg font-semibold text-green-700">
                        ₹{app.bidAmount.toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                  {app.message && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {app.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ApplyModal
        open={showApplyModal}
        onOpenChange={setShowApplyModal}
        taskId={taskId}
        taskTitle={task.title}
        onSuccess={loadApplications}
      />
    </div>
  );
}

