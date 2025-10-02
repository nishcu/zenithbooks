

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

import { cn } from "@/lib/utils";
import { 
    ZenithBooksLogo, Book, FileText, Gauge, Landmark, Receipt, Settings, Users, 
    Warehouse, ChevronDown, Calculator, FilePlus, FileMinus, Library, Scale, 
    BookOpen, Shield, Presentation, CalendarClock, UserSquare, BadgeDollarSign, 
    Briefcase, BadgePercent, Wallet, ShieldCheck, Award, CreditCard, Heart, 
    BookCopy, ShoppingCart, ShoppingBag, Loader2, GitCompareArrows, FileSpreadsheet, 
    Building, TrendingUp, AreaChart, ConciergeBell, LayoutDashboard, MailWarning, 
    FileSignature, Newspaper, Info, Contact, Keyboard, PieChart, Boxes, Weight, 
    Target, UserCog, FileArchive, Ticket, Edit, Save,
    ArrowRightLeft, Calendar as CalendarIcon, Eraser, IndianRupee, Construction, Bell, CalendarDays,
    Menu, Wand2, UserCheck, Banknote, Handshake, FileKey, MessageSquare, Printer, Zap,
    AlertCircle, CheckCircle, Copy, SlidersHorizontal, Settings2, BarChart3,
    ArrowRight, Upload, Download
} from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { doc } from "firebase/firestore";
import { Header } from "@/components/layout/header";
import { ClientOnly } from "@/components/client-only";
import { AccountingProvider, useAccountingContext } from "@/context/accounting-context";
import { Suspense, useEffect } from "react";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Fab } from "@/components/layout/fab";
import { RoleSimulatorProvider, useRoleSimulator } from "@/context/role-simulator-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SUPER_ADMIN_EMAIL = 'smr@smr.com';

const allMenuItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, roles: ['business', 'professional', 'super_admin'] },
  {
    label: "Billing",
    icon: Receipt,
    roles: ['business', 'professional'],
    subItems: [
      { href: "/billing/invoices", label: "Invoices", icon: Receipt, roles: ['business', 'professional'] },
      { href: "/billing/sales-orders", label: "Sales Orders", icon: ShoppingBag, roles: ['business', 'professional'] },
      { href: "/billing/credit-notes", label: "Credit Notes", icon: FilePlus, roles: ['business', 'professional'] },
      { href: "/billing/debit-notes", label: "Debit Notes", icon: FileMinus, roles: ['business', 'professional'] },
    ],
  },
  {
    label: "Purchases",
    icon: ShoppingCart,
    roles: ['business', 'professional'],
    subItems: [
        { href: "/purchases", label: "Purchase Bills", icon: ShoppingCart, roles: ['business', 'professional'] },
        { href: "/purchases/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: ['business', 'professional'] },
    ],
  },
  { href: "/parties", label: "Parties", icon: Users, roles: ['business', 'professional'] },
  {
    label: "Items",
    icon: Warehouse,
    roles: ['business', 'professional'],
    subItems: [
        { href: "/items", label: "Stock Items", icon: Warehouse, roles: ['business', 'professional'] },
        { href: "/items/stock-groups", label: "Stock Groups", icon: Boxes, roles: ['business', 'professional'] },
        { href: "/items/units", label: "Units of Measure", icon: Weight, roles: ['business', 'professional'] },
        { href: "/items/godowns", label: "Godowns / Locations", icon: Building, roles: ['business', 'professional'] },
    ]
  },
  {
    label: "GST Compliance",
    icon: FileText,
    roles: ['business', 'professional'],
    subItems: [
      { href: "/gst-filings", label: "GST Filings", icon: FileSpreadsheet, roles: ['business', 'professional'] },
      { href: "/gst-filings/gstr-9c-reconciliation", label: "GSTR-9C Reconciliation", icon: GitCompareArrows, roles: ['business', 'professional'] },
      { href: "/reconciliation", label: "Reconciliation Tools", icon: GitCompareArrows, roles: ['business', 'professional'] },
    ],
  },
  {
    label: "Income Tax",
    icon: IndianRupee,
    roles: ['business', 'professional'],
    subItems: [
      { href: "/income-tax/tds-returns", label: "TDS & TCS Returns", icon: FileText, roles: ['business', 'professional'] },
      { href: "/income-tax/advance-tax", label: "Advance Tax", icon: Calculator, roles: ['business', 'professional'] },
      { href: "/income-tax/form-16", label: "Form 16", icon: FileSignature, roles: ['business', 'professional'] },
    ],
  },
  {
    label: "Accounting",
    icon: Calculator,
    roles: ['business', 'professional'],
    subItems: [
      { href: "/accounting/chart-of-accounts", label: "Chart of Accounts", icon: Library, roles: ['business', 'professional'] },
      { 
        label: "Vouchers",
        icon: BookCopy,
        roles: ['business', 'professional'],
        subItems: [
             { href: "/accounting/vouchers", label: "Receipt & Payment", icon: Wallet, roles: ['business', 'professional'] },
             { href: "/accounting/journal", label: "Journal", icon: BookCopy, roles: ['business', 'professional'] },
        ]
      },
      { href: "/accounting/ledgers", label: "General Ledger", icon: Book, roles: ['business', 'professional'] },
      { href: "/accounting/trial-balance", label: "Trial Balance", icon: Scale, roles: ['business', 'professional'] },
      { href: "/accounting/bank-reconciliation", label: "Bank Reconciliation", icon: Landmark, roles: ['business', 'professional'] },
      { href: "/accounting/cost-centres", label: "Cost Centres", icon: PieChart, roles: ['business', 'professional'] },
      { href: "/accounting/cost-centre-summary", label: "Cost Centre Summary", icon: PieChart, roles: ['business', 'professional'] },
      { href: "/accounting/budgets", label: "Budgets & Scenarios", icon: Target, roles: ['business', 'professional']},
      {
        label: "Financial Statements",
        icon: BookOpen,
        roles: ['business', 'professional'],
        subItems: [
          { href: "/accounting/financial-statements/profit-and-loss", label: "Profit & Loss", icon: TrendingUp, roles: ['business', 'professional'] },
          { href: "/accounting/financial-statements/balance-sheet", label: "Balance Sheet", icon: Landmark, roles: ['business', 'professional'] },
        ],
      },
    ],
  },
  {
    label: "Reports",
    icon: AreaChart,
    roles: ['business', 'professional'],
    subItems: [
        { href: "/reports/cma-report", label: "CMA Report Generator", icon: Presentation, roles: ['business', 'professional'] },
        { href: "/reports/sales-analysis", label: "Sales Analysis", icon: TrendingUp, roles: ['business', 'professional'] },
        { href: "/reports/purchase-analysis", label: "Purchase Analysis", icon: ShoppingCart, roles: ['business', 'professional'] },
    ],
  },
   { 
    href: "/ca-certificates", 
    label: "CA Certificates", 
    icon: Award,
    roles: ['business', 'professional']
  },
  {
    href: "/legal-documents",
    label: "Legal Documents",
    icon: Shield,
    roles: ['business', 'professional']
  },
  {
    href: "/professional-services",
    label: "Find a Professional",
    icon: ConciergeBell,
    roles: ['business', 'professional', 'super_admin']
  },
   { href: "/notices", label: "Handle Notices", icon: MailWarning, roles: ['business', 'professional'] },
  {
    label: "Payroll",
    icon: UserCog,
    roles: ['business', 'professional'],
    subItems: [
      { href: "/payroll", label: "Payroll Dashboard", icon: LayoutDashboard, roles: ['business', 'professional'] },
      { href: "/payroll/employees", label: "Employees", icon: Users, roles: ['business', 'professional'] },
      { href: "/payroll/run-payroll", label: "Run Payroll", icon: FileText, roles: ['business', 'professional'] },
      { href: "/payroll/reports", label: "Compliance Reports", icon: FileArchive, roles: ['business', 'professional'] },
      { href: "/payroll/settings", label: "Settings", icon: Settings, roles: ['business', 'professional'] },
    ],
  },
  { href: "/import-export", label: "Import & Export", icon: Download, roles: ['business', 'professional'] },
  {
    label: "Resources",
    icon: Info,
    roles: ['business', 'professional', 'super_admin'],
    subItems: [
        { href: "/resources/knowledge-base", label: "Knowledge Base", icon: BookOpen, roles: ['business', 'professional', 'super_admin'] },
        { href: "/my-documents", label: "My Documents", icon: FileArchive, roles: ['business', 'professional'] },
        { href: "/about", label: "About Us", icon: Info, roles: ['business', 'professional', 'super_admin'] },
        { href: "/blog", label: "Blog", icon: Newspaper, roles: ['business', 'professional', 'super_admin'] },
        { href: "/app-shortcuts", label: "App Shortcuts", icon: Keyboard, roles: ['business', 'professional', 'super_admin'] },
        { href: "/contact", label: "Contact Us", icon: Contact, roles: ['business', 'professional', 'super_admin'] },
    ],
  },
  {
    label: "Settings", 
    icon: Settings,
    roles: ['business', 'professional', 'super_admin'],
    subItems: [
      { href: "/settings/branding", label: "Company Branding", icon: Building, roles: ['business', 'professional', 'super_admin'] },
      { href: "/settings/users", label: "User Management", icon: Users, roles: ['business', 'professional', 'super_admin'] },
      { href: "/settings/professional-profile", label: "Professional Profile", icon: Briefcase, roles: ['professional'] },
    ],
  },
  {
    label: "Admin",
    icon: ShieldCheck,
    roles: ['super_admin'],
    subItems: [
        { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard, roles: ['super_admin']},
        {
          label: "Pricing & Plans",
          icon: BadgeDollarSign,
          roles: ['super_admin'],
          subItems: [
            { href: "/pricing", label: "Subscription Plans", icon: BadgeDollarSign, roles: ['super_admin']},
            { href: "/admin/service-pricing", label: "On-Demand Services", icon: CreditCard, roles: ['super_admin']},
            { href: "/admin/coupons", label: "Coupons & Discounts", icon: Ticket, roles: ['super_admin']},
          ],
        },
        { href: "/admin/subscribers", label: "Subscribers", icon: BadgeDollarSign, roles: ['super_admin']},
        { href: "/admin/users", label: "All Users", icon: Users, roles: ['super_admin']},
        { href: "/admin/professionals", label: "Professionals", icon: UserSquare, roles: ['super_admin']},
        { href: "/admin/appointments", label: "Appointments", icon: CalendarClock, roles: ['super_admin']},
        { href: "/admin/notices", label: "Submitted Notices", icon: MailWarning, roles: ['super_admin']},
        { href: "/admin/certification-requests", label: "Certification Requests", icon: FileSignature, roles: ['super_admin']},
        { href: "/admin/blog", label: "Manage Blog", icon: Newspaper, roles: ['super_admin'] },
    ]
  },
];

