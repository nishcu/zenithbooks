
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, MailWarning, Eye, UserPlus, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Notice = {
  id: string;
  clientName: string;
  noticeType: string;
  submittedOn: Date;
  assignedTo: string;
  status: 'Pending Assignment' | 'In Progress' | 'Resolved';
};

const initialNotices: Notice[] = [
    { id: 'NTC-001', clientName: 'Innovate LLC', noticeType: 'GST Notice', submittedOn: new Date(2024, 7, 13), assignedTo: 'Priya Mehta', status: 'In Progress' },
    { id: 'NTC-002', clientName: 'Quantum Services', noticeType: 'Income Tax Notice', submittedOn: new Date(2024, 7, 11), assignedTo: 'Sunil Gupta', status: 'Resolved' },
    { id: 'NTC-003', clientName: 'Synergy Corp', noticeType: 'ROC Notice', submittedOn: new Date(2024, 7, 10), assignedTo: 'Unassigned', status: 'Pending Assignment' },
];

const professionals = ['Priya Mehta', 'Sunil Gupta', 'Rohan Sharma', 'Anjali Singh'];

export default function AdminNotices() {
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isUpdateStatusDialogOpen, setIsUpdateStatusDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Notice['status']>('Pending Assignment');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleViewDetails = (notice: Notice) => {
    setSelectedNotice(notice);
    setIsViewDialogOpen(true);
  };

  const handleAssign = (notice: Notice) => {
    setSelectedNotice(notice);
    setSelectedProfessional(notice.assignedTo === 'Unassigned' ? '' : notice.assignedTo);
    setIsAssignDialogOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedNotice || !selectedProfessional) return;
    setIsLoading('assign');
    await new Promise(resolve => setTimeout(resolve, 600));
    setNotices(notices.map(n => 
      n.id === selectedNotice.id 
        ? { ...n, assignedTo: selectedProfessional, status: 'In Progress' as Notice['status'] }
        : n
    ));
    toast({
      title: "Notice Assigned",
      description: `Notice ${selectedNotice.id} has been assigned to ${selectedProfessional}.`,
    });
    setIsAssignDialogOpen(false);
    setSelectedNotice(null);
    setSelectedProfessional('');
    setIsLoading(null);
  };

  const handleUpdateStatus = (notice: Notice) => {
    setSelectedNotice(notice);
    setSelectedStatus(notice.status);
    setIsUpdateStatusDialogOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedNotice) return;
    setIsLoading('status');
    await new Promise(resolve => setTimeout(resolve, 600));
    setNotices(notices.map(n => 
      n.id === selectedNotice.id 
        ? { ...n, status: selectedStatus }
        : n
    ));
    toast({
      title: "Status Updated",
      description: `Notice ${selectedNotice.id} status has been updated to ${selectedStatus}.`,
    });
    setIsUpdateStatusDialogOpen(false);
    setSelectedNotice(null);
    setIsLoading(null);
  };

  return (
    <div className="space-y-6 p-6">
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
          <CardDescription>Manage notice assignments and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Notice ID</TableHead>
                  <TableHead className="min-w-[150px]">Client</TableHead>
                  <TableHead className="min-w-[150px]">Notice Type</TableHead>
                  <TableHead className="min-w-[120px]">Submitted On</TableHead>
                  <TableHead className="min-w-[150px]">Assigned To</TableHead>
                  <TableHead className="min-w-[140px]">Status</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No notices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  notices.map((notice) => (
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => handleViewDetails(notice)} disabled={isLoading !== null}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details & Document
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAssign(notice)} disabled={isLoading !== null}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Assign to Professional
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(notice)} disabled={isLoading !== null}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Notice Details</DialogTitle>
            <DialogDescription>View complete notice information</DialogDescription>
          </DialogHeader>
          {selectedNotice && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Notice ID</Label>
                <p className="text-sm font-mono font-medium">{selectedNotice.id}</p>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <p className="text-sm font-medium">{selectedNotice.clientName}</p>
              </div>
              <div className="space-y-2">
                <Label>Notice Type</Label>
                <p className="text-sm font-medium">{selectedNotice.noticeType}</p>
              </div>
              <div className="space-y-2">
                <Label>Submitted On</Label>
                <p className="text-sm font-medium">{format(selectedNotice.submittedOn, 'dd MMM, yyyy')}</p>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <p className="text-sm font-medium">{selectedNotice.assignedTo}</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div>{getStatusBadge(selectedNotice.status)}</div>
              </div>
              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full">
                  Download Notice Document
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign to Professional</DialogTitle>
            <DialogDescription>Select a professional to assign this notice</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assign-professional">Professional</Label>
              <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                <SelectTrigger id="assign-professional">
                  <SelectValue placeholder="Select a professional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((pro) => (
                    <SelectItem key={pro} value={pro}>{pro}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} disabled={isLoading === 'assign'}>Cancel</Button>
            <Button onClick={handleSaveAssignment} disabled={!selectedProfessional || isLoading === 'assign'}>
              {isLoading === 'assign' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Notice'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={isUpdateStatusDialogOpen} onOpenChange={setIsUpdateStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>Change the status of this notice</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="update-status">Status</Label>
              <Select value={selectedStatus} onValueChange={(value: Notice['status']) => setSelectedStatus(value)}>
                <SelectTrigger id="update-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending Assignment">Pending Assignment</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateStatusDialogOpen(false)} disabled={isLoading === 'status'}>Cancel</Button>
            <Button onClick={handleSaveStatus} disabled={isLoading === 'status'}>
              {isLoading === 'status' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
