
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, FileDown, PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const shareholderSchema = z.object({
  name: z.string().min(2, "Shareholder name is required."),
  shareCount: z.coerce.number().positive("Must be a positive number."),
  isFounder: z.boolean().default(false),
});

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  shareholders: z.array(shareholderSchema).min(2, "At least two shareholders are required."),
  quorumPercentage: z.coerce.number().min(1).max(100).default(51),
  dragAlongThreshold: z.coerce.number().min(51).max(100).default(75),
});

type FormData = z.infer<typeof formSchema>;

export default function ShareholdersAgreement() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      agreementDate: new Date().toISOString().split("T")[0],
      shareholders: [
        { name: "Founder A", shareCount: 6000, isFounder: true },
        { name: "Investor B", shareCount: 4000, isFounder: false },
      ],
      quorumPercentage: 51,
      dragAlongThreshold: 75,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "shareholders",
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
              <CardTitle>Step 1: Company & Shareholders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="agreementDate" render={({ field }) => ( <FormItem><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <div className="space-y-2">
                <Label>Shareholders</Label>
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                        <FormField control={form.control} name={`shareholders.${index}.name`} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`shareholders.${index}.shareCount`} render={({ field }) => ( <FormItem><FormLabel>No. of Shares</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`shareholders.${index}.isFounder`} render={({ field }) => ( <FormItem className="flex flex-row items-end space-x-2 space-y-0 pb-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Is a Founder?</FormLabel></FormItem> )}/>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="size-4 text-destructive"/></Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", shareCount: 0, isFounder: false })}><PlusCircle className="mr-2"/> Add Shareholder</Button>
              </div>
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
              <CardTitle>Step 2: Governance & Transfer Clauses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="quorumPercentage" render={({ field }) => ( <FormItem><FormLabel>Quorum for Board Meetings (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="dragAlongThreshold" render={({ field }) => ( <FormItem><FormLabel>Drag-Along Threshold (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
              <CardDescription>Review the generated Shareholders' Agreement summary.</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none border p-6 rounded-md">
              <h4 className="font-bold text-center">SHAREHOLDERS' AGREEMENT SUMMARY</h4>
              <p><strong>Company:</strong> {formData.companyName}</p>
              <p><strong>Effective Date:</strong> {new Date(formData.agreementDate).toLocaleDateString()}</p>
              
              <h5 className="font-bold mt-4">Parties:</h5>
              <ul>{formData.shareholders.map(s => <li key={s.name}>{s.name} ({s.shareCount.toLocaleString()} shares)</li>)}</ul>
              
              <h5 className="font-bold mt-4">Key Governance Terms:</h5>
              <ul>
                <li><strong>Quorum:</strong> A quorum for any board meeting shall require the presence of shareholders holding at least {formData.quorumPercentage}% of the shares.</li>
                <li><strong>Right of First Refusal (ROFR):</strong> If a shareholder wishes to sell their shares, they must first offer them to the other shareholders on the same terms.</li>
                <li><strong>Drag-Along Right:</strong> If shareholders holding at least {formData.dragAlongThreshold}% of the shares agree to sell their shares to a third party, they can force the remaining minority shareholders to sell their shares on the same terms.</li>
                <li><strong>Tag-Along Right:</strong> If a majority shareholder sells their shares, minority shareholders have the right to join the transaction and sell their shares on the same terms.</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-8">Note: This is a high-level summary. The full SHA would include detailed clauses on share transfer restrictions, board composition, reserved matters, anti-dilution, and more.</p>
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
              <Button type="button" onClick={() => toast({ title: "Download Started (Simulated)"})}><FileDown className="mr-2"/> Download Full Agreement</Button>
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
        <h1 className="text-3xl font-bold">Shareholders' Agreement (SHA) Generator</h1>
        <p className="text-muted-foreground">Define the rights, responsibilities, and protections for all shareholders.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
