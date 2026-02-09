
"use client";

import { useState, useMemo, useContext, memo, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { IndianRupee, CreditCard, Search, Zap, Building, FileSpreadsheet, Mic, Upload, BookOpen, TrendingUp, FileText, Receipt, ShoppingCart, Calculator, Award, Scale, ConciergeBell, ArrowRight, TrendingDown, Network, Briefcase, UserPlus, Users, ClipboardList, MessageSquare, Loader2, Shield, UserCog, BarChart3, MailWarning, GraduationCap, Plus, Sparkles, FileCheck, Rocket, LayoutDashboard } from "lucide-react";
import { FinancialSummaryChart } from "@/components/dashboard/financial-summary-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { VaultSpotlight } from "@/components/dashboard/vault-spotlight";
import { getUserOrganizationData, buildOrganizationQuery } from "@/lib/organization-utils";


function DashboardContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const accountingContext = useContext(AccountingContext);
  const [user, loadingUser, authError] = useAuthState(auth);
  const [isQuickInvoiceOpen, setIsQuickInvoiceOpen] = useState(false);
  const { simulatedRole } = useRoleSimulator();
  const [viewMode, setViewMode] = useState<"business" | "ca">("business");

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

  // Determine which user ID to use for queries
  // Note: Data is automatically filtered by organizationId and clientId via buildOrganizationQuery
  // The activeClient state is for future client workspace switching feature
  const queryUserId = user?.uid;
  
  if (!accountingContext) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading accounting data">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { journalVouchers, loading: journalLoading } = accountingContext;

  // Get organization data for queries
  const [orgData, setOrgData] = useState<Awaited<ReturnType<typeof import("@/lib/organization-utils").getUserOrganizationData>>>(null);
  useEffect(() => {
    const loadOrgData = async () => {
      if (user) {
        const { getUserOrganizationData } = await import("@/lib/organization-utils");
        const data = await getUserOrganizationData(user);
        setOrgData(data);
      }
    };
    loadOrgData();
  }, [user]);

  const customersQuery = useMemo(() => {
    if (!queryUserId) return null;
    if (orgData !== null) {
      return buildOrganizationQuery('customers', user, orgData);
    }
    return query(collection(db, 'customers'), where("userId", "==", queryUserId));
  }, [queryUserId, orgData, user]);
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const vendorsQuery = useMemo(() => {
    if (!queryUserId) return null;
    if (orgData !== null) {
      return buildOrganizationQuery('vendors', user, orgData);
    }
    return query(collection(db, 'vendors'), where("userId", "==", queryUserId));
  }, [queryUserId, orgData, user]);
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

  // Core Features - Organized by Category (No badges on dashboard)
  const coreFeaturesByCategory = {
    automation: [
      {
        title: "Smart Journal Entry",
        description: "English → Journal + GST",
        icon: Sparkles,
        href: "/accounting/journal/smart-entry",
        color: "from-violet-500 to-purple-600",
      },
      {
        title: "Bulk Journal",
        description: "Upload journals in bulk",
        icon: BookOpen,
        href: "/accounting/journal/bulk",
        color: "from-purple-500 to-pink-600",
      },
      {
        title: "Bank Reconciliation",
        description: "Auto-create entries from statements",
        icon: Upload,
        href: "/accounting/bank-reconciliation",
        color: "from-cyan-500 to-blue-600",
      },
    ],
    invoicing: [
      {
        title: "Rapid Invoice",
        description: "Fast invoice creation",
        icon: Zap,
        href: "/billing/invoices/rapid",
        color: "from-yellow-500 to-orange-600",
      },
      {
        title: "Bulk Invoice",
        description: "CSV / Excel upload",
        icon: FileSpreadsheet,
        href: "/billing/invoices/bulk",
        color: "from-blue-500 to-indigo-600",
      },
      {
        title: "Voice to Invoice",
        description: "Create invoices by voice",
        icon: Mic,
        href: "/billing/invoices/voice",
        color: "from-green-500 to-teal-600",
      },
    ],
    taxFinance: [
      {
        title: "Asset Tax Calculator",
        description: "Capital gains for 11 assets",
        icon: TrendingUp,
        href: "/income-tax/asset-tax-calculator",
        color: "from-emerald-500 to-green-600",
      },
      {
        title: "Loan Calculator",
        description: "EMI + tax benefits",
        icon: CreditCard,
        href: "/income-tax/loan-calculator",
        color: "from-amber-500 to-yellow-600",
      },
      {
        title: "SIP Calculator",
        description: "Post-tax wealth projection",
        icon: BarChart3,
        href: "/income-tax/sip-calculator",
        color: "from-teal-500 to-cyan-600",
      },
    ],
    compliance: [
      {
        title: "Business Registrations",
        description: "GST, Pvt Ltd, LLP, Partnership, Udyam & more",
        icon: Building,
        href: "/business-registrations",
        color: "from-amber-500 to-orange-600",
      },
      {
        title: "Virtual CFO",
        description: "₹2,999/month – CFO support & advisory",
        icon: BarChart3,
        href: "/virtual-cfo",
        color: "from-sky-500 to-blue-600",
      },
      {
        title: "Inventory Audit",
        description: "Physical stock verification – 1/2/3 days. Travel, TA & DA separate",
        icon: ClipboardList,
        href: "/inventory-audit",
        color: "from-emerald-500 to-teal-600",
      },
      {
        title: "Founder Control Week",
        description: "One-week startup operating system – ₹9,999. Systems, not stress.",
        icon: Rocket,
        href: "/founder-control-week",
        color: "from-violet-500 to-purple-600",
      },
      {
        title: "Business Control Program",
        description: "7-day system reset – Stock, receivables, payables, cash. ₹4,999 + stock audit.",
        icon: Shield,
        href: "/business-control-program",
        color: "from-emerald-500 to-teal-600",
      },
      {
        title: "Business Driven Applications",
        description: "One app made only for your business – ₹14,999 one-time. No generic software.",
        icon: LayoutDashboard,
        href: "/business-driven-applications",
        color: "from-amber-500 to-orange-600",
      },
    ],
    hr: [
      {
        title: "Individual Form 16",
        description: "Generate Form 16 for one employee",
        icon: FileText,
        href: "/income-tax/form-16?tab=single",
        color: "from-rose-500 to-red-600",
      },
      {
        title: "Bulk Form 16",
        description: "Multi-employee generation",
        icon: FileText,
        href: "/income-tax/form-16",
        color: "from-rose-600 to-pink-600",
      },
      {
        title: "Payroll",
        description: "Salary, PF, ESI & compliance",
        icon: Users,
        href: "/payroll",
        color: "from-indigo-500 to-purple-600",
      },
    ],
  };

  // Flatten for display (organized by category)
  const coreFeatures = [
    ...coreFeaturesByCategory.automation,
    ...coreFeaturesByCategory.invoicing,
    ...coreFeaturesByCategory.taxFinance,
    ...coreFeaturesByCategory.compliance,
    ...coreFeaturesByCategory.hr,
  ];

  // Quick Access - Super Clean (No descriptions)
  const quickAccessModules = [
    { label: "Sales", href: "/billing/invoices", icon: Receipt },
    { label: "Procurement", href: "/purchases", icon: ShoppingCart },
    { label: "BRS", href: "/accounting/bank-reconciliation", icon: Calculator },
    { label: "Compliance", href: "/gst-filings", icon: Shield },
    { label: "HR", href: "/payroll", icon: Users },
    { label: "Legal", href: "/legal-documents", icon: FileText },
    { label: "Certificates", href: "/ca-certificates", icon: Award },
    { label: "Knowledge", href: "/professional-services", icon: BookOpen },
  ];

  // Quick Access Features (for backward compatibility with mobile view)
  const quickAccessFeatures = [
    {
      title: "Billing Invoices",
      description: "",
      icon: Receipt,
      href: "/billing/invoices",
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Purchases",
      description: "",
      icon: ShoppingCart,
      href: "/purchases",
      color: "from-amber-500 to-orange-600",
    },
    {
      title: "Accounting",
      description: "",
      icon: Calculator,
      href: "/accounting",
      color: "from-indigo-500 to-purple-600",
    },
    {
      title: "Certificates",
      description: "",
      icon: Award,
      href: "/ca-certificates",
      color: "from-violet-500 to-purple-600",
    },
    {
      title: "Monthly Compliance Services",
      description: "",
      icon: Shield,
      href: "/compliance-plans",
      color: "from-indigo-500 to-blue-600",
    },
    {
      title: "Business Registrations",
      description: "",
      icon: Building,
      href: "/business-registrations",
      color: "from-amber-500 to-orange-600",
    },
    {
      title: "Payments & Transactions",
      description: "View payments, invoices and transaction history",
      icon: CreditCard,
      href: "/transactions",
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Legal Documents",
      description: "",
      icon: Scale,
      href: "/legal-documents",
      color: "from-slate-500 to-gray-600",
    },
    {
      title: "Knowledge Sharing Network",
      description: "",
      icon: ConciergeBell,
      href: "/professional-services",
      color: "from-blue-500 to-cyan-600",
    },
    {
      title: "Payroll",
      description: "",
      icon: UserCog,
      href: "/payroll",
      color: "from-rose-500 to-pink-600",
    },
  ];

  // Tasks and Networking Features (for professionals)
  const tasksNetworkingFeatures = [
    {
      title: "View Collaboration Requests",
      description: "View collaboration requests where your firm is invited",
      icon: ClipboardList,
      href: "/tasks/browse",
      color: "from-blue-500 to-indigo-600",
      badge: "Invites"
    },
    {
      title: "Create Collaboration Request",
      description: "Create collaboration requests handled by platform-managed team",
      icon: Briefcase,
      href: "/tasks/post",
      color: "from-purple-500 to-pink-600",
      badge: "Request"
    },
    {
      title: "My Collaboration Requests",
      description: "View and manage your collaboration requests",
      icon: FileText,
      href: "/tasks/my-tasks",
      color: "from-emerald-500 to-teal-600",
      badge: "Manage"
    },
    {
      title: "My Invitations",
      description: "Track collaboration invitations received by your firm",
      icon: MessageSquare,
      href: "/tasks/my-applications",
      color: "from-amber-500 to-orange-600",
      badge: "Invites"
    },
    {
      title: "Create Profile",
      description: "Create or update your professional profile for internal network",
      icon: UserPlus,
      href: "/professionals/create-profile",
      color: "from-rose-500 to-red-600",
      badge: "Setup"
    },
    {
      title: "Firm Network",
      description: "View internal firm network directory (knowledge sharing only)",
      icon: Users,
      href: "/professionals/list",
      color: "from-cyan-500 to-blue-600",
      badge: "Internal"
    },
  ];

  // Knowledge Exchange Features (for professionals)
  const knowledgeFeatures = [
    {
      title: "Knowledge Feed",
      description: "Browse educational content shared by professionals",
      icon: BookOpen,
      href: "/knowledge",
      color: "from-indigo-500 to-purple-600",
      badge: "Browse"
    },
    {
      title: "Share Knowledge",
      description: "Share educational content and compliance updates",
      icon: Plus,
      href: "/knowledge/create",
      color: "from-blue-500 to-cyan-600",
      badge: "Share"
    },
  ];

  if (displayRole === 'professional' || displayRole === 'super_admin') {
      return (
          <div className="space-y-6 md:space-y-8 w-full max-w-full overflow-x-hidden min-w-0 pb-20 md:pb-0">
               {/* Mobile: Show Knowledge & Networking First, Desktop: After Client List */}
               <div className="md:hidden space-y-4">
                 {/* Knowledge Exchange Section - Mobile First */}
                 <Card className="border-2 border-indigo-300 shadow-xl bg-gradient-to-br from-indigo-5 to-purple-10">
                   <CardHeader className="pb-3">
                     <CardTitle className="text-xl flex items-center gap-2">
                       <GraduationCap className="h-5 w-5 text-indigo-600" />
                       Knowledge Exchange
                     </CardTitle>
                     <CardDescription className="text-sm mt-1">
                       Educational content for professionals (ICAI-Compliant)
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="px-4 pb-4">
                     <div className="grid grid-cols-1 gap-3">
                       {knowledgeFeatures.map((feature) => {
                         const Icon = feature.icon;
                         return (
                           <Link key={feature.href} href={feature.href}>
                             <Card className="h-full border-2 hover:border-indigo/60 group cursor-pointer bg-card">
                               <CardHeader className="pb-2 px-4 pt-4">
                                 <div className="flex items-center gap-3">
                                   <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                                     <Icon className="h-6 w-6 text-white" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <CardTitle className="text-base font-semibold group-hover:text-indigo-600 transition-colors">
                                       {feature.title}
                                     </CardTitle>
                                     <CardDescription className="text-xs mt-1 line-clamp-1">
                                       {feature.description}
                                     </CardDescription>
                                   </div>
                                   <ArrowRight className="h-5 w-5 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                 </div>
                               </CardHeader>
                             </Card>
                           </Link>
                         );
                       })}
                     </div>
                   </CardContent>
                 </Card>

                 {/* Tasks and Networking Section - Mobile */}
                 <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/5 to-primary/10">
                   <CardHeader className="pb-3">
                     <CardTitle className="text-xl flex items-center gap-2">
                       <Network className="h-5 w-5 text-primary" />
                       Tasks & Networking
                     </CardTitle>
                     <CardDescription className="text-sm mt-1">
                       Connect with businesses and grow your network
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="px-4 pb-4">
                     <div className="grid grid-cols-1 gap-3">
                       {tasksNetworkingFeatures.slice(0, 4).map((feature) => {
                         const Icon = feature.icon;
                         return (
                           <Link key={feature.href} href={feature.href}>
                             <Card className="h-full border-2 hover:border-primary/60 group cursor-pointer bg-card">
                               <CardHeader className="pb-2 px-4 pt-4">
                                 <div className="flex items-center gap-3">
                                   <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                                     <Icon className="h-6 w-6 text-white" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                                       {feature.title}
                                     </CardTitle>
                                     <CardDescription className="text-xs mt-1 line-clamp-1">
                                       {feature.description}
                                     </CardDescription>
                                   </div>
                                   <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                 </div>
                               </CardHeader>
                             </Card>
                           </Link>
                         );
                       })}
                     </div>
                     {tasksNetworkingFeatures.length > 4 && (
                       <Link href="/tasks/browse">
                         <Button variant="outline" className="w-full mt-3">
                           View All Networking Options
                           <ArrowRight className="ml-2 h-4 w-4" />
                         </Button>
                       </Link>
                     )}
                   </CardContent>
                 </Card>
               </div>

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
                        {/* Client workspace view - data is automatically filtered by clientId */}
                        <p className="text-muted-foreground">You are viewing data for {activeClient.name}. All financial data, customers, vendors, and transactions shown below are filtered to this client's workspace.</p>
                    </CardContent>
                 </Card>
               )}

              {/* Knowledge Exchange Section - Desktop View */}
              <Card className="hidden md:block border-2 border-indigo-300 shadow-xl bg-gradient-to-br from-indigo-5 to-purple-10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-indigo-600" />
                        Knowledge Exchange
                      </CardTitle>
                      <CardDescription className="mt-2 text-base">
                        Educational content for professional awareness and compliance updates (ICAI-Compliant)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 w-full max-w-full overflow-x-hidden min-w-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-4 w-full min-w-0">
                    {knowledgeFeatures.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <Link key={feature.href} href={feature.href}>
                          <Card className="h-full hover:shadow-xl hover:shadow-indigo/20 transition-all duration-300 border-2 hover:border-indigo/60 group cursor-pointer min-w-0 bg-card hover:-translate-y-1">
                            <CardHeader className="pb-3 px-4 pt-4">
                              <div className="flex items-start justify-between mb-2">
                                <Badge variant="secondary" className="text-xs shrink-0 px-1.5 py-0.5 bg-indigo/10 text-indigo-600 border-indigo/20">
                                  {feature.badge}
                                </Badge>
                              </div>
                              <div className={`w-14 h-14 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-md`}>
                                <Icon className="h-7 w-7 md:h-6 md:w-6 text-white" />
                              </div>
                              <CardTitle className="text-sm font-semibold group-hover:text-indigo-600 transition-colors leading-tight">
                                {feature.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 px-4 pb-4">
                              <CardDescription className="text-xs line-clamp-2 leading-snug text-muted-foreground">
                                {feature.description}
                              </CardDescription>
                              <div className="mt-2 flex items-center text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <span className="text-xs font-medium">Explore</span>
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

              {/* Tasks and Networking Section - Desktop View */}
              <Card className="hidden md:block border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <Network className="h-6 w-6 text-primary" />
                        Tasks & Networking
                      </CardTitle>
                      <CardDescription className="mt-2 text-base">
                        Connect with businesses, find assignments, and grow your professional network
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 w-full max-w-full overflow-x-hidden min-w-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-4 w-full min-w-0">
                    {tasksNetworkingFeatures.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <Link key={feature.href} href={feature.href}>
                          <Card className="h-full hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 border-2 hover:border-primary/60 group cursor-pointer min-w-0 bg-card hover:-translate-y-1">
                            <CardHeader className="pb-3 px-4 pt-4">
                              <div className="flex items-start justify-between mb-2">
                                <Badge variant="secondary" className="text-xs shrink-0 px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                                  {feature.badge}
                                </Badge>
                              </div>
                              <div className={`w-14 h-14 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-md`}>
                                <Icon className="h-7 w-7 md:h-6 md:w-6 text-white" />
                              </div>
                              <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors leading-tight">
                                {feature.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 px-4 pb-4">
                              <CardDescription className="text-xs line-clamp-2 leading-snug text-muted-foreground">
                                {feature.description}
                              </CardDescription>
                              <div className="mt-2 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <span className="text-xs font-medium">Explore</span>
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
                    <CardContent className="px-4 sm:px-6 w-full max-w-full overflow-x-hidden min-w-0">
                      {/* Mobile: tile-by-tile (one per row). Desktop: multi-column */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 w-full min-w-0">
                        {coreFeatures.map((feature) => {
                          const Icon = feature.icon;
                          const isHighlighted = feature.highlight;
                          return (
                            <Link key={feature.href} href={feature.href}>
                              <Card className={`h-full hover:shadow-lg transition-all duration-300 border-2 group cursor-pointer min-w-0 ${
                                isHighlighted 
                                  ? "border-violet-400 hover:border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 shadow-md hover:shadow-xl" 
                                  : "hover:border-primary/40 hover:shadow-primary/10"
                              }`}>
                                <CardHeader className="pb-3 px-4 pt-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs shrink-0 px-1.5 py-0.5 ${
                                        feature.badge === "NEW" 
                                          ? "bg-yellow-400 text-yellow-900 border-0 animate-pulse" 
                                          : ""
                                      }`}
                                    >
                                      {feature.badge}
                                    </Badge>
                                  </div>
                                  <div className={`w-14 h-14 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform ${isHighlighted ? "shadow-lg" : ""}`}>
                                    <Icon className="h-7 w-7 md:h-6 md:w-6 text-white" />
                                  </div>
                                  <CardTitle className={`text-sm font-semibold transition-colors leading-tight ${
                                    isHighlighted 
                                      ? "text-violet-700 group-hover:text-violet-800" 
                                      : "group-hover:text-primary"
                                  }`}>
                                    {feature.title}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-4 pb-4">
                                  <CardDescription className="text-xs line-clamp-2 leading-snug text-muted-foreground">
                                    {feature.description}
                                  </CardDescription>
                                  <div className={`mt-2 flex items-center transition-opacity duration-300 ${
                                    isHighlighted 
                                      ? "text-violet-600 opacity-100" 
                                      : "text-primary opacity-0 group-hover:opacity-100"
                                  }`}>
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
                      {/* Mobile: tile-by-tile (one per row). Desktop: 3x3 uniform grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                        {quickAccessFeatures.map((feature) => {
                          const Icon = feature.icon;
                          return (
                            <Link key={feature.href} href={feature.href}>
                              <Card className="h-full hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 border-2 hover:border-primary/40 group cursor-pointer min-w-0">
                                <CardHeader className="pb-3 px-4 pt-4">
                                  <div className={`w-14 h-14 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-7 w-7 md:h-6 md:w-6 text-white" />
                                  </div>
                                  <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors leading-tight">
                                    {feature.title}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-4 pb-4">
                                  {feature.description && (
                                    <CardDescription className="text-xs line-clamp-2 leading-snug text-muted-foreground">
                                      {feature.description}
                                    </CardDescription>
                                  )}
                                  <div className={`flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${feature.description ? 'mt-2' : ''}`}>
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
    <div className="space-y-10 lg:space-y-16 w-full max-w-full overflow-x-hidden px-1">
      <MarketingCarousel />

      {/* Document Vault Spotlight - Prominent */}
      <VaultSpotlight />

      {/* Once-in-a-Lifetime Business Control Program - Flagship Banner */}
      <Link href="/business-control-program">
        <Card className="border-2 border-emerald-400/60 shadow-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <CardContent className="p-6 lg:p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm flex-shrink-0">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl lg:text-3xl font-bold text-white">Once-in-a-Lifetime Business Control Program</h3>
                    <Badge className="bg-amber-400 text-amber-900 border-0 text-sm px-3 py-1">FLAGSHIP</Badge>
                  </div>
                  <p className="text-white/90 text-base lg:text-lg leading-relaxed mb-3">
                    The 7-day system reset for Indian businesses. Full control over stock, receivables, payables & cash. ₹4,999 + stock audit as applicable.
                  </p>
                  <p className="text-white/80 text-sm">
                    No SOPs, no theory — only practical control. Run with confidence.
                  </p>
                </div>
              </div>
              <div className="flex items-center text-white font-semibold text-lg group">
                <span>Know more</span>
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Smart Journal Entry - Prominent Highlight Banner */}
      <Link href="/accounting/journal/smart-entry">
        <Card className="border-2 border-violet-300/50 shadow-xl bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <CardContent className="p-6 lg:p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm flex-shrink-0">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl lg:text-3xl font-bold text-white">Smart Journal Entry</h3>
                    <Badge className="bg-yellow-400 text-yellow-900 border-0 text-sm px-3 py-1">NEW</Badge>
                  </div>
                  <p className="text-white/90 text-base lg:text-lg leading-relaxed mb-3">
                    Convert plain English narration into accurate double-entry journal entries with automatic GST calculation.
                  </p>
                  <p className="text-white/80 text-sm">
                    Example: "Paid electricity bill Rs 1800 in cash" → Auto-generates balanced entries with GST
                  </p>
                </div>
              </div>
              <div className="flex items-center text-white font-semibold text-lg group">
                <span>Try it now</span>
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Founder Control Week - Prominent Highlight Banner */}
      <Link href="/founder-control-week">
        <Card className="border-2 border-violet-400/60 shadow-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <CardContent className="p-6 lg:p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm flex-shrink-0">
                  <Rocket className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl lg:text-3xl font-bold text-white">Founder Control Week</h3>
                    <Badge className="bg-amber-400 text-amber-900 border-0 text-sm px-3 py-1">PREMIUM</Badge>
                  </div>
                  <p className="text-white/90 text-base lg:text-lg leading-relaxed mb-3">
                    One-week startup operating system. Dedicated team, end-to-end SOPs, systems implemented in 7 days — ₹9,999.
                  </p>
                  <p className="text-white/80 text-sm">
                    Run your business yourself — with systems, not stress.
                  </p>
                </div>
              </div>
              <div className="flex items-center text-white font-semibold text-lg group">
                <span>Explore</span>
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Core Features Section - Enhanced for Desktop */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Core Features</h2>
            <p className="text-lg text-muted-foreground">
              Built for speed, accuracy, and compliance
            </p>
          </div>
          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "business" | "ca")} className="w-auto">
            <TabsList>
              <TabsTrigger value="business">🧾 Business View</TabsTrigger>
              <TabsTrigger value="ca">👔 CA View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <Card className="border border-border/50 shadow-lg bg-background">
          <CardContent className="p-6 lg:p-8">
            {/* Organized by Categories - View Mode Aware */}
            <div className="space-y-8">
              {viewMode === "business" ? (
                <>
                  {/* Smart Automation */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Smart Automation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.automation.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Invoicing */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      Invoicing
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.invoicing.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tax & Finance */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Tax & Finance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.taxFinance.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Compliance */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Compliance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.compliance.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* HR */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      HR
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.hr.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* CA View: Compliance */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Compliance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.compliance.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* CA View: HR */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      HR
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.hr.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tax & Finance */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Tax & Finance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.taxFinance.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Smart Automation */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Smart Automation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.automation.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Invoicing */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      Invoicing
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreFeaturesByCategory.invoicing.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link key={feature.href} href={feature.href}>
                            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50 group cursor-pointer">
                              <CardHeader className="pb-3 px-4 pt-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors leading-tight mb-1">
                                  {feature.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 px-4 pb-4">
                                <CardDescription className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium text-sm">
                                  <span>Explore</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access - Super Clean (No descriptions) */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Quick Access</h2>
        </div>
        
        <Card className="border border-border/50 shadow-lg bg-background">
          <CardContent className="p-6 lg:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {quickAccessModules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link key={module.href} href={module.href}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="font-medium text-sm group-hover:text-primary transition-colors">{module.label}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview Section */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Financial Overview</h2>
          <p className="text-lg text-muted-foreground">
            Real-time insights into your business finances
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

        {/* Charts and Activity - Two Column Layout */}
        <div className="grid gap-8 lg:gap-12 xl:grid-cols-3 items-start">
          <div className="xl:col-span-2 space-y-8">
            {/* Enhanced Financial Chart */}
            <Card className="shadow-lg border border-border/50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Financial Trends</CardTitle>
                <CardDescription>Track your revenue and expenses over time</CardDescription>
              </CardHeader>
              <CardContent className="p-6 lg:p-8">
                <FinancialSummaryChart />
              </CardContent>
            </Card>

            {/* Enhanced Recent Activity */}
            <Card className="shadow-lg border border-border/50">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Your most recent sales invoices and transactions
                </CardDescription>
                <div className="relative pt-6">
                  <Search className="absolute left-3 top-[2.625rem] h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search recent invoices..."
                    className="pl-10 w-full lg:w-2/3 h-12 text-base border-2 focus:border-primary/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="px-6 lg:px-8 pb-6">
                <RecentActivity invoices={filteredInvoices} loading={journalLoading} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Quick Tools */}
          <div className="xl:col-span-1 space-y-6">
            {(displayRole === 'business' || displayRole === 'professional') && (
              <div className="shadow-lg">
                <VaultStatistics />
              </div>
            )}
            <div className="shadow-lg">
              <ShortcutGuide />
            </div>
            <div className="shadow-lg">
              <ComplianceCalendar />
            </div>
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
