
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
import { ArrowLeft, ArrowRight, FileDown, Printer, FileSignature, Loader2 } from "lucide-react";
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
  distributorName: z.string().min(3, "Distributor name is required."),
  distributorAddress: z.string().min(10, "Distributor's address is required."),
  
  supplierName: z.string().min(3, "Supplier name is required."),
  supplierAddress: z.string().min(10, "Supplier's address is required."),

  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  
  productsDescription: z.string().min(10, "A description of services is required."),
  
  paymentAmount: z.coerce.number().positive("Payment must be a positive number."),
  paymentTerms: z.string().min(3, "Payment terms are required (e.g., Net 30, upon completion)."),
  
  term: z.string().default("This Agreement will commence on the effective date and will remain in full force and effect until the completion of the Products, unless terminated earlier as provided in this Agreement."),
  confidentiality: z.string().default("Both parties agree to keep confidential all non-public information obtained from the other party."),
  
  jurisdictionCity: z.string().min(2, "Jurisdiction city is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function DistributorAgreementPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  useOnDemandUnlock("distributor_agreement_download", () => setShowDocument(true));

  const { handleCertificationRequest, handlePaymentSuccess, isSubmitting: isCertifying } = useCertificationRequest({
    pricing,
    serviceId: 'distributor_agreement'
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
      distributorName: "",
      distributorAddress: "",
      supplierName: "",
      supplierAddress: "",
      agreementDate: "",
      productsDescription: "",
      paymentAmount: 10000,
      paymentTerms: "On a monthly basis, upon receipt of invoice.",
      jurisdictionCity: "Delhi",
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
        fieldsToValidate = ["distributorName", "distributorAddress", "supplierName", "supplierAddress", "agreementDate"];
        break;
      case 2:
        fieldsToValidate = ["productsDescription", "paymentAmount", "paymentTerms"];
        break;
      case 3:
         fieldsToValidate = ["term", "confidentiality", "jurisdictionCity"];
        break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
      if (step < 4) {
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
            <CardHeader><CardTitle>Step 1: Parties & Date</CardTitle><CardDescription>Enter details about the Distributor and the Supplier.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Distributor Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="distributorName" render={({ field }) => ( <FormItem><FormLabel>Distributor Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="distributorAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Supplier Details</h3>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <FormField control={form.control} name="supplierName" render={({ field }) => ( <FormItem><FormLabel>Supplier Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="supplierAddress" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
            <CardHeader><CardTitle>Step 2: Products & Payment</CardTitle><CardDescription>Define the scope of services and the payment terms.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="productsDescription" render={({ field }) => ( <FormItem><FormLabel>Description of Products</FormLabel><FormControl><Textarea className="min-h-24" placeholder="e.g., Provision of monthly digital marketing services including SEO and social media management." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="paymentAmount" render={({ field }) => ( <FormItem><FormLabel>Total Payment / Fee (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="paymentTerms" render={({ field }) => ( <FormItem><FormLabel>Payment Terms</FormLabel><FormControl><Input placeholder="e.g., Net 30, upon completion" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader><CardTitle>Step 3: Legal Clauses</CardTitle><CardDescription>Define key legal terms for the engagement.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="term" render={({ field }) => ( <FormItem><FormLabel>Term and Termination</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="confidentiality" render={({ field }) => ( <FormItem><FormLabel>Confidentiality</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="jurisdictionCity" render={({ field }) => ( <FormItem className="max-w-sm"><FormLabel>Jurisdiction City</FormLabel><FormControl><Input placeholder="e.g., Delhi" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 4:
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const agreementDate = formData.agreementDate ? new Date(formData.agreementDate).toLocaleDateString('en-GB', dateOptions) : '[Date]';

        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Distributor Agreement.</CardDescription></CardHeader>
                <CardContent>
                  <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <h2 className="text-center font-bold">SERVICE AGREEMENT</h2>
                    
                    <p>This Distributor Agreement is made as of <strong>{agreementDate}</strong>,</p>
                    
                    <p className="font-bold">BY AND BETWEEN:</p>
                    <p><strong>{formData.distributorName}</strong>, with its principal office at {formData.distributorAddress} (the "Distributor"),</p>
                    
                    <p className="font-bold">AND</p>
                    <p><strong>{formData.supplierName}</strong>, with its principal office at {formData.supplierAddress} (the "Supplier").</p>

                    <h4 className="font-bold mt-4">1. Scope of Products</h4>
                    <p>The Distributor agrees to provide the following services to the Supplier: {formData.productsDescription}</p>

                    <h4 className="font-bold mt-4">2. Payment</h4>
                    <p>The Supplier agrees to pay the Distributor a total fee of ₹{formData.paymentAmount.toLocaleString('en-IN')} for the Products. Payment shall be made as follows: {formData.paymentTerms}.</p>
                    
                    <h4 className="font-bold mt-4">3. Term and Termination</h4>
                    <p>{formData.term}</p>

                    <h4 className="font-bold mt-4">4. Confidentiality</h4>
                    <p>{formData.confidentiality}</p>
                    
                    <h4 className="font-bold mt-4">5. Independent Contractor</h4>
                    <p>The Distributor is an independent contractor and not an employee of the Supplier.</p>
                    
                    <h4 className="font-bold mt-4">6. Governing Law</h4>
                    <p>This Agreement shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in {formData.jurisdictionCity}, India.</p>
                    
                    <p className="mt-8">IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first above written.</p>
                    
                    <div className="grid grid-cols-2 gap-16 mt-16">
                        <div className="text-left">
                            <p className="font-bold">SERVICE PROVIDER:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.distributorName}</p>
                        </div>
                        <div className="text-left">
                            <p className="font-bold">CLIENT:</p>
                            <p className="mt-12">_________________________</p>
                            <p>By: {formData.supplierName}</p>
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  {(() => {
                    const basePrice = pricing?.agreements?.find(s => s.id === 'distributor_agreement')?.price || 0;
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
                        planId="distributor_agreement_download"
                        planName="Distributor Agreement Download"
                        amount={effectivePrice}
                        fileName={`Service_Agreement_${formData.supplierName}`}
                        contentRef={printRef}
                        documentType="distributor_agreement"
                        documentName={`Service_Agreement_${formData.supplierName}`}
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
        <h1 className="text-3xl font-bold">Distributor Agreement Generator</h1>
        <p className="text-muted-foreground">Establish distribution terms and territories.</p>
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
            <CardDescription>Get your Distributor Agreement professionally reviewed and certified by a qualified legal expert.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our legal experts will review your service agreement for legal compliance, ensure all necessary clauses are included, and provide certification for legal validity.
            </p>
          </CardContent>
          <CardFooter>
            {pricing && pricing.agreements?.find(s => s.id === 'distributor_agreement')?.price > 0 ? (
              <CashfreeCheckout
                amount={pricing.agreements.find(s => s.id === 'distributor_agreement')?.price || 0}
                planId="distributor_agreement_certification"
                planName="Distributor Agreement Professional Certification"
                userId={user?.uid || ''}
                userEmail={user?.email || ''}
                userName={user?.displayName || ''}
                onSuccess={(paymentId) => {
                  handlePaymentSuccess(paymentId, {
                    reportType: "Distributor Agreement Certification",
                    supplierName: form.getValues("supplierName"),
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
      )}
    </div>
  );
}
