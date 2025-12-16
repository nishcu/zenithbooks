
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, FileSpreadsheet, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GstFilingsGuidePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/resources/knowledge-base" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Knowledge Base
      </Link>
      <div className="text-center">
         <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4 mx-auto">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">GST Filings Guide</h1>
        <p className="text-muted-foreground">Preparing and filing your GST returns seamlessly.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet /> GSTR-1 & GSTR-3B Summaries</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>The main GST Filings page provides a summary of your GSTR-1 (outward supplies) and GSTR-3B (summary return) for a selected month. This data is automatically compiled from your sales invoices, purchase bills, credit notes, and debit notes.</p>
          <h4>Key Features:</h4>
          <ul>
            <li><strong>Period Selection:</strong> Choose the financial year and month to view the relevant data.</li>
            <li><strong>GSTR-1 Summary:</strong> Shows a categorized breakdown of your sales, including B2B, B2C, exports, and more.</li>
            <li><strong>GSTR-3B Summary:</strong> Presents a summary of your total taxable value, tax liability, and eligible Input Tax Credit (ITC), culminating in your net tax payable.</li>
            <li><strong>Drill-Down:</strong> Click on summary figures to view the detailed transactions that make up that total (feature in progress).</li>
          </ul>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GitCompareArrows /> Reconciliation Tools</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
            <p>GSTEase offers AI-powered tools to ensure your books and returns match, minimizing compliance risks.</p>
             <ul>
                <li><strong>ITC Reconciliation:</strong> Upload your GSTR-2B statement (downloaded from the GST portal), and the AI will compare it with your purchase records in GSTEase to highlight mismatches and suggest corrections.</li>
                <li><strong>GSTR-1 vs GSTR-3B Comparison:</strong> Upload your GSTR-1 and GSTR-3B reports (in CSV format) to have the AI analyze them for discrepancies in turnover and tax liability, providing a detailed variance report.</li>
            </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Filing Wizards</CardTitle>
            <CardDescription>Step-by-step guides to prepare your returns for upload to the GST portal.</CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
            <p>For each return type (GSTR-1, GSTR-3B, GSTR-9), GSTEase provides a wizard that guides you through each table of the return. Data from your books is auto-populated where possible, but you can review and make final adjustments before generating the JSON file required for filing on the official GST portal.</p>
        </CardContent>
        <CardFooter>
            <Link href="/gst-filings" passHref>
                <Button>Go to GST Filings</Button>
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
