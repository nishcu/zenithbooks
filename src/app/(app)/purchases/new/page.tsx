
"use client";

import { useState, useContext, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  PlusCircle,
  Save,
  Upload,
  Loader2,
  Wand2,
} from "lucide-react";
import { format, parse } from "date-fns";

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
import { ItemTable, type LineItem, type Item } from "@/components/billing/item-table";
import { extractInvoiceData } from "@/ai/flows/extract-invoice-data-flow";


const createNewLineItem = (): LineItem => ({
  id: `${Date.now()}-${Math.random()}`,
  itemId: "",
  description: "",
  hsn: "",
  qty: 1,
  rate: 0,
  taxRate: 18,
  amount: 0,
});


export default function NewPurchasePage() {
  const accountingContext = useContext(AccountingContext);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  
  const { journalVouchers } = useContext(AccountingContext)!;

  const [billDate, setBillDate] = useState<Date | undefined>(new Date());
  const [vendor, setVendor] = useState("");
  const [billNumber, setBillNumber] = useState("");
  
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

  const [lineItems, setLineItems] = useState<LineItem[]>([createNewLineItem()]);
  
  const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
  const [vendorsSnapshot, vendorsLoading] = useCollection(vendorsQuery);
  const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [vendorsSnapshot]);

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
            setBillDate(new Date(voucherToLoad.date));
            setVendor(voucherToLoad.vendorId || "");
            
            if (editId) {
                setBillNumber(voucherToLoad.id.replace('BILL-', ''));
            } else {
                setBillNumber(""); // Clear number for duplication
            }

            const purchaseLine = voucherToLoad.lines.find(l => l.account === '5050');
            const taxLine = voucherToLoad.lines.find(l => l.account === '2110');

            const subtotal = parseFloat(purchaseLine?.debit || '0');
            const taxAmount = parseFloat(taxLine?.debit || '0');

            if (subtotal > 0) {
                const taxRate = (taxAmount / subtotal) * 100;
                const itemFromNarration = voucherToLoad.narration.split(" of ")[1]?.split(" from ")[0];

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
            }
        }
        }
  }, [searchParams, journalVouchers, items]);

  const handleVendorChange = useCallback((value: string) => {
    if (value === 'add-new') {
        setIsVendorDialogOpen(true);
    } else {
        setVendor(value);
    }
  }, []);

  const subtotal = lineItems.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  const totalTax = lineItems.reduce((acc, item) => acc + (item.qty * item.rate * item.taxRate / 100), 0);
  const totalBillAmount = subtotal + totalTax;
  
   const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    toast({ title: "Reading Document...", description: "AI is extracting data from the uploaded bill." });

    // This is a placeholder for the user's actual GSTIN from their profile
    const userGstin = "27ABCDE1234F1Z5";

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const result = await extractInvoiceData({ invoiceDataUri: base64data });

        if (result) {
            // Validate the buyer's GSTIN
            if (result.buyerGstin && result.buyerGstin.toUpperCase() !== userGstin.toUpperCase()) {
                 toast({ 
                    variant: "destructive", 
                    title: "Validation Failed", 
                    description: `This invoice appears to be for a different GSTIN (${result.buyerGstin}). Please upload a bill for your company.` 
                });
                setIsOcrLoading(false);
                if(fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

          if (result.invoiceNumber) setBillNumber(result.invoiceNumber);
          if (result.invoiceDate) {
              const parsedDate = parse(result.invoiceDate, 'yyyy-MM-dd', new Date());
              if (!isNaN(parsedDate.getTime())) {
                setBillDate(parsedDate);
              }
          }
          if (result.totalAmount) {
              const taxRate = 0.18; // Assume 18%
              const taxableAmount = result.totalAmount / (1 + taxRate);
               setLineItems([{
                    id: `${Date.now()}-${Math.random()}`,
                    itemId: "",
                    description: "Scanned Item",
                    hsn: "",
                    qty: 1,
                    rate: taxableAmount,
                    taxRate: taxRate * 100,
                    amount: taxableAmount,
                }]);
          }
           if (result.vendorName) {
                const vendorNameLower = result.vendorName.toLowerCase();
                const matchedVendor = vendors.find(v => (v.name as string).toLowerCase().includes(vendorNameLower));
                if (matchedVendor) {
                    setVendor(matchedVendor.id);
                } else {
                    toast({ title: "New Vendor Detected", description: `Consider adding "${result.vendorName}" to your vendor list.` });
                }
            }
          toast({ title: "Data Extracted!", description: "Form has been pre-filled with AI." });
        } else {
            toast({ variant: "destructive", title: "Extraction Failed", description: "Could not extract data from the document." });
        }
      };
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred during OCR." });
    } finally {
      setIsOcrLoading(false);
      // Reset file input to allow re-uploading the same file
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  const handleSaveBill = async () => {
    if (!accountingContext) return;
    const { addJournalVoucher, journalVouchers } = accountingContext;

    const selectedVendor = vendors.find(v => v.id === vendor);
    if (!selectedVendor || !billNumber) {
        toast({ variant: "destructive", title: "Missing Details", description: "Please select a vendor and enter a bill number."});
        return;
    }
    
    const billId = `BILL-${billNumber}`;
    const isDuplicate = journalVouchers.some(voucher => voucher.id === billId);

    if (isDuplicate) {
        toast({ variant: "destructive", title: "Duplicate Bill Number", description: `A bill with the number ${billId} already exists.` });
        return;
    }
    
    const narration = `Purchase of ${lineItems.map(li => li.description).join(', ')} from ${selectedVendor.name}`;

    const journalLines = [
        { account: '5050', debit: subtotal.toFixed(2), credit: '0' },
        { account: '2110', debit: totalTax.toFixed(2), credit: '0' }, // ITC Receivable
        { account: vendor, debit: '0', credit: totalBillAmount.toFixed(2) } 
    ];

    try {
        await addJournalVoucher({
            id: billId,
            date: billDate ? format(billDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
            narration,
            lines: journalLines,
            amount: totalBillAmount,
            vendorId: vendor,
        });
        toast({ title: "Purchase Bill Saved", description: `Journal entry for bill #${billId} has been automatically created.` });
        router.push("/purchases");
    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to save journal entry", description: e.message });
    }
  }


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/purchases" passHref>
            <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            </Link>
            <h1 className="text-2xl font-bold">Add New Purchase Bill</h1>
        </div>
        <div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isOcrLoading}>
                {isOcrLoading ? <Loader2 className="mr-2 animate-spin"/> : <Wand2 className="mr-2"/>}
                Read from Bill (AI-OCR)
            </Button>
            <Input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
        </div>
      </div>

      <PartyDialog type="Vendor" open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen} />
      <ItemDialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen} item={null} />

      <Card>
        <CardHeader>
          <CardTitle>Purchase Bill Details</CardTitle>
          <CardDescription>
            Fill out the details for your new purchase bill.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select onValueChange={handleVendorChange} value={vendor} disabled={vendorsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={vendorsLoading ? "Loading..." : "Select a vendor"} />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                  <Separator />
                  <SelectItem value="add-new" className="text-primary focus:text-primary">
                    <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" /> Add New Vendor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="bill-no">Bill Number</Label>
              <Input id="bill-no" placeholder="Enter vendor invoice number" value={billNumber} onChange={e => setBillNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bill Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !billDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={billDate}
                    onSelect={setBillDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Items</h3>
            <ItemTable
                lineItems={lineItems}
                setLineItems={setLineItems}
                items={items}
                itemsLoading={itemsLoading}
                isPurchase={true}
                openItemDialog={() => setIsItemDialogOpen(true)}
            />
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tax (e.g. IGST @18%)</span>
                <span>₹{totalTax.toFixed(2)}</span>
              </div>
              <Separator/>
              <div className="flex justify-between font-bold text-lg">
                <span>Total Amount Payable</span>
                <span>₹{totalBillAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <Separator />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Add any notes for this purchase bill..." className="min-h-[120px]" />
            </div>
          </div>

        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveBill}>
            <Save className="mr-2" />
            Save Bill
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
