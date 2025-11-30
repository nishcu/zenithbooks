"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, limit as firestoreLimit } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Download, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface AccessLog {
  id: string;
  shareCodeId: string;
  documentId: string;
  documentName: string;
  documentCategory: string;
  action: "view" | "download";
  accessedAt: any;
  clientIp?: string;
  userAgent?: string;
}

interface ShareCodeAccessLogsProps {
  shareCodeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareCodeAccessLogs({
  shareCodeId,
  open,
  onOpenChange,
}: ShareCodeAccessLogsProps) {
  const [user] = useAuthState(auth);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !shareCodeId) return;

    const logsRef = collection(db, "vaultAccessLogs");
    const q = query(
      logsRef,
      where("shareCodeId", "==", shareCodeId),
      orderBy("accessedAt", "desc"),
      firestoreLimit(100)
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
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [open, shareCodeId]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Access Logs</DialogTitle>
          <DialogDescription>
            View all access and download activities for this share code
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No access logs yet for this share code.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Showing {logs.length} access log{logs.length !== 1 ? "s" : ""}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Accessed At</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const accessedDate = log.accessedAt?.toDate 
                      ? log.accessedAt.toDate() 
                      : new Date(log.accessedAt);

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.documentName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.documentCategory}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.action === "download" ? "default" : "secondary"}>
                            {log.action === "download" ? (
                              <>
                                <Download className="mr-1 h-3 w-3" />
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
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.clientIp || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

