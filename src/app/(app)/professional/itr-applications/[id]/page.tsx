"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Lock,
  Copy,
  CheckCircle2,
  Upload,
  Loader2,
  Key,
  AlertCircle,
  FileSignature,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  getITRApplication,
  getApplicationDocuments,
  getITRCredentials,
  updateITRApplicationStatus,
  createITRDocument,
  logCredentialAccess,
  updateITRFilingInfo,
} from "@/lib/itr/firestore";
import { STATUS_LABELS, STATUS_COLORS, ITR_STORAGE_PATHS } from "@/lib/itr/constants";
import type { ITRApplication, ITRDocument, ITRStatus, DocumentType } from "@/lib/itr/types";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function ProfessionalITRApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ITRApplication | null>(null);
  const [documents, setDocuments] = useState<ITRDocument[]>([]);
  const [credentials, setCredentials] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Credential states
  const [showCredentials, setShowCredentials] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // AIS upload states
  const [aisUploading, setAisUploading] = useState(false);
  const [aisUploadProgress, setAisUploadProgress] = useState(0);
  const [selectedAISFile, setSelectedAISFile] = useState<File | null>(null);
  const [selectedAISJSONFile, setSelectedAISJSONFile] = useState<File | null>(null);
  const [selected26ASFile, setSelected26ASFile] = useState<File | null>(null);

  // Filing workflow states
  const [itrFile, setItrFile] = useState<File | null>(null);
  const [itrVFile, setItrVFile] = useState<File | null>(null);
  const [acknowledgementFile, setAcknowledgementFile] = useState<File | null>(null);
  const [acknowledgementNumber, setAcknowledgementNumber] = useState("");
  const [filingUploading, setFilingUploading] = useState(false);
  const [filingProgress, setFilingProgress] = useState(0);

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
      const [app, docs] = await Promise.all([
        getITRApplication(applicationId),
        getApplicationDocuments(applicationId),
      ]);

      if (!app) {
        toast({
          title: "Application Not Found",
          description: "The ITR application you're looking for doesn't exist.",
          variant: "destructive",
        });
        router.push("/professional/itr-applications");
        return;
      }

      // Verify assignment
      if (app.assignedTo !== user?.uid) {
        toast({
          title: "Access Denied",
          description: "This application is not assigned to you.",
          variant: "destructive",
        });
        router.push("/professional/itr-applications");
        return;
      }

      setApplication(app);
      setDocuments(docs);

      // Load user info
      const userDoc = await getDoc(doc(db, "users", app.userId));
      if (userDoc.exists()) {
        setUserInfo(userDoc.data());
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

  const handleLoadCredentials = async () => {
    if (!user || !application) return;

    setLoadingCredentials(true);
    try {
      // Verify user is authenticated and get token
      const token = await user.getIdToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch("/api/itr/decrypt-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid, // Send verified user ID
        },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load credentials");
      }

      const data = await response.json();
      setCredentials(data.credentials);
      setShowCredentials(true);
      
      toast({
        title: "Credentials Loaded",
        description: "Credentials have been decrypted and logged. Please use them securely.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Copied",
      description: `${field} has been copied to clipboard`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAISFileSelect = (file: File, type: "AIS" | "AIS_JSON" | "26AS") => {
    if (type === "AIS_JSON") {
      if (file.type !== "application/json") {
        toast({
          title: "Invalid File Type",
          description: "AIS JSON file must be a JSON file.",
          variant: "destructive",
        });
        return;
      }
      setSelectedAISJSONFile(file);
      return;
    }

    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload PDF or image files only.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    if (type === "AIS") {
      setSelectedAISFile(file);
    } else {
      setSelected26ASFile(file);
    }
  };

  const handleUploadAIS = async () => {
    if (!application || !user) return;
    if (!selectedAISFile && !selectedAISJSONFile && !selected26ASFile) {
      toast({
        title: "No File Selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    setAisUploading(true);
    setAisUploadProgress(0);

    try {
      const uploadPromises: Promise<void>[] = [];

      // Upload AIS PDF if selected
      if (selectedAISFile) {
        const uploadPromise = (async () => {
          const storagePath = ITR_STORAGE_PATHS.getAISPath(
            application.userId,
            application.id,
            "PDF"
          );
          const storageRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, selectedAISFile);

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setAisUploadProgress(progress);
              },
              reject,
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  await createITRDocument({
                    applicationId: application.id,
                    userId: application.userId,
                    type: "AIS_PDF",
                    financialYear: application.financialYear,
                    fileName: selectedAISFile.name,
                    fileUrl: downloadURL,
                    fileSize: selectedAISFile.size,
                    mimeType: selectedAISFile.type,
                    storagePath,
                    encrypted: false,
                    uploadedAt: new Date(),
                    uploadedBy: user.uid,
                  });
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        })();
        uploadPromises.push(uploadPromise);
      }

      // Upload AIS JSON if selected
      if (selectedAISJSONFile) {
        const uploadPromise = (async () => {
          const storagePath = ITR_STORAGE_PATHS.getAISPath(
            application.userId,
            application.id,
            "JSON"
          );
          const storageRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, selectedAISJSONFile);

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setAisUploadProgress(progress);
              },
              reject,
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  await createITRDocument({
                    applicationId: application.id,
                    userId: application.userId,
                    type: "AIS_JSON",
                    financialYear: application.financialYear,
                    fileName: selectedAISJSONFile.name,
                    fileUrl: downloadURL,
                    fileSize: selectedAISJSONFile.size,
                    mimeType: selectedAISJSONFile.type,
                    storagePath,
                    encrypted: false,
                    uploadedAt: new Date(),
                    uploadedBy: user.uid,
                  });
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        })();
        uploadPromises.push(uploadPromise);
      }

      // Upload 26AS if selected
      if (selected26ASFile) {
        const uploadPromise = (async () => {
          const storagePath = ITR_STORAGE_PATHS.get26ASPath(
            application.userId,
            application.id
          );
          const storageRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, selected26ASFile);

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setAisUploadProgress(progress);
              },
              reject,
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  await createITRDocument({
                    applicationId: application.id,
                    userId: application.userId,
                    type: "FORM_26AS",
                    financialYear: application.financialYear,
                    fileName: selected26ASFile.name,
                    fileUrl: downloadURL,
                    fileSize: selected26ASFile.size,
                    mimeType: selected26ASFile.name,
                    storagePath,
                    encrypted: false,
                    uploadedAt: new Date(),
                    uploadedBy: user.uid,
                  });
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        })();
        uploadPromises.push(uploadPromise);
      }

      await Promise.all(uploadPromises);

      // Update application status
      await updateITRApplicationStatus(application.id, "AIS_DOWNLOADED");

      // Auto-trigger draft generation after AIS/26AS upload
      try {
        const response = await fetch("/api/itr/generate-draft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.uid,
          },
          body: JSON.stringify({ applicationId: application.id }),
        });

        if (response.ok) {
          toast({
            title: "Draft Generation Started",
            description: "ITR draft is being generated automatically. Check the Draft tab in a few moments.",
          });
        } else {
          console.warn("Auto-draft generation failed, but documents uploaded successfully");
        }
      } catch (error) {
        console.error("Auto-draft generation error:", error);
        // Don't fail the upload if draft generation fails
      }

      toast({
        title: "Files Uploaded Successfully",
        description: "AIS/26AS files have been uploaded. Draft generation has been initiated.",
      });

      setSelectedAISFile(null);
      setSelectedAISJSONFile(null);
      setSelected26ASFile(null);
      setAisUploadProgress(0);
      await loadData();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAisUploading(false);
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

  const hasAIS = documents.some((doc) => doc.type === "AIS_PDF" || doc.type === "AIS_JSON");
  const has26AS = documents.some((doc) => doc.type === "FORM_26AS");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/professional/itr-applications">
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
              Application ID: {application.id.substring(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="ais">AIS/26AS</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          {application.status === 'USER_APPROVED' && (
            <TabsTrigger value="filing">Filing</TabsTrigger>
          )}
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
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(application.status)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
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
                      <p className="font-medium">{userInfo.email || "—"}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Loading client information...</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
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

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Income Tax Portal Credentials
              </CardTitle>
              <CardDescription>
                Decrypt and view credentials for downloading AIS/26AS. All access is logged.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showCredentials ? (
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-semibold mb-2">Credentials Not Loaded</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Click the button below to decrypt and view credentials. This action will be logged.
                  </p>
                  <Button onClick={handleLoadCredentials} disabled={loadingCredentials}>
                    {loadingCredentials ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Load Credentials
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div className="text-sm text-green-900">
                        <p className="font-semibold mb-1">Credentials Loaded</p>
                        <p>
                          Credentials have been decrypted. Please use them securely to access the Income Tax Portal.
                          This access has been logged for security purposes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Username</Label>
                      <div className="mt-1 flex items-center space-x-2">
                        <Input
                          value={credentials?.username || ""}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(credentials?.username || "", "Username")}
                        >
                          {copiedField === "Username" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Password</Label>
                      <div className="mt-1 flex items-center space-x-2">
                        <Input
                          type="password"
                          value={credentials?.password || ""}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(credentials?.password || "", "Password")}
                        >
                          {copiedField === "Password" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Security Reminder</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Do not share these credentials with anyone</li>
                          <li>Use them only for downloading AIS/26AS</li>
                          <li>All access is logged for audit purposes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AIS/26AS Tab */}
        <TabsContent value="ais" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AIS/26AS Management</CardTitle>
              <CardDescription>
                Upload AIS and 26AS documents after downloading from Income Tax Portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${hasAIS ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">AIS Document</p>
                      <p className="text-sm text-muted-foreground">
                        {hasAIS ? "Uploaded" : "Not uploaded"}
                      </p>
                    </div>
                    {hasAIS ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className={`p-4 rounded-lg border ${has26AS ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Form 26AS</p>
                      <p className="text-sm text-muted-foreground">
                        {has26AS ? "Uploaded" : "Not uploaded"}
                      </p>
                    </div>
                    {has26AS ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Section */}
              <div className="space-y-4">
                <div>
                  <Label>AIS PDF</Label>
                  <div className="mt-1">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAISFileSelect(file, "AIS");
                        }}
                      />
                      {selectedAISFile ? (
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">{selectedAISFile.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload AIS PDF</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <Label>AIS JSON (Optional, for faster processing)</Label>
                  <div className="mt-1">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="file"
                        className="hidden"
                        accept="application/json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAISFileSelect(file, "AIS_JSON");
                        }}
                      />
                      {selectedAISJSONFile ? (
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">{selectedAISJSONFile.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload AIS JSON</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <Label>Form 26AS PDF</Label>
                  <div className="mt-1">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAISFileSelect(file, "26AS");
                        }}
                      />
                      {selected26ASFile ? (
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">{selected26ASFile.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload Form 26AS PDF</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {aisUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading files...</span>
                      <span>{Math.round(aisUploadProgress)}%</span>
                    </div>
                    <Progress value={aisUploadProgress} />
                  </div>
                )}

                <Button
                  onClick={handleUploadAIS}
                  disabled={aisUploading || (!selectedAISFile && !selected26ASFile)}
                  className="w-full"
                >
                  {aisUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Files
                    </>
                  )}
                </Button>
              </div>

              {/* Uploaded Documents List */}
              {(hasAIS || has26AS) && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Uploaded Documents</h3>
                  {documents
                    .filter((doc) => doc.type === "AIS_PDF" || doc.type === "FORM_26AS")
                    .map((doc) => (
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

          {/* Draft Tab */}
        <TabsContent value="draft" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ITR Draft</CardTitle>
              <CardDescription>
                Generate and manage ITR draft for this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-semibold mb-2">Draft Management</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Generate ITR draft by processing uploaded documents, or edit existing draft
                </p>
                <Link href={`/professional/itr-applications/${applicationId}/draft`}>
                  <Button>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Open Draft Editor
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>
                All documents uploaded for this ITR application
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

        {/* Filing Tab */}
        {application.status === 'USER_APPROVED' && (
          <TabsContent value="filing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  ITR Filing Workflow
                </CardTitle>
                <CardDescription>
                  Complete the ITR filing process: Upload ITR file, file ITR-1, complete E-Verification, and upload documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Upload ITR File */}
                <div className="space-y-4 border-b pb-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Step 1: Upload ITR File</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload the ITR XML/JSON file that will be filed with the Income Tax Portal
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>ITR File (XML/JSON)</Label>
                    <Input
                      type="file"
                      accept=".xml,.json,.XML,.JSON"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setItrFile(file);
                        }
                      }}
                    />
                    {itrFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {itrFile.name} ({(itrFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={async () => {
                      if (!application || !user || !itrFile) {
                        toast({
                          title: "No File Selected",
                          description: "Please select an ITR file to upload.",
                          variant: "destructive",
                        });
                        return;
                      }

                      setFilingUploading(true);
                      setFilingProgress(0);

                      try {
                        const fileName = `itr-${application.financialYear}-${Date.now()}.${itrFile.name.split('.').pop()}`;
                        const storagePath = `itr/${application.userId}/${application.id}/filing/${fileName}`;
                        const storageRef = ref(storage, storagePath);
                        const uploadTask = uploadBytesResumable(storageRef, itrFile);

                        await new Promise<void>((resolve, reject) => {
                          uploadTask.on(
                            "state_changed",
                            (snapshot) => {
                              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                              setFilingProgress(progress);
                            },
                            reject,
                            async () => {
                              try {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                
                                // Save ITR file as a document
                                await createITRDocument({
                                  applicationId: application.id,
                                  userId: application.userId,
                                  type: "ITR_DRAFT",
                                  financialYear: application.financialYear,
                                  fileName: itrFile.name,
                                  fileUrl: downloadURL,
                                  fileSize: itrFile.size,
                                  mimeType: itrFile.type || (itrFile.name.endsWith('.xml') ? 'application/xml' : 'application/json'),
                                  storagePath,
                                  encrypted: false,
                                  uploadedAt: new Date(),
                                  uploadedBy: user.uid,
                                });
                                
                                // Update status to FILING_IN_PROGRESS
                                await updateITRApplicationStatus(application.id, 'FILING_IN_PROGRESS' as ITRStatus);

                                // Send notification (Phase 6) - via API route
                                try {
                                  await fetch('/api/itr/send-notification', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId: application.userId,
                                      applicationId: application.id,
                                      type: 'FILING_STARTED',
                                      financialYear: application.financialYear,
                                    }),
                                  });
                                } catch (error) {
                                  console.error('Failed to send notification:', error);
                                }

                                toast({
                                  title: "ITR File Uploaded",
                                  description: "ITR file has been uploaded. Proceed with filing on the Income Tax Portal.",
                                });

                                setItrFile(null);
                                await loadData();
                                resolve();
                              } catch (error) {
                                reject(error);
                              }
                            }
                          );
                        });
                      } catch (error: any) {
                        console.error("Upload error:", error);
                        toast({
                          title: "Upload Failed",
                          description: error.message || "Failed to upload ITR file. Please try again.",
                          variant: "destructive",
                        });
                      } finally {
                        setFilingUploading(false);
                        setFilingProgress(0);
                      }
                    }}
                    disabled={filingUploading || !itrFile}
                  >
                    {filingUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading... {Math.round(filingProgress)}%
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload ITR File
                      </>
                    )}
                  </Button>
                </div>

                {/* Step 2: Mark as Filed */}
                {application.status === 'FILING_IN_PROGRESS' && (
                  <div className="space-y-4 border-b pb-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Step 2: File ITR</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        After filing the ITR on the Income Tax Portal, mark it as filed here
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Acknowledgement Number</Label>
                      <Input
                        placeholder="Enter ITR filing acknowledgement number"
                        value={acknowledgementNumber}
                        onChange={(e) => setAcknowledgementNumber(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!application || !user) return;

                        try {
                          await updateITRFilingInfo(
                            application.id,
                            {
                              acknowledgementNumber: acknowledgementNumber || undefined,
                              filedBy: user.uid,
                            },
                            'FILED' as ITRStatus
                          );

                          toast({
                            title: "ITR Filed",
                            description: "Application status has been updated to FILED.",
                          });

                          setAcknowledgementNumber("");
                          await loadData();
                        } catch (error: any) {
                          toast({
                            title: "Update Failed",
                            description: error.message || "Failed to update status. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!acknowledgementNumber.trim()}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as Filed
                    </Button>
                  </div>
                )}

                {/* Step 3: Upload ITR-V and E-Verify */}
                {application.status === 'FILED' && (
                  <div className="space-y-4 border-b pb-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Step 3: E-Verification</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload ITR-V after completing E-Verification (via Aadhaar OTP or Net Banking)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>ITR-V (Verification Document)</Label>
                      <Input
                        type="file"
                        accept=".pdf,.PDF"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setItrVFile(file);
                          }
                        }}
                      />
                      {itrVFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {itrVFile.name} ({(itrVFile.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={async () => {
                        if (!application || !user || !itrVFile) {
                          toast({
                            title: "No File Selected",
                            description: "Please select ITR-V file to upload.",
                            variant: "destructive",
                          });
                          return;
                        }

                        setFilingUploading(true);
                        setFilingProgress(0);

                        try {
                          const storagePath = ITR_STORAGE_PATHS.getITRVPath(
                            application.userId,
                            application.id
                          );
                          const storageRef = ref(storage, storagePath);
                          const uploadTask = uploadBytesResumable(storageRef, itrVFile);

                          await new Promise<void>((resolve, reject) => {
                            uploadTask.on(
                              "state_changed",
                              (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                setFilingProgress(progress);
                              },
                              reject,
                              async () => {
                                try {
                                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                  
                                  await createITRDocument({
                                    applicationId: application.id,
                                    userId: application.userId,
                                    type: "ITR_V",
                                    financialYear: application.financialYear,
                                    fileName: itrVFile.name,
                                    fileUrl: downloadURL,
                                    fileSize: itrVFile.size,
                                    mimeType: itrVFile.type,
                                    storagePath,
                                    encrypted: false,
                                    uploadedAt: new Date(),
                                    uploadedBy: user.uid,
                                  });

                                  await updateITRFilingInfo(
                                    application.id,
                                    {
                                      itrVUrl: downloadURL,
                                    },
                                    'E_VERIFIED' as ITRStatus
                                  );

                                  toast({
                                    title: "ITR-V Uploaded",
                                    description: "E-Verification completed. Application status updated to E-VERIFIED.",
                                  });

                                  setItrVFile(null);
                                  await loadData();
                                  resolve();
                                } catch (error) {
                                  reject(error);
                                }
                              }
                            );
                          });
                        } catch (error: any) {
                          console.error("Upload error:", error);
                          toast({
                            title: "Upload Failed",
                            description: error.message || "Failed to upload ITR-V. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setFilingUploading(false);
                          setFilingProgress(0);
                        }
                      }}
                      disabled={filingUploading || !itrVFile}
                    >
                      {filingUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading... {Math.round(filingProgress)}%
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload ITR-V & Mark E-Verified
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Step 4: Upload Acknowledgement and Complete */}
                {application.status === 'E_VERIFIED' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Step 4: Complete Filing</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload the final filing acknowledgement document to complete the process
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Filing Acknowledgement (PDF)</Label>
                      <Input
                        type="file"
                        accept=".pdf,.PDF"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAcknowledgementFile(file);
                          }
                        }}
                      />
                      {acknowledgementFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {acknowledgementFile.name} ({(acknowledgementFile.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={async () => {
                        if (!application || !user || !acknowledgementFile) {
                          toast({
                            title: "No File Selected",
                            description: "Please select acknowledgement file to upload.",
                            variant: "destructive",
                          });
                          return;
                        }

                        setFilingUploading(true);
                        setFilingProgress(0);

                        try {
                          const storagePath = ITR_STORAGE_PATHS.getAcknowledgementPath(
                            application.userId,
                            application.id
                          );
                          const storageRef = ref(storage, storagePath);
                          const uploadTask = uploadBytesResumable(storageRef, acknowledgementFile);

                          await new Promise<void>((resolve, reject) => {
                            uploadTask.on(
                              "state_changed",
                              (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                setFilingProgress(progress);
                              },
                              reject,
                              async () => {
                                try {
                                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                  
                                  await createITRDocument({
                                    applicationId: application.id,
                                    userId: application.userId,
                                    type: "FILING_ACKNOWLEDGEMENT",
                                    financialYear: application.financialYear,
                                    fileName: acknowledgementFile.name,
                                    fileUrl: downloadURL,
                                    fileSize: acknowledgementFile.size,
                                    mimeType: acknowledgementFile.type,
                                    storagePath,
                                    encrypted: false,
                                    uploadedAt: new Date(),
                                    uploadedBy: user.uid,
                                  });

                                  await updateITRFilingInfo(
                                    application.id,
                                    {
                                      acknowledgementUrl: downloadURL,
                                      acknowledgementNumber: application.filingInfo?.acknowledgementNumber || undefined,
                                      filedBy: application.filingInfo?.filedBy || user.uid,
                                    },
                                    'COMPLETED' as ITRStatus
                                  );

                                  // Auto-organize all documents to vault (Phase 7)
                                  try {
                                    const { syncAllITRDocumentsToVault } = await import('@/lib/itr/vault-integration');
                                    await syncAllITRDocumentsToVault(
                                      application.id,
                                      application.userId,
                                      application.financialYear
                                    );
                                  } catch (error) {
                                    console.error('Failed to organize documents to vault:', error);
                                    // Don't fail the process if vault organization fails
                                  }

                                  // Send notification (Phase 6) - via API route
                                  try {
                                    await fetch('/api/itr/send-notification', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        userId: application.userId,
                                        applicationId: application.id,
                                        type: 'FILING_COMPLETED',
                                        financialYear: application.financialYear,
                                        acknowledgementNumber: application.filingInfo?.acknowledgementNumber,
                                      }),
                                    });
                                  } catch (error) {
                                    console.error('Failed to send notification:', error);
                                  }

                                  toast({
                                    title: "Filing Completed",
                                    description: "ITR filing process has been completed successfully!",
                                  });

                                  setAcknowledgementFile(null);
                                  await loadData();
                                  resolve();
                                } catch (error) {
                                  reject(error);
                                }
                              }
                            );
                          });
                        } catch (error: any) {
                          console.error("Upload error:", error);
                          toast({
                            title: "Upload Failed",
                            description: error.message || "Failed to upload acknowledgement. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setFilingUploading(false);
                          setFilingProgress(0);
                        }
                      }}
                      disabled={filingUploading || !acknowledgementFile}
                    >
                      {filingUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading... {Math.round(filingProgress)}%
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Complete Filing
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Filing Summary */}
                {application.filingInfo && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle>Filing Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {application.filingInfo.acknowledgementNumber && (
                        <div>
                          <p className="text-sm text-muted-foreground">Acknowledgement Number</p>
                          <p className="font-mono font-semibold">{application.filingInfo.acknowledgementNumber}</p>
                        </div>
                      )}
                      {application.filingInfo.filedAt && (
                        <div>
                          <p className="text-sm text-muted-foreground">Filed At</p>
                          <p className="font-medium">
                            {new Date(application.filedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {application.eVerifiedAt && (
                        <div>
                          <p className="text-sm text-muted-foreground">E-Verified At</p>
                          <p className="font-medium">
                            {new Date(application.eVerifiedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {application.completedAt && (
                        <div>
                          <p className="text-sm text-muted-foreground">Completed At</p>
                          <p className="font-medium">
                            {new Date(application.completedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

