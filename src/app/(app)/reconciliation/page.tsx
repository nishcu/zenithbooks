
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { GitCompareArrows, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const reconciliationTools = [
  {
    title: "AI-Powered ITC Reconciliation",
    description: "Upload your GSTR-2B JSON file. Our AI will automatically compare it with your purchase records in GSTEase, highlight mismatches, and suggest corrections for maximum Input Tax Credit.",
    icon: Wand2,
    href: "/reconciliation/itc-reconciliation",
    status: "active",
  },
  {
    title: "GSTR-1 vs. GSTR-3B Comparison",
    description: "Upload your GSTR-1 and GSTR-3B reports (in .csv or .xlsx format). The AI will perform a detailed comparison to identify any discrepancies in turnover or tax liability between the two returns.",
    icon: GitCompareArrows,
    href: "/reconciliation/gstr-comparison",
    status: "active",
  },
  {
    title: "Books vs. GSTR-1 Reconciliation",
    description: "Automatically compare your sales data recorded in GSTEase against the data declared in your GSTR-1 to ensure there are no omissions or excess reporting of sales.",
    icon: GitCompareArrows,
    href: "/reconciliation/books-vs-gstr1",
    status: "active",
  },
];

export default function ReconciliationPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Reconciliation Tools</h1>
        <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
          Ensure accuracy and avoid compliance issues by reconciling your books
          with GST portal data.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reconciliationTools.map((tool) => (
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
                {tool.status === 'upcoming' && (
                    <CardFooter>
                        <Badge variant="secondary">Coming Soon</Badge>
                    </CardFooter>
                )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
