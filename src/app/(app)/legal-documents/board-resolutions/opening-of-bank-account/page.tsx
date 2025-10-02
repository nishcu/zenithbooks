
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
  companyAddress: z.string().min(10, "Company address is required."),
  meetingDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  meetingTime: z.string().min(1, "Time is required."),
  meetingVenue: z.string().min(3, "Venue is required."),
  bankName: z.string().min(3, "Bank name is required."),
  branchName: z.string().min(3, "Branch name is required."),
  authorizedSignatory: z.string().min(3, "Authorized signatory name is required."),
  signingAuthority: z.enum(["singly", "jointly"]).default("singly"),
});

type FormData = z.infer<typeof formSchema>;

export default function BankAccountResolutionPage() {
  const { toast } = useToast();
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      companyAddress: "123 Business Park, Andheri, Mumbai, Maharashtra, 400053",
      meetingDate: new Date().toISOString().split("T")[0],
      meetingTime: "11:00 AM",
      meetingVenue: "Registered Office",
      bankName: "HDFC Bank",
      branchName: "Andheri West Branch",
      authorizedSignatory: "Mr. Rohan Sharma, Director",
      signingAuthority: "singly",
    },
  });

  const formData = form.watch();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Board_Resolution_Bank_Account_${formData.companyName}`,
    onAfterPrint: () => toast({ title: "Print Complete" }),
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/board-resolutions" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Resolutions Library
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Board Resolution: Opening of Bank Account</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate a board resolution to authorize the opening of a new company bank account.
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
                 <FormField control={form.control} name="companyAddress" render={({ field }) => (<FormItem><FormLabel>Registered Office Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <div className="grid sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="meetingDate" render={({ field }) => (<FormItem><FormLabel>Meeting Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="meetingTime" render={({ field }) => (<FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="meetingVenue" render={({ field }) => (<FormItem><FormLabel>Venue</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 </div>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="branchName" render={({ field }) => (<FormItem><FormLabel>Branch</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 </div>
                 <FormField control={form.control} name="authorizedSignatory" render={({ field }) => (<FormItem><FormLabel>Authorized Signatory</FormLabel><FormControl><Input placeholder="Mr. John Doe, Director" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="signingAuthority" render={({ field }) => (<FormItem><FormLabel>Signing Authority</FormLabel><FormControl>
                    <select {...field} className="h-10 w-full rounded-md border border-input px-3"><option value="singly">Singly</option><option value="jointly">Jointly</option></select>
                 </FormControl><FormMessage /></FormItem>)}/>
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
                        <p className="text-xs">(Registered under Companies Act, 2013)</p>
                        <p className="text-xs">Regd. Office: {formData.companyAddress || '[Company Address]'}</p>
                    </div>

                    <div className="mt-8">
                        <h4 className="font-bold text-center underline">EXTRACT OF THE MINUTES OF THE MEETING OF THE BOARD OF DIRECTORS</h4>
                        <p className="text-center">of {formData.companyName || '[Company Name]'} held on {formData.meetingDate ? new Date(formData.meetingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric'}) : '[Date]'} at {formData.meetingTime || '[Time]'} at {formData.meetingVenue || '[Venue]'}</p>
                    </div>

                    <div className="mt-8 space-y-4 text-justify">
                        <p><strong className="uppercase">RESOLVED THAT</strong> a Current Account be opened in the name of the Company with <strong>{formData.bankName || '[Bank Name]'}</strong>, at its branch at <strong>{formData.branchName || '[Branch]'}</strong>.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> the bank be instructed to honour all cheques, bills of exchange, promissory notes and other negotiable instruments signed, drawn, accepted or made on behalf of the company by <strong>{formData.authorizedSignatory || '[Authorized Signatory]'}</strong>, and to act on any instructions so given relating to the account, whether the same be overdrawn or not, or relating to the transactions of the company.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> <strong>{formData.authorizedSignatory || '[Authorized Signatory]'}</strong> of the Company be and is/are hereby authorized {formData.signingAuthority || '[singly/jointly]'} to sign and execute all such documents, forms, and papers as may be required in this connection.</p>
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
