
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, FileSignature, ArrowRight, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import { ShareButtons } from "@/components/documents/share-buttons";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  documentName: z.string().min(3, "A document name is required for saving."),
  remitterName: z.string().min(3, "Remitter's name is required."),
  remitterPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format."),
  remitteeName: z.string().min(3, "Remittee's name is required."),
  remitteeCountry: z.string().min(2, "Country is required."),
  remittanceAmount: z.coerce.number().positive("Amount must be positive."),
  remittanceCurrency: z.string().min(3, "Currency code is required (e.g., USD, EUR)."),
  remittanceDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  natureOfRemittance: z.string().min(5, "Nature of remittance is required."),
  taxability: z.string().min(10, "Taxability analysis is required."),
  dtaaClause: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ForeignRemittancePage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');

  const [step, setStep] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);
  const [user, authLoading] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!docId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentName: `Form 15CB - ${new Date().toISOString().split("T")[0]}`,
      remitterName: "",
      remitterPan: "",
      remitteeName: "",
      remitteeCountry: "",
      remittanceAmount: 10000,
      remittanceCurrency: "USD",
      remittanceDate: new Date().toISOString().split("T")[0],
      natureOfRemittance: "Technical Consultancy Services",
      taxability: "The remittance is in the nature of 'Fees for Technical Services' under Section 9(1)(vii) of the Income Tax Act, 1961 and is taxable in India.",
      dtaaClause: "As per Article 12 of the India-USA DTAA, the tax is to be withheld at the rate of 15%.",
    },
  });

  useEffect(() => {
    if(docId && user) {
        const loadDocument = async () => {
            setIsLoading(true);
            const docRef = doc(db, 'userDocuments', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if(data.userId === user.uid) {
                    form.reset(data.formData);
                    toast({title: "Draft Loaded", description: `Loaded saved draft: ${data.formData.documentName}`});
                } else {
                    toast({variant: 'destructive', title: "Unauthorized", description: "You don't have permission to access this document."});
                    router.push('/ca-certificates/foreign-remittance');
                }
            } else {
                 toast({variant: 'destructive', title: "Not Found", description: "The requested document draft could not be found."});
                 router.push('/ca-certificates/foreign-remittance');
            }
            setIsLoading(false);
        }
        loadDocument();
    }
  }, [docId, user, form, router, toast]);
  
  const handlePreview = async () => {
    const isValid = await form.trigger();
    if(isValid) {
        setStep(2);
        toast({ title: "Draft Ready", description: "Review the Form 15CB before proceeding." });
    } else {
        toast({ variant: "destructive", title: "Validation Error", description: "Please fill all required fields."});
    }
  }
  
  const handleSaveDraft = async () => {
      if (!user) {
          toast({variant: 'destructive', title: 'Authentication Error'});
          return;
      }
      setIsSubmitting(true);
      const formData = form.getValues();
      try {
          if (docId) {
              const docRef = doc(db, "userDocuments", docId);
              await updateDoc(docRef, { formData, updatedAt: new Date() });
              toast({title: "Draft Updated", description: `Updated "${formData.documentName}".`});
          } else {
              const docRef = await addDoc(collection(db, 'userDocuments'), {
                  userId: user.uid,
                  documentType: 'foreign-remittance-certificate',
                  documentName: formData.documentName,
                  status: 'Draft',
                  formData,
                  createdAt: new Date(),
              });
              toast({title: "Draft Saved!", description: `Saved "${formData.documentName}".`});
              router.push(`/ca-certificates/foreign-remittance?id=${docRef.id}`);
          }
      } catch (e) {
          console.error(e);
          toast({variant: 'destructive', title: 'Save Failed', description: 'Could not save the draft.'});
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleCertificationRequest = async () => {
      if (!user) {
          toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to make a request." });
          return;
      }
      setIsSubmitting(true);
      try {
        await addDoc(collection(db, "certificationRequests"), {
            reportType: "Form 15CB (Foreign Remittance)",
            clientName: form.getValues("remitterName"),
            requestedBy: user.displayName || user.email,
            userId: user.uid,
            requestDate: new Date(),
            status: "Pending",
            draftUrl: "#",
            signedDocumentUrl: null,
            formData: form.getValues(),
        });
        toast({
            title: "Request Sent",
            description: "Your Form 15CB certification request has been sent to the admin for review and signature."
        });
      } catch (error) {
          console.error("Error sending request:", error);
          toast({ variant: "destructive", title: "Request Failed", description: "Could not send the request. Please try again." });
      } finally {
          setIsSubmitting(false);
      }
  }

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin size-8 text-primary"/></div>;
    }
    if (step === 1) {
        return (
            <>
            <Card>
                <CardHeader>
                    <CardTitle>Remittance Details</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                     <FormField control={form.control} name="documentName" render={({ field }) => (<FormItem><FormLabel>Document Name (for your reference)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <Separator />
                     <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="remitterName" render={({ field }) => (<FormItem><FormLabel>Remitter's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="remitterPan" render={({ field }) => (<FormItem><FormLabel>Remitter's PAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="remitteeName" render={({ field }) => (<FormItem><FormLabel>Remittee's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="remitteeCountry" render={({ field }) => (<FormItem><FormLabel>Remittee's Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     </div>
                     <div className="grid md:grid-cols-3 gap-4">
                         <FormField control={form.control} name="remittanceAmount" render={({ field }) => (<FormItem><FormLabel>Amount of Remittance</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="remittanceCurrency" render={({ field }) => (<FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="remittanceDate" render={({ field }) => (<FormItem><FormLabel>Date of Remittance</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     </div>
                     <FormField control={form.control} name="natureOfRemittance" render={({ field }) => (<FormItem><FormLabel>Nature of Remittance</FormLabel><FormControl><Input placeholder="e.g., Software License Fee" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Taxability Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="taxability" render={({ field }) => (<FormItem><FormLabel>Taxability under Income Tax Act</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="dtaaClause" render={({ field }) => (<FormItem><FormLabel>Applicable DTAA Clause & Rate</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </CardContent>
                <CardFooter className="justify-between">
                    <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>} Save Draft</Button>
                    <Button type="button" onClick={handlePreview}>
                       <ArrowRight className="mr-2" /> Preview Form 15CB
                    </Button>
                </CardFooter>
            </Card>
            </>
        )
    }

    if (step === 2) {
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const whatsappMessage = `Dear ${formData.remitterName},\n\nPlease find attached the draft Form 15CB for your review.\n\nRemittance to: ${formData.remitteeName}\nAmount: ${formData.remittanceAmount} ${formData.remittanceCurrency}\n\nThank you,\nS. KRANTHI KUMAR & Co.`;

        return (
             <Card>
                <CardHeader>
                    <CardTitle>Final Preview</CardTitle>
                    <CardDescription>Review the generated Form 15CB. You can download, share, or send it for certification.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div ref={printRef} className="prose dark:prose-invert max-w-none border rounded-lg p-8 bg-card text-card-foreground">
                        <header className="text-center border-b-2 pb-4 mb-8" style={{ borderColor: 'hsl(var(--sidebar-background))' }}>
                            <h1 className="text-2xl font-bold m-0" style={{ color: 'hsl(var(--sidebar-background))' }}>S. KRANTHI KUMAR & Co.</h1>
                            <p className="text-sm m-0">Chartered Accountants</p>
                            <p className="text-xs m-0">H.No. 2-2-1130/2/A, G-1, Amberpet, Hyderabad-500013</p>
                       </header>
                       <h3 className="font-bold text-center">FORM NO. 15CB</h3>
                       <p className="text-center text-xs">[See rule 37BB of the Income-tax Rules, 1962]</p>

                        <div className="flex justify-between items-start mb-6">
                            <div><p className="font-bold text-sm">Certificate of an accountant</p></div>
                            <div className="text-right"><p className="font-semibold">UDIN: [UDIN GOES HERE]</p></div>
                        </div>

                        <p>I/We have examined the agreement between <strong>{formData.remitterName}</strong> ("the remitter") and <strong>{formData.remitteeName}</strong> ("the beneficiary") and I/we hereby certify the following:</p>

                        <table className="w-full my-4 text-sm">
                           <tbody>
                                <tr className="border-t"><td className="py-2 border-r pr-2">1. Name of the remitter</td><td className="py-2 pl-2">{formData.remitterName}</td></tr>
                                <tr className="border-t"><td className="py-2 border-r pr-2">2. Name of the beneficiary</td><td className="py-2 pl-2">{formData.remitteeName}</td></tr>
                                <tr className="border-t"><td className="py-2 border-r pr-2">3. Nature of remittance</td><td className="py-2 pl-2">{formData.natureOfRemittance}</td></tr>
                                <tr className="border-t"><td className="py-2 border-r pr-2">4. Amount of remittance in foreign currency</td><td className="py-2 pl-2">{formData.remittanceAmount} {formData.remittanceCurrency}</td></tr>
                                <tr className="border-t"><td className="py-2 border-r pr-2">5. Taxability under the provisions of the Income-tax Act</td><td className="py-2 pl-2">{formData.taxability}</td></tr>
                                <tr className="border-t border-b"><td className="py-2 border-r pr-2">6. If the remittance is taxable, the tax rate as per DTAA</td><td className="py-2 pl-2">{formData.dtaaClause}</td></tr>
                           </tbody>
                        </table>
                        
                        <h4 className="font-bold text-center underline my-6">CERTIFICATE</h4>
                        <p>I/We certify that the above particulars are true and correct to the best of my/our knowledge and belief. I/We have obtained all the necessary documents for the purpose of this certification.</p>
                        
                        <div className="mt-24 text-right">
                            <p className="font-bold">For S. KRANTHI KUMAR & Co.</p>
                            <p>Chartered Accountants</p>
                            <div className="h-20"></div>
                            <p>(S. Kranthi Kumar)</p><p>Proprietor</p><p>Membership No: 224983</p>
                            <p>Date: {new Date().toLocaleDateString('en-GB', dateOptions)}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between">
                     <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2"/> Back to Edit</Button>
                     <div className="flex gap-2">
                        <ShareButtons
                            contentRef={printRef}
                            fileName={`Form15CB_${formData.remitterName}`}
                            whatsappMessage={whatsappMessage}
                        />
                        <Button type="button" onClick={handleCertificationRequest} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <FileSignature className="mr-2"/>}
                            Request Certification
                        </Button>
                     </div>
                </CardFooter>
            </Card>
        )
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/ca-certificates" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Certificate Menu
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Form 15CB Preparation Utility</h1>
        <p className="text-muted-foreground">Generate a draft Form 15CB for remittances to a non-resident.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
            {renderContent()}
        </form>
      </Form>
    </div>
  );
}
