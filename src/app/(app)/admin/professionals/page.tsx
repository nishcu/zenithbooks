
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
import { MoreHorizontal, Briefcase, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { professionals as sampleProfessionals } from '@/lib/professionals';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const professionalsWithStatus = sampleProfessionals.map((p, i) => ({
    ...p,
    status: i % 2 === 0 ? 'Verified' : 'Pending Verification',
    joinedOn: new Date(2024, 6, 15 - i * 5),
}));

type Professional = typeof professionalsWithStatus[number];

export default function AdminProfessionals() {
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState(professionalsWithStatus);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    setIsDialogOpen(true);
  };

  const handleVerify = (pro: Professional) => {
    setProfessionals((prev) =>
      prev.map((item) =>
        item.id === pro.id ? { ...item, status: "Verified" } : item
      )
    );
    toast({
      title: "Professional verified",
      description: `${pro.name} now appears as verified to users.`,
    });
  };

  return (
    <>
      <div className="space-y-8">
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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Professional</TableHead>
                  <TableHead>Firm Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Joined On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals.map((pro) => (
                  <TableRow key={pro.id}>
                    <TableCell className="font-medium">{pro.name}</TableCell>
                    <TableCell>{pro.firm}</TableCell>
                    <TableCell>{pro.location}</TableCell>
                    <TableCell>{format(pro.joinedOn, 'dd MMM, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(pro.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleViewProfile(pro)}>View Profile & Documents</DropdownMenuItem>
                          {pro.status !== 'Verified' && (
                            <DropdownMenuItem onSelect={() => handleVerify(pro)}>
                              <ShieldCheck className="mr-2"/>Mark as Verified
                            </DropdownMenuItem>
                          )}
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
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedProfessional(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Professional Profile</DialogTitle>
            <DialogDescription>Review credentials and specialties before approving.</DialogDescription>
          </DialogHeader>
          {selectedProfessional && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{selectedProfessional.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Firm</p>
                  <p>{selectedProfessional.firm}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p>{selectedProfessional.location}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bio</p>
                <p>{selectedProfessional.bio}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Specialties</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedProfessional.specialties.map((spec) => (
                    <Badge key={spec} variant="outline">{spec}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
