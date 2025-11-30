"use client";

import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VAULT_FILE_LIMITS, VAULT_STORAGE_PATHS, VaultCategory } from "@/lib/vault-constants";
import { formatBytes } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Document {
  id: string;
  fileName: string;
  category: VaultCategory;
  currentVersion: number;
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

interface DocumentVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onUploadSuccess: () => void;
}

export function DocumentVersionDialog({
  open,
  onOpenChange,
  document,
  onUploadSuccess,
}: DocumentVersionDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionNote, setVersionNote] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > VAULT_FILE_LIMITS.MAX_FILE_SIZE) {
      setError(`File size exceeds ${formatBytes(VAULT_FILE_LIMITS.MAX_FILE_SIZE)}. Please select a smaller file.`);
      setSelectedFile(null);
      return;
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!VAULT_FILE_LIMITS.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      setError(`File type not supported. Allowed types: ${VAULT_FILE_LIMITS.ALLOWED_EXTENSIONS.join(', ')}`);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const checkStorageLimit = async (fileSize: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const settingsRef = doc(db, "vaultSettings", user.uid);
      const settingsDoc = await getDoc(settingsRef);
      
      const currentStorageUsed = settingsDoc.exists() 
        ? settingsDoc.data().currentStorageUsed || 0 
        : 0;
      
      const totalAfterUpload = currentStorageUsed + fileSize;
      
      if (totalAfterUpload > VAULT_FILE_LIMITS.MAX_STORAGE_PER_USER) {
        setError(`Upload would exceed storage limit of ${formatBytes(VAULT_FILE_LIMITS.MAX_STORAGE_PER_USER)}. Please free up space.`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking storage:", error);
      return false;
    }
  };

  const handleUpload = async () => {
    if (!user || !document || !selectedFile) {
      setError("Please select a file.");
      return;
    }

    // Check storage limit
    const canUpload = await checkStorageLimit(selectedFile.size);
    if (!canUpload) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Get current document data
      const documentRef = doc(db, "vaultDocuments", document.id);
      const documentDoc = await getDoc(documentRef);
      
      if (!documentDoc.exists()) {
        throw new Error("Document not found");
      }

      const currentData = documentDoc.data();
      const newVersion = (currentData.currentVersion || 1) + 1;

      // Prepare storage path for new version
      const storagePath = VAULT_STORAGE_PATHS.getCategoryPath(
        user.uid,
        document.category,
        document.id,
        newVersion
      );
      const fileName = `${selectedFile.name.replace(/\s+/g, '-')}`;
      const fullStoragePath = `${storagePath}/${fileName}`;

      // Upload file to Firebase Storage
      const storageRef = ref(storage, fullStoragePath);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      // Monitor upload progress
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          setError("Upload failed. Please try again.");
          setIsUploading(false);
        },
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Get file type
            const fileType = selectedFile.type || 'application/octet-stream';

            // Update document with new version
            const existingVersions = currentData.versions || {};
            const updatedVersions = {
              ...existingVersions,
              [newVersion]: {
                fileUrl: downloadURL,
                fileSize: selectedFile.size,
                fileType,
                uploadedAt: serverTimestamp(),
                versionNote: versionNote.trim() || null,
              },
            };

            await updateDoc(documentRef, {
              currentVersion: newVersion,
              versions: updatedVersions,
              lastUpdated: serverTimestamp(),
            });

            // Update storage settings
            const settingsRef = doc(db, "vaultSettings", user.uid);
            const settingsDoc = await getDoc(settingsRef);
            const currentStorageUsed = settingsDoc.exists() 
              ? settingsDoc.data().currentStorageUsed || 0 
              : 0;

            if (settingsDoc.exists()) {
              await updateDoc(settingsRef, {
                currentStorageUsed: currentStorageUsed + selectedFile.size,
                lastUpdated: serverTimestamp(),
              });
            } else {
              await updateDoc(settingsRef, {
                userId: user.uid,
                totalStorageLimit: VAULT_FILE_LIMITS.MAX_STORAGE_PER_USER,
                currentStorageUsed: selectedFile.size,
                maxFileSize: VAULT_FILE_LIMITS.MAX_FILE_SIZE,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
              });
            }

            // Success
            setUploadProgress(100);
            toast({
              title: "New Version Uploaded",
              description: `Version ${newVersion} has been uploaded successfully.`,
            });

            // Reset form
            setSelectedFile(null);
            setVersionNote("");
            setUploadProgress(0);
            
            setIsUploading(false);
            onUploadSuccess();
            onOpenChange(false);
          } catch (error) {
            console.error("Error saving version:", error);
            setError("Failed to save version. Please try again.");
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.error("Upload error:", error);
      setError("Upload failed. Please try again.");
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setVersionNote("");
      setError(null);
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Upload a new version of "{document.fileName}". Current version: v{document.currentVersion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file">Select New Version File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                disabled={isUploading}
                accept={VAULT_FILE_LIMITS.ALLOWED_EXTENSIONS.join(',')}
                className="cursor-pointer"
              />
              {selectedFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                <p>File: {selectedFile.name}</p>
                <p>Size: {formatBytes(selectedFile.size)}</p>
                <p>New Version: v{document.currentVersion + 1}</p>
              </div>
            )}
          </div>

          {/* Version Note */}
          <div className="space-y-2">
            <Label htmlFor="versionNote">Version Note (Optional)</Label>
            <Textarea
              id="versionNote"
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              placeholder="e.g., Revised version, Updated with new information..."
              disabled={isUploading}
              rows={3}
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading version {document.currentVersion + 1}...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Version {document.currentVersion + 1}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

