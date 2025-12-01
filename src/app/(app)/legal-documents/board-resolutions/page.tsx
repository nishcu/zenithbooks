
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Library, Landmark, UserPlus, FileSignature, Wallet, Building2, BadgeCheck, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const resolutionTemplates = [
  {
    title: "Opening of Bank Account",
    description: "Authorize the opening of a new bank account and specify the authorized signatories.",
    icon: Landmark,
    href: "/legal-documents/board-resolutions/opening-of-bank-account",
    status: "active",
  },
  {
    title: "Appointment of Additional Director",
    description: "Appoint a new additional director to the board.",
    icon: UserPlus,
    href: "/legal-documents/board-resolutions/appointment-of-director",
    status: "active",
  },
  {
    title: "Appointment of First Auditor",
    description: "Appoint the company's first statutory auditors.",
    icon: FileSignature,
    href: "/legal-documents/board-resolutions/appointment-of-auditor",
    status: "active",
  },
   {
    title: "Approval of Loan from Director",
    description: "Formally accept an unsecured loan from a director.",
    icon: Wallet,
    href: "/legal-documents/board-resolutions/approval-of-loan",
    status: "active",
  },
  {
    title: "Borrowing Powers (Bank Loan)",
    description: "Authorize borrowing from a bank and empower directors to execute loan documents.",
    icon: Wallet,
    href: "/legal-documents/board-resolutions/borrowing-powers",
    status: "active",
  },
  {
    title: "Shifting of Registered Office",
    description: "Authorize the shifting of the company's registered office within the same city.",
    icon: Building2,
    href: "/legal-documents/board-resolutions/shifting-of-registered-office",
    status: "active",
  },
   {
    title: "Issue of Share Certificates",
    description: "Authorize the issuance and signing of physical share certificates.",
    icon: BadgeCheck,
    href: "/legal-documents/board-resolutions/issue-of-share-certificates",
    status: "active",
  },
  {
    title: "Approval of Annual Accounts",
    description: "Approve the company's annual financial statements before the AGM.",
    icon: FileSignature,
    href: "/legal-documents/board-resolutions/approval-of-annual-accounts",
    status: "active",
  },
];

export default function BoardResolutionsPage() {
  return (
    <div className="space-y-8">
       <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Selection
      </Link>
      <div className="text-center">
        <div className="inline-block rounded-full bg-primary/10 p-4">
          <Library className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Board Resolutions Library</h1>
        <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
          Quickly generate certified true copies of common board resolutions for your company's statutory records.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resolutionTemplates.map((tool) => (
          <Link key={tool.title} href={tool.href} passHref>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <tool.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{tool.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>{tool.description}</CardDescription>
              </CardContent>
              <CardFooter>
                  {tool.status === 'upcoming' && <Badge variant="secondary">Coming Soon</Badge>}
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
