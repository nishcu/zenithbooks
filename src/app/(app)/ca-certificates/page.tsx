
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Award, Landmark, TrendingUp, HandCoins, Building, FileSignature, FileText, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getServicePricing, onPricingUpdate, ServicePricing } from "@/lib/on-demand-pricing";
import { Button } from "@/components/ui/button";

const certificateTools = [
  {
    id: "net_worth",
    title: "Net Worth Certificate",
    description: "Generate a certificate of net worth for individuals/HUFs, commonly required for visa applications or bank loans.",
    icon: Landmark,
    href: "/ca-certificates/net-worth",
    status: "active",
  },
  {
    id: "turnover",
    title: "Turnover Certificate",
    description: "Certify the annual turnover of a business entity based on audited financial statements or GST returns.",
    icon: TrendingUp,
    href: "/ca-certificates/turnover",
    status: "active",
  },
  {
    id: "capital_contribution",
    title: "Capital Contribution Certificate",
    description: "Certify the capital contributed by partners or directors into an LLP or company.",
    icon: HandCoins,
    href: "/ca-certificates/capital-contribution",
    status: "active",
  },
  {
    id: "foreign_remittance",
    title: "Form 15CB (Foreign Remittance)",
    description: "Prepare Form 15CB required for making payments to a non-resident, certifying taxability and DTAA benefits.",
    icon: Building,
    href: "/ca-certificates/foreign-remittance",
    status: "active",
  },
  {
    id: "visa_immigration",
    title: "Visa & Immigration Financials",
    description: "Generate a detailed financial statement and solvency certificate specifically for student or immigration visa purposes.",
    icon: FileSignature,
    href: "/ca-certificates/visa-immigration",
    status: "active",
  },
  {
    id: "general_attestation",
    title: "General Attestation",
    description: "A flexible tool to draft and request certification for any general-purpose document or statement.",
    icon: FileText,
    href: "/ca-certificates/general-attestation",
    status: "active",
  },
  // New certificates
  {
    id: "projected_financials",
    title: "Projected Financial Statement Certificate",
    description: "Generate projected financial statements for bank loans, tenders, and new business proposals.",
    icon: TrendingUp,
    href: "/ca-certificates/projected-financials",
    status: "active",
  },
  {
    id: "projected_turnover",
    title: "Projected Turnover Certificate",
    description: "Certify projected/expected turnover for upcoming financial year based on past data or orders.",
    icon: TrendingUp,
    href: "/ca-certificates/projected-turnover",
    status: "active",
  },
  {
    id: "net_profit",
    title: "Net Profit Certificate",
    description: "Certify the net profit of a business entity as per books of accounts after adjustments.",
    icon: TrendingUp,
    href: "/ca-certificates/net-profit",
    status: "active",
  },
  {
    id: "shareholding",
    title: "Shareholding Certificate",
    description: "Certify the shareholding pattern, capital structure, and share distribution of a company.",
    icon: Users,
    href: "/ca-certificates/shareholding",
    status: "active",
  },
  {
    id: "sources_of_funds",
    title: "Certificate of Sources of Funds",
    description: "Certify the source of funds for capital introduction, investment, or other financial transactions.",
    icon: Wallet,
    href: "/ca-certificates/sources-of-funds",
    status: "active",
  },
  {
    id: "utilisation_of_funds",
    title: "Certificate of Utilisation of Funds",
    description: "Certify the utilisation of sanctioned funds for specific purposes with supporting documentation.",
    icon: Wallet,
    href: "/ca-certificates/utilisation-of-funds",
    status: "active",
  },
  {
    id: "working_capital",
    title: "Working Capital Certificate",
    description: "Certify the working capital position of a business based on current assets and liabilities.",
    icon: TrendingUp,
    href: "/ca-certificates/working-capital",
    status: "active",
  },
  {
    id: "turnover_reconciliation",
    title: "Turnover Reconciliation Certificate",
    description: "Reconcile and certify turnover figures across GSTR-1, GSTR-3B, and books of accounts.",
    icon: FileText,
    href: "/ca-certificates/turnover-reconciliation",
    status: "active",
  },
  {
    id: "income_certificate",
    title: "Income Certificate (CA Issued)",
    description: "Issue a CA-certified income certificate for individuals or families for various official purposes.",
    icon: FileSignature,
    href: "/ca-certificates/income-certificate",
    status: "active",
  },
  {
    id: "msme_investment_turnover",
    title: "MSME Investment & Turnover Certificate",
    description: "Certify investment in plant/machinery and turnover for MSME classification and benefits.",
    icon: Building,
    href: "/ca-certificates/msme-investment-turnover",
    status: "active",
  },
  {
    id: "iecode_financials",
    title: "Import-Export (IE Code) Financial Certificate",
    description: "Certify financial standing, turnover, and forex earnings for import-export businesses.",
    icon: Building,
    href: "/ca-certificates/iecode-financials",
    status: "active",
  },
];

export default function CACertificatesPage() {
  const [pricing, setPricing] = useState<ServicePricing | null>(null);

  useEffect(() => {
    getServicePricing().then(setPricing);
    const unsubscribe = onPricingUpdate(setPricing);
    return () => unsubscribe();
  }, []);

  const allCertServices = pricing ? pricing.ca_certs : [];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-block rounded-full bg-primary/10 p-4">
          <Award className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">CA Certificate Generators</h1>
        <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
          Tools to quickly draft various certificates required for financial and
          regulatory purposes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificateTools.map((tool) => {
          const service = allCertServices.find(s => s.id === tool.id.toLowerCase());
          const price = service?.price || 0;

          return (
            <Card key={tool.title} className="flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <tool.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{tool.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>{tool.description}</CardDescription>
              </CardContent>
              <CardFooter className="flex-col items-start gap-4">
                  {tool.status === 'upcoming' ? (
                     <Badge variant="secondary">Coming Soon</Badge>
                  ) : (
                    <Link href={tool.href} passHref className="w-full">
                      <Button className="w-full">
                          Start Drafting {price > 0 ? `- ₹${price}` : ''}
                      </Button>
                    </Link>
                  )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
