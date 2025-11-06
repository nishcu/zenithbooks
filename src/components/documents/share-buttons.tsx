
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer, MessageSquare, Share2, Mail, Copy, Download } from "lucide-react";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";
import { EmailDialog } from "./email-dialog";

interface ShareButtonsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  whatsappMessage?: string;
  emailSubject?: string;
  emailBody?: string;
  shareTitle?: string;
  showDownloadOnly?: boolean;
  enableEmailSend?: boolean;
}

export function ShareButtons({ 
  contentRef, 
  fileName, 
  whatsappMessage,
  emailSubject,
  emailBody,
  shareTitle,
  showDownloadOnly = false,
  enableEmailSend = true
}: ShareButtonsProps) {
  const { toast } = useToast();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  const handleDownloadPdf = async () => {
    const element = contentRef.current;
    if (!element) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find the content to download.",
      });
      return;
    }

    toast({
      title: "Generating PDF...",
      description: "Your document is being prepared for download.",
    });

    try {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(element).save();

      toast({
        title: "PDF Generated",
        description: "Your PDF has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: error.message || "An error occurred while generating the PDF. Please try again.",
      });
    }
  };

  const handleWhatsAppShare = () => {
    if (!whatsappMessage) {
      toast({
        variant: "destructive",
        title: "No message",
        description: "WhatsApp message not configured for this document.",
      });
      return;
    }
    const encodedMessage = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  const handleEmailShare = () => {
    if (enableEmailSend) {
      // Open email dialog for sending with attachment
      setIsEmailDialogOpen(true);
    } else {
      // Fallback to mailto link
      const subject = emailSubject || fileName;
      const body = emailBody || `Please find attached ${fileName}.`;
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "The page link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy link to clipboard.",
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        await navigator.share({
          title: shareTitle || fileName,
          text: whatsappMessage || `Check out this ${fileName}`,
          url: url,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to share. Please try another method.",
          });
        }
      }
    } else {
      handleCopyLink();
    }
  };

  if (showDownloadOnly) {
    return (
      <Button variant="outline" onClick={handleDownloadPdf}>
        <Download className="mr-2 h-4 w-4" /> Download PDF
      </Button>
    );
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={handleDownloadPdf}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {whatsappMessage && (
              <>
                <DropdownMenuItem onClick={handleWhatsAppShare}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleEmailShare}>
              <Mail className="mr-2 h-4 w-4" />
              {enableEmailSend ? "Email with Attachment" : "Email"}
            </DropdownMenuItem>
          {navigator.share && (
            <DropdownMenuItem onClick={handleNativeShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share via...
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      {enableEmailSend && (
        <EmailDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          contentRef={contentRef}
          fileName={fileName}
          defaultSubject={emailSubject || fileName}
          defaultBody={emailBody || `Please find attached ${fileName}.`}
        />
      )}
    </>
  );
}
