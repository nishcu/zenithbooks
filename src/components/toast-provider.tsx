"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { setGlobalToast } from "@/lib/error-handler";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    // Set the toast function globally so error handlers can access it
    setGlobalToast(toast);
  }, [toast]);

  return <>{children}</>;
}
