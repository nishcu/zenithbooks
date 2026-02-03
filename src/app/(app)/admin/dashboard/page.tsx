"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Users, Briefcase, BadgeDollarSign, FileSignature } from "lucide-react";
import { ActivityFeed } from "@/components/admin/activity-feed";

type DashboardStats = {
  totalUsers: number;
  totalProfessionals: number;
  pendingCertifications: number;
  activeSubscriptions: number;
} | null;

export default function AdminDashboard() {
  const [user] = useAuthState(auth);
  const [stats, setStats] = useState<DashboardStats>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch("/api/admin/dashboard-stats", {
      headers: { "x-user-id": user.uid },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((data: DashboardStats) => setStats(data))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform-wide overview and management tools.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <AdminStatCard title="Total Users" icon={Users} mainValue="..." />
            <AdminStatCard title="Active Subscriptions" icon={BadgeDollarSign} mainValue="..." />
            <AdminStatCard title="Registered Professionals" icon={Briefcase} mainValue="..." />
            <AdminStatCard title="Pending Certifications" icon={FileSignature} mainValue="..." />
          </>
        ) : error ? (
          <div className="col-span-full rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        ) : stats ? (
          <>
            <AdminStatCard
              title="Total Users"
              mainValue={stats.totalUsers.toLocaleString()}
              icon={Users}
            />
            <AdminStatCard
              title="Active Subscriptions"
              mainValue={stats.activeSubscriptions.toLocaleString()}
              icon={BadgeDollarSign}
            />
            <AdminStatCard
              title="Registered Professionals"
              mainValue={stats.totalProfessionals.toLocaleString()}
              icon={Briefcase}
            />
            <AdminStatCard
              title="Pending Certifications"
              mainValue={stats.pendingCertifications.toLocaleString()}
              icon={FileSignature}
            />
          </>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-3">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
