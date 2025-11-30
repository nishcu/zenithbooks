"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Folder, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VAULT_CATEGORIES_LIST, VAULT_FILE_LIMITS, VAULT_STORAGE_PATHS, VaultCategory } from "@/lib/vault-constants";
import { formatBytes } from "@/lib/utils";
import { DocumentUploadDialog } from "@/components/vault/document-upload-dialog";
import { DocumentList } from "@/components/vault/document-list";
import { Loader2 } from "lucide-react";

interface VaultDocument {
  id: string;
  userId: string;
  fileName: string;
  category: VaultCategory;
  currentVersion: number;
  fileSize: number;
  uploadedAt: any;
  lastUpdated: any;
  metadata?: {
    description?: string;
    documentDate?: any;
    tags?: string[];
  };
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

export default function VaultPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<VaultCategory | "all">("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit] = useState(VAULT_FILE_LIMITS.MAX_STORAGE_PER_USER);

  // Fetch documents
  useEffect(() => {
    if (!user) return;

    const documentsRef = collection(db, "vaultDocuments");
    const q = query(documentsRef, where("userId", "==", user.uid), orderBy("uploadedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VaultDocument[];
        setDocuments(docs);

        // Calculate total storage used
        const totalSize = docs.reduce((sum, doc) => {
          const versionsSize = doc.versions
            ? Object.values(doc.versions).reduce((vSum: number, version: any) => vSum + (version.fileSize || 0), 0)
            : 0;
          return sum + (doc.fileSize || 0) + versionsSize;
        }, 0);
        setStorageUsed(totalSize);

        setLoading(false);
      },
      (error) => {
        console.error("Error fetching documents:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load documents. Please try again.",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

  // Fetch storage settings
  useEffect(() => {
    if (!user) return;

    const fetchStorageSettings = async () => {
      try {
        const settingsRef = doc(db, "vaultSettings", user.uid);
        const settingsDoc = await getDoc(settingsRef);
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setStorageUsed(data.currentStorageUsed || 0);
        }
      } catch (error) {
        console.error("Error fetching storage settings:", error);
      }
    };

    fetchStorageSettings();
  }, [user]);

  // Filter documents by category
  const filteredDocuments = selectedCategory === "all" 
    ? documents 
    : documents.filter(doc => doc.category === selectedCategory);

  // Group documents by category
  const documentsByCategory = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<VaultCategory, VaultDocument[]>);

  const storagePercentage = (storageUsed / storageLimit) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Document Vault</h1>
          <p className="text-muted-foreground mt-1">
            Securely store and organize your important documents
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used: {formatBytes(storageUsed)}</span>
              <span className="text-muted-foreground">Limit: {formatBytes(storageLimit)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  storagePercentage >= 90
                    ? "bg-destructive"
                    : storagePercentage >= 80
                    ? "bg-yellow-500"
                    : "bg-primary"
                }`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {storagePercentage.toFixed(1)}% used
              {storagePercentage >= 80 && " - Consider freeing up space"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as VaultCategory | "all")}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 xl:grid-cols-8 h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {VAULT_CATEGORIES_LIST.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {selectedCategory === "all" ? (
          <TabsContent value="all" className="mt-6">
            {Object.entries(documentsByCategory).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No documents yet. Upload your first document to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(documentsByCategory).map(([category, docs]) => (
                  <div key={category}>
                    <h2 className="text-xl font-semibold mb-4">{category}</h2>
                    <DocumentList documents={docs} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ) : (
          VAULT_CATEGORIES_LIST.map((category) => (
            <TabsContent key={category.value} value={category.value} className="mt-6">
              {documentsByCategory[category.value]?.length > 0 ? (
                <DocumentList documents={documentsByCategory[category.value] || []} />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      No documents in {category.label} category yet.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsUploadDialogOpen(true)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))
        )}
      </Tabs>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUploadSuccess={() => {
          setIsUploadDialogOpen(false);
          toast({
            title: "Upload Successful",
            description: "Your document has been uploaded successfully.",
          });
        }}
      />
    </div>
  );
}

