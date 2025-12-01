
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

    // Check if element has content
    if (!element.innerHTML || element.innerHTML.trim() === '') {
      toast({
        variant: "destructive",
        title: "Error",
        description: "The content appears to be empty. Please ensure the page is fully loaded.",
      });
      return;
    }

    toast({
      title: "Generating PDF...",
      description: "Your document is being prepared for download.",
    });

    try {
      // Ensure content is fully loaded before generating PDF
      await new Promise(resolve => setTimeout(resolve, 500));

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          width: element.scrollWidth,
          height: element.scrollHeight,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      console.log("Generating PDF for element:", element);
      console.log("PDF options:", opt);

      await html2pdf().set(opt).from(element).save();

      toast({
        title: "PDF Generated",
        description: "Your PDF has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      console.error("Element:", element);
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: error.message || "An error occurred while generating the PDF. Please try again.",
      });
    }
  };

  const handleWhatsAppShare = async () => {
    const message = whatsappMessage || `Check out this ${fileName}`;

    // Try to use Web Share API with PDF attachment if supported
    if (navigator.share && navigator.canShare) {
      try {
        // First generate the PDF blob
        const element = contentRef.current;
        if (!element) {
          throw new Error("Content not found");
        }

        const opt = {
          margin: [0.5, 0.5, 0.5, 0.5],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');

        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // Check if we can share the file
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: shareTitle || fileName,
            text: message,
            files: [file]
          });

          toast({
            title: "Shared successfully",
            description: "Document shared with PDF attachment.",
          });
          return;
        }
      } catch (error) {
        console.error('Web Share API failed:', error);
        // Fall back to regular WhatsApp sharing
      }
    }

    // Fallback: Share via WhatsApp web with download link
    try {
      // Generate PDF and create a temporary download link
      const element = contentRef.current;
      if (!element) {
        throw new Error("Content not found");
      }

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save(fileName);

      toast({
        title: "PDF Downloaded",
        description: "PDF has been downloaded. Please attach it manually to WhatsApp.",
      });

      // Small delay to ensure download starts, then open WhatsApp
      setTimeout(() => {
        const encodedMessage = encodeURIComponent(`${message}\n\n(PDF downloaded - please attach manually)`);
        window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
      }, 1000);

    } catch (error) {
      console.error('PDF generation failed:', error);

      // Final fallback: just share the message
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");

      toast({
        title: "WhatsApp opened",
        description: "Please download the PDF and attach it manually.",
      });
    }
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
