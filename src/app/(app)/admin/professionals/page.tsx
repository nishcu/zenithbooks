
"use client";

import { useEffect, useMemo, useState } from "react";
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
import { MoreHorizontal, Briefcase, ShieldCheck, Eye, XCircle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

type Professional = {
  id: string;
  name: string;
  firm: string;
  location: string;
  title?: string;
  joinedOn: Date | null;
  status: 'Verified' | 'Pending Verification';
};

export default function AdminProfessionals() {
  const [user] = useAuthState(auth);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    title: "",
    firm: "",
    location: "",
  });

  const isAuthed = !!user?.uid;

  const fetchProfessionals = async () => {
    if (!isAuthed) return;
    setIsLoading("fetch");
    try {
      const res = await fetch("/api/admin/professionals", {
        headers: {
          "x-user-id": user?.uid || "",
        },
      });
      if (res.status === 403) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have super admin privileges to access this feature.",
        });
        setProfessionals([]);
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch professionals (${res.status})`);
      }
      const data = await res.json();
      const rows: Professional[] = (data?.professionals || []).map((p: any) => ({
        id: p.id,
        name: p.name || "",
        firm: p.firm || "",
        location: p.location || "",
        title: p.title || "",
        joinedOn: p.createdAt?.toDate ? p.createdAt.toDate() : (p.createdAt ? new Date(p.createdAt) : null),
        status: (p.status === "approved" ? "Verified" : "Pending Verification") as Professional["status"],
      }));
      setProfessionals(rows);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "Failed to load professionals.",
      });
    } finally {
      setIsLoading(null);
    }
  };

  useEffect(() => {
    fetchProfessionals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-green-600 hover:bg-green-700">Verified</Badge>;
      case "Pending Verification":
        return <Badge variant="destructive">Pending Verification</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewProfile = (pro: Professional) => {
    setSelectedProfessional(pro);
    setIsViewDialogOpen(true);
  };

  const handleVerify = async () => {
    if (!selectedProfessional) return;
    setIsLoading('verify');
    try {
      const response = await fetch('/api/admin/professionals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
        },
        body: JSON.stringify({
          targetProfessionalId: selectedProfessional.id,
          updates: { status: 'approved' },
        }),
      });
      if (!response.ok) throw new Error('Failed to verify professional');
      await fetchProfessionals();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to verify professional." });
      setIsLoading(null);
      return;
    }
    toast({
      title: "Professional Verified",
      description: `${selectedProfessional.name} has been verified successfully.`,
    });
    setIsVerifyDialogOpen(false);
    setSelectedProfessional(null);
    setIsLoading(null);
  };

  const handleRevokeVerification = async () => {
    if (!selectedProfessional) return;
    setIsLoading('revoke');
    try {
      const response = await fetch('/api/admin/professionals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
        },
        body: JSON.stringify({
          targetProfessionalId: selectedProfessional.id,
          updates: { status: 'pending' },
        }),
      });
      if (!response.ok) throw new Error('Failed to revoke verification');
      await fetchProfessionals();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to revoke verification." });
      setIsLoading(null);
      return;
    }
    toast({
      title: "Verification Revoked",
      description: `${selectedProfessional.name}'s verification has been revoked.`,
      variant: "destructive",
    });
    setIsRevokeDialogOpen(false);
    setSelectedProfessional(null);
    setIsLoading(null);
  };

  const handleAddProfessional = async () => {
    if (!addForm.name.trim()) {
      toast({ variant: "destructive", title: "Missing name", description: "Please enter professional name." });
      return;
    }
    setIsLoading("add");
    try {
      const response = await fetch("/api/admin/professionals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.uid || "",
        },
        body: JSON.stringify({
          name: addForm.name,
          title: addForm.title,
          firm: addForm.firm,
          location: addForm.location,
          status: "approved",
        }),
      });
      if (!response.ok) throw new Error("Failed to add professional");
      toast({ title: "Professional Added", description: "Professional has been created." });
      setIsAddDialogOpen(false);
      setAddForm({ name: "", title: "", firm: "", location: "" });
      await fetchProfessionals();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to add professional." });
    } finally {
      setIsLoading(null);
    }
  };

  const handleDeleteProfessional = async () => {
    if (!selectedProfessional) return;
    setIsLoading("delete");
    try {
      const response = await fetch("/api/admin/professionals", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.uid || "",
        },
        body: JSON.stringify({ targetProfessionalId: selectedProfessional.id }),
      });
      if (!response.ok) throw new Error("Failed to delete professional");
      toast({ title: "Professional Deleted", description: "Professional removed successfully." });
      setSelectedProfessional(null);
      setIsDeleteDialogOpen(false);
      await fetchProfessionals();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to delete professional." });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <Briefcase className="size-6 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold">Manage Professionals</h1>
            <p className="text-muted-foreground">View, verify, and manage all registered professionals on the platform.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} disabled={!isAuthed || isLoading !== null}>
          <Plus className="mr-2 h-4 w-4" /> Add Professional
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Professionals</CardTitle>
          <CardDescription>Review and verify professional accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Professional</TableHead>
                  <TableHead className="min-w-[150px]">Firm Name</TableHead>
                  <TableHead className="min-w-[150px]">Location</TableHead>
                  <TableHead className="min-w-[120px]">Joined On</TableHead>
                  <TableHead className="min-w-[140px]">Status</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading === "fetch" ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading professionals...
                    </TableCell>
                  </TableRow>
                ) : professionals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No professionals found.
                    </TableCell>
                  </TableRow>
                ) : (
                  professionals.map((pro) => (
                    <TableRow key={pro.id}>
                      <TableCell className="font-medium">{pro.name}</TableCell>
                      <TableCell>{pro.firm}</TableCell>
                      <TableCell>{pro.location}</TableCell>
                      <TableCell>{pro.joinedOn ? format(pro.joinedOn, 'dd MMM, yyyy') : '—'}</TableCell>
                      <TableCell>{getStatusBadge(pro.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => handleViewProfile(pro)} disabled={isLoading !== null}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile & Documents
                            </DropdownMenuItem>
                            {pro.status === 'Verified' ? (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedProfessional(pro);
                                  setIsRevokeDialogOpen(true);
                                }}
                                disabled={isLoading !== null}
                                className="text-destructive focus:text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Revoke Verification
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedProfessional(pro);
                                  setIsVerifyDialogOpen(true);
                                }}
                                disabled={isLoading !== null}
                                className="text-green-600 focus:text-green-700"
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Mark as Verified
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProfessional(pro);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={isLoading !== null}
                              className="text-destructive focus:text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Delete Professional
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

      {/* Add Professional Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Professional</DialogTitle>
            <DialogDescription>Create a professional profile (defaults to Verified).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full Name" />
            </div>
            <div className="space-y-2">
              <Label>Title / Qualification</Label>
              <Input value={addForm.title} onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))} placeholder="Chartered Accountant / Advocate" />
            </div>
            <div className="space-y-2">
              <Label>Firm</Label>
              <Input value={addForm.firm} onChange={(e) => setAddForm((p) => ({ ...p, firm: e.target.value }))} placeholder="Firm name" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={addForm.location} onChange={(e) => setAddForm((p) => ({ ...p, location: e.target.value }))} placeholder="City" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProfessional} disabled={isLoading === "add"}>{isLoading === "add" ? "Saving..." : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Professional Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Professional</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedProfessional?.name || "this professional"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading === "delete"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfessional}
              disabled={isLoading === "delete"}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading === "delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Profile Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Professional Profile</DialogTitle>
            <DialogDescription>View complete professional information and documents</DialogDescription>
          </DialogHeader>
          {selectedProfessional && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <p className="text-sm font-medium">{selectedProfessional.name}</p>
              </div>
              <div className="space-y-2">
                <Label>Firm Name</Label>
                <p className="text-sm font-medium">{selectedProfessional.firm}</p>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <p className="text-sm font-medium">{selectedProfessional.location}</p>
              </div>
              <div className="space-y-2">
                <Label>Joined On</Label>
                <p className="text-sm font-medium">{selectedProfessional.joinedOn ? format(selectedProfessional.joinedOn, 'dd MMM, yyyy') : '—'}</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div>{getStatusBadge(selectedProfessional.status)}</div>
              </div>
              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full">
                  View Documents
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <AlertDialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Professional</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to verify {selectedProfessional?.name}? 
              This will mark their account as verified and grant them full access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading === 'verify'}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVerify} disabled={isLoading === 'verify'} className="bg-green-600 hover:bg-green-700">
              {isLoading === 'verify' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verify Professional
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Verification Dialog */}
      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke verification for {selectedProfessional?.name}? 
              They will need to be verified again to access full platform features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading === 'revoke'}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeVerification} disabled={isLoading === 'revoke'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoading === 'revoke' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Revoke Verification
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
