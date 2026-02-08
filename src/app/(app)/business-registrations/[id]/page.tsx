/**
 * Business Registration Status Page
 * Shows registration details and status tracking
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Loader2,
  Building,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Upload,
  Calendar,
  UserCog,
  IndianRupee,
  CreditCard,
} from "lucide-react";
import {
  getAuditLogsByRegistration,
  addDocumentToRegistration,
} from "@/lib/business-registrations/firestore";
import { getRegistrationConfig } from "@/lib/business-registrations/constants";
import type { BusinessRegistration, RegistrationStatus } from "@/lib/business-registrations/types";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function BusinessRegistrationStatusPage() {
  const params = useParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<BusinessRegistration | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [uploadingForDoc, setUploadingForDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocNameRef = useRef<string | null>(null);

  const registrationId = params.id as string;

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadRegistration();
  }, [user, registrationId, router]);

  const loadRegistration = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/registrations/${registrationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = body?.message || body?.error || "Failed to load registration.";
        if (res.status === 401 || res.status === 403) {
          toast({
            variant: "destructive",
            title: "Access denied",
            description: message,
          });
          router.push("/business-registrations");
          return;
        }
        if (res.status === 404) {
          toast({
            variant: "destructive",
            title: "Not found",
            description: "Registration not found.",
          });
          router.push("/business-registrations");
          return;
        }
        throw new Error(message);
      }
      const data = await res.json();
      const reg: BusinessRegistration = {
        ...data,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        documents: (data.documents || []).map((d: { uploadedAt?: string; [k: string]: unknown }) => ({
          ...d,
          uploadedAt: d.uploadedAt ? new Date(d.uploadedAt as string) : new Date(),
        })),
      };
      setRegistration(reg);

      // Load audit logs (non-blocking: if rules/index not deployed, registration still shows)
      try {
        const logs = await getAuditLogsByRegistration(registrationId, 10);
        setAuditLogs(logs);
      } catch (logError: any) {
        console.warn("Audit logs unavailable:", logError);
        setAuditLogs([]);
      }
    } catch (error: any) {
      console.error("Error loading registration:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to load registration. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    const statusConfig: Record<
      RegistrationStatus,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending_documents: { label: "Pending Client Documents", variant: "secondary" },
      submitted_to_team: {
        label: "Submitted to ZenithBooks Compliance Team",
        variant: "default",
      },
      in_progress: { label: "In Progress", variant: "default" },
      under_review: { label: "Under Review", variant: "default" },
      completed: { label: "Completed", variant: "outline" },
      rejected: { label: "Rejected", variant: "destructive" },
      on_hold: { label: "On Hold", variant: "secondary" },
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="text-sm">
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Registration not found.</p>
              <Button onClick={() => router.push("/business-registrations")}>
                Back to Registrations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = getRegistrationConfig(registration.registrationType);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Building className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{config.name}</h1>
              <p className="text-muted-foreground mt-1">{config.description}</p>
            </div>
          </div>
          {getStatusBadge(registration.status)}
        </div>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          This registration is handled by ZenithBooks Compliance Team in compliance with Indian 
          laws and ICAI regulations. All professional services are delivered in accordance with 
          applicable regulations.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Registration Fee</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  <IndianRupee className="h-5 w-5" />
                  {registration.feeAmount.toLocaleString("en-IN")}
                </p>
              </div>
              {registration.feePaid ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {registration.feePaid ? "Payment Received" : "Payment Pending"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Completion</p>
                <p className="text-2xl font-bold">{config.estimatedDays} days</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Business days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents Uploaded</p>
                <p className="text-2xl font-bold">{registration.documents.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {registration.documents.length} uploaded (all optional)
            </p>
          </CardContent>
        </Card>
      </div>

      {!registration.feePaid && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <CreditCard className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-4">
            <span>Complete payment to proceed to document upload (optional) and track status.</span>
            <Button onClick={() => router.push(`/business-registrations/${registrationId}/pay`)}>
              Pay now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Registration Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Registration Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Business Name</p>
              <p className="font-medium">{registration.businessName || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Business Type</p>
              <p className="font-medium">{registration.businessType || "N/A"}</p>
            </div>
            {registration.pan && (
              <div>
                <p className="text-sm text-muted-foreground">PAN Number</p>
                <p className="font-medium">{registration.pan}</p>
              </div>
            )}
            {registration.registrationNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Registration Number</p>
                <p className="font-medium">{registration.registrationNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created Date</p>
              <p className="font-medium">
                {format(
                  registration.createdAt instanceof Date
                    ? registration.createdAt
                    : new Date(registration.createdAt),
                  "PPP"
                )}
              </p>
            </div>
            {registration.completedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Completed Date</p>
                <p className="font-medium">
                  {format(
                    registration.completedAt instanceof Date
                      ? registration.completedAt
                      : new Date(registration.completedAt),
                    "PPP"
                  )}
                </p>
              </div>
            )}
          </div>

          {registration.address && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Business Address</p>
              <p className="font-medium">
                {registration.address.line1}
                {registration.address.line2 && `, ${registration.address.line2}`}
                <br />
                {registration.address.city}, {registration.address.state} -{" "}
                {registration.address.pincode}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents - all optional, only after payment */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Documents (all optional)</CardTitle>
          <CardDescription>
            {registration.feePaid
              ? "You may upload the following documents to support your registration. Uploads are optional."
              : "Complete payment above to unlock document upload."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              const docName = pendingDocNameRef.current;
              e.target.value = "";
              pendingDocNameRef.current = null;
              if (!file || !docName || !user || !registration.feePaid) return;
              setUploadingForDoc(docName);
              try {
                const path = `business-registrations/${registrationId}/${user.uid}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, path);
                await uploadBytesResumable(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                await addDocumentToRegistration(registrationId, {
                  id: crypto.randomUUID(),
                  name: docName,
                  type: file.type || "application/octet-stream",
                  uploadedAt: new Date(),
                  uploadedBy: user.uid,
                  vaultReference: downloadURL,
                });
                toast({ title: "Document uploaded", description: `${file.name} uploaded.` });
                loadRegistration();
              } catch (err: any) {
                toast({
                  variant: "destructive",
                  title: "Upload failed",
                  description: err?.message || "Failed to upload document.",
                });
              } finally {
                setUploadingForDoc(null);
              }
            }}
          />
          <div className="space-y-3">
            {config.requiredDocuments.map((docName, idx) => {
              const uploadedDoc = registration.documents.find((d) => d.name === docName);
              const isUploading = uploadingForDoc === docName;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {uploadedDoc ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{docName}</p>
                      {uploadedDoc && (
                        <p className="text-xs text-muted-foreground">
                          Uploaded on{" "}
                          {format(
                            uploadedDoc.uploadedAt instanceof Date
                              ? uploadedDoc.uploadedAt
                              : new Date(uploadedDoc.uploadedAt),
                            "PPP"
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {!uploadedDoc && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!registration.feePaid || isUploading}
                      onClick={() => {
                        pendingDocNameRef.current = docName;
                        fileInputRef.current?.click();
                      }}
                    >
                      {isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Upload
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      {auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent updates on your registration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-4 pb-4 border-b last:border-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        log.performedAt instanceof Date
                          ? log.performedAt
                          : new Date(log.performedAt),
                        "PPP 'at' p"
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

