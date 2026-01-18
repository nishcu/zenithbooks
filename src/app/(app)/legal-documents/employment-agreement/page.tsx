
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { OnDemandPayAndUseActions } from "@/components/payment/on-demand-pay-and-use-actions";
import { getServicePricing, onPricingUpdate } from "@/lib/pricing-service";
import { useOnDemandUnlock } from "@/hooks/use-on-demand-unlock";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  companyAddress: z.string().min(10, "Company address is required."),
  employeeName: z.string().min(3, "Employee's name is required."),
  employeeAddress: z.string().min(10, "Employee's address is required."),
  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  jobTitle: z.string().min(2, "Job title is required."),
  department: z.string().min(2, "Department is required."),
  joiningDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  probationMonths: z.coerce.number().min(0).default(6),
  annualCtc: z.coerce.number().positive("CTC must be positive."),
  jobDescription: z.string().min(20, "Job description is required."),
  workingHours: z.string().default("9:00 AM to 6:00 PM, Monday to Friday"),
  leavePolicy: z.string().default("As per company policy"),
  terminationNoticeMonths: z.coerce.number().positive().default(2),
  confidentialityClause: z.string().default("Employee agrees to maintain confidentiality of all company information during and after employment."),
  nonCompeteClause: z.string().optional(),
  jurisdictionCity: z.string().min(2, "Jurisdiction city is required.").default("Mumbai"),
  signerName: z.string().min(3, "Signer's name is required."),
  signerTitle: z.string().min(3, "Signer's title is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function EmploymentAgreementPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  useOnDemandUnlock("employment_agreement_download", () => setShowDocument(true));

  useEffect(() => {
    if (user) {
      getUserSubscriptionInfo(user.uid).then(setUserSubscriptionInfo);
    }
  }, [user]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      companyAddress: "",
      agreementDate: "",
    },
  });

  useEffect(() => {
    form.reset({
      ...form.getValues(),
      agreementDate: new Date().toISOString().split("T")[0],
    });
  }, [form]);

  useEffect(() => {
    getServicePricing().then(setPricing).catch(console.error);
    const unsubscribe = onPricingUpdate(setPricing);
    return () => unsubscribe();
  }, []);

  const processStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    switch (step) {
      case 1:
        fieldsToValidate = ["companyName", "companyAddress", "employeeName", "employeeAddress", "agreementDate"];
        break;
      case 2:
        fieldsToValidate = ["jobTitle", "department", "joiningDate", "probationMonths", "annualCtc", "jobDescription"];
        break;
      case 3:
        fieldsToValidate = ["workingHours", "leavePolicy", "terminationNoticeMonths", "confidentialityClause", "jurisdictionCity", "signerName", "signerTitle"];
        break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
      toast({ title: `Step ${step} Saved` });
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
            <CardHeader><CardTitle>Step 1: Parties & Date</CardTitle><CardDescription>Enter company and employee details.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="companyAddress" render={({ field }) => ( <FormItem><FormLabel>Company Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <FormField control={form.control} name="employeeName" render={({ field }) => ( <FormItem><FormLabel>Employee Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="employeeAddress" render={({ field }) => ( <FormItem><FormLabel>Employee Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <FormField control={form.control} name="agreementDate" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-end"><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Role & Compensation</CardTitle><CardDescription>Define job role and compensation.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="jobTitle" render={({ field }) => ( <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="department" render={({ field }) => ( <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="joiningDate" render={({ field }) => ( <FormItem><FormLabel>Joining Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="probationMonths" render={({ field }) => ( <FormItem><FormLabel>Probation Period (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <FormField control={form.control} name="annualCtc" render={({ field }) => ( <FormItem><FormLabel>Annual CTC (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="jobDescription" render={({ field }) => ( <FormItem><FormLabel>Job Description & Responsibilities</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader><CardTitle>Step 3: Terms & Conditions</CardTitle><CardDescription>Define employment terms.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="workingHours" render={({ field }) => ( <FormItem><FormLabel>Working Hours</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="leavePolicy" render={({ field }) => ( <FormItem><FormLabel>Leave Policy</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="terminationNoticeMonths" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Termination Notice Period (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="confidentialityClause" render={({ field }) => ( <FormItem><FormLabel>Confidentiality Clause</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="nonCompeteClause" render={({ field }) => ( <FormItem><FormLabel>Non-Compete Clause (Optional)</FormLabel><FormControl><Textarea className="min-h-24" placeholder="Optional non-compete restrictions..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="jurisdictionCity" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Jurisdiction City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="signerName" render={({ field }) => ( <FormItem><FormLabel>Signer's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Employment Agreement.</CardDescription></CardHeader>
                <CardContent>
                    <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                        <div className="text-center"><h2 className="font-bold">EMPLOYMENT AGREEMENT</h2></div>
                        <p>This Employment Agreement is entered into on <strong>{formData.agreementDate ? new Date(formData.agreementDate).toLocaleDateString('en-GB', dateOptions) : '[Date]'}</strong> between:</p>
                        
                        <p className="font-bold mt-4">EMPLOYER:</p>
                        <p><strong>{formData.companyName}</strong>, having its registered office at {formData.companyAddress} (the "Employer")</p>
                        
                        <p className="font-bold mt-4">EMPLOYEE:</p>
                        <p><strong>{formData.employeeName}</strong>, residing at {formData.employeeAddress} (the "Employee")</p>

                        <h4 className="font-bold mt-4">1. Position and Duties</h4>
                        <p>The Employee is hereby appointed as <strong>{formData.jobTitle}</strong> in the <strong>{formData.department}</strong> department, with effect from <strong>{formData.joiningDate ? new Date(formData.joiningDate).toLocaleDateString('en-GB', dateOptions) : '[Joining Date]'}</strong>.</p>
                        <p>The Employee's duties and responsibilities include: {formData.jobDescription}</p>

                        <h4 className="font-bold mt-4">2. Probation Period</h4>
                        <p>The Employee will be on probation for a period of {formData.probationMonths} months from the date of joining. Upon successful completion, employment will be confirmed in writing.</p>

                        <h4 className="font-bold mt-4">3. Compensation</h4>
                        <p>The Employee will receive an annual Cost to Company (CTC) of ₹{formData.annualCtc.toLocaleString('en-IN')}, payable in accordance with the Employer's payroll schedule.</p>

                        <h4 className="font-bold mt-4">4. Working Hours</h4>
                        <p>{formData.workingHours}</p>

                        <h4 className="font-bold mt-4">5. Leave Policy</h4>
                        <p>{formData.leavePolicy}</p>

                        <h4 className="font-bold mt-4">6. Termination</h4>
                        <p>This Agreement may be terminated by either party by giving {formData.terminationNoticeMonths} month(s) written notice or salary in lieu thereof.</p>

                        <h4 className="font-bold mt-4">7. Confidentiality</h4>
                        <p>{formData.confidentialityClause}</p>

                        {formData.nonCompeteClause && (
                          <>
                            <h4 className="font-bold mt-4">8. Non-Compete</h4>
                            <p>{formData.nonCompeteClause}</p>
                          </>
                        )}

                        <h4 className="font-bold mt-4">{formData.nonCompeteClause ? '9' : '8'}. Governing Law</h4>
                        <p>This Agreement shall be governed by the laws of India, and the courts in {formData.jurisdictionCity} shall have exclusive jurisdiction.</p>

                        <p className="mt-8">IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.</p>
                        
                        <div className="grid grid-cols-2 gap-16 mt-16">
                            <div>
                                <p className="font-bold">EMPLOYER:</p>
                                <p className="mt-12">_________________________</p>
                                <p><strong>{formData.signerName}</strong><br/>{formData.signerTitle}<br/>{formData.companyName}</p>
                            </div>
                            <div>
                                <p className="font-bold">EMPLOYEE:</p>
                                <p className="mt-12">_________________________</p>
                                <p><strong>{formData.employeeName}</strong></p>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  {(() => {
                    const basePrice = pricing?.agreements?.find(s => s.id === 'employment_agreement')?.price || 0;
                    const effectivePrice = userSubscriptionInfo
                      ? getEffectiveServicePrice(basePrice, userSubscriptionInfo.userType, userSubscriptionInfo.subscriptionPlan, "agreements")
                      : basePrice;
                    return (
                      <OnDemandPayAndUseActions
                        userId={user?.uid || ''}
                        userEmail={user?.email || ''}
                        userName={user?.displayName || ''}
                        planId="employment_agreement_download"
                        planName="Employment Agreement Download"
                        amount={effectivePrice}
                        fileName={`Employment_Agreement_${formData.employeeName}`}
                        contentRef={printRef}
                        documentType="employment_agreement"
                        documentName={`Employment_Agreement_${formData.employeeName}`}
                        metadata={{ source: "legal-documents" }}
                        showDocument={showDocument}
                        setShowDocument={setShowDocument}
                      />
                    );
                  })()}
                </CardFooter>
            </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/legal-documents/category/agreements" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Agreements
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Employment Agreement</h1>
        <p className="text-muted-foreground">Create a comprehensive employment agreement for full-time employees.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}

