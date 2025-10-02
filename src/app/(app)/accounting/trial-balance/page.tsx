
"use client";

import Link from "next/link";
import { useState, useContext, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileDown, AlertTriangle, ChevronDown, Upload, Download, FileSpreadsheet, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AccountingContext } from "@/context/accounting-context";
import { allAccounts } from "@/lib/accounts";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import * as XLSX from 'xlsx';


export default function TrialBalancePage() {
    
    const { toast } = useToast();
    const router = useRouter();
    const { journalVouchers } = useContext(AccountingContext)!;
    const [user] = useAuthState(auth);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isMismatchDialogOpen, setIsMismatchDialogOpen] = useState(false);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
    const [customersSnapshot] = useCollection(customersQuery);
    const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [customersSnapshot]);

    const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
    const [vendorsSnapshot] = useCollection(vendorsQuery);
    const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [vendorsSnapshot]);

    const trialBalanceData = useMemo(() => {
        const balances: Record<string, number> = {};

        // Initialize all possible accounts
        allAccounts.forEach(acc => { balances[acc.code] = 0; });
        customers.forEach(c => { balances[c.id] = 0; });
        vendors.forEach(v => { balances[v.id] = 0; });

        journalVouchers.forEach(voucher => {
            voucher.lines.forEach(line => {
                if (balances.hasOwnProperty(line.account)) {
                    const debit = parseFloat(line.debit);
                    const credit = parseFloat(line.credit);
                    balances[line.account] += debit - credit;
                }
            });
        });
        
        const combinedData = [
            ...allAccounts.map(acc => ({...acc, group: acc.type})),
            ...customers.map(c => ({ code: c.id, name: c.name, type: "Asset", group: "Customer" })),
            ...vendors.map(v => ({ code: v.id, name: v.name, type: "Liability", group: "Vendor" }))
        ];

        return combinedData.map(acc => {
            const finalBalance = balances[acc.code] || 0;
            const accountType = acc.type;
            
            let debit = 0;
            let credit = 0;

            if (accountType === 'Asset' || accountType === 'Expense' || accountType === 'Cost of Goods Sold') {
                if (finalBalance >= 0) debit = finalBalance;
                else credit = -finalBalance;
            } else { // Liability, Equity, Revenue
                if (finalBalance <= 0) credit = -finalBalance;
                else debit = finalBalance;
            }

            return {
                account: acc.name,
                code: acc.code,
                debit: debit,
                credit: credit,
            };
        }).filter(item => item.debit > 0.01 || item.credit > 0.01);

    }, [journalVouchers, customers, vendors]);

    const totalDebits = trialBalanceData.reduce((acc, item) => acc + item.debit, 0);
    const totalCredits = trialBalanceData.reduce((acc, item) => acc + item.credit, 0);
    const difference = totalDebits - totalCredits;

    const isMismatched = Math.abs(difference) > 0.01;
    
    const suspenseEntry = {
        account: "Suspense Account",
        code: "9999",
        debit: difference > 0 ? 0 : -difference,
        credit: difference > 0 ? difference : 0
    };

    const finalTrialBalanceData = isMismatched ? [...trialBalanceData, suspenseEntry] : trialBalanceData;
    const finalTotalDebits = finalTrialBalanceData.reduce((acc, item) => acc + item.debit, 0);
    const finalTotalCredits = finalTrialBalanceData.reduce((acc, item) => acc + item.credit, 0);


    const handleAccountClick = (code: string) => {
        if (code === '9999') return;
        router.push(`/accounting/ledgers?account=${code}`);
    }

    const handleRectifyPost = () => {
        router.push('/accounting/journal');
        setIsMismatchDialogOpen(false);
    }
    
    const handleFileUpload = () => {
        if (!uploadFile) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select a file to upload."});
            return;
        }

        console.log("Simulating file upload...");
        console.log("File Name:", uploadFile.name);

        toast({
            title: "Upload Simulated",
            description: `File '${uploadFile.name}' processed. In a real app, this would update your financial data.`,
        });
        setIsUploadDialogOpen(false);
    }
    
    const handleDownloadTemplate = () => {
        const headers = "Account,Debit,Credit";
        const exampleData = "Cash,10000,0\nSales,0,10000";
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${exampleData}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "trial_balance_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Template Downloaded", description: "Trial Balance CSV template has been downloaded." });
    }

    const handleExportCsv = () => {
        const dataToExport = finalTrialBalanceData.map(item => ({
            'Account Code': item.code,
            'Account Name': item.account,
            'Debit (₹)': item.debit.toFixed(2),
            'Credit (₹)': item.credit.toFixed(2),
        }));
        
        const totalRow = {
            'Account Code': '',
            'Account Name': 'Total',
            'Debit (₹)': finalTotalDebits.toFixed(2),
            'Credit (₹)': finalTotalCredits.toFixed(2),
        };
        dataToExport.push(totalRow);
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Trial Balance");
        XLSX.writeFile(workbook, `Trial_Balance_${format(date || new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({ title: "Export Successful", description: "Trial Balance has been exported to Excel." });
    };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trial Balance</h1>
          <p className="text-muted-foreground">
            A summary of all ledger balances to verify the equality of debits and credits.
          </p>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    Import/Export
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                 <DropdownMenuItem onSelect={() => setIsUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportCsv}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <CardTitle>Trial Balance as on {date ? format(date, "dd MMM, yyyy") : 'selected date'}</CardTitle>
                    <CardDescription>This report is dynamically generated from your journal entries.</CardDescription>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full md:w-[280px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "dd MMM, yyyy") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Account Code</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead className="text-right">Debit (₹)</TableHead>
                            <TableHead className="text-right">Credit (₹)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {finalTrialBalanceData.map((item) => (
                            <TableRow key={item.code} className={item.code === '9999' ? 'bg-destructive/10 text-destructive' : ''}>
                                <TableCell>{item.code}</TableCell>
                                <TableCell 
                                    className={cn("font-medium", item.code !== '9999' && "hover:underline cursor-pointer")}
                                    onClick={() => handleAccountClick(item.code)}
                                >
                                    {item.account}
                                </TableCell>
                                <TableCell className="text-right font-mono">{item.debit > 0 ? item.debit.toFixed(2) : "-"}</TableCell>
                                <TableCell className="text-right font-mono">{item.credit > 0 ? item.credit.toFixed(2) : "-"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-muted/50 font-bold hover:bg-muted/50">
                            <TableCell colSpan={2} className="text-right">Total</TableCell>
                            <TableCell className="text-right font-mono">₹{finalTotalDebits.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">₹{finalTotalCredits.toFixed(2)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            {isMismatched && (
                <div 
                    className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive font-semibold text-center cursor-pointer hover:bg-destructive/20"
                    onClick={() => setIsMismatchDialogOpen(true)}
                >
                    <div className="flex items-center justify-center gap-2">
                         <AlertTriangle className="h-5 w-5" />
                        <span>Warning: Debits and Credits do not match! Difference: ₹{Math.abs(difference).toFixed(2)}. Click to see discrepancies.</span>
                    </div>
                </div>
            )}
          </CardContent>
      </Card>
      
      <Dialog open={isMismatchDialogOpen} onOpenChange={setIsMismatchDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Trial Balance Discrepancies</DialogTitle>
                <DialogDescription>
                   The following entry has been created in a temporary Suspense Account to balance the Trial Balance difference of ₹{Math.abs(difference).toFixed(2)}.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Account</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">{suspenseEntry.account}</TableCell>
                            <TableCell className="text-right font-mono">{suspenseEntry.debit > 0 ? suspenseEntry.debit.toFixed(2) : "-"}</TableCell>
                            <TableCell className="text-right font-mono">{suspenseEntry.credit > 0 ? suspenseEntry.credit.toFixed(2) : "-"}</TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" onClick={handleRectifyPost}>Rectify</Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsMismatchDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Upload Trial Balance CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV to generate financial reports from that data. The file must contain 'Account', 'Debit', and 'Credit' columns.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="tb-file">CSV File</Label>
                    <Input id="tb-file" type="file" accept=".csv" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleFileUpload}>Upload and Process</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
