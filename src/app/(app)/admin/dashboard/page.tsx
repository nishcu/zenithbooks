
"use client";

import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Users, Briefcase, FileText, BadgeDollarSign, MailWarning, FileSignature, Newspaper, HandCoins } from "lucide-react";
import { ActivityFeed } from "@/components/admin/activity-feed";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform-wide overview and management tools.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard title="Total Users" mainValue="1,254" subValue="+20.1% from last month" icon={Users}/>
        <AdminStatCard title="Active Subscriptions" mainValue="432" subValue="+180.1% from last month" icon={BadgeDollarSign} />
        <AdminStatCard title="Registered Professionals" mainValue="89" subValue="+12 since last week" icon={Briefcase}/>
        <AdminStatCard title="Pending Certifications" mainValue="12" subValue="3 new today" icon={FileSignature}/>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-3">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

    