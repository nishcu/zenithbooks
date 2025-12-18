
"use client";

import { useState, useContext, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AccountingContext } from "@/context/accounting-context";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";

const rapidInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  invoiceDate: z.string().min(1, "Date is required."),
  itemId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  taxRate: z.coerce.number().min(0, "Tax rate cannot be negative."),
});

type RapidInvoiceForm = z.infer<typeof rapidInvoiceSchema>;

export default function RapidInvoiceEntryPage() {
  const accountingContext = useContext(AccountingContext);
  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth);
  
  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);
  const items = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [itemsSnapshot]);

  const form = useForm<RapidInvoiceForm>({
    resolver: zodResolver(rapidInvoiceSchema),
    defaultValues: {
      customerId: "",
      invoiceNumber: "",
      invoiceDate: format(new Date(), "yyyy-MM-dd"),
      itemId: undefined,
      amount: 0,
      taxRate: 18,
    },
  });

  const handleItemChange = useCallback((itemId?: string) => {
    if (!itemId) {
      form.setValue("itemId", undefined);
      return;
    }
    form.setValue("itemId", itemId);
    const selectedItem: any = items.find((i: any) => i.id === itemId);
    if (selectedItem && typeof selectedItem.gstRate === "number") {
      form.setValue("taxRate", selectedItem.gstRate, { shouldValidate: true });
    }
  }, [form, items]);

  const handleSave = useCallback(async (values: RapidInvoiceForm, closeOnSave: boolean) => {
    if (!accountingContext) return;
    const { addJournalVoucher } = accountingContext;

    const selectedCustomer = customers.find(c => c.id === values.customerId);

    if (!selectedCustomer) {
        toast({ variant: "destructive", title: "Invalid Selection", description: "Please ensure a customer is selected." });
        return;
    }
    
    const invoiceId = `INV-${values.invoiceNumber}`;
    const subtotal = values.amount / (1 + values.taxRate / 100);
    const totalTax = values.amount - subtotal;
    
    // Use accountCode if available, otherwise fall back to Firebase ID
    const customerAccountCode = selectedCustomer.accountCode || selectedCustomer.id;
    
    // Get selected item if provided
    const selectedItem = values.itemId ? items.find((i: any) => i.id === values.itemId) : null;
    const itemDescription = selectedItem ? selectedItem.name : "Goods/Services";
    
    // Use account code 4010 for Sales Revenue (GSTR-1 requirement)
    const journalLines = [
        { account: customerAccountCode, debit: values.amount.toFixed(2), credit: '0' },
        { account: '4010', debit: '0', credit: subtotal.toFixed(2) }, // Sales Revenue - must be 4010 for GSTR-1
        { account: '2110', debit: '0', credit: totalTax.toFixed(2) } // GST Payable
    ];
    const narration = `Sale of ${itemDescription} to ${selectedCustomer.name}`;


    try {
        const newInvoice: any = {
            id: invoiceId,
            date: values.invoiceDate,
            narration,
            lines: journalLines,
            amount: values.amount,
            customerId: values.customerId,
        };

        await addJournalVoucher(newInvoice);

        toast({ title: "Invoice Saved", description: `${invoiceId} has been created.` });

        if (closeOnSave) {
            router.push("/billing/invoices");
        } else {
            const currentInvoiceNumber = parseInt(values.invoiceNumber.replace(/[^0-9]/g, ''), 10);
            const nextInvoiceNumber = isNaN(currentInvoiceNumber) ? "" : String(currentInvoiceNumber + 1).padStart(3, '0');

            form.reset({
                ...values,
                invoiceNumber: nextInvoiceNumber,
                customerId: "",
                itemId: undefined,
                amount: 0,
            });
            form.setFocus("customerId");
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Failed to save invoice", description: e.message });
    }
  }, [accountingContext, customers, items, toast, router, form]);

  const onSaveAndNew = form.handleSubmit(values => handleSave(values, false));
  const onSaveAndClose = form.handleSubmit(values => handleSave(values, true));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/billing/invoices" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2"><Sparkles className="text-primary"/> Rapid Invoice Entry</h1>
        <p className="text-muted-foreground">Quickly record multiple invoices.</p>
      </div>
      <Form {...form}>
        <form>
            <Card>
                <CardHeader>
                <CardTitle>New Invoice</CardTitle>
                <CardDescription>
                    Fill details and click "Save &amp; New" to quickly add another.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="customerId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Customer</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger><SelectValue placeholder={customersLoading ? "Loading..." : "Select Customer"} /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                            <FormItem><FormLabel>Invoice Number</FormLabel><FormControl><Input placeholder="001" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="itemId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Product/Item (Optional)</FormLabel>
                                <Select 
                                    onValueChange={(value) => handleItemChange(value || undefined)} 
                                    value={field.value || undefined}
                                >
                                    <FormControl>
                                    <SelectTrigger><SelectValue placeholder={itemsLoading ? "Loading..." : "Select Product (Optional)"} /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Total Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5900" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="taxRate" render={({ field }) => (
                            <FormItem><FormLabel>Tax Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 18" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onSaveAndClose}>
                        Save & Close
                    </Button>
                    <Button type="button" onClick={onSaveAndNew}>
                        <Save className="mr-2"/>
                        Save & New
                    </Button>
                </CardFooter>
            </Card>
        </form>
      </Form>
    </div>
  );
}
