
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, Users, Handshake, Briefcase, Landmark, Shield, BookOpen, Library, Building, FileSignature, Wallet, BadgeCheck, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { servicePricing } from "@/lib/on-demand-pricing";

const documentTools = [
    { id: "PARTNERSHIP_DEED", category: "registration_deeds", title: "Partnership Deed", description: "Create a legal document to form a business partnership.", href: "/legal-documents/partnership-deed", icon: Handshake },
    { id: "RENTAL_DEED", category: "agreements", title: "Rental Deed", description: "Draft a legal agreement for property rental.", href: "/legal-documents/rental-deed", icon: Landmark },
    { id: "LEASE_DEED", category: "agreements", title: "Lease Deed", description: "Create a formal lease agreement for long-term property usage.", href: "/legal-documents/lease-deed", icon: Landmark },
    { id: "SELF_AFFIDAVIT_GST", category: "gst_documents", title: "Self Affidavit for GST", description: "Generate a self-declaration affidavit for GST registration.", href: "/legal-documents/self-affidavit-gst", icon: FileSignature },
    { id: "LLP_AGREEMENT", category: "registration_deeds", title: "LLP Agreement", description: "Draft an agreement for a Limited Liability Partnership.", href: "/legal-documents/llp-agreement", icon: Handshake },
    { id: "RENTAL_RECEIPTS_HRA", category: "gst_documents", title: "Rental Receipts for HRA", description: "Generate monthly rental receipts for employees.", href: "/legal-documents/rental-receipts", icon: FileText },
    { id: "FOUNDERS_AGREEMENT", category: "founder_startup", title: "Founders’ Agreement", description: "Essential legal document for startup co-founders.", href: "/legal-documents/founders-agreement", icon: Handshake },
    { id: "LOAN_AGREEMENT", category: "agreements", title: "Loan Agreement", description: "Between partners/directors & the company.", href: "/legal-documents/loan-agreement", icon: Wallet },
    { id: "GST_ENGAGEMENT_LETTER", category: "gst_documents", title: "GST Engagement Letter", description: "Between a client and a tax consultant.", href: "/legal-documents/gst-engagement-letter", icon: FileText },
    { id: "ACCOUNTING_ENGAGEMENT_LETTER", category: "accounting_documents", title: "Accounting Engagement Letter", description: "Formalize the terms of accounting services.", href: "/legal-documents/accounting-engagement-letter", icon: FileText },
    { id: "NDA", category: "agreements", title: "NDA (Non-Disclosure Agreement)", description: "Protect sensitive company information.", href: "/legal-documents/nda", icon: Shield },
    { id: "CONSULTANT_AGMT", category: "agreements", title: "Consultant / Freelancer Agreement", description: "Define terms for engaging independent contractors.", href: "/legal-documents/consultant-agreement", icon: Briefcase },
    { id: "VENDOR_AGREEMENT", category: "agreements", title: "Vendor Agreement", description: "Set terms with your suppliers and vendors.", href: "/legal-documents/vendor-agreement", icon: Briefcase },
    { id: "SERVICE_AGREEMENT", category: "agreements", title: "Service Agreement", description: "A general-purpose agreement for providing services.", href: "/legal-documents/service-agreement", icon: Briefcase },
    { id: "FRANCHISE_AGREEMENT", category: "agreements", title: "Franchise Agreement", description: "Establish the terms of a franchise relationship.", href: "/legal-documents/franchise-agreement", icon: Handshake },
    { id: "OFFER_LETTER", category: "hr_documents", title: "Offer Letter", description: "Generate a formal job offer for prospective employees.", href: "/legal-documents/offer-letter", icon: FileText },
    { id: "APPOINTMENT_LETTER", category: "hr_documents", title: "Appointment Letter", description: "Create a detailed appointment letter for new hires.", href: "/legal-documents/appointment-letter", icon: FileText },
    { id: "INTERNSHIP_AGREEMENT", category: "hr_documents", title: "Internship Agreement", description: "Define the terms and conditions for an internship.", href: "/legal-documents/internship-agreement", icon: FileText },
    { id: "BOARD_RESOLUTION", category: "company_documents", title: "Board Resolutions Library", description: "Templates for common board resolutions.", href: "/legal-documents/board-resolutions", icon: Library },
    { id: "SHAREHOLDERS_AGREEMENT", category: "founder_startup", title: "Shareholders’ Agreement (SHA)", description: "Define rights and obligations of shareholders.", href: "/legal-documents/shareholders-agreement", icon: Users },
    { id: "ESOP_POLICY", category: "founder_startup", title: "ESOP Trust Deed / Policy", description: "Establish an Employee Stock Option Plan.", href: "/legal-documents/esop-policy", icon: BookOpen },
    { id: "SAFE_AGREEMENT", category: "founder_startup", title: "Convertible Note / SAFE Agreement", description: "For early-stage startup fundraising.", href: "/legal-documents/safe-agreement", icon: FileSignature },
    { id: "SOCIETY_DEED", category: "registration_deeds", title: "Society Registration Deed", description: "Register a new society with a formal deed.", href: "/legal-documents/society-registration-deed", icon: Users },
    { id: "TRUST_DEED", category: "registration_deeds", title: "Trust Deed", description: "Formally establish a trust with a legal deed.", href: "/legal-documents/trust-deed", icon: Handshake },
    { id: "MOA_AOA", category: "company_documents", title: "MOA & AOA", description: "Memorandum and Articles of Association for companies.", href: "/legal-documents/moa-aoa", icon: Building },
    { id: "STATUTORY_REGISTERS", category: "company_documents", title: "Statutory Registers (Co. Act)", description: "Generate mandatory statutory registers for your company.", href: "/legal-documents/statutory-registers", icon: FileArchive },
];

export default function LegalDocumentsPage() {
  const getPrice = (id: string, category: string) => {
    const services = servicePricing[category as keyof typeof servicePricing] || [];
    const service = services.find(s => s.id === id);
    return service?.price || 0;
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-block rounded-full bg-primary/10 p-4">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Legal & Business Document Generators</h1>
        <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
          Quickly create essential legal and business documents using our guided wizards.
        </p>
      </div>

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
  );
}
