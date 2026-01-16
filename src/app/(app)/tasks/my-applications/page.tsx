/**
 * My Applications Page
 * Shows all applications submitted by the current professional
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { getApplicationsByApplicant, getTaskPost } from "@/lib/tasks/firestore";
import type { TaskApplication, TaskPost } from "@/lib/professionals/types";
import Link from "next/link";

export default function MyApplicationsPage() {
  const [user] = useAuthState(auth);
  const [applications, setApplications] = useState<
    Array<TaskApplication & { task?: TaskPost }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMyApplications();
    }
  }, [user]);

  const loadMyApplications = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const apps = await getApplicationsByApplicant(user.uid);
      
      // Load task details for each application
      const appsWithTasks = await Promise.all(
        apps.map(async (app) => {
          const task = await getTaskPost(app.taskId);
          return { ...app, task };
        })
      );
      
      setApplications(appsWithTasks);
    } catch (error) {
      console.error("Error loading my applications:", error);
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
              Please sign in to view your applications
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingApplications = applications.filter(
    (app) => app.status === "pending"
  );
  const acceptedApplications = applications.filter(
    (app) => app.status === "accepted"
  );
  const rejectedApplications = applications.filter(
    (app) => app.status === "rejected"
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Applications</h1>
        <p className="text-muted-foreground">
          Track all your task applications and their status
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven't applied for any tasks yet
              </p>
              <Link href="/tasks/browse">
                <Button>Browse Available Tasks</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending Applications */}
          {pendingApplications.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Pending Applications ({pendingApplications.length})
              </h2>
              <div className="space-y-4">
                {pendingApplications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {app.task?.title || "Loading..."}
                          </CardTitle>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                        {app.bidAmount && (
                          <div className="text-lg font-semibold text-green-700">
                            ₹{app.bidAmount.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {app.message && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {app.message}
                        </p>
                      )}
                      {app.task && (
                        <div className="flex gap-2">
                          <Link href={`/tasks/view/${app.task.id}`}>
                            <Button variant="outline" size="sm">
                              View Task
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Accepted Applications */}
          {acceptedApplications.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Accepted Applications ({acceptedApplications.length})
              </h2>
              <div className="space-y-4">
                {acceptedApplications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {app.task?.title || "Loading..."}
                          </CardTitle>
                          <Badge className="bg-green-100 text-green-700">
                            Accepted
                          </Badge>
                        </div>
                        {app.bidAmount && (
                          <div className="text-lg font-semibold text-green-700">
                            ₹{app.bidAmount.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {app.message && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {app.message}
                        </p>
                      )}
                      {app.task && (
                        <div className="flex gap-2">
                          <Link href={`/tasks/view/${app.task.id}`}>
                            <Button variant="outline" size="sm">
                              View Task
                            </Button>
                          </Link>
                          {app.task.status === "assigned" && (
                            <Link href={`/tasks/chat/${app.task.id}`}>
                              <Button size="sm">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Open Chat
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Applications */}
          {rejectedApplications.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Rejected Applications ({rejectedApplications.length})
              </h2>
              <div className="space-y-4">
                {rejectedApplications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {app.task?.title || "Loading..."}
                          </CardTitle>
                          <Badge variant="destructive">Rejected</Badge>
                        </div>
                        {app.bidAmount && (
                          <div className="text-lg font-semibold text-muted-foreground">
                            ₹{app.bidAmount.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {app.message && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {app.message}
                        </p>
                      )}
                      {app.task && (
                        <Link href={`/tasks/view/${app.task.id}`}>
                          <Button variant="outline" size="sm">
                            View Task
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

