"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  getITRApplication,
  getITRDraft,
  updateITRDraft,
  updateITRApplicationStatus,
} from "@/lib/itr/firestore";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/itr/constants";
import type { ITRApplication, ITRDraft, ITRStatus } from "@/lib/itr/types";
import Link from "next/link";
import html2pdf from "html2pdf.js";

export default function ITRDraftReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const applicationId = params.id as string;
  const pdfRef = useRef<HTMLDivElement>(null);

  const [application, setApplication] = useState<ITRApplication | null>(null);
  const [draft, setDraft] = useState<ITRDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [changeRequest, setChangeRequest] = useState("");
  const [showChangeRequest, setShowChangeRequest] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    loadData();
  }, [user, applicationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [app, draftData] = await Promise.all([
        getITRApplication(applicationId),
        getITRDraft(applicationId),
      ]);

      if (!app || app.userId !== user?.uid) {
        router.push("/itr-filing");
        return;
      }

      if (app.status !== "DRAFT_READY" && app.status !== "USER_REVIEW") {
        toast({
          title: "Draft Not Ready",
          description: "The draft is not yet ready for review.",
          variant: "destructive",
        });
        router.push(`/itr-filing/${applicationId}`);
        return;
      }

      if (!draftData) {
        toast({
          title: "Draft Not Found",
          description: "The draft could not be found.",
          variant: "destructive",
        });
        router.push(`/itr-filing/${applicationId}`);
        return;
      }

      setApplication(app);
      setDraft(draftData);

      // Update status to USER_REVIEW if it's DRAFT_READY
      if (app.status === "DRAFT_READY") {
        await updateITRApplicationStatus(applicationId, "USER_REVIEW" as ITRStatus);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || !draft || !application) return;

    try {
      toast({
        title: "Generating PDF...",
        description: "Your ITR draft PDF is being prepared.",
      });

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `ITR-Draft-${application.financialYear}-${application.id.substring(0, 8)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(pdfRef.current).save();

      toast({
        title: "PDF Downloaded",
        description: "Your ITR draft PDF has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApproveDraft = async () => {
    if (!draft || !application || !user) return;

    setProcessing(true);
    try {
      // Update draft status
      await updateITRDraft(draft.id, {
        status: "APPROVED",
        approvedBy: user.uid,
        approvedAt: new Date(),
      });

      // Update application status
      await updateITRApplicationStatus(application.id, "USER_APPROVED" as ITRStatus);

      // Send notification (Phase 6) - via API route
      try {
        await fetch('/api/itr/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            applicationId: application.id,
            type: 'STATUS_UPDATE',
            financialYear: application.financialYear,
          }),
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }

      toast({
        title: "Draft Approved",
        description: "Your approval has been recorded. The CA team will proceed with filing.",
      });

      router.push(`/itr-filing/${applicationId}`);
    } catch (error: any) {
      console.error("Error approving draft:", error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!draft || !application || !user || !changeRequest.trim()) return;

    setProcessing(true);
    try {
      // Add user comment
      const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newComment = {
        id: commentId,
        author: user.uid,
        authorType: "USER" as const,
        message: changeRequest.trim(),
        createdAt: new Date(),
        resolved: false,
      };

      const updatedComments = [...(draft.comments || []), newComment];

      // Update draft with comment and status
      await updateITRDraft(draft.id, {
        comments: updatedComments,
        status: "CHANGES_REQUESTED",
      });

      // Update application status
      await updateITRApplicationStatus(application.id, "CHANGES_REQUESTED" as ITRStatus);

      // Send notification (Phase 6) - via API route
      try {
        await fetch('/api/itr/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            applicationId: application.id,
            type: 'CHANGES_REQUESTED',
            financialYear: application.financialYear,
          }),
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }

      toast({
        title: "Changes Requested",
        description: "Your request has been sent to the CA team. They will review and update the draft.",
      });

      router.push(`/itr-filing/${applicationId}`);
    } catch (error: any) {
      console.error("Error requesting changes:", error);
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit change request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading draft...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application || !draft) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Draft Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The ITR draft you're looking for doesn't exist or is not ready for review.
            </p>
            <Link href="/itr-filing">
              <Button>Back to ITR Filing</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/itr-filing/${applicationId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Review ITR Draft</h1>
            <p className="text-muted-foreground mt-1">
              Financial Year: {application.financialYear} | Application ID: {application.id.substring(0, 8)}...
            </p>
          </div>
        </div>
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Notification Banner */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">Your ITR Draft is Ready!</h3>
              <p className="text-sm text-green-700 mt-1">
                Please review the draft below. You can approve it to proceed with filing, or request changes if
                you notice any discrepancies.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Content (Hidden, for PDF generation) */}
      <div ref={pdfRef} className="hidden">
        <div className="p-8 space-y-6">
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">ITR Draft - {application.financialYear}</h1>
            <p className="text-muted-foreground mt-1">Application ID: {application.id}</p>
          </div>

          {/* Income Summary */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Income Summary</h2>
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b">
                  <td className="p-2">Salary</td>
                  <td className="p-2 text-right">₹{draft.income.salary.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">House Property</td>
                  <td className="p-2 text-right">₹{draft.income.houseProperty.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Capital Gains</td>
                  <td className="p-2 text-right">₹{draft.income.capitalGains.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Business/Profession</td>
                  <td className="p-2 text-right">₹{draft.income.businessProfession.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Other Sources</td>
                  <td className="p-2 text-right">₹{draft.income.otherSources.toLocaleString()}</td>
                </tr>
                <tr className="border-t-2 font-semibold">
                  <td className="p-2">Total Income</td>
                  <td className="p-2 text-right">₹{draft.income.totalIncome.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions Summary */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Deductions Summary</h2>
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b">
                  <td className="p-2">Section 80C</td>
                  <td className="p-2 text-right">₹{draft.deductions.section80C.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Section 80D</td>
                  <td className="p-2 text-right">₹{draft.deductions.section80D.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Section 80G</td>
                  <td className="p-2 text-right">₹{draft.deductions.section80G.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Section 24 (Home Loan)</td>
                  <td className="p-2 text-right">₹{draft.deductions.section24.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Other Deductions</td>
                  <td className="p-2 text-right">₹{draft.deductions.other.toLocaleString()}</td>
                </tr>
                <tr className="border-t-2 font-semibold">
                  <td className="p-2">Total Deductions</td>
                  <td className="p-2 text-right">₹{draft.deductions.totalDeductions.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Calculation */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Tax Calculation</h2>
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b">
                  <td className="p-2">Total Tax</td>
                  <td className="p-2 text-right">₹{draft.tax.totalTax.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">TDS</td>
                  <td className="p-2 text-right">₹{draft.tax.tds.toLocaleString()}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Advance Tax</td>
                  <td className="p-2 text-right">₹{draft.tax.advanceTax.toLocaleString()}</td>
                </tr>
                <tr className="border-t-2 font-semibold">
                  <td className="p-2">
                    {draft.tax.refund > 0 ? "Refund Amount" : "Tax Payable"}
                  </td>
                  <td className={`p-2 text-right ${draft.tax.refund > 0 ? "text-green-600" : "text-red-600"}`}>
                    ₹{Math.abs(draft.tax.refund || draft.tax.payable || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mismatches */}
          {draft.mismatches.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3 text-orange-600">Mismatches Detected</h2>
              <ul className="list-disc list-inside space-y-2">
                {draft.mismatches.map((mismatch, index) => (
                  <li key={index} className="text-sm">
                    <strong>{mismatch.type}:</strong> {mismatch.description} (₹{mismatch.amount.toLocaleString()}) - {mismatch.severity}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comments */}
          {draft.comments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Comments & Notes</h2>
              <div className="space-y-2">
                {draft.comments.map((comment) => (
                  <div key={comment.id} className="p-3 border rounded">
                    <p className="text-sm font-medium">
                      {comment.authorType === "CA_TEAM" ? "CA Team" : "You"}
                    </p>
                    <p className="text-sm mt-1">{comment.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Review Content */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Summary Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Income Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Income Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary</span>
                  <span className="font-medium">₹{draft.income.salary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">House Property</span>
                  <span className="font-medium">₹{draft.income.houseProperty.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capital Gains</span>
                  <span className="font-medium">₹{draft.income.capitalGains.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business/Profession</span>
                  <span className="font-medium">₹{draft.income.businessProfession.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Sources</span>
                  <span className="font-medium">₹{draft.income.otherSources.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-3 border-t font-semibold text-lg">
                  <span>Total Income</span>
                  <span>₹{draft.income.totalIncome.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deductions Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Deductions Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Section 80C</span>
                  <span className="font-medium">₹{draft.deductions.section80C.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Section 80D</span>
                  <span className="font-medium">₹{draft.deductions.section80D.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Section 80G</span>
                  <span className="font-medium">₹{draft.deductions.section80G.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Section 24 (Home Loan)</span>
                  <span className="font-medium">₹{draft.deductions.section24.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Deductions</span>
                  <span className="font-medium">₹{draft.deductions.other.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-3 border-t font-semibold text-lg">
                  <span>Total Deductions</span>
                  <span>₹{draft.deductions.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Calculation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tax</span>
                  <span className="font-medium">₹{draft.tax.totalTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TDS</span>
                  <span className="font-medium">₹{draft.tax.tds.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance Tax</span>
                  <span className="font-medium">₹{draft.tax.advanceTax.toLocaleString()}</span>
                </div>
                <div
                  className={`flex justify-between pt-3 border-t font-semibold text-lg ${
                    draft.tax.refund > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  <span>{draft.tax.refund > 0 ? "Refund Amount" : "Tax Payable"}</span>
                  <span>₹{Math.abs(draft.tax.refund || draft.tax.payable || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mismatches */}
          {draft.mismatches.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Mismatches Detected
                </CardTitle>
                <CardDescription>
                  Please review these discrepancies and confirm if they are correct
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {draft.mismatches.map((mismatch, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        mismatch.severity === "HIGH"
                          ? "bg-red-50 border-red-200"
                          : mismatch.severity === "MEDIUM"
                          ? "bg-orange-50 border-orange-200"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={mismatch.severity === "HIGH" ? "destructive" : "outline"}
                            >
                              {mismatch.type}
                            </Badge>
                            <Badge variant="outline">{mismatch.severity}</Badge>
                          </div>
                          <p className="text-sm font-medium">{mismatch.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Difference: ₹{mismatch.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          {draft.comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Comments & Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {draft.comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">
                          {comment.authorType === "CA_TEAM" ? "CA Team" : "You"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Action Panel */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Review and take action on this draft</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showChangeRequest ? (
                <>
                  <Button
                    onClick={handleApproveDraft}
                    disabled={processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve Draft
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowChangeRequest(true)}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Request Changes
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="changeRequest">What changes would you like to request?</Label>
                    <Textarea
                      id="changeRequest"
                      placeholder="Please describe the changes you need..."
                      value={changeRequest}
                      onChange={(e) => setChangeRequest(e.target.value)}
                      rows={6}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleRequestChanges}
                      disabled={processing || !changeRequest.trim()}
                      className="flex-1"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Submit Request
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowChangeRequest(false);
                        setChangeRequest("");
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-lg font-semibold">₹{draft.income.totalIncome.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="text-lg font-semibold">₹{draft.deductions.totalDeductions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {draft.tax.refund > 0 ? "Refund" : "Tax Payable"}
                </p>
                <p
                  className={`text-lg font-semibold ${
                    draft.tax.refund > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ₹{Math.abs(draft.tax.refund || draft.tax.payable || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
