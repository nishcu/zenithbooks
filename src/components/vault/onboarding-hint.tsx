"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Info, Upload, Key, FileText } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface OnboardingHintProps {
  type: "upload" | "share" | "logs";
  onDismiss?: () => void;
}

const hints = {
  upload: {
    icon: Upload,
    title: "Upload Your First Document",
    description: "Start by uploading your important documents. You can organize them into 14 different categories including Income Tax, GST, MCA, and more.",
    action: "Upload Document",
  },
  share: {
    icon: Key,
    title: "Share Documents Securely",
    description: "Create share codes to allow third parties (like bankers or auditors) to access specific document categories. Each code expires after 5 days for security.",
    action: "Create Share Code",
  },
  logs: {
    icon: FileText,
    title: "Track Document Access",
    description: "Monitor all access to your shared documents. View who accessed what, when, and from where.",
    action: "View Logs",
  },
};

export function OnboardingHint({ type, onDismiss }: OnboardingHintProps) {
  const [user] = useAuthState(auth);
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const checkDismissed = async () => {
      try {
        const settingsRef = doc(db, "vaultSettings", user.uid);
        const settingsDoc = await getDoc(settingsRef);
        
        const settings = settingsDoc.exists() ? settingsDoc.data() : {};
        const dismissedHints = settings.dismissedHints || {};
        
        setDismissed(dismissedHints[type] || false);
      } catch (error) {
        console.error("Error checking dismissed hints:", error);
        setDismissed(false);
      } finally {
        setLoading(false);
      }
    };

    checkDismissed();
  }, [user, type]);

  const handleDismiss = async () => {
    if (!user) return;

    try {
      const settingsRef = doc(db, "vaultSettings", user.uid);
      const settingsDoc = await getDoc(settingsRef);
      
      const currentSettings = settingsDoc.exists() ? settingsDoc.data() : {};
      const dismissedHints = currentSettings.dismissedHints || {};
      
      await setDoc(
        settingsRef,
        {
          ...currentSettings,
          dismissedHints: {
            ...dismissedHints,
            [type]: true,
          },
        },
        { merge: true }
      );
      
      setDismissed(true);
      onDismiss?.();
    } catch (error) {
      console.error("Error dismissing hint:", error);
    }
  };

  if (loading || dismissed) {
    return null;
  }

  const hint = hints[type];
  const Icon = hint.icon;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{hint.title}</CardTitle>
              <CardDescription className="mt-1">{hint.description}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleDismiss}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

