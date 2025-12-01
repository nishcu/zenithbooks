
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Receipt, ShoppingCart, FilePlus, FileMinus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BillingGuidePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/resources/knowledge-base" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Knowledge Base
      </Link>
      <div className="text-center">
        <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4 mx-auto">
            <Receipt className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Billing Guide</h1>
        <p className="text-muted-foreground">Creating and managing your sales and purchase documents.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Receipt /> Sales Invoices</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>The Invoices section is where you create and manage all your sales invoices. This is the primary way to bill your customers for goods or services.</p>
          <h4>Key Features:</h4>
          <ul>
            <li><strong>Create New Invoices:</strong> Use the "Create Full Invoice" or "Rapid Entry" options to generate new sales invoices.</li>
            <li><strong>Automatic Journal Entries:</strong> When you save an invoice, GSTEase automatically creates the corresponding accounting entry, debiting your customer and crediting sales revenue and GST payable.</li>
            <li><strong>Status Tracking:</strong> Invoices are automatically marked as "Pending", "Overdue", or "Paid" (feature in progress).</li>
            <li><strong>Actions:</strong> You can view, edit, duplicate, or cancel invoices directly from the list.</li>
          </ul>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingCart /> Purchase Bills</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>The Purchases section allows you to record all the bills you receive from your vendors. Keeping accurate purchase records is crucial for tracking expenses and claiming Input Tax Credit (ITC).</p>
          <h4>Key Features:</h4>
          <ul>
            <li><strong>Record Bills:</strong> Enter details from your vendor bills to keep your accounts payable updated.</li>
            <li><strong>Automated ITC Accounting:</strong> Recording a purchase correctly debits your expense/asset and Input Tax Credit (ITC) accounts, and credits your vendor.</li>
            <li><strong>Track Payables:</strong> The dashboard will reflect your total outstanding payments to vendors.</li>
          </ul>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FilePlus /> Credit & <FileMinus/> Debit Notes</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>Handle sales returns, purchase returns, and other adjustments using Credit and Debit Notes.</p>
           <h4>Credit Notes (Sales Returns)</h4>
            <p>Issue a Credit Note when a customer returns goods or when you need to reduce the amount of a sales invoice. This correctly reverses the sales revenue and your GST liability.</p>
           <h4>Debit Notes (Purchase Returns)</h4>
            <p>Issue a Debit Note to a vendor when you return goods or if there's a need to reduce the amount on a purchase bill. This correctly reverses your expense and the Input Tax Credit you claimed.</p>
        </CardContent>
         <CardFooter>
            <Link href="/billing/invoices" passHref>
                <Button>Go to Billing Section</Button>
            </Link>
        </CardFooter>
      </Card>

    </div>
  );
}
