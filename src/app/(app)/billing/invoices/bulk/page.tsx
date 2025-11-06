"use client";

import { useState, useContext, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AccountingContext } from "@/context/accounting-context";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";
import * as XLSX from 'xlsx';
import { ScrollArea } from "@/components/ui/scroll-area";
import { applyExcelFormatting } from "@/lib/export-utils";

interface BulkInvoiceRow {
  customerName: string;
  productName: string;
  quantity: number;
  price: number;
  taxRate?: number;
  invoiceDate?: string;
}

interface ParsedInvoice {
  id: string;
  customerId: string;
  customerName: string;
  productId?: string;
  productName: string;
  hsn: string;
  quantity: number;
  price: number;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  invoiceDate: string;
  invoiceNumber: string;
  status: 'valid' | 'error';
  errors: string[];
}

export default function BulkInvoicePage() {
  const accountingContext = useContext(AccountingContext);
  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [parsedInvoices, setParsedInvoices] = useState<ParsedInvoice[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(18);
  const [startingInvoiceNumber, setStartingInvoiceNumber] = useState<string>("");

  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);
  const items = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [itemsSnapshot]);

  // Auto-generate starting invoice number
  useEffect(() => {
    if (accountingContext?.journalVouchers) {
      const journalVouchers = accountingContext.journalVouchers;
      const invoices = journalVouchers.filter((v: any) => v && v.id && v.id.startsWith("INV-"));
      const lastInvoice = invoices[invoices.length - 1];
      
      if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.id.replace("INV-", "").replace(/[^0-9]/g, ''), 10);
        const nextNumber = isNaN(lastNumber) ? "001" : String(lastNumber + 1).padStart(3, '0');
        setStartingInvoiceNumber(nextNumber);
      } else {
        setStartingInvoiceNumber("001");
      }
    }
  }, [accountingContext]);

  const handleDownloadTemplate = () => {
    const headers = ["Customer Name", "Product Name", "Quantity", "Price", "Tax Rate (%)", "Invoice Date"];
    const exampleData = [
      ["ABC Company", "Product XYZ", "5", "1000.00", "18", format(new Date(), "yyyy-MM-dd")],
      ["XYZ Corporation", "Service ABC", "10", "500.00", "18", format(new Date(), "yyyy-MM-dd")],
      ["Sample Customer", "Item 123", "2", "2500.00", "5", format(new Date(), "yyyy-MM-dd")],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
    
    // Apply formatting for print-ready output
    applyExcelFormatting(ws, headers, exampleData);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bulk Invoices");
    
    XLSX.writeFile(wb, "bulk_invoice_template.xlsx");
    toast({ title: "Template Downloaded", description: "CSV template has been downloaded. Fill in your invoice data and upload." });
  };

  const parseCSV = (file: File): Promise<BulkInvoiceRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('CSV file is empty or invalid. Please include header row and at least one data row.'));
            return;
          }

          // Parse CSV (handle quoted values)
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };

          const headerRow = parseCSVLine(lines[0].toLowerCase());
          let customerIndex = -1;
          let productIndex = -1;
          let qtyIndex = -1;
          let priceIndex = -1;
          let taxRateIndex = -1;
          let dateIndex = -1;

          // Find column indices - be more specific to avoid confusion
          headerRow.forEach((header, index) => {
            const h = header.toLowerCase().replace(/"/g, '').trim();
            if (h.includes('customer')) customerIndex = index;
            if (h.includes('product') || h.includes('item') || h.includes('service')) productIndex = index;
            if (h.includes('quantity') || h.includes('qty')) qtyIndex = index;
            // Price: match "price" but NOT "tax rate" or just "rate" alone
            if (h.includes('price') && !h.includes('tax') && !h.includes('rate')) {
              priceIndex = index;
            }
            // Tax Rate: must include both "tax" and "rate"
            if (h.includes('tax') && h.includes('rate')) {
              taxRateIndex = index;
            }
            if (h.includes('date') && h.includes('invoice')) dateIndex = index;
          });

          // Default indices if not found
          if (customerIndex === -1) customerIndex = 0;
          if (productIndex === -1) productIndex = 1;
          if (qtyIndex === -1) qtyIndex = 2;
          if (priceIndex === -1) priceIndex = 3;
          if (taxRateIndex === -1) taxRateIndex = 4;
          if (dateIndex === -1) dateIndex = 5;

          const rows: BulkInvoiceRow[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 4) continue; // Skip incomplete rows

            const customerName = values[customerIndex]?.replace(/"/g, '').trim() || '';
            const productName = values[productIndex]?.replace(/"/g, '').trim() || '';
            const quantity = parseFloat(values[qtyIndex]?.replace(/,/g, '') || '0');
            const price = parseFloat(values[priceIndex]?.replace(/,/g, '') || '0');
            const taxRate = parseFloat(values[taxRateIndex]?.replace(/,/g, '') || String(defaultTaxRate));
            const invoiceDate = values[dateIndex]?.replace(/"/g, '').trim() || invoiceDate;

            if (customerName && productName && quantity > 0 && price > 0) {
              rows.push({
                customerName,
                productName,
                quantity,
                price,
                taxRate: taxRate || defaultTaxRate,
                invoiceDate: invoiceDate || format(new Date(), "yyyy-MM-dd"),
              });
            }
          }

          if (rows.length === 0) {
            reject(new Error('No valid rows found in CSV. Please check the format and ensure all required fields are present.'));
            return;
          }

          resolve(rows);
        } catch (error: any) {
          reject(new Error(`CSV parsing error: ${error.message || 'Invalid CSV format'}`));
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseExcel = (file: File): Promise<BulkInvoiceRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', raw: false });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];

          if (json.length < 2) {
            reject(new Error('Excel file is empty or invalid. Please include header row and at least one data row.'));
            return;
          }

          const headerRow = json[0].map((h: any) => String(h || '').toLowerCase());
          let customerIndex = -1;
          let productIndex = -1;
          let qtyIndex = -1;
          let priceIndex = -1;
          let taxRateIndex = -1;
          let dateIndex = -1;

          headerRow.forEach((header, index) => {
            const h = String(header || '').toLowerCase();
            if (h.includes('customer')) customerIndex = index;
            if (h.includes('product') || h.includes('item') || h.includes('service')) productIndex = index;
            if (h.includes('quantity') || h.includes('qty')) qtyIndex = index;
            // Price: match "price" but NOT "tax rate" or just "rate" alone
            if (h.includes('price') && !h.includes('tax') && !h.includes('rate')) {
              priceIndex = index;
            }
            // Tax Rate: must include both "tax" and "rate"
            if (h.includes('tax') && h.includes('rate')) {
              taxRateIndex = index;
            }
            if (h.includes('date') && h.includes('invoice')) dateIndex = index;
          });

          if (customerIndex === -1) customerIndex = 0;
          if (productIndex === -1) productIndex = 1;
          if (qtyIndex === -1) qtyIndex = 2;
          if (priceIndex === -1) priceIndex = 3;
          if (taxRateIndex === -1) taxRateIndex = 4;
          if (dateIndex === -1) dateIndex = 5;

          const rows: BulkInvoiceRow[] = [];
          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (!row || row.length < 4) continue;

            const customerName = String(row[customerIndex] || '').trim();
            const productName = String(row[productIndex] || '').trim();
            const quantity = parseFloat(String(row[qtyIndex] || '0').replace(/,/g, ''));
            const price = parseFloat(String(row[priceIndex] || '0').replace(/,/g, ''));
            const taxRate = parseFloat(String(row[taxRateIndex] || defaultTaxRate).replace(/,/g, ''));
            const invoiceDate = String(row[dateIndex] || invoiceDate).trim();

            if (customerName && productName && quantity > 0 && price > 0) {
              rows.push({
                customerName,
                productName,
                quantity,
                price,
                taxRate: taxRate || defaultTaxRate,
                invoiceDate: invoiceDate || format(new Date(), "yyyy-MM-dd"),
              });
            }
          }

          if (rows.length === 0) {
            reject(new Error('No valid rows found in Excel file. Please check the format.'));
            return;
          }

          resolve(rows);
        } catch (error: any) {
          reject(new Error(`Excel parsing error: ${error.message || 'Invalid Excel format'}`));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    try {
      let rows: BulkInvoiceRow[];
      
      if (fileExtension === 'csv') {
        rows = await parseCSV(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        rows = await parseExcel(file);
      } else {
        toast({ variant: "destructive", title: "Unsupported Format", description: "Please upload a CSV or Excel file." });
        setIsProcessing(false);
        return;
      }

      // Process rows and create parsed invoices
      const processed: ParsedInvoice[] = [];
      let currentInvoiceNumber = parseInt(startingInvoiceNumber.replace(/[^0-9]/g, ''), 10);
      if (isNaN(currentInvoiceNumber)) currentInvoiceNumber = 1;

      for (const row of rows) {
        const errors: string[] = [];
        
        // Find customer
        const customer = customers.find((c: any) => 
          c.name.toLowerCase().trim() === row.customerName.toLowerCase().trim()
        );
        
        if (!customer) {
          errors.push(`Customer "${row.customerName}" not found`);
        }

        // Find product/item
        const item = items.find((i: any) => 
          i.name.toLowerCase().trim() === row.productName.toLowerCase().trim()
        );

        let hsn = '';
        if (item) {
          hsn = item.hsn || '';
        } else {
          errors.push(`Product "${row.productName}" not found. HSN code will be empty.`);
        }

        // Calculate amounts
        const subtotal = row.quantity * row.price;
        const tax = subtotal * (row.taxRate / 100);
        const total = subtotal + tax;

        // Generate invoice number
        const invoiceNumber = String(currentInvoiceNumber).padStart(3, '0');
        currentInvoiceNumber++;

        processed.push({
          id: `bulk-${Date.now()}-${Math.random()}`,
          customerId: customer?.id || '',
          customerName: row.customerName,
          productId: item?.id,
          productName: row.productName,
          hsn: hsn,
          quantity: row.quantity,
          price: row.price,
          taxRate: row.taxRate,
          subtotal,
          tax,
          total,
          invoiceDate: row.invoiceDate || invoiceDate,
          invoiceNumber,
          status: errors.length === 0 ? 'valid' : 'error',
          errors,
        });
      }

      setParsedInvoices(processed);
      
      const validCount = processed.filter(p => p.status === 'valid').length;
      const errorCount = processed.filter(p => p.status === 'error').length;

      toast({ 
        title: "File Processed", 
        description: `${rows.length} invoice${rows.length === 1 ? '' : 's'} processed. ${validCount} valid, ${errorCount} with errors.` 
      });
    } catch (error: any) {
      console.error("Error processing file:", error);
      toast({ 
        variant: "destructive", 
        title: "Processing Error", 
        description: error.message || "Could not process the file. Please check the format and try again." 
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      const fileInput = document.getElementById('bulk-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  const handleCreateInvoices = async () => {
    if (!accountingContext) return;
    const { addJournalVoucher } = accountingContext;

    const validInvoices = parsedInvoices.filter(p => p.status === 'valid');
    
    if (validInvoices.length === 0) {
      toast({ variant: "destructive", title: "No Valid Invoices", description: "Please fix errors before creating invoices." });
      return;
    }

    setIsCreating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const invoice of validInvoices) {
      try {
        const customer = customers.find((c: any) => c.id === invoice.customerId);
        if (!customer) {
          errorCount++;
          continue;
        }

        const invoiceId = `INV-${invoice.invoiceNumber}`;
        const customerAccountCode = customer.accountCode || customer.id;
        
        // Use account code 4010 for Sales Revenue (GSTR-1 requirement)
        const journalLines = [
          { account: customerAccountCode, debit: invoice.total.toFixed(2), credit: '0' },
          { account: '4010', debit: '0', credit: invoice.subtotal.toFixed(2) }, // Sales Revenue
          { account: '2110', debit: '0', credit: invoice.tax.toFixed(2) } // GST Payable
        ];

        const narration = `Sale of ${invoice.productName} (Qty: ${invoice.quantity}) to ${invoice.customerName}`;

        const newInvoice: any = {
          id: invoiceId,
          date: invoice.invoiceDate,
          narration,
          lines: journalLines,
          amount: invoice.total,
          customerId: invoice.customerId,
        };

        await addJournalVoucher(newInvoice);
        successCount++;
      } catch (error: any) {
        console.error(`Error creating invoice ${invoice.invoiceNumber}:`, error);
        errorCount++;
      }
    }

    setIsCreating(false);

    if (successCount > 0) {
      toast({ 
        title: "Invoices Created!", 
        description: `Successfully created ${successCount} invoice${successCount === 1 ? '' : 's'}.${errorCount > 0 ? ` ${errorCount} failed.` : ''} All invoices will appear in GSTR-1 and GSTR-3B.` 
      });
      
      // Clear parsed invoices
      setParsedInvoices([]);
      
      // Optionally redirect to invoices page
      setTimeout(() => {
        router.push("/billing/invoices");
      }, 2000);
    } else {
      toast({ 
        variant: "destructive", 
        title: "Creation Failed", 
        description: `Could not create invoices. ${errorCount} error${errorCount === 1 ? '' : 's'} occurred.` 
      });
    }
  };

  const validCount = parsedInvoices.filter(p => p.status === 'valid').length;
  const errorCount = parsedInvoices.filter(p => p.status === 'error').length;
  const totalAmount = parsedInvoices.filter(p => p.status === 'valid').reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Link href="/billing/invoices" passHref>
        <Button variant="outline" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <FileSpreadsheet className="text-primary" />
          Bulk Invoice Generation
        </h1>
        <p className="text-muted-foreground">
          Upload a CSV or Excel file to generate multiple invoices at once. Perfect for bulk invoicing!
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Invoice Data</CardTitle>
          <CardDescription>
            Download the template, fill in your invoice data, and upload the file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Tax Rate (%)</Label>
              <Input
                type="number"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 18)}
                min="0"
                max="100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Starting Invoice Number</Label>
            <Input
              type="text"
              value={startingInvoiceNumber}
              onChange={(e) => setStartingInvoiceNumber(e.target.value)}
              placeholder="001"
            />
            <p className="text-xs text-muted-foreground">
              Invoice numbers will be generated sequentially from this number.
            </p>
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="bulk-upload">Upload CSV or Excel File</Label>
              <div className="flex gap-2">
                <Input
                  id="bulk-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="w-full max-w-xs"
                />
                {isProcessing && (
                  <Loader2 className="h-4 w-4 animate-spin self-center" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Supports CSV and Excel (XLSX, XLS) formats
              </p>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate} disabled={isProcessing}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {parsedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoice Preview</CardTitle>
                <CardDescription>
                  Review the invoices before creating. {validCount} valid, {errorCount} with errors.
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</p>
                </div>
                <Button
                  onClick={handleCreateInvoices}
                  disabled={isCreating || validCount === 0}
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Invoices...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create {validCount} Invoice{validCount === 1 ? '' : 's'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {errorCount > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Some invoices have errors</AlertTitle>
                <AlertDescription>
                  Please review the errors below. Only valid invoices will be created.
                </AlertDescription>
              </Alert>
            )}
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Tax Rate</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {invoice.status === 'valid' ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">INV-{invoice.invoiceNumber}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(invoice.invoiceDate), "dd MMM, yyyy")}</TableCell>
                      <TableCell className="text-xs">{invoice.customerName}</TableCell>
                      <TableCell className="text-xs">{invoice.productName}</TableCell>
                      <TableCell className="font-mono text-xs">{invoice.hsn || '-'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{invoice.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-xs">₹{invoice.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{invoice.taxRate}%</TableCell>
                      <TableCell className="text-right font-mono text-xs">₹{invoice.subtotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">₹{invoice.tax.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">₹{invoice.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {errorCount > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold">Errors:</p>
                {parsedInvoices
                  .filter(inv => inv.status === 'error')
                  .map((invoice) => (
                    <div key={invoice.id} className="text-sm text-destructive">
                      <strong>INV-{invoice.invoiceNumber}</strong>: {invoice.errors.join(', ')}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">CSV/Excel Format:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Customer Name:</strong> Must match an existing customer name exactly</li>
              <li><strong>Product Name:</strong> Must match an existing product/item name exactly</li>
              <li><strong>Quantity:</strong> Number of units (must be greater than 0)</li>
              <li><strong>Price:</strong> Unit price (must be greater than 0)</li>
              <li><strong>Tax Rate (%):</strong> Optional, defaults to the value specified above</li>
              <li><strong>Invoice Date:</strong> Optional, defaults to the date specified above</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Features:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Auto-generates sequential invoice numbers</li>
              <li>Auto-fetches HSN codes from products</li>
              <li>Auto-calculates subtotal, tax, and total amounts</li>
              <li>Creates invoices with GSTR-1 compliance (account code 4010)</li>
              <li>All invoices appear in GSTR-1 and GSTR-3B automatically</li>
              <li>Validates customer and product names before creation</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

