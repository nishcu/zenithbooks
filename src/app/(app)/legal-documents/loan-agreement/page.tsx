

"use client";

import { useState } from "react";
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
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel, FormDescription } from "@/components/ui/form";
import {
  ArrowLeft,
  ArrowRight,
  FileDown
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  borrowerName: z.string().min(3, "Company/LLP name is required."),
  borrowerAddress: z.string().min(10, "Registered office address is required."),
  
  lenderName: z.string().min(3, "Lender's name is required."),
  lenderParentage: z.string().min(3, "Parentage is required."),
  lenderAddress: z.string().min(10, "Lender's address is required."),

  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  agreementPlace: z.string().min(2, "Place of agreement is required."),
  
  loanAmount: z.coerce.number().positive("Loan amount must be positive."),
  
  isInterestFree: z.boolean().default(false),
  interestRate: z.coerce.number().min(0).optional(),
  interestFrequency: z.enum(["monthly", "quarterly", "annually"]).optional(),

  tenure: z.coerce.number().positive("Tenure must be a positive number."),
  tenureUnit: z.enum(["months", "years"]).default("months"),
  repaymentSchedule: z.enum(["lump-sum", "emi", "on-demand"]).default("lump-sum"),

  isSecured: z.boolean().default(false),
  securityDetails: z.string().optional(),

  jurisdictionCity: z.string().min(2, "Jurisdiction city is required."),
});

type FormData = z.infer<typeof formSchema>;

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

