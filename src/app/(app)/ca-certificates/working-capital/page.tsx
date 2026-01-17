
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
  entityName: z.string().min(3, "Entity name is required."),
  fatherOrSpouseName: z.string().optional(),
  entityAddress: z.string().min(10, "Entity address is required."),
  entityPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format."),
  asOnDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  stockValue: z.coerce.number().min(0, "Stock value cannot be negative."),
  debtors: z.coerce.number().min(0, "Debtors cannot be negative."),
  creditors: z.coerce.number().min(0, "Creditors cannot be negative."),
  bankBalance: z.coerce.number().min(0, "Bank balance cannot be negative."),
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

export default function WorkingCapitalCertificatePage() {
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
      documentName: `Working Capital Certificate - ${new Date().toISOString().split("T")[0]}`,
      entityName: "",
      fatherOrSpouseName: "",
      entityAddress: "",
      entityPan: "",
      asOnDate: new Date().toISOString().split("T")[0],
      stockValue: 0,
      debtors: 0,
      creditors: 0,
      bankBalance: 0,
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
                    router.push('/ca-certificates/working-capital');
                }
            } else {
                 toast({variant: 'destructive', title: "Not Found"});
                 router.push('/ca-certificates/working-capital');
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
                  documentType: 'working-capital-certificate',
                  documentName: formData.documentName,
                  status: 'Draft',
                  formData,
                  createdAt: new Date(),
              });
              toast({title: "Draft Saved!"});
              router.push(`/ca-certificates/working-capital?id=${docRef.id}`);
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

      const basePrice = pricing?.ca_certs?.find(s => s.id === 'working_capital')?.price || 0;
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
                reportType: "Working Capital Certificate",
                clientName: form.getValues("entityName"),
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
                    <CardTitle>Working Capital Information</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                     <FormField control={form.control} name="documentName" render={({ field }) => (<FormItem><FormLabel>Document Name (for reference)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <Separator/>
                     <FormField control={form.control} name="entityName" render={({ field }) => (<FormItem><FormLabel>Entity Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="fatherOrSpouseName" render={({ field }) => (<FormItem><FormLabel>Proprietor/Director Name (Optional)</FormLabel><FormControl><Input placeholder="e.g., S/o Late Sri Venkata Ramana" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="entityAddress" render={({ field }) => (<FormItem><FormLabel>Registered Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <div className="grid md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="entityPan" render={({ field }) => (<FormItem><FormLabel>PAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="asOnDate" render={({ field }) => (<FormItem><FormLabel>As on Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                    <Separator/>
                    <h4 className="font-semibold">Current Assets</h4>
                     <FormField control={form.control} name="stockValue" render={({ field }) => (<FormItem><FormLabel>Stock / Inventory Value (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="debtors" render={({ field }) => (<FormItem><FormLabel>Debtors / Receivables (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="bankBalance" render={({ field }) => (<FormItem><FormLabel>Bank Balance (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <Separator/>
                    <h4 className="font-semibold">Current Liabilities</h4>
                     <FormField control={form.control} name="creditors" render={({ field }) => (<FormItem><FormLabel>Creditors / Payables (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
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
        const whatsappMessage = `Dear ${formData.entityName},\n\nPlease find attached the Working Capital Certificate as on ${new Date(formData.asOnDate).toLocaleDateString('en-GB', dateOptions)}.\n\nThank you,\n${CA_FIRM.name}`;
        const currentAssets = formData.stockValue + formData.debtors + formData.bankBalance;
        const currentLiabilities = formData.creditors;
        const workingCapital = currentAssets - currentLiabilities;

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
                        
                        <h4 className="font-bold text-center underline my-6">WORKING CAPITAL CERTIFICATE</h4>

                        <p>This is to certify that we have verified the books of accounts and other relevant records of <strong>M/s {formData.entityName}</strong>{formData.fatherOrSpouseName ? ` (${formData.fatherOrSpouseName})` : ''}, having its registered office at {formData.entityAddress} and holding PAN <strong>{formData.entityPan}</strong>.</p>
                        
                        <p>Based on our verification, we certify that the working capital position of the entity as on <strong>{new Date(formData.asOnDate).toLocaleDateString('en-GB', dateOptions)}</strong> is as follows:</p>

                        <h5 className="font-bold my-4">A. CURRENT ASSETS</h5>
                        <table className="my-4 w-full">
                            <tbody>
                                <tr className="border-b">
                                    <td className="py-2">Stock / Inventory</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.stockValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2">Debtors / Receivables</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.debtors.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2">Bank Balance</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.bankBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                <tr className="border-t-2 font-semibold">
                                    <td className="py-2">Total Current Assets</td>
                                    <td className="py-2 text-right font-mono">₹ {currentAssets.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                            </tbody>
                        </table>

                        <h5 className="font-bold my-4">B. CURRENT LIABILITIES</h5>
                        <table className="my-4 w-full">
                            <tbody>
                                <tr className="border-b border-t-2">
                                    <td className="py-2">Creditors / Payables</td>
                                    <td className="py-2 text-right font-mono">₹ {formData.creditors.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                                <tr className="border-t-2 font-semibold">
                                    <td className="py-2">Total Current Liabilities</td>
                                    <td className="py-2 text-right font-mono">₹ {currentLiabilities.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                            </tbody>
                        </table>

                        <table className="my-6 w-full border-t-2 border-b-2">
                            <tbody>
                                <tr className="border-b-2">
                                    <td className="py-2 font-semibold">Working Capital (Current Assets - Current Liabilities)</td>
                                    <td className="py-2 text-right font-mono font-semibold">₹ {workingCapital.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <p>The working capital is <strong>Rupees {numberToWords(Math.abs(workingCapital))} {workingCapital >= 0 ? '' : '(Negative)'}</strong>.</p>

                        <p className="mt-8 text-xs">
                            This certificate is issued at the specific request of the entity for the purpose of [Purpose, e.g., Bank Loan Application]. Our liability is limited to the extent of information provided by the management and is based on the records produced before us.
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
                            fileName={`Working_Capital_Certificate_${formData.entityName}`}
                            whatsappMessage={whatsappMessage}
                        />
                        {(() => {
                          const basePrice = pricing?.ca_certs?.find(s => s.id === 'working_capital')?.price || 0;
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
                               planId="working_capital_cert"
                               planName="Working Capital Certificate"
                               userId={user?.uid || ''}
                               userEmail={user?.email || ''}
                               userName={user?.displayName || ''}
                               postPaymentContext={{
                                 key: "pending_ca_certificate",
                                 payload: {
                                   type: "ca_certificate",
                                   planId: "working_capital_cert",
                                   amount: effectivePrice,
                                   reportType: "Working Capital Certificate",
                                   clientName: form.getValues("entityName"),
                                   documentType: "working-capital-certificate",
                                   documentName: form.getValues("documentName") || "Working Capital Certificate",
                                   formData: form.getValues(),
                                 },
                               }}
                               onSuccess={async (paymentId) => {
                                   setIsSubmitting(true);
                                   try {
                                       const basePrice = pricing?.ca_certs?.find(s => s.id === 'working_capital')?.price || 0;
                                       const effectivePrice = userSubscriptionInfo
                                         ? getEffectiveServicePrice(
                                             basePrice,
                                             userSubscriptionInfo.userType,
                                             userSubscriptionInfo.subscriptionPlan,
                                             "ca_certs"
                                           )
                                         : basePrice;
                                       await addDoc(collection(db, "certificationRequests"), {
                                           reportType: "Working Capital Certificate",
                                           clientName: form.getValues("entityName"),
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
        <h1 className="text-3xl font-bold">Working Capital Certificate</h1>
        <p className="text-muted-foreground">Generate a draft certificate for working capital position.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
            {renderContent()}
        </form>
      </Form>
    </div>
  );
}

