
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Receipt, ShoppingCart, AreaChart, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/billing/invoices", label: "Sales", icon: Receipt },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/reports", label: "Reports", icon: AreaChart },
];

export function BottomNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 w-full h-20 bg-white border-t border-gray-200 shadow-lg">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-2 sm:px-4 hover:bg-gray-50 group active:bg-gray-100",
              pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))
                ? "text-pink-600"
                : "text-gray-600"
            )}
          >
            <item.icon className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
            <span className="text-sm font-medium leading-tight">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={toggleSidebar}
          type="button"
          className="inline-flex flex-col items-center justify-center px-2 sm:px-4 hover:bg-gray-50 group text-gray-600 active:bg-gray-100"
        >
          <Menu className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
          <span className="text-sm font-medium leading-tight">Menu</span>
        </button>
      </div>
    </div>
  );
}
