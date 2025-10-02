
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
  disclosingPartyName: z.string().min(3, "Disclosing party name is required."),
  disclosingPartyAddress: z.string().min(10, "Address is required."),
  
  receivingPartyName: z.string().min(3, "Receiving party name is required."),
  receivingPartyAddress: z.string().min(10, "Address is required."),

  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  
  purpose: z.string().min(10, "A specific purpose is required."),
  
  termYears: z.coerce.number().positive("Term must be a positive number.").default(2),
  
  jurisdictionCity: z.string().min(2, "Jurisdiction city is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function NdaPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      disclosingPartyName: "",
      disclosingPartyAddress: "",
      receivingPartyName: "",
      receivingPartyAddress: "",
      agreementDate: "",
      purpose: "to evaluate a potential business relationship, including but not limited to, a possible joint venture, partnership, or other business collaboration between the parties.",
      termYears: 2,
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
        fieldsToValidate = ["disclosingPartyName", "disclosingPartyAddress", "receivingPartyName", "receivingPartyAddress", "agreementDate"];
        break;
      case 2:
        fieldsToValidate = ["purpose", "termYears", "jurisdictionCity"];
        break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
      if (step < 3) {
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
            <CardHeader><CardTitle>Step 1: Parties & Date</CardTitle><CardDescription>Enter details about who is disclosing and who is receiving information.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Disclosing Party</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="disclosingPartyName" render={({ field }) => ( <FormItem><FormLabel>Name (Individual or Company)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="disclosingPartyAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Receiving Party</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="receivingPartyName" render={({ field }) => ( <FormItem><FormLabel>Name (Individual or Company)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="receivingPartyAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
            <CardHeader><CardTitle>Step 2: Terms of Agreement</CardTitle><CardDescription>Define the purpose, duration, and legal terms.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="purpose" render={({ field }) => ( <FormItem><FormLabel>Purpose of Disclosure</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="termYears" render={({ field }) => ( <FormItem><FormLabel>Term of Agreement (Years)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="jurisdictionCity" render={({ field }) => ( <FormItem><FormLabel>Jurisdiction City</FormLabel><FormControl><Input placeholder="e.g., Mumbai" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const agreementDate = formData.agreementDate ? new Date(formData.agreementDate).toLocaleDateString('en-GB', dateOptions) : '[Date]';


        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Non-Disclosure Agreement.</CardDescription></CardHeader>
                <CardContent>
                  <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <h2 className="text-center font-bold">NON-DISCLOSURE AGREEMENT</h2>
                    
                    <p>This Non-Disclosure Agreement (the "Agreement") is entered into as of <strong>{agreementDate}</strong> (the "Effective Date"),</p>
                    
                    <p className="font-bold">BY AND BETWEEN:</p>
                    <p><strong>{formData.disclosingPartyName}</strong>, with its principal place of business at {formData.disclosingPartyAddress} (hereinafter referred to as the “Disclosing Party”),</p>
                    
                    <p className="font-bold">AND</p>
                    <p><strong>{formData.receivingPartyName}</strong>, with its principal place of business at {formData.receivingPartyAddress} (hereinafter referred to as the “Receiving Party”).</p>
                    
                    <p>(The Disclosing Party and the Receiving Party are hereinafter referred to individually as a “Party” and collectively as the “Parties”).</p>

                    <h4 className="font-bold mt-4">1. Purpose</h4>
                    <p>The Parties wish to engage in discussions for the purpose of {formData.purpose} (the "Purpose"). In connection with the Purpose, the Disclosing Party may disclose certain confidential information to the Receiving Party. This Agreement is intended to protect such information from unauthorized disclosure.</p>
                    
                    <h4 className="font-bold mt-4">2. Definition of Confidential Information</h4>
                    <p>"Confidential Information" shall mean any and all technical and non-technical information provided by the Disclosing Party to the Receiving Party, including but not limited to: (a) patent and patent applications, (b) trade secrets, and (c) proprietary information, including business plans, financial data, customer lists, marketing strategies, and research and development. Confidential Information may be disclosed in writing, orally, or by any other means.</p>

                    <h4 className="font-bold mt-4">3. Exclusions from Confidential Information</h4>
                    <p>Confidential Information does not include information which: (a) is or becomes publicly known and made generally available through no wrongful act of the Receiving Party; (b) is already in the possession of the Receiving Party at the time of disclosure by the Disclosing Party as shown by the Receiving Party's files and records; (c) is obtained by the Receiving Party from a third party without a breach of such third party's obligations of confidentiality; or (d) is independently developed by the Receiving Party without use of or reference to the Disclosing Party's Confidential Information.</p>
                    
                    <h4 className="font-bold mt-4">4. Obligations of Receiving Party</h4>
                    <p>The Receiving Party agrees: (a) to hold the Confidential Information in strict confidence and to take all reasonable precautions to protect such Confidential Information; (b) not to disclose any Confidential Information to any third party without the prior written consent of the Disclosing Party; (c) not to use any Confidential Information for any purpose except for the Purpose; and (d) not to copy or reverse engineer any Confidential Information.</p>

                    <h4 className="font-bold mt-4">5. Term</h4>
                    <p>The confidentiality obligations of the Receiving Party hereunder shall survive for a period of <strong>{formData.termYears} year(s)</strong> from the Effective Date of this Agreement.</p>

                    <h4 className="font-bold mt-4">6. Return of Information</h4>
                    <p>Upon the written request of the Disclosing Party, the Receiving Party shall promptly return all documents and other tangible materials representing the Confidential Information and all copies thereof or, at the Disclosing Party's option, certify in writing that all such materials have been destroyed.</p>

                    <h4 className="font-bold mt-4">7. No License</h4>
                    <p>Nothing in this Agreement is intended to grant any rights to the Receiving Party under any patent, copyright, or other intellectual property right of the Disclosing Party, nor shall this Agreement grant the Receiving Party any rights in or to the Confidential Information except as expressly set forth herein.</p>

                    <h4 className="font-bold mt-4">8. Governing Law and Jurisdiction</h4>
                    <p>This Agreement shall be governed by and construed in accordance with the laws of India. Any legal action or proceeding arising under this Agreement will be brought exclusively in the courts located in <strong>{formData.jurisdictionCity}</strong>, India, and the Parties hereby irrevocably consent to the personal jurisdiction and venue therein.</p>
                    
                    <h4 className="font-bold mt-4">9. Entire Agreement</h4>
                    <p>This Agreement contains the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior and contemporaneous agreements, understandings, negotiations, and discussions, whether oral or written, of the Parties.</p>

                    <p className="mt-8">IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.</p>
                    
                    <div className="grid grid-cols-2 gap-16 mt-16">
                        <div className="text-left">
                            <p className="font-bold">DISCLOSING PARTY:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.disclosingPartyName}</p>
                            <p>Title: Authorized Signatory</p>
                        </div>
                        <div className="text-left">
                            <p className="font-bold">RECEIVING PARTY:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.receivingPartyName}</p>
                            <p>Title: Authorized Signatory</p>
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                   <ShareButtons
                    contentRef={printRef}
                    fileName={`NDA_${formData.disclosingPartyName}_${formData.receivingPartyName}`}
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
        <h1 className="text-3xl font-bold">Non-Disclosure Agreement (NDA) Generator</h1>
        <p className="text-muted-foreground">Follow the steps to create a standard non-disclosure agreement.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
