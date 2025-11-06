
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
import React from "react";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";

interface ShareButtonsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  whatsappMessage?: string;
  emailSubject?: string;
  emailBody?: string;
  shareTitle?: string;
  showDownloadOnly?: boolean;
}

export function ShareButtons({ 
  contentRef, 
  fileName, 
  whatsappMessage,
  emailSubject,
  emailBody,
  shareTitle,
  showDownloadOnly = false
}: ShareButtonsProps) {
  const { toast } = useToast();

  const handleDownloadPdf = () => {
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

    const opt = {
      margin: 0.5,
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().from(element).set(opt).save();
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
    const subject = emailSubject || fileName;
    const body = emailBody || `Please find attached ${fileName}.`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
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
            Email
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
  );
}
