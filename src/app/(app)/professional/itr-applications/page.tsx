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
import { useToast } from "@/hooks/use-toast";
import {
  FileSignature,
  Eye,
  Download,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { getAssignedApplications, updateITRApplicationStatus } from "@/lib/itr/firestore";
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

export default function ProfessionalITRApplicationsPage() {
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

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    loadApplications();
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const apps = await getAssignedApplications(user.uid);

      // Fetch user info for each application
      const userIds = [...new Set(apps.map((app) => app.userId))];
      const userInfoPromises = userIds.map(async (userId) => {
        if (userInfoCache[userId]) return null;
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
      userInfos.forEach((result) => {
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
        description: "Failed to load assigned ITR applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    if (yearFilter !== "ALL") {
      filtered = filtered.filter((app) => app.financialYear === yearFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.pan?.toLowerCase().includes(search) ||
          app.id.toLowerCase().includes(search) ||
          app.name?.toLowerCase().includes(search) ||
          userInfoCache[app.userId]?.name?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [applications, statusFilter, yearFilter, searchTerm, userInfoCache]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = applications.length;
    const pendingAIS = applications.filter(
      (app) => app.status === "DATA_FETCHING" || app.status === "UPLOADED"
    ).length;
    const inProgress = applications.filter(
      (app) =>
        app.status === "DATA_FETCHING" ||
        app.status === "AIS_DOWNLOADED" ||
        app.status === "DRAFT_IN_PROGRESS" ||
        app.status === "FILING_IN_PROGRESS"
    ).length;
    const completed = applications.filter(
      (app) => app.status === "COMPLETED"
    ).length;

    return { total, pendingAIS, inProgress, completed };
  }, [applications]);

  const getStatusBadge = (status: ITRStatus) => {
    return (
      <Badge className={STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}>
        {STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  if (loading && applications.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your assigned applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <FileSignature className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">My ITR Applications</h1>
            <p className="text-muted-foreground">
              Manage ITR applications assigned to you
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
            <CardDescription>Total Assigned</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending AIS Download</CardDescription>
            <CardTitle className="text-2xl">{stats.pendingAIS}</CardTitle>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="PAN, ID, Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ITRStatus | "ALL")}
              >
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
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Applications</CardTitle>
          <CardDescription>
            {filteredApplications.length} application(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-semibold mb-2">No Applications Assigned</p>
              <p className="text-muted-foreground">
                {applications.length === 0
                  ? "You don't have any ITR applications assigned to you yet."
                  : "No applications match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Financial Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => {
                    const userInfo = userInfoCache[app.userId] || {};
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-mono text-xs">
                          {app.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{userInfo.name || "Unknown User"}</p>
                            <p className="text-xs text-muted-foreground">
                              {userInfo.email || app.userId.substring(0, 8)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{app.pan || "—"}</TableCell>
                        <TableCell>{app.financialYear}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell>
                          {format(app.createdAt, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/professional/itr-applications/${app.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </Link>
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
    </div>
  );
}

