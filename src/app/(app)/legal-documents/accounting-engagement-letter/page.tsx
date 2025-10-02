
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
import { Checkbox } from "@/components/ui/checkbox";
import { useReactToPrint } from "react-to-print";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


const services = [
    { id: "bookkeeping", label: "Bookkeeping and Maintenance of Accounts" },
    { id: "financials", label: "Preparation of Financial Statements (P&L, Balance Sheet)" },
    { id: "tds_filing", label: "TDS/TCS Return Filing" },
    { id: "payroll", label: "Payroll Processing" },
    { id: "audit_support", label: "Statutory Audit Support & Coordination" },
    { id: "mis", label: "MIS Reporting" },
    { id: "advisory", label: "General Accounting & Tax Advisory" },
] as const;

const formSchema = z.object({
  accountantName: z.string().min(3, "Accountant/Firm name is required."),
  accountantAddress: z.string().min(10, "Accountant's address is required."),

  clientName: z.string().min(3, "Client name is required."),
  clientAddress: z.string().min(10, "Client address is required."),
  
  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),

  services: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one service.",
  }),
  
  feeAmount: z.coerce.number().positive("Fee must be a positive number."),
  feeStructure: z.enum(["monthly_retainer", "quarterly_retainer", "annual_retainer"]),
  
  clientResponsibilities: z.string().optional(),
  accountantResponsibilities: z.string().optional(),
  termAndTermination: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function AccountingEngagementLetterPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountantName: "",
      accountantAddress: "",
      clientName: "",
      clientAddress: "",
      agreementDate: new Date().toISOString().split("T")[0],
      services: ["bookkeeping", "financials"],
      feeAmount: 15000,
      feeStructure: "monthly_retainer",
      clientResponsibilities: "To provide all bank statements, invoices, expense vouchers, and other relevant financial documents in a timely and organized manner. To ensure the accuracy and completeness of all data provided and to inform us of any significant financial transactions.",
      accountantResponsibilities: "To maintain the books of accounts based on the information provided. To prepare financial statements in accordance with applicable accounting standards. To highlight any material compliance issues noticed during the course of our work. To maintain confidentiality.",
      termAndTermination: "This engagement is for a period of one year, renewable upon mutual consent. Either party may terminate this agreement by providing a written notice of 30 days. All outstanding dues must be cleared at the time of termination.",
    },
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const processStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    switch (step) {
        case 1:
            fieldsToValidate = ["accountantName", "accountantAddress", "clientName", "clientAddress", "agreementDate"];
            break;
        case 2:
            fieldsToValidate = ["services", "feeAmount", "feeStructure"];
            break;
        case 3:
            fieldsToValidate = ["clientResponsibilities", "accountantResponsibilities", "termAndTermination"];
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
            <CardHeader><CardTitle>Step 1: Parties</CardTitle><CardDescription>Enter details about yourself (the accountant/firm) and your client.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Accountant / Firm Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="accountantName" render={({ field }) => ( <FormItem><FormLabel>Your Name / Firm Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="accountantAddress" render={({ field }) => ( <FormItem><FormLabel>Your Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Client Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="clientName" render={({ field }) => ( <FormItem><FormLabel>Client's Name / Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="clientAddress" render={({ field }) => ( <FormItem><FormLabel>Client's Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
                        <FormDescription>Select all accounting services that will be provided.</FormDescription>
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
                     <FormField control={form.control} name="feeStructure" render={({ field }) => ( 
                     <FormItem><FormLabel>Fee Structure</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="monthly_retainer">Monthly Retainer</SelectItem>
                                <SelectItem value="quarterly_retainer">Quarterly Retainer</SelectItem>
                                <SelectItem value="annual_retainer">Annual Retainer</SelectItem>
                            </SelectContent>
                        </Select>
                     <FormMessage /></FormItem> )}/>
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
                     <FormField control={form.control} name="accountantResponsibilities" render={({ field }) => ( <FormItem><FormLabel>Our Responsibilities</FormLabel><FormControl><Textarea className="min-h-32" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Accounting Engagement Letter.</CardDescription></CardHeader>
                <CardContent>
                  <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <p><strong>Date:</strong> {agreementDate}</p>
                    <p>To,</p>
                    <p><strong>The Management</strong></p>
                    <p><strong>{formData.clientName}</strong><br/>{formData.clientAddress.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</p>
                    
                    <h4 className="font-bold mt-4">Subject: Engagement Letter for Accounting & Bookkeeping Services</h4>

                    <p>Dear Sir/Madam,</p>
                    <p>We refer to our recent discussions regarding the provision of accounting and related services. We are pleased to set out the terms of our engagement and the nature and extent of the services we will provide.</p>
                    
                    <h4 className="font-bold mt-4">1. Scope of Services</h4>
                    <p>We will provide the following services based on the financial documents and information provided by you:</p>
                    <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                        {formData.services.map(s => {
                            const service = services.find(srv => srv.id === s);
                            return service ? <li key={s}>{service.label}</li> : null;
                        })}
                    </ul>
                     <p>Our services as detailed above do not include an audit or review of the financial statements, and as such, we will not express an opinion or any other form of assurance on them.</p>

                    <h4 className="font-bold mt-4">2. Professional Fees</h4>
                    <p>Our professional fee for the services will be <strong>₹{formData.feeAmount.toLocaleString('en-IN')}</strong> (Rupees {numberToWords(formData.feeAmount)} only) on a <strong>{feeStructureText}</strong> basis, plus applicable taxes. Invoices will be raised at the beginning of each period and are payable within 15 days.</p>

                    <h4 className="font-bold mt-4">3. Management's Responsibilities</h4>
                     <p>As the management of the company, you are responsible for:</p>
                    <p>{formData.clientResponsibilities}</p>

                     <h4 className="font-bold mt-4">4. Our Responsibilities</h4>
                     <p>Our responsibilities under this engagement are as follows:</p>
                    <p>{formData.accountantResponsibilities}</p>

                    <h4 className="font-bold mt-4">5. Term and Termination</h4>
                    <p>{formData.termAndTermination}</p>
                    
                    <p>We look forward to a long and mutually beneficial relationship. Kindly confirm your acceptance of these terms by signing and returning the duplicate copy of this letter.</p>

                    <p className="mt-8">Thanking you,</p>
                    <div className="mt-8">
                        <p>For <strong>{formData.accountantName}</strong></p>
                        <br/><br/><br/>
                        <p>(Proprietor / Partner)</p>
                    </div>

                    <div className="mt-16 pt-8 border-t border-dashed">
                        <h4 className="font-bold">Acknowledgement</h4>
                        <p>We hereby accept the terms and conditions as set out in this engagement letter.</p>
                        <p className="mt-4">For <strong>{formData.clientName}</strong></p>
                        <br/><br/><br/>
                        <p>(Director / Authorized Signatory)</p>
                        <p>Date: _______________</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                    <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                    <Button onClick={handlePrint}><Printer className="mr-2"/> Print / Save as PDF</Button>
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
        <h1 className="text-3xl font-bold">Accounting Engagement Letter Generator</h1>
        <p className="text-muted-foreground">Follow the steps to create a professional engagement letter for accounting services.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => processStep())} className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
