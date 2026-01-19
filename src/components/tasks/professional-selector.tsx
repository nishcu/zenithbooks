/**
 * Professional Selector Component
 * Allows selecting professionals/firms to invite to a collaboration request
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Search, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfessionalProfile } from "@/lib/professionals/types";

interface ProfessionalSelectorProps {
  selectedFirmIds: string[];
  onSelectionChange: (firmIds: string[]) => void;
  excludeFirmId?: string; // Exclude the current user's firm
}

export function ProfessionalSelector({
  selectedFirmIds,
  onSelectionChange,
  excludeFirmId,
}: ProfessionalSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Load professionals when dialog opens
  useEffect(() => {
    if (isOpen && professionals.length === 0) {
      loadProfessionals();
    }
  }, [isOpen]);

  const loadProfessionals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/professionals/list");
      const data = await response.json();

      if (data.success) {
        // Filter out excluded firm and map to firmIds
        let filtered = data.professionals;
        if (excludeFirmId) {
          filtered = filtered.filter((prof: ProfessionalProfile) => prof.userId !== excludeFirmId);
        }
        setProfessionals(filtered);
      }
    } catch (error) {
      console.error("Error loading professionals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get selected professionals for display
  // Note: selectedFirmIds contains userIds (since firmId might not be set)
  // We use userId as the firmId for backward compatibility
  const selectedProfessionals = useMemo(() => {
    return professionals.filter((prof) => {
      const profFirmId = prof.firmId || prof.userId;
      return selectedFirmIds.includes(profFirmId) || selectedFirmIds.includes(prof.userId);
    });
  }, [professionals, selectedFirmIds]);

  // Filter professionals based on search
  const filteredProfessionals = useMemo(() => {
    if (!searchTerm) return professionals;
    const term = searchTerm.toLowerCase();
    return professionals.filter(
      (prof) =>
        prof.fullName.toLowerCase().includes(term) ||
        prof.firmName?.toLowerCase().includes(term) ||
        prof.skills.some((skill) => skill.toLowerCase().includes(term))
    );
  }, [professionals, searchTerm]);

  const toggleProfessional = (prof: ProfessionalProfile) => {
    // Use firmId if available, otherwise use userId
    const firmId = prof.firmId || prof.userId;
    if (selectedFirmIds.includes(firmId) || selectedFirmIds.includes(prof.userId)) {
      // Remove both firmId and userId if either is selected
      onSelectionChange(selectedFirmIds.filter((id) => id !== firmId && id !== prof.userId));
    } else {
      onSelectionChange([...selectedFirmIds, firmId]);
    }
  };

  const removeProfessional = (prof: ProfessionalProfile) => {
    const firmId = prof.firmId || prof.userId;
    onSelectionChange(selectedFirmIds.filter((id) => id !== firmId && id !== prof.userId));
  };

  return (
    <div className="space-y-2">
      <Label>Invite Professionals (Optional)</Label>
      <div className="space-y-2">
        {/* Selected professionals badges */}
        {selectedProfessionals.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[60px]">
            {selectedProfessionals.map((prof) => (
              <Badge
                key={prof.userId}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                {prof.firmName || prof.fullName}
                <button
                  type="button"
                  onClick={() => removeProfessional(prof)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Dialog to select professionals */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              <Users className="mr-2 h-4 w-4" />
              {selectedFirmIds.length > 0
                ? `${selectedFirmIds.length} Professional${selectedFirmIds.length > 1 ? "s" : ""} Selected`
                : "Select Professionals to Invite"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Professionals to Invite</DialogTitle>
              <DialogDescription>
                Search and select professionals from your network to invite to this collaboration request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Command className="rounded-lg border">
                <CommandInput
                  placeholder="Search by name, firm, or skills..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProfessionals.length === 0 ? (
                    <CommandEmpty>No professionals found.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      <ScrollArea className="h-[300px]">
                        {filteredProfessionals.map((prof) => {
                          const profFirmId = prof.firmId || prof.userId;
                          const isSelected = selectedFirmIds.includes(profFirmId) || selectedFirmIds.includes(prof.userId);
                          return (
                            <CommandItem
                              key={prof.userId}
                              value={`${prof.fullName} ${prof.firmName || ""} ${prof.skills.join(" ")}`}
                              onSelect={() => toggleProfessional(prof)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex-1">
                                  <div className="font-medium">{prof.fullName}</div>
                                  {prof.firmName && (
                                    <div className="text-sm text-muted-foreground">
                                      {prof.firmName}
                                    </div>
                                  )}
                                  {prof.skills.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {prof.skills.slice(0, 3).join(", ")}
                                      {prof.skills.length > 3 && "..."}
                                    </div>
                                  )}
                                </div>
                                <Check
                                  className={cn(
                                    "h-4 w-4 ml-2",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </div>
                            </CommandItem>
                          );
                        })}
                      </ScrollArea>
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
              <div className="flex justify-end">
                <Button onClick={() => setIsOpen(false)}>Done</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-xs text-muted-foreground">
        Selected professionals will receive a notification about this collaboration request.
      </p>
    </div>
  );
}

