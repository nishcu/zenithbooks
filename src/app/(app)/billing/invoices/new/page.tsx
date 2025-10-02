
"use client";

import { useState, useContext, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  PlusCircle,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AccountingContext } from "@/context/accounting-context";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";
import { PartyDialog, ItemDialog } from "@/components/billing/add-new-dialogs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemTable, type LineItem, type Item } from "@/components/billing/item-table";

const createNewLineItem = (): LineItem => ({
  id: `${Date.now()}-${Math.random()}`,
  itemId: "", description: "", hsn: "", qty: 1, rate: 0, taxRate: 18, amount: 0,
});

export default function NewInvoicePage() {
  const accountingContext = useContext(AccountingContext);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth);
  
  const { journalVouchers } = useContext(AccountingContext)!;

  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
  const [customer, setCustomer] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [taxType, setTaxType] = useState<'none' | 'tds' | 'tcs'>('none');
  
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [useShippingAddress, setUseShippingAddress] = useState(false);
  
  const [lineItems, setLineItems] = useState<LineItem[]>([createNewLineItem()]);
  
  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);
  const items: Item[] = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)) || [], [itemsSnapshot]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    const duplicateId = searchParams.get('duplicate');
    const voucherIdToLoad = editId || duplicateId;

    if (voucherIdToLoad && journalVouchers.length > 0 && items.length > 0) {
      const voucherToLoad = journalVouchers.find(v => v.id === voucherIdToLoad);
      if (voucherToLoad) {
        setInvoiceDate(new Date(voucherToLoad.date));
        setCustomer(voucherToLoad.customerId || "");
        
        if (editId) {
            setInvoiceNumber(voucherToLoad.id.replace('INV-', ''));
        } else {
            setInvoiceNumber(""); // Clear number for duplication
        }

        const salesLine = voucherToLoad.lines.find(l => l.account === '4010');
        const taxLine = voucherToLoad.lines.find(l => l.account === '2110');
        const tdsLine = voucherToLoad.lines.find(l => l.account === '1460');
        const tcsLine = voucherToLoad.lines.find(l => l.account === '2423');

        const subtotal = parseFloat(salesLine?.credit || '0');
        const taxAmount = parseFloat(taxLine?.credit || '0');

        if (tdsLine) setTaxType('tds');
        if (tcsLine) setTaxType('tcs');

        if (subtotal > 0) {
            const taxRate = (taxAmount / subtotal) * 100;
            const itemFromNarration = voucherToLoad.narration.split(" of ")[1]?.split(" to ")[0];

            let matchedItem = items.find(i => itemFromNarration?.toLowerCase().includes(i.name.toLowerCase()));

            setLineItems([{
                 id: `${Date.now()}-${Math.random()}`,
                 itemId: matchedItem?.id || "",
                 description: matchedItem?.name || voucherToLoad.narration,
                 hsn: matchedItem?.hsn || "",
                 qty: 1, 
                 rate: subtotal,
                 taxRate: isNaN(taxRate) ? 18 : taxRate,
                 amount: subtotal,
            }]);
        } else {
             setLineItems([createNewLineItem()]);
        }
      }
    }
  }, [searchParams, journalVouchers, items]);
  
  const handleCustomerChange = useCallback((value: string) => {
    if (value === 'add-new') {
      setIsCustomerDialogOpen(true);
    } else {
      setCustomer(value);
    }
  }, []);

  const subtotal = lineItems.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  const totalIgst = lineItems.reduce((acc, item) => acc + (item.qty * item.rate * item.taxRate / 100), 0);
  const totalCgst = 0; // Assuming IGST for simplicity
  const totalSgst = 0;
  const totalTax = totalIgst + totalCgst + totalSgst;
  const grandTotal = subtotal + totalTax;

  const taxOnSourceAmount = (subtotal * 0.1) / 100;
  let totalAmount = grandTotal;
  if (taxType === 'tds') {
    totalAmount -= taxOnSourceAmount;
  } else if (taxType === 'tcs') {
    totalAmount += taxOnSourceAmount;
  }


  const handleSaveInvoice = async () => {
    if (!accountingContext) return;
    const { addJournalVoucher, journalVouchers } = accountingContext;

    const selectedCustomer = customers.find(c => c.id === customer);
    if (!selectedCustomer || !invoiceNumber) {
        toast({ variant: "destructive", title: "Missing Details", description: "Please select a customer and enter an invoice number."});
        return;
    }
    
    const invoiceId = `INV-${invoiceNumber}`;
    const isDuplicate = journalVouchers.some(voucher => voucher.id === invoiceId);

    if (isDuplicate) {
        toast({ variant: "destructive", title: "Duplicate Invoice", description: `An invoice with the number ${invoiceId} already exists.` });
        return;
    }

    const narration = `Sale of ${lineItems.map(li => li.description).join(', ')} to ${selectedCustomer.name}`;

    const journalLines = [
        { account: selectedCustomer.id, debit: totalAmount.toFixed(2), credit: '0' },
        { account: '4010', debit: '0', credit: subtotal.toFixed(2) },
        { account: '2110', debit: '0', credit: totalTax.toFixed(2) }
    ];

    if (taxOnSourceAmount > 0) {
      if (taxType === 'tds') {
        journalLines.push({ account: '1460', debit: taxOnSourceAmount.toFixed(2), credit: '0'}); // TDS Receivable
      } else if (taxType === 'tcs') {
        journalLines.push({ account: '2423', debit: '0', credit: taxOnSourceAmount.toFixed(2)}); // TCS Payable
      }
    }

    try {
        await addJournalVoucher({
            id: invoiceId,
            date: invoiceDate ? format(invoiceDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
            narration,
            lines: journalLines,
            amount: grandTotal, // Store the gross amount in the journal
            customerId: customer,
        });

        toast({ title: "Invoice Saved", description: `Journal entry for invoice #${invoiceId} has been automatically created.` });
        router.push("/billing/invoices");
    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to save journal entry", description: e.message });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/billing/invoices" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Create New Invoice</h1>
      </div>

      <PartyDialog type="Customer" open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} />
      <ItemDialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen} item={null} />

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>
            Fill out the details for your new invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
             <div className="space-y-2 md:col-span-2">
              <Label>Customer</Label>
               <Select onValueChange={handleCustomerChange} value={customer} disabled={customersLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={customersLoading ? "Loading..." : "Select a customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <Separator />
                  <SelectItem value="add-new" className="text-primary focus:text-primary">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" /> Add New Customer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-no">Invoice Number</Label>
              <Input id="invoice-no" placeholder="e.g., 001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !invoiceDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {invoiceDate ? format(invoiceDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Checkbox id="shipping-address" checked={useShippingAddress} onCheckedChange={(checked) => setUseShippingAddress(checked as boolean)} />
                    <label htmlFor="shipping-address" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Ship to a different address
                    </label>
                </div>
                {useShippingAddress && (
                    <div className="p-4 border rounded-md space-y-4 animate-in fade-in-50">
                        <Label>Shipping Address</Label>
                        <Textarea placeholder="Enter the full shipping address" />
                    </div>
                )}
            </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Items</h3>
            <ItemTable 
              lineItems={lineItems}
              setLineItems={setLineItems}
              items={items}
              itemsLoading={itemsLoading}
              isPurchase={false}
              openItemDialog={() => setIsItemDialogOpen(true)}
            />
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span>₹{totalIgst.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>₹{totalCgst.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>₹{totalSgst.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold"><span className="text-muted-foreground">Gross Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
              <Separator />
               <div className="space-y-2">
                <Label>Tax at Source</Label>
                <RadioGroup value={taxType} onValueChange={(value) => setTaxType(value as any)} className="grid grid-cols-3 gap-4">
                    <div><RadioGroupItem value="none" id="tax-none"/><Label htmlFor="tax-none" className="ml-2">None</Label></div>
                    <div><RadioGroupItem value="tds" id="tax-tds"/><Label htmlFor="tax-tds" className="ml-2">TDS</Label></div>
                    <div><RadioGroupItem value="tcs" id="tax-tcs"/><Label htmlFor="tax-tcs" className="ml-2">TCS</Label></div>
                </RadioGroup>
              </div>
              {taxType === 'tds' && <div className="flex justify-between"><span className="text-muted-foreground">TDS Amount (0.1%)</span><span className="text-red-500">- ₹{taxOnSourceAmount.toFixed(2)}</span></div>}
               {taxType === 'tcs' && <div className="flex justify-between"><span className="text-muted-foreground">TCS Amount (0.1%)</span><span className="text-green-600">+ ₹{taxOnSourceAmount.toFixed(2)}</span></div>}
              <Separator/>
              <div className="flex justify-between font-bold text-lg"><span>Net Receivable</span><span>₹{totalAmount.toFixed(2)}</span></div>
            </div>
          </div>
          <Separator />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveInvoice}>
            <Save className="mr-2" />
            Save Invoice
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
