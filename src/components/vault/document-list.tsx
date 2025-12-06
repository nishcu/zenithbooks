"use client";

import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase";
import { doc, deleteDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, MoreVertical, Trash2, Edit, Eye, History, Upload } from "lucide-react";
import { DocumentVersionHistory } from "./document-version-history";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DocumentEditDialog } from "./document-edit-dialog";
import { DocumentVersionDialog } from "./document-version-dialog";

interface Document {
  id: string;
  fileName: string;
  category: string;
  currentVersion: number;
  fileSize: number;
  uploadedAt: any;
  lastUpdated: any;
  versions?: {
    [version: number]: {
      fileUrl: string;
      fileSize: number;
      fileType: string;
      uploadedAt: any;
      versionNote?: string;
    };
  };
}

interface DocumentListProps {
  documents: Document[];
  onRefresh?: () => void;
}

export function DocumentList({ documents, onRefresh }: DocumentListProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [versioningDocument, setVersioningDocument] = useState<Document | null>(null);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [historyDocument, setHistoryDocument] = useState<Document | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const handleDownload = async (document: Document) => {
    try {
      const latestVersion = document.versions?.[document.currentVersion];
      if (!latestVersion?.fileUrl) {
        console.error("Document URL not found for:", document.fileName);
        alert("Error: Document URL not found. Please try again.");
        return;
      }

      console.log("Starting download for:", document.fileName);

      // Properly download the file with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(latestVersion.fileUrl, {
        signal: controller.signal,
        headers: {
          'Accept': '*/*',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = document.fileName;
      link.style.display = 'none';

      // Ensure body exists
      if (!document.body) {
        throw new Error("Document body not available");
      }

      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Cleanup with delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log("Download completed for:", document.fileName);
      console.log(`Download started for: ${document.fileName}`);

    } catch (error: any) {
      console.error("Download error:", error);

      let errorMessage = "Failed to download document. Please try again.";
      if (error.name === 'AbortError') {
        errorMessage = "Download timed out. Please try again.";
      } else if (error.message) {
        errorMessage = `Download failed: ${error.message}`;
      }

      alert(`Download Error: ${errorMessage}`);
    }
  };

  const handleView = (document: Document) => {
    const latestVersion = document.versions?.[document.currentVersion];
    if (!latestVersion?.fileUrl) {
      console.error("Document URL not found for:", document.fileName);
      alert("Error: Document URL not found. Please try again.");
      return;
    }

    window.open(latestVersion.fileUrl, '_blank');
  };

  const handleDelete = async (document: Document) => {
    if (!user) {
      console.error("User not authenticated");
      alert("Error: User not authenticated. Please log in again.");
      return;
    }

    try {
      // Delete all versions from Storage
      if (document.versions) {
        const deletePromises = Object.entries(document.versions).map(async ([version, versionData]) => {
          try {
            // Extract storage path from fileUrl
            // File URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
            const url = new URL(versionData.fileUrl);
            const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
            if (pathMatch) {
              const storagePath = decodeURIComponent(pathMatch[1]);
              const fileRef = ref(storage, storagePath);
              await deleteObject(fileRef);
            }
          } catch (error) {
            console.error(`Error deleting version ${version} file:`, error);
            // Continue even if file deletion fails
          }
        });
        await Promise.all(deletePromises);
      }

      // Calculate total file size to update storage usage
      const totalSize = document.versions
        ? Object.values(document.versions).reduce((sum, v) => sum + (v.fileSize || 0), 0)
        : document.fileSize || 0;

      // Delete document from Firestore
      const documentRef = doc(db, "vaultDocuments", document.id);
      await deleteDoc(documentRef);

      // Update storage settings
      const settingsRef = doc(db, "vaultSettings", user.uid);
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists()) {
        const currentStorageUsed = settingsDoc.data().currentStorageUsed || 0;
        await updateDoc(settingsRef, {
          currentStorageUsed: Math.max(0, currentStorageUsed - totalSize),
          lastUpdated: serverTimestamp(),
        });
      }

      // Defer success toast to next tick to avoid React context issues
      console.log(`Document deleted successfully: ${document.fileName}`);
      alert(`Success: "${document.fileName}" has been deleted successfully.`);

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Error: Failed to delete document. Please try again.");
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setIsEditDialogOpen(true);
  };

  const handleUploadVersion = (document: Document) => {
    setVersioningDocument(document);
    setIsVersionDialogOpen(true);
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No documents found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => {
            const uploadedDate = document.uploadedAt?.toDate 
              ? document.uploadedAt.toDate() 
              : new Date(document.uploadedAt);
            
            return (
              <TableRow key={document.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {document.fileName}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{document.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{document.currentVersion}</Badge>
                    {document.versions && Object.keys(document.versions).length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          setHistoryDocument(document);
                          setIsHistoryDialogOpen(true);
                        }}
                        title="View version history"
                      >
                        <History className="h-3 w-3 mr-1" />
                        History
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatBytes(document.fileSize)}</TableCell>
                <TableCell>
                  {format(uploadedDate, "dd MMM, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(document)}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(document)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUploadVersion(document)}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload New Version
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(document)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Metadata
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{document.fileName}"? This will delete all versions and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(document)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <DocumentEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        document={editingDocument}
        onSave={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Version Upload Dialog */}
      <DocumentVersionDialog
        open={isVersionDialogOpen}
        onOpenChange={setIsVersionDialogOpen}
        document={versioningDocument}
        onUploadSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Version History Dialog */}
      <DocumentVersionHistory
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        document={historyDocument}
      />
    </Card>
  );
}

