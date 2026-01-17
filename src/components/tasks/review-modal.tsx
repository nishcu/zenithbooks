/**
 * Internal Quality Feedback Modal Component
 * Private feedback after collaboration completion (ICAI-Compliant)
 */

"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Input } from "@/components/ui/input";

interface InternalQualityFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  executingFirmId: string;
  executingFirmName: string;
  onSuccess?: () => void;
}

export function InternalQualityFeedbackModal({
  open,
  onOpenChange,
  requestId,
  executingFirmId,
  executingFirmName,
  onSuccess,
}: InternalQualityFeedbackModalProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [professionalismScore, setProfessionalismScore] = useState(0);
  const [timelinessScore, setTimelinessScore] = useState(0);
  const [complianceScore, setComplianceScore] = useState(0);
  const [internalNotes, setInternalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to submit internal feedback",
      });
      return;
    }

    if (professionalismScore === 0 || timelinessScore === 0 || complianceScore === 0) {
      toast({
        variant: "destructive",
        title: "Scores required",
        description: "Please provide all quality scores (1-5)",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/collaboration/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          executingFirmId,
          professionalismScore: Number(professionalismScore),
          timelinessScore: Number(timelinessScore),
          complianceScore: Number(complianceScore),
          internalNotes: internalNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit internal feedback");
      }

      toast({
        title: "Internal feedback submitted",
        description: "Thank you for your private feedback",
      });

      setProfessionalismScore(0);
      setTimelinessScore(0);
      setComplianceScore(0);
      setInternalNotes("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit feedback",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Internal Quality Feedback</DialogTitle>
          <DialogDescription>
            Provide private internal feedback for <strong>{executingFirmName}</strong>
            <p className="text-xs text-muted-foreground mt-2">
              This feedback is private and internal only. It will never be displayed publicly.
            </p>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="professionalismScore">Professionalism Score * (1-5)</Label>
              <Input
                id="professionalismScore"
                type="number"
                min="1"
                max="5"
                value={professionalismScore || ""}
                onChange={(e) => setProfessionalismScore(Number(e.target.value))}
                placeholder="1-5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timelinessScore">Timeliness Score * (1-5)</Label>
              <Input
                id="timelinessScore"
                type="number"
                min="1"
                max="5"
                value={timelinessScore || ""}
                onChange={(e) => setTimelinessScore(Number(e.target.value))}
                placeholder="1-5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complianceScore">Compliance Score * (1-5)</Label>
              <Input
                id="complianceScore"
                type="number"
                min="1"
                max="5"
                value={complianceScore || ""}
                onChange={(e) => setComplianceScore(Number(e.target.value))}
                placeholder="1-5"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal Notes (Optional)</Label>
            <Textarea
              id="internalNotes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Private internal notes (not shared publicly)..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || professionalismScore === 0 || timelinessScore === 0 || complianceScore === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Internal Feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Legacy export for backward compatibility
export const ReviewModal = InternalQualityFeedbackModal;

