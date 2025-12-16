
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";
import { HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc } from "firebase/firestore";
import { db, auth as firebaseAuth } from "@/lib/firebase";
import { readBrandingSettings } from "@/lib/branding";
import { useState, useEffect } from "react";
import { ZENITH_BOOKS_VERSION } from "@/lib/constants";

export function Header() {
  const pathname = usePathname();
  const [user] = useAuthState(firebaseAuth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);
  const [companyInfo, setCompanyInfo] = useState({
    name: "ZenithBooks Solutions",
    gstin: "27ABCDE1234F1Z5",
  });

  // Get company info from branding settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      const brandingSettings = readBrandingSettings();
      setCompanyInfo({
        name: brandingSettings.companyName,
        gstin: brandingSettings.gstin || "",
      });
    }
  }, []);


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        {/* Mobile Sidebar Trigger */}
        <div className="md:hidden">
          <SidebarTrigger />
        </div>

        {/* Company Info - Desktop */}
        <div className="hidden md:flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-lg font-semibold truncate">{companyInfo.name}</h1>
            <Badge variant="outline" className="hidden lg:inline-flex text-xs font-mono">
              {companyInfo.gstin}
            </Badge>
            <Badge variant="secondary" className="hidden xl:inline-flex text-xs font-mono">
              v{ZENITH_BOOKS_VERSION}
            </Badge>
          </div>
        </div>

        {/* Breadcrumbs - Desktop */}
        <div className="hidden lg:flex items-center flex-1 min-w-0">
          <Breadcrumbs />
        </div>

        {/* Search - Desktop */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <GlobalSearch />
        </div>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-0.5 md:gap-1">
          {/* Help & Support */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:flex px-2">
                <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sr-only">Help & Support</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/resources/knowledge-base">
                  <span>Knowledge Base</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app-shortcuts">
                  <span>Keyboard Shortcuts</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/contact">
                  <span>Contact Support</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <div className="flex items-center px-1">
            <NotificationsDropdown />
          </div>

          {/* Settings Quick Access */}
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex px-2">
            <Link href="/settings">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>

          {/* Theme Toggle */}
          <div className="flex items-center px-1">
            <ThemeToggle />
          </div>

          {/* User Nav */}
          <div className="flex items-center ml-1">
            <UserNav />
          </div>
        </div>
      </div>

      {/* Mobile Breadcrumbs */}
      <div className="lg:hidden border-t px-4 py-2 bg-muted/30">
        <Breadcrumbs />
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-2">
        <GlobalSearch />
      </div>
    </header>
  );
}
