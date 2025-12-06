"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, limit as firestoreLimit } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileKey, HardDrive, Upload, Eye, FileText } from "lucide-react";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { VAULT_FILE_LIMITS } from "@/lib/vault-constants";

interface VaultDocument {
  id: string;
  fileName: string;
  uploadedAt: any;
  fileSize: number;
}

export function VaultStatistics() {
  const [user] = useAuthState(auth);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [recentDocuments, setRecentDocuments] = useState<VaultDocument[]>([]);
  const [shareCodesCount, setShareCodesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch documents count and recent documents
    const documentsRef = collection(db, "vaultDocuments");
    
    // Get total count
    const countQuery = query(
      documentsRef,
      where("userId", "==", user.uid)
    );
    
    // Get recent documents for preview
    const recentQuery = query(
      documentsRef,
      where("userId", "==", user.uid),
      orderBy("uploadedAt", "desc"),
      firestoreLimit(5)
    );

    const unsubscribeCount = onSnapshot(
      countQuery,
      (snapshot) => {
        setDocumentsCount(snapshot.size);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching document count:", error);
        setLoading(false);
      }
    );

    const unsubscribeRecent = onSnapshot(
      recentQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VaultDocument[];
        setRecentDocuments(docs);
      },
      (error) => {
        console.error("Error fetching recent documents:", error);
      }
    );

    // Fetch storage settings
    const fetchStorage = async () => {
      try {
        const settingsRef = doc(db, "vaultSettings", user.uid);
        const settingsDoc = await getDoc(settingsRef);
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setStorageUsed(data.currentStorageUsed || 0);
        }
      } catch (error) {
        console.error("Error fetching storage:", error);
      }
    };

    // Fetch share codes count
    const shareCodesRef = collection(db, "vaultShareCodes");
    const shareCodesQuery = query(
      shareCodesRef,
      where("userId", "==", user.uid),
      where("isActive", "==", true)
    );

    const unsubscribeShareCodes = onSnapshot(
      shareCodesQuery,
      (snapshot) => {
        setShareCodesCount(snapshot.size);
      },
      (error) => {
        console.error("Error fetching share codes:", error);
      }
    );

    fetchStorage();

    return () => {
      unsubscribeCount();
      unsubscribeRecent();
      unsubscribeShareCodes();
    };
  }, [user]);

  const storageLimit = VAULT_FILE_LIMITS.MAX_STORAGE_PER_USER;
  const storagePercentage = storageUsed > 0 ? (storageUsed / storageLimit) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileKey className="h-5 w-5" />
            Document Vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileKey className="h-5 w-5" />
            Document Vault
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/vault">View All</Link>
          </Button>
        </div>
        <CardDescription>
          Manage your secure document storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{documentsCount}</div>
            <div className="text-xs text-muted-foreground">Documents</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{shareCodesCount}</div>
            <div className="text-xs text-muted-foreground">Active Share Codes</div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium">{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
          </div>
          <Progress 
            value={storagePercentage} 
            className={`h-2 ${
              storagePercentage >= 90 ? "bg-destructive" : 
              storagePercentage >= 80 ? "bg-yellow-500" : 
              "bg-primary"
            }`}
          />
          <div className="text-xs text-muted-foreground">
            {storagePercentage.toFixed(1)}% used
          </div>
        </div>

        {/* Recent Documents */}
        {recentDocuments.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Recent Uploads</div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/vault">
                  <Eye className="h-3 w-3 mr-1" />
                  View All
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              {recentDocuments.slice(0, 3).map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm">
                  <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{doc.fileName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatBytes(doc.fileSize)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href="/vault">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href="/vault/sharing">
              <FileKey className="h-4 w-4 mr-2" />
              Share
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

