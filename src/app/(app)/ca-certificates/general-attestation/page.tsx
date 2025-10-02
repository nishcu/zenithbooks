
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
  clientName: z.string().min(3, "Client name is required."),
  clientAddress: z.string().min(10, "Client address is required."),
  certificateDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  subject: z.string().min(5, "Subject is required."),
  certificateBody: z.string().min(20, "Certificate body is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function GeneralAttestationPage() {
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
      documentName: `General Attestation - ${new Date().toISOString().split("T")[0]}`,
      clientName: "",
      clientAddress: "",
      certificateDate: new Date().toISOString().split("T")[0],
      subject: "",
      certificateBody: "This is to certify that based on the records produced before us and to the best of our knowledge and belief... ",
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
            router.push('/ca-certificates/general-attestation');
          }
        } else {
          toast({ variant: 'destructive', title: "Not Found", description: "The requested document draft could not be found." });
          router.push('/ca-certificates/general-attestation');
        }
        setIsLoading(false);
      }
      loadDocument();
    }
  }, [docId, user, form, router, toast]);

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
          documentType: 'general-attestation-certificate',
          documentName: formData.documentName,
          status: 'Draft',
          formData,
          createdAt: new Date(),
        });
        toast({ title: "Draft Saved!", description: `Saved "${formData.documentName}".` });
        router.push(`/ca-certificates/general-attestation?id=${docRef.id}`);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the draft.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setStep(2);
      toast({ title: "Draft Ready", description: "Review the certificate before proceeding." });
    } else {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill all required fields." });
    }
  };

  const handleCertificationRequest = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to make a request." });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "certificationRequests"), {
        reportType: "General Attestation Certificate",
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
  };

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin size-8 text-primary"/></div>;
    }
    if (step === 1) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Certificate Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <FormField control={form.control} name="documentName" render={({ field }) => (<FormItem><FormLabel>Document Name (for your reference)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
             <Separator/>
             <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>To (Client Name / Authority)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={form.control} name="clientAddress" render={({ field }) => (<FormItem><FormLabel>Client / Authority Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="certificateDate" render={({ field }) => (<FormItem><FormLabel>Date of Certificate</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject of Certificate</FormLabel><FormControl><Input placeholder="e.g., Certificate of Financial Solvency" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="certificateBody" render={({ field }) => (<FormItem><FormLabel>Body of the Certificate</FormLabel><FormControl><Textarea className="min-h-48" {...field} /></FormControl><FormMessage /></FormItem>)} />
          </CardContent>
          <CardFooter className="justify-between">
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>} Save Draft</Button>
            <Button type="button" onClick={handlePreview}>
              <ArrowRight className="mr-2" /> Preview Certificate
            </Button>
          </CardFooter>
        </Card>
      );
    }

    if (step === 2) {
      const formData = form.getValues();
      const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      const whatsappMessage = `Dear ${formData.clientName},\n\nPlease find attached the draft certificate regarding "${formData.subject}" for your review.\n\nThank you,\nS. KRANTHI KUMAR & Co.`;

      return (
        <Card>
          <CardHeader>
            <CardTitle>Final Preview</CardTitle>
            <CardDescription>Review the generated certificate. You can download, share, or send it for certification.</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="prose dark:prose-invert max-w-none border rounded-lg p-8 bg-card text-card-foreground">
              <header className="text-center border-b-2 pb-4 mb-8" style={{ borderColor: 'hsl(var(--sidebar-background))' }}>
                <h1 className="text-2xl font-bold m-0" style={{ color: 'hsl(var(--sidebar-background))' }}>S. KRANTHI KUMAR & Co.</h1>
                <p className="text-sm m-0">Chartered Accountants</p>
                <p className="text-xs m-0">H.No. 2-2-1130/2/A, G-1, Amberpet, Hyderabad-500013</p>
              </header>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="font-bold text-sm">To,</p>
                  <p>{formData.clientName}</p>
                  <p>{formData.clientAddress}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">UDIN: [UDIN GOES HERE]</p>
                  <p className="text-sm">Date: {new Date(formData.certificateDate).toLocaleDateString('en-GB', dateOptions)}</p>
                </div>
              </div>
              <h4 className="font-bold text-center underline my-6">{formData.subject.toUpperCase()}</h4>
              <p>{formData.certificateBody}</p>
              <div className="mt-24 text-right">
                <p className="font-bold">For S. KRANTHI KUMAR & Co.</p>
                <p>Chartered Accountants</p>
                <div className="h-20"></div>
                <p>(S. Kranthi Kumar)</p><p>Proprietor</p><p>Membership No: 224983</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2" /> Back to Edit</Button>
            <div className="flex gap-2">
              <ShareButtons
                contentRef={printRef}
                fileName={`Certificate_${formData.subject}`}
                whatsappMessage={whatsappMessage}
              />
              <Button type="button" className="ml-2" onClick={handleCertificationRequest} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <FileSignature className="mr-2" />}
                Request Certification
              </Button>
            </div>
          </CardFooter>
        </Card>
      );
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/ca-certificates" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Certificate Menu
      </Link>
      <div className="text-center">
        <h1 className="text-3xl font-bold">General Attestation Certificate</h1>
        <p className="text-muted-foreground">Generate a custom certificate for general attestation purposes.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderContent()}
        </form>
      </Form>
    </div>
  );
}
