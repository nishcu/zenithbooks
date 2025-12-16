"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Loader2, AlertCircle, Download, FileText, Clock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatBytes } from "@/lib/utils";

interface ShareCodeInfo {
  shareCodeId: string;
  codeName: string;
  categories: string[];
  expiresAt: string;
  userId: string;
}

interface SharedDocument {
  id: string;
  fileName: string;
  category: string;
  fileSize: number;
  uploadedAt: any;
  fileUrl: string;
  currentVersion: number;
}

export default function VaultAccessPage() {
  const { toast } = useToast();
  const [shareCode, setShareCode] = useState("");
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [shareCodeInfo, setShareCodeInfo] = useState<ShareCodeInfo | null>(null);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!shareCode.trim()) {
      setError("Please enter a share code.");
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const response = await fetch("/api/vault/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: shareCode.trim() }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Error parsing response:", jsonError);
        setError("Invalid response from server. Please try again.");
        setValidated(false);
        return;
      }

      if (!response.ok) {
        // Check for code collision (409 Conflict)
        if (response.status === 409) {
          setError(data?.error || "This share code exists for multiple users. Please contact the document owner to recreate the code with a new code.");
          setValidated(false);
          return;
        }
        // Check if it's a route 404 (route doesn't exist) vs application 404 (invalid code)
        if (response.status === 404) {
          // Try to parse error message to distinguish route 404 from invalid code
          const errorMessage = data?.error || "";
          if (errorMessage.includes("Invalid or expired") || errorMessage.includes("Share code")) {
            // This is an application-level 404 (invalid code)
            setError("Share code not found. Please check the code and try again.");
          } else {
            // This might be a route 404 (route not deployed)
            setError("Service temporarily unavailable. Please contact support or try again later.");
            console.error("Route 404 error - API endpoint may not be deployed:", response);
          }
        } else if (response.status === 429) {
          // Rate limited - show friendly message with lockout time
          const lockoutUntil = data.lockoutUntil ? new Date(data.lockoutUntil) : null;
          if (lockoutUntil) {
            const minutesRemaining = Math.ceil((lockoutUntil.getTime() - Date.now()) / (1000 * 60));
            setError(`Too many failed attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`);
          } else {
            setError("Too many failed attempts. Please try again in 15 minutes.");
          }
        } else {
          setError(data.error || "Invalid share code.");
        }
        setValidated(false);
        return;
      }

      setShareCodeInfo(data);
      setValidated(true);
      await loadDocuments(data);
    } catch (error) {
      console.error("Error validating code:", error);
      setError("Failed to validate share code. Please try again.");
      setValidated(false);
    } finally {
      setValidating(false);
    }
  };

  const loadDocuments = async (codeInfo: ShareCodeInfo) => {
    setLoading(true);
    try {
      // Fetch documents from the user's vault that match shared categories
      const categoriesParam = encodeURIComponent(codeInfo.categories.join(","));
      const response = await fetch(`/api/vault/shared-documents?userId=${codeInfo.userId}&categories=${categoriesParam}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Documents not found. The share code may have been revoked.");
        } else {
          const data = await response.json().catch(() => ({}));
          setError(data.error || "Failed to load documents.");
        }
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setDocuments(data.documents || []);
      } else {
        setError(data.error || "Failed to load documents.");
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      setError("Failed to load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document: SharedDocument) => {
    try {
      // Log the access (don't wait for it to complete)
      fetch("/api/vault/log-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareCodeId: shareCodeInfo?.shareCodeId,
          documentId: document.id,
          action: "download",
        }),
      }).catch(err => console.error("Failed to log access:", err));

      // Detect file type from file name extension
      const getFileType = (fileName: string): string => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'txt': 'text/plain',
          'zip': 'application/zip',
        };
        return mimeTypes[extension || ''] || 'application/octet-stream';
      };

      // Use server-side proxy for download to handle CORS and authentication
      const fileType = getFileType(document.fileName);
      const downloadUrl = `/api/vault/download?fileUrl=${encodeURIComponent(document.fileUrl)}&fileName=${encodeURIComponent(document.fileName)}&fileType=${encodeURIComponent(fileType)}`;
      
      // Create a temporary link and trigger download
      // Use window.document to avoid shadowing the parameter name 'document'
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = document.fileName;
      link.target = "_blank"; // Open in new tab as fallback
      window.document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `${document.fileName} download has started.`,
      });
    } catch (error) {
      console.error("Error downloading:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download document. Please try again.",
      });
    }
  };

  const handleView = async (document: SharedDocument) => {
    try {
      // Log the access
      await fetch("/api/vault/log-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareCodeId: shareCodeInfo?.shareCodeId,
          documentId: document.id,
          action: "view",
        }),
      });

      // Use server-side proxy for proper viewing (especially for PDFs)
      const viewUrl = `/api/vault/view?fileUrl=${encodeURIComponent(document.fileUrl)}&fileName=${encodeURIComponent(document.fileName)}&fileType=${encodeURIComponent("application/pdf")}`;

      // Open in new tab/window for viewing
      window.open(viewUrl, "_blank");

      console.log("View initiated for:", document.fileName);
    } catch (error) {
      console.error("Error viewing:", error);
      toast({
        variant: "destructive",
        title: "View Failed",
        description: "Failed to view document. Please try again.",
      });
    }
  };

  const getExpiryInfo = () => {
    if (!shareCodeInfo) return null;
    const expiryDate = new Date(shareCodeInfo.expiresAt);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return { text: "Expired", color: "destructive", urgent: true };
    } else if (diffDays <= 1) {
      return { 
        text: `Expires in ${formatDistanceToNow(expiryDate, { addSuffix: true })}`, 
        color: "destructive",
        urgent: true 
      };
    } else {
      return { 
        text: `Expires in ${diffDays} days`, 
        color: "default",
        urgent: false 
      };
    }
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, SharedDocument[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Document Vault Access</h1>
          <p className="text-muted-foreground">
            Enter your share code to access shared documents
          </p>
        </header>

        {/* Code Entry (if not validated) */}
        {!validated && (
          <Card className="max-w-md mx-auto" role="main" aria-label="Share code entry form">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" aria-hidden="true" />
                Enter Share Code
              </CardTitle>
              <CardDescription>
                Enter the share code provided by the document owner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="shareCode">Share Code</Label>
                <Input
                  id="shareCode"
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                  placeholder="Enter share code"
                  className="font-mono text-lg"
                  aria-label="Enter share code"
                  aria-describedby="shareCode-help"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleValidate();
                    }
                  }}
                />
                <p id="shareCode-help" className="text-xs text-muted-foreground">
                  The share code is case-sensitive and provided by the document owner.
                </p>
              </div>
              <Button 
                onClick={handleValidate} 
                disabled={validating || !shareCode.trim()}
                className="w-full"
                aria-label={validating ? "Validating share code" : "Access documents"}
              >
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" aria-hidden="true" />
                    Access Documents
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Documents View (if validated) */}
        {validated && shareCodeInfo && (
          <div className="space-y-6">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{shareCodeInfo.codeName}</CardTitle>
                    <CardDescription className="mt-1">
                      Shared documents access
                    </CardDescription>
                  </div>
                  {(() => {
                    const expiry = getExpiryInfo();
                    return expiry && (
                      <Badge variant={expiry.color as any}>
                        <Clock className="mr-1 h-3 w-3" />
                        {expiry.text}
                      </Badge>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium">Shared Categories:</span>
                  {shareCodeInfo.categories.map((cat) => (
                    <Badge key={cat} variant="outline">
                      {cat}
                    </Badge>
                  ))}
                </div>
                {getExpiryInfo()?.urgent && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This access will expire soon. Please download any needed documents.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Documents by Category */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : documents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No documents available in the shared categories.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedDocuments).map(([category, docs]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle>{category}</CardTitle>
                      <CardDescription>{docs.length} document{docs.length !== 1 ? "s" : ""}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="font-medium">{doc.fileName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatBytes(doc.fileSize)} • v{doc.currentVersion}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleView(doc)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

