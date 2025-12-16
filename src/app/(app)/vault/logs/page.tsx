"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, limit as firestoreLimit, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download as DownloadIcon, Eye, Calendar, Filter, FileText, Key, Loader2, Search, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { VAULT_CATEGORIES_LIST, VaultCategory } from "@/lib/vault-constants";
import { PaginatedList } from "@/components/vault/paginated-list";
import { OnboardingHint } from "@/components/vault/onboarding-hint";
import { VaultErrorBoundary } from "@/components/vault/error-boundary";
import { TooltipHelp } from "@/components/vault/tooltip-help";

interface AccessLog {
  id: string;
  userId: string;
  shareCodeId: string;
  documentId: string;
  documentName: string;
  documentCategory: VaultCategory;
  action: "view" | "download";
  accessedAt: any;
  clientIp?: string;
  userAgent?: string;
  suspicious?: boolean;
  suspiciousReason?: string;
}

interface ShareCode {
  id: string;
  codeName: string;
}

export default function VaultAccessLogsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [shareCodes, setShareCodes] = useState<ShareCode[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedShareCode, setSelectedShareCode] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<VaultCategory | "all">("all");
  const [selectedAction, setSelectedAction] = useState<"all" | "view" | "download">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

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
      },
      (error) => {
        console.error("Error fetching share codes:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch access logs
  useEffect(() => {
    if (!user) return;

    const logsRef = collection(db, "vaultAccessLogs");
    const q = query(
      logsRef,
      where("userId", "==", user.uid),
      orderBy("accessedAt", "desc"),
      firestoreLimit(1000)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const accessLogs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AccessLog[];
        setLogs(accessLogs);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching access logs:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load access logs. Please try again.",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Share code filter
      if (selectedShareCode !== "all" && log.shareCodeId !== selectedShareCode) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "all" && log.documentCategory !== selectedCategory) {
        return false;
      }

      // Action filter
      if (selectedAction !== "all" && log.action !== selectedAction) {
        return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const accessedDate = log.accessedAt?.toDate 
          ? log.accessedAt.toDate() 
          : new Date(log.accessedAt);
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (accessedDate < fromDate) {
            return false;
          }
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (accessedDate > toDate) {
            return false;
          }
        }
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = log.documentName.toLowerCase().includes(searchLower);
        const matchesCategory = log.documentCategory.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedShareCode, selectedCategory, selectedAction, dateFrom, dateTo, searchTerm]);

  // Statistics
  const statistics = useMemo(() => {
    const total = filteredLogs.length;
    const downloads = filteredLogs.filter(l => l.action === "download").length;
    const views = filteredLogs.filter(l => l.action === "view").length;
    const uniqueDocuments = new Set(filteredLogs.map(l => l.documentId)).size;
    const uniqueShareCodes = new Set(filteredLogs.map(l => l.shareCodeId)).size;

    // Category breakdown
    const categoryBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.documentCategory] = (acc[log.documentCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      downloads,
      views,
      uniqueDocuments,
      uniqueShareCodes,
      categoryBreakdown,
    };
  }, [filteredLogs]);

  const clearFilters = () => {
    setSelectedShareCode("all");
    setSelectedCategory("all");
    setSelectedAction("all");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
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
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Please log in to view access logs.</p>
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
            <h1 className="text-3xl font-bold">Access Logs</h1>
            <TooltipHelp content="View detailed logs of all document access and downloads. Filter by date, category, share code, or action type." />
          </div>
          <p className="text-muted-foreground mt-1">
            Track all document access and download activities
          </p>
        </div>
        {filteredLogs.length > 0 && (
          <Button
            variant="outline"
            onClick={() => {
              // Export logs to CSV
              const headers = ["Document", "Category", "Share Code", "Action", "Accessed At", "IP Address", "Suspicious"];
              const rows = filteredLogs.map(log => {
                const accessedDate = log.accessedAt?.toDate 
                  ? log.accessedAt.toDate() 
                  : new Date(log.accessedAt);
                const shareCodeName = shareCodes.find(c => c.id === log.shareCodeId)?.codeName || "Unknown";
                
                return [
                  log.documentName,
                  log.documentCategory,
                  shareCodeName,
                  log.action,
                  format(accessedDate, "yyyy-MM-dd HH:mm:ss"),
                  log.clientIp || "—",
                  log.suspicious ? "Yes" : "No"
                ];
              });
              
              const csvContent = [
                headers.join(","),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
              ].join("\n");
              
              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `vault-access-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              
              toast({
                title: "Export Started",
                description: "Access logs exported to CSV file.",
              });
            }}
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export to CSV
          </Button>
        )}
      </div>

        {/* Onboarding Hint */}
        {logs.length === 0 && (
          <OnboardingHint type="logs" />
        )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Access</CardDescription>
            <CardTitle className="text-2xl">{statistics.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Downloads</CardDescription>
            <CardTitle className="text-2xl">{statistics.downloads}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Views</CardDescription>
            <CardTitle className="text-2xl">{statistics.views}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique Documents</CardDescription>
            <CardTitle className="text-2xl">{statistics.uniqueDocuments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Share Codes Used</CardDescription>
            <CardTitle className="text-2xl">{statistics.uniqueShareCodes}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Document name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Share Code Filter */}
            <div className="space-y-2">
              <Label>Share Code</Label>
              <Select value={selectedShareCode} onValueChange={setSelectedShareCode}>
                <SelectTrigger>
                  <SelectValue placeholder="All codes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Share Codes</SelectItem>
                  {shareCodes.map((code) => (
                    <SelectItem key={code.id} value={code.id}>
                      {code.codeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as VaultCategory | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {VAULT_CATEGORIES_LIST.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Filter */}
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={selectedAction} onValueChange={(value) => setSelectedAction(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="download">Downloads</SelectItem>
                  <SelectItem value="view">Views</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {(selectedShareCode !== "all" || selectedCategory !== "all" || selectedAction !== "all" || dateFrom || dateTo || searchTerm) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
              <span className="ml-2 text-sm text-muted-foreground">
                Showing {filteredLogs.length} of {logs.length} logs
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Access Logs</CardTitle>
          <CardDescription>
            All document access and download activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {logs.length === 0 ? "No access logs yet." : "No logs match your filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Share Code</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Accessed At</TableHead>
                      <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                      <TableHead className="hidden xl:table-cell">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.slice(0, 50).map((log) => {
                      const accessedDate = log.accessedAt?.toDate 
                        ? log.accessedAt.toDate() 
                        : new Date(log.accessedAt);
                      const shareCodeName = shareCodes.find(c => c.id === log.shareCodeId)?.codeName || "Unknown";

                      return (
                      <TableRow key={log.id} className={log.suspicious ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {log.documentName}
                            {log.suspicious && (
                              <AlertTriangle className="h-4 w-4 text-destructive" title={log.suspiciousReason} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.documentCategory}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Key className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{shareCodeName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.action === "download" ? "default" : "secondary"}>
                            {log.action === "download" ? (
                              <>
                                <DownloadIcon className="mr-1 h-3 w-3" />
                                Download
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 h-3 w-3" />
                                View
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(accessedDate, "dd MMM, yyyy")}</div>
                            <div className="text-muted-foreground">
                              {format(accessedDate, "HH:mm:ss")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                          {log.clientIp || "—"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {log.suspicious ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Suspicious
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredLogs.slice(0, 50).map((log) => {
                  const accessedDate = log.accessedAt?.toDate 
                    ? log.accessedAt.toDate() 
                    : new Date(log.accessedAt);
                  const shareCodeName = shareCodes.find(c => c.id === log.shareCodeId)?.codeName || "Unknown";

                  return (
                    <Card key={log.id} className={log.suspicious ? "border-destructive/50 bg-destructive/5" : ""}>
                      <CardContent className="p-4 space-y-2">
                        <div className="font-medium flex items-center gap-2">
                          {log.documentName}
                          {log.suspicious && (
                            <AlertTriangle className="h-4 w-4 text-destructive" title={log.suspiciousReason} />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{log.documentCategory}</Badge>
                          <Badge variant={log.action === "download" ? "default" : "secondary"}>
                            {log.action === "download" ? (
                              <>
                                <DownloadIcon className="mr-1 h-3 w-3" />
                                Downloaded
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 h-3 w-3" />
                                Viewed
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Key className="h-3 w-3" />
                            <span>{shareCodeName}</span>
                          </div>
                          <div>{format(accessedDate, "dd MMM, yyyy HH:mm")}</div>
                          {log.clientIp && (
                            <div className="font-mono text-xs">IP: {log.clientIp}</div>
                          )}
                          {log.suspicious && log.suspiciousReason && (
                            <div className="text-xs text-destructive font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {log.suspiciousReason}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </VaultErrorBoundary>
  );
}

