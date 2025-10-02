
"use client";

import { useState, useMemo, useContext, memo } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { IndianRupee, CreditCard, Search, Zap, Building } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import { useRoleSimulator } from "@/context/role-simulator-context";
import { ClientList } from "@/components/admin/client-list";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { doc } from "firebase/firestore";

const SUPER_ADMIN_EMAIL = 'smr@smr.com';


function DashboardContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const accountingContext = useContext(AccountingContext);
  const [user, loadingUser, authError] = useAuthState(auth);
  const [isQuickInvoiceOpen, setIsQuickInvoiceOpen] = useState(false);
  const { simulatedRole } = useRoleSimulator();

  // --- Client Workspace State ---
  const [activeClient, setActiveClient] = useState<{ id: string, name: string } | null>(null);

  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, userLoading, userError] = useDocumentData(userDocRef);

  const getRole = () => {
    if (!user) return 'business';
    if (user.email === SUPER_ADMIN_EMAIL) return 'super_admin';
    return userData?.userType || 'business'; 
  }
  const userRole = getRole();
  const displayRole = simulatedRole || userRole;

  // Determine which user ID to use for queries (the pro's or the selected client's)
  // For this prototype, we will still use the logged-in user's ID for data fetching.
  // A real implementation would switch the `userId` in queries based on `activeClient.id`.
  const queryUserId = user?.uid;
  
  if (!accountingContext) {
    return <div>Loading Accounting Data...</div>;
  }

  const { journalVouchers, loading: journalLoading } = accountingContext;

  const customersQuery = queryUserId ? query(collection(db, 'customers'), where("userId", "==", queryUserId)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const vendorsQuery = queryUserId ? query(collection(db, 'vendors'), where("userId", "==", queryUserId)) : null;
  const [vendorsSnapshot, vendorsLoading] = useCollection(vendorsQuery);
  const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [vendorsSnapshot]);


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
  
  const totalReceivables = useMemo(() => {
    if (customersLoading || journalLoading) return 0;
    return customers.reduce((sum, customer) => {
        if (customer.id && accountBalances[customer.id]) {
            return sum + accountBalances[customer.id];
        }
        return sum;
    }, 0);
  }, [customers, accountBalances, customersLoading, journalLoading]);

  const totalPayables = useMemo(() => {
    if (vendorsLoading || journalLoading) return 0;
    return vendors.reduce((sum, vendor) => {
      if (vendor.id && accountBalances[vendor.id]) {
        return sum - accountBalances[vendor.id];
      }
      return sum;
    }, 0);
  }, [vendors, accountBalances, vendorsLoading, journalLoading]);
  
  const gstPayable = accountBalances['2110'] ? -accountBalances['2110'] : 0;

  const invoices = useMemo(() => {
    return journalVouchers
        .filter(v => v && v.id && v.id.startsWith("INV-") && !v.reverses)
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

  if (displayRole === 'professional' || displayRole === 'super_admin') {
      return (
          <div className="space-y-8">
               <ClientList onSwitchWorkspace={setActiveClient} activeClientId={activeClient?.id || null} />
                
               {activeClient && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building /> Workspace: {activeClient.name}
                        </CardTitle>
                        <CardDescription>You are currently viewing the dashboard for {activeClient.name}. All data displayed below belongs to this client.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Placeholder for client-specific dashboard content */}
                        <p className="text-muted-foreground">Client-specific dashboard components would be rendered here. For this prototype, we will show the main dashboard layout.</p>
                    </CardContent>
                 </Card>
               )}

              {/* Render the main business dashboard below the client manager */}
               <div className="space-y-8 mt-8">
                  <MarketingCarousel />
                  <div className="grid gap-8 lg:grid-cols-3 items-start">
                    <div className="lg:col-span-2 space-y-8">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Link href="/accounting/ledgers"><StatCard title="Receivables" value={formatCurrency(totalReceivables)} icon={IndianRupee} loading={journalLoading || customersLoading} /></Link>
                        <Link href="/accounting/ledgers"><StatCard title="Payables" value={formatCurrency(totalPayables)} icon={CreditCard} loading={journalLoading || vendorsLoading} /></Link>
                        <Link href="/accounting/ledgers?account=2110"><StatCard title="GST Payable" value={formatCurrency(gstPayable)} icon={IndianRupee} loading={journalLoading} /></Link>
                      </div>
                      <FinancialSummaryChart />
                    </div>
                    <div className="space-y-8 lg:col-span-1">
                        <ShortcutGuide />
                        <ComplianceCalendar />
                    </div>
                  </div>
               </div>
          </div>
      )
  }

  // Default Business Dashboard
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
