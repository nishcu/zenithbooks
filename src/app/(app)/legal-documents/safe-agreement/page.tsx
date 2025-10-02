
"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, Printer, FileDown } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  investorName: z.string().min(3, "Investor name is required."),
  investmentAmount: z.coerce.number().positive("Investment amount must be positive."),
  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  valuationCap: z.coerce.number().positive("Valuation cap is required."),
  discountRate: z.coerce.number().min(0).max(100).default(20),
});

type FormData = z.infer<typeof formSchema>;

export default function SafeAgreement() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      investorName: "Angel Investor",
      investmentAmount: 5000000,
      agreementDate: new Date().toISOString().split("T")[0],
      valuationCap: 50000000,
      discountRate: 20,
    },
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const processStep = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setStep((prev) => prev + 1);
      toast({ title: "Details Saved", description: "Proceeding to the next step." });
    }
  };

  const handleBack = () => setStep((prev) => prev - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Parties & Investment</CardTitle>
              <CardDescription>Enter details about the company, investor, and the investment amount.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="investorName" render={({ field }) => ( <FormItem><FormLabel>Investor Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="investmentAmount" render={({ field }) => ( <FormItem><FormLabel>Investment Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="agreementDate" render={({ field }) => ( <FormItem><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button>
            </CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Conversion Terms</CardTitle>
              <CardDescription>Define the terms upon which the SAFE note will convert into equity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="valuationCap" render={({ field }) => ( <FormItem><FormLabel>Valuation Cap (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="discountRate" render={({ field }) => ( <FormItem><FormLabel>Discount Rate (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
              <Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button>
            </CardFooter>
          </Card>
        );
      case 3:
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Preview & Download</CardTitle>
              <CardDescription>Review the generated SAFE Agreement summary.</CardDescription>
            </CardHeader>
            <CardContent ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border p-6 rounded-md">
              <h4 className="font-bold text-center">SIMPLE AGREEMENT FOR FUTURE EQUITY (SAFE)</h4>
              <p><strong>This certifies that in exchange for the payment by {formData.investorName} (the “Investor”) of ₹{formData.investmentAmount.toLocaleString('en-IN')} (the “Purchase Amount”) on {new Date(formData.agreementDate).toLocaleDateString('en-GB', dateOptions)}, {formData.companyName} (the “Company”) issues to the Investor the right to certain shares of the Company’s stock, subject to the terms described below.</strong></p>
              
              <h5 className="font-bold mt-4">1. Events</h5>
              <p><strong>(a) Equity Financing.</strong> If there is an Equity Financing before the expiration or termination of this instrument, the Company will automatically issue to the Investor a number of shares of Safe Preferred Stock equal to the Purchase Amount divided by the Conversion Price.</p>
              <p><strong>(b) Liquidity Event.</strong> If there is a Liquidity Event before the expiration or termination of this instrument, the Investor will, at its option, either (i) receive a cash payment equal to the Purchase Amount or (ii) automatically receive from the Company a number of shares of Common Stock equal to the Purchase Amount divided by the Liquidity Price.</p>
              
              <h5 className="font-bold mt-4">2. Definitions</h5>
              <p><strong>Valuation Cap:</strong> ₹{formData.valuationCap.toLocaleString('en-IN')}</p>
              <p><strong>Discount Rate:</strong> {formData.discountRate}%</p>
              <p><strong>Conversion Price:</strong> The lower of: (i) the price per share of the Safe Preferred Stock sold in an Equity Financing or (ii) the price per share equal to the Valuation Cap divided by the Company Capitalization.</p>
              
              <p className="text-xs text-muted-foreground mt-8">Disclaimer: This is a simplified summary for illustrative purposes. A full SAFE agreement contains numerous other clauses and definitions.</p>
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
              <Button type="button" onClick={handlePrint}><Printer className="mr-2"/> Print/Save Summary</Button>
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
        <h1 className="text-3xl font-bold">SAFE Agreement Generator</h1>
        <p className="text-muted-foreground">Generate a Simple Agreement for Future Equity for early-stage fundraising.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
