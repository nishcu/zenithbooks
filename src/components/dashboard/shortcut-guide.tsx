
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Keyboard, Receipt, BookCopy, Home, Zap, ShoppingCart, Wallet, IndianRupee, Landmark, TrendingUp, Scale, Book, Users, Warehouse, FilePlus, FileMinus } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { Separator } from "../ui/separator";

  const generalShortcuts = [
    { name: "Go to Dashboard", keys: "Esc", href: "/dashboard", icon: Home },
  ];
  
  const voucherShortcuts = [
    { name: "New Invoice", keys: "Ctrl + I", href: "/billing/invoices/new", icon: Receipt },
    { name: "New Purchase", keys: "Ctrl + P", href: "/purchases/new", icon: ShoppingCart },
    { name: "New Credit Note", keys: "Alt + N", href: "/billing/credit-notes/new", icon: FilePlus },
    { name: "New Debit Note", keys: "Ctrl + D", href: "/billing/debit-notes/new", icon: FileMinus },
    { name: "Journal Voucher", keys: "Ctrl + J", href: "/accounting/journal", icon: BookCopy },
    { name: "Receipt Voucher", keys: "Ctrl + R", href: "/accounting/vouchers/rapid", icon: Wallet },
    { name: "Payment Voucher", keys: "F5", href: "/accounting/vouchers/rapid", icon: IndianRupee },
  ];
  
  const reportShortcuts = [
      { name: "Balance Sheet", keys: "Ctrl + B", href: "/accounting/financial-statements/balance-sheet", icon: Landmark },
      { name: "Profit & Loss", keys: "Ctrl + L", href: "/accounting/financial-statements/profit-and-loss", icon: TrendingUp },
      { name: "Trial Balance", keys: "Alt + T", href: "/accounting/trial-balance", icon: Scale },
      { name: "General Ledger", keys: "Ctrl + G", href: "/accounting/ledgers", icon: Book },
  ];
  
  const masterShortcuts = [
      { name: "Parties", keys: "Alt + P", href: "/parties", icon: Users },
      { name: "Items", keys: "Alt + I", href: "/items", icon: Warehouse },
  ];

  const QuickAccessItem = ({ href, icon: Icon, name, keys }: { href: string; icon: React.ElementType; name: string; keys: string; }) => (
     <Link href={href} passHref>
        <Button variant="outline" className="w-full justify-start">
            <Icon className="mr-2" />
            {name}
            <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                {keys}
            </kbd>
        </Button>
      </Link>
  );
  
  export function ShortcutGuide() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="size-5" /> Quick Access & Shortcuts
          </CardTitle>
          <CardDescription>Use these shortcuts to navigate faster.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Navigation</h4>
                <div className="space-y-2">
                    {generalShortcuts.map(sc => <QuickAccessItem key={sc.name} {...sc} />)}
                </div>
            </div>
            <Separator />
            <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Vouchers</h4>
                <div className="space-y-2">
                    {voucherShortcuts.map(sc => <QuickAccessItem key={sc.name} {...sc} />)}
                </div>
            </div>
            <Separator />
            <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Reports</h4>
                 <div className="space-y-2">
                    {reportShortcuts.map(sc => <QuickAccessItem key={sc.name} {...sc} />)}
                </div>
            </div>
            <Separator />
             <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Masters</h4>
                 <div className="space-y-2">
                    {masterShortcuts.map(sc => <QuickAccessItem key={sc.name} {...sc} />)}
                </div>
            </div>
        </CardContent>
      </Card>
    );
  }
