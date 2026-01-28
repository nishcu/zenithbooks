"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Key, Eye, EyeOff, Trash2, Clock, Copy, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ShareCodeDialog } from "@/components/vault/share-code-dialog";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { ShareCodeAccessLogs } from "@/components/vault/share-code-access-logs";
import { OnboardingHint } from "@/components/vault/onboarding-hint";
import { VaultErrorBoundary } from "@/components/vault/error-boundary";
import { TooltipHelp } from "@/components/vault/tooltip-help";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ShareCode {
  id: string;
  userId: string;
  codeName: string;
  codeHash: string; // Hashed version, never show plain text
  categories: string[]; // Array of category IDs
  createdAt: any;
  expiresAt: any;
  isActive: boolean;
  description?: string;
  accessCount?: number;
}

export default function ShareCodeManagementPage() {
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  const [shareCodes, setShareCodes] = useState<ShareCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<ShareCode | null>(null);
  const [selectedCodeForLogs, setSelectedCodeForLogs] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());

  // Fetch share codes
  useEffect(() => {
    if (!user) return;

    const codesRef = collection(db, "vaultShareCodes");
    const q = query(codesRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const codes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ShareCode[];
        setShareCodes(codes);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching share codes:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load share codes. Please try again.",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

  const handleDelete = async (code: ShareCode) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "vaultShareCodes", code.id));

      // Best-effort: revoke public access immediately
      if (code.codeHash) {
        try {
          const docsCol = collection(db, "vaultShareCodeIndex", code.codeHash, "documents");
          const snap = await getDocs(docsCol);
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          batch.delete(doc(db, "vaultShareCodeIndex", code.codeHash));
          await batch.commit();
        } catch (e) {
          console.warn("Failed to revoke public share index:", e);
        }
      }

      toast({
        title: "Share Code Deleted",
        description: "The share code has been deleted and access is revoked.",
      });
    } catch (error) {
      console.error("Error deleting share code:", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete share code. Please try again.",
      });
    }
  };

  const handleCopyCode = (codeId: string, codeHash: string) => {
    // Note: In a real implementation, we'd need to store the plain text code
    // temporarily during creation and never show it again. For now, we'll
    // show a message that codes should be copied at creation time.
    toast({
      title: "Code Copied",
      description: "Share codes should be copied immediately after creation for security.",
    });
  };

  const isExpired = (expiresAt: any) => {
    if (!expiresAt) return false;
    let expiryDate: Date;
    if (expiresAt?.toDate) {
      expiryDate = expiresAt.toDate();
    } else if (expiresAt instanceof Date) {
      expiryDate = expiresAt;
    } else if (typeof expiresAt === 'string') {
      expiryDate = new Date(expiresAt);
    } else {
      expiryDate = new Date(expiresAt.seconds * 1000); // Firestore Timestamp
    }
    return expiryDate < new Date();
  };

  const getExpiryStatus = (code: ShareCode) => {
    if (!code.expiresAt) return { status: "no-expiry", text: "No expiry", color: "default" };
    
    let expiryDate: Date;
    if (code.expiresAt?.toDate) {
      expiryDate = code.expiresAt.toDate();
    } else if (code.expiresAt instanceof Date) {
      expiryDate = code.expiresAt;
    } else if (typeof code.expiresAt === 'string') {
      expiryDate = new Date(code.expiresAt);
    } else if (code.expiresAt.seconds) {
      expiryDate = new Date(code.expiresAt.seconds * 1000);
    } else {
      expiryDate = new Date(code.expiresAt);
    }
    
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return { status: "expired", text: "Expired", color: "destructive" };
    } else if (diffDays <= 1) {
      return { status: "expiring-soon", text: `Expires in ${diffDays} day`, color: "destructive" };
    } else {
      return { status: "active", text: `Expires in ${diffDays} days`, color: "default" };
    }
  };

  if (loadingUser || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Key className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Please log in to manage share codes.</p>
      </div>
    );
  }

  return (
    <VaultErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Share Code Management</h1>
              <TooltipHelp content="Share codes allow third parties to access specific document categories. Each code expires after 5 days for security." />
            </div>
            <p className="text-muted-foreground mt-1">
              Create and manage share codes to allow third parties to access your documents
            </p>
          </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/vault/logs">
              <FileText className="mr-2 h-4 w-4" />
              View All Logs
            </Link>
          </Button>
          <Button onClick={() => {
            setEditingCode(null);
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Share Code
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            How Share Codes Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Create share codes to give third parties (like bankers, auditors) access to specific document categories</li>
            <li>Each code expires automatically after 5 days</li>
            <li>You can create multiple codes for different purposes (e.g., Housing Loan, Business Loan)</li>
            <li>All access is logged for your security</li>
            <li>You'll receive notifications when documents are accessed</li>
            <li>Share codes should be copied immediately after creation - they won't be shown again for security</li>
          </ul>
        </CardContent>
      </Card>

        {/* Onboarding Hint */}
        {shareCodes.length === 0 && (
          <OnboardingHint type="share" />
        )}

        {/* Share Codes List */}
        {shareCodes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                No share codes yet. Create one to start sharing documents securely.
              </p>
              <Button onClick={() => {
                setEditingCode(null);
                setIsDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Share Code
              </Button>
            </CardContent>
          </Card>
        ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shareCodes.map((code) => {
            const expiryStatus = getExpiryStatus(code);
            const expired = isExpired(code.expiresAt);

            return (
              <Card key={code.id} className={expired ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{code.codeName}</CardTitle>
                      {code.description && (
                        <CardDescription className="mt-1">{code.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={expiryStatus.color === "destructive" ? "destructive" : "default"}>
                      {expiryStatus.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Categories */}
                  <div>
                    <p className="text-sm font-medium mb-2">Shared Categories:</p>
                    <div className="flex flex-wrap gap-1">
                      {code.categories.map((cat) => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Created: {format(code.createdAt?.toDate ? code.createdAt.toDate() : new Date(code.createdAt), "dd MMM, yyyy")}
                      </span>
                    </div>
                    {code.expiresAt && (() => {
                      let expiryDate: Date;
                      if (code.expiresAt?.toDate) {
                        expiryDate = code.expiresAt.toDate();
                      } else if (code.expiresAt instanceof Date) {
                        expiryDate = code.expiresAt;
                      } else if (typeof code.expiresAt === 'string') {
                        expiryDate = new Date(code.expiresAt);
                      } else if (code.expiresAt.seconds) {
                        expiryDate = new Date(code.expiresAt.seconds * 1000);
                      } else {
                        expiryDate = new Date(code.expiresAt);
                      }
                      return (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            Expires: {format(expiryDate, "dd MMM, yyyy HH:mm")}
                          </span>
                        </div>
                      );
                    })()}
                    {code.accessCount !== undefined && (
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>Accessed {code.accessCount} times</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedCodeForLogs(code.id)}
                      title="View access logs for this code"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Access Logs
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Share Code?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the share code "{code.codeName}" and immediately revoke access for all third parties using it. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(code)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Share Code Dialog */}
      <ShareCodeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingCode={editingCode}
        onSuccess={() => {
          setIsDialogOpen(false);
          setEditingCode(null);
        }}
      />

      {/* Access Logs Dialog */}
      {selectedCodeForLogs && (
        <ShareCodeAccessLogs
          shareCodeId={selectedCodeForLogs}
          open={!!selectedCodeForLogs}
          onOpenChange={(open) => !open && setSelectedCodeForLogs(null)}
        />
      )}
      </div>
    </VaultErrorBoundary>
  );
}

