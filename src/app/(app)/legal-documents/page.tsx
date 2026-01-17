
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, Users, Handshake, Briefcase, Landmark, Shield, BookOpen, Library, Building, FileSignature, Wallet, BadgeCheck, FileArchive, Loader2, ClipboardList, TrendingUp, Receipt, GraduationCap, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getServicePricing, onPricingUpdate, ServicePricing } from "@/lib/pricing-service";

// Document categories for the new dashboard
const documentCategories = [
  {
    id: "agreements",
    title: "Agreements",
    description: "Employee & HR agreements, Business & Commercial agreements",
    icon: Handshake,
    count: 25,
    href: "/legal-documents/category/agreements",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    id: "registration",
    title: "Registration Documents",
    description: "GST, Shop & Establishment, Udyam, IEC, FSSAI, and more",
    icon: FileSignature,
    count: 10,
    href: "/legal-documents/category/registration",
    color: "bg-green-500/10 text-green-600",
  },
  {
    id: "company-law",
    title: "Company Law Documents",
    description: "Incorporation documents, Board resolutions, Statutory filings",
    icon: Building,
    count: 25,
    href: "/legal-documents/category/company-law",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    id: "tax",
    title: "Tax Documents",
    description: "GST, Income Tax, Professional Tax documents and forms",
    icon: Receipt,
    count: 10,
    href: "/legal-documents/category/tax",
    color: "bg-red-500/10 text-red-600",
  },
  {
    id: "startup-funding",
    title: "Startup & Funding Documents",
    description: "Term sheets, Investment agreements, ESOP, Due diligence",
    icon: TrendingUp,
    count: 10,
    href: "/legal-documents/category/startup-funding",
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    id: "finance-banking",
    title: "Finance & Banking Documents",
    description: "Loan applications, CMA data, Projections, Bank documents",
    icon: Wallet,
    count: 10,
    href: "/legal-documents/category/finance-banking",
    color: "bg-indigo-500/10 text-indigo-600",
  },
  {
    id: "hr-policies",
    title: "HR Policies",
    description: "Employee handbooks, Policies, Code of conduct",
    icon: GraduationCap,
    count: 12,
    href: "/legal-documents/category/hr-policies",
    color: "bg-pink-500/10 text-pink-600",
  },
  {
    id: "others",
    title: "Others",
    description: "Affidavits, POA, Undertakings, Invoices, Purchase Orders",
    icon: FolderOpen,
    count: 15,
    href: "/legal-documents/category/others",
    color: "bg-gray-500/10 text-gray-600",
  },
];

