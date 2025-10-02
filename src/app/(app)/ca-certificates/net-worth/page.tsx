
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
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableFooter as TableFoot, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ShareButtons } from "@/components/documents/share-buttons";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
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
        <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none p-8 leading-relaxed">
            <header className="text-center border-b-2 border-primary pb-4 mb-8">
                <h1 className="text-2xl font-bold text-primary m-0">S. KRANTHI KUMAR & Co.</h1>
                <p className="text-sm m-0">Chartered Accountants</p>
                <p className="text-xs m-0">H.No. 2-2-1130/2/A, G-1, Amberpet, Hyderabad-500013</p>
                <p className="text-xs m-0">Email: skkandco@gmail.com</p>
            </header>
            <h4 className="font-bold text-center">TO WHOM IT MAY CONCERN</h4>
            <h4 className="font-bold text-center underline">NET WORTH CERTIFICATE</h4>
            
            <p>This is to certify that the Net Worth of Sri <strong>{formData.clientName}</strong>, S/o (or other relation) [Parent's Name], R/o {formData.clientAddress} (PAN: <strong>{formData.clientPan}</strong>) as on <strong>{new Date(formData.asOnDate).toLocaleDateString('en-GB', dateOptions)}</strong> is as follows:</p>

            <h5 className="font-bold mt-4">A. ASSETS</h5>
             <Table>
                <TableHeader><TableRow><TableHead className="w-2/3">Description</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                <TableBody>
                    {formData.assets.map((a, i) => <TableRow key={i}><TableCell>{a.description}</TableCell><TableCell className="text-right font-mono">{a.value.toLocaleString('en-IN')}</TableCell></TableRow>)}
                </TableBody>
                <TableFoot><TableRow><TableCell className="font-bold">Total Assets</TableCell><TableCell className="text-right font-bold font-mono">{totalAssets.toLocaleString('en-IN')}</TableCell></TableRow></TableFoot>
            </Table>
            
            <h5 className="font-bold mt-4">B. LIABILITIES</h5>
             <Table>
                <TableHeader><TableRow><TableHead className="w-2/3">Description</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                <TableBody>
                     {formData.liabilities.map((l, i) => <TableRow key={i}><TableCell>{l.description}</TableCell><TableCell className="text-right font-mono">{l.value.toLocaleString('en-IN')}</TableCell></TableRow>)}
                </TableBody>
                 <TableFoot><TableRow><TableCell className="font-bold">Total Liabilities</TableCell><TableCell className="text-right font-bold font-mono">{totalLiabilities.toLocaleString('en-IN')}</TableCell></TableRow></TableFoot>
            </Table>

            <h5 className="font-bold mt-4">NET WORTH (A - B)</h5>
            <p>The net worth of <strong>{formData.clientName}</strong> as on {new Date(formData.asOnDate).toLocaleDateString('en-GB', dateOptions)} is <strong>₹{netWorth.toLocaleString('en-IN')}</strong> (Rupees {numberToWords(netWorth)} only).</p>

            <div className="mt-16">
                <p>This certificate is issued based on the information and records produced before us and is true to the best of our knowledge and belief.</p>
                <p className="mt-8 font-bold">For S. KRANTHI KUMAR & Co.</p>
                <p>Chartered Accountants</p>
                <div className="h-20"></div>
                <p>(S. Kranthi Kumar)</p>
                <p>Proprietor</p>
                <p>Membership No: 224983</p>
            </div>
        </div>
    );
});
CertificateToPrint.displayName = 'CertificateToPrint';


export default function NetWorthCertificatePage() {
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
      documentName: `Net Worth Certificate - ${format(new Date(), 'yyyy-MM-dd')}`,
      clientName: "",
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

  const handleCertificationRequest = async () => {
      if (!user) {
          toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to make a request." });
          return;
      }
      setIsSubmitting(true);
      try {
        await addDoc(collection(db, "certificationRequests"), {
            reportType: "Net Worth Certificate",
            clientName: form.getValues("clientName"),
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
            description: "Your certification request has been sent to the admin for review and signature."
        });
      } catch (error) {
          console.error("Error sending request:", error);
          toast({ variant: "destructive", title: "Request Failed", description: "Could not send the request. Please try again." });
      } finally {
          setIsSubmitting(false);
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
                        <FormField control={form.control} name="clientAddress" render={({ field }) => (<FormItem><FormLabel>Client's Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="clientPan" render={({ field }) => (<FormItem><FormLabel>Client's PAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="asOnDate" render={({ field }) => (<FormItem><FormLabel>Net Worth as on Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                    </CardContent>
                     <CardFooter className="justify-between">
                         <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>} Save Draft</Button>
                         <Button type="button" onClick={() => form.trigger(["clientName", "clientAddress", "clientPan", "asOnDate"]).then(isValid => isValid && setStep(2))}>Next <ArrowRight className="mr-2"/></Button>
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
            const whatsappMessage = `Dear ${formData.clientName},\n\nPlease find attached the Net Worth Certificate as on ${new Date(formData.asOnDate).toLocaleDateString('en-GB')}.\n\nThank you,\nS. KRANTHI KUMAR & Co.`;

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
                             <Button type="button" onClick={handleCertificationRequest} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <FileSignature className="mr-2"/>}
                                Request Certification
                            </Button>
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
