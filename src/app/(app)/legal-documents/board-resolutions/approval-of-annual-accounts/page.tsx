
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
  financialYearEnd: z.string().min(4, "Financial year is required."),
  signingDirector1: z.string().min(3, "Director's name is required."),
  signingDirector2: z.string().min(3, "Director's name is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function ApprovalOfAnnualAccountsPage() {
  const { toast } = useToast();
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      meetingDate: new Date().toISOString().split("T")[0],
      financialYearEnd: "31st March, 2024",
      signingDirector1: "Rohan Sharma",
      signingDirector2: "Priya Mehta",
    },
  });

  const formData = form.watch();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Board_Resolution_Accounts_Approval_${formData.companyName}`,
    onAfterPrint: () => toast({ title: "Print Complete" }),
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/board-resolutions" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Resolutions Library
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Board Resolution: Approval of Annual Accounts</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate a board resolution to approve the company's annual financial statements.
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
                 <FormField control={form.control} name="financialYearEnd" render={({ field }) => (<FormItem><FormLabel>Financial Year End Date</FormLabel><FormControl><Input placeholder="e.g., 31st March, 2024" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="signingDirector1" render={({ field }) => (<FormItem><FormLabel>Signing Director 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="signingDirector2" render={({ field }) => (<FormItem><FormLabel>Signing Director 2</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
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
                        <p><strong className="uppercase">APPROVAL OF ANNUAL ACCOUNTS</strong></p>
                        <p>The Chairman placed before the Board the Audited Financial Statements of the Company for the financial year ended <strong>{formData.financialYearEnd || '[Financial Year End]'}</strong>, comprising the Balance Sheet as at that date, the Statement of Profit and Loss, the Cash Flow Statement for the year ended on that date, and the notes to accounts, along with the Auditor's Report and the draft Director's Report.</p>
                        <p><strong className="uppercase">RESOLVED THAT</strong> the Audited Financial Statements of the Company for the financial year ended <strong>{formData.financialYearEnd || '[Financial Year End]'}</strong>, along with the Auditor’s Report and the Director’s Report, be and are hereby approved.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> the financial statements be signed on behalf of the Board by <strong>{formData.signingDirector1 || '[Director 1]'}</strong> and <strong>{formData.signingDirector2 || '[Director 2]'}</strong>, Directors of the Company, and be submitted to the members for their consideration and adoption at the ensuing Annual General Meeting.</p>
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
