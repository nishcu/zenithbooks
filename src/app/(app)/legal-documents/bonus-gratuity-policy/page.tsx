
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
  policyDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  effectiveDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  eligibilityCriteria: z.string().min(20, "Eligibility criteria is required."),
  workingHours: z.string().default("Standard working hours as per employment agreement"),
  attendanceTracking: z.string().default("Employees must log in to company systems and maintain regular communication with supervisors"),
  communicationRequirements: z.string().default("Employees must be available during core business hours and respond to communications within 2 hours"),
  equipmentAndInfrastructure: z.string().default("Company will provide necessary equipment; employee must maintain secure internet connection"),
  dataSecurity: z.string().default("Employees must follow all company data security protocols and use approved software/tools"),
  performanceExpectations: z.string().default("Performance standards remain the same as in-office work"),
  expenseReimbursement: z.string().optional(),
  policyReview: z.string().default("This policy will be reviewed annually and may be modified at company's discretion"),
  signerName: z.string().min(3, "Signer's name is required."),
  signerTitle: z.string().min(3, "Signer's title is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function BonusGratuityPolicyPage() {
  const printRef = useRef(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  useOnDemandUnlock("bonus_gratuity_policy_download", () => setShowDocument(true));

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
      policyDate: "",
      effectiveDate: "",
      eligibilityCriteria: "",
      workingHours: "Standard working hours as per employment agreement",
      attendanceTracking: "Employees must log in to company systems and maintain regular communication with supervisors",
      communicationRequirements: "Employees must be available during core business hours and respond to communications within 2 hours",
      equipmentAndInfrastructure: "Company will provide necessary equipment; employee must maintain secure internet connection",
      dataSecurity: "Employees must follow all company data security protocols and use approved software/tools",
      performanceExpectations: "Performance standards remain the same as in-office work",
      expenseReimbursement: "",
      policyReview: "This policy will be reviewed annually and may be modified at company's discretion",
      signerName: "",
      signerTitle: "",
    ,
  });

  useEffect(() => {
    const today = new Date();
    form.reset({
      ...form.getValues(),
      policyDate: today.toISOString().split("T")[0],
      effectiveDate: today.toISOString().split("T")[0],
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
      <Link href="/legal-documents/category/hr-policies" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to HR Policies
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Bonus & Gratuity Policy Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Policy for bonus and gratuity payments. for your organization.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Enter Policy Details</CardTitle>
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
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="policyDate" render={({ field }) => (
                        <FormItem><FormLabel>Policy Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="effectiveDate" render={({ field }) => (
                        <FormItem><FormLabel>Effective Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                 </div>
                 <FormField control={form.control} name="eligibilityCriteria" render={({ field }) => (
                    <FormItem><FormLabel>Eligibility Criteria</FormLabel><FormControl><Textarea className="min-h-20" placeholder="Criteria for employees eligible for remote work..." {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="workingHours" render={({ field }) => (
                    <FormItem><FormLabel>Working Hours</FormLabel><FormControl><Textarea className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="attendanceTracking" render={({ field }) => (
                    <FormItem><FormLabel>Attendance & Time Tracking</FormLabel><FormControl><Textarea className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="communicationRequirements" render={({ field }) => (
                    <FormItem><FormLabel>Communication Requirements</FormLabel><FormControl><Textarea className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="equipmentAndInfrastructure" render={({ field }) => (
                    <FormItem><FormLabel>Equipment & Infrastructure</FormLabel><FormControl><Textarea className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="dataSecurity" render={({ field }) => (
                    <FormItem><FormLabel>Data Security Requirements</FormLabel><FormControl><Textarea className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="performanceExpectations" render={({ field }) => (
                    <FormItem><FormLabel>Performance Expectations</FormLabel><FormControl><Textarea className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="expenseReimbursement" render={({ field }) => (
                    <FormItem><FormLabel>Expense Reimbursement (Optional)</FormLabel><FormControl><Textarea className="min-h-20" placeholder="Policy on reimbursement of internet, electricity, etc." {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="policyReview" render={({ field }) => (
                    <FormItem><FormLabel>Policy Review & Amendments</FormLabel><FormControl><Textarea className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
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
                <CardDescription>The policy will update as you type.</CardDescription>
            </CardHeader>
            <CardContent ref={printRef} className="p-8 border-dashed border-2 rounded-lg prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-center">
                        <h4 className="font-bold">{formData.companyName || '[Company Name]'}</h4>
                        <p className="text-xs">{formData.companyAddress || '[Company Address]'}</p>
                    </div>

                    <div className="mt-8 text-center">
                        <h3 className="font-bold text-lg">REMOTE WORK POLICY</h3>
                        <p className="text-sm mt-2">Policy Date: {formData.policyDate ? new Date(formData.policyDate).toLocaleDateString('en-GB', dateOptions) : '[Date]'}</p>
                        <p className="text-sm">Effective Date: {formData.effectiveDate ? new Date(formData.effectiveDate).toLocaleDateString('en-GB', dateOptions) : '[Date]'}</p>
                    </div>
                    
                    <div className="mt-8 text-justify">
                        <p className="font-bold">1. PURPOSE</p>
                        <p>This Remote Work Policy establishes guidelines and procedures for employees who work remotely from locations other than the company's office premises.</p>

                        <p className="font-bold mt-4">2. ELIGIBILITY</p>
                        <p>{formData.eligibilityCriteria || '[Eligibility Criteria]'}</p>

                        <p className="font-bold mt-4">3. WORKING HOURS</p>
                        <p>{formData.workingHours || '[Working Hours]'}</p>

                        <p className="font-bold mt-4">4. ATTENDANCE & TIME TRACKING</p>
                        <p>{formData.attendanceTracking || '[Attendance Tracking]'}</p>

                        <p className="font-bold mt-4">5. COMMUNICATION REQUIREMENTS</p>
                        <p>{formData.communicationRequirements || '[Communication Requirements]'}</p>

                        <p className="font-bold mt-4">6. EQUIPMENT & INFRASTRUCTURE</p>
                        <p>{formData.equipmentAndInfrastructure || '[Equipment & Infrastructure]'}</p>

                        <p className="font-bold mt-4">7. DATA SECURITY</p>
                        <p>{formData.dataSecurity || '[Data Security Requirements]'}</p>

                        <p className="font-bold mt-4">8. PERFORMANCE EXPECTATIONS</p>
                        <p>{formData.performanceExpectations || '[Performance Expectations]'}</p>

                        {formData.expenseReimbursement && (
                          <>
                            <p className="font-bold mt-4">9. EXPENSE REIMBURSEMENT</p>
                            <p>{formData.expenseReimbursement}</p>
                          </>
                        )}

                        <p className="font-bold mt-4">{formData.expenseReimbursement ? '10' : '9'}. POLICY REVIEW & AMENDMENTS</p>
                        <p>{formData.policyReview || '[Policy Review]'}</p>

                        <p className="mt-8">This policy is effective as of the date specified above and applies to all employees engaged in remote work arrangements.</p>
                    </div>

                    <div className="mt-16">
                        <p>For <strong>{formData.companyName || '[Company Name]'}</strong></p>
                        <div className="h-20"></div>
                        <p><strong>{formData.signerName || '[Signer Name]'}</strong></p>
                        <p>{formData.signerTitle || '[Signer Title]'}</p>
                    </div>
                </CardContent>
            <CardFooter>
                {(() => {
                  const basePrice = pricing?.agreements?.find(s => s.id === 'remote_work_policy')?.price || 0;
                  const effectivePrice = userSubscriptionInfo
                    ? getEffectiveServicePrice(basePrice, userSubscriptionInfo.userType, userSubscriptionInfo.subscriptionPlan, "agreements")
                    : basePrice;
                  return (
                      <OnDemandPayAndUseActions
                        userId={user?.uid || ''}
                        userEmail={user?.email || ''}
                        userName={user?.displayName || ''}
                        planId="bonus_gratuity_policy_download"
                        planName="Remote Work Policy Download"
                        amount={effectivePrice}
                        fileName={`Bonus_Gratuity_Policy_${formData.companyName}`}
                        contentRef={printRef}
                        documentType="bonus_gratuity_policy"
                        documentName={`Bonus_Gratuity_Policy_${formData.companyName}`}
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

