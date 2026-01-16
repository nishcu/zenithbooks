/**
 * My Posted Tasks Page
 * Shows all tasks posted by the current user
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { Loader2, Plus } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { listTasks } from "@/lib/tasks/firestore";
import type { TaskPost } from "@/lib/professionals/types";
import Link from "next/link";

export default function MyTasksPage() {
  const [user] = useAuthState(auth);
  const [tasks, setTasks] = useState<TaskPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMyTasks();
    }
  }, [user]);

  const loadMyTasks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const myTasks = await listTasks({
        postedBy: user.uid,
        limitCount: 100,
      });
      setTasks(myTasks);
    } catch (error) {
      console.error("Error loading my tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              Please sign in to view your tasks
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status === "open");
  const assignedTasks = tasks.filter((t) => t.status === "assigned");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Posted Tasks</h1>
          <p className="text-muted-foreground">
            Manage tasks you've posted and assign them to professionals
          </p>
        </div>
        <Link href="/tasks/post">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Post New Task
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven't posted any tasks yet
              </p>
              <Link href="/tasks/post">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Post Your First Task
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Open Tasks */}
          {openTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Open Tasks ({openTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openTasks.map((task) => (
                  <div key={task.id} className="relative">
                    <TaskCard task={task} />
                    <div className="mt-2">
                      <Link href={`/tasks/manage/${task.id}`}>
                        <Button variant="outline" className="w-full" size="sm">
                          Manage & Assign
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Tasks */}
          {assignedTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Assigned Tasks ({assignedTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedTasks.map((task) => (
                  <div key={task.id} className="relative">
                    <TaskCard task={task} />
                    <div className="mt-2 space-y-2">
                      <Link href={`/tasks/chat/${task.id}`}>
                        <Button className="w-full" size="sm">
                          Open Chat
                        </Button>
                      </Link>
                      <Link href={`/tasks/manage/${task.id}`}>
                        <Button variant="outline" className="w-full" size="sm">
                          Manage Task
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Completed Tasks ({completedTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedTasks.map((task) => (
                  <div key={task.id}>
                    <TaskCard task={task} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

