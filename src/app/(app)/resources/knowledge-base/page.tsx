
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Receipt, FileSpreadsheet, Shield, Award, BookOpen } from "lucide-react";

const knowledgeBaseTopics = [
  {
    title: "Dashboard Overview",
    description: "Understand your financial snapshot, from receivables to recent activities.",
    icon: Gauge,
    href: "/resources/knowledge-base/dashboard",
  },
  {
    title: "Billing & Purchases",
    description: "Learn how to create and manage invoices, bills, credit notes, and debit notes.",
    icon: Receipt,
    href: "/resources/knowledge-base/billing",
  },
  {
    title: "GST Filings & Reconciliation",
    description: "A guide to using the GST summary dashboards, filing wizards, and AI-powered reconciliation tools.",
    icon: FileSpreadsheet,
    href: "/resources/knowledge-base/gst-filings",
  },
   {
    title: "Core Accounting",
    description: "Understand the Chart of Accounts, Journal Vouchers, Ledgers, and how financial statements are generated.",
    icon: BookOpen,
    href: "/resources/knowledge-base/accounting",
  },
  {
    title: "Legal Document Generation",
    description: "How to use the wizards to create Partnership Deeds, NDAs, Offer Letters, and more.",
    icon: Shield,
    href: "/resources/knowledge-base/legal-documents",
  },
   {
    title: "CA Certificate Generation",
    description: "Learn how to generate and request certification for Net Worth, Turnover, and other professional certificates.",
    icon: Award,
    href: "/resources/knowledge-base/ca-certificates",
  },
];

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-block rounded-full bg-primary/10 p-4">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
        <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
          Find guides, tutorials, and answers to common questions about using GSTEase.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {knowledgeBaseTopics.map((tool) => (
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
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
