"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, TrendingUp, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { getAllProfessionalsWorkload, getAvailableProfessionals, getOverloadedProfessionals } from "@/lib/itr/workload";
import type { CAWorkload } from "@/lib/itr/workload";
import { STATUS_COLORS } from "@/lib/itr/constants";

export default function CAWorkloadPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [workloads, setWorkloads] = useState<CAWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "overloaded">("all");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    loadWorkloads();
  }, [user, filter]);

  const loadWorkloads = async () => {
    try {
      setLoading(true);
      let data: CAWorkload[];

      if (filter === "available") {
        data = await getAvailableProfessionals(10);
      } else if (filter === "overloaded") {
        data = await getOverloadedProfessionals(20);
      } else {
        data = await getAllProfessionalsWorkload();
      }

      setWorkloads(data);
    } catch (error) {
      console.error("Error loading workloads:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadColor = (inProgress: number): string => {
    if (inProgress === 0) return "text-green-600";
    if (inProgress < 5) return "text-blue-600";
    if (inProgress < 10) return "text-yellow-600";
    if (inProgress < 20) return "text-orange-600";
    return "text-red-600";
  };

  const getWorkloadBadge = (inProgress: number) => {
    if (inProgress === 0) return <Badge className="bg-green-100 text-green-800">Available</Badge>;
    if (inProgress < 5) return <Badge className="bg-blue-100 text-blue-800">Light</Badge>;
    if (inProgress < 10) return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
    if (inProgress < 20) return <Badge className="bg-orange-100 text-orange-800">Heavy</Badge>;
    return <Badge className="bg-red-100 text-red-800">Overloaded</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const totalAssigned = workloads.reduce((sum, w) => sum + w.totalAssigned, 0);
  const totalInProgress = workloads.reduce((sum, w) => sum + w.inProgress, 0);
  const totalCompleted = workloads.reduce((sum, w) => sum + w.completed, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">CA Team Workload Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage workload distribution across CA team professionals
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Professionals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{workloads.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{totalAssigned}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">{totalInProgress}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{totalCompleted}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          All Professionals
        </button>
        <button
          onClick={() => setFilter("available")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === "available"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Available (&lt; 10)
        </button>
        <button
          onClick={() => setFilter("overloaded")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === "overloaded"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Overloaded (&gt;= 20)
        </button>
      </div>

      {/* Workload Table */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Workload Details</CardTitle>
          <CardDescription>
            Current workload distribution across CA team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workloads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No professionals found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Professional</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-center p-3 font-medium">Total</th>
                    <th className="text-center p-3 font-medium">In Progress</th>
                    <th className="text-center p-3 font-medium">Completed</th>
                    <th className="text-center p-3 font-medium">Avg. Processing</th>
                    <th className="text-center p-3 font-medium">Workload</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads.map((workload) => (
                    <tr key={workload.professionalId} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        {workload.professionalName || "Unknown"}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {workload.professionalEmail || "-"}
                      </td>
                      <td className="p-3 text-center">{workload.totalAssigned}</td>
                      <td className={`p-3 text-center font-medium ${getWorkloadColor(workload.inProgress)}`}>
                        {workload.inProgress}
                      </td>
                      <td className="p-3 text-center text-green-600">
                        {workload.completed}
                      </td>
                      <td className="p-3 text-center text-sm text-muted-foreground">
                        {workload.averageProcessingTime
                          ? `${workload.averageProcessingTime.toFixed(1)} days`
                          : "-"}
                      </td>
                      <td className="p-3 text-center">
                        {getWorkloadBadge(workload.inProgress)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

