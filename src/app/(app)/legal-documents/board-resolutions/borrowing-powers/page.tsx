
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { ShareButtons } from "@/components/documents/share-buttons";
import { CashfreeCheckout } from "@/components/payment/cashfree-checkout";
import { OnDemandPayAndUseActions } from "@/components/payment/on-demand-pay-and-use-actions";
import { getServicePricing, onPricingUpdate } from "@/lib/pricing-service";
import { getUserSubscriptionInfo, getEffectiveServicePrice } from "@/lib/service-pricing-utils";
import { useOnDemandUnlock } from "@/hooks/use-on-demand-unlock";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  companyName: z.string().min(3, "Company name is required."),
  meetingDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  bankName: z.string().min(3, "Bank name is required."),
  loanType: z.enum(["Term Loan", "Cash Credit", "Overdraft", "Working Capital Loan"]).default("Term Loan"),
  loanAmount: z.coerce.number().positive("Loan amount must be a positive number."),
  authorizedDirector1: z.string().min(3, "At least one director's name is required."),
  authorizedDirector2: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function BorrowingPowersPage() {
  const { toast } = useToast();
  const printRef = useRef(null);
  const [user] = useAuthState(auth);
  const [pricing, setPricing] = useState(null);
  const [userSubscriptionInfo, setUserSubscriptionInfo] = useState<{ userType: "business" | "professional" | null; subscriptionPlan: "freemium" | "business" | "professional" | null } | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  useOnDemandUnlock("board_resolutions_download", () => setShowDocument(true));

  // Fetch user subscription info
  useEffect(() => {
    if (user) {
      getUserSubscriptionInfo(user.uid).then(setUserSubscriptionInfo);
    }
  }, [user]);

  // Load pricing data with real-time updates
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "Acme Innovations Pvt. Ltd.",
      meetingDate: new Date().toISOString().split("T")[0],
      bankName: "HDFC Bank",
      loanType: "Working Capital Loan",
      loanAmount: 10000000,
      authorizedDirector1: "Rohan Sharma",
      authorizedDirector2: "Priya Mehta",
    },
  });

  const formData = form.watch();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Board_Resolution_Borrowing_Powers_${formData.companyName}`,
    onAfterPrint: () => toast({ title: "Print Complete" }),
  });
  
  const directorCount = [formData.authorizedDirector1, formData.authorizedDirector2].filter(Boolean).length;
  const directorNames = [formData.authorizedDirector1, formData.authorizedDirector2].filter(Boolean).join(' and ');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/legal-documents/board-resolutions" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Resolutions Library
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Board Resolution: Borrowing Powers (Bank Loan)</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate a resolution to authorize borrowing from a bank and empower directors to execute documents.
        </p>
      </div>
        <Card>
          <CardHeader>
            <CardTitle>Enter Resolution Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                 <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="meetingDate" render={({ field }) => (<FormItem className="max-w-xs"><FormLabel>Board Meeting Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="loanType" render={({ field }) => (<FormItem><FormLabel>Type of Facility</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Term Loan">Term Loan</SelectItem><SelectItem value="Cash Credit">Cash Credit</SelectItem><SelectItem value="Overdraft">Overdraft</SelectItem><SelectItem value="Working Capital Loan">Working Capital Loan</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Loan Amount Limit (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 </div>
                 <div className="space-y-2">
                    <FormLabel>Authorized Signatories</FormLabel>
                    <FormField control={form.control} name="authorizedDirector1" render={({ field }) => (<FormItem><FormControl><Input placeholder="Director 1 Name" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="authorizedDirector2" render={({ field }) => (<FormItem><FormControl><Input placeholder="Director 2 Name (Optional)" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Live Preview</CardTitle>
                    <CardDescription>
                        This is a live preview of the resolution. Use the button at the bottom to print or save.
                    </CardDescription>
                </CardHeader>
                <CardContent ref={printRef} className="p-8 border-dashed border-2 rounded-lg prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-center">
                        <h4 className="font-bold">{formData.companyName || '[Company Name]'}</h4>
                    </div>

                    <div className="mt-8">
                        <h4 className="font-bold text-center underline">CERTIFIED TRUE COPY OF THE RESOLUTION PASSED AT THE MEETING OF THE BOARD OF DIRECTORS</h4>
                    </div>
                    
                    <div className="mt-8 text-justify">
                        <p><strong className="uppercase">TO AVAIL CREDIT FACILITIES FROM {formData.bankName.toUpperCase() || '[BANK NAME]'}</strong></p>
                        <p><strong className="uppercase">RESOLVED THAT</strong> the consent of the Board of Directors of the Company be and is hereby accorded to avail a <strong>{formData.loanType || '[Loan Type]'}</strong> facility up to a limit of <strong>₹{formData.loanAmount.toLocaleString('en-IN')}</strong> from <strong>{formData.bankName || '[Bank Name]'}</strong>, on such terms and conditions as may be mutually agreed upon.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> for the purpose of availing the said credit facilities, <strong>{directorNames || '[Director(s) Name(s)]'}</strong>, Director(s) of the Company be and are hereby {directorCount > 1 ? 'jointly and severally' : 'severally'} authorized on behalf of the Company to sign and execute the necessary loan agreements, deeds of hypothecation, guarantees, and all other documents, forms, and papers as may be required by the bank.</p>
                        <p><strong className="uppercase">RESOLVED FURTHER THAT</strong> the common seal of the Company be affixed, if necessary, on any of the documents in the presence of any of the aforesaid Director(s) who shall sign the same in token thereof.</p>
                    </div>

                    <div className="mt-16">
                        <p className="font-bold">CERTIFIED TRUE COPY</p>
                        <p>For <strong>{formData.companyName || '[Company Name]'}</strong></p>
                        <div className="h-20"></div>
                        <p>(Director / Company Secretary)</p>
                        <p>DIN / Membership No.: ____________</p>
                    </div>
                </CardContent>
                <CardFooter>
                  {(() => {
                    const basePrice = pricing?.company_documents?.find(s => s.id === 'board_resolutions')?.price || 0;
                    const effectivePrice = userSubscriptionInfo
                      ? getEffectiveServicePrice(
                          basePrice,
                          userSubscriptionInfo.userType,
                          userSubscriptionInfo.subscriptionPlan,
                          "company_documents"
                        )
                      : basePrice;
                    return (
                      <OnDemandPayAndUseActions
                        userId={user?.uid || ''}
                        userEmail={user?.email || ''}
                        userName={user?.displayName || ''}
                        planId="board_resolutions_download"
                        planName="Board Resolution Download"
                        amount={effectivePrice}
                        fileName={`Board_Resolution_Borrowing_Powers_${formData.companyName}`}
                        contentRef={printRef}
                        documentType="board_resolutions"
                        documentName={`Board_Resolution_Borrowing_Powers_${formData.companyName}`}
                        metadata={{ source: "legal-documents" }}
                        showDocument={showDocument}
                        setShowDocument={setShowDocument}
                      />
                    );
                  })()}
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
