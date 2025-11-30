"use client";

import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase";
import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VAULT_CATEGORIES_LIST, VAULT_FILE_LIMITS, VAULT_STORAGE_PATHS, VaultCategory } from "@/lib/vault-constants";
import { formatBytes } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { TooltipHelp } from "./tooltip-help";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onUploadSuccess,
}: DocumentUploadDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<VaultCategory>(VAULT_CATEGORIES_LIST[0].value);
  const [description, setDescription] = useState("");
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
    if (!user || !selectedFile || !category) {
      setError("Please select a file and category.");
      return;
    }

    // Check storage limit
    const canUpload = await checkStorageLimit(selectedFile.size);
    if (!canUpload) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Generate document ID
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare storage path
      const storagePath = VAULT_STORAGE_PATHS.getCategoryPath(
        user.uid,
        category,
        documentId,
        1
      );
      const fileExtension = selectedFile.name.split('.').pop() || '';
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

            // Save document metadata to Firestore
            const documentRef = doc(db, "vaultDocuments", documentId);
            const documentData = {
              userId: user.uid,
              fileName: selectedFile.name,
              category,
              currentVersion: 1,
              fileSize: selectedFile.size,
              uploadedAt: serverTimestamp(),
              lastUpdated: serverTimestamp(),
              metadata: {
                description: description || null,
                documentDate: null,
                tags: [],
              },
              versions: {
                1: {
                  fileUrl: downloadURL,
                  fileSize: selectedFile.size,
                  fileType,
                  uploadedAt: serverTimestamp(),
                  versionNote: "Initial upload",
                },
              },
            };

            await setDoc(documentRef, documentData);

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
              await setDoc(settingsRef, {
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
              title: "Upload Successful",
              description: "Your document has been uploaded successfully.",
            });

            // Reset form
            setSelectedFile(null);
            setDescription("");
            setCategory(VAULT_CATEGORIES_LIST[0].value);
            setUploadProgress(0);
            
            setIsUploading(false);
            onUploadSuccess();
          } catch (error) {
            console.error("Error saving document:", error);
            setError("Failed to save document metadata. Please try again.");
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
      setDescription("");
      setCategory(VAULT_CATEGORIES_LIST[0].value);
      setError(null);
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document to your vault. Maximum file size: {formatBytes(VAULT_FILE_LIMITS.MAX_FILE_SIZE)}
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
            <div className="flex items-center gap-2">
              <Label htmlFor="file">Select File</Label>
              <TooltipHelp content="Supported formats: PDF, Images (JPG, PNG), Office documents (Word, Excel). Maximum file size: 50MB." />
            </div>
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
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedFile && (
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                <p className="font-medium">File: {selectedFile.name}</p>
                <p>Size: {formatBytes(selectedFile.size)}</p>
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="category">Category</Label>
              <TooltipHelp content="Select the appropriate category to organize your document. You can change this later if needed." />
            </div>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value as VaultCategory);
              }}
              disabled={isUploading}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select a category">
                  {VAULT_CATEGORIES_LIST.find((c) => c.value === category)?.label || "Select a category"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {VAULT_CATEGORIES_LIST.map((cat) => (
                  <SelectItem 
                    key={cat.value} 
                    value={cat.value}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{cat.label}</span>
                      <span className="text-xs text-muted-foreground">{cat.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {category && (
              <p className="text-xs text-muted-foreground">
                {VAULT_CATEGORIES_LIST.find((c) => c.value === category)?.description}
              </p>
            )}
          </div>

          {/* Description (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this document..."
              disabled={isUploading}
              rows={3}
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
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
              disabled={!selectedFile || isUploading || !category}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

