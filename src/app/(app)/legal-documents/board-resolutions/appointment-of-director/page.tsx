
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
  directorName: z.string().min(3, "Director's name is required."),
  directorDin: z.string().min(8, "A valid DIN is required."),
  effectiveDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
});

type FormData = z.infer<typeof formSchema>;

export default function AppointmentOfDirectorPage() {
  const { toast } = useToast();
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      meetingDate: new Date().toISOString().split("T")[0],
      directorName: "Priya Mehta",
      directorDin: "01234567",
      effectiveDate: new Date().toISOString().split("T")[0],
    },
  });

  const formData = form.watch();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Board_Resolution_Director_Appointment_${formData.companyName}`,
    onAfterPrint: () => toast({ title: "Print Complete" }),
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/board-resolutions" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Resolutions Library
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Board Resolution: Appointment of Additional Director</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate a board resolution to appoint an additional director to the board.
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
                 <FormField control={form.control} name="meetingDate" render={({ field }) => (<FormItem><FormLabel>Board Meeting Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="directorName" render={({ field }) => (<FormItem><FormLabel>New Director's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="directorDin" render={({ field }) => (<FormItem><FormLabel>New Director's DIN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="effectiveDate" render={({ field }) => (<FormItem><FormLabel>Effective Date of Appointment</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
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
                        <p><strong className="uppercase">APPOINTMENT OF ADDITIONAL DIRECTOR</strong></p>
                        <p><strong className="uppercase">RESOLVED THAT</strong> pursuant to the provisions of Section 161 of the Companies Act, 2013, and the Articles of Association of the Company, <strong>{formData.directorName || '[Director Name]'}</strong> (DIN: <strong>{formData.directorDin || '[DIN]'}</strong>), who has signified her/his consent to act as a Director of the Company, be and is hereby appointed as an Additional Director of the Company with effect from <strong>{formData.effectiveDate ? new Date(formData.effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric'}) : '[Date]'}</strong>.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> {formData.directorName || '[Director Name]'} shall hold office up to the date of the next Annual General Meeting of the Company.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> any Director of the Company be and is hereby authorized to file the necessary forms with the Registrar of Companies and to do all such acts, deeds and things as may be necessary to give effect to this resolution.</p>
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
