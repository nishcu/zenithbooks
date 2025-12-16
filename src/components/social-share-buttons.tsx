
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Linkedin, Twitter, Facebook, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface SocialShareButtonsProps {
  url: string;
  title: string;
}

export const SocialShareButtons = ({ url, title }: SocialShareButtonsProps) => {
  const { toast } = useToast();
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;

  const handleShare = (platform: "linkedin" | "twitter" | "facebook" | "whatsapp") => {
    let shareUrl = "";
    const encodedUrl = encodeURIComponent(fullUrl);
    const encodedTitle = encodeURIComponent(title);

    switch (platform) {
      case "linkedin":
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
        break;
    }
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => handleShare("linkedin")}>
        <Linkedin className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleShare("twitter")}>
        <Twitter className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleShare("facebook")}>
        <Facebook className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleShare("whatsapp")}>
        <MessageSquare className="size-4" />
      </Button>
    </div>
  );
};
