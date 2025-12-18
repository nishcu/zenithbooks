
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, Printer, FileSignature, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ShareButtons } from "@/components/documents/share-buttons";
import { CashfreeCheckout } from "@\/components\/payment\/cashfree-checkout";
import { getServicePricing, onPricingUpdate } from "@/lib/pricing-service";
import { useCertificationRequest } from "@/hooks/use-certification-request";
import { useOnDemandUnlock } from "@/hooks/use-on-demand-unlock";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  companyAddress: z.string().min(10, "Company address is required."),
  candidateName: z.string().min(3, "Candidate's name is required."),
  candidateAddress: z.string().min(10, "Candidate's address is required."),
  offerDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  jobTitle: z.string().min(2, "Job title is required."),
  reportingManager: z.string().min(3, "Reporting manager's name is required."),
  joiningDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  annualCtc: z.coerce.number().positive("CTC must be a positive number."),
  acceptanceDeadline: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  signerName: z.string().min(3, "Signer's name is required."),
  signerTitle: z.string().min(3, "Signer's title is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function OfferLetterPage() {
  const { toast } = useToast();
  const printRef = useRef(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  useOnDemandUnlock("offer_letter_download", () => setShowDocument(true));

  const { handleCertificationRequest, handlePaymentSuccess, isSubmitting: isCertifying } = useCertificationRequest({
    pricing,
    serviceId: 'offer_letter'
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
      companyName: "ZenithBooks Solutions Pvt. Ltd.",
      companyAddress: "123 Business Avenue, Commerce City, Maharashtra - 400001",
      offerDate: "",
      acceptanceDeadline: "",
    },
  });

  useEffect(() => {
    form.reset({
      ...form.getValues(),
      offerDate: new Date().toISOString().split("T")[0],
      acceptanceDeadline: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split("T")[0],
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

  const formData = form.watch();

  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const whatsappMessage = `Hi ${formData.candidateName}, please find the attached your offer letter from ${formData.companyName}.`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Selection
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Offer Letter Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Create and print a professional job offer letter for a prospective employee.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Enter Offer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                 <FormField control={form.control} name="candidateName" render={({ field }) => (
                    <FormItem><FormLabel>Candidate Name</FormLabel><FormControl><Input placeholder="e.g., Rohan Sharma" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="candidateAddress" render={({ field }) => (
                    <FormItem><FormLabel>Candidate Address</FormLabel><FormControl><Input placeholder="e.g., Mumbai, India" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="jobTitle" render={({ field }) => (
                    <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={form.control} name="annualCtc" render={({ field }) => (
                    <FormItem><FormLabel>Annual CTC (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="joiningDate" render={({ field }) => (
                        <FormItem><FormLabel>Proposed Joining Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="reportingManager" render={({ field }) => (
                        <FormItem><FormLabel>Reporting To</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                 </div>
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
                <CardDescription>The receipt will update as you type.</CardDescription>
            </CardHeader>
            <CardContent ref={printRef} className="p-8 border-dashed border-2 rounded-lg prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-center">
                        <h4 className="font-bold">{formData.companyName || '[Company Name]'}</h4>
                        <p className="text-xs">{formData.companyAddress || '[Company Address]'}</p>
                    </div>

                    <div className="mt-8">
                        <p><strong>Date:</strong> {formData.offerDate ? new Date(formData.offerDate).toLocaleDateString('en-GB', dateOptions) : '[Date]'}</p>
                        <br/>
                        <p><strong>To,</strong></p>
                        <p><strong>{formData.candidateName || '[Candidate Name]'}</strong></p>
                        <p>{formData.candidateAddress || '[Candidate Address]'}</p>
                    </div>
                    
                    <div className="mt-8 text-justify">
                        <p><strong>Subject: Offer of Employment for the position of {formData.jobTitle || '[Job Title]'}</strong></p>
                        <br/>
                        <p>Dear {formData.candidateName || '[Candidate Name]'},</p>
                        <p>Further to your application and the subsequent interviews, we are pleased to offer you the position of <strong>{formData.jobTitle || '[Job Title]'}</strong> at {formData.companyName || '[Company Name]'}.</p>
                        
                        <p>Your annual Cost to Company (CTC) will be <strong>₹{formData.annualCtc.toLocaleString('en-IN') || '0'}</strong>. A detailed compensation structure will be provided in your appointment letter.</p>

                        <p>Your employment will be based at our office in {formData.companyAddress.split(',').slice(-2).join(', ').trim() || '[Location]'}. You will be reporting to <strong>{formData.reportingManager || '[Reporting Manager]'}</strong>.</p>
                        
                        <p>Your proposed date of joining is <strong>{formData.joiningDate ? new Date(formData.joiningDate).toLocaleDateString('en-GB', dateOptions) : '[Joining Date]'}</strong>.</p>
                        
                        <p>This offer is contingent upon the successful completion of your reference checks and the submission of necessary documents. This offer letter is valid until <strong>{formData.acceptanceDeadline ? new Date(formData.acceptanceDeadline).toLocaleDateString('en-GB', dateOptions) : '[Acceptance Date]'}</strong>. Please sign and return a copy of this letter to signify your acceptance.</p>

                        <p>We are excited about the prospect of you joining our team and look forward to a successful association.</p>
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
                  const basePrice = pricing?.hr_documents?.find(s => s.id === 'offer_letter')?.price || 0;
                  const effectivePrice = userSubscriptionInfo
                    ? getEffectiveServicePrice(
                        basePrice,
                        userSubscriptionInfo.userType,
                        userSubscriptionInfo.subscriptionPlan,
                        "hr_documents"
                      )
                    : basePrice;
                  return (
                      <OnDemandPayAndUseActions
                        userId={user?.uid || ''}
                        userEmail={user?.email || ''}
                        userName={user?.displayName || ''}
                        planId="offer_letter_download"
                        planName="Offer Letter Download"
                        amount={effectivePrice}
                        fileName={`Offer_Letter_${formData.candidateName}`}
                        contentRef={printRef}
                        documentType="offer_letter"
                        documentName={`Offer_Letter_${formData.candidateName}`}
                        metadata={{ source: "legal-documents" }}
                        showDocument={showDocument}
                        setShowDocument={setShowDocument}
                      />
                    );
                  })()}
            </CardFooter>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Professional Certification Service</CardTitle>
            <CardDescription>Get your Offer Letter professionally reviewed and certified by a qualified HR/legal expert.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our HR and legal experts will review your offer letter for compliance with labor laws, ensure all necessary clauses are included (compensation, benefits, terms & conditions, etc.), and provide certification for legal validity.
            </p>
          </CardContent>
          <CardFooter>
            {pricing && pricing.hr_documents?.find(s => s.id === 'offer_letter')?.price > 0 ? (
              <CashfreeCheckout
                amount={pricing.hr_documents.find(s => s.id === 'offer_letter')?.price || 0}
                planId="offer_letter_certification"
                planName="Offer Letter Professional Certification"
                userId={user?.uid || ''}
                userEmail={user?.email || ''}
                userName={user?.displayName || ''}
                onSuccess={(paymentId) => {
                  handlePaymentSuccess(paymentId, {
                    reportType: "Offer Letter Certification",
                    clientName: form.getValues("companyName"),
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
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
