/**
 * Professionals Index Page
 * Redirects to list page
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfessionalsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/professionals/list");
  }, [router]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}