const CollapsibleMenuItem = ({ item, pathname }: { item: any, pathname: string }) => {
  const [isOpen, setIsOpen] = React.useState(
    item.subItems?.some((subItem: any) => pathname.startsWith(subItem.href)) || false
  );

  React.useEffect(() => {
    const checkActive = (subItems: any[]): boolean => {
        return subItems.some(sub => 
            (sub.href && pathname.startsWith(sub.href)) || 
            (sub.subItems && checkActive(sub.subItems))
        );
    };
    setIsOpen(checkActive(item.subItems));
  }, [pathname, item.subItems]);
  
  return (
    <Collapsible className="w-full" open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton size="lg" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem: any, index: number) => (
                <SidebarMenuSubItem key={index}>
                  {subItem.subItems ? (
                    <CollapsibleMenuItem item={subItem} pathname={pathname} />
                  ) : (
                    <Link href={subItem.href} passHref>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith(subItem.href)}
                        className="w-full"
                      >
                        <span className="flex w-full items-center gap-2">
                          {subItem.icon && <subItem.icon className="h-4 w-4" />}
                          <span>{subItem.label}</span>
                        </span>
                      </SidebarMenuSubButton>
                    </Link>
                  )}
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
        </CollapsibleContent>
    </Collapsible>
  );
};

const quickHelpQuestions = [
    { question: "How do I create an invoice?", href: "/resources/knowledge-base/billing" },
    { question: "Where do I see my GST liability?", href: "/resources/knowledge-base/gst-filings" },
    { question: "How to reconcile ITC?", href: "/reconciliation" },
    { question: "What is a Journal Voucher?", href: "/resources/knowledge-base/accounting" },
    { question: "How do I export my reports?", href: "/resources/knowledge-base/dashboard" },
];

