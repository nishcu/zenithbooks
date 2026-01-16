/**
 * Tasks Index Page
 * Redirects to browse page
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TasksPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/tasks/browse");
  }, [router]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}

