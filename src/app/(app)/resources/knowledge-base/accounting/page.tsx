
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Library, BookCopy, Book, Landmark, TrendingUp, Calculator } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccountingGuidePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/resources/knowledge-base" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Knowledge Base
      </Link>
      <div className="text-center">
        <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4 mx-auto">
            <Calculator className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Accounting Guide</h1>
        <p className="text-muted-foreground">Understanding the core accounting tools in GSTEase.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Library /> Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>The Chart of Accounts is the backbone of your accounting system. It is a complete list of every financial account in your general ledger. In GSTEase, these accounts are organized into five main categories: Assets, Liabilities, Equity, Revenue, and Expenses.</p>
          <p>You can view the standard list of accounts and also add your own custom accounts for specific business needs.</p>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookCopy /> Journal Vouchers</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>Journal Vouchers are used to record manual accounting entries that don't fit into the standard sales or purchase workflows. This is where you can make adjustments, record accruals, book depreciation, or correct errors.</p>
          <h4>Key Principles:</h4>
          <ul>
            <li><strong>Double-Entry System:</strong> Every journal entry must have equal debits and credits. The form will not allow you to save an unbalanced entry.</li>
            <li><strong>Narration:</strong> Always provide a clear and concise narration for every entry. This explains the "why" behind the transaction and is crucial for audits and future reference.</li>
            <li><strong>Reversals:</strong> To maintain a clear audit trail, GSTEase doesn't allow direct deletion of entries. Instead, you can "Reverse" an entry, which creates a new journal voucher that cancels out the original one.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Book /> General Ledger</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
            <p>The General Ledger provides a detailed, chronological history of all transactions for a specific account. You can select any account from your Chart of Accounts (e.g., a specific bank account, a customer, or an expense account) to see every debit and credit that has affected it, along with a running balance.</p>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark /> Financial Statements</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>GSTEase automatically generates key financial statements based on all the transactions you've recorded.</p>
            <ul>
                <li><strong>Trial Balance:</strong> A report that lists all your accounts and their balances to ensure that total debits equal total credits.</li>
                <li><strong className="flex items-center gap-1"><TrendingUp className="size-4"/>Profit & Loss Account:</strong> Shows your company's financial performance over a period of time, detailing revenues and expenses to arrive at a net profit or loss.</li>
                <li><strong className="flex items-center gap-1"><Landmark className="size-4"/>Balance Sheet:</strong> Provides a snapshot of your company's financial position at a single point in time, listing assets, liabilities, and equity.</li>
            </ul>
        </CardContent>
         <CardFooter>
            <Link href="/accounting/chart-of-accounts" passHref>
                <Button>Go to Accounting Section</Button>
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
