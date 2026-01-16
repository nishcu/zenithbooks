"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getUserITRApplications } from "@/lib/itr/firestore";
import type { ITRApplication } from "@/lib/itr/types";
import { STATUS_LABELS, STATUS_COLORS, getCurrentFinancialYear } from "@/lib/itr/constants";

export default function ITRFilingPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [applications, setApplications] = useState<ITRApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    loadApplications();
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const apps = await getUserITRApplications(user.uid);
      setApplications(apps);
    } catch (error) {
      console.error("Error loading ITR applications:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your ITR applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ITR Filing</h1>
          <p className="text-muted-foreground mt-1">
            File your Income Tax Returns with ease
          </p>
        </div>
        <Link href="/itr-filing/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New ITR Application
          </Button>
        </Link>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No ITR Applications Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start filing your Income Tax Return by creating a new application.
              Upload your documents and let our CA team handle the rest.
            </p>
            <Link href="/itr-filing/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New Application
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      ITR {app.financialYear || getCurrentFinancialYear()}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Application ID: {app.id.substring(0, 8)}...
                    </CardDescription>
                  </div>
                  <Badge className={STATUS_COLORS[app.status] || "bg-gray-100 text-gray-800"}>
                    {STATUS_LABELS[app.status] || app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      Created: {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                    {app.pan && (
                      <div className="flex items-center text-sm">
                        <span className="text-muted-foreground mr-2">PAN:</span>
                        <span className="font-mono">{app.pan}</span>
                      </div>
                    )}
                  </div>
                  <Link href={`/itr-filing/${app.id}`}>
                    <Button variant="outline">View Details</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
              Secure & Encrypted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All your documents and credentials are encrypted with AES-256 encryption.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-600" />
              CA Team Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our expert CA team handles AIS download, draft preparation, and filing.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-orange-600" />
              Track Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get real-time updates on your ITR filing status via WhatsApp and email.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

