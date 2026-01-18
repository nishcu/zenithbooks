
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
  letterDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  employeeId: z.string().optional(),
  jobTitle: z.string().min(2, "Job title is required."),
  department: z.string().min(2, "Department is required."),
  warningType: z.enum(["first", "second", "final"]).default("first"),
  issueDescription: z.string().min(20, "Issue description is required."),
  previousWarnings: z.string().optional(),
  expectedImprovement: z.string().min(10, "Expected improvement details are required."),
  consequences: z.string().default("Failure to improve may result in further disciplinary action, including termination of employment."),
  signerName: z.string().min(3, "Signer's name is required."),
  signerTitle: z.string().min(3, "Signer's title is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function AffidavitLossDocsPage() {
  const printRef = useRef(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  useOnDemandUnlock("affidavit_loss_of_docs_download", () => setShowDocument(true));

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
      letterDate: "",
      warningType: "first",
    },
  });

  useEffect(() => {
    form.reset({
      ...form.getValues(),
      letterDate: new Date().toISOString().split("T")[0],
    });
  }, [form]);

  useEffect(() => {
    getServicePricing().then(setPricing).catch(console.error);
    const unsubscribe = onPricingUpdate(setPricing);
    return () => unsubscribe();
  }, []);

  const formData = form.watch();
  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

  const warningTypeLabels = {
    first: "First Warning",
    second: "Second Warning",
    final: "Final Warning"
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/category/others" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Others
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Loss of Documents Affidavit Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Affidavit for lost documents. for employee misconduct or performance issues.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Enter Warning Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                 <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="companyAddress" render={({ field }) => (
                    <FormItem><FormLabel>Company Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="employeeName" render={({ field }) => (
                    <FormItem><FormLabel>Employee Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="employeeAddress" render={({ field }) => (
                    <FormItem><FormLabel>Employee Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="employeeId" render={({ field }) => (
                    <FormItem><FormLabel>Employee ID (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="jobTitle" render={({ field }) => (
                        <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="department" render={({ field }) => (
                        <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                 </div>
                 <FormField control={form.control} name="letterDate" render={({ field }) => (
                    <FormItem><FormLabel>Letter Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="warningType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warning Type</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full h-10 px-3 rounded-md border border-input bg-background">
                          <option value="first">First Warning</option>
                          <option value="second">Second Warning</option>
                          <option value="final">Final Warning</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                 <FormField control={form.control} name="issueDescription" render={({ field }) => (
                    <FormItem><FormLabel>Issue/Incident Description</FormLabel><FormControl><Textarea className="min-h-24" placeholder="Describe the misconduct or performance issue in detail..." {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="previousWarnings" render={({ field }) => (
                    <FormItem><FormLabel>Previous Warnings (if applicable)</FormLabel><FormControl><Textarea className="min-h-20" placeholder="Details of any previous warnings given..." {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="expectedImprovement" render={({ field }) => (
                    <FormItem><FormLabel>Expected Improvement</FormLabel><FormControl><Textarea className="min-h-24" placeholder="What improvement is expected and by when..." {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="consequences" render={({ field }) => (
                    <FormItem><FormLabel>Consequences of Non-Compliance</FormLabel><FormControl><Textarea className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="signerName" render={({ field }) => (
                        <FormItem><FormLabel>Signer's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="signerTitle" render={({ field }) => (
                        <FormItem><FormLabel>Signer's Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                 </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="sticky top-20">
            <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>The letter will update as you type.</CardDescription>
            </CardHeader>
            <CardContent ref={printRef} className="p-8 border-dashed border-2 rounded-lg prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-center">
                        <h4 className="font-bold">{formData.companyName || '[Company Name]'}</h4>
                        <p className="text-xs">{formData.companyAddress || '[Company Address]'}</p>
                    </div>

                    <div className="mt-8">
                        <p><strong>Date:</strong> {formData.letterDate ? new Date(formData.letterDate).toLocaleDateString('en-GB', dateOptions) : '[Date]'}</p>
                        <br/>
                        <p><strong>To,</strong></p>
                        <p><strong>{formData.employeeName || '[Employee Name]'}</strong></p>
                        <p>{formData.employeeAddress || '[Employee Address]'}</p>
                        {formData.employeeId && <p>Employee ID: {formData.employeeId}</p>}
                    </div>
                    
                    <div className="mt-8 text-justify">
                        <p><strong>Subject: {warningTypeLabels[formData.warningType]} - {formData.department || '[Department]'} Department</strong></p>
                        <br/>
                        <p>Dear {formData.employeeName || '[Employee Name]'},</p>
                        <p>This letter serves as a <strong>{warningTypeLabels[formData.warningType]}</strong> regarding the following matter:</p>
                        
                        <p className="mt-4"><strong>Issue Description:</strong></p>
                        <p>{formData.issueDescription || '[Issue Description]'}</p>

                        {formData.previousWarnings && (
                          <>
                            <p className="mt-4"><strong>Previous Warnings:</strong></p>
                            <p>{formData.previousWarnings}</p>
                          </>
                        )}

                        <p className="mt-4"><strong>Expected Improvement:</strong></p>
                        <p>{formData.expectedImprovement || '[Expected Improvement]'}</p>

                        <p className="mt-4"><strong>Consequences:</strong></p>
                        <p>{formData.consequences || '[Consequences]'}</p>

                        <p className="mt-4">We trust that you will take this warning seriously and take immediate corrective action. Your response to this letter is expected within 7 days.</p>

                        <p className="mt-4">A copy of this warning letter will be placed in your personnel file.</p>
                    </div>

                    <div className="mt-16">
                        <p>Yours sincerely,</p>
                        <p>For <strong>{formData.companyName || '[Company Name]'}</strong></p>
                        <div className="h-20"></div>
                        <p><strong>{formData.signerName || '[Signer Name]'}</strong></p>
                        <p>{formData.signerTitle || '[Signer Title]'}</p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-dashed">
                        <p className="text-sm">Employee Acknowledgment:</p>
                        <p className="mt-8">I acknowledge receipt of this warning letter and understand its contents.</p>
                        <p className="mt-12">______________________<br/>(Signature of Employee)</p>
                        <p>Date: ________________</p>
                    </div>
                </CardContent>
            <CardFooter>
                {(() => {
                  const basePrice = pricing?.agreements?.find(s => s.id === 'warning_letter')?.price || 0;
                  const effectivePrice = userSubscriptionInfo
                    ? getEffectiveServicePrice(basePrice, userSubscriptionInfo.userType, userSubscriptionInfo.subscriptionPlan, "agreements")
                    : basePrice;
                  return (
                      <OnDemandPayAndUseActions
                        userId={user?.uid || ''}
                        userEmail={user?.email || ''}
                        userName={user?.displayName || ''}
                        planId="affidavit_loss_of_docs_download"
                        planName="Warning Letter Download"
                        amount={effectivePrice}
                        fileName={`Affidavit_Loss_Of_Docs_${formData.employeeName}`}
                        contentRef={printRef}
                        documentType="affidavit_loss_of_docs"
                        documentName={`Affidavit_Loss_Of_Docs_${formData.employeeName}`}
                        metadata={{ source: "legal-documents" }}
                        showDocument={showDocument}
                        setShowDocument={setShowDocument}
                      />
                    );
                  })()}
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}

