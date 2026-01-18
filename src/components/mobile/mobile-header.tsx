"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  financialYear?: string;
  onFinancialYearChange?: (fy: string) => void;
}

export function MobileHeader({ financialYear = "2025-26", onFinancialYearChange }: MobileHeaderProps) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const fyOptions = [
    `${nextYear - 2}-${(nextYear - 1).toString().slice(-2)}`,
    `${nextYear - 1}-${nextYear.toString().slice(-2)}`,
    `${nextYear}-${(nextYear + 1).toString().slice(-2)}`,
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="flex h-14 items-center justify-between px-4">
        {/* App Name */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900">ZenithBooks</h1>
        </div>

        {/* FY Selector & Actions */}
        <div className="flex items-center gap-3">
          {/* Financial Year Selector */}
          <Select
            value={financialYear}
            onValueChange={(value) => onFinancialYearChange?.(value)}
          >
            <SelectTrigger className="h-9 w-[100px] border-gray-300 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fyOptions.map((fy) => (
                <SelectItem key={fy} value={fy}>
                  FY {fy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Notifications - Using dropdown instead of link */}
          <NotificationsDropdown />

          {/* Profile Avatar */}
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href="/settings">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