function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, authLoading, authError] = useAuthState(auth);
  
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, userLoading, userError] = useDocumentData(userDocRef);
  const { simulatedRole, setSimulatedRole } = useRoleSimulator();

  const getRole = () => {
    if (!user) return 'business'; // Default to business if not logged in for viewing purposes
    if (user.email === SUPER_ADMIN_EMAIL) return 'super_admin';
    return userData?.userType || 'business'; 
  }
  
  const userRole = getRole();
  const displayRole = simulatedRole || userRole;
  
  const hotkeys = new Map<string, (event: KeyboardEvent) => void>([
      ['escape', () => router.push('/dashboard')],
      ['ctrl+i', () => router.push('/billing/invoices/new')],
      ['ctrl+p', () => router.push('/purchases/new')],
      ['ctrl+j', () => router.push('/accounting/journal')],
      ['alt+n', () => router.push('/billing/credit-notes/new')],
      ['ctrl+d', () => router.push('/billing/debit-notes/new')],
      ['ctrl+r', () => router.push('/accounting/vouchers/rapid')],
      ['ctrl+b', () => router.push('/accounting/financial-statements/balance-sheet')],
      ['ctrl+l', () => router.push('/accounting/financial-statements/profit-and-loss')],
      ['alt+t', () => router.push('/accounting/trial-balance')],
      ['ctrl+g', () => router.push('/accounting/ledgers')],
      ['alt+p', () => router.push('/parties')],
      ['alt+i', () => router.push('/items')],
  ]);
  useHotkeys(hotkeys);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || userLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }
  
  const filteredMenuItems = allMenuItems
    .map(item => {
        if (!item.roles.includes(displayRole)) {
            return null;
        }
        if (item.subItems) {
            const filteredSubItems = item.subItems
                .map(subItem => {
                    if (!subItem.roles.includes(displayRole)) {
                        return null;
                    }
                    if (subItem.subItems) {
                         const filteredNestedSubItems = subItem.subItems.filter(nested => nested.roles.includes(displayRole));
                         if (filteredNestedSubItems.length === 0) return null;
                         return {...subItem, subItems: filteredNestedSubItems};
                    }
                    return subItem;
                })
                .filter(Boolean);
            if (filteredSubItems.length === 0) return null;
            return { ...item, subItems: filteredSubItems };
        }
        return item;
    })
    .filter(Boolean);


  return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <ZenithBooksLogo className="size-8 text-primary" />
            <div className="flex flex-col">
              <h2 className="text-xl font-bold">
                <span className="font-bold">Zenith</span><span className="font-bold">Books</span>
              </h2>
              <span className="text-xs text-sidebar-foreground/50">Beyond Books</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {filteredMenuItems.map((item, index) => (
                <SidebarMenuItem key={index}>
                  {item.subItems ? (
                    <CollapsibleMenuItem item={item} pathname={pathname} />
                  ) : (
                    <Link href={item.href} passHref>
                      <SidebarMenuButton size="lg" isActive={pathname === item.href}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="border-t border-sidebar-border p-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    <MessageSquare className="mr-2" />
                    Help & Support
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="mb-2" side="top" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Quick Help</h4>
                      <p className="text-sm text-muted-foreground">
                        Find answers to common questions.
                      </p>
                    </div>
                    <div className="space-y-1">
                       {quickHelpQuestions.map((item) => (
                          <Link key={item.question} href={item.href} passHref>
                              <Button variant="link" className="h-auto p-0 text-sm w-full justify-start text-left text-muted-foreground hover:text-primary">
                                  {item.question}
                              </Button>
                          </Link>
                      ))}
                    </div>
                    <Separator />
                     <Button asChild className="w-full" variant="secondary">
                        <Link href="/contact">Contact Support</Link>
                      </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pb-24 md:pb-6">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
              {children}
            </Suspense>
          </main>
          <BottomNav />
          <Fab />
        </SidebarInset>
      </SidebarProvider>
  );
}


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
       <RoleSimulatorProvider>
          <AccountingProvider>
            <MainLayout>{children}</MainLayout>
          </AccountingProvider>
       </RoleSimulatorProvider>
    </ClientOnly>
  );
}
