
"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, FileDown, PlusCircle, Trash2, Printer } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";

const trusteeSchema = z.object({
  name: z.string().min(2, "Trustee name is required."),
  address: z.string().min(10, "Address is required."),
  designation: z.string().min(2, "Designation is required (e.g., Managing Trustee, Member)."),
});

const formSchema = z.object({
  trustName: z.string().min(3, "Trust name is required."),
  trustAddress: z.string().min(10, "Trust address is required."),
  deedDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  settlorName: z.string().min(3, "Settlor name is required."),
  settlorAddress: z.string().min(10, "Settlor address is required."),
  initialCorpus: z.coerce.number().positive("Corpus must be a positive number."),
  trustAims: z.string().min(20, "Aims and objectives are required."),
  trustees: z.array(trusteeSchema).min(2, "A minimum of 2 trustees are required."),
});

type FormData = z.infer<typeof formSchema>;

export default function TrustDeedPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trustName: "Progressive Educational Trust",
      trustAddress: "123 Knowledge Park, Wisdom City, New Delhi - 110001",
      deedDate: new Date().toISOString().split("T")[0],
      settlorName: "Mr. Visionary",
      settlorAddress: "456 Founder's Lane, New Delhi",
      initialCorpus: 11000,
      trustAims: "To establish and run educational institutions.\nTo provide scholarships to meritorious students.\nTo promote scientific research and development.",
      trustees: [
        { name: "Trustee One", address: "Address One", designation: "Managing Trustee"},
        { name: "Trustee Two", address: "Address Two", designation: "Trustee"},
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "trustees",
  });

  const handlePrint = useReactToPrint({ content: () => printRef.current });

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
              <CardTitle>Step 1: Trust & Settlor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="trustName" render={({ field }) => ( <FormItem><FormLabel>Trust Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="trustAddress" render={({ field }) => ( <FormItem><FormLabel>Trust Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="deedDate" render={({ field }) => ( <FormItem><FormLabel>Date of Deed</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="settlorName" render={({ field }) => ( <FormItem><FormLabel>Settlor/Founder Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="settlorAddress" render={({ field }) => ( <FormItem><FormLabel>Settlor's Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="initialCorpus" render={({ field }) => ( <FormItem><FormLabel>Initial Corpus/Settlement Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="trustAims" render={({ field }) => ( <FormItem><FormLabel>Aims and Objectives of the Trust</FormLabel><FormControl><Textarea className="min-h-32" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
              <CardTitle>Step 2: Trustees</CardTitle>
              <CardDescription>Enter the details of the initial board of trustees (minimum 2).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                  <h3 className="font-medium">Trustee {index + 1}</h3>
                   <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)} disabled={fields.length <= 2}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                   <FormField control={form.control} name={`trustees.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   <FormField control={form.control} name={`trustees.${index}.address`} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   <FormField control={form.control} name={`trustees.${index}.designation`} render={({ field }) => ( <FormItem><FormLabel>Designation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => append({ name: "", address: "", designation: "Trustee" })}><PlusCircle className="mr-2"/> Add Trustee</Button>
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
              <Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button>
            </CardFooter>
          </Card>
        );
      case 3:
        const formData = form.getValues();
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Preview & Download</CardTitle>
            </CardHeader>
            <CardContent ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border p-6 rounded-md">
              <h4 className="font-bold text-center">DEED OF TRUST</h4>
              <p>This Deed of Trust is executed on this {new Date(formData.deedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} by <strong>{formData.settlorName}</strong>, residing at {formData.settlorAddress}, hereinafter referred to as the SETTLOR.</p>
              <p>The Settlor is desirous of establishing a Trust for public charitable purposes and has settled a sum of <strong>₹{formData.initialCorpus.toLocaleString()}</strong> as the initial corpus of the Trust.</p>
              
              <h5 className="font-bold mt-4">1. Name of the Trust:</h5> <p>{formData.trustName}</p>
              <h5 className="font-bold mt-4">2. Registered Office:</h5> <p>{formData.trustAddress}</p>
              <h5 className="font-bold mt-4">3. Aims and Objectives:</h5> <pre className="whitespace-pre-wrap font-sans">{formData.trustAims}</pre>
              <h5 className="font-bold mt-4">4. Board of Trustees:</h5> <p>The initial Board of Trustees shall consist of the following persons:</p>
              <ol>{formData.trustees.map((t,i) => <li key={i}>{t.name}, {t.designation}</li>)}</ol>

              <div className="flex justify-between mt-16">
                <p><strong>SETTLOR</strong></p>
                <p><strong>WITNESSES</strong></p>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
              <Button type="button" onClick={handlePrint}><Printer className="mr-2"/> Print/Save as PDF</Button>
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
        <h1 className="text-3xl font-bold">Trust Deed Generator</h1>
        <p className="text-muted-foreground">Formally establish a trust with a legal deed.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
