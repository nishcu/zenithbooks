"use client";

import { useState, useMemo, useContext } from "react";
import Link from "next/link";
import { 
  FileText, ShoppingBag, FilePlus, FileMinus, ShoppingCart, 
  Package, Upload, Mic, FileSpreadsheet, BookOpen, Zap,
  Receipt, TrendingUp, BarChart3, FileCheck, Archive,
  Truck, FileSignature, Wallet, Boxes
} from "lucide-react";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { SummaryCard } from "@/components/mobile/summary-card";
import { ActionTile } from "@/components/mobile/action-tile";
import { FeatureCard } from "@/components/mobile/feature-card";
import { QuickAccessTile } from "@/components/mobile/quick-access-tile";
import { VaultCard } from "@/components/mobile/vault-card";
import { AccountingContext } from "@/context/accounting-context";
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from "react-firebase-hooks/auth";
import { formatCurrency } from "@/lib/utils";
import { allAccounts } from "@/lib/accounts";

export function MobileDashboard() {
  const [financialYear, setFinancialYear] = useState("2025-26");
  const accountingContext = useContext(AccountingContext);
  const [user] = useAuthState(auth);

  const queryUserId = user?.uid;

  const customersQuery = queryUserId ? query(collection(db, 'customers'), where("userId", "==", queryUserId)) : null;
  const [customersSnapshot] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const vendorsQuery = queryUserId ? query(collection(db, 'vendors'), where("userId", "==", queryUserId)) : null;
  const [vendorsSnapshot] = useCollection(vendorsQuery);
  const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [vendorsSnapshot]);

  if (!accountingContext) return null;

  const { journalVouchers } = accountingContext;

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    allAccounts.forEach(acc => { balances[acc.code] = 0; });
    customers.forEach(c => { if(c.id) balances[c.id] = 0; });
    vendors.forEach(v => { if(v.id) balances[v.id] = 0; });
    
    journalVouchers.forEach(voucher => {
        if (!voucher || !voucher.lines) return;
        voucher.lines.forEach(line => {
            if (!balances.hasOwnProperty(line.account)) {
                balances[line.account] = 0;
            }
            const debit = parseFloat(line.debit);
            const credit = parseFloat(line.credit);
            balances[line.account] += debit - credit;
        });
    });
    return balances;
  }, [journalVouchers, customers, vendors]);

  // Calculate sales and purchases (simplified - you may need to adjust based on your account structure)
  const sales = useMemo(() => {
    return Math.abs(accountBalances['4100'] || 0);
  }, [accountBalances]);

  const purchases = useMemo(() => {
    return Math.abs(accountBalances['5100'] || 0);
  }, [accountBalances]);

  const gstPayable = accountBalances['2110'] ? -accountBalances['2110'] : 0;

  // Create Actions (2 rows × 4 icons)
  const createActions = [
    { icon: FileText, label: "Invoice", href: "/billing/invoices/new" },
    { icon: ShoppingCart, label: "Purchase", href: "/purchases/new" },
    { icon: FileCheck, label: "Quotation", href: "/billing/quotation" },
    { icon: Truck, label: "Delivery Challan", href: "/billing/delivery-challan" },
    { icon: FilePlus, label: "Credit Note", href: "/billing/credit-notes/new" },
    { icon: FileMinus, label: "Debit Note", href: "/billing/debit-notes/new" },
    { icon: ShoppingBag, label: "Sales Order", href: "/billing/sales-orders/new" },
    { icon: Package, label: "Purchase Order", href: "/purchases/purchase-orders/new" },
  ];

  // Core Features
  const coreFeatures = [
    {
      icon: FileSpreadsheet,
      title: "Bulk Invoice",
      description: "Upload Excel/CSV → Generate 100s of invoices",
      badge: "Time Saver",
      href: "/billing/invoices/bulk"
    },
    {
      icon: BookOpen,
      title: "Bulk Journal",
      description: "Upload journals in bulk (Non-accountant friendly)",
      badge: "Game Changer",
      href: "/accounting/journal/bulk"
    },
    {
      icon: Mic,
      title: "Voice to Invoice",
      description: "Speak → GST Invoice in seconds",
      badge: "AI Powered",
      href: "/billing/invoices/voice"
    },
    {
      icon: Zap,
      title: "Single Click BRS",
      description: "Auto bank reconciliation",
      badge: "Smart",
      href: "/accounting/bank-reconciliation"
    },
  ];

  // Quick Access
  const quickAccess = [
    { icon: Truck, label: "E-Way Bill", href: "/eway-bill" },
    { icon: FileSignature, label: "E-Invoice", href: "/e-invoice" },
    { icon: Wallet, label: "Payments Timeline", href: "/transactions" },
    { icon: Boxes, label: "Inventory Timeline", href: "/inventory" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: TrendingUp, label: "Insights", href: "/insights" },
    { icon: FileText, label: "Invoice Templates", href: "/billing/invoices/templates" },
    { icon: Archive, label: "Document Vault", href: "/vault" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:hidden">
      <MobileHeader financialYear={financialYear} onFinancialYearChange={setFinancialYear} />

      <div className="p-4 space-y-6">
        {/* Summary Card */}
        <SummaryCard sales={sales} purchases={purchases} gstPayable={gstPayable} />

        {/* Create Section */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 px-1">Create</h2>
          <div className="grid grid-cols-4 gap-2">
            {createActions.map((action, idx) => (
              <ActionTile
                key={idx}
                icon={action.icon}
                label={action.label}
                href={action.href}
              />
            ))}
          </div>
        </div>

        {/* Core Features */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 px-1">Core Features</h2>
          <div className="space-y-3">
            {coreFeatures.map((feature, idx) => (
              <FeatureCard
                key={idx}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                badge={feature.badge}
                href={feature.href}
              />
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 px-1">Quick Access</h2>
          <div className="grid grid-cols-4 gap-2">
            {quickAccess.map((item, idx) => (
              <QuickAccessTile
                key={idx}
                icon={item.icon}
                label={item.label}
                href={item.href}
              />
            ))}
          </div>
        </div>

        {/* Document Vault Highlight */}
        <VaultCard />
      </div>
    </div>
  );
}

