
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

const formSchema = z.object({
  franchisorName: z.string().min(3, "Franchisor name is required."),
  franchisorAddress: z.string().min(10, "Franchisor's address is required."),
  
  franchiseeName: z.string().min(3, "Franchisee name is required."),
  franchiseeAddress: z.string().min(10, "Franchisee's address is required."),

  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  
  territory: z.string().min(3, "A description of the territory is required."),
  
  initialFee: z.coerce.number().positive("Initial fee must be a positive number."),
  royaltyFee: z.coerce.number().min(0, "Royalty fee cannot be negative."),
  
  termYears: z.coerce.number().positive("Term must be a positive number."),
  renewalTerms: z.string().default("The franchisee may have the option to renew the agreement for a further term, subject to the terms and conditions of the then-current franchise agreement."),
  
  franchisorObligations: z.string().default("The Franchisor shall provide initial training, operational support, and marketing guidelines."),
  franchiseeObligations: z.string().default("The Franchisee shall operate the business in accordance with the Franchisor's standards, use approved suppliers, and maintain the confidentiality of the franchise system."),
  
  jurisdictionCity: z.string().min(2, "Jurisdiction city is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function FranchiseAgreementPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      franchisorName: "",
      franchisorAddress: "",
      franchiseeName: "",
      franchiseeAddress: "",
      agreementDate: "",
      territory: "The city of Mumbai, Maharashtra",
      initialFee: 500000,
      royaltyFee: 5,
      termYears: 5,
      jurisdictionCity: "Mumbai",
    },
  });
  
  useEffect(() => {
    form.reset({
      ...form.getValues(),
      agreementDate: new Date().toISOString().split("T")[0],
    });
  }, [form]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const processStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    switch (step) {
      case 1:
        fieldsToValidate = ["franchisorName", "franchisorAddress", "franchiseeName", "franchiseeAddress", "agreementDate"];
        break;
      case 2:
        fieldsToValidate = ["territory", "initialFee", "royaltyFee", "termYears", "renewalTerms"];
        break;
      case 3:
         fieldsToValidate = ["franchisorObligations", "franchiseeObligations", "jurisdictionCity"];
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
            <CardHeader><CardTitle>Step 1: Parties & Date</CardTitle><CardDescription>Enter details about the Franchisor and the Franchisee.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Franchisor Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="franchisorName" render={({ field }) => ( <FormItem><FormLabel>Franchisor Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="franchisorAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Franchisee Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="franchiseeName" render={({ field }) => ( <FormItem><FormLabel>Franchisee Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="franchiseeAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
            <CardHeader><CardTitle>Step 2: Franchise Terms</CardTitle><CardDescription>Define the territory, fees, and term of the franchise.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="territory" render={({ field }) => ( <FormItem><FormLabel>Franchise Territory</FormLabel><FormControl><Textarea placeholder="e.g., The geographical area of South Delhi" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="initialFee" render={({ field }) => ( <FormItem><FormLabel>Initial Franchise Fee (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="royaltyFee" render={({ field }) => ( <FormItem><FormLabel>Royalty Fee (% of gross sales)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <FormField control={form.control} name="termYears" render={({ field }) => ( <FormItem className="max-w-sm"><FormLabel>Initial Term (Years)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="renewalTerms" render={({ field }) => ( <FormItem><FormLabel>Renewal Terms</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader><CardTitle>Step 3: Obligations & Legal Clauses</CardTitle><CardDescription>Define the duties of each party and legal terms.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="franchisorObligations" render={({ field }) => ( <FormItem><FormLabel>Franchisor's Obligations</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="franchiseeObligations" render={({ field }) => ( <FormItem><FormLabel>Franchisee's Obligations</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Franchise Agreement.</CardDescription></CardHeader>
                <CardContent>
                  <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <h2 className="text-center font-bold">FRANCHISE AGREEMENT</h2>
                    
                    <p>This Franchise Agreement is made as of <strong>{agreementDate}</strong>,</p>
                    
                    <p className="font-bold">BY AND BETWEEN:</p>
                    <p><strong>{formData.franchisorName}</strong>, with its principal office at {formData.franchisorAddress} (the "Franchisor"),</p>
                    
                    <p className="font-bold">AND</p>
                    <p><strong>{formData.franchiseeName}</strong>, with its principal office at {formData.franchiseeAddress} (the "Franchisee").</p>

                    <h4 className="font-bold mt-4">1. Grant of Franchise</h4>
                    <p>The Franchisor grants the Franchisee the right to operate a business under the Franchisor's proprietary system and trademarks within the following territory: {formData.territory}.</p>

                    <h4 className="font-bold mt-4">2. Fees</h4>
                    <p>The Franchisee shall pay the Franchisor an initial franchise fee of ₹{formData.initialFee.toLocaleString('en-IN')}. Additionally, the Franchisee shall pay a continuing royalty fee of {formData.royaltyFee}% of gross sales.</p>
                    
                    <h4 className="font-bold mt-4">3. Term and Renewal</h4>
                    <p>The initial term of this Agreement shall be {formData.termYears} years. {formData.renewalTerms}</p>

                    <h4 className="font-bold mt-4">4. Franchisor's Obligations</h4>
                    <p>{formData.franchisorObligations}</p>
                    
                    <h4 className="font-bold mt-4">5. Franchisee's Obligations</h4>
                    <p>{formData.franchiseeObligations}</p>

                    <h4 className="font-bold mt-4">6. Governing Law</h4>
                    <p>This Agreement shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in {formData.jurisdictionCity}, India.</p>
                    
                    <p className="mt-8">IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first above written.</p>
                    
                    <div className="grid grid-cols-2 gap-16 mt-16">
                        <div className="text-left">
                            <p className="font-bold">FRANCHISOR:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.franchisorName}</p>
                        </div>
                        <div className="text-left">
                            <p className="font-bold">FRANCHISEE:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.franchiseeName}</p>
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  <div onClick={handlePrint}>
                    <Button><Printer className="mr-2"/> Print / Save as PDF</Button>
                  </div>
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
        <h1 className="text-3xl font-bold">Franchise Agreement Generator</h1>
        <p className="text-muted-foreground">Establish the terms of a franchise relationship.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
