"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { SUPER_ADMIN_UID } from "@/lib/constants";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

type LeadRow = {
  id: string;
  createdAt?: any;
  userId?: string;
  userEmail?: string;
  employeeId?: string;
  employeeName?: string;
  employeeMobile?: string;
  employeePanLast4?: string;
  financialYear?: string;
  taxRegime?: string;
  source?: string;
};

function toDateSafe(v: any): Date | null {
  try {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function csvEscape(value: any): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AdminForm16FreeLeadsPage() {
  const [user] = useAuthState(auth);
  const isSuperAdmin = !!user?.uid && user.uid === SUPER_ADMIN_UID;

  const [rows, setRows] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.employeeName,
        r.employeeMobile,
        r.userEmail,
        r.financialYear,
        r.taxRegime,
        r.source,
        r.employeePanLast4,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  async function fetchLeads() {
    if (!isSuperAdmin) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, "form16_free_generations"), orderBy("createdAt", "desc"), limit(2000));
      const snap = await getDocs(q);
      const list: LeadRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setRows(list);
      setLastLoadedAt(new Date());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  function exportCsv() {
    const header = [
      "createdAt",
      "userEmail",
      "userId",
      "employeeName",
      "employeeMobile",
      "employeePanLast4",
      "financialYear",
      "taxRegime",
      "source",
      "employeeId",
    ];

    const lines = [
      header.join(","),
      ...filtered.map((r) => {
        const created = toDateSafe(r.createdAt);
        const createdStr = created ? created.toISOString() : "";
        const row = [
          createdStr,
          r.userEmail || "",
          r.userId || "",
          r.employeeName || "",
          r.employeeMobile || "",
          r.employeePanLast4 || "",
          r.financialYear || "",
          r.taxRegime || "",
          r.source || "",
          r.employeeId || "",
        ];
        return row.map(csvEscape).join(",");
      }),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zenithbooks_form16_free_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Free Form 16 Leads</CardTitle>
            <CardDescription>Please sign in to continue.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>This page is available only to super admin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Free Form 16 Leads</h1>
          <p className="text-muted-foreground">
            Captured when a user consumes their 1 free Individual Form 16 generation.
          </p>
          {lastLoadedAt && (
            <div className="text-xs text-muted-foreground mt-1">
              Last refreshed: {format(lastLoadedAt, "dd MMM, yyyy HH:mm")}
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={fetchLeads} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV ({filtered.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            Total records: <span className="font-medium">{rows.length}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / mobile / email / FY / regime…"
              className="max-w-md"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Created</TableHead>
                  <TableHead className="min-w-[220px]">User Email</TableHead>
                  <TableHead className="min-w-[180px]">Employee</TableHead>
                  <TableHead className="min-w-[140px]">Mobile</TableHead>
                  <TableHead className="min-w-[90px]">PAN</TableHead>
                  <TableHead className="min-w-[90px]">FY</TableHead>
                  <TableHead className="min-w-[90px]">Regime</TableHead>
                  <TableHead className="min-w-[160px]">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const d = toDateSafe(r.createdAt);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">
                          {d ? format(d, "dd MMM, yyyy HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{r.userEmail || "—"}</TableCell>
                        <TableCell className="text-sm">{r.employeeName || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{r.employeeMobile || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{r.employeePanLast4 ? `****${r.employeePanLast4}` : "—"}</TableCell>
                        <TableCell className="text-sm">{r.financialYear || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {r.taxRegime ? <Badge variant="secondary">{r.taxRegime}</Badge> : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{r.source || "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

