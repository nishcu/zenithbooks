
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Award, Landmark, TrendingUp, HandCoins, Building, FileSignature, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { servicePricing } from "@/lib/on-demand-pricing";
import { Button } from "@/components/ui/button";

const certificateTools = [
  {
    id: "NW_CERT",
    title: "Net Worth Certificate",
    description: "Generate a certificate of net worth for individuals/HUFs, commonly required for visa applications or bank loans.",
    icon: Landmark,
    href: "/ca-certificates/net-worth",
    status: "active",
  },
  {
    id: "TURNOVER_CERT",
    title: "Turnover Certificate",
    description: "Certify the annual turnover of a business entity based on audited financial statements or GST returns.",
    icon: TrendingUp,
    href: "/ca-certificates/turnover",
    status: "active",
  },
  {
    id: "CAPITAL_CONT_CERT",
    title: "Capital Contribution Certificate",
    description: "Certify the capital contributed by partners or directors into an LLP or company.",
    icon: HandCoins,
    href: "/ca-certificates/capital-contribution",
    status: "active",
  },
  {
    id: "FR_CERT",
    title: "Form 15CB (Foreign Remittance)",
    description: "Prepare Form 15CB required for making payments to a non-resident, certifying taxability and DTAA benefits.",
    icon: Building,
    href: "/ca-certificates/foreign-remittance",
    status: "active",
  },
  {
    id: "VISA_CERT",
    title: "Visa & Immigration Financials",
    description: "Generate a detailed financial statement and solvency certificate specifically for student or immigration visa purposes.",
    icon: FileSignature,
    href: "/ca-certificates/visa-immigration",
    status: "active",
  },
  {
    id: "GEN_ATTEST",
    title: "General Attestation",
    description: "A flexible tool to draft and request certification for any general-purpose document or statement.",
    icon: FileText,
    href: "/ca-certificates/general-attestation",
    status: "active",
  },
];


export default function CACertificatesPage() {
  const allCertServices = servicePricing.ca_certs;
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
          const service = allCertServices.find(s => s.id === tool.id);
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
