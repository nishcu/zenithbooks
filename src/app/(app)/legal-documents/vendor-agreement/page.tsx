
"use client";

import { useState, useRef, useEffect } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, FileDown, Printer } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useReactToPrint } from "react-to-print";
import { cn } from "@/lib/utils";
import { ShareButtons } from "@/components/documents/share-buttons";

const formSchema = z.object({
  buyerName: z.string().min(3, "Buyer/Company name is required."),
  buyerAddress: z.string().min(10, "Buyer's address is required."),
  
  vendorName: z.string().min(3, "Vendor name is required."),
  vendorAddress: z.string().min(10, "Vendor's address is required."),

  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  
  goodsServicesDescription: z.string().min(10, "A description of goods/services is required."),
  
  paymentTerms: z.string().min(3, "Payment terms are required (e.g., Net 30)."),
  deliveryTerms: z.string().default("Delivery F.O.B. destination to the Buyer's address specified above."),
  
  term: z.string().default("This Agreement will commence on the effective date and continue for a period of one (1) year, unless terminated earlier."),
  confidentiality: z.string().default("Both parties agree to keep confidential all non-public information obtained from the other party."),
  
  jurisdictionCity: z.string().min(2, "Jurisdiction city is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function VendorAgreementPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      buyerName: "",
      buyerAddress: "",
      vendorName: "",
      vendorAddress: "",
      agreementDate: "",
      goodsServicesDescription: "",
      paymentTerms: "Net 30 days from receipt of a valid invoice.",
      jurisdictionCity: "Mumbai",
    },
  });

  useEffect(() => {
    form.reset({
      ...form.getValues(),
      agreementDate: new Date().toISOString().split("T")[0],
    });
  }, [form]);

  const processStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    switch (step) {
      case 1:
        fieldsToValidate = ["buyerName", "buyerAddress", "vendorName", "vendorAddress", "agreementDate"];
        break;
      case 2:
        fieldsToValidate = ["goodsServicesDescription", "paymentTerms", "deliveryTerms"];
        break;
      case 3:
         fieldsToValidate = ["term", "confidentiality", "jurisdictionCity"];
        break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
      if (step < 4) {
        toast({ title: `Step ${step} Saved`, description: `Proceeding to the next step.` });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please correct the errors before proceeding.",
      });
    }
  };

  const handleBack = () => setStep(prev => prev - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader><CardTitle>Step 1: Parties & Date</CardTitle><CardDescription>Enter details about the Buyer and the Vendor.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Buyer Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="buyerName" render={({ field }) => ( <FormItem><FormLabel>Buyer / Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="buyerAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Vendor Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="vendorName" render={({ field }) => ( <FormItem><FormLabel>Vendor Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="vendorAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                <Separator />
                <FormField control={form.control} name="agreementDate" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Effective Date of Agreement</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-end"><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Goods/Services & Terms</CardTitle><CardDescription>Define the scope of supply and payment/delivery terms.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="goodsServicesDescription" render={({ field }) => ( <FormItem><FormLabel>Description of Goods/Services</FormLabel><FormControl><Textarea className="min-h-24" placeholder="e.g., Supply of office stationery, provision of security services..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="paymentTerms" render={({ field }) => ( <FormItem><FormLabel>Payment Terms</FormLabel><FormControl><Input placeholder="e.g., Net 30 days" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="deliveryTerms" render={({ field }) => ( <FormItem><FormLabel>Delivery Terms</FormLabel><FormControl><Input placeholder="e.g., F.O.B. destination" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader><CardTitle>Step 3: Legal Clauses</CardTitle><CardDescription>Define key legal terms for the engagement.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="term" render={({ field }) => ( <FormItem><FormLabel>Term and Termination</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="confidentiality" render={({ field }) => ( <FormItem><FormLabel>Confidentiality</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="jurisdictionCity" render={({ field }) => ( <FormItem className="max-w-sm"><FormLabel>Jurisdiction City</FormLabel><FormControl><Input placeholder="e.g., Mumbai" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 4:
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const agreementDate = formData.agreementDate ? new Date(formData.agreementDate).toLocaleDateString('en-GB', dateOptions) : '[Date]';

        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Vendor Agreement.</CardDescription></CardHeader>
                <CardContent>
                  <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <h2 className="text-center font-bold">VENDOR AGREEMENT</h2>
                    
                    <p>This Vendor Agreement is made as of <strong>{agreementDate}</strong>,</p>
                    
                    <p className="font-bold">BY AND BETWEEN:</p>
                    <p><strong>{formData.buyerName}</strong>, with its principal office at {formData.buyerAddress} (the "Buyer"),</p>
                    
                    <p className="font-bold">AND</p>
                    <p><strong>{formData.vendorName}</strong>, with its principal office at {formData.vendorAddress} (the "Vendor").</p>

                    <h4 className="font-bold mt-4">1. Scope of Goods/Services</h4>
                    <p>The Vendor agrees to supply the following goods and/or services to the Buyer: {formData.goodsServicesDescription}</p>

                    <h4 className="font-bold mt-4">2. Payment Terms</h4>
                    <p>The Buyer agrees to pay the Vendor for the goods/services as per the invoices submitted by the Vendor. Payment terms shall be: {formData.paymentTerms}.</p>
                    
                    <h4 className="font-bold mt-4">3. Delivery</h4>
                    <p>{formData.deliveryTerms}</p>

                    <h4 className="font-bold mt-4">4. Term and Termination</h4>
                    <p>{formData.term}</p>

                    <h4 className="font-bold mt-4">5. Confidentiality</h4>
                    <p>{formData.confidentiality}</p>

                    <h4 className="font-bold mt-4">6. Governing Law and Jurisdiction</h4>
                    <p>This Agreement shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in {formData.jurisdictionCity}, India.</p>
                    
                    <p className="mt-8">IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first above written.</p>
                    
                    <div className="grid grid-cols-2 gap-16 mt-16">
                        <div className="text-left">
                            <p className="font-bold">BUYER:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.buyerName}</p>
                        </div>
                        <div className="text-left">
                            <p className="font-bold">VENDOR:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.vendorName}</p>
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  <ShareButtons
                    contentRef={printRef}
                    fileName={`Vendor_Agreement_${formData.vendorName}`}
                  />
                </CardFooter>
            </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Selection
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Vendor Agreement Generator</h1>
        <p className="text-muted-foreground">Follow the steps to create a formal agreement to set clear terms with your suppliers and vendors.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
