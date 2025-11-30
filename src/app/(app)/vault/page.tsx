"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Folder, HardDrive, Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { VAULT_CATEGORIES_LIST, VAULT_FILE_LIMITS, VAULT_STORAGE_PATHS, VaultCategory } from "@/lib/vault-constants";
import { formatBytes } from "@/lib/utils";
import { DocumentUploadDialog } from "@/components/vault/document-upload-dialog";
import { DocumentList } from "@/components/vault/document-list";
import { DocumentListSkeleton } from "@/components/vault/document-list-skeleton";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<{ from?: Date; to?: Date } | null>(null);

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

  // Fetch storage settings and check for warnings
  useEffect(() => {
    if (!user) return;

    const fetchStorageSettings = async () => {
      try {
        const settingsRef = doc(db, "vaultSettings", user.uid);
        const settingsDoc = await getDoc(settingsRef);
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const currentStorageUsed = data.currentStorageUsed || 0;
          setStorageUsed(currentStorageUsed);
          
          // Check for storage warnings
          const percentage = (currentStorageUsed / storageLimit) * 100;
          if (percentage >= 80) {
            const { notifyStorageWarning } = await import("@/lib/vault-notifications");
            await notifyStorageWarning(user.uid, currentStorageUsed, storageLimit, percentage);
          }
        }
      } catch (error) {
        console.error("Error fetching storage settings:", error);
      }
    };

    fetchStorageSettings();
    
    // Check for expiring share codes
    const checkExpiringCodes = async () => {
      try {
        const { checkAndNotifyExpiringCodes } = await import("@/lib/vault-notifications");
        await checkAndNotifyExpiringCodes(user.uid);
      } catch (error) {
        console.error("Error checking expiring codes:", error);
      }
    };
    
    checkExpiringCodes();
    
    // Check every hour for expiring codes
    const interval = setInterval(checkExpiringCodes, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, storageLimit]);

  // Filter documents by category, search term, and date range
  const filteredDocuments = documents.filter((doc) => {
    // Category filter
    if (selectedCategory !== "all" && doc.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = doc.fileName.toLowerCase().includes(searchLower);
      const matchesDescription = doc.metadata?.description?.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesDescription) {
        return false;
      }
    }

    // Date filter
    if (dateFilter?.from || dateFilter?.to) {
      const uploadDate = doc.uploadedAt?.toDate 
        ? doc.uploadedAt.toDate() 
        : new Date(doc.uploadedAt);
      
      if (dateFilter.from && uploadDate < dateFilter.from) {
        return false;
      }
      if (dateFilter.to) {
        const endDate = new Date(dateFilter.to);
        endDate.setHours(23, 59, 59, 999); // Include full day
        if (uploadDate > endDate) {
          return false;
        }
      }
    }

    return true;
  });

  // Group filtered documents by category (for "all" view)
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Document Vault</h1>
            <p className="text-muted-foreground mt-1">
              Securely store and organize your important documents
            </p>
          </div>
        </div>
        <DocumentListSkeleton />
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

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {/* Date Filter - Simple for now, can be enhanced */}
            {(searchTerm || dateFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setDateFilter(null);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
          {(searchTerm || dateFilter) && (
            <div className="mt-2 text-sm text-muted-foreground">
              Showing {filteredDocuments.length} of {documents.length} documents
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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

            {/* Storage Breakdown by Category */}
            {documents.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-semibold">Storage by Category</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(
                    documents.reduce((acc, doc) => {
                      const category = doc.category;
                      const docSize = doc.versions
                        ? Object.values(doc.versions).reduce((sum: number, v: any) => sum + (v.fileSize || 0), 0)
                        : doc.fileSize || 0;
                      
                      if (!acc[category]) {
                        acc[category] = 0;
                      }
                      acc[category] += docSize;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, size]) => {
                      const categoryPercentage = (size / storageUsed) * 100;
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{category}</span>
                            <span className="font-medium">{formatBytes(size)}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-primary transition-all"
                              style={{ width: `${categoryPercentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
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
            {filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {searchTerm || dateFilter
                      ? "No documents match your search criteria."
                      : "No documents yet. Upload your first document to get started."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(documentsByCategory).map(([category, docs]) => (
                  <div key={category}>
                    <h2 className="text-xl font-semibold mb-4">{category}</h2>
                    <DocumentList 
                      documents={docs} 
                      onRefresh={() => {
                        // Trigger refresh by re-fetching
                        setDocuments([...documents]);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ) : (
          VAULT_CATEGORIES_LIST.map((category) => (
            <TabsContent key={category.value} value={category.value} className="mt-6">
              {filteredDocuments.length > 0 ? (
                <DocumentList 
                  documents={filteredDocuments}
                  onRefresh={() => {
                    // Trigger refresh by re-fetching
                    setDocuments([...documents]);
                  }}
                />
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

