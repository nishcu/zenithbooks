
"use client";

import { useState, useMemo, useContext, memo } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { IndianRupee, CreditCard, Search, Zap, Building, FileSpreadsheet, Mic, Upload, BookOpen, TrendingUp, FileText, Receipt, ShoppingCart, Calculator, Award, Scale, ConciergeBell, ArrowRight, TrendingDown } from "lucide-react";
import { FinancialSummaryChart } from "@/components/dashboard/financial-summary-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
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
import { SUPER_ADMIN_UID } from "@/lib/constants";
import { VaultStatistics } from "@/components/dashboard/vault-statistics";
import { AppDownloads } from "@/components/dashboard/app-downloads";


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
    if (user.uid === SUPER_ADMIN_UID) return 'super_admin';
    return userData?.userType || 'business'; 
  }
  const userRole = getRole();
  const displayRole = simulatedRole || userRole;

  // Determine which user ID to use for queries (the pro's or the selected client's)
  // For this prototype, we will still use the logged-in user's ID for data fetching.
  // A real implementation would switch the `userId` in queries based on `activeClient.id`.
  const queryUserId = user?.uid;
  
  if (!accountingContext) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading accounting data">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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

  // Core Features
  const coreFeatures = [
    {
      title: "Bulk Invoice",
      description: "Upload CSV/Excel to generate multiple invoices at once",
      icon: FileSpreadsheet,
      href: "/billing/invoices/bulk",
      color: "from-blue-500 to-indigo-600",
      badge: "Time Saver"
    },
    {
      title: "Bulk Journal",
      description: "Upload journal entries in bulk - perfect for non-accounting users",
      icon: BookOpen,
      href: "/accounting/journal/bulk",
      color: "from-purple-500 to-pink-600",
      badge: "Game Changer"
    },
    {
      title: "Bulk Form 16",
      description: "Generate Form 16 certificates for multiple employees in one go",
      icon: FileText,
      href: "/income-tax/form-16",
      color: "from-rose-500 to-red-600",
      badge: "Compliance"
    },
    {
      title: "Rapid Invoice",
      description: "Quick invoice entry with minimal fields",
      icon: Zap,
      href: "/billing/invoices/rapid",
      color: "from-yellow-500 to-orange-600",
      badge: "Fast"
    },
    {
      title: "Voice to Invoice",
      description: "Create invoices using voice commands - perfect for mobile users",
      icon: Mic,
      href: "/billing/invoices/voice",
      color: "from-green-500 to-teal-600",
      badge: "Innovative"
    },
    {
      title: "Bank Reconciliation",
      description: "Upload bank statements (PDF/CSV/Excel) and auto-create entries",
      icon: Upload,
      href: "/accounting/bank-reconciliation",
      color: "from-cyan-500 to-blue-600",
      badge: "Smart"
    },
  ];

  // Quick Access Features
  const quickAccessFeatures = [
    {
      title: "Billing Invoices",
      description: "Manage all your sales invoices and billing",
      icon: Receipt,
      href: "/billing/invoices",
      color: "from-emerald-500 to-teal-600",
      badge: "Sales"
    },
    {
      title: "Purchases",
      description: "Track purchase bills and orders",
      icon: ShoppingCart,
      href: "/purchases",
      color: "from-amber-500 to-orange-600",
      badge: "Procurement"
    },
    {
      title: "Accounting",
      description: "Manage your books of accounts and ledgers",
      icon: Calculator,
      href: "/accounting",
      color: "from-indigo-500 to-purple-600",
      badge: "Finance"
    },
    {
      title: "CA Certificates",
      description: "Generate various CA attested certificates",
      icon: Award,
      href: "/ca-certificates",
      color: "from-violet-500 to-purple-600",
      badge: "Certification"
    },
    {
      title: "Legal Documents",
      description: "Access and generate legal documents",
      icon: Scale,
      href: "/legal-documents",
      color: "from-slate-500 to-gray-600",
      badge: "Legal"
    },
    {
      title: "Find a Professional",
      description: "Connect with accounting and tax professionals",
      icon: ConciergeBell,
      href: "/professional-services",
      color: "from-blue-500 to-cyan-600",
      badge: "Network"
    },
  ];

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

                  {/* Core Features Section */}
                  <Card className="border-2 border-primary/20 shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <TrendingUp className="h-6 w-6 text-primary" />
                            Core Features
                          </CardTitle>
                          <CardDescription className="mt-2">
                            Powerful tools to streamline your accounting workflow
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <div className="grid gap-4 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 w-full">
                        {coreFeatures.map((feature) => {
                          const Icon = feature.icon;
                          return (
                            <Link key={feature.href} href={feature.href}>
                              <Card className="h-full hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/40 group cursor-pointer">
                                <CardHeader className="pb-3 px-4 pt-4">
                                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors leading-tight flex-1">
                                      {feature.title}
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-xs shrink-0 px-1.5 py-0.5">
                                      {feature.badge}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0 px-4 pb-4">
                                  <CardDescription className="text-xs line-clamp-2 leading-snug text-muted-foreground">
                                    {feature.description}
                                  </CardDescription>
                                  {/* Arrow icon on hover */}
                                  <div className="mt-2 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-xs font-medium">Open</span>
                                    <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Access Features Section */}
                  <Card className="border-2 border-primary/20 shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <Building className="h-6 w-6 text-primary" />
                            Quick Access
                          </CardTitle>
                          <CardDescription className="mt-2">
                            Navigate to key modules and features quickly
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 w-full max-w-full overflow-x-hidden">
                      <div className="grid gap-4 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 w-full">
                        {quickAccessFeatures.map((feature) => {
                          const Icon = feature.icon;
                          return (
                            <Link key={feature.href} href={feature.href}>
                              <Card className="h-full hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/40 group cursor-pointer min-w-0">
                                <CardHeader className="pb-3 px-4 pt-4">
                                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors leading-tight flex-1">
                                      {feature.title}
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-xs shrink-0 px-1.5 py-0.5">
                                      {feature.badge}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0 px-4 pb-4">
                                  <CardDescription className="text-xs line-clamp-2 leading-snug text-muted-foreground">
                                    {feature.description}
                                  </CardDescription>
                                  {/* Arrow icon on hover */}
                                  <div className="mt-2 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-xs font-medium">Open</span>
                                    <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Access Features Section */}
                  <Card className="border-2 border-primary/20 shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <Building className="h-6 w-6 text-primary" />
                            Quick Access
                          </CardTitle>
                          <CardDescription className="mt-2">
                            Navigate to key modules and features quickly
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 w-full max-w-full overflow-x-hidden">
                      <div className="grid gap-4 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 w-full">
                        {quickAccessFeatures.map((feature) => {
                          const Icon = feature.icon;
                          return (
                            <Link key={feature.href} href={feature.href}>
                              <Card className="h-full hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/40 group cursor-pointer min-w-0">
                                <CardHeader className="pb-3 px-4 pt-4">
                                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors leading-tight flex-1">
                                      {feature.title}
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-xs shrink-0 px-1.5 py-0.5">
                                      {feature.badge}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0 px-4 pb-4">
                                  <CardDescription className="text-xs line-clamp-2 leading-snug text-muted-foreground">
                                    {feature.description}
                                  </CardDescription>
                                  {/* Arrow icon on hover */}
                                  <div className="mt-2 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-xs font-medium">Open</span>
                                    <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mobile Apps & Version Section */}
                  <AppDownloads />

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
    <div className="space-y-8 lg:space-y-12 w-full max-w-full overflow-x-hidden">
      <MarketingCarousel />

      {/* Core Features Section - Enhanced for Desktop */}
      <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl lg:text-4xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-7 w-7 lg:h-8 lg:w-8 text-primary" />
                </div>
                Core Features
              </CardTitle>
              <CardDescription className="mt-3 text-base lg:text-lg">
                Powerful tools to streamline your accounting workflow
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 w-full">
            {coreFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href}>
                  <Card className="h-full hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50 group cursor-pointer overflow-hidden bg-gradient-to-br from-card to-muted/10 relative min-w-0">
                    <CardHeader className="pb-3 px-4 pt-4">
                      <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                        <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-white group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm lg:text-base font-semibold group-hover:text-primary transition-colors leading-tight flex-1">
                          {feature.title}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs shrink-0 bg-primary/10 text-primary border-primary/20 px-1.5 py-0.5">
                          {feature.badge}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <CardDescription className="text-xs lg:text-sm line-clamp-2 leading-snug text-muted-foreground">
                        {feature.description}
                      </CardDescription>
                      {/* Arrow icon on hover */}
                      <div className="mt-2 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs font-medium">Open</span>
                        <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Separator with decorative element */}
      <div className="relative my-8 lg:my-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/40"></div>
        </div>
        <div className="relative flex justify-center">
          <div className="bg-background px-4">
            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Quick Access Features Section - Enhanced with visual distinction */}
      <Card className="border-2 border-primary/15 shadow-xl bg-gradient-to-br from-background via-muted/5 to-background">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl lg:text-4xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building className="h-7 w-7 lg:h-8 lg:w-8 text-primary" />
                </div>
                Quick Access
              </CardTitle>
              <CardDescription className="mt-3 text-base lg:text-lg">
                Navigate to key modules and features quickly
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 w-full">
            {quickAccessFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href}>
                  <Card className="h-full hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50 group cursor-pointer overflow-hidden bg-gradient-to-br from-card to-muted/10 relative min-w-0">
                    <CardHeader className="pb-3 px-4 pt-4">
                      <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                        <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-white group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm lg:text-base font-semibold group-hover:text-primary transition-colors leading-tight flex-1">
                          {feature.title}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs shrink-0 bg-primary/10 text-primary border-primary/20 px-1.5 py-0.5">
                          {feature.badge}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <CardDescription className="text-xs lg:text-sm line-clamp-2 leading-snug text-muted-foreground">
                        {feature.description}
                      </CardDescription>
                      {/* Arrow icon on hover */}
                      <div className="mt-2 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs font-medium">Open</span>
                        <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:gap-12 xl:grid-cols-4 items-start">
        <div className="xl:col-span-3 space-y-8 lg:space-y-12">
          {/* Enhanced Stats Cards */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Link href="/accounting/ledgers" className="transform hover:scale-[1.02] transition-transform">
              <StatCard
                title="Receivables"
                value={formatCurrency(totalReceivables)}
                icon={IndianRupee}
                loading={journalLoading || customersLoading}
                trend={totalReceivables > 0 ? { value: 5.2, label: "vs last month" } : undefined}
              />
            </Link>
            <Link href="/accounting/ledgers" className="transform hover:scale-[1.02] transition-transform">
              <StatCard
                title="Payables"
                value={formatCurrency(totalPayables)}
                icon={CreditCard}
                loading={journalLoading || vendorsLoading}
                trend={totalPayables > 0 ? { value: -2.1, label: "vs last month" } : undefined}
              />
            </Link>
            <Link href="/accounting/ledgers?account=2110" className="transform hover:scale-[1.02] transition-transform">
              <StatCard
                title="GST Payable"
                value={formatCurrency(gstPayable)}
                icon={IndianRupee}
                loading={journalLoading}
                trend={gstPayable > 0 ? { value: 3.8, label: "vs last month" } : undefined}
              />
            </Link>
          </div>

          {/* Enhanced Financial Chart */}
          <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl p-6 lg:p-8 shadow-lg">
            <FinancialSummaryChart />
          </div>

          {/* Enhanced Recent Activity */}
          <Card className="shadow-xl border-2 border-muted/20 bg-gradient-to-br from-card to-muted/10">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl lg:text-2xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                Recent Activity
              </CardTitle>
              <CardDescription className="text-base">
                A summary of your most recent sales invoices.
              </CardDescription>
              <div className="relative pt-6">
                <Search className="absolute left-3 top-9 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search recent invoices..."
                  className="pl-10 w-full lg:w-1/2 h-12 text-base border-2 focus:border-primary/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="px-6 lg:px-8">
              <RecentActivity invoices={filteredInvoices} loading={journalLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Sidebar */}
        <div className="xl:col-span-1 space-y-8 lg:space-y-12">
          {(displayRole === 'business' || displayRole === 'professional') && (
            <div className="transform hover:scale-105 transition-transform">
              <VaultStatistics />
            </div>
          )}
          <div className="transform hover:scale-105 transition-transform">
            <ShortcutGuide />
          </div>
          <div className="transform hover:scale-105 transition-transform">
            <ComplianceCalendar />
          </div>
        </div>
      </div>

      {/* Mobile Apps & Version Section - Informational */}
      <AppDownloads />

      <QuickInvoiceDialog open={isQuickInvoiceOpen} onOpenChange={setIsQuickInvoiceOpen} />
    </div>
  );
}

export default memo(DashboardContent);
