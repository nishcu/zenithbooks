"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ComplianceAssociatesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the apply page
    router.push("/compliance-associates/apply");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

