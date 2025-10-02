
"use client";

import { useState, useMemo, useContext, memo } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { IndianRupee, CreditCard, Search, Zap } from "lucide-react";
import { FinancialSummaryChart } from "@/components/dashboard/financial-summary-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AccountingContext } from "@/context/accounting-context";
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from "react-firebase-hooks/auth";
import { allAccounts } from "@/lib/accounts";
import { ShortcutGuide } from "@/components/dashboard/shortcut-guide";
import { Button } from "@/components/ui/button";
import { QuickInvoiceDialog } from "@/components/billing/quick-invoice-dialog";
import { MarketingCarousel } from "@/components/dashboard/marketing-carousel";
import { ComplianceCalendar } from "@/components/dashboard/compliance-calendar";

const formatCurrency = (value: number) => {
    if (isNaN(value)) return '₹0.00';
    return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function DashboardContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const accountingContext = useContext(AccountingContext);
  const [user] = useAuthState(auth);
  const [isQuickInvoiceOpen, setIsQuickInvoiceOpen] = useState(false);
  
  if (!accountingContext) {
    // This can happen briefly on initial load or if context is not provided
    return <div>Loading Accounting Data...</div>;
  }

  const { journalVouchers, loading: journalLoading } = accountingContext;

  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
  const [vendorsSnapshot, vendorsLoading] = useCollection(vendorsQuery);
  const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [vendorsSnapshot]);


  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Initialize all accounts from lists
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
  
  const totalReceivables = useMemo(() => {
    if (customersLoading || journalLoading) return 0;
    return customers.reduce((sum, customer) => {
        if (customer.id && accountBalances[customer.id]) {
            // Receivables are debit balances
            return sum + accountBalances[customer.id];
        }
        return sum;
    }, 0);
  }, [customers, accountBalances, customersLoading, journalLoading]);

  const totalPayables = useMemo(() => {
    if (vendorsLoading || journalLoading) return 0;
    return vendors.reduce((sum, vendor) => {
      if (vendor.id && accountBalances[vendor.id]) {
        // Payables are credit balances, so they will be negative in our calculation
        return sum - accountBalances[vendor.id];
      }
      return sum;
    }, 0);
  }, [vendors, accountBalances, vendorsLoading, journalLoading]);
  
  const gstPayable = accountBalances['2110'] ? -accountBalances['2110'] : 0; // GST Payable is a credit balance

  const invoices = useMemo(() => {
    return journalVouchers
        .filter(v => v && v.id && v.id.startsWith("INV-"))
        .slice(0, 5)
        .map(v => ({
            invoice: v.id,
            customer: v.narration.split(" to ")[1]?.split(" via")[0] || "N/A",
            amount: formatCurrency(v.amount),
            status: "Pending",
        }));
  }, [journalVouchers]);


  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    return invoices.filter(invoice =>
        invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoice.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  return (
    <div className="space-y-8">
      <MarketingCarousel />
      <div className="grid gap-8 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/accounting/ledgers">
              <StatCard 
                title="Receivables"
                value={formatCurrency(totalReceivables)}
                icon={IndianRupee}
                loading={journalLoading || customersLoading}
              />
            </Link>
            <Link href="/accounting/ledgers">
              <StatCard 
                title="Payables"
                value={formatCurrency(totalPayables)}
                icon={CreditCard}
                loading={journalLoading || vendorsLoading}
              />
            </Link>
            <Link href="/accounting/ledgers?account=2110">
              <StatCard 
                title="GST Payable"
                value={formatCurrency(gstPayable)}
                icon={IndianRupee}
                loading={journalLoading}
              />
            </Link>
          </div>
          <FinancialSummaryChart />
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>A summary of your most recent sales invoices.</CardDescription>
              <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search recent invoices..."
                  className="pl-8 w-full md:w-1/2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <RecentActivity invoices={filteredInvoices} loading={journalLoading} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-8 lg:col-span-1">
            <ShortcutGuide />
            <ComplianceCalendar />
        </div>
      </div>
      <QuickInvoiceDialog open={isQuickInvoiceOpen} onOpenChange={setIsQuickInvoiceOpen} />
    </div>
  );
}

export default memo(DashboardContent);
