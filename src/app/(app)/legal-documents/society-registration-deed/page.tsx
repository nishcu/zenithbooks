
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

const memberSchema = z.object({
  name: z.string().min(2, "Member name is required."),
  address: z.string().min(10, "Address is required."),
  occupation: z.string().min(2, "Occupation is required."),
  designation: z.string().min(2, "Designation is required (e.g., President, Member)."),
});

const formSchema = z.object({
  societyName: z.string().min(3, "Society name is required."),
  societyAddress: z.string().min(10, "Society address is required."),
  deedDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  societyAims: z.string().min(20, "Aims and objectives are required."),
  members: z.array(memberSchema).min(7, "A minimum of 7 members are required for registration."),
});

type FormData = z.infer<typeof formSchema>;

export default function SocietyRegistrationDeed() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      societyName: "Progressive Welfare Society",
      societyAddress: "123 Community Hall, Social Town, New Delhi - 110001",
      deedDate: new Date().toISOString().split("T")[0],
      societyAims: "To promote educational and cultural activities.\nTo work for the upliftment of the underprivileged.\nTo organize health and environmental awareness camps.",
      members: Array(7).fill({ name: "", address: "", occupation: "", designation: "Member" }),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
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
              <CardTitle>Step 1: Society Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="societyName" render={({ field }) => ( <FormItem><FormLabel>Society Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="societyAddress" render={({ field }) => ( <FormItem><FormLabel>Society Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="deedDate" render={({ field }) => ( <FormItem><FormLabel>Date of Deed</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="societyAims" render={({ field }) => ( <FormItem><FormLabel>Aims and Objectives</FormLabel><FormControl><Textarea className="min-h-32" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
              <CardTitle>Step 2: Founding Members</CardTitle>
              <CardDescription>Enter the details of at least 7 founding members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                  <h3 className="font-medium">Member {index + 1}</h3>
                   <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)} disabled={fields.length <= 7}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                   <FormField control={form.control} name={`members.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   <FormField control={form.control} name={`members.${index}.address`} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   <div className="grid md:grid-cols-2 gap-4">
                       <FormField control={form.control} name={`members.${index}.occupation`} render={({ field }) => ( <FormItem><FormLabel>Occupation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                       <FormField control={form.control} name={`members.${index}.designation`} render={({ field }) => ( <FormItem><FormLabel>Designation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => append({ name: "", address: "", occupation: "", designation: "Member" })}><PlusCircle className="mr-2"/> Add Member</Button>
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
            </CardHeader>
            <CardContent ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border p-6 rounded-md">
              <h4 className="font-bold text-center">MEMORANDUM OF ASSOCIATION OF {formData.societyName.toUpperCase()}</h4>
              <p><strong>1. Name of the Society:</strong> {formData.societyName}</p>
              <p><strong>2. Registered Office:</strong> {formData.societyAddress}</p>
              <p><strong>3. Aims and Objectives:</strong></p>
              <pre className="whitespace-pre-wrap font-sans">{formData.societyAims}</pre>
              <p><strong>4. Governing Body:</strong> The names, addresses, occupations and designations of the present members of the governing body to whom the management of the society is entrusted are as follows:</p>
              <table className="w-full">
                <thead><tr><th>S.No</th><th>Name</th><th>Address</th><th>Occupation</th><th>Designation</th></tr></thead>
                <tbody>{formData.members.map((m,i) => <tr key={i}><td>{i+1}</td><td>{m.name}</td><td>{m.address}</td><td>{m.occupation}</td><td>{m.designation}</td></tr>)}</tbody>
              </table>
              <p>We, the undersigned, are desirous of forming a society named "{formData.societyName}" under the Societies Registration Act, 1860, in pursuance of this Memorandum of Association.</p>
              <div className="flex justify-between mt-16">
                <div><p>Place: </p><p>Date: {new Date(formData.deedDate).toLocaleDateString('en-GB', dateOptions)}</p></div>
                <div className="text-right"><p>Signatures of the Members</p></div>
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
        <h1 className="text-3xl font-bold">Society Registration Deed Generator</h1>
        <p className="text-muted-foreground">Generate the Memorandum of Association for registering a new society.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
