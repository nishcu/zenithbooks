"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  FileSignature,
  Eye,
  UserPlus,
  MoreHorizontal,
  Search,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { getAllITRApplicationsForAdmin, assignITRApplication, updateITRApplicationStatus } from "@/lib/itr/firestore";
import { AssignITRDialog } from "@/components/admin/assign-itr-dialog";
import { STATUS_LABELS, STATUS_COLORS, getFinancialYearList } from "@/lib/itr/constants";
import type { ITRApplication, ITRStatus } from "@/lib/itr/types";
import { format } from "date-fns";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UserInfo {
  name?: string;
  email?: string;
}

export default function AdminITRApplicationsPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();

  const [applications, setApplications] = useState<ITRApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, UserInfo>>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ITRStatus | "ALL">("ALL");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");

  // Dialogs
  const [selectedApplication, setSelectedApplication] = useState<ITRApplication | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  // Bulk operations
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"assign" | "status" | null>(null);
  const [bulkStatus, setBulkStatus] = useState<ITRStatus | "">("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    loadApplications();
  }, [user]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const apps = await getAllITRApplicationsForAdmin({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        financialYear: yearFilter !== "ALL" ? yearFilter : undefined,
        assignedTo: assignmentFilter === "ASSIGNED" ? "assigned" : assignmentFilter === "UNASSIGNED" ? null : undefined,
        searchTerm: searchTerm || undefined,
      });

      // Fetch user info for each application
      const userIds = [...new Set(apps.map((app: ITRApplication) => app.userId))];
      const userInfoPromises = userIds.map(async (userId: string) => {
        if (userInfoCache[userId]) return;
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              userId,
              info: {
                name: data.name || data.companyName || "",
                email: data.email || "",
              },
            };
          }
        } catch (error) {
          console.error(`Error fetching user info for ${userId}:`, error);
        }
        return null;
      });

      const userInfos = await Promise.all(userInfoPromises);
      const newCache = { ...userInfoCache };
      userInfos.forEach((result: any) => {
        if (result) {
          newCache[result.userId] = result.info;
        }
      });
      setUserInfoCache(newCache);

      setApplications(apps);
    } catch (error: any) {
      console.error("Error loading applications:", error);
      toast({
        title: "Error",
        description: "Failed to load ITR applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (professionalId: string) => {
    if (!selectedApplication || !user) return;
    try {
      await assignITRApplication(selectedApplication.id, professionalId, user.uid);
      await loadApplications();
      setSelectedApplication(null);
      setIsAssignDialogOpen(false);
    } catch (error: any) {
      throw new Error(error.message || "Failed to assign application");
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedApplicationIds.size === 0 || !user) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const appId of selectedApplicationIds) {
        try {
          await updateITRApplicationStatus(appId, bulkStatus as ITRStatus);
          successCount++;
        } catch (error) {
          console.error(`Error updating application ${appId}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Bulk Update Complete",
        description: `Successfully updated ${successCount} application(s). ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
      });

      setSelectedApplicationIds(new Set());
      setBulkAction(null);
      setBulkStatus("");
      await loadApplications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Bulk Update Failed",
        description: error.message || "Failed to update applications",
      });
    }
  };

  const handleBulkExport = () => {
    if (selectedApplicationIds.size === 0) return;

    const selectedApps = filteredApplications.filter(app => selectedApplicationIds.has(app.id));
    
    // Create CSV content
    const headers = ["Application ID", "User Name", "Email", "PAN", "Financial Year", "Status", "Assigned To", "Created Date"];
    const rows = selectedApps.map(app => {
      const userInfo = userInfoCache[app.userId] || {};
      return [
        app.id,
        userInfo.name || "Unknown",
        userInfo.email || "",
        app.pan || "",
        app.financialYear,
        app.status,
        app.assignedTo ? "Assigned" : "Unassigned",
        format(app.createdAt, "yyyy-MM-dd"),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `itr-applications-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${selectedApplicationIds.size} application(s) to CSV`,
    });
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: ITRStatus) => {
    try {
      await updateITRApplicationStatus(applicationId, newStatus);
      toast({
        title: "Status Updated",
        description: `Application status has been updated to ${STATUS_LABELS[newStatus]}.`,
      });
      await loadApplications();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredApplications = useMemo(() => {
    let filtered = applications;

    // Additional client-side filtering for assignment
    if (assignmentFilter === "ASSIGNED") {
      filtered = filtered.filter((app) => app.assignedTo);
    } else if (assignmentFilter === "UNASSIGNED") {
      filtered = filtered.filter((app) => !app.assignedTo);
    }

    return filtered;
  }, [applications, assignmentFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = applications.length;
    const unassigned = applications.filter((app) => !app.assignedTo).length;
    const inProgress = applications.filter(
      (app) =>
        app.status === "DATA_FETCHING" ||
        app.status === "DRAFT_IN_PROGRESS" ||
        app.status === "FILING_IN_PROGRESS"
    ).length;
    const completed = applications.filter(
      (app) => app.status === "COMPLETED"
    ).length;

    return { total, unassigned, inProgress, completed };
  }, [applications]);

  const getStatusBadge = (status: ITRStatus) => {
    return (
      <Badge className={STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}>
        {STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <FileSignature className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ITR Applications</h1>
            <p className="text-muted-foreground">
              Manage all ITR filing applications and assignments
            </p>
          </div>
        </div>
        <Button onClick={loadApplications} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Applications</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Assignment</CardDescription>
            <CardTitle className="text-2xl">{stats.unassigned}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-2xl">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">{stats.completed}</CardTitle>
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="PAN, ID, Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      loadApplications();
                    }
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ITRStatus | "ALL")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <SelectItem key={status} value={status}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Financial Year</label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Years</SelectItem>
                  {getFinancialYearList(5).map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment</label>
              <Select
                value={assignmentFilter}
                onValueChange={(value) => setAssignmentFilter(value as typeof assignmentFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={loadApplications} className="w-full md:w-auto">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedApplicationIds.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  {selectedApplicationIds.size} application(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedApplicationIds(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setBulkAction("status")}
                >
                  Bulk Update Status
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkExport}
                >
                  Export Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Status Update */}
      {bulkAction === "status" && selectedApplicationIds.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="font-medium">Update Status:</label>
              <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as ITRStatus)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <SelectItem key={status} value={status}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus}
              >
                Update {selectedApplicationIds.size} Applications
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setBulkAction(null);
                  setBulkStatus("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Applications</CardTitle>
              <CardDescription>
                {filteredApplications.length} application(s) found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedApplicationIds.size === filteredApplications.length) {
                    setSelectedApplicationIds(new Set());
                  } else {
                    setSelectedApplicationIds(new Set(filteredApplications.map(app => app.id)));
                  }
                }}
              >
                {selectedApplicationIds.size === filteredApplications.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No ITR applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedApplicationIds.size === filteredApplications.length && filteredApplications.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApplicationIds(new Set(filteredApplications.map(app => app.id)));
                          } else {
                            setSelectedApplicationIds(new Set());
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Application ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Financial Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => {
                    const userInfo = userInfoCache[app.userId] || {};
                    return (
                      <TableRow key={app.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedApplicationIds.has(app.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedApplicationIds);
                              if (e.target.checked) {
                                newSet.add(app.id);
                              } else {
                                newSet.delete(app.id);
                              }
                              setSelectedApplicationIds(newSet);
                            }}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {app.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{userInfo.name || "Unknown User"}</p>
                            <p className="text-xs text-muted-foreground">{userInfo.email || app.userId.substring(0, 8)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{app.pan || "—"}</TableCell>
                        <TableCell>{app.financialYear}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell>
                          {app.assignedTo ? (
                            <Badge variant="secondary">Assigned</Badge>
                          ) : (
                            <Badge variant="outline">Unassigned</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(app.createdAt, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/itr-applications/${app.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setIsAssignDialogOpen(true);
                                }}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                {app.assignedTo ? "Re-assign" : "Assign"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <AssignITRDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        application={selectedApplication}
        onAssign={handleAssign}
      />
    </div>
  );
}

