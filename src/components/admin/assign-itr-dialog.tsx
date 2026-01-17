"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, User } from "lucide-react";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ITRApplication } from "@/lib/itr/types";

interface Professional {
  id: string;
  name: string;
  email: string;
  firm?: string;
  currentWorkload?: number;
}

interface AssignITRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: ITRApplication | null;
  onAssign: (professionalId: string) => Promise<void>;
}

export function AssignITRDialog({
  open,
  onOpenChange,
  application,
  onAssign,
}: AssignITRDialogProps) {
  const { toast } = useToast();
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch approved professionals
  const prosQuery = query(
    collection(db, "professionals"),
    where("status", "==", "approved")
  );
  const [prosSnap, prosLoading] = useCollection(prosQuery);

  const professionals: Professional[] = useMemo(() => {
    if (!prosSnap) return [];
    return prosSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          email: data.email || "",
          firm: data.firmName || data.firm || "",
          currentWorkload: 0, // TODO: Calculate actual workload from assigned applications
        };
      })
      .filter((p) => p.name); // Filter out invalid entries
  }, [prosSnap]);

  const filteredProfessionals = useMemo(() => {
    if (!searchTerm) return professionals;
    const search = searchTerm.toLowerCase();
    return professionals.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.email.toLowerCase().includes(search) ||
        p.firm?.toLowerCase().includes(search)
    );
  }, [professionals, searchTerm]);

  const selectedProfessional = professionals.find(
    (p) => p.id === selectedProfessionalId
  );

  const handleAssign = async () => {
    if (!selectedProfessionalId) {
      toast({
        title: "No Professional Selected",
        description: "Please select a professional to assign this application.",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    try {
      await onAssign(selectedProfessionalId);
      toast({
        title: "Application Assigned",
        description: `ITR application has been assigned to ZenithBooks' internal professional team.`,
      });
      onOpenChange(false);
      setSelectedProfessionalId("");
      setSearchTerm("");
    } catch (error: any) {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Pre-select if already assigned
  useEffect(() => {
    if (application?.assignedTo && open) {
      setSelectedProfessionalId(application.assignedTo);
    } else {
      setSelectedProfessionalId("");
    }
  }, [application, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign ITR Application</DialogTitle>
          <DialogDescription>
            This application will be handled by ZenithBooks' internal professional team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {application && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm font-medium">Application Details</p>
              <p className="text-xs text-muted-foreground">
                ID: {application.id.substring(0, 8)}... | FY:{" "}
                {application.financialYear} | Status: {application.status}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Search Professionals</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or firm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Internal Professional Resource *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              This task will be handled by ZenithBooks' platform-managed professional team.
            </p>
            {prosLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No professionals found
                  {searchTerm && " matching your search"}
                </p>
              </div>
            ) : (
              <Select
                value={selectedProfessionalId}
                onValueChange={setSelectedProfessionalId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a professional" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProfessionals.map((pro) => (
                    <SelectItem key={pro.id} value={pro.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{pro.name}</span>
                        {pro.firm && (
                          <span className="text-xs text-muted-foreground">
                            {pro.firm}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedProfessional && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Internal Resource Selected</p>
              <p className="text-xs text-muted-foreground">
                This application will be processed by ZenithBooks' internal professional team.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedProfessionalId || isAssigning}>
            {isAssigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              application?.assignedTo ? "Re-assign" : "Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

