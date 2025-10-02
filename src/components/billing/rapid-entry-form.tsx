
"use client";

import Link from "next/link";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, Save, Sparkles } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";

export const rapidEntrySchema = z.object({
  partyId: z.string().min(1, "Party is required."),
  voucherNumber: z.string().min(1, "Voucher number is required."),
  voucherDate: z.string().min(1, "Date is required."),
  itemId: z.string().min(1, "An item selection is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
});

export type RapidEntryFormValues = z.infer<typeof rapidEntrySchema>;

type RapidEntryFormProps = {
  form: UseFormReturn<RapidEntryFormValues>;
  handleSave: (values: RapidEntryFormValues, closeOnSave: boolean) => Promise<void>;
  entryType: 'invoice' | 'purchase';
  partyList: { id: string; name: string; }[];
  partyLoading: boolean;
  itemList: { id: string; name: string; sellingPrice?: number; purchasePrice?: number; }[];
  itemLoading: boolean;
};

export function RapidEntryForm({
  form,
  handleSave,
  entryType,
  partyList,
  partyLoading,
  itemList,
  itemLoading,
}: RapidEntryFormProps) {

  const watchedAmount = Number(form.watch("amount")) || 0;
  const taxAmount = watchedAmount * 0.18; // Assuming 18% GST
  const totalAmount = watchedAmount + taxAmount;

  const onSaveAndNew = form.handleSubmit(values => handleSave(values, false));
  const onSaveAndClose = form.handleSubmit(values => handleSave(values, true));
  
  const handleItemChange = (itemId: string) => {
      const selectedItem: any = itemList.find((i:any) => i.id === itemId);
      if (selectedItem) {
          form.setValue('itemId', itemId);
          const price = entryType === 'invoice' ? selectedItem.sellingPrice : selectedItem.purchasePrice;
          form.setValue('amount', price || 0, { shouldValidate: true });
      }
  }

  const title = entryType === 'invoice' ? 'Rapid Invoice Entry' : 'Rapid Purchase Entry';
  const partyLabel = entryType === 'invoice' ? 'Customer' : 'Vendor';
  const voucherLabel = entryType === 'invoice' ? 'Invoice Number' : 'Bill Number';
  const backLink = entryType === 'invoice' ? '/billing/invoices' : '/purchases';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href={backLink} passHref>
        <Button variant="outline" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="text-primary"/> {title}
        </h1>
        <p className="text-muted-foreground">Quickly create multiple entries without leaving the page.</p>
      </div>
      <Form {...form}>
        <form>
            <Card>
                <CardHeader>
                    <CardTitle>New {entryType === 'invoice' ? 'Invoice' : 'Purchase'}</CardTitle>
                    <CardDescription>
                        Fill details and click "Save &amp; New" to quickly add another.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="partyId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{partyLabel}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder={partyLoading ? "Loading..." : `Select ${partyLabel}`} /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {partyList.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="voucherNumber" render={({ field }) => (
                            <FormItem><FormLabel>{voucherLabel}</FormLabel><FormControl><Input placeholder="001" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="voucherDate" render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <Separator/>
                    <div className="grid md:grid-cols-2 gap-4">
                       <FormField control={form.control} name="itemId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Product / Service</FormLabel>
                                <Select onValueChange={handleItemChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder={itemLoading ? "Loading..." : "Select an item"} /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {itemList.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Taxable Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                     <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-2 border-t pt-4 mt-4">
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxable Amount</span><span>₹{watchedAmount.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">IGST @ 18%</span><span>₹{taxAmount.toFixed(2)}</span></div>
                            <Separator/>
                            <div className="flex justify-between font-bold text-md"><span>Total Amount</span><span>₹{totalAmount.toFixed(2)}</span></div>
                        </div>
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
  )
}
