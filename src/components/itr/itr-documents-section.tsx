"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Folder, 
  Eye,
  FileArchive,
  Calendar,
} from "lucide-react";
import { VAULT_CATEGORIES } from "@/lib/vault-constants";
import type { FinancialYear } from "@/lib/itr/types";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ITRDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
  metadata?: {
    financialYear?: FinancialYear;
    itrApplicationId?: string;
    itrDocumentType?: string;
    folderPath?: string;
    description?: string;
  };
  versions?: {
    [version: number]: {
      fileUrl: string;
      fileSize: number;
      fileType: string;
    };
  };
}

export function ITRDocumentsSection() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [itrDocuments, setItrDocuments] = useState<Record<FinancialYear, ITRDocument[]>>({} as any);
  const [loading, setLoading] = useState(true);
  const [expandedFY, setExpandedFY] = useState<Set<FinancialYear>>(new Set());

  useEffect(() => {
    if (!user) return;

    loadITRDocuments();
  }, [user]);

  const loadITRDocuments = async () => {
    try {
      setLoading(true);
      
      // Fetch ITR documents from vault
      const q = query(
        collection(db, "vaultDocuments"),
        where("userId", "==", user?.uid),
        where("category", "==", VAULT_CATEGORIES.INCOME_TAX)
      );

      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
      })) as ITRDocument[];

      // Filter ITR documents (those with itrApplicationId in metadata)
      const itrDocs = documents.filter(doc => 
        doc.metadata?.itrApplicationId && doc.metadata?.financialYear
      );

      // Group by financial year
      const grouped: Record<FinancialYear, ITRDocument[]> = {} as any;
      
      itrDocs.forEach(doc => {
        const fy = doc.metadata!.financialYear!;
        if (!grouped[fy]) {
          grouped[fy] = [];
        }
        grouped[fy].push(doc);
      });

      // Sort financial years (newest first)
      const sortedFYs = Object.keys(grouped).sort().reverse() as FinancialYear[];
      const sortedGrouped: Record<FinancialYear, ITRDocument[]> = {} as any;
      sortedFYs.forEach(fy => {
        sortedGrouped[fy] = grouped[fy];
      });

      setItrDocuments(sortedGrouped);
      
      // Expand the most recent FY by default
      if (sortedFYs.length > 0) {
        setExpandedFY(new Set([sortedFYs[0]]));
      }
    } catch (error) {
      console.error("Error loading ITR documents:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load ITR documents. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async (financialYear: FinancialYear) => {
    const docs = itrDocuments[financialYear] || [];
    if (docs.length === 0) return;

    toast({
      title: "Downloading Documents",
      description: `Preparing ${docs.length} documents for download...`,
    });

    // Download each document
    for (const doc of docs) {
      try {
        const fileUrl = doc.versions?.[1]?.fileUrl || doc.fileUrl;
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = doc.fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Failed to download ${doc.fileName}:`, error);
      }
    }

    toast({
      title: "Download Complete",
      description: `All documents for FY ${financialYear} have been downloaded.`,
    });
  };

  const getDocumentTypeLabel = (type?: string): string => {
    if (!type) return "Document";
    const typeMap: Record<string, string> = {
      PAN_FRONT: "PAN (Front)",
      PAN_BACK: "PAN (Back)",
      FORM_16: "Form 16",
      BANK_STATEMENT: "Bank Statement",
      RENT_RECEIPT: "Rent Receipt",
      LIC_PREMIUM: "LIC Premium",
      HOME_LOAN_STATEMENT: "Home Loan Statement",
      AIS_PDF: "AIS (PDF)",
      AIS_JSON: "AIS (JSON)",
      FORM_26AS: "Form 26AS",
      TIS: "TIS",
      PAST_ITR: "Past ITR",
      ITR_DRAFT: "ITR Draft",
      ITR_V: "ITR-V",
      FILING_ACKNOWLEDGEMENT: "Filing Acknowledgement",
    };
    return typeMap[type] || type.replace(/_/g, " ");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const financialYears = Object.keys(itrDocuments) as FinancialYear[];
  
  if (financialYears.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ITR Documents
          </CardTitle>
          <CardDescription>
            Your ITR filing documents organized by financial year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No ITR documents found.</p>
            <p className="text-sm mt-2">
              Documents will appear here automatically after you file your ITR.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          ITR Documents
        </CardTitle>
        <CardDescription>
          Your ITR filing documents organized by financial year
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {financialYears.map((fy) => {
          const docs = itrDocuments[fy];
          const isExpanded = expandedFY.has(fy);
          
          return (
            <Collapsible
              key={fy}
              open={isExpanded}
              onOpenChange={(open) => {
                const newExpanded = new Set(expandedFY);
                if (open) {
                  newExpanded.add(fy);
                } else {
                  newExpanded.delete(fy);
                }
                setExpandedFY(newExpanded);
              }}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Calendar className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <h3 className="font-semibold">Financial Year {fy}</h3>
                        <p className="text-sm text-muted-foreground">
                          {docs.length} document{docs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{docs.length} files</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadAll(fy);
                        }}
                      >
                        <FileArchive className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="border-t p-4 space-y-2">
                    {docs.map((doc) => {
                      const fileUrl = doc.versions?.[1]?.fileUrl || doc.fileUrl;
                      const docType = getDocumentTypeLabel(doc.metadata?.itrDocumentType);
                      
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{doc.fileName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {docType}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {(doc.fileSize / 1024).toFixed(2)} KB
                                </span>
                                {doc.metadata?.itrApplicationId && (
                                  <span className="text-xs text-muted-foreground">
                                    • App: {doc.metadata.itrApplicationId.substring(0, 8)}...
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(fileUrl, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = fileUrl;
                                link.download = doc.fileName;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}

