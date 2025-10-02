
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ArrowLeft, FileSignature, ArrowRight, Printer, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { ShareButtons } from "@/components/documents/share-buttons";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";


const formSchema = z.object({
  documentName: z.string().min(3, "A document name is required for saving."),
  entityName: z.string().min(3, "Entity name is required."),
  entityType: z.enum(["Company", "LLP", "Partnership", "Private Limited Company"]),
  contributorName: z.string().min(3, "Contributor's name is required."),
  contributorType: z.enum(["Director", "Partner", "Shareholder"]),
  contributionAmount: z.coerce.number().positive("Amount must be a positive number."),
  contributionDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  contributionMode: z.enum(["Cash", "Cheque", "Bank Transfer"]),
  bankDetails: z.string().optional(),
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
    str += (n[1] != '00') ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != '00') ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != '00') ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != '00') ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim().charAt(0).toUpperCase() + str.trim().slice(1) + " Only";
}

export default function CapitalContributionCertificatePage() {
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
      documentName: `Capital Contribution - ${format(new Date(), 'yyyy-MM-dd')}`,
      entityName: "",
      entityType: "Company",
      contributorName: "",
      contributorType: "Director",
      contributionAmount: 100000,
      contributionDate: new Date().toISOString().split("T")[0],
      contributionMode: "Bank Transfer",
      bankDetails: "HDFC Bank, A/c No. XXXXXX1234, IFSC: HDFC0001234",
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
                    router.push('/ca-certificates/capital-contribution');
                }
            } else {
                 toast({variant: 'destructive', title: "Not Found", description: "The requested document draft could not be found."});
                 router.push('/ca-certificates/capital-contribution');
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
        toast({ title: "Draft Ready", description: "Review the certificate before printing." });
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
                  documentType: 'capital-contribution-certificate',
                  documentName: formData.documentName,
                  status: 'Draft',
                  formData,
                  createdAt: new Date(),
              });
              toast({title: "Draft Saved!", description: `Saved "${formData.documentName}".`});
              router.push(`/ca-certificates/capital-contribution?id=${docRef.id}`);
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
            reportType: "Capital Contribution Certificate",
            clientName: form.getValues("entityName"),
            requestedBy: user.displayName || user.email,
            userId: user.uid,
            requestDate: new Date(),
            status: "Pending",
            draftUrl: "#", // In a real app, this would be a URL to the generated PDF/data
            signedDocumentUrl: null,
            formData: form.getValues(),
        });
        toast({
            title: "Request Sent",
            description: "Your certification request has been sent to the admin for review."
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
             <Card>
                <CardHeader>
                    <CardTitle>Contribution Details</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                     <FormField control={form.control} name="documentName" render={({ field }) => (<FormItem><FormLabel>Document Name (for your reference)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <Separator />
                     <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="entityName" render={({ field }) => (<FormItem><FormLabel>Company / LLP / Firm Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="entityType" render={({ field }) => (<FormItem><FormLabel>Entity Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Company">Company</SelectItem><SelectItem value="LLP">LLP</SelectItem><SelectItem value="Partnership">Partnership</SelectItem><SelectItem value="Private Limited Company">Private Limited Company</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                     </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="contributorName" render={({ field }) => (<FormItem><FormLabel>Contributor's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="contributorType" render={({ field }) => (<FormItem><FormLabel>Contributor's Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Director">Director</SelectItem><SelectItem value="Partner">Partner</SelectItem><SelectItem value="Shareholder">Shareholder</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                     </div>
                     <div className="grid md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="contributionAmount" render={({ field }) => (<FormItem><FormLabel>Contribution Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="contributionDate" render={({ field }) => (<FormItem><FormLabel>Date of Contribution</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     </div>
                      <div className="grid md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="contributionMode" render={({ field }) => (<FormItem><FormLabel>Mode of Contribution</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="Cash">Cash</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="bankDetails" render={({ field }) => (<FormItem><FormLabel>Bank Details (if applicable)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     </div>
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
        const whatsappMessage = `Dear ${formData.contributorName},\n\nPlease find attached the Capital Contribution Certificate as requested.\n\nAmount: ₹${formData.contributionAmount.toLocaleString('en-IN')}\n\nThank you,\nS. KRANTHI KUMAR & Co.`;

        return (
             <Card>
                <CardHeader>
                    <CardTitle>Final Preview</CardTitle>
                    <CardDescription>Review the generated certificate. You can print it or send it for certification.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div ref={printRef} className="prose dark:prose-invert max-w-none border rounded-lg p-8 bg-card text-card-foreground">
                        <header className="text-center border-b-2 pb-4 mb-8" style={{ borderColor: 'hsl(var(--sidebar-background))' }}>
                            <h1 className="text-2xl font-bold m-0" style={{ color: 'hsl(var(--sidebar-background))' }}>S. KRANTHI KUMAR & Co.</h1>
                            <p className="text-sm m-0">Chartered Accountants</p>
                            <p className="text-xs m-0">H.No. 2-2-1130/2/A, G-1, Amberpet, Hyderabad-500013</p>
                            <p className="text-xs m-0">Email: skkandco@gmail.com</p>
                       </header>
                       <div className="flex justify-between items-start mb-6">
                            <div><p className="font-bold text-sm">TO WHOMSOEVER IT MAY CONCERN</p></div>
                            <div className="text-right">
                                <p className="font-semibold">UDIN: [UDIN GOES HERE]</p>
                                <p className="text-sm">Date: {new Date().toLocaleDateString('en-GB', dateOptions)}</p>
                            </div>
                        </div>
                        <h4 className="font-bold text-center underline my-6">CAPITAL CONTRIBUTION CERTIFICATE</h4>
                        <p>This is to certify that we have verified the books of accounts and other relevant records of <strong>M/s {formData.entityName}</strong>.</p>
                        <p>Based on our verification, we confirm that <strong>{formData.contributorName}</strong>, {formData.contributorType} of the {formData.entityType}, has contributed an amount of <strong>₹ {formData.contributionAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong> (Rupees {numberToWords(formData.contributionAmount)} only) towards their capital contribution on <strong>{new Date(formData.contributionDate).toLocaleDateString('en-GB', dateOptions)}</strong>.</p>
                        <p>The contribution was made via {formData.contributionMode}. {formData.contributionMode !== 'Cash' && `The details are as follows: ${formData.bankDetails}`}</p>
                         <p className="mt-8 text-xs">This certificate is issued based on the information and records produced before us by the management and is true to the best of our knowledge and belief.</p>
                        <div className="mt-24 text-right">
                            <p className="font-bold">For S. KRANTHI KUMAR & Co.</p>
                            <p>Chartered Accountants</p>
                            <div className="h-20"></div>
                            <p>(S. Kranthi Kumar)</p><p>Proprietor</p><p>Membership No: 224983</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between">
                     <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2"/> Back to Edit</Button>
                     <div className="flex gap-2">
                         <ShareButtons
                            contentRef={printRef}
                            fileName={`Capital_Contribution_${formData.entityName}`}
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
        <h1 className="text-3xl font-bold">Capital Contribution Certificate</h1>
        <p className="text-muted-foreground">Generate a certificate for capital contributed by a director or partner.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
            {renderContent()}
        </form>
      </Form>
    </div>
  );
}
