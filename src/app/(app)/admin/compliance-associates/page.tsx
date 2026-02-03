/**
 * Admin - Compliance Associates Management
 * Manage associate registrations, approvals, and platform fee tracking
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCog, CheckCircle2, XCircle, AlertCircle, Search, Filter, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllAssociates, approveAssociate, rejectAssociate, updateAssociateStatus, getAssociateById, withCorporateMitraDefaults } from "@/lib/compliance-associates/firestore";
import type { ComplianceAssociate, AssociateStatus } from "@/lib/compliance-associates/types";

const MITRA_DISCLAIMER = "Zenith Corporate Mitra is an internal platform-defined role and not a government-authorized designation.";

export default function ComplianceAssociatesPage() {
  const { toast } = useToast();
  const [associates, setAssociates] = useState<ComplianceAssociate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssociateStatus | "all">("all");
  const [selectedAssociate, setSelectedAssociate] = useState<ComplianceAssociate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [newStatus, setNewStatus] = useState<AssociateStatus>("pending_approval");

  useEffect(() => {
    loadAssociates();
  }, [statusFilter]);

  const loadAssociates = async () => {
    setLoading(true);
    try {
      const data = statusFilter === "all" 
        ? await getAllAssociates()
        : await getAllAssociates(statusFilter);
      setAssociates(data.map(withCorporateMitraDefaults));
    } catch (error) {
      console.error("Error loading associates:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load associates",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (associateId: string) => {
    try {
      // Get current user (admin)
      const { auth } = await import("@/lib/firebase");
      const adminId = auth.currentUser?.uid || "system";
      
      await approveAssociate(associateId, adminId);
      
      toast({
        title: "Success",
        description: "Associate approved successfully",
      });
      
      setIsDialogOpen(false);
      setSelectedAssociate(null);
      loadAssociates();
    } catch (error: any) {
      console.error("Error approving associate:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve associate",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedAssociate || !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a rejection reason",
      });
      return;
    }

    try {
      const { auth } = await import("@/lib/firebase");
      const adminId = auth.currentUser?.uid || "system";
      
      await rejectAssociate(selectedAssociate.id, adminId, rejectionReason);
      
      toast({
        title: "Success",
        description: "Associate registration rejected",
      });
      
      setIsDialogOpen(false);
      setSelectedAssociate(null);
      setRejectionReason("");
      loadAssociates();
    } catch (error: any) {
      console.error("Error rejecting associate:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject associate",
      });
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedAssociate) return;

    try {
      const { auth } = await import("@/lib/firebase");
      const adminId = auth.currentUser?.uid || "system";
      
      await updateAssociateStatus(selectedAssociate.id, newStatus, adminId, rejectionReason || undefined);
      
      toast({
        title: "Success",
        description: "Associate status updated successfully",
      });
      
      setIsDialogOpen(false);
      setSelectedAssociate(null);
      setRejectionReason("");
      loadAssociates();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update status",
      });
    }
  };

  const openDialog = (associate: ComplianceAssociate, action: "approve" | "reject" | "update") => {
    setSelectedAssociate(associate);
    setNewStatus(associate.status);
    setRejectionReason("");
    setIsDialogOpen(true);
  };

  const openDetailDialog = async (associateId: string) => {
    try {
      const associate = await getAssociateById(associateId);
      if (associate) {
        setSelectedAssociate(withCorporateMitraDefaults(associate));
        setIsDetailDialogOpen(true);
      }
    } catch (error) {
      console.error("Error loading associate details:", error);
    }
  };

  const getStatusBadge = (status: AssociateStatus) => {
    const variants: Record<AssociateStatus, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending_approval: { variant: "secondary", icon: AlertCircle },
      active: { variant: "default", icon: CheckCircle2 },
      suspended: { variant: "destructive", icon: XCircle },
      inactive: { variant: "outline", icon: AlertCircle },
      rejected: { variant: "destructive", icon: XCircle },
    };
    
    const config = variants[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const filteredAssociates = associates.filter(associate => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        associate.name.toLowerCase().includes(searchLower) ||
        associate.email.toLowerCase().includes(searchLower) ||
        associate.associateCode.toLowerCase().includes(searchLower) ||
        associate.panNumber.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Zenith Corporate Mitra</h1>
        <p className="text-muted-foreground">
          Manage Corporate Mitra registrations, approvals, levels, and platform fee tracking. {MITRA_DISCLAIMER}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, email, code, or PAN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AssociateStatus | "all")}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Associates List */}
      <Card>
        <CardHeader>
          <CardTitle>Corporate Mitras ({filteredAssociates.length})</CardTitle>
          <CardDescription>All registered Zenith Corporate Mitras (internal — clients never see identity)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAssociates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No associates found
              </div>
            ) : (
              filteredAssociates.map((associate) => (
                <div
                  key={associate.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{associate.name}</h3>
                        {getStatusBadge(associate.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <strong>Code:</strong> {associate.associateCode}
                        </div>
                        <div>
                          <strong>Level:</strong> {associate.level ?? "CM-L1"}
                        </div>
                        <div>
                          <strong>Email:</strong> {associate.email}
                        </div>
                        <div>
                          <strong>Qualification:</strong> {associate.qualification}
                        </div>
                        <div>
                          <strong>Experience:</strong> {associate.yearsOfExperience} years
                        </div>
                        <div>
                          <strong>Performance Score:</strong> {(associate.performance as any)?.score ?? 50}
                        </div>
                        <div>
                          <strong>Payment Status:</strong>{" "}
                          <Badge variant={associate.platformFee.paymentStatus === "paid" ? "default" : "secondary"}>
                            {associate.platformFee.paymentStatus}
                          </Badge>
                        </div>
                        <div>
                          <strong>Tasks:</strong> {associate.tasksCompleted} completed, {associate.tasksInProgress} in progress
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailDialog(associate.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {associate.status === "pending_approval" && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(associate.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDialog(associate, "reject")}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {associate.status !== "pending_approval" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(associate, "update")}
                        >
                          <UserCog className="h-4 w-4 mr-2" />
                          Update Status
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Associate Status</DialogTitle>
            <DialogDescription>
              {selectedAssociate?.status === "pending_approval"
                ? "Review and approve or reject this associate registration"
                : "Update status for: " + selectedAssociate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAssociate?.status === "pending_approval" ? (
              <>
                <div>
                  <Label>Rejection Reason (if rejecting)</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    rows={4}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as AssociateStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                {(newStatus === "rejected" || newStatus === "suspended") && (
                  <div className="mt-4">
                    <Label>Reason</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            {selectedAssociate?.status === "pending_approval" ? (
              <>
                <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
                  Reject
                </Button>
                <Button onClick={() => handleApprove(selectedAssociate.id)}>
                  Approve
                </Button>
              </>
            ) : (
              <Button onClick={handleStatusUpdate}>Update Status</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Associate Details</DialogTitle>
            <DialogDescription>{selectedAssociate?.name} - {selectedAssociate?.associateCode}</DialogDescription>
          </DialogHeader>
          {selectedAssociate && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedAssociate.status)}</div>
                </div>
                <div>
                  <Label>Associate Code / Level</Label>
                  <p className="mt-1 font-mono">{selectedAssociate.associateCode} — {selectedAssociate.level ?? "CM-L1"}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="mt-1">{selectedAssociate.email}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="mt-1">{selectedAssociate.phone}</p>
                </div>
                <div>
                  <Label>PAN Number</Label>
                  <p className="mt-1 font-mono">{selectedAssociate.panNumber}</p>
                </div>
                <div>
                  <Label>Qualification</Label>
                  <p className="mt-1">{selectedAssociate.qualification} {selectedAssociate.otherQualification ? `(${selectedAssociate.otherQualification})` : ""}</p>
                </div>
                <div>
                  <Label>Years of Experience</Label>
                  <p className="mt-1">{selectedAssociate.yearsOfExperience} years</p>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedAssociate.platformFee.paymentStatus === "paid" ? "default" : "secondary"}>
                      {selectedAssociate.platformFee.paymentStatus}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Performance Score / Risk</Label>
                  <p className="mt-1">{(selectedAssociate.performance as any)?.score ?? 50} — {selectedAssociate.riskFlag ?? "low"}</p>
                </div>
              </div>
              <div>
                <Label>Certifications</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedAssociate.certifications && Object.entries(selectedAssociate.certifications).map(([k, v]) => (
                    <Badge key={k} variant={v ? "default" : "outline"}>{k}: {v ? "Yes" : "No"}</Badge>
                  ))}
                  {!selectedAssociate.certifications && <span className="text-sm text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <Label>Specializations</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedAssociate.specializations.map((spec) => (
                    <Badge key={spec} variant="outline">{spec}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Bank Account Details</Label>
                <div className="mt-2 space-y-1 text-sm">
                  <p><strong>Account Holder:</strong> {selectedAssociate.bankAccount.accountHolderName}</p>
                  <p><strong>Bank:</strong> {selectedAssociate.bankAccount.bankName}</p>
                  <p><strong>Account Number:</strong> {selectedAssociate.bankAccount.accountNumber}</p>
                  <p><strong>IFSC:</strong> {selectedAssociate.bankAccount.ifscCode}</p>
                </div>
              </div>
              <div>
                <Label>Activity</Label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks Completed</p>
                    <p className="text-2xl font-bold">{selectedAssociate.tasksCompleted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks In Progress</p>
                    <p className="text-2xl font-bold">{selectedAssociate.tasksInProgress}</p>
                  </div>
                </div>
              </div>
              {selectedAssociate.rejectionReason && (
                <div>
                  <Label>Rejection Reason</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedAssociate.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

