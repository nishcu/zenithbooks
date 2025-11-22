
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, FileDown, PlusCircle, Trash2, Save, Loader2, FileSignature } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import html2pdf from "html2pdf.js";
import { format } from "date-fns";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { ShareButtons } from "@/components/documents/share-buttons";
import { RazorpayCheckout } from "@/components/payment/razorpay-checkout";
import { getServicePricing } from "@/lib/pricing-service";
import { useCertificationRequest } from "@/hooks/use-certification-request";

const shareholderSchema = z.object({
  name: z.string().min(2, "Shareholder name is required."),
  shareCount: z.coerce.number().positive("Must be a positive number."),
  isFounder: z.boolean().default(false),
});

const formSchema = z.object({
  documentName: z.string().min(3, "A document name is required for saving."),
  companyName: z.string().min(3, "Company name is required."),
  agreementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  shareholders: z.array(shareholderSchema).min(2, "At least two shareholders are required."),
  quorumPercentage: z.coerce.number().min(1).max(100).default(51),
  dragAlongThreshold: z.coerce.number().min(51).max(100).default(75),
});

type FormData = z.infer<typeof formSchema>;

export default function ShareholdersAgreement() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');
  const [step, setStep] = useState(1);
  const documentRef = useRef<HTMLDivElement>(null);
  const [user, authLoading] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!docId);
  const [pricing, setPricing] = useState(null);

  const { handleCertificationRequest, handlePaymentSuccess, isSubmitting: isCertifying } = useCertificationRequest({
    pricing,
    serviceId: 'shareholders_agreement'
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentName: `Shareholders Agreement - ${format(new Date(), 'yyyy-MM-dd')}`,
      companyName: "Acme Innovations Pvt. Ltd.",
      agreementDate: new Date().toISOString().split("T")[0],
      shareholders: [
        { name: "Founder A", shareCount: 6000, isFounder: true },
        { name: "Investor B", shareCount: 4000, isFounder: false },
      ],
      quorumPercentage: 51,
      dragAlongThreshold: 75,
    },
  });

  useEffect(() => {
    if (docId && user) {
      const loadDocument = async () => {
        setIsLoading(true);
        const docRef = doc(db, 'userDocuments', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userId === user.uid) {
            form.reset(data.formData);
            toast({ title: "Draft Loaded", description: `Loaded saved draft: ${data.formData.documentName}` });
          } else {
            toast({ variant: 'destructive', title: "Unauthorized", description: "You don't have permission to access this document." });
            router.push('/legal-documents/shareholders-agreement');
          }
        } else {
          toast({ variant: 'destructive', title: "Not Found", description: "The requested document draft could not be found." });
          router.push('/legal-documents/shareholders-agreement');
        }
        setIsLoading(false);
      };
      loadDocument();
    }
  }, [docId, user, form, router, toast]);

  // Load pricing data
  useEffect(() => {
    getServicePricing().then(pricingData => {
      setPricing(pricingData);
    }).catch(error => {
      console.error('Error loading pricing:', error);
    });
  }, []);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "shareholders",
  });

  const handleSaveDraft = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error' });
      return;
    }
    setIsSubmitting(true);
    const formData = form.getValues();
    try {
      if (docId) {
        const docRef = doc(db, "userDocuments", docId);
        await updateDoc(docRef, { formData, updatedAt: new Date() });
        toast({ title: "Draft Updated", description: `Updated "${formData.documentName}".` });
      } else {
        const docRef = await addDoc(collection(db, 'userDocuments'), {
          userId: user.uid,
          documentType: 'shareholders-agreement',
          documentName: formData.documentName,
          status: 'Draft',
          formData,
          createdAt: new Date(),
        });
        toast({ title: "Draft Saved!", description: `Saved "${formData.documentName}".` });
        router.push(`/legal-documents/shareholders-agreement?id=${docRef.id}`);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the draft.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const processStep = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setStep((prev) => prev + 1);
      toast({ title: "Details Saved", description: "Proceeding to the next step." });
    }
  };

  const handleBack = () => setStep((prev) => prev - 1);

  const renderStep = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin size-8 text-primary"/></div>;
    }
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Company & Shareholders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="documentName" render={({ field }) => (<FormItem><FormLabel>Document Name (for your reference)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <Separator/>
              <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="agreementDate" render={({ field }) => ( <FormItem><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <div className="space-y-2">
                <Label>Shareholders</Label>
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                        <FormField control={form.control} name={`shareholders.${index}.name`} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`shareholders.${index}.shareCount`} render={({ field }) => ( <FormItem><FormLabel>No. of Shares</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name={`shareholders.${index}.isFounder`} render={({ field }) => ( <FormItem className="flex flex-row items-end space-x-2 space-y-0 pb-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Is a Founder?</FormLabel></FormItem> )}/>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="size-4 text-destructive"/></Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", shareCount: 0, isFounder: false })}><PlusCircle className="mr-2"/> Add Shareholder</Button>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>} Save Draft</Button>
              <Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button>
            </CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Governance & Transfer Clauses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="quorumPercentage" render={({ field }) => ( <FormItem><FormLabel>Quorum for Board Meetings (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="dragAlongThreshold" render={({ field }) => ( <FormItem><FormLabel>Drag-Along Threshold (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
              <Button type="button" onClick={processStep}>Preview Document <ArrowRight className="ml-2"/></Button>
            </CardFooter>
          </Card>
        );
      case 3:
        const formData = form.getValues();
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Preview & Download</CardTitle>
              <CardDescription>Review the generated Shareholders' Agreement summary.</CardDescription>
            </CardHeader>
            <CardContent ref={documentRef} className="prose prose-sm dark:prose-invert max-w-none border p-6 rounded-md" style={{ pageBreakInside: 'avoid' }}>
              <div style={{ pageBreakAfter: 'always' }}>
                <h4 className="font-bold text-center">SHAREHOLDERS' AGREEMENT SUMMARY</h4>
              <p><strong>Company:</strong> {formData.companyName}</p>
              <p><strong>Effective Date:</strong> {new Date(formData.agreementDate).toLocaleDateString()}</p>
              
              <h5 className="font-bold mt-4">Parties:</h5>
              <ul>{formData.shareholders.map(s => <li key={s.name}>{s.name} ({s.shareCount.toLocaleString()} shares)</li>)}</ul>
              
              <h5 className="font-bold mt-4">Key Governance Terms:</h5>
              <ul>
                <li><strong>Quorum:</strong> A quorum for any board meeting shall require the presence of shareholders holding at least {formData.quorumPercentage}% of the shares.</li>
                <li><strong>Right of First Refusal (ROFR):</strong> If a shareholder wishes to sell their shares, they must first offer them to the other shareholders on the same terms.</li>
                <li><strong>Drag-Along Right:</strong> If shareholders holding at least {formData.dragAlongThreshold}% of the shares agree to sell their shares to a third party, they can force the remaining minority shareholders to sell their shares on the same terms.</li>
                <li><strong>Tag-Along Right:</strong> If a majority shareholder sells their shares, minority shareholders have the right to join the transaction and sell their shares on the same terms.</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-8">Note: This is a high-level summary. The full SHA would include detailed clauses on share transfer restrictions, board composition, reserved matters, anti-dilution, and more.</p>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
              <Button type="button" onClick={async () => {
                try {
                  if (!documentRef.current) {
                    toast({ variant: "destructive", title: "Error", description: "Could not find document content." });
                    return;
                  }
                  toast({ title: "Generating PDF...", description: "Your document is being prepared." });
                  const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `Shareholders-Agreement-${formData.companyName.replace(/\s+/g, '-')}-${format(new Date(formData.agreementDate), "yyyy-MM-dd")}.pdf`,
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
                  };
                  await html2pdf().set(opt).from(documentRef.current).save();
                  toast({ title: "PDF Generated", description: "Your Shareholders' Agreement has been downloaded successfully." });
                } catch (error: any) {
                  toast({ variant: "destructive", title: "Generation Failed", description: error.message || "An error occurred while generating the PDF." });
                }
              }}><FileDown className="mr-2"/> Download Full Agreement</Button>
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
        <h1 className="text-3xl font-bold">Shareholders' Agreement (SHA) Generator</h1>
        <p className="text-muted-foreground">Define the rights, responsibilities, and protections for all shareholders.</p>
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
            <CardDescription>Get your Shareholders' Agreement professionally reviewed and certified by a qualified legal expert.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our legal experts will review your shareholders' agreement for legal compliance, ensure all necessary clauses are included (shareholder rights, decision-making, exit provisions, etc.), and provide certification for legal validity and enforceability.
            </p>
          </CardContent>
          <CardFooter>
            {pricing && pricing.legal_docs?.find(s => s.id === 'shareholders_agreement')?.price > 0 ? (
              <RazorpayCheckout
                amount={pricing.legal_docs.find(s => s.id === 'shareholders_agreement')?.price || 0}
                planId="shareholders_agreement_certification"
                planName="Shareholders' Agreement Professional Certification"
                userId={user?.uid || ''}
                userEmail={user?.email || ''}
                userName={user?.displayName || ''}
                onSuccess={(paymentId) => {
                  handlePaymentSuccess(paymentId, {
                    reportType: "Shareholders' Agreement Certification",
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
