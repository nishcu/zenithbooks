"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  Lock,
  Eye,
  Download,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Phone,
} from "lucide-react";
import {
  getITRApplication,
  getApplicationDocuments,
  assignITRApplication,
  updateITRApplicationStatus,
  getITRCredentials,
} from "@/lib/itr/firestore";
import { AssignITRDialog } from "@/components/admin/assign-itr-dialog";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/itr/constants";
import { maskCredential } from "@/lib/itr/encryption";
import type { ITRApplication, ITRDocument, ITRCredentials, ITRStatus } from "@/lib/itr/types";
import { format } from "date-fns";
import Link from "next/link";

export default function AdminITRApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ITRApplication | null>(null);
  const [documents, setDocuments] = useState<ITRDocument[]>([]);
  const [credentials, setCredentials] = useState<ITRCredentials | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [assignedProfessional, setAssignedProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

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
      const [app, docs, creds] = await Promise.all([
        getITRApplication(applicationId),
        getApplicationDocuments(applicationId),
        getITRCredentials(applicationId),
      ]);

      if (!app) {
        toast({
          title: "Application Not Found",
          description: "The ITR application you're looking for doesn't exist.",
          variant: "destructive",
        });
        router.push("/admin/itr-applications");
        return;
      }

      setApplication(app);
      setDocuments(docs);
      setCredentials(creds);

      // Load user info
      const userDoc = await getDoc(doc(db, "users", app.userId));
      if (userDoc.exists()) {
        setUserInfo(userDoc.data());
      }

      // Load assigned professional info
      if (app.assignedTo) {
        const proDoc = await getDoc(doc(db, "professionals", app.assignedTo));
        if (proDoc.exists()) {
          setAssignedProfessional(proDoc.data());
        }
      }
    } catch (error: any) {
      console.error("Error loading application:", error);
      toast({
        title: "Error",
        description: "Failed to load application details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (professionalId: string) => {
    if (!application || !user) return;
    try {
      await assignITRApplication(application.id, professionalId, user.uid);
      toast({
        title: "Application Assigned",
        description: "The application has been assigned successfully.",
      });
      await loadData();
      setIsAssignDialogOpen(false);
    } catch (error: any) {
      throw new Error(error.message || "Failed to assign application");
    }
  };

  const handleStatusUpdate = async (newStatus: ITRStatus) => {
    if (!application) return;
    try {
      await updateITRApplicationStatus(application.id, newStatus);
      toast({
        title: "Status Updated",
        description: `Application status has been updated to ${STATUS_LABELS[newStatus]}.`,
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading application details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  const getStatusBadge = (status: ITRStatus) => {
    return (
      <Badge className={STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}>
        {STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/itr-applications">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold">ITR {application.financialYear}</h1>
              {getStatusBadge(application.status)}
            </div>
            <p className="text-muted-foreground mt-1">
              Application ID: {application.id}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setIsAssignDialogOpen(true);
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {application.assignedTo ? "Re-assign" : "Assign"}
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
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
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(application.status)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userInfo ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-semibold">{userInfo.name || userInfo.companyName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{userInfo.email || "—"}</p>
                      </div>
                    </div>
                    {userInfo.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{userInfo.phone}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Loading user information...</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
              <CardDescription>
                Manually update the application status if needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-4">
                <div className="flex-1 space-y-2">
                  <Label>New Status</Label>
                  <Select
                    value={application.status}
                    onValueChange={(value) => handleStatusUpdate(value as ITRStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([status, label]) => (
                        <SelectItem key={status} value={status}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
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
                            {doc.type.replace(/_/g, " ")} • {(doc.fileSize / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, "_blank")}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement("a");
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

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Tax Portal Credentials</CardTitle>
              <CardDescription>
                Encrypted credentials - Only visible to authorized CA team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {credentials ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Lock className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Security Notice</p>
                        <p>
                          Credentials are encrypted and can only be decrypted by authorized CA team
                          members. Viewing credentials is logged for security purposes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Username (Masked)</Label>
                      <div className="mt-1 p-3 bg-muted rounded-lg font-mono">
                        {credentials.encryptedUsername
                          ? maskCredential(credentials.encryptedUsername.substring(0, 10), 2)
                          : "Not available"}
                      </div>
                    </div>
                    <div>
                      <Label>Password (Masked)</Label>
                      <div className="mt-1 p-3 bg-muted rounded-lg font-mono">
                        {credentials.encryptedPassword
                          ? maskCredential("********", 2)
                          : "Not available"}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Note:</strong> Full credentials can only be viewed by assigned
                      professional in the CA Team Dashboard after proper authentication.
                    </p>
                  </div>

                  {credentials.accessLog && credentials.accessLog.length > 0 && (
                    <div>
                      <Label>Access Log</Label>
                      <div className="mt-2 space-y-2">
                        {credentials.accessLog.map((log, index) => (
                          <div
                            key={index}
                            className="p-2 bg-muted rounded text-sm"
                          >
                            <p>
                              Accessed by: {log.accessedBy} on{" "}
                              {format(new Date(log.accessedAt), "MMM dd, yyyy HH:mm")}
                            </p>
                            <p className="text-muted-foreground">Purpose: {log.purpose}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No credentials stored for this application
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignment Tab */}
        <TabsContent value="assignment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
              <CardDescription>
                Manage professional assignment for this application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.assignedTo ? (
                <>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center size-10 rounded-full bg-green-100">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Assigned</p>
                          <p className="text-sm text-muted-foreground">
                            {application.assignedAt
                              ? `Assigned on ${format(application.assignedAt, "MMM dd, yyyy")}`
                              : "Assignment date not available"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsAssignDialogOpen(true)}
                      >
                        Re-assign
                      </Button>
                    </div>

                    {assignedProfessional ? (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Professional Name</p>
                          <p className="font-semibold">{assignedProfessional.name || "—"}</p>
                        </div>
                        {assignedProfessional.firmName && (
                          <div>
                            <p className="text-sm text-muted-foreground">Firm</p>
                            <p className="font-medium">{assignedProfessional.firmName}</p>
                          </div>
                        )}
                        {assignedProfessional.email && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{assignedProfessional.email}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Professional ID: {application.assignedTo}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-semibold mb-2">Not Assigned</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    This application has not been assigned to any professional yet.
                  </p>
                  <Button onClick={() => setIsAssignDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign Professional
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                  description="ITR application was created by user"
                  completed
                />
                {application.submittedAt && (
                  <TimelineItem
                    date={application.submittedAt}
                    title="Documents Submitted"
                    description="User submitted all required documents and credentials"
                    completed
                  />
                )}
                {application.assignedAt && (
                  <TimelineItem
                    date={application.assignedAt}
                    title="Assigned to Professional"
                    description={`Assigned to professional for processing`}
                    completed
                  />
                )}
                {application.draftReadyAt && (
                  <TimelineItem
                    date={application.draftReadyAt}
                    title="Draft Ready"
                    description="ITR draft has been generated and is ready for review"
                    completed={application.status !== "DRAFT_READY"}
                  />
                )}
                {application.userApprovedAt && (
                  <TimelineItem
                    date={application.userApprovedAt}
                    title="Draft Approved"
                    description="User has approved the ITR draft"
                    completed
                  />
                )}
                {application.filedAt && (
                  <TimelineItem
                    date={application.filedAt}
                    title="ITR Filed"
                    description="ITR has been filed with the Income Tax Department"
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

      {/* Assignment Dialog */}
      <AssignITRDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        application={application}
        onAssign={handleAssign}
      />
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
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          completed
            ? "bg-green-100 text-green-600"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Clock className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {format(date, "MMM dd, yyyy HH:mm")}
        </p>
      </div>
    </div>
  );
}

