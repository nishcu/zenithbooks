"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  Settings,
  BarChart3,
  Bell,
  Gift,
  UserCheck,
  DollarSign,
  Calendar,
  BookOpen,
  Download
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard after a brief loading period
    const timer = setTimeout(() => {
      router.push("/admin/dashboard");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  const adminModules = [
    {
      title: "Dashboard",
      description: "Overview and analytics",
      icon: BarChart3,
      path: "/admin/dashboard",
      badge: "Main"
    },
    {
      title: "Users",
      description: "Manage user accounts",
      icon: Users,
      path: "/admin/users",
      badge: "Users"
    },
    {
      title: "Professionals",
      description: "Manage professional profiles",
      icon: UserCheck,
      path: "/admin/professionals",
      badge: "Staff"
    },
    {
      title: "Blog",
      description: "Manage blog posts",
      icon: BookOpen,
      path: "/admin/blog",
      badge: "Content"
    },
    {
      title: "Certification Requests",
      description: "Review and approve certificates",
      icon: FileText,
      path: "/admin/certification-requests",
      badge: "Certificates"
    },
    {
      title: "Compliance Tasks",
      description: "Manage compliance task executions",
      icon: FileText,
      path: "/admin/compliance-tasks",
      badge: "Compliance"
    },
    {
      title: "Zenith Corporate Mitra",
      description: "Manage associate registrations and approvals",
      icon: UserCheck,
      path: "/admin/compliance-associates",
      badge: "Staff"
    },
    {
      title: "Business Registrations",
      description: "Manage business registration requests",
      icon: FileText,
      path: "/admin/business-registrations",
      badge: "Registrations"
    },
    {
      title: "Service Pricing",
      description: "Configure service rates",
      icon: DollarSign,
      path: "/admin/service-pricing",
      badge: "Pricing"
    },
    {
      title: "Coupons",
      description: "Manage discount codes",
      icon: Gift,
      path: "/admin/coupons",
      badge: "Marketing"
    },
    {
      title: "Notices",
      description: "Broadcast announcements",
      icon: Bell,
      path: "/admin/notices",
      badge: "Communication"
    },
    {
      title: "Subscribers",
      description: "View email subscribers",
      icon: Users,
      path: "/admin/subscribers",
      badge: "Marketing"
    },
    {
      title: "Free Form 16 Leads",
      description: "Export employee mobile numbers (free Form 16)",
      icon: Download,
      path: "/admin/form16-free-leads",
      badge: "Leads"
    },
    {
      title: "Appointments",
      description: "Manage appointments",
      icon: Calendar,
      path: "/admin/appointments",
      badge: "Scheduling"
    },
    {
      title: "Knowledge Moderation",
      description: "Review and moderate knowledge posts",
      icon: BookOpen,
      path: "/admin/knowledge-moderation",
      badge: "Content"
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Comprehensive administration dashboard</p>
        <p className="text-sm text-blue-600 mt-2">Redirecting to dashboard in a moment...</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {adminModules.map((module) => (
          <Card key={module.path} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(module.path)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <module.icon className="h-8 w-8 text-blue-600" />
                <Badge variant="secondary" className="text-xs">
                  {module.badge}
                </Badge>
              </div>
              <CardTitle className="text-lg">{module.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {module.description}
              </CardDescription>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(module.path);
                }}
              >
                Access →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800">
          <strong>Quick Access:</strong> Click any module above or wait for automatic redirect to dashboard
        </p>
      </div>
    </div>
  );
}
