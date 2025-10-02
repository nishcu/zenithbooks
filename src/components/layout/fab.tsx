
"use client";

import {
  Plus,
  Receipt,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

const actions = [
  { label: "New Invoice", icon: Receipt, href: "/billing/invoices/new" },
  { label: "New Purchase", icon: ShoppingCart, href: "/purchases/new" },
  { label: "New Payment/Receipt", icon: Wallet, href: "/accounting/vouchers/rapid" },
];

export function Fab() {
    const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-24 right-4 z-50 md:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="rounded-full h-14 w-14 shadow-lg"
          >
            <Plus className="h-6 w-6 transition-transform group-data-[state=open]:rotate-45" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-auto mb-2" side="top" align="end">
          <div className="flex flex-col gap-1">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} passHref>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen(false)}>
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
