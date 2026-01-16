/**
 * Task Management Page (for task posters)
 */

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  getTaskPost,
  getTaskApplications,
  updateTaskStatus,
  updateApplicationStatus,
} from "@/lib/tasks/firestore";
import { getProfessionalProfile } from "@/lib/professionals/firestore";
import { ReviewModal } from "@/components/tasks/review-modal";
import type { TaskPost, TaskApplication } from "@/lib/professionals/types";
import Link from "next/link";

export default function TaskManagePage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [task, setTask] = useState<TaskPost | null>(null);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [taskId]);

  const loadData = async () => {
    try {
      const [t, apps] = await Promise.all([
        getTaskPost(taskId),
        getTaskApplications(taskId),
      ]);
      setTask(t);
      setApplications(apps);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (applicationId: string, applicantId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/tasks/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId,
          applicantId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign task");
      }

      toast({
        title: "Task assigned",
        description: "The task has been assigned successfully",
      });

      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to assign task",
      });
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete task");
      }

      toast({
        title: "Task completed",
        description: "The task has been marked as completed",
      });

      if (task?.assignedTo) {
        setShowReviewModal(true);
      } else {
        loadData();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete task",
      });
    }
  };

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

  if (user?.uid !== task.postedBy) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              You are not authorized to manage this task
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingApplications = applications.filter((app) => app.status === "pending");

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Manage Task</h1>
        <p className="text-muted-foreground">{task.title}</p>
      </div>

      {task.status === "open" && pendingApplications.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pending Applications ({pendingApplications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApplications.map((app) => (
                <div key={app.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{app.applicantName}</h4>
                      {app.bidAmount && (
                        <p className="text-lg font-semibold text-green-700 mt-1">
                          ₹{app.bidAmount.toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleAssign(app.id, app.applicantId)}
                      size="sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
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

      {task.status === "assigned" && task.assignedTo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assigned Professional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{task.assignedToName}</p>
                <p className="text-sm text-muted-foreground">
                  Task is in progress
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/tasks/chat/${taskId}`}>
                  <Button variant="outline">Chat</Button>
                </Link>
                <Button onClick={handleComplete}>Mark as Completed</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {task.status === "completed" && task.assignedTo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Task Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This task has been completed by {task.assignedToName}
            </p>
            <Link href={`/tasks/chat/${taskId}`}>
              <Button variant="outline">View Chat History</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {task.assignedTo && (
        <ReviewModal
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          taskId={taskId}
          professionalId={task.assignedTo}
          professionalName={task.assignedToName || "Professional"}
          onSuccess={() => router.push("/tasks/browse")}
        />
      )}
    </div>
  );
}

