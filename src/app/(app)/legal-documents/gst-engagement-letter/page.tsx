
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
import { Checkbox } from "@/components/ui/checkbox";
import { useReactToPrint } from "react-to-print";
import { cn } from "@/lib/utils";

const services = [
    { id: "registration", label: "GST Registration" },
    { id: "gstr1", label: "Monthly/Quarterly GSTR-1 Filing" },
    { id: "gstr3b", label: "Monthly GSTR-3B Filing" },
    { id: "cmp08", label: "Quarterly CMP-08 Filing (for Composition Scheme)" },
    { id: "gstr9", label: "Annual Return (GSTR-9)" },
    { id: "gstr9c", label: "Reconciliation Statement (GSTR-9C)" },
    { id: "advisory", label: "GST Advisory & Consultation" },
    { id: "audit_assistance", label: "Assistance in GST Audits & Assessments" },
] as const;

const formSchema = z.object({
  consultantName: z.string().min(3, "Consultant/Firm name is required."),
  consultantAddress: z.string().min(10, "Consultant address is required."),

  clientName: z.string().min(3, "Client name is required."),
  clientAddress: z.string().min(10, "Client address is required."),
  clientGstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format.").optional().or(z.literal("")),
  
  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),

  services: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one service.",
  }),
  
  feeAmount: z.coerce.number().positive("Fee must be a positive number."),
  feeStructure: z.enum(["monthly_retainer", "quarterly_retainer", "annual_retainer", "per_assignment"]),
  
  clientResponsibilities: z.string().optional(),
  consultantResponsibilities: z.string().optional(),
  termAndTermination: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function GstEngagementLetterPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      consultantName: "",
      consultantAddress: "",
      clientName: "",
      clientAddress: "",
      clientGstin: "",
      agreementDate: new Date().toISOString().split("T")[0],
      services: ["gstr1", "gstr3b"],
      feeAmount: 5000,
      feeStructure: "monthly_retainer",
      clientResponsibilities: "To provide all required documents, information, and explanations for the preparation of GST returns in a timely manner. To ensure the accuracy and completeness of all data provided. To make timely payment of GST liabilities.",
      consultantResponsibilities: "To prepare and file the GST returns based on the information provided by the client. To advise the client on matters related to GST compliance as covered under the scope of this engagement. To maintain confidentiality of all information provided.",
      termAndTermination: "This engagement will be effective from the date of signing and will continue until terminated by either party with a written notice of 30 days. All outstanding fees must be settled upon termination.",
    },
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const processStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    switch (step) {
        case 1:
            fieldsToValidate = ["consultantName", "consultantAddress", "clientName", "clientAddress", "clientGstin", "agreementDate"];
            break;
        case 2:
            fieldsToValidate = ["services", "feeAmount", "feeStructure"];
            break;
        case 3:
            fieldsToValidate = ["clientResponsibilities", "consultantResponsibilities", "termAndTermination"];
            break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
       if (step < 4) {
        toast({ title: `Step ${step} Saved`, description: `Proceeding to step ${step + 1}.` });
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
            <CardHeader><CardTitle>Step 1: Parties</CardTitle><CardDescription>Enter details about yourself (the consultant) and your client.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Consultant / Firm Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="consultantName" render={({ field }) => ( <FormItem><FormLabel>Your Name / Firm Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="consultantAddress" render={({ field }) => ( <FormItem><FormLabel>Your Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Client Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="clientName" render={({ field }) => ( <FormItem><FormLabel>Client's Name / Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="clientAddress" render={({ field }) => ( <FormItem><FormLabel>Client's Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="clientGstin" render={({ field }) => ( <FormItem><FormLabel>Client's GSTIN (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <FormField control={form.control} name="agreementDate" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-end"><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Scope & Fees</CardTitle><CardDescription>Define the services to be rendered and the fee structure.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="services"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Scope of Services</FormLabel>
                        <FormDescription>Select all GST-related services that will be provided.</FormDescription>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {services.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="services"
                            render={({ field }) => {
                              return (
                                <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        const newValues = field.value ? [...field.value] : [];
                                        if (checked) {
                                          newValues.push(item.id);
                                        } else {
                                          const index = newValues.indexOf(item.id);
                                          if (index > -1) {
                                            newValues.splice(index, 1);
                                          }
                                        }
                                        field.onChange(newValues);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{item.label}</FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator/>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="feeStructure" render={({ field }) => ( <FormItem><FormLabel>Fee Structure</FormLabel><FormControl>
                        <select {...field} className="h-10 w-full rounded-md border border-input px-3">
                            <option value="monthly_retainer">Monthly Retainer</option>
                            <option value="quarterly_retainer">Quarterly Retainer</option>
                            <option value="annual_retainer">Annual Retainer</option>
                            <option value="per_assignment">Per Assignment</option>
                        </select>
                     </FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="feeAmount" render={({ field }) => ( <FormItem><FormLabel>Professional Fee (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
          return (
            <Card>
                <CardHeader><CardTitle>Step 3: Responsibilities & Terms</CardTitle><CardDescription>Define the duties of each party and the terms of the engagement.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                     <FormField control={form.control} name="consultantResponsibilities" render={({ field }) => ( <FormItem><FormLabel>Our Responsibilities</FormLabel><FormControl><Textarea className="min-h-32" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="clientResponsibilities" render={({ field }) => ( <FormItem><FormLabel>Client's Responsibilities</FormLabel><FormControl><Textarea className="min-h-32" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="termAndTermination" render={({ field }) => ( <FormItem><FormLabel>Term & Termination</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </CardContent>
                <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button></CardFooter>
            </Card>
          );
      case 4:
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const agreementDate = new Date(formData.agreementDate).toLocaleDateString('en-GB', dateOptions);
        const feeStructureText = formData.feeStructure.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated GST Engagement Letter.</CardDescription></CardHeader>
                <CardContent>
                  <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <p><strong>Date:</strong> {agreementDate}</p>
                    <p>To,</p>
                    <p><strong>{formData.clientName}</strong><br/>{formData.clientAddress.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</p>
                    
                    <h4 className="font-bold mt-4">Subject: Engagement Letter for GST Compliance and Advisory Services</h4>

                    <p>Dear Sir/Madam,</p>
                    <p>Thank you for appointing us, <strong>{formData.consultantName}</strong>, to provide Goods and Services Tax (GST) related services for your organization. This letter confirms our understanding of the terms and objectives of our engagement and the nature and limitations of the services that we will provide.</p>
                    
                    <h4 className="font-bold mt-4">1. Scope of Services</h4>
                    <p>We will provide the following services in relation to your GST compliance:</p>
                    <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                        {formData.services.map(s => {
                            const service = services.find(srv => srv.id === s);
                            return service ? <li key={s}>{service.label}</li> : null;
                        })}
                    </ul>

                    <h4 className="font-bold mt-4">2. Professional Fees</h4>
                    <p>Our professional fee for the above services will be <strong>₹{formData.feeAmount.toLocaleString('en-IN')}</strong> (Rupees {numberToWords(formData.feeAmount)} only) on a <strong>{feeStructureText}</strong> basis, plus GST as applicable. Out-of-pocket expenses incurred in connection with this engagement will be billed separately.</p>

                    <h4 className="font-bold mt-4">3. Our Responsibilities</h4>
                    <p>{formData.consultantResponsibilities}</p>

                     <h4 className="font-bold mt-4">4. Your Responsibilities</h4>
                    <p>{formData.clientResponsibilities}</p>

                    <h4 className="font-bold mt-4">5. Term and Termination</h4>
                    <p>{formData.termAndTermination}</p>
                    
                    <p>We appreciate the opportunity to be of service to you. Please sign and return the duplicate copy of this letter to indicate that it is in accordance with your understanding of the arrangements. </p>

                    <p className="mt-8">Yours faithfully,</p>
                    <div className="mt-16">
                        <p>For <strong>{formData.consultantName}</strong></p>
                        <br/><br/><br/>
                        <p>(Authorized Signatory)</p>
                    </div>

                    <div className="mt-16 pt-8 border-t border-dashed">
                        <p><strong>Accepted and Agreed:</strong></p>
                        <p>For <strong>{formData.clientName}</strong></p>
                        <br/><br/><br/>
                        <p>(Authorized Signatory)</p>
                        <p>Date: _______________</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  <button onClick={handlePrint} className={cn(buttonVariants())}><Printer className="mr-2"/> Print / Save as PDF</button>
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
        <h1 className="text-3xl font-bold">GST Engagement Letter Generator</h1>
        <p className="text-muted-foreground">Follow the steps to create a professional engagement letter for GST services.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
