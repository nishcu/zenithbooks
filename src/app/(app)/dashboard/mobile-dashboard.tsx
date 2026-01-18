"use client";

import { useState, useMemo, useContext } from "react";
import Link from "next/link";
import { 
  FileText, ShoppingBag, FilePlus, FileMinus, ShoppingCart, 
  Package, Upload, Mic, FileSpreadsheet, BookOpen, Zap,
  Receipt, TrendingUp, BarChart3, FileCheck, Archive,
  Truck, FileSignature, Wallet, Boxes, ReceiptText,
  Scale, Shield, Award, Users, FilePenLine, Building2
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
    { icon: FileCheck, label: "Purchase Order", href: "/purchases/purchase-orders/new" },
    { icon: FilePlus, label: "Credit Note", href: "/billing/credit-notes/new" },
    { icon: FileMinus, label: "Debit Note", href: "/billing/debit-notes/new" },
    { icon: ShoppingBag, label: "Sales Order", href: "/billing/sales-orders/new" },
    { icon: Package, label: "Items", href: "/items" },
    { icon: Truck, label: "Delivery Challan", href: "/billing/invoices/new" }, // Temporary redirect to invoices until delivery challan page is created
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

  // Quick Access - Compliance & Services
  const quickAccess = [
    { icon: ReceiptText, label: "GST Filing", href: "/gst-filings" },
    { icon: FileCheck, label: "ITR Filing", href: "/itr-filing" },
    { icon: Award, label: "CA Certificates", href: "/ca-certificates" },
    { icon: Shield, label: "Legal Documents", href: "/legal-documents" },
    { icon: Users, label: "Knowledge Network", href: "/professional-services" },
    { icon: FilePenLine, label: "Form 16", href: "/income-tax/form-16" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Archive, label: "Document Vault", href: "/vault" },
  ];

  // Additional Services Section
  const additionalServices = [
    {
      icon: Scale,
      title: "Income Tax Tools",
      description: "TDS, Advance Tax, and more",
      href: "/income-tax",
      color: "bg-blue-50 text-blue-700"
    },
    {
      icon: Building2,
      title: "Accounting Suite",
      description: "Ledgers, Journals, Trial Balance",
      href: "/accounting/ledgers",
      color: "bg-purple-50 text-purple-700"
    },
    {
      icon: TrendingUp,
      title: "Financial Reports",
      description: "P&L, Balance Sheet, CMA",
      href: "/accounting/financial-statements/profit-and-loss",
      color: "bg-green-50 text-green-700"
    },
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

        {/* Additional Services Section */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900 px-1">More Services</h2>
          <div className="space-y-3">
            {additionalServices.map((service, idx) => (
              <Link
                key={idx}
                href={service.href}
                className="block"
              >
                <div className={`flex items-center gap-4 p-4 rounded-xl ${service.color} border border-current/10 hover:shadow-md transition-shadow active:scale-[0.98]`}>
                  <div className="p-2 bg-white/50 rounded-lg">
                    <service.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{service.title}</h3>
                    <p className="text-sm opacity-80 mt-0.5">{service.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Help & Support Section */}
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-200">
          <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-3">
            Our team is here to assist you with GST, ITR, accounting, and more.
          </p>
          <div className="flex gap-2">
            <Link
              href="/professional-services"
              className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium text-center hover:bg-pink-700 active:scale-95 transition-all"
            >
              Find a Professional
            </Link>
            <Link
              href="/vault"
              className="flex-1 px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium text-center border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
            >
              Document Vault
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

