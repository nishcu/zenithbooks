
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
import { MoreHorizontal, Briefcase, ShieldCheck, Eye, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { professionals as sampleProfessionals } from '@/lib/professionals';

type Professional = {
  id: string;
  name: string;
  firm: string;
  location: string;
  joinedOn: Date;
  status: 'Verified' | 'Pending Verification';
};

const professionalsWithStatus: Professional[] = sampleProfessionals.map((p, i) => ({
    ...p,
    status: (i % 2 === 0 ? 'Verified' : 'Pending Verification') as Professional['status'],
    joinedOn: new Date(2024, 6, 15 - i * 5),
}));

export default function AdminProfessionals() {
  const [professionals, setProfessionals] = useState<Professional[]>(professionalsWithStatus);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

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
    await new Promise(resolve => setTimeout(resolve, 600));
    setProfessionals(professionals.map(p => 
      p.id === selectedProfessional.id 
        ? { ...p, status: 'Verified' as Professional['status'] }
        : p
    ));
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
    await new Promise(resolve => setTimeout(resolve, 600));
    setProfessionals(professionals.map(p => 
      p.id === selectedProfessional.id 
        ? { ...p, status: 'Pending Verification' as Professional['status'] }
        : p
    ));
    toast({
      title: "Verification Revoked",
      description: `${selectedProfessional.name}'s verification has been revoked.`,
      variant: "destructive",
    });
    setIsRevokeDialogOpen(false);
    setSelectedProfessional(null);
    setIsLoading(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <Briefcase className="size-6 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold">Manage Professionals</h1>
            <p className="text-muted-foreground">View, verify, and manage all registered professionals on the platform.</p>
        </div>
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
                {professionals.length === 0 ? (
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
                      <TableCell>{format(pro.joinedOn, 'dd MMM, yyyy')}</TableCell>
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
                <p className="text-sm font-medium">{format(selectedProfessional.joinedOn, 'dd MMM, yyyy')}</p>
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
