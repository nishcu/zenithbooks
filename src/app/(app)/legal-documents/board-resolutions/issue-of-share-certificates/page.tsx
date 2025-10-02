
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  meetingDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  allotteeName: z.string().min(3, "Allottee's name is required."),
  numberOfShares: z.coerce.number().positive("Number of shares must be positive."),
  shareType: z.enum(["Equity", "Preference"]).default("Equity"),
  distinctiveNumbers: z.string().min(1, "Distinctive numbers are required."),
  certificateNumber: z.string().min(1, "Certificate number is required."),
  director1: z.string().min(3, "Director's name is required."),
  director2: z.string().min(3, "Director's name is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function IssueOfSharesPage() {
  const { toast } = useToast();
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      meetingDate: new Date().toISOString().split("T")[0],
      allotteeName: "Priya Mehta",
      numberOfShares: 1000,
      shareType: "Equity",
      distinctiveNumbers: "1001-2000",
      certificateNumber: "1",
      director1: "Rohan Sharma",
      director2: "Anjali Singh",
    },
  });

  const formData = form.watch();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Board_Resolution_Share_Certificate_${formData.companyName}`,
    onAfterPrint: () => toast({ title: "Print Complete" }),
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/board-resolutions" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Resolutions Library
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Board Resolution: Issue of Share Certificates</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate a resolution authorizing the issuance and signing of share certificates.
        </p>
      </div>
        <Card>
          <CardHeader>
            <CardTitle>Enter Resolution Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                 <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="meetingDate" render={({ field }) => (<FormItem className="max-w-xs"><FormLabel>Board Meeting Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="allotteeName" render={({ field }) => (<FormItem><FormLabel>Name of Allottee</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="numberOfShares" render={({ field }) => (<FormItem><FormLabel>Number of Shares</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="shareType" render={({ field }) => (<FormItem><FormLabel>Type of Shares</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 </div>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="certificateNumber" render={({ field }) => (<FormItem><FormLabel>Certificate No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="distinctiveNumbers" render={({ field }) => (<FormItem><FormLabel>Distinctive Numbers (From-To)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="director1" render={({ field }) => (<FormItem><FormLabel>Signing Director 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="director2" render={({ field }) => (<FormItem><FormLabel>Signing Director 2</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Live Preview</CardTitle>
                    <CardDescription>
                        This is a live preview of the resolution. Use the button at the bottom to print or save.
                    </CardDescription>
                </CardHeader>
                <CardContent ref={printRef} className="p-8 border-dashed border-2 rounded-lg prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-center">
                        <h4 className="font-bold">{formData.companyName || '[Company Name]'}</h4>
                    </div>
                    <div className="mt-8">
                        <h4 className="font-bold text-center underline">CERTIFIED TRUE COPY OF THE RESOLUTION PASSED AT THE MEETING OF THE BOARD OF DIRECTORS</h4>
                    </div>
                    <div className="mt-8 text-justify">
                        <p><strong className="uppercase">ISSUE OF SHARE CERTIFICATES</strong></p>
                        <p><strong className="uppercase">RESOLVED THAT</strong> pursuant to the provisions of the Companies Act, 2013 and the rules made thereunder, the issue of Share Certificate No. <strong>{formData.certificateNumber || '[Cert. No]'}</strong> for <strong>{formData.numberOfShares.toLocaleString()}</strong> {formData.shareType} Shares of the Company, with distinctive numbers from <strong>{formData.distinctiveNumbers || '[From-To]'}</strong>, in the name of <strong>{formData.allotteeName || '[Allottee Name]'}</strong>, be and is hereby approved.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> the said Share Certificate be executed under the common seal of the Company and be signed by <strong>{formData.director1 || '[Director 1]'}</strong> and <strong>{formData.director2 || '[Director 2]'}</strong>, Directors of the Company, and by an authorized signatory.</p>
                    </div>

                    <div className="mt-16">
                        <p className="font-bold">CERTIFIED TRUE COPY</p>
                        <p>For <strong>{formData.companyName || '[Company Name]'}</strong></p>
                        <div className="h-20"></div>
                        <p>(Director / Company Secretary)</p>
                        <p>DIN / Membership No.: ____________</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handlePrint}><Printer className="mr-2" /> Print / Save as PDF</Button>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
