
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
import { MoreHorizontal, MailWarning, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sampleNotices = [
    { id: 'NTC-001', clientName: 'Innovate LLC', noticeType: 'GST Notice', submittedOn: new Date(2024, 7, 13), assignedTo: 'Priya Mehta', status: 'In Progress' },
    { id: 'NTC-002', clientName: 'Quantum Services', noticeType: 'Income Tax Notice', submittedOn: new Date(2024, 7, 11), assignedTo: 'Sunil Gupta', status: 'Resolved' },
    { id: 'NTC-003', clientName: 'Synergy Corp', noticeType: 'ROC Notice', submittedOn: new Date(2024, 7, 10), assignedTo: 'Unassigned', status: 'Pending Assignment' },
];

type Notice = typeof sampleNotices[number];
const professionals = ['Priya Mehta', 'Sunil Gupta', 'Rohan Sharma', 'Ananya Patel'];

export default function AdminNotices() {
  const { toast } = useToast();
  const [notices, setNotices] = useState(sampleNotices);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Notice | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [statusTarget, setStatusTarget] = useState<Notice | null>(null);
  const [newStatus, setNewStatus] = useState<Notice["status"]>("Pending Assignment");
  const [isSaving, setIsSaving] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Assignment":
        return <Badge variant="destructive">Pending Assignment</Badge>;
      case "In Progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "Resolved":
        return <Badge className="bg-green-600 hover:bg-green-700">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openDetails = (notice: Notice) => {
    setSelectedNotice(notice);
    setDetailsOpen(true);
  };

  const openAssignment = (notice: Notice) => {
    setAssignTarget(notice);
    setSelectedProfessional(notice.assignedTo === "Unassigned" ? "" : notice.assignedTo);
    setAssignmentNotes("");
  };

  const openStatusUpdate = (notice: Notice) => {
    setStatusTarget(notice);
    setNewStatus(notice.status);
  };

  const handleAssignment = async () => {
    if (!assignTarget || !selectedProfessional) {
      toast({
        variant: "destructive",
        title: "Select a professional",
        description: "Pick a professional to assign this notice.",
      });
      return;
    }
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setNotices((prev) =>
      prev.map((notice) =>
        notice.id === assignTarget.id
          ? {
              ...notice,
              assignedTo: selectedProfessional,
              status: notice.status === "Pending Assignment" ? "In Progress" : notice.status,
            }
          : notice
      )
    );
    toast({
      title: "Notice assigned",
      description: `${selectedProfessional} has been notified.`,
    });
    setIsSaving(false);
    setAssignTarget(null);
  };

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setNotices((prev) =>
      prev.map((notice) =>
        notice.id === statusTarget.id ? { ...notice, status: newStatus } : notice
      )
    );
    toast({
      title: "Status updated",
      description: `${statusTarget.clientName}'s notice is now marked as ${newStatus}.`,
    });
    setIsSaving(false);
    setStatusTarget(null);
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
              <MailWarning className="size-6 text-primary" />
          </div>
          <div>
              <h1 className="text-3xl font-bold">Submitted Notices</h1>
              <p className="text-muted-foreground">View and manage all departmental notices submitted by users.</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Submitted Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notice ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Notice Type</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((notice) => (
                  <TableRow key={notice.id}>
                    <TableCell className="font-mono">{notice.id}</TableCell>
                    <TableCell className="font-medium">{notice.clientName}</TableCell>
                    <TableCell>{notice.noticeType}</TableCell>
                    <TableCell>{format(notice.submittedOn, 'dd MMM, yyyy')}</TableCell>
                    <TableCell>{notice.assignedTo}</TableCell>
                    <TableCell>{getStatusBadge(notice.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openDetails(notice)}>View Details & Document</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openAssignment(notice)}>Assign to Professional</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openStatusUpdate(notice)}>Update Status</DropdownMenuItem>
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
          if (!open) setSelectedNotice(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notice Details</DialogTitle>
            <DialogDescription>Documents and metadata submitted by the client.</DialogDescription>
          </DialogHeader>
          {selectedNotice && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedNotice.clientName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Notice Type</p>
                  <p>{selectedNotice.noticeType}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted On</p>
                <p>{format(selectedNotice.submittedOn, 'dd MMM, yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <p>{selectedNotice.assignedTo}</p>
              </div>
              <div className="rounded-md border p-3 bg-muted/30 text-xs">
                Secure document placeholder – integrate real files when backend is ready.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAssignTarget(null);
            setIsSaving(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Notice</DialogTitle>
            <DialogDescription>Pick a professional and optionally add instructions.</DialogDescription>
          </DialogHeader>
          {assignTarget && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="font-medium">{assignTarget.clientName}</p>
              </div>
              <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                <SelectTrigger>
                  <SelectValue placeholder="Select professional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((pro) => (
                    <SelectItem key={pro} value={pro}>{pro}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Add internal notes or instructions (optional)"
                value={assignmentNotes}
                onChange={(event) => setAssignmentNotes(event.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button disabled={isSaving} onClick={handleAssignment}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
            setIsSaving(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>Reflect the current progress for this notice.</DialogDescription>
          </DialogHeader>
          {statusTarget && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{statusTarget.clientName}</p>
              <Select value={newStatus} onValueChange={(value: Notice["status"]) => setNewStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending Assignment">Pending Assignment</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button disabled={isSaving} onClick={handleStatusChange}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
