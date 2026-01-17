
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, FileSignature, ArrowRight, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { CA_FIRM } from "@/lib/ca-firm";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ShareButtons } from "@/components/documents/share-buttons";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { getServicePricing, onPricingUpdate } from "@/lib/pricing-service";
import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, getDoc, collection, addDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";

const formSchema = z.object({
  documentName: z.string().min(3, "A document name is required for saving."),
  applicantName: z.string().min(3, "Applicant name is required."),
  fatherOrSpouseName: z.string().optional(),
  applicantAddress: z.string().min(10, "Applicant address is required."),
  applicantPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format."),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/, "Invalid format. Use YYYY-YY."),
  incomeFromSalary: z.coerce.number().min(0, "Income cannot be negative.").default(0),
  incomeFromBusiness: z.coerce.number().min(0, "Income cannot be negative.").default(0),
  incomeFromOtherSources: z.coerce.number().min(0, "Income cannot be negative.").default(0),
  familyIncome: z.coerce.number().min(0, "Family income cannot be negative.").optional(),
});

type FormData = z.infer<typeof formSchema>;

const numberToWords = (num: number): string => {
    const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
    const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
    if (!num) return 'Zero';
    if ((num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (parseInt(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (parseInt(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (parseInt(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (parseInt(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (parseInt(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim().charAt(0).toUpperCase() + str.trim().slice(1) + " Only";
}

export default function IncomeCertificatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');

  const [step, setStep] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);
  const [user, authLoading] = useAuthState(auth);
  const [isLoading, setIsLoading] = useState(!!docId);
  const [pricing, setPricing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);

  useEffect(() => {
    if (user) {
      getUserSubscriptionInfo(user.uid).then(setUserSubscriptionInfo);
    }
  }, [user]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentName: `Income Certificate - ${new Date().toISOString().split("T")[0]}`,
      applicantName: "",
      fatherOrSpouseName: "",
      applicantAddress: "",
      applicantPan: "",
      financialYear: "2023-24",
      incomeFromSalary: 0,
      incomeFromBusiness: 0,
      incomeFromOtherSources: 0,
      familyIncome: undefined,
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
                    toast({variant: 'destructive', title: "Unauthorized"});
                    router.push('/ca-certificates/income-certificate');
                }
            } else {
                 toast({variant: 'destructive', title: "Not Found"});
                 router.push('/ca-certificates/income-certificate');
            }
            setIsLoading(false);
        }
        loadDocument();
    }
  }, [docId, user, form, router, toast]);

  useEffect(() => {
    getServicePricing().then(pricingData => {
      setPricing(pricingData);
    }).catch(error => {
      console.error('Error loading pricing:', error);
    });

    const unsubscribe = onPricingUpdate(pricingData => {
      setPricing(pricingData);
    });

    return () => unsubscribe();
  }, []);

  const handlePreview = async () => {
    const isValid = await form.trigger();
    if(isValid) {
        setStep(2);
        toast({ title: "Draft Ready", description: "Review the certificate before proceeding." });
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
              toast({title: "Draft Updated"});
          } else {
              const docRef = await addDoc(collection(db, 'userDocuments'), {
                  userId: user.uid,
                  documentType: 'income-certificate',
                  documentName: formData.documentName,
                  status: 'Draft',
                  formData,
                  createdAt: new Date(),
              });
              toast({title: "Draft Saved!"});
              router.push(`/ca-certificates/income-certificate?id=${docRef.id}`);
          }
      } catch (e) {
          console.error(e);
          toast({variant: 'destructive', title: 'Save Failed'});
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleLocalCertificationRequest = async () => {
      if (!user) {
          toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to make a request." });
          return;
      }

      if (!pricing) {
          toast({ variant: "destructive", title: "Loading", description: "Please wait while we load pricing information." });
          return;
      }

      const basePrice = pricing?.ca_certs?.find(s => s.id === 'income_certificate')?.price || 0;
      const effectivePrice = userSubscriptionInfo
        ? getEffectiveServicePrice(
            basePrice,
            userSubscriptionInfo.userType,
            userSubscriptionInfo.subscriptionPlan,
            "ca_certs"
          )
        : basePrice;

      if (effectivePrice === 0) {
          setIsSubmitting(true);
          try {
            await addDoc(collection(db, "certificationRequests"), {
                reportType: "Income Certificate (CA Issued)",
                clientName: form.getValues("applicantName"),
                requestedBy: user.displayName || user.email,
                userId: user.uid,
                requestDate: new Date(),
                status: "Pending",
                draftUrl: "#",
                signedDocumentUrl: null,
                formData: form.getValues(),
                amount: 0,
            });
            toast({
                title: "Request Sent",
                description: "Your certification request has been sent to the admin for review and signature."
            });
          } catch (error) {
              console.error("Error sending request:", error);
              toast({ variant: "destructive", title: "Request Failed", description: "Could not send the request. Please try again." });
          } finally {
              setIsSubmitting(false);
          }
      } else {
          toast({
              title: "Payment Required",
              description: `This service costs ₹${effectivePrice}. Please complete the payment to proceed.`,
          });
      }
  }

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin size-8 text-primary"/></div>;
    }
    if (step === 1) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Income Information</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                     <FormField control={form.control} name="documentName" render={({ field }) => (<FormItem><FormLabel>Document Name (for reference)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <Separator/>
                     <FormField control={form.control} name="applicantName" render={({ field }) => (<FormItem><FormLabel>Applicant Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="fatherOrSpouseName" render={({ field }) => (<FormItem><FormLabel>Father/Spouse Name (Optional)</FormLabel><FormControl><Input placeholder="e.g., S/o Late Sri Venkata Ramana" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="applicantAddress" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <div className="grid md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="applicantPan" render={({ field }) => (<FormItem><FormLabel>PAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="financialYear" render={({ field }) => (<FormItem><FormLabel>Financial Year (e.g., 2023-24)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                    <Separator/>
                    <h4 className="font-semibold">Income from All Sources (₹)</h4>
                     <FormField control={form.control} name="incomeFromSalary" render={({ field }) => (<FormItem><FormLabel>Income from Salary</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="incomeFromBusiness" render={({ field }) => (<FormItem><FormLabel>Income from Business/Profession</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="incomeFromOtherSources" render={({ field }) => (<FormItem><FormLabel>Income from Other Sources</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="familyIncome" render={({ field }) => (<FormItem><FormLabel>Family Income (Optional)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>)}/>
                </CardContent>
                 <CardFooter className="justify-between">
                    <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>} Save Draft</Button>
                    <Button type="button" onClick={handlePreview}>
                       <ArrowRight className="mr-2" /> Preview Certificate
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    if (step === 2) {
        const formData = form.getValues();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const whatsappMessage = `Dear ${formData.applicantName},\n\nPlease find attached the Income Certificate for FY ${formData.financialYear}.\n\nThank you,\n${CA_FIRM.name}`;
        const totalIncome = formData.incomeFromSalary + formData.incomeFromBusiness + formData.incomeFromOtherSources;

        return (
             <Card>
                <CardHeader>
                    <CardTitle>Final Preview</CardTitle>
                    <CardDescription>Review the generated certificate. You can download, share, or send for certification.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div ref={printRef} className="prose dark:prose-invert max-w-none border rounded-lg p-8 bg-card text-card-foreground">
                        <header className="text-center border-b-2 pb-4 mb-8" style={{ borderColor: 'hsl(var(--sidebar-background))' }}>
                            <h1 className="text-2xl font-bold m-0" style={{ color: 'hsl(var(--sidebar-background))' }}>{CA_FIRM.name}</h1>
                            <p className="text-sm m-0">Chartered Accountants</p>
                            <p className="text-xs m-0">H.No. 2-2-1130/2/A, G-1, Amberpet, Hyderabad-500013</p>
                            <p className="text-xs m-0">Email: skkandco@gmail.com</p>
                       </header>

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="font-bold text-sm">TO WHOMSOEVER IT MAY CONCERN</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">UDIN: [UDIN GOES HERE]</p>
                                <p className="text-sm">Date: {new Date().toLocaleDateString('en-GB', dateOptions)}</p>
                            </div>
                        </div>
                        
                        <h4 className="font-bold text-center underline my-6">INCOME CERTIFICATE</h4>

                        <p>This is to certify that Sri/Smt <strong>{formData.applicantName}</strong>{formData.fatherOrSpouseName ? `, ${formData.fatherOrSpouseName}` : ''}, R/o {formData.applicantAddress} (PAN: <strong>{formData.applicantPan}</strong>) has an annual income as detailed below for the financial year {formData.financialYear}:</p>

                        <table className="my-6 w-full">
                            <tbody>
                                <tr className="border-t border-b">
                                    <td className="py-2">Income from Salary</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.incomeFromSalary.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2">Income from Business/Profession</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.incomeFromBusiness.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2">Income from Other Sources</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.incomeFromOtherSources.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                <tr className="border-t-2 font-semibold">
                                    <td className="py-2">Total Income</td>
                                    <td className="py-2 text-right font-mono">₹ {totalIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                {formData.familyIncome && formData.familyIncome > 0 && (
                                <tr className="border-t-2">
                                    <td className="py-2">Family Income</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.familyIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                )}
                            </tbody>
                        </table>
                        
                        <p>The total annual income is <strong>Rupees {numberToWords(totalIncome)} only</strong>.</p>

                        <p className="mt-8 text-xs">
                            This certificate is issued at the specific request of the applicant for the purpose of [Purpose, e.g., Visa Application, Bank Loan, etc.]. Our liability is limited to the extent of information provided by the applicant and is based on the documents and records produced before us.
                        </p>

                        <div className="mt-24 text-right">
                            <p className="font-bold">For {CA_FIRM.name}</p>
                            <p>Chartered Accountants</p>
                            <div className="h-20"></div>
                            <p>(S. Kranthi Kumar)</p>
                            <p>Proprietor</p>
                            <p>Membership No: 224983</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between">
                     <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2"/> Back to Edit</Button>
                     <div className="flex gap-2">
                        <ShareButtons
                            contentRef={printRef}
                            fileName={`Income_Certificate_${formData.applicantName}`}
                            whatsappMessage={whatsappMessage}
                        />
                        {(() => {
                          const basePrice = pricing?.ca_certs?.find(s => s.id === 'income_certificate')?.price || 0;
                          const effectivePrice = userSubscriptionInfo
                            ? getEffectiveServicePrice(
                                basePrice,
                                userSubscriptionInfo.userType,
                                userSubscriptionInfo.subscriptionPlan,
                                "ca_certs"
                              )
                            : basePrice;
                          return effectivePrice > 0 ? (
                           <CashfreeCheckout
                               amount={effectivePrice}
                               planId="income_certificate_cert"
                               planName="Income Certificate (CA Issued)"
                               userId={user?.uid || ''}
                               userEmail={user?.email || ''}
                               userName={user?.displayName || ''}
                               postPaymentContext={{
                                 key: "pending_ca_certificate",
                                 payload: {
                                   type: "ca_certificate",
                                   planId: "income_certificate_cert",
                                   amount: effectivePrice,
                                   reportType: "Income Certificate (CA Issued)",
                                   clientName: form.getValues("applicantName"),
                                   documentType: "income-certificate",
                                   documentName: form.getValues("documentName") || "Income Certificate",
                                   formData: form.getValues(),
                                 },
                               }}
                               onSuccess={async (paymentId) => {
                                   setIsSubmitting(true);
                                   try {
                                       const basePrice = pricing?.ca_certs?.find(s => s.id === 'income_certificate')?.price || 0;
                                       const effectivePrice = userSubscriptionInfo
                                         ? getEffectiveServicePrice(
                                             basePrice,
                                             userSubscriptionInfo.userType,
                                             userSubscriptionInfo.subscriptionPlan,
                                             "ca_certs"
                                           )
                                         : basePrice;
                                       await addDoc(collection(db, "certificationRequests"), {
                                           reportType: "Income Certificate (CA Issued)",
                                           clientName: form.getValues("applicantName"),
                                           requestedBy: user?.displayName || user?.email,
                                           userId: user?.uid,
                                           requestDate: new Date(),
                                           status: "Pending",
                                           draftUrl: "#",
                                           signedDocumentUrl: null,
                                           formData: form.getValues(),
                                           amount: effectivePrice,
                                           paymentId: paymentId,
                                       });
                                       toast({
                                           title: "Payment Successful & Request Sent",
                                           description: "Your payment has been processed and certification request sent to admin."
                                       });
                                   } catch (error) {
                                       console.error("Error sending request:", error);
                                       toast({
                                           variant: "destructive",
                                           title: "Request Failed",
                                           description: "Payment was successful but request submission failed. Please contact support."
                                       });
                                   } finally {
                                       setIsSubmitting(false);
                                   }
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
                           <Button type="button" onClick={handleLocalCertificationRequest} disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <FileSignature className="mr-2"/>}
                              Request Certification
                           </Button>
                       );
                        })()}
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
        <h1 className="text-3xl font-bold">Income Certificate (CA Issued)</h1>
        <p className="text-muted-foreground">Generate a draft income certificate for individuals.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
            {renderContent()}
        </form>
      </Form>
    </div>
  );
}

