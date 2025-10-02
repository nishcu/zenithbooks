
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
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  meetingDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  newAddress: z.string().min(10, "New address is required."),
  effectiveDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  authorizedDirector: z.string().min(3, "Director's name is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function ShiftingOfOfficePage() {
  const { toast } = useToast();
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      meetingDate: new Date().toISOString().split("T")[0],
      newAddress: "456 Corporate Towers, Worli, Mumbai, Maharashtra, 400018",
      effectiveDate: new Date().toISOString().split("T")[0],
      authorizedDirector: "Rohan Sharma",
    },
  });

  const formData = form.watch();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Board_Resolution_Shifting_Office_${formData.companyName}`,
    onAfterPrint: () => toast({ title: "Print Complete" }),
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/board-resolutions" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Resolutions Library
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Board Resolution: Shifting of Registered Office</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate a resolution for shifting the company's registered office within the same city.
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
                 <FormField control={form.control} name="newAddress" render={({ field }) => (<FormItem><FormLabel>New Registered Office Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="effectiveDate" render={({ field }) => (<FormItem><FormLabel>Effective Date of Shifting</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="authorizedDirector" render={({ field }) => (<FormItem><FormLabel>Authorised Director</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
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
                        <p><strong className="uppercase">SHIFTING OF REGISTERED OFFICE</strong></p>
                        <p><strong className="uppercase">RESOLVED THAT</strong> pursuant to the provisions of Section 12 of the Companies Act, 2013 and other applicable provisions, if any, the consent of the Board of Directors be and is hereby accorded for shifting the Registered Office of the Company to <strong>{formData.newAddress || '[New Address]'}</strong> with effect from <strong>{formData.effectiveDate ? new Date(formData.effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric'}) : '[Date]'}</strong>.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> <strong>{formData.authorizedDirector || '[Director Name]'}</strong>, Director of the Company, be and is hereby authorized to file the necessary e-Form INC-22 with the Registrar of Companies, and to do all such acts, deeds, and things as may be necessary to give effect to this resolution.</p>
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
