/**
 * My Compliance Subscription - Dashboard
 * Shows current subscription and task status
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, CheckCircle2, Clock, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import {
  getComplianceSubscriptionByUserId,
  getTaskExecutionsBySubscription,
  type ComplianceTaskExecution,
} from "@/lib/compliance-plans/firestore";
import { getCompliancePlan, type CompliancePlanTier } from "@/lib/compliance-plans/constants";
import { format } from "date-fns";

export default function MyComplianceSubscriptionPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [tasks, setTasks] = useState<ComplianceTaskExecution[]>([]);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscription();
    } else {
      router.push("/login");
    }
  }, [user, router]);

  const loadSubscription = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const sub = await getComplianceSubscriptionByUserId(user.uid);
      setSubscription(sub);
      if (sub) {
        const taskExecutions = await getTaskExecutionsBySubscription(sub.id);
        setTasks(taskExecutions);
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load subscription. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription || !user) return;
    
    const confirmed = confirm(
      "Are you sure you want to cancel your compliance subscription? This action cannot be undone."
    );
    
    if (!confirmed) return;

    setCancelling(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/compliance/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel subscription");
      }
      
      toast({
        title: "Subscription Cancelled",
        description: "Your compliance subscription has been cancelled.",
      });
      
      router.push("/compliance-plans");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription. Please try again.",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/compliance/tasks/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate tasks");
      }

      toast({
        title: "Tasks Generated",
        description: `Generated ${data.taskIdsGenerated} compliance tasks for this month.`,
      });

      await loadSubscription();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Failed to generate tasks. Please try again.",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active compliance subscription found.</p>
              <Button onClick={() => router.push("/compliance-plans")}>
                View Compliance Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = getCompliancePlan(subscription.planTier as CompliancePlanTier);
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    filed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };

  const statusIcons = {
    pending: Clock,
    in_progress: FileText,
    completed: CheckCircle2,
    filed: CheckCircle2,
    failed: AlertCircle,
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed" || t.status === "filed");

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Compliance Subscription</h1>
        <p className="text-muted-foreground">
          View your subscription details and compliance task status
        </p>
      </div>

      {/* Subscription Details */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </div>
            <Badge
              variant={subscription.status === "active" ? "default" : "secondary"}
            >
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">
                {format(
                  subscription.startDate instanceof Date
                    ? subscription.startDate
                    : new Date(subscription.startDate),
                  "PPP"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Renewal Date</p>
              <p className="font-medium">
                {format(
                  subscription.renewalDate instanceof Date
                    ? subscription.renewalDate
                    : new Date(subscription.renewalDate),
                  "PPP"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Auto Renew</p>
              <p className="font-medium">{subscription.autoRenew ? "Enabled" : "Disabled"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivery Model</p>
              <p className="font-medium">Platform-Managed Professional Team</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status Dashboard */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Status</p>
                <p className="text-2xl font-bold">
                  {tasks.length > 0 
                    ? Math.round((completedTasks.length / tasks.length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedTasks.length} of {tasks.length} tasks completed
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                tasks.length > 0 && completedTasks.length === tasks.length 
                  ? 'bg-green-100' 
                  : tasks.length > 0 && completedTasks.length > tasks.length / 2
                  ? 'bg-blue-100'
                  : 'bg-yellow-100'
              }`}>
                <CheckCircle2 className={`h-6 w-6 ${
                  tasks.length > 0 && completedTasks.length === tasks.length 
                    ? 'text-green-600' 
                    : tasks.length > 0 && completedTasks.length > tasks.length / 2
                    ? 'text-blue-600'
                    : 'text-yellow-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Tasks</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingTasks.filter(t => {
                    const dueDate = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
                    return dueDate < new Date();
                  }).length} overdue
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Filed Returns</p>
                <p className="text-2xl font-bold">
                  {tasks.filter(t => t.status === 'filed').length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This month
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next Due Date</p>
                <p className="text-lg font-bold">
                  {pendingTasks.length > 0 
                    ? format(
                        (() => {
                          const sorted = [...pendingTasks].sort((a, b) => {
                            const dateA = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate);
                            const dateB = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate);
                            return dateA.getTime() - dateB.getTime();
                          });
                          return sorted[0]?.dueDate;
                        })() instanceof Date
                          ? (() => {
                              const sorted = [...pendingTasks].sort((a, b) => {
                                const dateA = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate);
                                const dateB = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate);
                                return dateA.getTime() - dateB.getTime();
                              });
                              return sorted[0]?.dueDate;
                            })()
                          : new Date(),
                        "MMM dd"
                      )
                    : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upcoming deadline
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6">
        <Button onClick={handleGenerateTasks} variant="outline">
          Generate Monthly Tasks
        </Button>
        {subscription.status === "active" && (
          <Button onClick={handleCancel} variant="destructive" disabled={cancelling}>
            {cancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Subscription"
            )}
          </Button>
        )}
      </div>

      {/* Compliance Tasks - Enhanced View */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Tasks</CardTitle>
          <CardDescription>
            All tasks are handled by ZenithBooks Compliance Team. You can view status updates and receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No tasks found for this month.</p>
              <p className="text-sm">Tasks are automatically generated monthly based on your plan.</p>
              <Button onClick={handleGenerateTasks} className="mt-4" variant="outline">
                Generate Monthly Tasks
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending Tasks First */}
              {pendingTasks.map((task) => {
                const StatusIcon = statusIcons[task.status];
                const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
                const isOverdue = dueDate < new Date() && task.status !== 'completed' && task.status !== 'filed';
                
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 border-2 rounded-lg hover:bg-muted/50 transition-colors ${
                      isOverdue ? 'border-red-200 bg-red-50/50' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${
                        task.status === 'filed' ? 'bg-green-100' :
                        task.status === 'completed' ? 'bg-blue-100' :
                        task.status === 'in_progress' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        <StatusIcon className={`h-5 w-5 ${
                          task.status === 'filed' ? 'text-green-600' :
                          task.status === 'completed' ? 'text-blue-600' :
                          task.status === 'in_progress' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{task.taskName}</p>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">Overdue</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {format(dueDate, "MMM dd, yyyy")}
                          </span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            Handled by ZenithBooks Compliance Team
                          </span>
                        </div>
                        {task.filingDetails && (
                          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                            <p className="text-xs font-semibold text-green-800 mb-1">Filing Details:</p>
                            <p className="text-xs text-green-700">
                              <span className="font-medium">Form:</span> {task.filingDetails.formType} | 
                              <span className="font-medium"> Period:</span> {task.filingDetails.period}
                              {task.filingDetails.acknowledgmentNumber && (
                                <> | <span className="font-medium">Ack No:</span> {task.filingDetails.acknowledgmentNumber}</>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={`${statusColors[task.status]} whitespace-nowrap`}>
                      {task.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                );
              })}
              
              {/* Completed Tasks */}
              {completedTasks.map((task) => {
                const StatusIcon = statusIcons[task.status];
                const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
                
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 bg-muted/20 opacity-75"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${
                        task.status === 'filed' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <StatusIcon className={`h-5 w-5 ${
                          task.status === 'filed' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{task.taskName}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Completed: {task.completedAt 
                              ? format(task.completedAt instanceof Date ? task.completedAt : new Date(task.completedAt), "MMM dd, yyyy")
                              : format(dueDate, "MMM dd, yyyy")
                            }
                          </span>
                        </div>
                        {task.filingDetails && (
                          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                            <p className="text-xs font-semibold text-green-800 mb-1">Filed:</p>
                            <p className="text-xs text-green-700">
                              {task.filingDetails.formType} - {task.filingDetails.period}
                              {task.filingDetails.acknowledgmentNumber && (
                                <> (Ack: {task.filingDetails.acknowledgmentNumber})</>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={`${statusColors[task.status]} whitespace-nowrap`}>
                      {task.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Notice */}
      <Card className="mt-6 bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-sm space-y-2">
            <p className="font-semibold">Service Delivery:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                All tasks are managed by ZenithBooks' platform-managed professional team.
              </li>
              <li>
                No professional identity is shown to clients (ICAI-compliant).
              </li>
              <li>
                Tasks are auto-generated monthly based on your plan.
              </li>
              <li>
                All filings are logged with complete audit trails.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

