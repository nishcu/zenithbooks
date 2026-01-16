"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionTileProps {
  icon: LucideIcon;
  label: string;
  href: string;
  className?: string;
}

export function ActionTile({ icon: Icon, label, href, className }: ActionTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl",
        "bg-white border border-gray-100 hover:border-pink-200 hover:shadow-md",
        "transition-all duration-200 active:scale-95",
        className
      )}
    >
      <div className="p-3 rounded-xl bg-pink-50">
        <Icon className="h-6 w-6 text-pink-600" strokeWidth={1.5} />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
    </Link>
  );
}

