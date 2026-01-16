"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Clock, CheckCircle2, XCircle, TrendingUp, Calendar, IndianRupee } from "lucide-react";
import { getITRApplication } from "@/lib/itr/firestore";
import type { ITRApplication, FinancialYear } from "@/lib/itr/types";
import Link from "next/link";

export default function RefundTrackingPage({ params }: { params: { id: string } }) {
  const [user, loadingUser] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [application, setApplication] = useState<ITRApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [predictedDate, setPredictedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!user && !loadingUser) {
      router.push("/login");
      return;
    }

    if (user) {
      loadApplication();
      predictRefundDate();
    }
  }, [user, loadingUser, params.id]);

  const loadApplication = async () => {
    try {
      const app = await getITRApplication(params.id);
      
      // Verify user owns this application
      if (app.userId !== user?.uid) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have access to this application.",
        });
        router.push("/itr-filing");
        return;
      }

      setApplication(app);
    } catch (error: any) {
      console.error("Error loading application:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load application details.",
      });
    } finally {
      setLoading(false);
    }
  };

  const predictRefundDate = async () => {
    try {
      const response = await fetch(`/api/itr/predict-refund-date?applicationId=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.predictedDate) {
          setPredictedDate(new Date(data.predictedDate));
        }
      }
    } catch (error) {
      console.error("Error predicting refund date:", error);
    }
  };

  const getRefundStatusColor = (status?: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "PROCESSING":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "CREDITED":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "REJECTED":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getRefundStatusIcon = (status?: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "PROCESSING":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "CREDITED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading || loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Application not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const refundInfo = application.refundInfo || {};
  const draft = application.draft;
  const refundAmount = refundInfo.amount || (draft?.refund || 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/itr-filing/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Refund Tracking</h1>
            <p className="text-muted-foreground">FY {application.financialYear}</p>
          </div>
        </div>
      </div>

      {/* Refund Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Refund Status
          </CardTitle>
          <CardDescription>
            Track your Income Tax refund status and expected credit date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-4">
            <Badge className={`px-4 py-2 text-sm font-medium ${getRefundStatusColor(refundInfo.status)}`}>
              {getRefundStatusIcon(refundInfo.status)}
              <span className="ml-2">{refundInfo.status || "PENDING"}</span>
            </Badge>
            {application.status === "COMPLETED" && !refundInfo.status && (
              <Badge variant="outline" className="text-xs">
                Refund processing typically takes 3-6 months
              </Badge>
            )}
          </div>

          {/* Refund Amount */}
          {refundAmount > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Refund Amount</p>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-6 w-6 text-green-600" />
                <span className="text-3xl font-bold text-green-600">
                  {refundAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          {/* Predicted Credit Date */}
          {(predictedDate || refundInfo.predictedDate) && (
            <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Predicted Credit Date
                </p>
              </div>
              <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                {(predictedDate || (refundInfo.predictedDate instanceof Date ? refundInfo.predictedDate : new Date(refundInfo.predictedDate)))?.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Based on historical data and current processing times
              </p>
            </div>
          )}

          {/* Actual Credit Date */}
          {refundInfo.creditedAt && (
            <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-900 dark:text-green-100">
                  Refund Credited
                </p>
              </div>
              <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                {refundInfo.creditedAt instanceof Date
                  ? refundInfo.creditedAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : new Date(refundInfo.creditedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
              </p>
            </div>
          )}

          {/* Timeline */}
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold">Refund Timeline</h3>
            <div className="space-y-3">
              {/* Filing Completed */}
              {application.completedAt && (
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <p className="font-medium">ITR Filed & Completed</p>
                    <p className="text-sm text-muted-foreground">
                      {application.completedAt instanceof Date
                        ? application.completedAt.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : new Date(application.completedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                    </p>
                  </div>
                </div>
              )}

              {/* Processing */}
              {refundInfo.status === "PROCESSING" && (
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <p className="font-medium">Refund Processing</p>
                    <p className="text-sm text-muted-foreground">
                      Your refund is being processed by the Income Tax Department
                    </p>
                  </div>
                </div>
              )}

              {/* Credited */}
              {refundInfo.status === "CREDITED" && refundInfo.creditedAt && (
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <p className="font-medium">Refund Credited</p>
                    <p className="text-sm text-muted-foreground">
                      Your refund has been credited to your bank account
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Processing Time</p>
            <p>
              Refunds are typically processed within 3-6 months from the date of filing,
              depending on various factors including verification requirements.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Status Updates</p>
            <p>
              You will receive notifications when your refund status changes. You can also
              check the status on the Income Tax Portal.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Bank Account</p>
            <p>
              Ensure your bank account details in your ITR are correct. The refund will be
              credited to the bank account linked to your PAN.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

