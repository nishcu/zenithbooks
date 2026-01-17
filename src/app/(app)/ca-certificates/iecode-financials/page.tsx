
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
  firmName: z.string().min(3, "Firm name is required."),
  firmAddress: z.string().min(10, "Firm address is required."),
  firmPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format."),
  ieCode: z.string().min(5, "IE Code is required."),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/, "Invalid format. Use YYYY-YY."),
  lastYearTurnover: z.coerce.number().positive("Turnover must be positive."),
  forexEarnings: z.coerce.number().min(0, "Forex earnings cannot be negative.").default(0),
  exportTurnover: z.coerce.number().min(0, "Export turnover cannot be negative.").default(0),
  importTurnover: z.coerce.number().min(0, "Import turnover cannot be negative.").default(0),
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

export default function IECodeFinancialCertificatePage() {
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
      documentName: `IE Code Financial Certificate - ${new Date().toISOString().split("T")[0]}`,
      firmName: "",
      firmAddress: "",
      firmPan: "",
      ieCode: "",
      financialYear: "2023-24",
      lastYearTurnover: 0,
      forexEarnings: 0,
      exportTurnover: 0,
      importTurnover: 0,
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
                    router.push('/ca-certificates/iecode-financials');
                }
            } else {
                 toast({variant: 'destructive', title: "Not Found"});
                 router.push('/ca-certificates/iecode-financials');
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
                  documentType: 'iecode-financial-certificate',
                  documentName: formData.documentName,
                  status: 'Draft',
                  formData,
                  createdAt: new Date(),
              });
              toast({title: "Draft Saved!"});
              router.push(`/ca-certificates/iecode-financials?id=${docRef.id}`);
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

      const basePrice = pricing?.ca_certs?.find(s => s.id === 'iecode_financials')?.price || 0;
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
                reportType: "Import-Export (IE Code) Financial Certificate",
                clientName: form.getValues("firmName"),
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
                    <CardTitle>Import-Export Financial Information</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                     <FormField control={form.control} name="documentName" render={({ field }) => (<FormItem><FormLabel>Document Name (for reference)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <Separator/>
                     <FormField control={form.control} name="firmName" render={({ field }) => (<FormItem><FormLabel>Import/Export Firm Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="firmAddress" render={({ field }) => (<FormItem><FormLabel>Registered Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <div className="grid md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="firmPan" render={({ field }) => (<FormItem><FormLabel>PAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="ieCode" render={({ field }) => (<FormItem><FormLabel>Import-Export Code (IE Code)</FormLabel><FormControl><Input placeholder="e.g., 1234567890" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                    <FormField control={form.control} name="financialYear" render={({ field }) => (<FormItem><FormLabel>Financial Year (e.g., 2023-24)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <Separator/>
                    <h4 className="font-semibold">Financial Details (₹)</h4>
                     <FormField control={form.control} name="lastYearTurnover" render={({ field }) => (<FormItem><FormLabel>Last Year Turnover (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="forexEarnings" render={({ field }) => (<FormItem><FormLabel>Forex Earnings (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="exportTurnover" render={({ field }) => (<FormItem><FormLabel>Export Turnover (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="importTurnover" render={({ field }) => (<FormItem><FormLabel>Import Turnover (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
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
        const whatsappMessage = `Dear ${formData.firmName},\n\nPlease find attached the Import-Export (IE Code) Financial Certificate for FY ${formData.financialYear}.\n\nThank you,\n${CA_FIRM.name}`;

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
                        
                        <h4 className="font-bold text-center underline my-6">IMPORT-EXPORT (IE CODE) FINANCIAL CERTIFICATE</h4>

                        <p>This is to certify that we have verified the books of accounts, import-export documents, and other relevant records of <strong>M/s {formData.firmName}</strong>, having its registered office at {formData.firmAddress}, holding PAN <strong>{formData.firmPan}</strong> and Import-Export Code <strong>{formData.ieCode}</strong>.</p>
                        
                        <p>Based on our verification for the financial year {formData.financialYear}, we certify that the financial standing and import-export activities of the firm are as follows:</p>

                        <table className="my-6 w-full">
                            <tbody>
                                <tr className="border-t border-b">
                                    <td className="py-2 font-semibold">Financial Year</td>
                                    <td className="py-2 text-right font-semibold">{formData.financialYear}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2 font-semibold">Import-Export Code (IE Code)</td>
                                    <td className="py-2 text-right font-semibold">{formData.ieCode}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2 font-semibold">Last Year Turnover</td>
                                    <td className="py-2 text-right font-mono font-semibold">₹ {formData.lastYearTurnover.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                {formData.exportTurnover > 0 && (
                                <tr className="border-b">
                                    <td className="py-2">Export Turnover</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.exportTurnover.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                )}
                                {formData.importTurnover > 0 && (
                                <tr className="border-b">
                                    <td className="py-2">Import Turnover</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.importTurnover.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                )}
                                {formData.forexEarnings > 0 && (
                                <tr className="border-t-2">
                                    <td className="py-2 font-semibold">Forex Earnings</td>
                                    <td className="py-2 text-right font-mono font-semibold">₹ {formData.forexEarnings.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                )}
                            </tbody>
                        </table>

                        <p>The last year turnover is <strong>Rupees {numberToWords(formData.lastYearTurnover)} only</strong>.</p>
                        {formData.forexEarnings > 0 && (
                            <p>The forex earnings is <strong>Rupees {numberToWords(formData.forexEarnings)} only</strong>.</p>
                        )}

                        <p className="mt-8 text-xs">
                            This certificate is issued at the specific request of the firm for the purpose of [Purpose, e.g., Bank Loan, Export Promotion, Government Compliance, etc.]. Our liability is limited to the extent of information provided by the management and is based on the records produced before us.
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
                            fileName={`IE_Code_Financial_Certificate_${formData.firmName}`}
                            whatsappMessage={whatsappMessage}
                        />
                        {(() => {
                          const basePrice = pricing?.ca_certs?.find(s => s.id === 'iecode_financials')?.price || 0;
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
                               planId="iecode_financials_cert"
                               planName="Import-Export (IE Code) Financial Certificate"
                               userId={user?.uid || ''}
                               userEmail={user?.email || ''}
                               userName={user?.displayName || ''}
                               postPaymentContext={{
                                 key: "pending_ca_certificate",
                                 payload: {
                                   type: "ca_certificate",
                                   planId: "iecode_financials_cert",
                                   amount: effectivePrice,
                                   reportType: "Import-Export (IE Code) Financial Certificate",
                                   clientName: form.getValues("firmName"),
                                   documentType: "iecode-financial-certificate",
                                   documentName: form.getValues("documentName") || "Import-Export (IE Code) Financial Certificate",
                                   formData: form.getValues(),
                                 },
                               }}
                               onSuccess={async (paymentId) => {
                                   setIsSubmitting(true);
                                   try {
                                       const basePrice = pricing?.ca_certs?.find(s => s.id === 'iecode_financials')?.price || 0;
                                       const effectivePrice = userSubscriptionInfo
                                         ? getEffectiveServicePrice(
                                             basePrice,
                                             userSubscriptionInfo.userType,
                                             userSubscriptionInfo.subscriptionPlan,
                                             "ca_certs"
                                           )
                                         : basePrice;
                                       await addDoc(collection(db, "certificationRequests"), {
                                           reportType: "Import-Export (IE Code) Financial Certificate",
                                           clientName: form.getValues("firmName"),
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
        <h1 className="text-3xl font-bold">Import-Export (IE Code) Financial Certificate</h1>
        <p className="text-muted-foreground">Generate a draft certificate for import-export financial standing.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
            {renderContent()}
        </form>
      </Form>
    </div>
  );
}

