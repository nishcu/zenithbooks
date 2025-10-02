

"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, FileDown, Printer } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useReactToPrint } from "react-to-print";
import { cn } from "@/lib/utils";
import { ShareButtons } from "@/components/documents/share-buttons";

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  companyAddress: z.string().min(10, "Company address is required."),
  employeeName: z.string().min(3, "Employee's name is required."),
  employeeAddress: z.string().min(10, "Employee's address is required."),
  appointmentDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  jobTitle: z.string().min(2, "Job title is required."),
  joiningDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  probationMonths: z.coerce.number().min(0, "Probation period cannot be negative.").default(6),
  annualCtc: z.coerce.number().positive("CTC must be a positive number."),
  compensationDetails: z.string().default("Your detailed compensation and benefits structure is outlined in Annexure A."),
  workingHours: z.string().default("The standard working hours are from 10:00 AM to 7:00 PM, Monday to Friday."),
  terminationNoticeMonths: z.coerce.number().positive().default(2),
  jurisdictionCity: z.string().min(2, "Jurisdiction city is required.").default("Mumbai"),
  signerName: z.string().min(3, "Signer's name is required."),
  signerTitle: z.string().min(3, "Signer's title is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function AppointmentLetterPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "GSTEase Solutions Pvt. Ltd.",
      companyAddress: "123 Business Avenue, Commerce City, Maharashtra - 400001",
      // Default dates will be set in useEffect to avoid hydration issues
    },
  });

  useEffect(() => {
    form.reset({
      ...form.getValues(),
      appointmentDate: new Date().toISOString().split("T")[0],
    });
  }, [form]);


  const processStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    switch (step) {
      case 1:
        fieldsToValidate = ["companyName", "companyAddress", "employeeName", "employeeAddress", "appointmentDate"];
        break;
      case 2:
        fieldsToValidate = ["jobTitle", "joiningDate", "probationMonths", "annualCtc", "compensationDetails"];
        break;
      case 3:
        fieldsToValidate = ["workingHours", "terminationNoticeMonths", "jurisdictionCity", "signerName", "signerTitle"];
        break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
      if (step < 4) {
        toast({ title: `Step ${step} Saved` });
      }
    } else {
      toast({ variant: "destructive", title: "Validation Error" });
    }
  };

  const handleBack = () => setStep(prev => prev - 1);

  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader><CardTitle>Step 1: Parties & Date</CardTitle><CardDescription>Enter details of the company and the new employee.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="companyAddress" render={({ field }) => ( <FormItem><FormLabel>Company Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <FormField control={form.control} name="employeeName" render={({ field }) => ( <FormItem><FormLabel>Employee Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="employeeAddress" render={({ field }) => ( <FormItem><FormLabel>Employee Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <FormField control={form.control} name="appointmentDate" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Date of Letter</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-end"><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Role & Compensation</CardTitle><CardDescription>Define the job specifics and financial terms.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="jobTitle" render={({ field }) => ( <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="joiningDate" render={({ field }) => ( <FormItem><FormLabel>Date of Joining</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <FormField control={form.control} name="probationMonths" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Probation Period (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <FormField control={form.control} name="annualCtc" render={({ field }) => ( <FormItem><FormLabel>Annual Cost to Company (CTC) (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="compensationDetails" render={({ field }) => ( <FormItem><FormLabel>Compensation Details</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader><CardTitle>Step 3: Terms & Conditions</CardTitle><CardDescription>Define other employment terms.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="workingHours" render={({ field }) => ( <FormItem><FormLabel>Working Hours</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="terminationNoticeMonths" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Termination Notice Period (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="jurisdictionCity" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Jurisdiction City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="signerName" render={({ field }) => ( <FormItem><FormLabel>Signer's Name (e.g., HR Manager)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="signerTitle" render={({ field }) => ( <FormItem><FormLabel>Signer's Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 4:
        const formData = form.getValues();
        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Appointment Letter.</CardDescription></CardHeader>
                <CardContent>
                    <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                        <div className="text-center"><h2 className="font-bold">APPOINTMENT LETTER</h2></div>
                        <p><strong>Date:</strong> {formData.appointmentDate ? new Date(formData.appointmentDate).toLocaleDateString('en-GB', dateOptions) : '[Date]'}</p>
                        <p><strong>To,</strong><br/>{formData.employeeName}<br/>{formData.employeeAddress}</p>
                        <p><strong>Subject: Letter of Appointment</strong></p>
                        <p>Dear {formData.employeeName},</p>
                        <p>We are pleased to appoint you in our organization for the position of <strong>{formData.jobTitle}</strong>, effective from your date of joining, which shall be no later than <strong>{formData.joiningDate ? new Date(formData.joiningDate).toLocaleDateString('en-GB', dateOptions) : '[Joining Date]'}</strong>.</p>
                        
                        <h4 className="font-bold mt-4">1. Place of Work</h4>
                        <p>Your initial place of posting will be at our office at {formData.companyAddress}.</p>

                        <h4 className="font-bold mt-4">2. Probation Period</h4>
                        <p>You will be on probation for a period of {formData.probationMonths} months from the date of joining. Upon successful completion of the probation period, your employment will be confirmed in writing.</p>
                        
                        <h4 className="font-bold mt-4">3. Compensation</h4>
                        <p>Your annual Cost to Company (CTC) will be ₹{formData.annualCtc.toLocaleString('en-IN')}. {formData.compensationDetails}</p>

                        <h4 className="font-bold mt-4">4. Working Hours</h4>
                        <p>{formData.workingHours}</p>

                        <h4 className="font-bold mt-4">5. Termination</h4>
                        <p>After confirmation, your employment can be terminated by either party by giving {formData.terminationNoticeMonths} month(s) notice in writing or salary in lieu thereof.</p>

                        <h4 className="font-bold mt-4">6. General Conditions</h4>
                        <p>Your employment will be governed by the company's policies and rules, which may be amended from time to time. You are required to maintain the confidentiality of all company information.</p>

                        <h4 className="font-bold mt-4">7. Governing Law</h4>
                        <p>This agreement shall be governed by the laws of India, and the courts in {formData.jurisdictionCity} shall have exclusive jurisdiction.</p>

                        <p>Please sign and return the duplicate copy of this letter in acceptance of the terms and conditions.</p>

                        <div className="mt-16">
                            <p>Yours faithfully,</p>
                            <p>For <strong>{formData.companyName}</strong></p>
                            <div className="h-20"></div>
                            <p><strong>{formData.signerName}</strong><br/>{formData.signerTitle}</p>
                        </div>

                        <div className="mt-16 pt-8 border-t border-dashed">
                            <p>I have read and understood the terms and conditions of this appointment and agree to abide by them.</p>
                            <p className="mt-16">______________________<br/>(Signature of Employee)</p>
                            <p>Name: {formData.employeeName}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  <ShareButtons 
                    contentRef={printRef}
                    fileName={`Appointment_Letter_${formData.employeeName}`}
                  />
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
        <h1 className="text-3xl font-bold">Appointment Letter Generator</h1>
        <p className="text-muted-foreground">Create a detailed appointment letter for new hires.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
