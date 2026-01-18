/**
 * Compliance Timeline Dashboard
 * Client-facing view showing compliance health, deadlines, and status
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, CheckCircle2, Clock, AlertCircle, FileText, TrendingUp, AlertTriangle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import {
  getActiveRisks,
  getOverdueTasks,
  getTasksByStatus,
  type ComplianceTaskInstance,
  type ComplianceRisk,
} from "@/lib/compliance-lifecycle";
import Link from "next/link";

type HealthStatus = 'green' | 'amber' | 'red';

interface TimelineStats {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingDeadlines: number;
  activeRisks: number;
  healthStatus: HealthStatus;
}

export default function ComplianceTimelinePage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ComplianceTaskInstance[]>([]);
  const [risks, setRisks] = useState<ComplianceRisk[]>([]);
  const [stats, setStats] = useState<TimelineStats>({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    upcomingDeadlines: 0,
    activeRisks: 0,
    healthStatus: 'green',
  });

  useEffect(() => {
    if (user) {
      loadComplianceData();
    } else {
      router.push("/login");
    }
  }, [user, router]);

  const loadComplianceData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get user's firm ID (simplified - would normally come from user profile)
      const firmId = user.uid; // Using userId as firmId for now

      // Load tasks
      const [pendingTasks, completedTasks, overdueTasks, activeRisks] = await Promise.all([
        getTasksByStatus(user.uid, 'pending', firmId),
        getTasksByStatus(user.uid, 'completed', firmId),
        getOverdueTasks(user.uid, firmId),
        getActiveRisks(user.uid, firmId),
      ]);

      const allTasks = [...pendingTasks, ...completedTasks, ...overdueTasks];
      setTasks(allTasks);
      setRisks(activeRisks);

      // Calculate upcoming deadlines (next 30 days)
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const upcomingDeadlines = allTasks.filter(task => {
        const dueDate = task.dueDate instanceof Timestamp 
          ? task.dueDate.toDate() 
          : new Date(task.dueDate);
        return dueDate >= now && dueDate <= thirtyDaysLater && task.status !== 'completed' && task.status !== 'filed';
      });

      // Calculate health status
      const healthStatus = calculateHealthStatus(overdueTasks.length, upcomingDeadlines.length, activeRisks.length);

      setStats({
        totalTasks: allTasks.length,
        pendingTasks: pendingTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        upcomingDeadlines: upcomingDeadlines.length,
        activeRisks: activeRisks.length,
        healthStatus,
      });
    } catch (error) {
      console.error("Error loading compliance data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load compliance data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthStatus = (
    overdueCount: number,
    upcomingCount: number,
    riskCount: number
  ): HealthStatus => {
    if (overdueCount > 0 || riskCount > 2) return 'red';
    if (upcomingCount > 3 || riskCount > 0) return 'amber';
    return 'green';
  };

  const getHealthBadge = (status: HealthStatus) => {
    const configs = {
      green: { label: 'Healthy', className: 'bg-green-500 text-white', icon: CheckCircle2 },
      amber: { label: 'Attention Needed', className: 'bg-amber-500 text-white', icon: AlertTriangle },
      red: { label: 'Action Required', className: 'bg-red-500 text-white', icon: XCircle },
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: ComplianceTaskInstance['status']) => {
    const configs = {
      pending: { label: 'Pending', className: 'bg-gray-500 text-white' },
      in_progress: { label: 'In Progress', className: 'bg-blue-500 text-white' },
      completed: { label: 'Completed', className: 'bg-green-500 text-white' },
      filed: { label: 'Filed', className: 'bg-green-600 text-white' },
      overdue: { label: 'Overdue', className: 'bg-red-500 text-white' },
      failed: { label: 'Failed', className: 'bg-red-600 text-white' },
    };
    const config = configs[status] || configs.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSeverityBadge = (severity: ComplianceRisk['severity']) => {
    const configs = {
      low: { label: 'Low', className: 'bg-gray-500 text-white' },
      medium: { label: 'Medium', className: 'bg-amber-500 text-white' },
      high: { label: 'High', className: 'bg-orange-500 text-white' },
      critical: { label: 'Critical', className: 'bg-red-500 text-white' },
    };
    const config = configs[severity] || configs.low;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Sort tasks by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.dueDate instanceof Timestamp ? a.dueDate.toDate() : new Date(a.dueDate);
    const dateB = b.dueDate instanceof Timestamp ? b.dueDate.toDate() : new Date(b.dueDate);
    return dateA.getTime() - dateB.getTime();
  });

  const upcomingTasks = sortedTasks.filter(task => {
    const dueDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
    return dueDate >= new Date() && task.status !== 'completed' && task.status !== 'filed';
  });

  const overdueTasksList = sortedTasks.filter(task => task.status === 'overdue' || 
    (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate)) < new Date() &&
    task.status !== 'completed' && task.status !== 'filed'
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Timeline</h1>
          <p className="text-muted-foreground mt-1">
            Track your compliance health and upcoming deadlines
          </p>
        </div>
        {getHealthBadge(stats.healthStatus)}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">All compliance tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">Successfully filed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.upcomingDeadlines}</div>
            <p className="text-xs text-muted-foreground">Due in next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Risks</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.activeRisks}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Risks */}
      {risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Active Risks
            </CardTitle>
            <CardDescription>
              Compliance issues that require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {risks.slice(0, 5).map((risk) => (
                <div key={risk.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityBadge(risk.severity)}
                      <span className="font-semibold">{risk.description}</span>
                    </div>
                    {risk.recommendedActions && risk.recommendedActions.length > 0 && (
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        {risk.recommendedActions.slice(0, 2).map((action, idx) => (
                          <li key={idx}>• {action.action}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Tasks */}
      {overdueTasksList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Overdue Tasks
            </CardTitle>
            <CardDescription>
              Tasks that are past their due date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueTasksList.slice(0, 5).map((task) => {
                const dueDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
                const daysOverdue = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg border-red-200 bg-red-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{task.taskName}</span>
                        {getStatusBadge(task.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(dueDate, 'PPP')} ({daysOverdue} days overdue)
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Handled by ZenithBooks Compliance Team
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>
              Compliance tasks due in the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTasks.slice(0, 10).map((task) => {
                const dueDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
                const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{task.taskName}</span>
                        {getStatusBadge(task.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(dueDate, 'PPP')} ({daysUntil} days remaining)
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Handled by ZenithBooks Compliance Team
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Completions */}
      {sortedTasks.filter(t => t.status === 'completed' || t.status === 'filed').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Recently Completed
            </CardTitle>
            <CardDescription>
              Tasks completed in the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedTasks
                .filter(t => (t.status === 'completed' || t.status === 'filed') && t.completedAt)
                .slice(0, 5)
                .map((task) => {
                  const completedDate = task.completedAt instanceof Timestamp 
                    ? task.completedAt.toDate() 
                    : task.completedAt 
                    ? new Date(task.completedAt) 
                    : null;
                  return (
                    <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg border-green-200 bg-green-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{task.taskName}</span>
                          {getStatusBadge(task.status)}
                        </div>
                        {completedDate && (
                          <p className="text-sm text-muted-foreground">
                            Completed: {format(completedDate, 'PPP')}
                          </p>
                        )}
                        {task.filingDetails?.acknowledgmentNumber && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Acknowledgment: {task.filingDetails.acknowledgmentNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {tasks.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Compliance Tasks</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any compliance tasks yet. Tasks will appear here once your compliance subscription is active.
            </p>
            <Link href="/compliance-plans">
              <Button>View Compliance Plans</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Footer CTA */}
      <Card className="bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Need Help?</h3>
              <p className="text-sm text-muted-foreground">
                All compliance tasks are handled by ZenithBooks Compliance Team. Contact support for assistance.
              </p>
            </div>
            <Link href="/compliance-plans/my-subscription">
              <Button variant="outline">View Full Subscription</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

