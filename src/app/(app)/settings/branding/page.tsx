

"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Save, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { generateTermsAction } from "./actions";
import { Separator } from "@/components/ui/separator";
import SignatureCanvas from 'react-signature-canvas';
import { states } from "@/lib/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  address1: z.string().min(5, "Address Line 1 is required."),
  address2: z.string().optional(),
  city: z.string().min(2, "City is required."),
  state: z.string().min(2, "State is required."),
  pincode: z.string().regex(/^\d{6}$/, "Invalid pincode."),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format.").optional().or(z.literal("")),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format.").optional().or(z.literal("")),
  logo: z.custom<File | null>(() => true).optional(),

  invoicePrefix: z.string().default('INV-'),
  invoiceNextNumber: z.coerce.number().int().min(1).default(1),
  
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  upiId: z.string().optional(),

  defaultPaymentTerms: z.string().default('net_30'),
  invoiceTerms: z.string().optional(),
});

export default function BrandingPage() {
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const { toast } = useToast();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const sigCanvasRef = useRef<SignatureCanvas | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingTerms, setIsGeneratingTerms] = useState(false);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            companyName: "ZenithBooks Inc.",
            address1: "123 Business Rd, Industrial Area",
            address2: "Suite 456, Near Landmark",
            city: "Commerce City",
            state: "Maharashtra",
            pincode: "400001",
            gstin: "27ABCDE1234F1Z5",
            pan: "ABCDE1234F",
            invoicePrefix: "INV-",
            invoiceNextNumber: 1,
            bankName: "HDFC Bank",
            bankAccount: "1234567890",
            bankIfsc: "HDFC0001234",
            upiId: "yourbusiness@okhdfcbank",
            defaultPaymentTerms: "net_30",
            invoiceTerms: "1. All payments to be made via cheque or NEFT. 2. Goods once sold will not be taken back. 3. Interest @18% p.a. will be charged on overdue bills.",
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setValue("logo", file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const clearSignature = () => sigCanvasRef.current?.clear();
    const saveSignature = () => {
        const dataUrl = sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png');
        console.log("Signature saved (simulated):", dataUrl);
        toast({title: "Signature Saved!"});
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true);
        console.log(values);
        setTimeout(() => {
            setIsSaving(false);
            toast({
                title: "Branding Settings Saved!",
                description: "Your company details have been updated.",
            });
        }, 1500);
    }
    
    const handleGenerateTerms = async () => {
        const companyName = form.getValues("companyName");
        if (!companyName) {
            form.setError("companyName", { type: "manual", message: "Company name is required to generate terms." });
            return;
        }
        setIsGeneratingTerms(true);
        try {
            const result = await generateTermsAction({ companyName });
            if (result?.terms) {
                form.setValue("invoiceTerms", result.terms);
                toast({ title: "Terms & Conditions Generated!" });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Failed to generate terms." });
        } finally {
            setIsGeneratingTerms(false);
        }
    };

    const nextInvoiceNumber = `${form.watch('invoicePrefix') || ''}${form.watch('invoiceNextNumber') || 1}`;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Company Branding</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                    Manage your company's branding assets and information. This will be used on invoices, reports, and other documents.
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Details</CardTitle>
                            <CardDescription>Update your company's core information.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="gstin" render={({ field }) => ( <FormItem><FormLabel>GSTIN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="pan" render={({ field }) => ( <FormItem><FormLabel>PAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <FormField control={form.control} name="address1" render={({ field }) => ( <FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="address2" render={({ field }) => ( <FormItem><FormLabel>Address Line 2 (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="grid md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="city" render={({ field }) => ( <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="state" render={({ field }) => (
                                     <FormItem><FormLabel>State</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                     <FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="pincode" render={({ field }) => ( <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Branding Assets</CardTitle>
                            <CardDescription>Upload your company logo and provide a signature for documents.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <FormLabel>Company Logo</FormLabel>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
                                        {logoPreview ? <Image src={logoPreview} alt="Logo Preview" width={96} height={96} className="object-contain" /> : <span className="text-xs text-muted-foreground">Logo Preview</span>}
                                    </div>
                                    <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}><Upload className="mr-2"/> Upload Logo</Button>
                                </div>
                                <Input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
                                <p className="text-xs text-muted-foreground">Recommended: .png with transparent background, 200x200px.</p>
                            </div>
                            <Separator/>
                            <div className="space-y-2">
                                <FormLabel>Digital Signature</FormLabel>
                                 <div className="w-full h-48 border rounded-md bg-white">
                                    <SignatureCanvas ref={sigCanvasRef} canvasProps={{ className: 'w-full h-full' }} />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={clearSignature}>Clear</Button>
                                    <Button type="button" onClick={saveSignature}>Save Signature</Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Draw your signature in the box above. It will be used on documents like invoices.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Invoice & Payment Settings</CardTitle><CardDescription>Set default numbering, bank details, payment terms, and conditions for your invoices.</CardDescription></CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-md font-semibold">Invoice Numbering</h3>
                                <div className="grid md:grid-cols-2 gap-4 mt-2">
                                    <FormField control={form.control} name="invoicePrefix" render={({ field }) => ( <FormItem><FormLabel>Invoice Prefix</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                                    <FormField control={form.control} name="invoiceNextNumber" render={({ field }) => ( <FormItem><FormLabel>Next Number</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )}/>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">The next invoice you create will be numbered: <strong>{nextInvoiceNumber}</strong></p>
                            </div>
                             <div>
                                <h3 className="text-md font-semibold">Bank Details</h3>
                                <div className="space-y-4 mt-2">
                                     <FormField control={form.control} name="bankName" render={({ field }) => ( <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                                     <div className="grid md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="bankAccount" render={({ field }) => ( <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                                        <FormField control={form.control} name="bankIfsc" render={({ field }) => ( <FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                                     </div>
                                      <FormField control={form.control} name="upiId" render={({ field }) => ( <FormItem><FormLabel>UPI ID</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                                </div>
                            </div>
                             <div>
                                <h3 className="text-md font-semibold">Default Payment Terms</h3>
                                <FormField control={form.control} name="defaultPaymentTerms" render={({ field }) => (
                                     <FormItem className="mt-2 max-w-xs"><Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                                            <SelectItem value="net_15">Net 15 (15 days)</SelectItem>
                                            <SelectItem value="net_30">Net 30 (30 days)</SelectItem>
                                            <SelectItem value="net_45">Net 45 (45 days)</SelectItem>
                                        </SelectContent>
                                     </Select><FormDescription>This will be the default due date for new invoices.</FormDescription></FormItem>
                                )}/>
                            </div>
                             <div>
                                <h3 className="text-md font-semibold">Default Terms & Conditions</h3>
                                <FormField control={form.control} name="invoiceTerms" render={({ field }) => (
                                <FormItem className="mt-2">
                                    <FormControl><Textarea className="min-h-24" placeholder="e.g., 'Payment is due within 30 days...'" {...field} /></FormControl>
                                </FormItem>
                                )}/>
                                <Button type="button" variant="secondary" onClick={handleGenerateTerms} disabled={isGeneratingTerms} className="mt-2">
                                    {isGeneratingTerms ? <Loader2 className="mr-2 animate-spin"/> : <Wand2 className="mr-2"/>}
                                    Generate T&C with AI
                                </Button>
                             </div>
                        </CardContent>
                    </Card>

                    <Card>
                         <CardFooter className="flex justify-end pt-6">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2"/>}
                                Save All Settings
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>
    );
}

    