// Legacy document tools (existing documents)
const documentTools = [
    { id: "partnership_deed", category: "registration_deeds", title: "Partnership Deed", description: "Create a legal document to form a business partnership.", href: "/legal-documents/partnership-deed", icon: Handshake },
    { id: "rental_deed", category: "agreements", title: "Rental Deed", description: "Draft a legal agreement for property rental.", href: "/legal-documents/rental-deed", icon: Landmark },
    { id: "lease_deed", category: "agreements", title: "Lease Deed", description: "Create a formal lease agreement for long-term property usage.", href: "/legal-documents/lease-deed", icon: Landmark },
    { id: "self_affidavit_gst", category: "gst_documents", title: "Self Affidavit for GST", description: "Generate a self-declaration affidavit for GST registration.", href: "/legal-documents/self-affidavit-gst", icon: FileSignature },
    { id: "llp_agreement", category: "registration_deeds", title: "LLP Agreement", description: "Draft an agreement for a Limited Liability Partnership.", href: "/legal-documents/llp-agreement", icon: Handshake },
    { id: "rental_receipt_hra", category: "hr_documents", title: "Rental Receipt for HRA", description: "Generate a rental receipt for HRA claims.", href: "/legal-documents/rental-receipt", icon: FileText },
    { id: "founders_agreement", category: "founder_startup", title: "Founders’ Agreement", description: "Essential legal document for startup co-founders.", href: "/legal-documents/founders-agreement", icon: Handshake },
    { id: "loan_agreement", category: "agreements", title: "Loan Agreement", description: "Between partners/directors & the company.", href: "/legal-documents/loan-agreement", icon: Wallet },
    { id: "gst_engagement_letter", category: "gst_documents", title: "GST Engagement Letter", description: "Between a client and a tax consultant.", href: "/legal-documents/gst-engagement-letter", icon: FileText },
    { id: "accounting_engagement_letter", category: "accounting_documents", title: "Accounting Engagement Letter", description: "Formalize the terms of accounting services.", href: "/legal-documents/accounting-engagement-letter", icon: FileText },
    { id: "nda", category: "agreements", title: "NDA (Non-Disclosure Agreement)", description: "Protect sensitive company information.", href: "/legal-documents/nda", icon: Shield },
    { id: "consultant_agreement", category: "agreements", title: "Consultant / Freelancer Agreement", description: "Define terms for engaging independent contractors.", href: "/legal-documents/consultant-agreement", icon: Briefcase },
    { id: "vendor_agreement", category: "agreements", title: "Vendor Agreement", description: "Set terms with your suppliers and vendors.", href: "/legal-documents/vendor-agreement", icon: Briefcase },
    { id: "service_agreement", category: "agreements", title: "Service Agreement", description: "A general-purpose agreement for providing services.", href: "/legal-documents/service-agreement", icon: Briefcase },
    { id: "franchise_agreement", category: "agreements", title: "Franchise Agreement", description: "Establish the terms of a franchise relationship.", href: "/legal-documents/franchise-agreement", icon: Handshake },
    { id: "offer_letter", category: "hr_documents", title: "Offer Letter", description: "Generate a formal job offer for prospective employees.", href: "/legal-documents/offer-letter", icon: FileText },
    { id: "appointment_letter", category: "hr_documents", title: "Appointment Letter", description: "Create a detailed appointment letter for new hires.", href: "/legal-documents/appointment-letter", icon: FileText },
    { id: "internship_agreement", category: "hr_documents", title: "Internship Agreement", description: "Define the terms and conditions for an internship.", href: "/legal-documents/internship-agreement", icon: FileText },
    { id: "board_resolutions", category: "company_documents", title: "Board Resolutions Library", description: "Templates for common board resolutions.", href: "/legal-documents/board-resolutions", icon: Library },
    { id: "shareholders_agreement", category: "founder_startup", title: "Shareholders’ Agreement (SHA)", description: "Define rights and obligations of shareholders.", href: "/legal-documents/shareholders-agreement", icon: Users },
    { id: "esop_policy", category: "founder_startup", title: "ESOP Trust Deed / Policy", description: "Establish an Employee Stock Option Plan.", href: "/legal-documents/esop-policy", icon: BookOpen },
    { id: "safe_agreement", category: "founder_startup", title: "Convertible Note / SAFE Agreement", description: "For early-stage startup fundraising.", href: "/legal-documents/safe-agreement", icon: FileSignature },
    { id: "society_deed", category: "registration_deeds", title: "Society Registration Deed", description: "Register a new society with a formal deed.", href: "/legal-documents/society-registration-deed", icon: Users },
    { id: "trust_deed", category: "registration_deeds", title: "Trust Deed", description: "Formally establish a trust with a legal deed.", href: "/legal-documents/trust-deed", icon: Handshake },
    { id: "moa_aoa", category: "company_documents", title: "MOA & AOA", description: "Memorandum and Articles of Association for companies.", href: "/legal-documents/moa-aoa", icon: Building },
    { id: "statutory_registers", category: "company_documents", title: "Statutory Registers (Co. Act)", description: "Generate mandatory statutory registers for your company.", href: "/legal-documents/statutory-registers", icon: FileArchive },
];

export default function LegalDocumentsPage() {
  const [pricing, setPricing] = useState<ServicePricing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getServicePricing().then(pricingData => {
        setPricing(pricingData);
        setIsLoading(false);
    });

    const unsubscribe = onPricingUpdate(setPricing);
    return () => unsubscribe();
  }, []);

  const getPrice = (id: string, category: string) => {
    if (!pricing) return 0;
    const services = pricing[category as keyof ServicePricing] || [];
    const service = services.find(s => s.id === id);
    return service?.price || 0;
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-lg">Loading Document Pricings...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-block rounded-full bg-primary/10 p-4">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Legal & Business Document Generators</h1>
        <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
          Quickly create essential legal and business documents using our guided wizards. Draft provided for general business use.
        </p>
      </div>

      {/* Category Cards */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Browse by Category</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {documentCategories.map((category) => (
            <Card key={category.id} className="flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className={`inline-flex p-3 rounded-full mb-3 ${category.color}`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{category.title}</CardTitle>
                <CardDescription className="text-sm">{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <Badge variant="secondary" className="mt-2">{category.count}+ Templates</Badge>
              </CardContent>
              <CardFooter>
                <Link href={category.href} passHref className="w-full">
                  <Button className="w-full">
                    View Documents
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Existing Documents Section */}
      <div className="space-y-4 border-t pt-8">
        <h2 className="text-2xl font-semibold">All Documents</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documentTools.map((tool) => {
            const price = getPrice(tool.id, tool.category);
            return (
            <Card key={tool.title} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <tool.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{tool.title}</CardTitle>
                </div>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto">
                <Link href={tool.href} passHref className="w-full">
                  <Button className="w-full">
                      Start Drafting {price > 0 ? `- ₹${price}` : ''}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          )})}
        </div>
      </div>
    </div>
  );
}
