
"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, FileSignature, Trash2, PlusCircle, ArrowRight, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { CA_FIRM } from "@/lib/ca-firm";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableFooter as TableFoot, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ShareButtons } from "@/components/documents/share-buttons";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { getServicePricing, onPricingUpdate } from "@/lib/pricing-service";
import { useCertificationRequest } from "@/hooks/use-certification-request";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";
import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";


const assetSchema = z.object({
  description: z.string().min(3, "Description is required."),
  value: z.coerce.number().positive("Value must be a positive number."),
});

const liabilitySchema = z.object({
  description: z.string().min(3, "Description is required."),
  value: z.coerce.number().positive("Value must be a positive number."),
});

const formSchema = z.object({
  documentName: z.string().min(3, "A document name is required for saving."),
  clientName: z.string().min(3, "Client's name is required."),
  fatherOrSpouseName: z.string().optional(),
  clientPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format."),
  clientAddress: z.string().min(10, "Address is required."),
  asOnDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  assets: z.array(assetSchema),
  liabilities: z.array(liabilitySchema),
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

const CertificateToPrint = React.forwardRef<HTMLDivElement, { formData: FormData }>(({ formData }, ref) => {
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

    const totalAssets = formData.assets.reduce((acc, asset) => acc + (Number(asset.value) || 0), 0);
    const totalLiabilities = formData.liabilities.reduce((acc, liability) => acc + (Number(liability.value) || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    
    return (
        <div ref={ref} style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#000000',
            backgroundColor: '#ffffff',
            maxWidth: '100%',
            padding: '40px',
            margin: '0',
            pageBreakInside: 'avoid',
            boxSizing: 'border-box'
        }}>
            <header style={{
                textAlign: 'center',
                borderBottom: '2px solid #2563eb',
                paddingBottom: '20px',
                marginBottom: '40px',
                pageBreakAfter: 'avoid'
            }}>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#2563eb',
                    margin: '0 0 8px 0'
                }}>{CA_FIRM.name}</h1>
                <p style={{
                    fontSize: '14px',
                    margin: '0 0 4px 0'
                }}>Chartered Accountants</p>
                <p style={{
                    fontSize: '12px',
                    margin: '0 0 4px 0'
                }}>H.No. 2-2-1130/2/A, G-1, Amberpet, Hyderabad-500013</p>
                <p style={{
                    fontSize: '12px',
                    margin: '0'
                }}>Email: skkandco@gmail.com</p>
            </header>
            <h4 style={{
                fontWeight: 'bold',
                textAlign: 'center',
                margin: '20px 0',
                fontSize: '16px'
            }}>TO WHOM IT MAY CONCERN</h4>
            <h4 style={{
                fontWeight: 'bold',
                textAlign: 'center',
                textDecoration: 'underline',
                margin: '20px 0',
                fontSize: '18px'
            }}>NET WORTH CERTIFICATE</h4>

            <p style={{
                margin: '20px 0',
                textAlign: 'justify',
                lineHeight: '1.6'
            }}>This is to certify that the Net Worth of Sri <strong style={{fontWeight: 'bold'}}>{formData.clientName}</strong>{formData.fatherOrSpouseName ? `, ${formData.fatherOrSpouseName}` : ''}, R/o {formData.clientAddress} (PAN: <strong style={{fontWeight: 'bold'}}>{formData.clientPan}</strong>) as on <strong style={{fontWeight: 'bold'}}>{new Date(formData.asOnDate).toLocaleDateString('en-GB', dateOptions)}</strong> is as follows:</p>

            <h5 style={{
                fontWeight: 'bold',
                margin: '30px 0 15px 0',
                fontSize: '16px'
            }}>A. ASSETS</h5>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '20px',
                fontSize: '14px'
            }}>
                <thead>
                    <tr style={{borderBottom: '1px solid #000'}}>
                        <th style={{
                            width: '70%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            fontWeight: 'bold'
                        }}>Description</th>
                        <th style={{
                            textAlign: 'right',
                            padding: '8px 12px',
                            fontWeight: 'bold'
                        }}>Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {formData.assets.map((a, i) => (
                        <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '8px 12px'}}>{a.description}</td>
                            <td style={{
                                textAlign: 'right',
                                padding: '8px 12px',
                                fontFamily: 'monospace'
                            }}>{a.value.toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr style={{borderTop: '2px solid #000'}}>
                        <td style={{
                            padding: '8px 12px',
                            fontWeight: 'bold'
                        }}>Total Assets</td>
                        <td style={{
                            textAlign: 'right',
                            padding: '8px 12px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                        }}>{totalAssets.toLocaleString('en-IN')}</td>
                    </tr>
                </tfoot>
            </table>
            
            <h5 style={{
                fontWeight: 'bold',
                margin: '30px 0 15px 0',
                fontSize: '16px'
            }}>B. LIABILITIES</h5>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '20px',
                fontSize: '14px'
            }}>
                <thead>
                    <tr style={{borderBottom: '1px solid #000'}}>
                        <th style={{
                            width: '70%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            fontWeight: 'bold'
                        }}>Description</th>
                        <th style={{
                            textAlign: 'right',
                            padding: '8px 12px',
                            fontWeight: 'bold'
                        }}>Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {formData.liabilities.map((l, i) => (
                        <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '8px 12px'}}>{l.description}</td>
                            <td style={{
                                textAlign: 'right',
                                padding: '8px 12px',
                                fontFamily: 'monospace'
                            }}>{l.value.toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr style={{borderTop: '2px solid #000'}}>
                        <td style={{
                            padding: '8px 12px',
                            fontWeight: 'bold'
                        }}>Total Liabilities</td>
                        <td style={{
                            textAlign: 'right',
                            padding: '8px 12px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                        }}>{totalLiabilities.toLocaleString('en-IN')}</td>
                    </tr>
                </tfoot>
            </table>

            <h5 style={{
                fontWeight: 'bold',
                margin: '30px 0 15px 0',
                fontSize: '16px'
            }}>NET WORTH (A - B)</h5>
            <p style={{
                margin: '15px 0',
                textAlign: 'justify',
                lineHeight: '1.6'
            }}>The net worth of <strong style={{fontWeight: 'bold'}}>{formData.clientName}</strong> as on {new Date(formData.asOnDate).toLocaleDateString('en-GB', dateOptions)} is <strong style={{fontWeight: 'bold'}}>₹{netWorth.toLocaleString('en-IN')}</strong> (Rupees {numberToWords(netWorth)} only).</p>

            <div style={{
                marginTop: '60px',
                textAlign: 'justify'
            }}>
                <p style={{
                    margin: '15px 0',
                    lineHeight: '1.6'
                }}>This certificate is issued based on the information and records produced before us and is true to the best of our knowledge and belief.</p>
                <p style={{
                    margin: '40px 0 10px 0',
                    fontWeight: 'bold'
                }}>For {CA_FIRM.name}</p>
                <p style={{margin: '5px 0'}}>Chartered Accountants</p>
                <div style={{height: '80px'}}></div>
                <p style={{margin: '5px 0'}}>(S. Kranthi Kumar)</p>
                <p style={{margin: '5px 0'}}>Proprietor</p>
                <p style={{margin: '5px 0'}}>Membership No: 224983</p>
            </div>
        </div>
    );
});
CertificateToPrint.displayName = 'CertificateToPrint';


export default function NetWorthCertificatePage() {
  console.log('🎯 NET-WORTH PAGE: Component rendered/mounted');

  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');

  const [step, setStep] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);
  const [user, authLoading] = useAuthState(auth);
  const [isLoading, setIsLoading] = useState(!!docId);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);

  const { handleCertificationRequest, handlePaymentSuccess, isSubmitting } = useCertificationRequest({
    pricing,
    serviceId: 'net_worth'
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentName: `Net Worth Certificate - ${format(new Date(), 'yyyy-MM-dd')}`,
      clientName: "",
      fatherOrSpouseName: "",
      clientPan: "",
      clientAddress: "",
      asOnDate: new Date().toISOString().split("T")[0],
      assets: [{ description: "Immovable Property - Residential Flat", value: 5000000 }],
      liabilities: [{ description: "Housing Loan from HDFC Bank", value: 2000000 }],
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
                    router.push('/ca-certificates/net-worth');
                }
            } else {
                 toast({variant: 'destructive', title: "Not Found", description: "The requested document draft could not be found."});
                 router.push('/ca-certificates/net-worth');
            }
            setIsLoading(false);
        }
        loadDocument();
    }
  }, [docId, user, form, router, toast]);

  // Fetch user subscription info
  useEffect(() => {
    if (user) {
      getUserSubscriptionInfo(user.uid).then(setUserSubscriptionInfo);
    }
  }, [user]);

  // Load pricing data with real-time updates
  useEffect(() => {
    console.log('🚀 NET-WORTH PAGE: Loading pricing data...');
    getServicePricing().then(pricingData => {
      console.log('✅ NET-WORTH PAGE: Pricing data received:', pricingData);
      setPricing(pricingData);
      console.log('🔄 NET-WORTH PAGE: Pricing state updated, should re-render');
    }).catch(error => {
      console.error('❌ NET-WORTH PAGE: Error loading pricing:', error);
    });

    // Subscribe to real-time pricing updates
    const unsubscribe = onPricingUpdate(pricingData => {
      console.log('🔄 NET-WORTH PAGE: Real-time pricing update received:', pricingData);
      setPricing(pricingData);
    });

    return () => unsubscribe();
  }, []);

  // Debug pricing changes
  useEffect(() => {
    console.log('🔄 NET-WORTH PAGE: Pricing state changed:', pricing);
    if (pricing) {
      console.log('📊 NET-WORTH PAGE: Available ca_certs services:', pricing.ca_certs?.map(s => `${s.id}: ₹${s.price}`));
    }
  }, [pricing]);

  const { fields: assetFields, append: appendAsset, remove: removeAsset } = useFieldArray({ control: form.control, name: "assets" });
  const { fields: liabilityFields, append: appendLiability, remove: removeLiability } = useFieldArray({ control: form.control, name: "liabilities" });
  
  const handleGenerateDraft = async () => {
    const isValid = await form.trigger();
    if(isValid) {
        setStep(4);
        toast({
            title: "Draft Ready for Preview",
            description: "Review the generated certificate below.",
        });
    } else {
         toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please fill all required fields before generating the draft.",
        });
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
                  documentType: 'net-worth-certificate',
                  documentName: formData.documentName,
                  status: 'Draft',
                  formData,
                  createdAt: new Date(),
              });
              toast({title: "Draft Saved!", description: `Saved "${formData.documentName}".`});
              router.push(`/ca-certificates/net-worth?id=${docRef.id}`);
          }
      } catch (e) {
          console.error(e);
          toast({variant: 'destructive', title: 'Save Failed', description: 'Could not save the draft.'});
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleCertificationRequestWrapper = async () => {
    const result = await handleCertificationRequest({
      reportType: "Net Worth Certificate",
      clientName: form.getValues("clientName"),
      formData: form.getValues(),
    });

    // If result is an object with requiresPayment, it means payment is needed
    if (result && typeof result === 'object' && result.requiresPayment) {
      toast({
        title: "Payment Required",
        description: `This service costs ₹${result.price}. Please complete the payment to proceed.`,
      });
    }
  }

  const renderStepContent = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin size-8 text-primary"/></div>;
    }
    switch(step) {
        case 1:
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 1: Client and Date Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="documentName" render={({ field }) => (<FormItem><FormLabel>Document Name</FormLabel><FormControl><Input placeholder="A name to identify this draft" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <Separator/>
                        <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Client's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="fatherOrSpouseName" render={({ field }) => (<FormItem><FormLabel>Father/Spouse Name (Optional)</FormLabel><FormControl><Input placeholder="e.g., S/o Late Sri Venkata Ramana or W/o Smt. Lakshmi" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="clientAddress" render={({ field }) => (<FormItem><FormLabel>Client's Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="clientPan" render={({ field }) => (<FormItem><FormLabel>Client's PAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="asOnDate" render={({ field }) => (<FormItem><FormLabel>Net Worth as on Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                    </CardContent>
                     <CardFooter className="justify-between">
                         <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>} Save Draft</Button>
                         <Button type="button" onClick={() => form.trigger(["clientName", "fatherOrSpouseName", "clientAddress", "clientPan", "asOnDate"]).then(isValid => isValid && setStep(2))}>Next <ArrowRight className="mr-2"/></Button>
                    </CardFooter>
                </Card>
            )
        case 2:
            return (
                 <Card>
                    <CardHeader><CardTitle>Step 2: Assets</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {assetFields.map((field, index) => (
                             <div key={field.id} className="flex gap-2 items-end">
                                <FormField control={form.control} name={`assets.${index}.description`} render={({ field }) => (<FormItem className="flex-1"><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`assets.${index}.value`} render={({ field }) => (<FormItem><FormLabel>Value (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAsset(index)}><Trash2 className="size-4 text-destructive"/></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendAsset({ description: "", value: 0 })}><PlusCircle className="mr-2"/> Add Asset</Button>
                    </CardContent>
                    <CardFooter className="justify-between">
                        <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2"/> Back</Button>
                        <Button type="button" onClick={() => form.trigger("assets").then(isValid => isValid && setStep(3))}>Next <ArrowRight className="mr-2"/></Button>
                    </CardFooter>
                 </Card>
            )
        case 3:
            return (
                 <Card>
                    <CardHeader><CardTitle>Step 3: Liabilities</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {liabilityFields.map((field, index) => (
                             <div key={field.id} className="flex gap-2 items-end">
                                <FormField control={form.control} name={`liabilities.${index}.description`} render={({ field }) => (<FormItem className="flex-1"><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`liabilities.${index}.value`} render={({ field }) => (<FormItem><FormLabel>Value (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeLiability(index)}><Trash2 className="size-4 text-destructive"/></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendLiability({ description: "", value: 0 })}><PlusCircle className="mr-2"/> Add Liability</Button>
                    </CardContent>
                    <CardFooter className="justify-between">
                        <Button type="button" variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2"/> Back</Button>
                        <Button type="button" onClick={handleGenerateDraft}>
                            <FileSignature className="mr-2"/> Generate Draft
                        </Button>
                    </CardFooter>
                 </Card>
            )
        case 4:
            const formData = form.getValues();
            const whatsappMessage = `Dear ${formData.clientName},\n\nPlease find attached the Net Worth Certificate as on ${new Date(formData.asOnDate).toLocaleDateString('en-GB')}.\n\nThank you,\n${CA_FIRM.name}`;

            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Final Preview & Actions</CardTitle>
                        <CardDescription>Review the generated certificate. You can now print, download, or send for professional certification.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="border rounded-lg">
                            <CertificateToPrint ref={printRef} formData={formData} />
                         </div>
                    </CardContent>
                    <CardFooter className="justify-between">
                         <Button type="button" variant="outline" onClick={() => setStep(3)}><ArrowLeft className="mr-2"/> Back</Button>
                         <div className="flex gap-2">
                             <ShareButtons
                                contentRef={printRef}
                                fileName={`Net_Worth_${formData.clientName}`}
                                whatsappMessage={whatsappMessage}
                             />

                             {/* Debug logging */}
                             {(() => {
                                 console.log('🔍 DEBUG - Rendering Razorpay condition:');
                                 console.log('- pricing exists:', !!pricing);
                                 console.log('- ca_certs exists:', !!pricing?.ca_certs);
                                 console.log('- net_worth service:', pricing?.ca_certs?.find(s => s.id === 'net_worth'));
                                 console.log('- price value:', pricing?.ca_certs?.find(s => s.id === 'net_worth')?.price);
                                 console.log('- price > 0:', pricing?.ca_certs?.find(s => s.id === 'net_worth')?.price > 0);
                                 return null;
                             })()}

                             {(() => {
                                const basePrice = pricing?.ca_certs?.find(s => s.id === 'net_worth')?.price || 0;
                                const effectivePrice = userSubscriptionInfo
                                  ? getEffectiveServicePrice(
                                      basePrice,
                                      userSubscriptionInfo.userType,
                                      userSubscriptionInfo.subscriptionPlan,
                                      "ca_certs"
                                    )
                                  : basePrice;
                                
                                if (effectivePrice > 0) {
                                  return (
                                    <CashfreeCheckout
                                      amount={effectivePrice}
                                      planId="net_worth_cert"
                                      planName="Net Worth Certificate"
                                      userId={user?.uid || ''}
                                      userEmail={user?.email || ''}
                                      userName={user?.displayName || ''}
                                      onSuccess={(paymentId) => {
                                        handlePaymentSuccess(paymentId, {
                                          reportType: "Net Worth Certificate",
                                          clientName: form.getValues("clientName"),
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
                                  );
                                } else {
                                  return (
                                    <Button type="button" onClick={handleCertificationRequestWrapper} disabled={isSubmitting}>
                                      {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <FileSignature className="mr-2"/>}
                                      Request Certification
                                    </Button>
                                  );
                                }
                              })()}
                         </div>
                    </CardFooter>
                </Card>
            )
        default: return null;
    }
  }


  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/ca-certificates" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Certificate Menu
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Net Worth Certificate</h1>
        <p className="text-muted-foreground">Generate a draft certificate of net worth for an individual or HUF.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
            {renderStepContent()}
        </form>
      </Form>
    </div>
  );
}
