
"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  PlusCircle,
  Save,
  Trash2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { AccountingContext } from "@/context/accounting-context";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";

const items = [
  { id: "ITEM-001", name: "Standard Office Chair", price: 7500, hsn: "9401" },
  { id: "ITEM-002", name: "Accounting Services", price: 15000, hsn: "9982" },
  { id: "ITEM-003", name: "Wireless Mouse", price: 8999, hsn: "8471" },
];

export default function NewCreditNotePage() {
  const accountingContext = useContext(AccountingContext);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  
  const [creditNoteDate, setCreditNoteDate] = useState<Date | undefined>(new Date());
  const [customer, setCustomer] = useState("");
  const [originalInvoice, setOriginalInvoice] = useState("");
  
  const [lineItems, setLineItems] = useState([
    {
      description: "",
      qty: 1,
      rate: 0,
      amount: 0,
    },
  ]);
  
  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

  const journalVouchersQuery = user ? query(collection(db, 'journalVouchers'), where("userId", "==", user.uid)) : null;
  const [journalVouchersSnapshot] = useCollection(journalVouchersQuery);
  const invoices = journalVouchersSnapshot?.docs
    .filter(doc => doc.data()?.id?.startsWith('INV-'))
    .map(doc => ({ id: doc.data().id, customerId: doc.data().customerId })) || [];

  const filteredInvoices = invoices.filter(inv => inv.customerId === customer);

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: "",
        qty: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const list = [...lineItems];
    list.splice(index, 1);
    setLineItems(list);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const list = [...lineItems];
    const currentItem = list[index] as any;
    currentItem[field] = value;

    if (field === 'qty' || field === 'rate') {
      currentItem.amount = (currentItem.qty || 0) * (currentItem.rate || 0);
    }
    
    setLineItems(list);
  };

  const subtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);
  const totalTax = subtotal * 0.18; // Assuming a flat 18% tax for simplicity
  const totalAmount = subtotal + totalTax;

  const handleSaveCreditNote = async () => {
    if (!accountingContext) return;
    const { addJournalVoucher } = accountingContext;

    const selectedCustomer = customers.find(c => c.id === customer);
    if (!selectedCustomer || !originalInvoice) {
        toast({ variant: "destructive", title: "Missing Details", description: "Please select a customer and original invoice."});
        return;
    }
    
    const creditNoteId = `CN-${originalInvoice.substring(originalInvoice.lastIndexOf('-') + 1)}`;


    // Reverse of a sales entry
    const journalLines = [
        { account: '4010', debit: subtotal.toFixed(2), credit: '0' }, // Debit Sales Revenue
        { account: '2110', debit: totalTax.toFixed(2), credit: '0' }, // Debit GST Payable
        { account: customer, debit: '0', credit: totalAmount.toFixed(2) } // Credit Customer Account
    ];

    try {
        await addJournalVoucher({
            id: creditNoteId,
            date: creditNoteDate ? format(creditNoteDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
            narration: `Credit Note ${creditNoteId} issued to ${selectedCustomer.name} against Invoice #${originalInvoice}`,
            lines: journalLines,
            amount: totalAmount,
            customerId: customer,
        });
        toast({ title: "Credit Note Saved", description: `Journal entry for ${creditNoteId} has been created.` });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to save journal entry", description: e.message });
    }
  }


  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/billing/credit-notes" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Create New Credit Note</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credit Note Details</CardTitle>
          <CardDescription>
            Fill out the details for the new credit note.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Customer</Label>
               <Select onValueChange={setCustomer} disabled={customersLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={customersLoading ? "Loading..." : "Select a customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label>Original Invoice #</Label>
              <Select onValueChange={setOriginalInvoice} disabled={!customer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent>
                  {filteredInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Credit Note Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !creditNoteDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {creditNoteDate ? format(creditNoteDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={creditNoteDate}
                    onSelect={setCreditNoteDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Items to Credit</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                       <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="e.g., 'Returned faulty goods'"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, "qty", parseInt(e.target.value))}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, "rate", parseFloat(e.target.value))}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{item.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" onClick={handleAddItem}>
              <PlusCircle className="mr-2" />
              Add Item
            </Button>
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
                <span>Total Credit</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
           <div className="space-y-2">
              <Label>Reason for Credit Note</Label>
              <Textarea placeholder="e.g., Sales return, price correction, etc." className="min-h-[100px]" />
            </div>

        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveCreditNote}>
            <Save className="mr-2" />
            Save Credit Note
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
