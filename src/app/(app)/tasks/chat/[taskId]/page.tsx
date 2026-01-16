/**
 * Task Chat Page
 */

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { getTaskPost } from "@/lib/tasks/firestore";
import { ChatBox } from "@/components/tasks/chat-box";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import type { TaskPost } from "@/lib/professionals/types";

export default function TaskChatPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const [user] = useAuthState(auth);
  const [task, setTask] = useState<TaskPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTask();
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

  // Check authorization
  if (!user || (user.uid !== task.postedBy && user.uid !== task.assignedTo)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              You are not authorized to access this chat
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Task: {task.title}</CardTitle>
        </CardHeader>
      </Card>
      <ChatBox taskId={taskId} />
    </div>
  );
}

