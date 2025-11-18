
"use client";

import { useState } from "react";

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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, FileSignature, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const sampleRequests = [
    { id: 'CR-001', type: 'Net Worth Certificate', client: 'Innovate LLC', requestedBy: 'Rohan Sharma', date: new Date(2024, 7, 14), status: 'Pending' },
    { id: 'CR-002', type: 'Turnover Certificate', client: 'Quantum Services', requestedBy: 'Priya Mehta', date: new Date(2024, 7, 12), status: 'Certified' },
    { id: 'CR-003', type: 'Form 15CB', client: 'Synergy Corp', requestedBy: 'Anjali Singh', date: new Date(2024, 7, 11), status: 'Certified' },
    { id: 'CR-004', type: 'Capital Contribution', client: 'Innovate LLC', requestedBy: 'Rohan Sharma', date: new Date(2024, 7, 10), status: 'Rejected' },
];

type CertificationRequest = (typeof sampleRequests)[number] & {
  signedDocument?: string;
  rejectionReason?: string;
};

export default function AdminCertificationRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CertificationRequest[]>(sampleRequests);
  const [selectedRequest, setSelectedRequest] = useState<CertificationRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<CertificationRequest | null>(null);
  const [signedFileName, setSignedFileName] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectTarget, setRejectTarget] = useState<CertificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Certified":
        return <Badge className="bg-green-600 hover:bg-green-700">Certified</Badge>;
      case "Pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "Rejected":
         return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openDetails = (req: CertificationRequest) => {
    setSelectedRequest(req);
    setDetailsOpen(true);
  };

  const openApproveDialog = (req: CertificationRequest) => {
    setApproveTarget(req);
    setSignedFileName("");
    setApprovalNotes("");
  };

  const openRejectDialog = (req: CertificationRequest) => {
    setRejectTarget(req);
    setRejectionReason("");
  };

  const handleApprove = async () => {
    if (!approveTarget || !signedFileName) {
      toast({
        variant: "destructive",
        title: "Signed copy required",
        description: "Upload the signed certificate before approving.",
      });
      return;
    }
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setRequests((prev) =>
      prev.map((req) =>
        req.id === approveTarget.id
          ? { ...req, status: "Certified", signedDocument: signedFileName }
          : req
      )
    );
    toast({
      title: "Request certified",
      description: `${approveTarget.client} has been notified of the signed document.`,
    });
    setIsSaving(false);
    setApproveTarget(null);
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Share a short note to help the requester understand the decision.",
      });
      return;
    }
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setRequests((prev) =>
      prev.map((req) =>
        req.id === rejectTarget.id
          ? { ...req, status: "Rejected", rejectionReason }
          : req
      )
    );
    toast({
      variant: "destructive",
      title: "Request rejected",
      description: `${rejectTarget.client} will receive the reason shared.`,
    });
    setIsSaving(false);
    setRejectTarget(null);
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
              <FileSignature className="size-6 text-primary" />
          </div>
          <div>
              <h1 className="text-3xl font-bold">Certification Requests</h1>
              <p className="text-muted-foreground">Review, sign, and manage all professional certification requests.</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono">{req.id}</TableCell>
                    <TableCell className="font-medium">{req.type}</TableCell>
                    <TableCell>{req.client}</TableCell>
                    <TableCell>{req.requestedBy}</TableCell>
                    <TableCell>{format(req.date, 'dd MMM, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openDetails(req)}>View Draft Document</DropdownMenuItem>
                          <DropdownMenuItem className="text-green-600 focus:text-green-700" onSelect={() => openApproveDialog(req)}><CheckCircle className="mr-2"/>Approve & Upload Signed</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => openRejectDialog(req)}><AlertCircle className="mr-2"/>Reject</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedRequest(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Draft Document</DialogTitle>
            <DialogDescription>Review the generated draft before signing.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedRequest.client}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Document</p>
                  <p>{selectedRequest.type}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Requested By</p>
                <p>{selectedRequest.requestedBy}</p>
              </div>
              <div className="rounded-md border p-3 bg-muted/30 text-xs">
                Placeholder preview of the draft PDF. Replace with actual viewer/integration later.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
            setIsSaving(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Signed Copy</DialogTitle>
            <DialogDescription>Attach the signed certificate before marking it as certified.</DialogDescription>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="font-medium">{approveTarget.client}</p>
              </div>
              <Input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setSignedFileName(file ? file.name : "");
                }}
              />
              {signedFileName && <p className="text-xs text-muted-foreground">Selected: {signedFileName}</p>}
              <Textarea
                placeholder="Notes for requester (optional)"
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button disabled={isSaving} onClick={handleApprove}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as Certified
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setIsSaving(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Share a short note so the requester knows what to fix.</DialogDescription>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{rejectTarget.client}</p>
              <Textarea
                placeholder="Explain why this certificate cannot be signed yet..."
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" disabled={isSaving} onClick={handleReject}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
