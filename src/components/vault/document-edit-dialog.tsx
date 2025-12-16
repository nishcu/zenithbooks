"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VAULT_CATEGORIES_LIST, VaultCategory } from "@/lib/vault-constants";

interface Document {
  id: string;
  fileName: string;
  category: VaultCategory;
  metadata?: {
    description?: string;
    documentDate?: any;
    tags?: string[];
  };
}

interface DocumentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onSave: () => void;
}

export function DocumentEditDialog({
  open,
  onOpenChange,
  document,
  onSave,
}: DocumentEditDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");
  const [category, setCategory] = useState<VaultCategory>(VAULT_CATEGORIES_LIST[0].value);
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when document changes
  useEffect(() => {
    if (document && open) {
      setFileName(document.fileName || "");
      setCategory(document.category || VAULT_CATEGORIES_LIST[0].value);
      setDescription(document.metadata?.description || "");
    }
  }, [document, open]);

  const handleSave = async () => {
    if (!user || !document) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User or document not found.",
      });
      return;
    }

    if (!fileName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Document name is required.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const documentRef = doc(db, "vaultDocuments", document.id);
      
      await updateDoc(documentRef, {
        fileName: fileName.trim(),
        category,
        metadata: {
          ...document.metadata,
          description: description.trim() || null,
        },
        lastUpdated: serverTimestamp(),
      });

      toast({
        title: "Document Updated",
        description: "Document metadata has been updated successfully.",
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating document:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update document. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onOpenChange(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Update document metadata and information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="fileName">Document Name</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              disabled={isSaving}
              placeholder="Enter document name"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as VaultCategory)}
              disabled={isSaving}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {VAULT_CATEGORIES_LIST.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this document..."
              disabled={isSaving}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !fileName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

