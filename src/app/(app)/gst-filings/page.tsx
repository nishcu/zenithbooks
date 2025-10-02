
"use client";

import { useState, useMemo, useContext } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowRight, FileSpreadsheet, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { AccountingContext } from "@/context/accounting-context";

// Generates a list of financial years
const getFinancialYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
        const startYear = currentYear - i;
        years.push(`${startYear}-${startYear + 1}`);
    }
    return years;
};

const months = [
    { value: "04", label: "April" }, { value: "05", label: "May" }, { value: "06", label: "June" },
    { value: "07", label: "July" }, { value: "08", label: "August" }, { value: "09", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
    { value: "01", label: "January" }, { value: "02", label: "February" }, { value: "03", label: "March" }
];


export default function GstFilings() {
    const { journalVouchers, loading } = useContext(AccountingContext)!;
    const [financialYear, setFinancialYear] = useState(getFinancialYears()[0]);
    const [month, setMonth] = useState(new Date().getMonth().toString().padStart(2, '0'));

    const { gstr1Summary, gstr3bSummary, netGstPayable } = useMemo(() => {
        const salesInvoices = journalVouchers.filter(v => v && v.id && v.id.startsWith("INV-"));
        const creditNotes = journalVouchers.filter(v => v && v.id && v.id.startsWith("CN-"));
        const purchaseBills = journalVouchers.filter(v => v && v.id && v.id.startsWith("BILL-"));
        const debitNotes = journalVouchers.filter(v => v && v.id && v.id.startsWith("DN-"));

        const taxableSales = salesInvoices.reduce((sum, v) => sum + (parseFloat(v.lines.find(l => l.account === '4010')?.credit || '0')), 0);
        const salesReturns = creditNotes.reduce((sum, v) => sum + (parseFloat(v.lines.find(l => l.account === '4010')?.debit || '0')), 0);
        const outputGst = salesInvoices.reduce((sum, v) => sum + (parseFloat(v.lines.find(l => l.account === '2110')?.credit || '0')), 0);
        const outputGstReversed = creditNotes.reduce((sum, v) => sum + (parseFloat(v.lines.find(l => l.account === '2110')?.debit || '0')), 0);
        
        const itcFromPurchases = purchaseBills.reduce((sum, v) => sum + (parseFloat(v.lines.find(l => l.account === '2110')?.debit || '0')), 0);
        const itcReversed = debitNotes.reduce((sum, v) => sum + (parseFloat(v.lines.find(l => l.account === '2110')?.credit || '0')), 0);
        
        const finalOutputGst = outputGst - outputGstReversed;
        const finalItc = itcFromPurchases - itcReversed;

        return {
            gstr1Summary: {
                b2b: { count: salesInvoices.length, value: taxableSales - salesReturns },
                b2c: { count: 0, value: 0 },
                cdnr: { count: creditNotes.length, value: salesReturns },
            },
            gstr3bSummary: {
                outwardTaxableValue: taxableSales - salesReturns,
                outwardTax: finalOutputGst,
                eligibleITC: finalItc,
            },
            netGstPayable: finalOutputGst - finalItc,
        }
    }, [journalVouchers]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">GST Filings</h1>
                <p className="text-muted-foreground">
                    Prepare and review your GST returns before filing on the official portal.
                </p>
            </div>
             <Card>
                <CardHeader>
                <CardTitle>Select Filing Period</CardTitle>
                <CardContent className="pt-6 grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Financial Year</label>
                        <Select value={financialYear} onValueChange={setFinancialYear}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {getFinancialYears().map(fy => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Month</label>
                        <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/gst-filings/gstr-1-wizard" className="block">
                    <Card className="hover:bg-muted/50 cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">GSTR-1 Wizard</CardTitle>
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">Prepare GSTR-1</div><p className="text-xs text-muted-foreground">Statement of outward supplies</p></CardContent>
                    </Card>
                </Link>
                 <Link href="/gst-filings/gstr-3b-wizard" className="block">
                    <Card className="hover:bg-muted/50 cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">GSTR-3B Wizard</CardTitle>
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">Prepare GSTR-3B</div><p className="text-xs text-muted-foreground">Monthly summary return</p></CardContent>
                    </Card>
                </Link>
                <Link href="/gst-filings/gstr-9-wizard" className="block">
                    <Card className="hover:bg-muted/50 cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">GSTR-9 Wizard</CardTitle>
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">Prepare Annual Return</div><p className="text-xs text-muted-foreground">Consolidated annual filing</p></CardContent>
                    </Card>
                </Link>
                 <Link href="/gst-filings/gstr-9c-reconciliation" className="block">
                    <Card className="hover:bg-muted/50 cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">GSTR-9C Utility</CardTitle>
                            <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">Prepare GSTR-9C</div><p className="text-xs text-muted-foreground">Reconciliation Statement</p></CardContent>
                    </Card>
                </Link>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>GSTR-1 Summary (Auto-Generated)</CardTitle>
                        <CardDescription>Based on your sales invoices and credit notes for the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">No. of Invoices</TableHead>
                                    <TableHead className="text-right">Taxable Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>B2B Supplies</TableCell>
                                    <TableCell className="text-right">{gstr1Summary.b2b.count}</TableCell>
                                    <TableCell className="text-right">₹{gstr1Summary.b2b.value.toFixed(2)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell>B2C Supplies</TableCell>
                                    <TableCell className="text-right">{gstr1Summary.b2c.count}</TableCell>
                                    <TableCell className="text-right">₹{gstr1Summary.b2c.value.toFixed(2)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Credit/Debit Notes (Reg.)</TableCell>
                                    <TableCell className="text-right">{gstr1Summary.cdnr.count}</TableCell>
                                    <TableCell className="text-right">₹{gstr1Summary.cdnr.value.toFixed(2)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>GSTR-3B Summary (Auto-Generated)</CardTitle>
                        <CardDescription>A summary of your tax liability and eligible ITC for the period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Outward Taxable Supplies</TableCell>
                                    <TableCell className="text-right">₹{gstr3bSummary.outwardTaxableValue.toFixed(2)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Total Tax on Outward Supplies</TableCell>
                                    <TableCell className="text-right text-destructive">₹{gstr3bSummary.outwardTax.toFixed(2)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Eligible Input Tax Credit (ITC)</TableCell>
                                    <TableCell className="text-right text-green-600">₹{gstr3bSummary.eligibleITC.toFixed(2)}</TableCell>
                                </TableRow>
                                <TableRow className="font-bold bg-muted/50">
                                    <TableCell>Net GST Payable</TableCell>
                                    <TableCell className="text-right">₹{netGstPayable.toFixed(2)}</TableCell>
                                </TableRow>
                            </TableBody>
                         </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
