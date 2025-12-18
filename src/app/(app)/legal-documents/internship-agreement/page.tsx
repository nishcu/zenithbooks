
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
import { ArrowLeft, ArrowRight, FileDown, Printer, FileSignature, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useReactToPrint } from "react-to-print";
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
  internName: z.string().min(3, "Intern's name is required."),
  internAddress: z.string().min(10, "Intern's address is required."),
  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  internshipTitle: z.string().min(2, "Internship title is required.").default("Software Development Intern"),
  department: z.string().min(2, "Department is required.").default("Technology"),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  stipend: z.coerce.number().min(0, "Stipend cannot be negative.").default(10000),
  learningObjectives: z.string().default("To assist the development team in building and testing new features.\nTo learn about the software development lifecycle in a professional environment.\nTo contribute to team projects and code reviews."),
  confidentiality: z.string().default("The Intern agrees to keep all proprietary information, trade secrets, and business information of the Company confidential during and after the internship period."),
  signerName: z.string().min(3, "Signer's name is required."),
  signerTitle: z.string().min(3, "Signer's title is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function InternshipAgreementPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  useOnDemandUnlock("internship_agreement_download", () => setShowDocument(true));

  const { handleCertificationRequest, handlePaymentSuccess, isSubmitting: isCertifying } = useCertificationRequest({
    pricing,
    serviceId: 'internship_agreement'
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
      companyName: "GSTEase Solutions Pvt. Ltd.",
      companyAddress: "123 Business Avenue, Commerce City, Maharashtra - 400001",
      agreementDate: new Date().toISOString().split("T")[0],
      internshipTitle: "Software Development Intern",
      department: "Technology",
      stipend: 10000,
      learningObjectives: "To assist the development team in building and testing new features.\nTo learn about the software development lifecycle in a professional environment.\nTo contribute to team projects and code reviews.",
      confidentiality: "The Intern agrees to keep all proprietary information, trade secrets, and business information of the Company confidential during and after the internship period.",
      signerName: "",
      signerTitle: "",
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
        fieldsToValidate = ["companyName", "companyAddress", "internName", "internAddress", "agreementDate", "startDate", "endDate"];
        break;
      case 2:
        fieldsToValidate = ["internshipTitle", "department", "stipend", "learningObjectives", "confidentiality", "signerName", "signerTitle"];
        break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
      if (step < 3) {
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
            <CardHeader><CardTitle>Step 1: Parties & Dates</CardTitle><CardDescription>Enter details about the company, intern, and key dates.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <FormField control={form.control} name="internName" render={({ field }) => ( <FormItem><FormLabel>Intern's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="internAddress" render={({ field }) => ( <FormItem><FormLabel>Intern's Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <div className="grid md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="agreementDate" render={({ field }) => ( <FormItem><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem><FormLabel>Internship Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem><FormLabel>Internship End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-end"><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Internship Terms</CardTitle><CardDescription>Define the specifics of the internship role and compensation.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="internshipTitle" render={({ field }) => ( <FormItem><FormLabel>Internship Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="department" render={({ field }) => ( <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <FormField control={form.control} name="stipend" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Monthly Stipend (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="learningObjectives" render={({ field }) => ( <FormItem><FormLabel>Learning Objectives & Responsibilities</FormLabel><FormControl><Textarea className="min-h-32" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="confidentiality" render={({ field }) => ( <FormItem><FormLabel>Confidentiality Clause</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <Separator />
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="signerName" render={({ field }) => ( <FormItem><FormLabel>Signer's Name (e.g., HR Manager)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="signerTitle" render={({ field }) => ( <FormItem><FormLabel>Signer's Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
        const formData = form.getValues();

        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Internship Agreement.</CardDescription></CardHeader>
                <CardContent>
                  <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                    <h2 className="text-center font-bold">INTERNSHIP AGREEMENT</h2>
                    <p>This Internship Agreement is made on <strong>{formData.agreementDate ? new Date(formData.agreementDate).toLocaleDateString('en-GB', dateOptions) : '[Date]'}</strong>.</p>
                    <p><strong>BETWEEN:</strong></p>
                    <p><strong>{formData.companyName}</strong>, located at {formData.companyAddress} ("Company"),</p>
                    <p><strong>AND:</strong></p>
                    <p><strong>{formData.internName}</strong>, residing at {formData.internAddress} ("Intern").</p>
                    
                    <h4 className="font-bold mt-4">1. Position and Department</h4>
                    <p>The Company agrees to provide the Intern with an internship in the position of <strong>{formData.internshipTitle}</strong> in the <strong>{formData.department}</strong> department.</p>

                    <h4 className="font-bold mt-4">2. Duration</h4>
                    <p>The internship will commence on <strong>{formData.startDate ? new Date(formData.startDate).toLocaleDateString('en-GB', dateOptions) : '[Start Date]'}</strong> and will conclude on <strong>{formData.endDate ? new Date(formData.endDate).toLocaleDateString('en-GB', dateOptions) : '[End Date]'}</strong>.</p>
                    
                    <h4 className="font-bold mt-4">3. Learning Objectives and Responsibilities</h4>
                    <p>The primary purpose of this internship is educational. The Intern will be responsible for the following tasks and will gain experience in:<br/>{formData.learningObjectives.split('\n').map((line, i) => <span key={i}>- {line}<br/></span>)}</p>

                    <h4 className="font-bold mt-4">4. Stipend</h4>
                    <p>The Company will pay the Intern a monthly stipend of <strong>₹{formData.stipend.toLocaleString('en-IN')}</strong> to cover expenses.</p>

                    <h4 className="font-bold mt-4">5. Confidentiality</h4>
                    <p>{formData.confidentiality}</p>
                    
                    <h4 className="font-bold mt-4">6. No Employment Guarantee</h4>
                    <p>This Agreement does not constitute an offer of employment. Completion of the internship does not guarantee future employment with the Company.</p>

                    <p>IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.</p>

                    <div className="grid grid-cols-2 gap-16 mt-16">
                        <div className="text-left">
                            <p className="font-bold">For {formData.companyName}:</p>
                            <div className="h-20"></div>
                            <p>_________________________</p>
                            <p><strong>{formData.signerName || '[Signer Name]'}</strong></p>
                            <p>{formData.signerTitle || '[Signer Title]'}</p>
                        </div>
                        <div className="text-left">
                            <p className="font-bold">Intern:</p>
                             <div className="h-20"></div>
                            <p>_________________________</p>
                            <p><strong>{formData.internName}</strong></p>
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  {(() => {
                    const basePrice = pricing?.hr_documents?.find(s => s.id === 'internship_agreement')?.price || 0;
                    const effectivePrice = userSubscriptionInfo
                      ? getEffectiveServicePrice(
                          basePrice,
                          userSubscriptionInfo.userType,
                          userSubscriptionInfo.subscriptionPlan,
                          "hr_documents"
                        )
                      : basePrice;
                    const requiresPayment = effectivePrice > 0 && !showDocument;

                    if (requiresPayment) {
                      return (
                        <CashfreeCheckout
                          amount={effectivePrice}
                          planId="internship_agreement_download"
                          planName="Internship Agreement Download"
                          userId={user?.uid || ''}
                          userEmail={user?.email || ''}
                          userName={user?.displayName || ''}
                          onSuccess={(paymentId) => {
                            setShowDocument(true);
                            toast({
                              title: "Payment Successful",
                              description: "Your document is ready for download."
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
                      );
                    } else {
                      // Show download buttons (either free or already paid)
                      if (!showDocument && effectivePrice === 0) {
                        setShowDocument(true);
                      }
                      return showDocument ? (
                        <ShareButtons 
                          contentRef={printRef}
                          fileName={`Internship_Agreement_${formData.internName}`}
                        />
                      ) : null;
                    }
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
      <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Selection
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Internship Agreement Generator</h1>
        <p className="text-muted-foreground">Define the terms and conditions for an internship.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>

      {step === 2 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Professional Certification Service</CardTitle>
            <CardDescription>Get your Internship Agreement professionally reviewed and certified by a qualified legal expert.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our legal and HR experts will review your internship agreement for compliance with labor laws, ensure all necessary clauses are included (learning objectives, confidentiality, stipend details, etc.), and provide certification for legal validity.
            </p>
          </CardContent>
          <CardFooter>
            {pricing && pricing.hr_documents?.find(s => s.id === 'internship_agreement')?.price > 0 ? (
              <CashfreeCheckout
                amount={pricing.hr_documents.find(s => s.id === 'internship_agreement')?.price || 0}
                planId="internship_agreement_certification"
                planName="Internship Agreement Professional Certification"
                userId={user?.uid || ''}
                userEmail={user?.email || ''}
                userName={user?.displayName || ''}
                onSuccess={(paymentId) => {
                  handlePaymentSuccess(paymentId, {
                    reportType: "Internship Agreement Certification",
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
      )}
    </div>
  );
}
