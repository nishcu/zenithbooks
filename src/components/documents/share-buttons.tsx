
"use client";

import { Button } from "@/components/ui/button";
import { Printer, MessageSquare } from "lucide-react";
import React from "react";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";

interface ShareButtonsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  whatsappMessage?: string;
}

export function ShareButtons({ contentRef, fileName, whatsappMessage }: ShareButtonsProps) {
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

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleDownloadPdf}>
        <Printer className="mr-2" /> Download PDF
      </Button>

      {whatsappMessage && (
        <Button
          variant="outline"
          onClick={handleWhatsAppShare}
          className="bg-green-100 text-green-700 hover:bg-green-200"
        >
          <MessageSquare className="mr-2" /> Share
        </Button>
      )}
    </div>
  );
}
