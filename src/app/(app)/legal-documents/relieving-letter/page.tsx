
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
  jobTitle: z.string().min(2, "Job title is required."),
  department: z.string().min(2, "Department is required."),
  employeeId: z.string().optional(),
  joiningDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  lastWorkingDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  handoverStatus: z.string().default("All company property, documents, and access credentials have been duly handed over."),
  signerName: z.string().min(3, "Signer's name is required."),
  signerTitle: z.string().min(3, "Signer's title is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function RelievingLetterPage() {
  const printRef = useRef(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  useOnDemandUnlock("relieving_letter_download", () => setShowDocument(true));

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
      employeeName: "",
      employeeAddress: "",
      letterDate: "",
      jobTitle: "",
      department: "",
      employeeId: "",
      joiningDate: "",
      lastWorkingDate: "",
      handoverStatus: "All company property, documents, and access credentials have been duly handed over.",
      signerName: "",
      signerTitle: "",
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/category/agreements" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Agreements
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Relieving Letter Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Create a formal relieving letter confirming end of employment.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Enter Employee Details</CardTitle>
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
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="joiningDate" render={({ field }) => (
                        <FormItem><FormLabel>Date of Joining</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="lastWorkingDate" render={({ field }) => (
                        <FormItem><FormLabel>Last Working Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                 </div>
                 <FormField control={form.control} name="letterDate" render={({ field }) => (
                    <FormItem><FormLabel>Letter Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="handoverStatus" render={({ field }) => (
                    <FormItem><FormLabel>Handover Status</FormLabel><FormControl><Textarea className="min-h-20" placeholder="Status of company property handover..." {...field} /></FormControl><FormMessage /></FormItem>
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
                        <p><strong>Subject: Relieving Letter</strong></p>
                        <br/>
                        <p>Dear {formData.employeeName || '[Employee Name]'},</p>
                        <p>This is to confirm that your employment with <strong>{formData.companyName || '[Company Name]'}</strong> has been terminated effective <strong>{formData.lastWorkingDate ? new Date(formData.lastWorkingDate).toLocaleDateString('en-GB', dateOptions) : '[Last Working Date]'}</strong>.</p>
                        
                        <p>You were employed with us as <strong>{formData.jobTitle || '[Job Title]'}</strong> in the <strong>{formData.department || '[Department]'}</strong> department from <strong>{formData.joiningDate ? new Date(formData.joiningDate).toLocaleDateString('en-GB', dateOptions) : '[Joining Date]'}</strong> to <strong>{formData.lastWorkingDate ? new Date(formData.lastWorkingDate).toLocaleDateString('en-GB', dateOptions) : '[Last Working Date]'}</strong>.</p>

                        <p>{formData.handoverStatus || '[Handover Status]'}</p>

                        <p className="mt-4">All outstanding dues, if any, have been settled as per company policy.</p>

                        <p className="mt-4">We wish you success in all your future endeavors.</p>
                    </div>

                    <div className="mt-16">
                        <p>Yours sincerely,</p>
                        <p>For <strong>{formData.companyName || '[Company Name]'}</strong></p>
                        <div className="h-20"></div>
                        <p><strong>{formData.signerName || '[Signer Name]'}</strong></p>
                        <p>{formData.signerTitle || '[Signer Title]'}</p>
                    </div>
                </CardContent>
            <CardFooter>
                {(() => {
                  const basePrice = pricing?.agreements?.find(s => s.id === 'relieving_letter')?.price || 0;
                  const effectivePrice = userSubscriptionInfo
                    ? getEffectiveServicePrice(basePrice, userSubscriptionInfo.userType, userSubscriptionInfo.subscriptionPlan, "agreements")
                    : basePrice;
                  return (
                      <OnDemandPayAndUseActions
                        userId={user?.uid || ''}
                        userEmail={user?.email || ''}
                        userName={user?.displayName || ''}
                        planId="relieving_letter_download"
                        planName="Relieving Letter Download"
                        amount={effectivePrice}
                        fileName={`Relieving_Letter_${formData.employeeName}`}
                        contentRef={printRef}
                        documentType="relieving_letter"
                        documentName={`Relieving_Letter_${formData.employeeName}`}
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

