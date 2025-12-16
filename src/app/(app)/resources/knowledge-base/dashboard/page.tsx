
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, IndianRupee, Gauge, BarChart3, CalendarDays, Keyboard } from "lucide-react";
import Link from "next/link";

export default function DashboardGuidePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/resources/knowledge-base" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Knowledge Base
      </Link>
      <div className="text-center">
        <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4 mx-auto">
            <Gauge className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Dashboard Guide</h1>
        <p className="text-muted-foreground">Understand your main command center.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gauge /> The Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>The Dashboard is the first page you see after logging in. It provides a high-level overview of your business's financial health and recent activities at a glance. It's designed to give you quick insights without having to dig through reports.</p>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2"><IndianRupee /> Key Statistic Cards</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
              <p>At the top of the page, you will find three main statistics cards:</p>
              <ul>
                <li><strong>Receivables:</strong> This shows the total amount of money your customers owe you from all unpaid invoices. It's a key indicator of your incoming cash flow.</li>
                <li><strong>Payables:</strong> This shows the total amount of money you owe your vendors and suppliers from all unpaid purchase bills.</li>
                <li><strong>GST Payable:</strong> This card displays your estimated net GST liability for the current period, calculated as GST on sales minus GST on purchases (Input Tax Credit).</li>
              </ul>
          </CardContent>
      </Card>

       <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2"><BarChart3 /> Financial Summary Chart</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
              <p>This bar chart provides a visual summary of your sales and purchases over the last six months. It helps you quickly identify trends, such as months with high sales or unusually high purchase costs.</p>
                <ul>
                    <li><strong>Sales Bar (Green):</strong> Represents the total value of invoices created in that month.</li>
                    <li><strong>Purchases Bar (Blue):</strong> Represents the total value of purchase bills recorded in that month.</li>
                    <li><strong>Net Bar (Purple):</strong> Shows the difference between sales and purchases, giving you a rough idea of your monthly operational surplus or deficit.</li>
                </ul>
          </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays /> Compliance Calendar</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
                <p>Located on the right side, this panel shows upcoming statutory compliance deadlines, such as GSTR-1 and GSTR-3B filing dates. It helps you stay on top of your tax obligations and avoid late fees.</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Keyboard /> Quick Access & Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
                <p>This panel provides quick links and keyboard shortcuts to the most frequently used actions, like creating a new invoice. You can view all shortcuts by navigating to <strong>Resources {'>'} App Shortcuts</strong>.</p>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
