
"use client";

import { useState, useEffect } from "react";
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
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { ArrowLeft, FileDown } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  deponentName: z.string().min(3, "Deponent's name is required."),
  parentage: z.string().min(3, "Parentage is required (e.g., S/o, W/o, D/o)."),
  address: z.string().min(10, "A full address is required."),
  aadhaar: z.string().regex(/^\d{12}$/, "Must be a 12-digit Aadhaar number.").optional().or(z.literal("")),
  firmName: z.string().min(3, "Firm name is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function SelfAffidavitGstPage() {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deponentName: "",
      parentage: "",
      address: "",
      aadhaar: "",
      firmName: "",
    },
  });

  const formData = form.watch();

  const generateAffidavitText = (data: Partial<FormData>) => {
    const { deponentName, parentage, address, aadhaar, firmName } = data;
    const aadhaarText = aadhaar ? ` holding (Aadhaar ${aadhaar})` : "";

    return `
AFFIDAVIT

I ${deponentName || "[Deponent Name]"}, ${parentage || "[S/o, W/o, D/o]"} R/o “${address || "[Full Address]"}”${aadhaarText}, do hereby solemnly affirm and state that as follows:

That I am the owner of the above mentioned property at “${address || "[Full Address]"}”.

We are doing partnership/proprietorship business in the name and style of M/s “${firmName || "[Firm Name]"}” and which is managed by me i.e. ${deponentName || "[Deponent Name]"} at R/o “${address || "[Full Address]"}” which is owned by me and I am not charging any rent for running this partnership business.

I do hereby declare and confirm that the contents of the affidavit are true and correct to the best of my knowledge and belief and nothing material has been concealed.


Place:
Date:                                       Deponent Signature
    `.trim();
  };
  
  const affidavitText = generateAffidavitText(formData);

  const handleDownload = () => {
    const blob = new Blob([affidavitText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Self_Affidavit.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Download Started", description: "Your affidavit text file has been downloaded." });
  };


  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Selection
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Self Affidavit for GST</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate an affidavit for using a self-occupied property for business without a rental agreement.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Enter Details</CardTitle>
            <CardDescription>Fill in the information to generate the affidavit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                 <FormField control={form.control} name="deponentName" render={({ field }) => (
                    <FormItem><FormLabel>Deponent Full Name</FormLabel><FormControl><Input placeholder="e.g., Suryadevara Kranthi Kumar" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="parentage" render={({ field }) => (
                    <FormItem><FormLabel>Parentage</FormLabel><FormControl><Input placeholder="e.g., S/o Suyradevara Mohan Rao (Late)" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Full Address</FormLabel><FormControl><Textarea placeholder="Enter the full property and residential address" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="aadhaar" render={({ field }) => (
                    <FormItem><FormLabel>Aadhaar Number (Optional)</FormLabel><FormControl><Input placeholder="12-digit number" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="firmName" render={({ field }) => (
                    <FormItem><FormLabel>Firm/Business Name</FormLabel><FormControl><Input placeholder="e.g., MAHADEV REGTECH SOLUTIONS" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="sticky top-20">
            <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>The draft will update as you type.</CardDescription>
            </CardHeader>
            <CardContent>
                <pre className="p-4 bg-muted/50 rounded-md whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {affidavitText}
                </pre>
            </CardContent>
            <CardFooter>
                <Button onClick={handleDownload}>
                    <FileDown className="mr-2" />
                    Download as .txt
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
