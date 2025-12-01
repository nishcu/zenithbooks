
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
  auditorFirmName: z.string().min(3, "Auditor firm name is required."),
  auditorFirmAddress: z.string().min(10, "Auditor firm address is required."),
  auditorFirmRegNo: z.string().min(3, "FRN is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function AppointmentOfAuditorPage() {
  const { toast } = useToast();
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      companyAddress: "123 Business Park, Andheri, Mumbai, Maharashtra, 400053",
      meetingDate: new Date().toISOString().split("T")[0],
      auditorFirmName: "S. Sharma & Associates",
      auditorFirmAddress: "456 Finance Tower, BKC, Mumbai, Maharashtra, 400051",
      auditorFirmRegNo: "123456W",
    },
  });

  const formData = form.watch();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Board_Resolution_Auditor_Appointment_${formData.companyName}`,
    onAfterPrint: () => toast({ title: "Print Complete" }),
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/board-resolutions" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Resolutions Library
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Board Resolution: Appointment of First Auditor</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate a board resolution to appoint the company's first statutory auditors.
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
                 <FormField control={form.control} name="auditorFirmName" render={({ field }) => (<FormItem><FormLabel>Auditor Firm Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="auditorFirmAddress" render={({ field }) => (<FormItem><FormLabel>Auditor Firm Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="auditorFirmRegNo" render={({ field }) => (<FormItem><FormLabel>Auditor Firm Registration No. (FRN)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
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
                        <p><strong className="uppercase">APPOINTMENT OF FIRST AUDITOR OF THE COMPANY</strong></p>
                        <p><strong className="uppercase">RESOLVED THAT</strong> pursuant to the provisions of Section 139(6) and other applicable provisions, if any, of the Companies Act, 2013, read with rules made thereunder, M/s <strong>{formData.auditorFirmName || '[Auditor Firm Name]'}</strong>, Chartered Accountants, (Firm Registration No. <strong>{formData.auditorFirmRegNo || '[FRN]'}</strong>), be and are hereby appointed as the first Statutory Auditors of the Company to hold office from the conclusion of this meeting until the conclusion of the first Annual General Meeting of the Company, at such remuneration as may be mutually agreed upon between the Board of Directors and the Auditors.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> any Director of the Company be and is hereby authorized to do all such acts, deeds, and things as may be necessary to give effect to this resolution, including filing of requisite forms with the Registrar of Companies.</p>
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
