"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  href: string;
  className?: string;
}

const badgeColors: Record<string, string> = {
  "Time Saver": "bg-blue-100 text-blue-700",
  "Game Changer": "bg-purple-100 text-purple-700",
  "AI Powered": "bg-green-100 text-green-700",
  "Fast": "bg-yellow-100 text-yellow-700",
  "Innovative": "bg-teal-100 text-teal-700",
  "Smart": "bg-cyan-100 text-cyan-700",
  "Compliance": "bg-rose-100 text-rose-700",
};

export function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  badge, 
  href,
  className 
}: FeatureCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block bg-white rounded-2xl p-4 border border-gray-100",
        "hover:shadow-md hover:border-pink-200 transition-all duration-200",
        "active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-blue-500">
          <Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">{title}</h3>
            {badge && (
              <Badge 
                variant="secondary" 
                className={cn("text-xs px-2 py-0.5 flex-shrink-0", badgeColors[badge] || "bg-gray-100 text-gray-700")}
              >
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