export default function LoanAgreementPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      borrowerName: "",
      borrowerAddress: "",
      lenderName: "",
      lenderParentage: "",
      lenderAddress: "",
      agreementDate: new Date().toISOString().split("T")[0],
      agreementPlace: "",
      loanAmount: 100000,
      isInterestFree: false,
      interestRate: 12,
      interestFrequency: "monthly",
      tenure: 12,
      tenureUnit: "months",
      repaymentSchedule: "lump-sum",
      isSecured: false,
      jurisdictionCity: "",
    },
  });

  const processStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    switch (step) {
        case 1:
            fieldsToValidate = ["borrowerName", "borrowerAddress", "lenderName", "lenderParentage", "lenderAddress", "agreementDate", "agreementPlace"];
            break;
        case 2:
            fieldsToValidate = ["loanAmount", "isInterestFree", "interestRate", "interestFrequency", "tenure", "tenureUnit", "repaymentSchedule"];
            break;
        case 3:
            fieldsToValidate = ["isSecured", "securityDetails", "jurisdictionCity"];
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader><CardTitle>Step 1: Parties & Agreement Details</CardTitle><CardDescription>Enter details about the borrower, lender, and the agreement date/place.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Borrower (Company / LLP)</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="borrowerName" render={({ field }) => ( <FormItem><FormLabel>Company/LLP Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="borrowerAddress" render={({ field }) => ( <FormItem><FormLabel>Registered Office Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Lender (Partner / Director)</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="lenderName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="lenderParentage" render={({ field }) => ( <FormItem><FormLabel>S/o, W/o, D/o</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="lenderAddress" render={({ field }) => ( <FormItem><FormLabel>Residential Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Agreement Details</h3>
                    <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="agreementDate" render={({ field }) => ( <FormItem><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="agreementPlace" render={({ field }) => ( <FormItem><FormLabel>Place of Agreement</FormLabel><FormControl><Input placeholder="e.g., Mumbai" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end"><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Loan & Repayment Terms</CardTitle><CardDescription>Define the financial terms of the loan.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="loanAmount" render={({ field }) => ( <FormItem><FormLabel>Loan Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator/>
                <FormField control={form.control} name="isInterestFree" render={({ field }) => (
                  <FormItem className="space-y-3"><FormLabel>Interest</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={(val) => field.onChange(val === 'true')} defaultValue={String(field.value)} className="flex flex-col space-y-1">
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="false" /></FormControl><FormLabel className="font-normal">Loan is interest-bearing</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="true" /></FormControl><FormLabel className="font-normal">Loan is interest-free</FormLabel></FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}/>
                {!form.watch("isInterestFree") && (
                    <div className="grid md:grid-cols-2 gap-4 pl-4">
                        <FormField control={form.control} name="interestRate" render={({ field }) => ( <FormItem><FormLabel>Interest Rate (% p.a.)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="interestFrequency" render={({ field }) => ( <FormItem><FormLabel>Interest Payable</FormLabel><FormControl><Input placeholder="e.g., Monthly" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                )}
                <Separator/>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="tenure" render={({ field }) => ( <FormItem><FormLabel>Repayment Tenure</FormLabel><div className="flex gap-2"><FormControl><Input type="number" {...field} /></FormControl><FormField control={form.control} name="tenureUnit" render={({ field }) => ( <select {...field} className="h-10 rounded-md border border-input px-3"><option value="months">Months</option><option value="years">Years</option></select> )}/></div><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="repaymentSchedule" render={({ field }) => ( <FormItem><FormLabel>Repayment Schedule</FormLabel><FormControl><Input placeholder="e.g., Lump sum, EMI" {...field} /></FormControl><FormDescription>Lump sum / EMI / On demand</FormDescription><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
          return (
            <Card>
                <CardHeader><CardTitle>Step 3: Security & Legal Clauses</CardTitle><CardDescription>Define security for the loan and legal jurisdiction.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                   <FormField control={form.control} name="isSecured" render={({ field }) => (
                     <FormItem className="space-y-3"><FormLabel>Security</FormLabel>
                       <FormControl>
                         <RadioGroup onValueChange={(val) => field.onChange(val === 'true')} defaultValue={String(field.value)} className="flex flex-col space-y-1">
                           <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="false" /></FormControl><FormLabel className="font-normal">This is an unsecured loan.</FormLabel></FormItem>
                           <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="true" /></FormControl><FormLabel className="font-normal">This is a secured loan.</FormLabel></FormItem>
                         </RadioGroup>
                       </FormControl>
                     </FormItem>
                   )}/>
                    {form.watch("isSecured") && (
                        <FormField control={form.control} name="securityDetails" render={({ field }) => ( <FormItem><FormLabel>Details of Security / Charge</FormLabel><FormControl><Textarea placeholder="e.g., Hypothecation of company assets, personal guarantee of directors..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    )}
                    <Separator/>
                     <FormField control={form.control} name="jurisdictionCity" render={({ field }) => ( <FormItem><FormLabel>Jurisdiction City</FormLabel><FormControl><Input placeholder="e.g., Mumbai" {...field} /></FormControl><FormDescription>Courts in this city will have exclusive jurisdiction.</FormDescription><FormMessage /></FormItem> )}/>
                </CardContent>
                <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Draft <ArrowRight className="ml-2"/></Button></CardFooter>
            </Card>
          );
      case 4:
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const agreementDate = new Date(formData.agreementDate).toLocaleDateString('en-GB', dateOptions);

        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Loan Agreement.</CardDescription></CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <h2 className="text-center font-bold">LOAN AGREEMENT</h2>
                    <p>(Between Company and its Partner/Director)</p>

                    <p>This Loan Agreement (“Agreement”) is made on this <strong>{agreementDate}</strong>, at <strong>{formData.agreementPlace || "[Place]"}</strong>.</p>
                    
                    <p className="font-bold">BY AND BETWEEN</p>
                    <p><strong>{formData.borrowerName || "[Company/LLP Name]"}</strong>, a company incorporated under the Companies Act, 2013 / LLP Act, 2008 having its registered office at {formData.borrowerAddress || "[Address]"} (hereinafter referred to as the “Borrower”),</p>

                    <p className="font-bold">AND</p>
                    <p><strong>{formData.lenderName || "[Lender Name]"}</strong>, {formData.lenderParentage || "[Parentage]"}, residing at {formData.lenderAddress || "[Address]"}, being a Partner/Director of the Borrower (hereinafter referred to as the “Lender”).</p>

                    <h4 className="font-bold mt-4">1. Purpose of Loan</h4>
                    <p>The Lender has agreed to grant a loan to the Borrower for business purposes, working capital, or other lawful objectives of the Company.</p>

                    <h4 className="font-bold mt-4">2. Loan Amount</h4>
                    <p>The Lender agrees to advance a sum of <strong>₹{formData.loanAmount.toLocaleString('en-IN')}</strong> (Rupees {numberToWords(formData.loanAmount)} only) to the Borrower.</p>

                    <h4 className="font-bold mt-4">3. Interest</h4>
                    <p>{formData.isInterestFree ? "The loan shall be interest-free." : `The loan shall carry interest at the rate of ${formData.interestRate}% per annum, payable on a ${formData.interestFrequency} basis. TDS shall be deducted as per the Income Tax Act, 1961.`}</p>

                    <h4 className="font-bold mt-4">4. Tenure & Repayment</h4>
                    <p>The loan shall be repayable within <strong>{formData.tenure} {formData.tenureUnit}</strong> from the date of disbursement. The repayment shall be made as follows: <strong>{formData.repaymentSchedule}</strong>. The Borrower may prepay the loan without penalty, subject to mutual consent.</p>

                    <h4 className="font-bold mt-4">5. Security</h4>
                    <p>{formData.isSecured ? `This loan is secured by: ${formData.securityDetails}` : "This loan is unsecured, being advanced by the Partner/Director to the company."}</p>
                    
                    <h4 className="font-bold mt-4">6. Rights & Obligations of the Lender</h4>
                    <ul className="list-disc list-inside">
                        <li>The Lender shall not interfere in the day-to-day management of the Borrower.</li>
                        <li>The Lender has the right to inspect the books of accounts relating to the loan upon reasonable notice.</li>
                        <li>The Lender acknowledges that this loan does not constitute a “deposit” under the Companies (Acceptance of Deposits) Rules, 2014, being exempt as a loan from a Director/Partner.</li>
                    </ul>

                    <h4 className="font-bold mt-4">7. Borrower’s Covenants</h4>
                    <p>The Borrower agrees to use the loan strictly for business purposes, maintain proper accounts, and repay the loan as per this Agreement.</p>

                    <h4 className="font-bold mt-4">8. Events of Default</h4>
                    <p>Failure to pay principal/interest on the due date, insolvency of the Borrower, or any misrepresentation shall constitute a default. Upon default, the Lender may demand immediate repayment of the entire outstanding amount.</p>

                    <h4 className="font-bold mt-4">9. Governing Law & Jurisdiction</h4>
                    <p>This Agreement shall be governed by the laws of India. Courts at <strong>{formData.jurisdictionCity || "[City]"}</strong> shall have exclusive jurisdiction.</p>

                    <h4 className="font-bold mt-4">10. Dispute Resolution</h4>
                    <p>Any dispute shall be resolved first through mutual discussion, failing which, it shall be referred to arbitration under the Arbitration and Conciliation Act, 1996.</p>

                    <p className="mt-8">IN WITNESS WHEREOF, the Parties have executed this Loan Agreement on the date first written above.</p>
                    
                    <div className="grid grid-cols-2 gap-16 mt-16">
                        <div className="text-left">
                            <p className="font-bold">For: {formData.borrowerName || "[Borrower Name]"}</p>
                            <p className="mt-16">_________________________</p>
                            <p>(Authorised Signatory)</p>
                        </div>
                        <div className="text-left">
                             <p className="font-bold">LENDER</p>
                            <p className="mt-16">_________________________</p>
                            <p>({formData.lenderName || "[Lender Name]"})</p>
                        </div>
                    </div>

                    <div className="mt-16">
                        <p className="font-bold">WITNESSES:</p>
                        <ol className="list-decimal list-inside mt-8 space-y-8">
                            <li>Name & Signature: _________________________</li>
                            <li>Name & Signature: _________________________</li>
                        </ol>
                    </div>

                </CardContent>
                <CardFooter className="justify-between mt-6"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={() => toast({title: "Download Started"})}><FileDown className="mr-2"/> Download Agreement</Button></CardFooter>
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
        <h1 className="text-3xl font-bold">Loan Agreement Generator</h1>
        <p className="text-muted-foreground">Create a loan agreement between a company and its partner/director.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => processStep())} className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
