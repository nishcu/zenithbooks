
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, TrendingUp, ShoppingCart, Presentation } from "lucide-react";

const reportTools = [
  {
    title: "CMA Report Generator",
    description: "Create a detailed Credit Monitoring Arrangement (CMA) report with financial projections for bank loan applications.",
    icon: Presentation,
    href: "/reports/cma-report",
  },
  {
    title: "Sales Analysis",
    description: "Analyze your sales trends by customer, item, or period. Understand your revenue streams and identify top-performing products.",
    icon: TrendingUp,
    href: "/reports/sales-analysis",
  },
  {
    title: "Purchase Analysis",
    description: "Get insights into your procurement. Track expenses by vendor, item, or category to optimize your purchasing strategy.",
    icon: ShoppingCart,
    href: "/reports/purchase-analysis",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-block rounded-full bg-primary/10 p-4">
          <AreaChart className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Reports & Analysis</h1>
        <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
          Gain deeper insights into your business performance with powerful reporting tools.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTools.map((tool) => (
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
