
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, FileDown, Printer, Loader2, FileSignature } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useReactToPrint } from "react-to-print";
import { cn } from "@/lib/utils";
import { ShareButtons } from "@/components/documents/share-buttons";
import { CashfreeCheckout } from "@\/components\/payment\/cashfree-checkout";
import { OnDemandPayAndUseActions } from "@/components/payment/on-demand-pay-and-use-actions";
import { getServicePricing, onPricingUpdate } from "@/lib/pricing-service";
import { useCertificationRequest } from "@/hooks/use-certification-request";
import { useOnDemandUnlock } from "@/hooks/use-on-demand-unlock";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";

const formSchema = z.object({
  employerName: z.string().min(3, "Employer name is required."),
  employerAddress: z.string().min(10, "Address is required."),
  
  employeeName: z.string().min(3, "Employee name is required."),
  employeeAddress: z.string().min(10, "Address is required."),

  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  
  businessDescription: z.string().min(10, "Business description is required."),
  jobTitle: z.string().min(2, "Job title is required."),
  geographicScope: z.string().min(3, "Geographic scope is required.").default("Within 50 kilometers of the Employer's place of business"),
  
  restrictionYears: z.coerce.number().positive("Restriction period must be a positive number.").default(1),
  
  jurisdictionCity: z.string().min(2, "Jurisdiction city is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function NonCompeteAgreementPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  useOnDemandUnlock("non_solicitation_agreement_download", () => setShowDocument(true));

  const { handleCertificationRequest, handlePaymentSuccess, isSubmitting: isCertifying } = useCertificationRequest({
    pricing,
    serviceId: 'non_solicitation_agreement'
  });

  // Fetch user subscription info
  useEffect(() => {
    if (user) {
      getUserSubscriptionInfo(user.uid).then(setUserSubscriptionInfo);
    }
  }, [user]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employerName: "",
      employerAddress: "",
      employeeName: "",
      employeeAddress: "",
      agreementDate: "",
      businessDescription: "Provision of [business services/products] in the [industry] sector",
      jobTitle: "",
      geographicScope: "Within 50 kilometers of the Employer's place of business",
      restrictionYears: 1,
      jurisdictionCity: "Mumbai",
    },
  });

  useEffect(() => {
    form.reset({
      ...form.getValues(),
      agreementDate: new Date().toISOString().split("T")[0],
    });
  }, [form]);

  // Load pricing data with real-time updates
  useEffect(() => {
    getServicePricing().then(pricingData => {
      setPricing(pricingData);
    }).catch(error => {
      console.error('Error loading pricing:', error);
    });

    // Subscribe to real-time pricing updates
    const unsubscribe = onPricingUpdate(pricingData => {
      setPricing(pricingData);
    });

    return () => unsubscribe();
  }, []);

  const processStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    switch (step) {
      case 1:
        fieldsToValidate = ["employerName", "employerAddress", "employeeName", "employeeAddress", "agreementDate"];
        break;
      case 2:
        fieldsToValidate = ["businessDescription", "restrictionYears", "jurisdictionCity"];
        break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
      if (step < 3) {
        toast({ title: `Step ${step} Saved`, description: `Proceeding to the next step.` });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please correct the errors before proceeding.",
      });
    }
  };

  const handleBack = () => setStep(prev => prev - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader><CardTitle>Step 1: Parties & Date</CardTitle><CardDescription>Enter details about the Employer and Employee.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Employer</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="employerName" render={({ field }) => ( <FormItem><FormLabel>Name (Individual or Company)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="employerAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Employee</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="employeeName" render={({ field }) => ( <FormItem><FormLabel>Name (Individual or Company)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="employeeAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                <Separator />
                <FormField control={form.control} name="agreementDate" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Effective Date of Agreement</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-end"><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Terms of Agreement</CardTitle><CardDescription>Define the business description, restrictions, and legal terms.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="businessDescription" render={({ field }) => ( <FormItem><FormLabel>Business Description</FormLabel><FormControl><Textarea className="min-h-24" placeholder="Describe the employer's business activities..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="jobTitle" render={({ field }) => ( <FormItem><FormLabel>Job Title/Position</FormLabel><FormControl><Input placeholder="e.g., Software Engineer" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="geographicScope" render={({ field }) => ( <FormItem><FormLabel>Geographic Scope</FormLabel><FormControl><Textarea className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="restrictionYears" render={({ field }) => ( <FormItem><FormLabel>Restriction Period (Years)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="jurisdictionCity" render={({ field }) => ( <FormItem><FormLabel>Jurisdiction City</FormLabel><FormControl><Input placeholder="e.g., Mumbai" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const agreementDate = formData.agreementDate ? new Date(formData.agreementDate).toLocaleDateString('en-GB', dateOptions) : '[Date]';


        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Non-Solicitation Agreement.</CardDescription></CardHeader>
                <CardContent>
                  <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <h2 className="text-center font-bold">NON-SOLICITATION AGREEMENT</h2>
                    
                    <p>This Non-Solicitation Agreement (the "Agreement") is entered into as of <strong>{agreementDate}</strong> (the "Effective Date"),</p>
                    
                    <p className="font-bold">BY AND BETWEEN:</p>
                    <p><strong>{formData.employerName}</strong>, with its principal place of business at {formData.employerAddress} (hereinafter referred to as the "Employer"),</p>
                    
                    <p className="font-bold">AND</p>
                    <p><strong>{formData.employeeName}</strong>, residing at {formData.employeeAddress} (hereinafter referred to as the "Employee").</p>

                    <h4 className="font-bold mt-4">1. Non-Solicitation Restriction</h4>
                    <p>During the term of employment and for a period of <strong>{formData.restrictionYears} year(s)</strong> following the termination of employment (the "Restricted Period"), the Employee agrees not to directly or indirectly engage in, own, manage, operate, control, or participate in any business that solicits with the Employer's business as described: {formData.businessDescription}.</p>
                    
                    <h4 className="font-bold mt-4">2. Geographic Scope</h4>
                    <p>The restrictions set forth herein shall apply within the following geographic area: {formData.geographicScope}.</p>

                    <h4 className="font-bold mt-4">3. Prohibited Solicitation Activities</h4>
                    <p>During the Restricted Period, the Employee shall not: (a) directly or indirectly solicit, induce, or attempt to solicit or induce any client, customer, vendor, or business partner of the Employer to terminate, reduce, or alter their relationship with the Employer; (b) directly or indirectly solicit, recruit, hire, or attempt to hire any employee, contractor, or consultant of the Employer, or encourage any such person to leave their employment or engagement with the Employer; or (c) use or disclose any confidential information of the Employer for the purpose of solicitation.</p>
                    
                    <h4 className="font-bold mt-4">4. Consideration</h4>
                    <p>The Employee acknowledges that the restrictions contained in this Agreement are reasonable and necessary for the protection of the Employer's legitimate business interests, and that the Employee's employment with the Employer provides adequate consideration for these restrictions.</p>

                    <h4 className="font-bold mt-4">5. Severability</h4>
                    <p>If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect, and such invalid or unenforceable provision shall be modified to the minimum extent necessary to make it valid and enforceable.</p>

                    <h4 className="font-bold mt-4">6. Governing Law and Jurisdiction</h4>
                    <p>This Agreement shall be governed by and construed in accordance with the laws of India. Any legal action or proceeding arising under this Agreement will be brought exclusively in the courts located in <strong>{formData.jurisdictionCity}</strong>, India.</p>

                    <p className="mt-8">IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.</p>
                    
                    <div className="grid grid-cols-2 gap-16 mt-16">
                        <div className="text-left">
                            <p className="font-bold">EMPLOYER:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.employerName}</p>
                            <p>Title: Authorized Signatory</p>
                        </div>
                        <div className="text-left">
                            <p className="font-bold">EMPLOYEE:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.employeeName}</p>
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  {(() => {
                    const basePrice = pricing?.agreements?.find(s => s.id === 'non_solicitation_agreement')?.price || 0;
                    const effectivePrice = userSubscriptionInfo
                      ? getEffectiveServicePrice(
                          basePrice,
                          userSubscriptionInfo.userType,
                          userSubscriptionInfo.subscriptionPlan,
                          "agreements"
                        )
                      : basePrice;
                    return (
                      <OnDemandPayAndUseActions
                        userId={user?.uid || ''}
                        userEmail={user?.email || ''}
                        userName={user?.displayName || ''}
                        planId="non_solicitation_agreement_download"
                        planName="Non-Solicitation Agreement Download"
                        amount={effectivePrice}
                        fileName={`Non-Solicitation Agreement_${formData.employerName}_${formData.employeeName}`}
                        contentRef={printRef}
                        documentType="non_solicitation_agreement"
                        documentName={`Non-Solicitation Agreement_${formData.employerName}_${formData.employeeName}`}
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
        <h1 className="text-3xl font-bold">Non-Solicitation Agreement Generator</h1>
        <p className="text-muted-foreground">Follow the steps to create a non-solicitation agreement restricting employees from competing during and after employment.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>

      {step === 3 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Professional Certification Service</CardTitle>
            <CardDescription>Get your Non-Solicitation Agreement professionally reviewed and certified by a qualified legal expert.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our legal experts will review your non-disclosure agreement for legal compliance, ensure all necessary clauses are included, and provide certification for legal validity.
            </p>
          </CardContent>
          <CardFooter>
            {(() => {
              const basePrice = pricing?.agreements?.find(s => s.id === 'non_solicitation_agreement')?.price || 0;
              const effectivePrice = userSubscriptionInfo
                ? getEffectiveServicePrice(
                    basePrice,
                    userSubscriptionInfo.userType,
                    userSubscriptionInfo.subscriptionPlan,
                    "agreements"
                  )
                : basePrice;
              return effectivePrice > 0 ? (
              <CashfreeCheckout
                amount={effectivePrice}
                planId="non_solicitation_agreement_certification"
                planName="Non-Solicitation Agreement Professional Certification"
                userId={user?.uid || ''}
                userEmail={user?.email || ''}
                userName={user?.displayName || ''}
                onSuccess={(paymentId) => {
                  handlePaymentSuccess(paymentId, {
                    reportType: "Non-Solicitation Agreement Certification",
                    clientName: form.getValues("employerName"),
                    formData: form.getValues(),
                  });
                }}
                onFailure={() => {
                  toast({
                    variant: "destructive",
                    title: "Payment Failed",
                    description: "Payment was not completed. Please try again."
                  });
                }}
              />
            ) : (
              <Button type="button" onClick={handleCertificationRequest} disabled={isCertifying}>
                {isCertifying ? <Loader2 className="mr-2 animate-spin"/> : <FileSignature className="mr-2"/>}
                Request Professional Certification
              </Button>
            );
            })()}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
