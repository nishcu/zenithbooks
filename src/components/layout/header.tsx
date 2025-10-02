
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import { Heart } from "lucide-react";

export function Header() {
  // In a real app, this data would come from a user context or API call
  const companyInfo = {
    name: "ZenithBooks Solutions",
    gstin: "27ABCDE1234F1Z5",
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:mt-0">
      <div className="md:hidden">
        {/* This trigger is now part of the BottomNav for mobile */}
      </div>
      <div className="flex items-baseline gap-4">
         <h1 className="text-xl font-semibold hidden md:block">{companyInfo.name}</h1>
         <p className="text-sm text-muted-foreground font-mono hidden lg:block">{companyInfo.gstin}</p>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <UserNav />
      </div>
    </header>
  );
}
