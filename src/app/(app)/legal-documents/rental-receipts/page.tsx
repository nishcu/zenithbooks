
"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ShareButtons } from "@/components/documents/share-buttons";

const formSchema = z.object({
  tenantName: z.string().min(3, "Tenant's name is required."),
  landlordName: z.string().min(3, "Landlord's name is required."),
  landlordPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format."),
  propertyAddress: z.string().min(10, "A full property address is required."),
  rentAmount: z.coerce.number().positive("Rent must be a positive number."),
  rentPeriod: z.string().min(1, "Month is required."),
  receiptDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
});

type FormData = z.infer<typeof formSchema>;

const numberToWords = (num: number): string => {
    const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
    const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (parseInt(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (parseInt(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (parseInt(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (parseInt(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (parseInt(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim().charAt(0).toUpperCase() + str.trim().slice(1) + " Only";
}

export default function RentalReceiptsPage() {
  const { toast } = useToast();
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenantName: "",
      landlordName: "",
      landlordPan: "",
      propertyAddress: "",
      rentAmount: 25000,
      rentPeriod: new Date().toISOString().substring(0, 7),
      receiptDate: new Date().toISOString().split("T")[0],
    },
  });

  const formData = form.watch();
  
  const formattedPeriod = formData.rentPeriod ? new Date(formData.rentPeriod + '-02').toLocaleString('default', { month: 'long', year: 'numeric' }) : '';
  const whatsappMessage = `Hi ${formData.landlordName}, here is the rent receipt for ${formattedPeriod} for your records. Thank you.`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Selection
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Rental Receipts for HRA</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Quickly generate and print monthly rent receipts for HRA exemption claims.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Enter Receipt Details</CardTitle>
            <CardDescription>Fill in the information to generate the receipt.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                 <FormField control={form.control} name="tenantName" render={({ field }) => (
                    <FormItem><FormLabel>Tenant's Name</FormLabel><FormControl><Input placeholder="e.g., Rohan Sharma" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="landlordName" render={({ field }) => (
                    <FormItem><FormLabel>Landlord's Name</FormLabel><FormControl><Input placeholder="e.g., Priya Verma" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="landlordPan" render={({ field }) => (
                    <FormItem><FormLabel>Landlord's PAN</FormLabel><FormControl><Input placeholder="ABCDE1234F" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="propertyAddress" render={({ field }) => (
                    <FormItem><FormLabel>Full Address of Rented Property</FormLabel><FormControl><Textarea placeholder="Enter the full property address" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <div className="grid sm:grid-cols-2 gap-4">
                     <FormField control={form.control} name="rentAmount" render={({ field }) => (
                        <FormItem><FormLabel>Rent Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                      <FormField control={form.control} name="rentPeriod" render={({ field }) => (
                        <FormItem><FormLabel>Rent For Month</FormLabel><FormControl><Input type="month" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                  </div>
                   <FormField control={form.control} name="receiptDate" render={({ field }) => (
                    <FormItem><FormLabel>Date of Receipt</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="sticky top-20">
            <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>The receipt will update as you type.</CardDescription>
            </CardHeader>
            <CardContent>
                <div ref={printRef} className="p-8 border-dashed border-2 rounded-lg bg-white text-black">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-center">RENT RECEIPT</h2>
                        <div className="flex justify-between">
                            <div>
                                <p className="font-bold">Receipt No:</p>
                                <p>{formData.rentPeriod ? formData.rentPeriod.replace('-', '') : 'N/A'}</p>
                            </div>
                            <div>
                                <p className="font-bold">Date:</p>
                                <p>{formData.receiptDate ? new Date(formData.receiptDate).toLocaleDateString('en-GB') : ''}</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-base leading-relaxed">
                            <p>Received with thanks from <strong>{formData.tenantName || '[Tenant Name]'}</strong>, a sum of <strong>₹{formData.rentAmount ? formData.rentAmount.toLocaleString('en-IN') : '0.00'}</strong>/-</p>
                            <p>(in words: <strong>{numberToWords(formData.rentAmount || 0)}</strong>) by cash/cheque towards the rent for the month of <strong>{formattedPeriod}</strong> for the property situated at:</p>
                            <p className="py-2 px-4 bg-slate-100 rounded"><em>{formData.propertyAddress || '[Property Address]'}</em></p>
                        </div>
                        
                        <div className="pt-16 grid grid-cols-2 gap-4 items-end">
                            <div>
                                <p className="font-bold text-lg">₹{formData.rentAmount ? formData.rentAmount.toLocaleString('en-IN') : '0.00'}/-</p>
                                <p className="text-xs text-slate-500 mt-2">Amount in Figures</p>
                            </div>
                            <div className="text-right">
                                <div className="border-t pt-2 mt-4 border-slate-400">
                                    <p className="font-semibold">{formData.landlordName || '[Landlord Name]'}</p>
                                    <p>(Landlord)</p>
                                    <p>PAN: {formData.landlordPan || '[Landlord PAN]'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <ShareButtons 
                    contentRef={printRef}
                    fileName={`Rent_Receipt_${formData.tenantName}_${formData.rentPeriod}`}
                    whatsappMessage={whatsappMessage}
                />
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
