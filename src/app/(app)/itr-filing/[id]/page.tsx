"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download,
  Eye,
  MessageSquare,
  DollarSign,
} from "lucide-react";
import { getITRApplication, getApplicationDocuments, getITRDraft } from "@/lib/itr/firestore";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/itr/constants";
import type { ITRApplication, ITRDocument, ITRDraft } from "@/lib/itr/types";
import Link from "next/link";

export default function ITRApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ITRApplication | null>(null);
  const [documents, setDocuments] = useState<ITRDocument[]>([]);
  const [draft, setDraft] = useState<ITRDraft | null>(null);
  const [loading, setLoading] = useState(true);

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
      const [app, docs, draftData] = await Promise.all([
        getITRApplication(applicationId),
        getApplicationDocuments(applicationId),
        getITRDraft(applicationId),
      ]);

      if (!app || app.userId !== user?.uid) {
        router.push("/itr-filing");
        return;
      }

      setApplication(app);
      setDocuments(docs);
      setDraft(draftData);
    } catch (error) {
      console.error("Error loading application:", error);
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
            <p className="text-muted-foreground">Loading application...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Application Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The ITR application you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/itr-filing">
              <Button>Back to ITR Filing</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusProgress = (status: string): number => {
    const statusOrder = [
      'UPLOADED',
      'DATA_FETCHING',
      'AIS_DOWNLOADED',
      'DRAFT_IN_PROGRESS',
      'DRAFT_READY',
      'USER_REVIEW',
      'USER_APPROVED',
      'FILING_IN_PROGRESS',
      'FILED',
      'E_VERIFIED',
      'COMPLETED',
    ];
    const index = statusOrder.indexOf(status);
    return index >= 0 ? ((index + 1) / statusOrder.length) * 100 : 0;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold">ITR {application.financialYear}</h1>
            <Badge className={STATUS_COLORS[application.status] || "bg-gray-100 text-gray-800"}>
              {STATUS_LABELS[application.status] || application.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Application ID: {application.id.substring(0, 8)}...
          </p>
        </div>
        <Link href="/itr-filing">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Application Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(getStatusProgress(application.status))}%</span>
            </div>
            <Progress value={getStatusProgress(application.status)} />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {draft && <TabsTrigger value="draft">Draft</TabsTrigger>}
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Financial Year</p>
                  <p className="font-semibold">{application.financialYear}</p>
                </div>
                {application.pan && (
                  <div>
                    <p className="text-sm text-muted-foreground">PAN</p>
                    <p className="font-mono">{application.pan}</p>
                  </div>
                )}
                {application.name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold">{application.name}</p>
                  </div>
                )}
                {application.formType && (
                  <div>
                    <p className="text-sm text-muted-foreground">Form Type</p>
                    <p className="font-semibold">{application.formType}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {draft && (
              <Card>
                <CardHeader>
                  <CardTitle>Tax Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Income</p>
                    <p className="font-semibold text-lg">
                      ₹{draft.income.totalIncome.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Deductions</p>
                    <p className="font-semibold">
                      ₹{draft.deductions.totalDeductions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {draft.tax.refund > 0 ? "Refund" : "Tax Payable"}
                    </p>
                    <p className={`font-semibold text-lg ${
                      draft.tax.refund > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      ₹{Math.abs(draft.tax.refund || draft.tax.payable || 0).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {application.status === 'DRAFT_READY' && draft && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Draft Ready for Review
                </CardTitle>
                <CardDescription>
                  Your ITR draft is ready. Please review and approve to proceed with filing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/itr-filing/${applicationId}/review`}>
                  <Button className="w-full">Review & Approve Draft</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                All documents related to this ITR application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.type.replace(/_/g, ' ')} • {(doc.fileSize / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = doc.fileUrl;
                            link.download = doc.fileName;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Draft Tab */}
        {draft && (
          <TabsContent value="draft" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ITR Draft Details</CardTitle>
                <CardDescription>
                  Generated draft with income, deductions, and tax calculations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Income Summary */}
                <div>
                  <h3 className="font-semibold mb-3">Income Summary</h3>
                  <div className="space-y-2">
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
                    <div className="flex justify-between pt-2 border-t font-semibold">
                      <span>Total Income</span>
                      <span>₹{draft.income.totalIncome.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Summary */}
                <div>
                  <h3 className="font-semibold mb-3">Deductions Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Section 80C</span>
                      <span className="font-medium">₹{draft.deductions.section80C.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Section 80D</span>
                      <span className="font-medium">₹{draft.deductions.section80D.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Section 24 (Home Loan)</span>
                      <span className="font-medium">₹{draft.deductions.section24.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Other Deductions</span>
                      <span className="font-medium">₹{draft.deductions.other.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-semibold">
                      <span>Total Deductions</span>
                      <span>₹{draft.deductions.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Tax Calculation */}
                <div>
                  <h3 className="font-semibold mb-3">Tax Calculation</h3>
                  <div className="space-y-2">
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
                    <div className="flex justify-between pt-2 border-t font-semibold text-lg">
                      <span>{draft.tax.refund > 0 ? "Refund Amount" : "Tax Payable"}</span>
                      <span className={draft.tax.refund > 0 ? "text-green-600" : "text-red-600"}>
                        ₹{Math.abs(draft.tax.refund || draft.tax.payable || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mismatches */}
                {draft.mismatches.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-orange-600">Mismatches Detected</h3>
                    <div className="space-y-2">
                      {draft.mismatches.map((mismatch, index) => (
                        <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{mismatch.type}</p>
                              <p className="text-sm text-muted-foreground">{mismatch.description}</p>
                            </div>
                            <Badge variant="outline" className="bg-orange-100">
                              {mismatch.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {draft.comments.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Comments & Notes
                    </h3>
                    <div className="space-y-3">
                      {draft.comments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium">
                              {comment.authorType === 'CA_TEAM' ? 'CA Team' : 'You'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem
                  date={application.createdAt}
                  title="Application Created"
                  description="Your ITR application was created"
                  completed
                />
                {application.submittedAt && (
                  <TimelineItem
                    date={application.submittedAt}
                    title="Documents Submitted"
                    description="All documents and credentials were submitted"
                    completed
                  />
                )}
                {application.draftReadyAt && (
                  <TimelineItem
                    date={application.draftReadyAt}
                    title="Draft Ready"
                    description="ITR draft has been generated and is ready for review"
                    completed
                  />
                )}
                {application.userApprovedAt && (
                  <TimelineItem
                    date={application.userApprovedAt}
                    title="Draft Approved"
                    description="You have approved the ITR draft"
                    completed
                  />
                )}
                {application.filedAt && (
                  <TimelineItem
                    date={application.filedAt}
                    title="ITR Filed"
                    description="Your ITR has been filed with the Income Tax Department"
                    completed
                  />
                )}
                {application.eVerifiedAt && (
                  <TimelineItem
                    date={application.eVerifiedAt}
                    title="E-Verification Completed"
                    description="E-verification has been completed"
                    completed
                  />
                )}
                {application.completedAt && (
                  <TimelineItem
                    date={application.completedAt}
                    title="Process Completed"
                    description="ITR filing process has been completed"
                    completed
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimelineItem({
  date,
  title,
  description,
  completed,
}: {
  date: Date;
  title: string;
  description: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-start space-x-4">
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        completed ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
      }`}>
        {completed ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

