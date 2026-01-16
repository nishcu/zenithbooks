"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAccessTileProps {
  icon: LucideIcon;
  label: string;
  href: string;
  className?: string;
}

export function QuickAccessTile({ icon: Icon, label, href, className }: QuickAccessTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl",
        "bg-white border border-gray-100 hover:border-pink-200 hover:shadow-sm",
        "transition-all duration-200 active:scale-95",
        className
      )}
    >
      <Icon className="h-6 w-6 text-gray-700" strokeWidth={1.5} />
      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{label}</span>
    </Link>
  );
}

