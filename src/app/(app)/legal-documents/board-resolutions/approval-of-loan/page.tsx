
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
  lenderName: z.string().min(3, "Lender's name is required."),
  lenderDesignation: z.string().min(3, "Lender's designation is required, e.g., Director."),
  loanAmount: z.coerce.number().positive("Loan amount must be a positive number."),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative."),
  tenure: z.string().min(1, "Tenure is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function ApprovalOfLoanPage() {
  const { toast } = useToast();
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      meetingDate: new Date().toISOString().split("T")[0],
      lenderName: "Rohan Sharma",
      lenderDesignation: "Director",
      loanAmount: 500000,
      interestRate: 12,
      tenure: "2 years",
    },
  });

  const formData = form.watch();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Board_Resolution_Loan_Approval_${formData.companyName}`,
    onAfterPrint: () => toast({ title: "Print Complete" }),
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/board-resolutions" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Resolutions Library
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Board Resolution: Approval of Loan from Director</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate a board resolution to formally accept an unsecured loan from a director.
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
                 <FormField control={form.control} name="lenderName" render={({ field }) => (<FormItem><FormLabel>Lender's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="lenderDesignation" render={({ field }) => (<FormItem><FormLabel>Lender's Designation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Loan Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest Rate (% p.a.)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="tenure" render={({ field }) => (<FormItem><FormLabel>Loan Tenure</FormLabel><FormControl><Input placeholder="e.g., 2 years" {...field} /></FormControl><FormMessage /></FormItem>)}/>
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
                        <p><strong className="uppercase">ACCEPTANCE OF UNSECURED LOAN FROM DIRECTOR</strong></p>
                        <p><strong className="uppercase">RESOLVED THAT</strong> pursuant to Section 179(3)(d) and Section 180 of the Companies Act, 2013 and rules made thereunder, consent of the Board of Directors be and is hereby accorded to borrow a sum of <strong>₹{formData.loanAmount.toLocaleString('en-IN')}</strong> from <strong>{formData.lenderName}</strong>, <strong>{formData.lenderDesignation}</strong> of the company, as an unsecured loan, at an interest rate of <strong>{formData.interestRate}% per annum</strong> for a period of <strong>{formData.tenure}</strong>.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> the loan amount be accepted and utilized for the business purpose of the Company.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> any Director of the Company be and is hereby authorised to sign and execute the loan agreement and do all such acts, deeds and things as may be necessary to give effect to this resolution.</p>
                    </div>

                    <div className="mt-16">
                        <p className="font-bold">CERTIFIED TRUE COPY</p>
                        <p>For <strong>{formData.companyName || '[Company Name]'}</strong></p>
                        <div className="h-20"></div>
                        <p>(Director)</p>
                        <p>DIN: ____________</p>
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
