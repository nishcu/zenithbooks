
"use client";

import { useState, useContext, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, FileText, Loader2, File, Database, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AccountingContext } from "@/context/accounting-context";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { exportToCSV, exportToExcel, ExportData } from "@/lib/export-utils";
import * as XLSX from "xlsx";
import { format } from "date-fns";


const exportOptions = [
    { title: "Day Book", description: "All transactional vouchers.", type: "xlsx" },
    { title: "General Ledger", description: "Full transaction history for all accounts.", type: "xlsx" },
    { title: "Trial Balance", description: "Summary of all ledger balances.", type: "csv" },
    { title: "All Sales Invoices", description: "Detailed list of all sales invoices.", type: "xlsx" },
    { title: "All Purchase Bills", description: "Detailed list of all purchase bills.", type: "xlsx" },
    { title: "Customer & Vendor List", description: "Complete list of all parties.", type: "csv" },
    { title: "Stock Item List", description: "Complete list of all stock items.", type: "csv" },
];

export default function ImportExportPage() {
    const [tallyVoucherFile, setTallyVoucherFile] = useState<File | null>(null);
    const [tallyMasterFile, setTallyMasterFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const { toast } = useToast();

    const [gstr1File, setGstr1File] = useState<File | null>(null);
    const [gstr2bFile, setGstr2bFile] = useState<File | null>(null);
    const [itrJsonFile, setItrJsonFile] = useState<File | null>(null);
    const [aisFile, setAisFile] = useState<File | null>(null);

    // Data fetching for exports
    const accountingContext = useContext(AccountingContext);
    const [user] = useAuthState(auth);
    const { journalVouchers } = accountingContext || { journalVouchers: [] };

    const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
    const [customersSnapshot] = useCollection(customersQuery);
    const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

    const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
    const [vendorsSnapshot] = useCollection(vendorsQuery);
    const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [vendorsSnapshot]);

    const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
    const [itemsSnapshot] = useCollection(itemsQuery);
    const items = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [itemsSnapshot]);


    const handleTallyImport = async (importType: 'vouchers' | 'masters') => {
        const fileToImport = importType === 'vouchers' ? tallyVoucherFile : tallyMasterFile;
        if (!fileToImport) {
            toast({
                variant: "destructive",
                title: "No File Selected",
                description: "Please select a Tally XML file to import.",
            });
            return;
        }

        setIsImporting(true);
        toast({
            title: `Importing Tally ${importType}...`,
            description: "This may take a few moments.",
        });

        const formData = new FormData();
        formData.append('file', fileToImport);

        try {
            // In a real app, you might have different endpoints or pass the importType
            const response = await fetch('/api/import/tally', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "An unknown error occurred.");
            }
            
            toast({
                title: "Import Successful!",
                description: result.message,
            });

        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Import Failed",
                description: error.message,
            });
        } finally {
            setIsImporting(false);
            if(importType === 'vouchers') setTallyVoucherFile(null);
            else setTallyMasterFile(null);
        }
    };
    
    const handleGenericImport = (file: File | null, type: string) => {
         if (!file) {
            toast({ variant: "destructive", title: "No File Selected", description: `Please select a file for ${type}.` });
            return;
        }
         toast({ title: "Import Successful (Simulated)", description: `Your ${type} file '${file.name}' has been processed.`});
    }

    // Export functions
    const handleExport = async (exportType: string) => {
        setIsExporting(exportType);
        try {
            switch (exportType) {
                case "Day Book":
                    await exportDayBook();
                    break;
                case "General Ledger":
                    await exportGeneralLedger();
                    break;
                case "Trial Balance":
                    await exportTrialBalance();
                    break;
                case "All Sales Invoices":
                    await exportSalesInvoices();
                    break;
                case "All Purchase Bills":
                    await exportPurchaseBills();
                    break;
                case "Customer & Vendor List":
                    await exportParties();
                    break;
                case "Stock Item List":
                    await exportItems();
                    break;
                default:
                    toast({ variant: "destructive", title: "Unknown Export Type", description: `Export type "${exportType}" is not supported.` });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Export Failed", description: error.message || "An error occurred during export." });
        } finally {
            setIsExporting(null);
        }
    };

    const exportDayBook = async () => {
        const headers = ["Date", "Voucher ID", "Voucher Type", "Narration", "Account", "Debit", "Credit", "Amount"];
        const rows = journalVouchers.flatMap(v => 
            v.lines.map(line => [
                v.date,
                v.id,
                v.narration || "Journal",
                v.narration || "",
                line.account,
                parseFloat(line.debit) || 0,
                parseFloat(line.credit) || 0,
                v.amount || 0
            ])
        );
        exportToExcel({ headers, rows }, { fileName: "Day_Book", includeDate: true });
        toast({ title: "Export Successful", description: "Day Book has been exported successfully." });
    };

    const exportGeneralLedger = async () => {
        // Group by account
        const accountMap = new Map<string, any[]>();
        journalVouchers.forEach(v => {
            v.lines.forEach(line => {
                if (!accountMap.has(line.account)) {
                    accountMap.set(line.account, []);
                }
                accountMap.get(line.account)!.push({
                    date: v.date,
                    voucherId: v.id,
                    narration: v.narration,
                    debit: parseFloat(line.debit) || 0,
                    credit: parseFloat(line.credit) || 0
                });
            });
        });

        const sheets: ExportData[] = [];
        accountMap.forEach((entries, account) => {
            const headers = ["Date", "Voucher ID", "Narration", "Debit", "Credit", "Balance"];
            let balance = 0;
            const rows = entries.map(entry => {
                balance += entry.debit - entry.credit;
                return [entry.date, entry.voucherId, entry.narration, entry.debit, entry.credit, balance];
            });
            sheets.push({ headers, rows, sheetName: account.substring(0, 31) });
        });

        exportToExcel(sheets, { fileName: "General_Ledger", includeDate: true });
        toast({ title: "Export Successful", description: "General Ledger has been exported successfully." });
    };

    const exportTrialBalance = async () => {
        const accountMap = new Map<string, { debit: number; credit: number }>();
        journalVouchers.forEach(v => {
            v.lines.forEach(line => {
                if (!accountMap.has(line.account)) {
                    accountMap.set(line.account, { debit: 0, credit: 0 });
                }
                const acc = accountMap.get(line.account)!;
                acc.debit += parseFloat(line.debit) || 0;
                acc.credit += parseFloat(line.credit) || 0;
            });
        });

        const headers = ["Account Code", "Account Name", "Debit", "Credit"];
        const rows = Array.from(accountMap.entries()).map(([code, balances]) => [
            code,
            code, // Account name would need to be resolved
            balances.debit,
            balances.credit
        ]);

        exportToCSV({ headers, rows }, { fileName: "Trial_Balance", includeDate: true });
        toast({ title: "Export Successful", description: "Trial Balance has been exported successfully." });
    };

    const exportSalesInvoices = async () => {
        const invoices = journalVouchers.filter(v => v.id && v.id.startsWith("INV-"));
        const headers = ["Invoice Number", "Date", "Customer", "Amount", "Tax", "Total"];
        const rows = invoices.map(v => {
            const customer = customers.find(c => c.id === v.customerId);
            const taxLine = v.lines.find(l => l.account === '2110');
            const tax = parseFloat(taxLine?.credit || '0');
            const subtotal = v.amount - tax;
            return [
                v.id.replace("INV-", ""),
                v.date,
                customer?.name || "Unknown",
                subtotal,
                tax,
                v.amount
            ];
        });
        exportToExcel({ headers, rows }, { fileName: "Sales_Invoices", includeDate: true });
        toast({ title: "Export Successful", description: "Sales Invoices have been exported successfully." });
    };

    const exportPurchaseBills = async () => {
        const bills = journalVouchers.filter(v => v.id && (v.id.startsWith("BILL-") || v.id.startsWith("PUR-")));
        const headers = ["Bill Number", "Date", "Vendor", "Amount", "Tax", "Total"];
        const rows = bills.map(bill => {
            const vendor = vendors.find(v => v.id === bill.vendorId);
            const taxLine = bill.lines.find(l => l.account === '2110');
            const tax = parseFloat(taxLine?.debit || '0');
            const subtotal = bill.amount - tax;
            return [
                bill.id,
                bill.date,
                vendor?.name || "Unknown",
                subtotal,
                tax,
                bill.amount
            ];
        });
        exportToExcel({ headers, rows }, { fileName: "Purchase_Bills", includeDate: true });
        toast({ title: "Export Successful", description: "Purchase Bills have been exported successfully." });
    };

    const exportParties = async () => {
        const headers = ["Type", "Name", "Account Code", "GSTIN", "Email", "Phone", "Address", "City", "State", "Pincode"];
        const customerRows = customers.map(c => [
            "Customer",
            c.name || "",
            c.accountCode || "",
            c.gstin || "",
            c.email || "",
            c.phone || "",
            c.address1 || "",
            c.city || "",
            c.state || "",
            c.pincode || ""
        ]);
        const vendorRows = vendors.map(v => [
            "Vendor",
            v.name || "",
            v.accountCode || "",
            v.gstin || "",
            v.email || "",
            v.phone || "",
            v.address1 || "",
            v.city || "",
            v.state || "",
            v.pincode || ""
        ]);
        exportToCSV({ headers, rows: [...customerRows, ...vendorRows] }, { fileName: "Parties", includeDate: true });
        toast({ title: "Export Successful", description: "Customer & Vendor list has been exported successfully." });
    };

    const exportItems = async () => {
        const headers = ["Item Code", "Name", "Unit", "HSN/SAC", "GST Rate", "Purchase Rate", "Sales Rate", "Stock"];
        const rows = items.map(item => [
            item.code || item.id,
            item.name || "",
            item.unit || "",
            item.hsn || "",
            item.gstRate || 0,
            item.purchaseRate || 0,
            item.salesRate || 0,
            item.stock || 0
        ]);
        exportToCSV({ headers, rows }, { fileName: "Stock_Items", includeDate: true });
        toast({ title: "Export Successful", description: "Stock Item list has been exported successfully." });
    };

    // Template download functions
    const handleDownloadTemplate = (templateType: string) => {
        try {
            switch (templateType) {
                case "parties":
                    downloadPartiesTemplate();
                    break;
                case "items":
                    downloadItemsTemplate();
                    break;
                case "trial-balance":
                    downloadTrialBalanceTemplate();
                    break;
                default:
                    toast({ variant: "destructive", title: "Unknown Template", description: `Template type "${templateType}" is not available.` });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Template Download Failed", description: error.message || "An error occurred." });
        }
    };

    const downloadPartiesTemplate = () => {
        const templateData = [{
            Name: "Sample Customer",
            AccountCode: "",
            GSTIN: "27ABCDE1234F1Z5",
            Email: "sample@example.com",
            Phone: "9876543210",
            Address: "123 Sample Street",
            City: "Mumbai",
            State: "Maharashtra",
            Pincode: "400001"
        }];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "parties_import_template.xlsx");
        toast({ title: "Template Downloaded", description: "Parties import template has been downloaded." });
    };

    const downloadItemsTemplate = () => {
        const templateData = [{
            ItemCode: "ITEM001",
            Name: "Sample Item",
            Unit: "Nos",
            HSN: "12345678",
            GSTRate: 18,
            PurchaseRate: 100,
            SalesRate: 150,
            Stock: 0
        }];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "items_import_template.xlsx");
        toast({ title: "Template Downloaded", description: "Items import template has been downloaded." });
    };

    const downloadTrialBalanceTemplate = () => {
        const headers = "Account Code,Account Name,Debit,Credit";
        const exampleData = "1000,Cash,10000,0\n4000,Sales,0,10000";
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${exampleData}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "trial_balance_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Template Downloaded", description: "Trial Balance CSV template has been downloaded." });
    };

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Import & Export Data</h1>
                <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
                    Seamlessly move your data in and out of ZenithBooks.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Upload/> Import Data</CardTitle>
                        <CardDescription>Import data from other software and sources.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Tabs defaultValue="tally">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="tally">Tally</TabsTrigger>
                                <TabsTrigger value="gst">GST Portal</TabsTrigger>
                                <TabsTrigger value="it">Income Tax</TabsTrigger>
                            </TabsList>
                            <TabsContent value="tally" className="pt-4">
                                <div className="space-y-6">
                                    <div className="p-4 border rounded-lg space-y-4">
                                        <h3 className="font-semibold flex items-center gap-2"><File className="text-primary"/> Vouchers (Day Book)</h3>
                                        <p className="text-sm text-muted-foreground">Upload your Day Book exported from Tally in XML format. We'll automatically create the corresponding accounting vouchers.</p>
                                        <div className="space-y-2">
                                            <Label htmlFor="tally-file-vouchers">Tally Day Book (.xml)</Label>
                                            <Input id="tally-file-vouchers" type="file" accept=".xml" onChange={(e) => setTallyVoucherFile(e.target.files?.[0] || null)} />
                                        </div>
                                        <Button onClick={() => handleTallyImport('vouchers')} disabled={isImporting || !tallyVoucherFile}>
                                            {isImporting ? <Loader2 className="mr-2 animate-spin"/> : <Upload className="mr-2" />}
                                            Import Vouchers
                                        </Button>
                                    </div>
                                     <div className="p-4 border rounded-lg space-y-4">
                                        <h3 className="font-semibold flex items-center gap-2"><Users className="text-primary"/> Masters (Ledgers & Items)</h3>
                                        <p className="text-sm text-muted-foreground">Upload your Masters export from Tally in XML format to import customers, vendors, and stock items.</p>
                                        <div className="space-y-2">
                                            <Label htmlFor="tally-file-masters">Tally Masters (.xml)</Label>
                                            <Input id="tally-file-masters" type="file" accept=".xml" onChange={(e) => setTallyMasterFile(e.target.files?.[0] || null)} />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={() => handleTallyImport('masters')} disabled={isImporting || !tallyMasterFile}>
                                                {isImporting ? <Loader2 className="mr-2 animate-spin"/> : <Upload className="mr-2" />}
                                                Import Masters
                                            </Button>
                                            <Button variant="outline" onClick={() => handleDownloadTemplate("parties")}>
                                                <Download className="mr-2"/> Download Template
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                             <TabsContent value="gst" className="pt-4">
                                <div className="p-4 border rounded-lg space-y-6">
                                    <h3 className="font-semibold flex items-center gap-2"><Database className="text-primary"/> GST Data</h3>
                                    <p className="text-sm text-muted-foreground">Import your monthly GST returns data from the official portal's JSON or CSV files.</p>
                                    
                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="gstr1-upload">GSTR-1 Data</Label>
                                            <p className="text-xs text-muted-foreground">Import outward supplies data from GSTR-1.</p>
                                            <div className="flex gap-2">
                                                <Input id="gstr1-upload" type="file" accept=".json,.csv" onChange={e => setGstr1File(e.target.files?.[0] || null)} />
                                                <Button variant="outline" onClick={() => handleGenericImport(gstr1File, 'GSTR-1')}>Import</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="gstr2b-upload">GSTR-2B Data</Label>
                                            <p className="text-xs text-muted-foreground">Import ITC data from GSTR-2B for reconciliation.</p>
                                            <div className="flex gap-2">
                                                <Input id="gstr2b-upload" type="file" accept=".json,.csv" onChange={e => setGstr2bFile(e.target.files?.[0] || null)} />
                                                <Button variant="outline" onClick={() => handleGenericImport(gstr2bFile, 'GSTR-2B')}>Import</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                             <TabsContent value="it" className="pt-4">
                               <div className="p-4 border rounded-lg space-y-6">
                                    <h3 className="font-semibold flex items-center gap-2"><Database className="text-primary"/> Income Tax Data</h3>
                                    <p className="text-sm text-muted-foreground">Import pre-filled ITR JSON, AIS/TIS, or Form 26AS data to simplify your tax filing process.</p>
                                    
                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="itr-json-upload">ITR Pre-filled JSON</Label>
                                            <p className="text-xs text-muted-foreground">Upload the JSON from the Income Tax portal to pre-fill ITR forms.</p>
                                            <div className="flex gap-2">
                                                <Input id="itr-json-upload" type="file" accept=".json" onChange={e => setItrJsonFile(e.target.files?.[0] || null)} />
                                                <Button variant="outline" onClick={() => handleGenericImport(itrJsonFile, 'ITR JSON')}>Import Data</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ais-upload">AIS/TIS Report</Label>
                                            <p className="text-xs text-muted-foreground">Import Annual Information Statement (AIS) or Taxpayer Information Summary (TIS).</p>
                                            <div className="flex gap-2">
                                                <Input id="ais-upload" type="file" accept=".pdf,.json" onChange={e => setAisFile(e.target.files?.[0] || null)}/>
                                                <Button variant="outline" onClick={() => handleGenericImport(aisFile, 'AIS/TIS')}>Import Data</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Download/> Export Data</CardTitle>
                        <CardDescription>Export your ZenithBooks data for backups or use in other applications.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-2">
                        {exportOptions.map(opt => (
                             <div key={opt.title} className="p-2 border rounded-md flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {opt.type === 'xlsx' ? <FileSpreadsheet className="size-5 text-green-600"/> : <FileText className="size-5 text-blue-600"/>}
                                    <div>
                                        <p className="font-medium">{opt.title}</p>
                                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleExport(opt.title)}
                                    disabled={isExporting === opt.title}
                                >
                                    {isExporting === opt.title ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Exporting...
                                        </>
                                    ) : (
                                        <>Export</>
                                    )}
                                </Button>
                             </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
