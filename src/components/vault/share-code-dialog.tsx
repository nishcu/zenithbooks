"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Key, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VAULT_CATEGORIES_LIST, VAULT_SHARE_CODE, VaultCategory } from "@/lib/vault-constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ShareCode {
  id: string;
  codeName: string;
  categories: VaultCategory[];
  description?: string;
}

interface ShareCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCode: ShareCode | null;
  onSuccess: () => void;
}

export function ShareCodeDialog({
  open,
  onOpenChange,
  editingCode,
  onSuccess,
}: ShareCodeDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [codeName, setCodeName] = useState("");
  const [description, setDescription] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<VaultCategory>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (editingCode) {
        setCodeName(editingCode.codeName);
        setDescription(editingCode.description || "");
        setSelectedCategories(new Set(editingCode.categories));
        setSecretCode("");
        setGeneratedCode(null);
      } else {
        setCodeName("");
        setDescription("");
        setSecretCode("");
        setSelectedCategories(new Set());
        setGeneratedCode(null);
      }
      setError(null);
      setCodeCopied(false);
    }
  }, [open, editingCode]);

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars
    let code = "";
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecretCode(code);
    setGeneratedCode(code);
    setCodeCopied(false);
  };

  const validateCode = (code: string): boolean => {
    if (code.length < VAULT_SHARE_CODE.MIN_LENGTH) {
      setError(`Code must be at least ${VAULT_SHARE_CODE.MIN_LENGTH} characters long.`);
      return false;
    }
    if (VAULT_SHARE_CODE.REQUIRES_ALPHANUMERIC && !/^[A-Za-z0-9]+$/.test(code)) {
      setError("Code must contain only letters and numbers.");
      return false;
    }
    return true;
  };

  const handleCopyCode = async () => {
    if (generatedCode) {
      try {
        await navigator.clipboard.writeText(generatedCode);
        setCodeCopied(true);
        toast({
          title: "Code Copied",
          description: "Share code copied to clipboard. Save it securely!",
        });
        setTimeout(() => setCodeCopied(false), 2000);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Failed to copy code. Please copy it manually.",
        });
      }
    }
  };

  const hashCode = async (code: string): Promise<string> => {
    // Use Web Crypto API for hashing (browser-native, no bcrypt needed)
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  };

  const handleSave = async () => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }

    if (!codeName.trim()) {
      setError("Code name is required.");
      return;
    }

    if (selectedCategories.size === 0) {
      setError("Please select at least one category to share.");
      return;
    }

    // Only validate and hash code if creating new (not editing)
    let codeHash = "";
    if (!editingCode) {
      if (!secretCode.trim()) {
        setError("Please enter or generate a secret code.");
        return;
      }

      if (!validateCode(secretCode)) {
        return;
      }

      // CRITICAL SECURITY FIX: Include userId in hash to prevent collisions between users
      // Hash format: H(code + userId) ensures each user's codes are unique
      const codeWithUserId = `${secretCode.trim()}:${user.uid}`;
      codeHash = await hashCode(codeWithUserId);
    }

    setIsSaving(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + VAULT_SHARE_CODE.EXPIRY_DAYS);

      if (editingCode) {
        // Update existing code
        const codeRef = doc(db, "vaultShareCodes", editingCode.id);
        await updateDoc(codeRef, {
          codeName: codeName.trim(),
          description: description.trim() || null,
          categories: Array.from(selectedCategories),
          lastUpdated: serverTimestamp(),
        });

        toast({
          title: "Share Code Updated",
          description: "Share code has been updated successfully.",
        });
      } else {
        // Create new code
        const expiresAtDate = new Date();
        expiresAtDate.setDate(expiresAtDate.getDate() + VAULT_SHARE_CODE.EXPIRY_DAYS);
        
        await addDoc(collection(db, "vaultShareCodes"), {
          userId: user.uid,
          codeName: codeName.trim(),
          description: description.trim() || null,
          codeHash, // Store hashed version
          categories: Array.from(selectedCategories),
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresAtDate), // Convert to Firestore Timestamp
          isActive: true,
          accessCount: 0,
        });

        // Set generated code for display
        setGeneratedCode(secretCode.trim());
        toast({
          title: "Share Code Created",
          description: "Copy the code now - it won't be shown again!",
        });
      }

      // Don't close dialog if code was just generated - let user copy it
      // Use secretCode to ensure we check the actual saved code
      if (!editingCode && secretCode.trim()) {
        // Keep dialog open so user can copy
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving share code:", error);
      setError("Failed to save share code. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (category: VaultCategory) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingCode ? "Edit Share Code" : "Create Share Code"}
          </DialogTitle>
          <DialogDescription>
            {editingCode
              ? "Update the share code details and categories."
              : "Create a new share code for third-party document access."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Show generated code if just created */}
          {generatedCode && !editingCode && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="space-y-2">
                <div className="font-semibold text-green-800 dark:text-green-200">
                  Your Share Code (Copy this now - it won't be shown again!):
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded border font-mono text-lg">
                    {generatedCode}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                    className="shrink-0"
                  >
                    {codeCopied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  Share this code with third parties. They can use it at{" "}
                  <a
                    href="/vault/access"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-green-800 dark:hover:text-green-200"
                  >
                    {typeof window !== 'undefined' ? window.location.origin : 'https://zenithbooks.in'}/vault/access
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Code Name */}
          <div className="space-y-2">
            <Label htmlFor="codeName">Code Name *</Label>
            <Input
              id="codeName"
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              placeholder="e.g., Housing Loan - HDFC Bank"
              disabled={isSaving || !!generatedCode}
            />
          </div>

          {/* Secret Code (only for new codes) */}
          {!editingCode && (
            <div className="space-y-2">
              <Label htmlFor="secretCode">Secret Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="secretCode"
                  value={secretCode}
                  onChange={(e) => {
                    setSecretCode(e.target.value.toUpperCase());
                    setGeneratedCode(null);
                  }}
                  placeholder="Enter or generate a code"
                  disabled={isSaving || !!generatedCode}
                  className="font-mono"
                  maxLength={20}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRandomCode}
                  disabled={isSaving || !!generatedCode}
                >
                  <Key className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum {VAULT_SHARE_CODE.MIN_LENGTH} characters, alphanumeric only. This code will be hashed and cannot be retrieved later.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this share code..."
              disabled={isSaving || !!generatedCode}
              rows={2}
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Select Categories to Share *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border rounded-md">
              {VAULT_CATEGORIES_LIST.map((category) => (
                <div key={category.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.value}`}
                    checked={selectedCategories.has(category.value)}
                    onCheckedChange={() => toggleCategory(category.value)}
                    disabled={isSaving || !!generatedCode}
                  />
                  <Label
                    htmlFor={`category-${category.value}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {selectedCategories.size} {selectedCategories.size === 1 ? "category" : "categories"}
            </p>
          </div>

          {/* Expiry Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This code will automatically expire after {VAULT_SHARE_CODE.EXPIRY_DAYS} days.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            {generatedCode && !editingCode ? (
              <Button onClick={() => {
                onSuccess();
                setGeneratedCode(null);
              }}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingCode ? "Update" : "Create"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

