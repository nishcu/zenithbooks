
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel, FormDescription } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, FileDown } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  poolSize: z.coerce.number().min(1).max(100, "Pool size must be between 1 and 100."),
  vestingPeriodYears: z.coerce.number().positive("Vesting period must be positive."),
  cliffPeriodMonths: z.coerce.number().min(0, "Cliff period cannot be negative."),
  exercisePrice: z.enum(["market_value", "face_value", "discounted"]),
});

type FormData = z.infer<typeof formSchema>;

export default function EsopPolicy() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      poolSize: 10,
      vestingPeriodYears: 4,
      cliffPeriodMonths: 12,
      exercisePrice: "face_value",
    },
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
              <CardTitle>Step 1: ESOP Pool & Vesting</CardTitle>
              <CardDescription>Define the core parameters of your Employee Stock Option Plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="poolSize" render={({ field }) => ( <FormItem><FormLabel>ESOP Pool Size (% of total equity)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="vestingPeriodYears" render={({ field }) => ( <FormItem><FormLabel>Vesting Period (Years)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="cliffPeriodMonths" render={({ field }) => ( <FormItem><FormLabel>Cliff Period (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>No vesting occurs before the cliff.</FormDescription><FormMessage /></FormItem> )}/>
              </div>
              <FormField control={form.control} name="exercisePrice" render={({ field }) => ( <FormItem><FormLabel>Exercise Price</FormLabel><FormControl>
                <select {...field} className="h-10 w-full rounded-md border border-input px-3">
                  <option value="market_value">Fair Market Value (FMV) on grant date</option>
                  <option value="face_value">Face Value of the Share</option>
                  <option value="discounted">Discounted Price</option>
                </select>
              </FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="button" onClick={processStep}>Preview Policy <ArrowRight className="ml-2"/></Button>
            </CardFooter>
          </Card>
        );
      case 2:
        const formData = form.getValues();
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Preview & Download</CardTitle>
              <CardDescription>Review the generated ESOP policy summary. A detailed legal document would be generated based on this.</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4 className="font-bold">DRAFT - EMPLOYEE STOCK OPTION PLAN (ESOP) POLICY</h4>
              <h5 className="font-bold">{formData.companyName}</h5>
              <p><strong>Total ESOP Pool:</strong> {formData.poolSize}% of the fully diluted share capital of the Company.</p>
              <p><strong>Vesting Schedule:</strong> Options will vest over a period of {formData.vestingPeriodYears} years.</p>
              <p><strong>Vesting Cliff:</strong> A {formData.cliffPeriodMonths}-month cliff will apply. No options will vest before the completion of this period from the grant date.</p>
              <p><strong>Vesting Frequency:</strong> After the cliff, options shall vest on a monthly or quarterly basis as specified in the grant letter.</p>
              <p><strong>Exercise Price:</strong> The price at which an employee can purchase the vested shares shall be the {formData.exercisePrice.replace('_', ' ')} of the shares on the date of grant.</p>
              <p><strong>Exercise Period:</strong> Vested options can be exercised by the employee within a specified period, typically starting after a certain event (like an IPO or acquisition) or after a fixed number of years.</p>
              <p className="text-xs text-muted-foreground mt-8">Note: This is a simplified summary. The full ESOP Policy document will contain detailed clauses on administration, termination, tax implications, and regulatory compliance.</p>
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
              <Button type="button" onClick={() => toast({ title: "Download Started (Simulated)"})}><FileDown className="mr-2"/> Download Full Policy</Button>
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
        <h1 className="text-3xl font-bold">ESOP Policy Generator</h1>
        <p className="text-muted-foreground">Define the key terms for your Employee Stock Option Plan.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => processStep())} className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
