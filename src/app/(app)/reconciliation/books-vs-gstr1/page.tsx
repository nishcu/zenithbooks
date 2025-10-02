
"use client";

import { useState, useMemo, useContext } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, GitCompareArrows } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AccountingContext } from "@/context/accounting-context";
import * as XLSX from 'xlsx';
import { StatCard } from '@/components/dashboard/stat-card';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Gstr1Record = {
  'Invoice number': string;
  'Invoice date': string;
  'Invoice value': number;
  'Taxable value': number;
  'Integrated Tax': number;
  [key: string]: any;
};

type BookRecord = {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  taxableValue: number;
  taxAmount: number;
};

type ReconciliationResult = {
    reconciled: (BookRecord & {gstr1Value: number})[];
    onlyInBooks: BookRecord[];
    onlyInGstr1: Gstr1Record[];
};

export default function BooksVsGstr1Page() {
    const { toast } = useToast();
    const { journalVouchers, loading: jvLoading } = useContext(AccountingContext)!;
    
    const [gstr1Data, setGstr1Data] = useState<Gstr1Record[]>([]);
    const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);

    const bookSalesData: BookRecord[] = useMemo(() => {
        return journalVouchers
            .filter(v => v && v.id && v.id.startsWith("INV-"))
            .map(v => {
                const taxableValue = parseFloat(v.lines.find(l => l.account === '4010')?.credit || '0');
                const taxAmount = parseFloat(v.lines.find(l => l.account === '2110')?.credit || '0');
                return {
                    invoiceNumber: v.id,
                    invoiceDate: v.date,
                    invoiceValue: v.amount,
                    taxableValue,
                    taxAmount
                };
            });
    }, [journalVouchers]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as Gstr1Record[];
            
            // Basic validation
            if (json.length > 0 && 'Invoice number' in json[0] && 'Invoice value' in json[0]) {
                 setGstr1Data(json);
                 toast({ title: "GSTR-1 Data Loaded", description: `${json.length} records found.` });
            } else {
                 toast({ variant: 'destructive', title: "Invalid File", description: "The uploaded file does not seem to be a valid GSTR-1 report." });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleReconcile = () => {
        const bookInvoicesMap = new Map(bookSalesData.map(inv => [inv.invoiceNumber, inv]));
        const gstr1InvoicesMap = new Map(gstr1Data.map(inv => [inv['Invoice number'], inv]));

        const reconciled: (BookRecord & {gstr1Value: number})[] = [];
        const onlyInBooks: BookRecord[] = [];
        const onlyInGstr1: Gstr1Record[] = [];

        bookSalesData.forEach(bookInv => {
            const gstr1Inv = gstr1InvoicesMap.get(bookInv.invoiceNumber);
            if (gstr1Inv) {
                reconciled.push({ ...bookInv, gstr1Value: gstr1Inv['Invoice value'] });
                gstr1InvoicesMap.delete(bookInv.invoiceNumber); // Remove from map to find what's left
            } else {
                onlyInBooks.push(bookInv);
            }
        });

        onlyInGstr1.push(...Array.from(gstr1InvoicesMap.values()));

        setReconciliationResult({ reconciled, onlyInBooks, onlyInGstr1 });
        toast({ title: "Reconciliation Complete!", description: "Review the results below." });
    };

    const bookTotal = bookSalesData.reduce((acc, curr) => acc + curr.taxableValue, 0);
    const gstr1Total = gstr1Data.reduce((acc, curr) => acc + curr['Taxable value'], 0);
    const difference = bookTotal - gstr1Total;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Books vs. GSTR-1 Reconciliation</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Reconciliation Setup</CardTitle>
                    <CardDescription>Upload your GSTR-1 sales report (from the GST portal) to compare it against your accounting records in ZenithBooks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="gstr1-upload">Upload GSTR-1 B2B CSV File</Label>
                        <Input id="gstr1-upload" type="file" accept=".csv, .xlsx" onChange={handleFileUpload} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleReconcile} disabled={gstr1Data.length === 0}>
                        <GitCompareArrows className="mr-2"/> Reconcile
                    </Button>
                </CardFooter>
            </Card>

             <div className="grid md:grid-cols-3 gap-4">
                <StatCard title="Turnover as per Books" value={formatCurrency(bookTotal)} loading={jvLoading}/>
                <StatCard title="Turnover as per GSTR-1" value={formatCurrency(gstr1Total)} />
                <StatCard title="Difference" value={formatCurrency(difference)} className={Math.abs(difference) > 0.01 ? "text-destructive" : ""} />
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader><CardTitle>Sales as per Books</CardTitle></CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto">
                        <SalesTable data={bookSalesData} type="book"/>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Sales as per GSTR-1</CardTitle></CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto">
                        <SalesTable data={gstr1Data} type="gstr1"/>
                    </CardContent>
                </Card>
            </div>
            
            {reconciliationResult && (
                 <Card>
                    <CardHeader><CardTitle>Reconciliation Results</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2">Reconciled Invoices ({reconciliationResult.reconciled.length})</h3>
                            <SalesTable data={reconciliationResult.reconciled} type="reconciled" />
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2 text-orange-600">Found only in Books ({reconciliationResult.onlyInBooks.length})</h3>
                            <SalesTable data={reconciliationResult.onlyInBooks} type="book" />
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2 text-blue-600">Found only in GSTR-1 ({reconciliationResult.onlyInGstr1.length})</h3>
                            <SalesTable data={reconciliationResult.onlyInGstr1} type="gstr1" />
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}


function SalesTable({ data, type }: { data: any[], type: 'book' | 'gstr1' | 'reconciled' }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    {type === 'reconciled' && <TableHead className="text-right">Difference</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No data available.</TableCell></TableRow>
                ) : (
                    data.map((row, index) => {
                        const isBook = 'invoiceNumber' in row;
                        const isGstr1 = 'Invoice number' in row;
                        const difference = type === 'reconciled' ? row.invoiceValue - row.gstr1Value : 0;
                        return (
                            <TableRow key={index}>
                                <TableCell>{isBook ? row.invoiceNumber : row['Invoice number']}</TableCell>
                                <TableCell>{isBook ? row.invoiceDate : row['Invoice date']}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(isBook ? row.invoiceValue : row['Invoice value'])}</TableCell>
                                {type === 'reconciled' && (
                                    <TableCell className={`text-right font-mono ${Math.abs(difference) > 0.01 ? 'text-destructive' : ''}`}>
                                        {formatCurrency(difference)}
                                    </TableCell>
                                )}
                            </TableRow>
                        )
                    })
                )}
            </TableBody>
        </Table>
    );
}

