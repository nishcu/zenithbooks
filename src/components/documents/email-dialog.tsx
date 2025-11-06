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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendReportViaEmail, isValidEmail, formatEmailAddresses } from "@/lib/email-utils";

interface EmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  defaultSubject?: string;
  defaultBody?: string;
  defaultTo?: string;
}

export function EmailDialog({
  open,
  onOpenChange,
  contentRef,
  fileName,
  defaultSubject,
  defaultBody,
  defaultTo,
}: EmailDialogProps) {
  const { toast } = useToast();
  const [to, setTo] = useState(defaultTo || "");
  const [subject, setSubject] = useState(defaultSubject || fileName);
  const [body, setBody] = useState(defaultBody || `Please find attached ${fileName}.`);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    // Validate email addresses
    const emailAddresses = formatEmailAddresses(to);
    const invalidEmails = emailAddresses.filter((email) => !isValidEmail(email));

    if (emailAddresses.length === 0) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter at least one email address.",
      });
      return;
    }

    if (invalidEmails.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: `The following email addresses are invalid: ${invalidEmails.join(", ")}`,
      });
      return;
    }

    if (!contentRef.current) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find the content to send.",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        variant: "destructive",
        title: "Subject Required",
        description: "Please enter an email subject.",
      });
      return;
    }

    setIsSending(true);

    try {
      const result = await sendReportViaEmail(contentRef.current, {
        to: emailAddresses,
        subject: subject.trim(),
        body: body.trim(),
        fileName,
      });

      if (result.success) {
        toast({
          title: "Email Sent",
          description: result.message || "Your report has been sent successfully.",
        });
        onOpenChange(false);
        // Reset form
        setTo(defaultTo || "");
        setSubject(defaultSubject || fileName);
        setBody(defaultBody || `Please find attached ${fileName}.`);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Send Email",
          description: result.error || "An error occurred while sending the email.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Report via Email
          </DialogTitle>
          <DialogDescription>
            Enter the recipient email address(es) and customize the message. The report will be sent as a PDF attachment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">
              To <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email-to"
              type="text"
              placeholder="recipient@example.com (comma-separated for multiple)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSending}
              aria-label="Recipient email addresses"
              aria-required="true"
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple email addresses with commas
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email-subject"
              type="text"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
              aria-label="Email subject"
              aria-required="true"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              placeholder="Email message body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSending}
              rows={4}
              aria-label="Email message body"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

