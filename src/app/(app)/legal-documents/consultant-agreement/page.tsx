
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
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel, FormDescription } from "@/components/ui/form";
import {
  ArrowLeft,
  ArrowRight,
  FileDown,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useReactToPrint } from "react-to-print";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ShareButtons } from "@/components/documents/share-buttons";


const formSchema = z.object({
  clientName: z.string().min(3, "Client/Company name is required."),
  clientAddress: z.string().min(10, "Client's address is required."),
  
  consultantName: z.string().min(3, "Consultant/Freelancer name is required."),
  consultantAddress: z.string().min(10, "Consultant's address is required."),

  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  
  servicesDescription: z.string().min(10, "A description of services is required."),
  
  paymentAmount: z.coerce.number().positive("Payment must be a positive number."),
  paymentTerms: z.string().min(3, "Payment terms are required (e.g., Net 30, upon completion)."),
  
  term: z.string().default("This Agreement will begin on the effective date and will remain in full force and effect until the completion of the Services, unless terminated earlier as provided in this Agreement."),
  confidentiality: z.string().default("The Consultant shall maintain the confidentiality of all of the Client's proprietary and confidential information and shall not disclose it to any third party without the Client's prior written consent."),
  ipOwnership: z.string().default("Any intellectual property created by the Consultant in the performance of the Services will be the sole and exclusive property of the Client."),
  
  jurisdictionCity: z.string().min(2, "Jurisdiction city is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function ConsultantAgreementPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      clientAddress: "",
      consultantName: "",
      consultantAddress: "",
      agreementDate: "",
      servicesDescription: "",
      paymentAmount: 50000,
      paymentTerms: "Net 30 days after invoice",
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
        fieldsToValidate = ["clientName", "clientAddress", "consultantName", "consultantAddress", "agreementDate"];
        break;
      case 2:
        fieldsToValidate = ["servicesDescription", "paymentAmount", "paymentTerms"];
        break;
      case 3:
         fieldsToValidate = ["term", "confidentiality", "ipOwnership", "jurisdictionCity"];
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
  
  const numberToWords = (num: number): string => {
    const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
    const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
    if (!num) return 'Zero';
    if ((num.toString()).length > 9) return 'overflow';
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader><CardTitle>Step 1: Parties & Date</CardTitle><CardDescription>Enter details about the Client and the Consultant.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Client Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="clientName" render={({ field }) => ( <FormItem><FormLabel>Client / Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="clientAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Consultant / Freelancer Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="consultantName" render={({ field }) => ( <FormItem><FormLabel>Name (Individual or Company)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="consultantAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
            <CardHeader><CardTitle>Step 2: Services & Payment</CardTitle><CardDescription>Define the scope of work and the payment terms.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="servicesDescription" render={({ field }) => ( <FormItem><FormLabel>Description of Services</FormLabel><FormControl><Textarea className="min-h-24" placeholder="e.g., Development of a marketing website, providing financial consulting..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="paymentAmount" render={({ field }) => ( <FormItem><FormLabel>Total Payment / Fee (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="paymentTerms" render={({ field }) => ( <FormItem><FormLabel>Payment Terms</FormLabel><FormControl><Input placeholder="e.g., Net 30, 50% upfront" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
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
                <FormField control={form.control} name="ipOwnership" render={({ field }) => ( <FormItem><FormLabel>Intellectual Property Ownership</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Consultant / Freelancer Agreement.</CardDescription></CardHeader>
                <CardContent>
                  <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <h2 className="text-center font-bold">CONSULTANT / FREELANCER AGREEMENT</h2>
                    
                    <p>This Agreement is made as of <strong>{agreementDate}</strong>,</p>
                    
                    <p className="font-bold">BY AND BETWEEN:</p>
                    <p><strong>{formData.clientName}</strong>, having its principal place of business at {formData.clientAddress} (the "Client"),</p>
                    
                    <p className="font-bold">AND</p>
                    <p><strong>{formData.consultantName}</strong>, having its principal place of business at {formData.consultantAddress} (the "Consultant").</p>

                    <h4 className="font-bold mt-4">1. Services</h4>
                    <p>The Consultant agrees to perform the following services for the Client: {formData.servicesDescription}</p>

                    <h4 className="font-bold mt-4">2. Compensation</h4>
                    <p>In consideration for the Services, the Client will pay the Consultant a fee of ₹{formData.paymentAmount.toLocaleString('en-IN')}. Payment shall be made according to the following terms: {formData.paymentTerms}.</p>
                    
                    <h4 className="font-bold mt-4">3. Term and Termination</h4>
                    <p>{formData.term}</p>

                    <h4 className="font-bold mt-4">4. Independent Contractor Status</h4>
                    <p>The Consultant is an independent contractor, and nothing in this Agreement shall be construed to create a partnership, joint venture, or employer-employee relationship.</p>

                    <h4 className="font-bold mt-4">5. Confidentiality</h4>
                    <p>{formData.confidentiality}</p>

                    <h4 className="font-bold mt-4">6. Intellectual Property</h4>
                    <p>{formData.ipOwnership}</p>

                    <h4 className="font-bold mt-4">7. Governing Law and Jurisdiction</h4>
                    <p>This Agreement shall be governed by the laws of India. Any disputes arising from this Agreement will be subject to the exclusive jurisdiction of the courts in {formData.jurisdictionCity}, India.</p>
                    
                    <p className="mt-8">IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first above written.</p>
                    
                    <div className="grid grid-cols-2 gap-16 mt-16">
                        <div className="text-left">
                            <p className="font-bold">CLIENT:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.clientName}</p>
                        </div>
                        <div className="text-left">
                            <p className="font-bold">CONSULTANT:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.consultantName}</p>
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                   <ShareButtons
                    contentRef={printRef}
                    fileName={`Consultant_Agreement_${formData.consultantName}`}
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
        <h1 className="text-3xl font-bold">Consultant / Freelancer Agreement</h1>
        <p className="text-muted-foreground">Follow the steps to create a professional agreement for engaging independent contractors.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
