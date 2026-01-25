"use client";

import { useState, useMemo, useContext } from "react";
import Link from "next/link";
import { 
  FileText, ShoppingBag, FilePlus, FileMinus, ShoppingCart, 
  Package, Upload, Mic, FileSpreadsheet, BookOpen, Zap,
  Receipt, TrendingUp, BarChart3, FileCheck, Archive,
  Truck, FileSignature, Wallet, Boxes, ReceiptText,
  Scale, Shield, Award, Users, FilePenLine, Building2,
  Sparkles, ArrowRight, CreditCard, Calculator
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

  // Core Features - Organized by Category (No badges on dashboard)
  const coreFeaturesByCategory = {
    automation: [
      {
        icon: Sparkles,
        title: "Smart Journal Entry",
        description: "English → Journal + GST",
        href: "/accounting/journal/smart-entry",
        highlight: true,
      },
      {
        icon: BookOpen,
        title: "Bulk Journal",
        description: "Upload journals in bulk",
        href: "/accounting/journal/bulk"
      },
      {
        icon: Upload,
        title: "Bank Reconciliation",
        description: "Auto-create entries from statements",
        href: "/accounting/bank-reconciliation"
      },
    ],
    invoicing: [
      {
        icon: Zap,
        title: "Rapid Invoice",
        description: "Fast invoice creation",
        href: "/billing/invoices/rapid"
      },
      {
        icon: FileSpreadsheet,
        title: "Bulk Invoice",
        description: "CSV / Excel upload",
        href: "/billing/invoices/bulk"
      },
      {
        icon: Mic,
        title: "Voice to Invoice",
        description: "Create invoices by voice",
        href: "/billing/invoices/voice"
      },
    ],
    taxFinance: [
      {
        icon: TrendingUp,
        title: "Asset Tax Calculator",
        description: "Capital gains for 11 assets",
        href: "/income-tax/asset-tax-calculator"
      },
      {
        icon: CreditCard,
        title: "Loan Calculator",
        description: "EMI + tax benefits",
        href: "/income-tax/loan-calculator"
      },
    ],
    compliance: [
      {
        icon: FilePenLine,
        title: "Bulk Form 16",
        description: "Multi-employee generation",
        href: "/income-tax/form-16"
      },
      {
        icon: Users,
        title: "Payroll",
        description: "Salary, PF, ESI & compliance",
        href: "/payroll"
      },
    ],
  };

  // Flatten for display
  const coreFeatures = [
    ...coreFeaturesByCategory.automation,
    ...coreFeaturesByCategory.invoicing,
    ...coreFeaturesByCategory.taxFinance,
    ...coreFeaturesByCategory.compliance,
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

        {/* Core Features - Organized by Category */}
        <div className="space-y-4 px-4">
          <h2 className="text-base font-semibold text-gray-900 px-1">Core Features</h2>
          
          {/* Smart Automation */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 px-1 flex items-center gap-2">
              <Zap className="h-4 w-4 text-pink-600" />
              Smart Automation
            </h3>
            <div className="space-y-2">
              {coreFeaturesByCategory.automation.map((feature, idx) => (
                <FeatureCard
                  key={idx}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  href={feature.href}
                  className={feature.highlight ? "border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 shadow-md" : undefined}
                />
              ))}
            </div>
          </div>

          {/* Invoicing */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 px-1 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-pink-600" />
              Invoicing
            </h3>
            <div className="space-y-2">
              {coreFeaturesByCategory.invoicing.map((feature, idx) => (
                <FeatureCard
                  key={idx}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  href={feature.href}
                />
              ))}
            </div>
          </div>

          {/* Tax & Finance */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 px-1 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-pink-600" />
              Tax & Finance
            </h3>
            <div className="space-y-2">
              {coreFeaturesByCategory.taxFinance.map((feature, idx) => (
                <FeatureCard
                  key={idx}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  href={feature.href}
                />
              ))}
            </div>
          </div>

          {/* Compliance & HR */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 px-1 flex items-center gap-2">
              <Users className="h-4 w-4 text-pink-600" />
              Compliance & HR
            </h3>
            <div className="space-y-2">
              {coreFeaturesByCategory.compliance.map((feature, idx) => (
                <FeatureCard
                  key={idx}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  href={feature.href}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Access - Super Clean */}
        <div className="space-y-3 px-4">
          <h2 className="text-base font-semibold text-gray-900 px-1">Quick Access</h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickAccessTile label="Sales" href="/billing/invoices" icon={Receipt} />
            <QuickAccessTile label="Procurement" href="/purchases" icon={ShoppingCart} />
            <QuickAccessTile label="BRS" href="/accounting/bank-reconciliation" icon={Calculator} />
            <QuickAccessTile label="Compliance" href="/gst-filings" icon={Shield} />
            <QuickAccessTile label="HR" href="/payroll" icon={Users} />
            <QuickAccessTile label="Legal" href="/legal-documents" icon={FileText} />
            <QuickAccessTile label="Certificates" href="/ca-certificates" icon={Award} />
            <QuickAccessTile label="Knowledge" href="/professional-services" icon={BookOpen} />
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

