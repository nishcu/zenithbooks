/**
 * Admin: Business Registrations Management
 * Internal task queue for Compliance Associates
 */

"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Search,
  User,
  UserCog,
  Calendar,
  Building,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  BusinessRegistration,
  RegistrationStatus,
} from "@/lib/business-registrations/types";
import { getRegistrationConfig } from "@/lib/business-registrations/constants";
import { updateBusinessRegistrationStatus } from "@/lib/business-registrations/firestore";

export default function AdminBusinessRegistrationsPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<BusinessRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegistration, setSelectedRegistration] = useState<BusinessRegistration | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<RegistrationStatus>("pending_documents");
  const [internalNotes, setInternalNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [caReviewer, setCaReviewer] = useState("");
  const [sopReference, setSopReference] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  useEffect(() => {
    if (user) {
      loadRegistrations();
    }
  }, [user, statusFilter]);

  const loadRegistrations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const registrationsRef = collection(db, "business_registrations");
      let q = query(registrationsRef, orderBy("createdAt", "desc"));

      if (statusFilter !== "all") {
        q = query(
          registrationsRef,
          where("status", "==", statusFilter),
          orderBy("createdAt", "desc")
        );
      }

      const snapshot = await getDocs(q);
      const registrationsData: BusinessRegistration[] = [];

      for (const regDoc of snapshot.docs) {
        const data = regDoc.data();
        registrationsData.push({
          id: regDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
          documents: (data.documents || []).map((doc: any) => ({
            ...doc,
            uploadedAt: doc.uploadedAt?.toDate() || new Date(),
          })),
        } as BusinessRegistration);
      }

      setRegistrations(registrationsData);
    } catch (error) {
      console.error("Error loading registrations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load registrations",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedRegistration || !user) return;

    try {
      const updates: Partial<BusinessRegistration> = {
        internalNotes,
        assignedTo: assignedTo || undefined,
        caReviewer: caReviewer || undefined,
        sopReference: sopReference || undefined,
        registrationNumber: registrationNumber || undefined,
      };

      await updateBusinessRegistrationStatus(
        selectedRegistration.id,
        newStatus,
        updates
      );

      toast({
        title: "Success",
        description: "Registration status updated successfully",
      });

      setIsDialogOpen(false);
      setSelectedRegistration(null);
      setInternalNotes("");
      setAssignedTo("");
      setCaReviewer("");
      setSopReference("");
      setRegistrationNumber("");
      loadRegistrations();
    } catch (error) {
      console.error("Error updating registration:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update registration status",
      });
    }
  };

  const openUpdateDialog = (registration: BusinessRegistration) => {
    setSelectedRegistration(registration);
    setNewStatus(registration.status);
    setInternalNotes(registration.internalNotes || "");
    setAssignedTo(registration.assignedTo || "");
    setCaReviewer(registration.caReviewer || "");
    setSopReference(registration.sopReference || "");
    setRegistrationNumber(registration.registrationNumber || "");
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    const variants: Record<
      RegistrationStatus,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
    > = {
      pending_documents: { variant: "secondary", icon: Clock },
      submitted_to_team: { variant: "default", icon: FileText },
      in_progress: { variant: "default", icon: Loader2 },
      under_review: { variant: "default", icon: AlertCircle },
      completed: { variant: "outline", icon: CheckCircle2 },
      rejected: { variant: "destructive", icon: AlertCircle },
      on_hold: { variant: "secondary", icon: Clock },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  const filteredRegistrations = registrations.filter((reg) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        reg.registrationType.toLowerCase().includes(searchLower) ||
        reg.businessName?.toLowerCase().includes(searchLower) ||
        reg.firmId.toLowerCase().includes(searchLower)
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Registrations Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage business registrations assigned to ZenithBooks Compliance Team
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by registration type, business name, or client code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as RegistrationStatus | "all")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_documents">Pending Documents</SelectItem>
                <SelectItem value="submitted_to_team">Submitted to Team</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrations ({filteredRegistrations.length})</CardTitle>
          <CardDescription>
            All registrations are managed by ZenithBooks Compliance Team (ICAI-compliant)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No registrations found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegistrations.map((registration) => {
                const config = getRegistrationConfig(registration.registrationType);
                return (
                  <div
                    key={registration.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Building className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">{config.name}</h3>
                          {getStatusBadge(registration.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium text-muted-foreground">Client Code:</span>{" "}
                              <span className="font-mono text-xs">
                                {registration.firmId.substring(0, 8)}...
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">
                                (No client name - ICAI compliant)
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium text-muted-foreground">Created:</span>{" "}
                              {registration.createdAt instanceof Date
                                ? registration.createdAt.toLocaleDateString()
                                : new Date(registration.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <UserCog className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium text-muted-foreground">Assigned To:</span>{" "}
                              <span className="text-xs">
                                {registration.assignedTo || "Internal Team (Unassigned)"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium text-muted-foreground">Documents:</span>{" "}
                              <span className="text-xs">
                                {registration.documents.length}/{config.requiredDocuments.length}
                              </span>
                            </div>
                          </div>
                        </div>
                        {registration.businessName && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Business: {registration.businessName}
                          </p>
                        )}
                        {registration.registrationNumber && (
                          <p className="text-sm font-medium text-green-600 mb-2">
                            Registration Number: {registration.registrationNumber}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openUpdateDialog(registration)}
                      >
                        Update Status
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Registration Status</DialogTitle>
            <DialogDescription>
              Update the status and details for:{" "}
              {selectedRegistration &&
                getRegistrationConfig(selectedRegistration.registrationType).name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Status</Label>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as RegistrationStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_documents">Pending Documents</SelectItem>
                  <SelectItem value="submitted_to_team">Submitted to Team</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newStatus === "completed" && (
              <div>
                <Label htmlFor="registration-number">Registration Number</Label>
                <Input
                  id="registration-number"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g., GSTIN, CIN, LLPIN"
                />
              </div>
            )}

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Task Assignment (Internal)
              </h4>
              <div>
                <Label htmlFor="assigned-to">Assigned To (Zenith Corporate Mitra)</Label>
                <Input
                  id="assigned-to"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="e.g., Associate Code: AS-001 (No client names - ICAI compliant)"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sop-reference">SOP Reference</Label>
                <Input
                  id="sop-reference"
                  value={sopReference}
                  onChange={(e) => setSopReference(e.target.value)}
                  placeholder="e.g., SOP-GST-001, SOP-INC-002"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ca-reviewer">CA Reviewer (For verification)</Label>
                <Input
                  id="ca-reviewer"
                  value={caReviewer}
                  onChange={(e) => setCaReviewer(e.target.value)}
                  placeholder="e.g., CA Code: CA-001"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="internal-notes">Internal Notes</Label>
              <Textarea
                id="internal-notes"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes for this registration (SOP steps, deadlines, etc.)..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

