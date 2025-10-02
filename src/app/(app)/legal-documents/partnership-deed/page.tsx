
"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel, FormDescription } from "@/components/ui/form";
import {
  ArrowLeft,
  ArrowRight,
  PlusCircle,
  Trash2,
  Wand2,
  Loader2,
  Save,
  Printer,
  FileDown
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { suggestClausesAction } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from "@/components/ui/table";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";


const partnerSchema = z.object({
  name: z.string().min(2, "Partner name is required."),
  parentage: z.string().min(3, "S/o, W/o, or D/o is required."),
  age: z.coerce.number().positive("Age must be a positive number.").default(30),
  address: z.string().min(10, "Address is required."),
  occupation: z.string().min(2, "Occupation is required."),
  designation: z.string().min(2, "Designation is required (e.g., President, Member)."),
  capitalContribution: z.coerce.number().min(0, "Capital Contribution must be positive or zero."),
  profitShare: z.coerce.number().min(0, { message: "Cannot be negative" }).max(100, { message: "Cannot exceed 100" }),
  isDesignated: z.boolean().default(false),
});

const formSchema = z.object({
  documentName: z.string().min(3, "Document name is required."),
  firmName: z.string().min(3, "Firm name is required."),
  firmAddress: z.string().min(10, "Firm address is required."),
  businessActivity: z.string().min(10, "Business activity description is required."),
  commencementDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  partnershipDuration: z.enum(["at-will", "fixed-term"]),
  termYears: z.coerce.number().optional(),
  
  partners: z.array(partnerSchema).min(2, "At least two partners are required.")
    .refine(partners => partners.filter(p => p.isDesignated).length >= 2, {
        message: "At least two partners must be designated partners.",
    }).refine(partners => {
        const totalProfitShare = partners.reduce((acc, p) => acc + p.profitShare, 0);
        return Math.abs(totalProfitShare - 100) < 0.01;
    }, {
        message: "Total profit share for all partners must equal 100%.",
        path: ["root"],
    }),
  
  totalCapital: z.coerce.number().min(0, "Total capital cannot be negative."),

  interestOnCapital: z.coerce.number().min(0).max(12, "As per IT Act, max 12% is allowed.").optional().default(12),
  partnerRemuneration: z.coerce.number().min(0).optional().default(0),
  
  bankAuthority: z.enum(["joint", "single", "specific"]),
  specificPartner: z.string().optional(),

  admissionProcedure: z.string().optional(),
  retirementProcedure: z.string().optional(),
  dissolutionGrounds: z.string().optional(),

  arbitration: z.boolean().default(true),
  arbitrationCity: z.string().optional(),
  
  extraClauses: z.string().optional(),
}).refine(data => {
    const totalContribution = data.partners.reduce((acc, p) => acc + p.capitalContribution, 0);
    // Allow a small tolerance for floating point issues
    return Math.abs(totalContribution - data.totalCapital) < 0.01;
}, {
    message: "Total capital contribution from partners must match the Firm's total capital.",
    path: ["totalCapital"],
});


type FormData = z.infer<typeof formSchema>;


// #region Printable Components

const Form1ToPrint = React.forwardRef<HTMLDivElement, { formData: FormData }>(({ formData }, ref) => (
    <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none bg-white p-8 text-black leading-relaxed">
        <h4 className="font-bold text-center">Form No. 1</h4>
        <p className="text-xs text-center">Rule 4 (II)</p>
        <h5 className="font-bold text-center">THE INDIAN PARTNERSHIP ACT, 1932</h5>
        <h5 className="font-bold text-center">Application for Registration of Firm by the Name</h5>
        <p>Presented or forward to the registrar of Firm and for filing by M/s {(formData.firmName || "[Firm Name]").toUpperCase()}</p>
        <p>We, the undersigned being the partners of the *Firm M/s {(formData.firmName || "[Firm Name]").toUpperCase()} hereby apply for registration of the said firm and for that purpose supply the following particulars in pursuance of section 58 of the Indian Partnership Act, 1932.</p>
        <table className="w-full my-4">
            <tbody>
                <tr><td className="w-1/3 align-top">Name of the Firm :</td><td>M/s {(formData.firmName || "[Firm Name]").toUpperCase()}</td></tr>
                <tr className="h-4"></tr>
                <tr><td className="w-1/3 align-top">Place of Business: <br/> (a) Principal <br/> (b) Other Place</td><td>(a) {formData.firmAddress || "[Firm Address]"} <br/> (b) NIL</td></tr>
            </tbody>
        </table>
        <table className="w-full my-4 border-collapse border border-black">
            <thead><tr className="bg-gray-200"><th className="border border-black p-1">Name of the Partner</th><th className="border border-black p-1">Address of the Partner</th><th className="border border-black p-1">Date of Joining</th></tr></thead>
            <tbody>
                {formData.partners.map((p, i) => (
                    <tr key={i}><td className="border border-black p-1">{p.name}</td><td className="border border-black p-1">{p.address}</td><td className="border border-black p-1">{formData.commencementDate ? new Date(formData.commencementDate).toLocaleDateString('en-IN') : ''}</td></tr>
                ))}
            </tbody>
        </table>
        <div className="flex justify-between mt-16">
            <div>
                <p>Place:</p>
                <p>Date:</p>
            </div>
            <div>
                <p>Signatures</p>
                {formData.partners.map((p, i) => <p key={i} className="mt-8">({i+1})</p>)}
            </div>
        </div>
    </div>
));
Form1ToPrint.displayName = 'Form1ToPrint';

const DeclarationToPrint = React.forwardRef<HTMLDivElement, { formData: FormData }>(({ formData }, ref) => (
    <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none bg-white p-8 text-black leading-relaxed space-y-8">
        <h5 className="font-bold text-center">DECLARATION BY PARTNERS</h5>
        {formData.partners.map((p, i) => (
            <div key={i}>
                <p>I {p.name}, {p.parentage}, {p.age} Years of age HINDU religion do hereby declare that the above statement is true and correct to the best of my knowledge and belief.</p>
                <div className="flex justify-between mt-8"><span>Date:</span><span>Signature .........</span></div>
                <p>Witness</p>
            </div>
        ))}
    </div>
));
DeclarationToPrint.displayName = 'DeclarationToPrint';

const ProformaToPrint = React.forwardRef<HTMLDivElement, { formData: FormData }>(({ formData }, ref) => (
    <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none bg-white p-8 text-black leading-relaxed">
        <h5 className="font-bold text-center">PROFORMA</h5>
        <p className="text-xs text-center">PHOTOGRAPHS AND FINGERPRINTS AS PER SECTION 32A OF REGISTRATION ACT,1908.</p>
         <table className="w-full my-4 border-collapse border border-black">
             <thead>
                <tr className="bg-gray-200 text-center text-xs">
                    <th className="border border-black p-1">FINGER PRINT S.NO: IN BLACKINK (LEFT THUMB)</th>
                    <th className="border border-black p-1">PASSPORT SIZE PHOTOGRAPH (BLACK & WHITE)</th>
                    <th className="border border-black p-1">NAME & PERMANENT POSTAL ADDRESS OF PRESENTANT / SELLER/ BUYER</th>
                </tr>
             </thead>
             <tbody>
                {formData.partners.map((p, i) => (
                    <tr key={i}>
                        <td className="border border-black h-32"></td>
                        <td className="border border-black h-32"></td>
                        <td className="border border-black h-32 p-1 text-xs">{p.name}<br/>{p.parentage}<br/>{p.address}</td>
                    </tr>
                ))}
             </tbody>
         </table>
         <div className="flex justify-between mt-16 text-sm">
            <p><strong>SIGNATURE OF WITNESSES</strong></p>
            <p><strong>SIGNATURE OF EXECUTANTS</strong></p>
         </div>
    </div>
));
ProformaToPrint.displayName = 'ProformaToPrint';


const PartnershipDeedToPrint = React.forwardRef<HTMLDivElement, { formData: FormData }>(({ formData }, ref) => {
    const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('en-GB', dateOptions);
    const commencementDateFormatted = formData.commencementDate ? new Date(formData.commencementDate).toLocaleDateString('en-GB', dateOptions) : "[Date]";

    return (
        <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none bg-white p-8 text-black leading-relaxed">
            <h2 className="text-center font-bold">PARTNERSHIP DEED</h2>
            <h3 className="text-center font-bold">{(formData.firmName || "[Firm Name]").toUpperCase()}</h3>
            
            <p>This Deed of Partnership is executed on this the <strong>{formattedDate}</strong>, by and between:-</p>
            
            <ol className="list-decimal list-inside space-y-2">
                {formData.partners.map((p, i) => (
                <li key={i}>
                    <strong>{p.name}</strong>, {p.parentage}, aged about {p.age} years, Occ: Business, R/o {p.address}. Hereinafter called the {i+1 === 1 ? '1st' : i+1 === 2 ? '2nd' : `${i+1}th`} Partner.
                </li>
                ))}
            </ol>
            
            <p>(Collectively referred to as “Partners” and individually as a “Partner”).</p>
            <p>WHEREAS both the Partners hereinabove mentioned have mutually agreed to enter into partnership to do business in "<strong>{formData.businessActivity || '[Business Activity]'}</strong>" under the name & style of "<strong>{(formData.firmName || "[Firm Name]").toUpperCase()}</strong>", with effect from today, i.e. the {formattedDate}.</p>
            <p>AND WHEREAS both the Partners hereto have decided to reduce the terms and conditions of this instrument into writing so as to avoid misunderstandings, which may arise in future.</p>
            
            <h4 className="font-bold mt-4">NOW THIS DEED OF PARTNERSHIP WITNESSETH AS UNDER:-</h4>
            
            <ol className="list-decimal list-inside space-y-3">
                <li>The Name of the partnership business shall be “<strong>{(formData.firmName || "[Firm Name]").toUpperCase()}</strong>” and such other names as the partners may decide from time to time.</li>
                <li>The Principal place of business shall be at “<strong>{formData.firmAddress || '[Firm Address]'}</strong>” and such other places may decide from time to time.</li>
                <li>The Partnership has come into existence with effect from today, i.e. the {commencementDateFormatted}, and the term of the partnership shall be “<strong>{formData.partnershipDuration === 'at-will' ? 'At Will' : `for a fixed term of ${formData.termYears || '...'} years`}</strong>”.</li>
                <li>The Objects of the Partnership shall be to do business in "<strong>{formData.businessActivity || '[Business Activity]'}</strong>” and such other business as the partners may decide from time to time.</li>
                <li>The capital required for the purpose of the partnership business shall be contributed and arranged by the partners from time to time as and when needed in such manner as may be mutually agreed upon.</li>
                <li className="font-bold italic text-center my-4">(Conti.........Page 2)</li>
                <div className="break-before-page"></div>
                <h4 className="font-bold text-center">Page 2</h4>
                <li>The Partners shall share the profits and bear the losses of the partnership business as under:
                    <table className="w-full my-2 border border-black">
                        <thead>
                            <tr className="border-b border-black bg-gray-200">
                                <th className="p-1 border-r border-black">S.No.</th>
                                <th className="p-1 border-r border-black text-left">Name of the Partners</th>
                                <th className="p-1 text-right">Share of Profit/Loss</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.partners.map((p, i) => (
                                <tr key={p.name} className="border-b border-black">
                                    <td className="p-1 border-r border-black text-center">{i+1}.</td>
                                    <td className="p-1 border-r border-black">{p.name}</td>
                                    <td className="p-1 text-right">{p.profitShare}%</td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-gray-200">
                                <td colSpan={2} className="p-1 border-r border-black text-right">Total</td>
                                <td className="p-1 text-right">100%</td>
                            </tr>
                        </tbody>
                    </table>
                    The divisible profits and losses shall be arrived at after providing for the interest on the accounts of the partners and remuneration to working partners as hereinafter provided for as per the terms of this partnership deed.
                </li>
                <li>The Partners shall be entitled for interest at the rate of <strong>{formData.interestOnCapital}% per annum</strong> or such other higher rate as may be prescribed under the Income Tax Act on the amount outstanding to their respective capital accounts. In case of Loss or lower income, the interest can be NIL or lower than aforementioned rate, as the partners may decide from time to time.</li>
                <li>The firm shall not be dissolved on death or retirement of any one or more of the partners unless the remaining partners with mutual consent decide otherwise.</li>
                {formData.extraClauses && <li><strong>ADDITIONAL CLAUSES:</strong> {formData.extraClauses}</li>}
            </ol>

            <p className="mt-8">IN WITNESS WHEREOF, the Partners hereto have signed this Agreement on the day, month and year first above written.</p>
            
            <div className="grid grid-cols-2 gap-16 mt-16">
                {formData.partners.map(p => (
                    <div key={p.name} className="text-center">
                        <p className="mb-12">_________________________</p>
                        <p>({p.name})</p>
                    </div>
                ))}
            </div>
            <div className="mt-16">
                <p className="font-bold">Witnesses:</p>
                <ol className="list-decimal list-inside mt-8 space-y-8">
                    <li>
                        <p>Name & Signature: _________________________</p>
                        <p>Address: _______________________</p>
                    </li>
                    <li>
                        <p>Name & Signature: _________________________</p>
                        <p>Address: _______________________</p>
                    </li>
                </ol>
            </div>
        </div>
    );
});
PartnershipDeedToPrint.displayName = 'PartnershipDeedToPrint';


const CertificateToPrint = React.forwardRef<HTMLDivElement, { formData: FormData }>(({ formData }, ref) => {
    const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    return (
        <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none bg-white p-8 text-black leading-relaxed">
            <h3 className="text-center font-bold">CERTIFICATE</h3>
            <p>WE THE PARTNERS OF “{(formData.firmName || "[Firm Name]").toUpperCase()}”, {formData.firmAddress?.split(',').pop()?.trim() || '[City]'}. DO HEREBY THAT THE ATTACHED IS A COPY OF PARTNERSHIP DEED, WHICH WAS EXECUTED BY US ON {formData.commencementDate ? new Date(formData.commencementDate).toLocaleDateString('en-GB', dateOptions) : '[Date]'}.</p>
            <p>THE DEED WAS RUNNING INTO THREE PAGES AND OUT OF THEM THE FIRST PAGE WERE PRINTED ON THE NON-JUDICIAL STAMP PAPERS IN FRANKLIN DATED {formData.commencementDate ? new Date(formData.commencementDate).toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit', year: 'numeric'}) : '[Date]'} WITH NO</p>
            <div className="mt-16 text-right">
                <p>Signature of the Partners:</p>
                {formData.partners.map((p, i) => (<p key={i} className="mt-8">{i + 1}.</p>))}
            </div>
        </div>
    );
});
CertificateToPrint.displayName = 'CertificateToPrint';

const AffidavitToPrint = React.forwardRef<HTMLDivElement, { formData: FormData; deponent: z.infer<typeof partnerSchema> | undefined }>
(({ formData, deponent }, ref) => {
    if (!deponent) return (<div ref={ref}>Please select a deponent.</div>);
    return (
        <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none bg-white p-8 text-black leading-relaxed">
            <h3 className="text-center font-bold">AFFIDAVIT</h3>
            <p>I {deponent.name}, {deponent.parentage} R/o “{deponent.address}” holding (Aadhar ...), do hereby solemnly affirm and state that as follows:</p>
            <p>That I am the owner of the above mentioned property at “{deponent.address}”.</p>
            <p>We are doing partnership business in the name and style of M/s “{formData.firmName}”  and which is managed by me i.e. {deponent.name} at R/o “{deponent.address}” which is owned by me and I am not charging any rent for running this partnership business.</p>
            <p>I do hereby declare and confirm that the contents of the affidavit are true and correct to the best of my knowledge and belief and nothing material has been concealed.</p>
            <div className="flex justify-between mt-16">
                <div>
                    <p>Place:</p>
                    <p>Date:</p>
                </div>
                <div>
                    <p>Deponent Signature</p>
                </div>
            </div>
        </div>
    );
});
AffidavitToPrint.displayName = 'AffidavitToPrint';

// #endregion

export default function PartnershipDeedPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');

  const [step, setStep] = useState(1);
  const [isSuggestingClauses, setIsSuggestingClauses] = useState(false);
  const [deponentId, setDeponentId] = useState('');
  
  const printRefForm1 = React.useRef<HTMLDivElement>(null);
  const printRefDeclaration = React.useRef<HTMLDivElement>(null);
  const printRefProforma = React.useRef<HTMLDivElement>(null);
  const printRefDeed = React.useRef<HTMLDivElement>(null);
  const printRefCertificate = React.useRef<HTMLDivElement>(null);
  const printRefAffidavit = React.useRef<HTMLDivElement>(null);


  const [user, authLoading] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!docId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentName: `Partnership Deed - ${new Date().toISOString().split("T")[0]}`,
      firmName: "",
      firmAddress: "",
      businessActivity: "",
      commencementDate: new Date().toISOString().split("T")[0],
      partnershipDuration: "at-will",
      partners: [
        { name: "", parentage: "", age: 30, address: "", occupation: "", designation: "Partner", capitalContribution: 50000, profitShare: 50, isDesignated: true },
        { name: "", parentage: "", age: 30, address: "", occupation: "", designation: "Partner", capitalContribution: 50000, profitShare: 50, isDesignated: true },
      ],
      totalCapital: 100000,
      interestOnCapital: 12,
      partnerRemuneration: 0,
      bankAuthority: "joint",
      admissionProcedure: "A new partner may be admitted with the mutual consent of all existing partners.",
      retirementProcedure: "A partner may retire by giving a written notice of at least 90 days to other partners.",
      dissolutionGrounds: "The firm shall be dissolved by mutual consent of all partners.",
      arbitration: true,
      arbitrationCity: "Mumbai",
      extraClauses: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "partners",
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
            toast({ variant: 'destructive', title: "Unauthorized" });
            router.push('/legal-documents/partnership-deed');
          }
        } else {
          toast({ variant: 'destructive', title: "Not Found" });
          router.push('/legal-documents/partnership-deed');
        }
        setIsLoading(false);
      }
      loadDocument();
    }
  }, [docId, user, form, router, toast]);

  const partnersWatch = form.watch("partners");
  const totalProfitShare = partnersWatch.reduce((acc, partner) => acc + (Number(partner.profitShare) || 0), 0);

  useEffect(() => {
    const partners = form.getValues("partners");
    if (partners.length > 0 && !deponentId) {
        setDeponentId(partners[0].name);
    }
  }, [form, deponentId]);

  const formData = form.watch();
  
  const handleDownloadPdf = (contentRef: React.RefObject<HTMLDivElement>, fileName: string) => {
    const element = contentRef.current;
    if (!element) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find the content to download.",
      });
      return;
    }

    toast({
      title: "Generating PDF...",
      description: "Your document is being prepared for download.",
    });

    const opt = {
      margin: 0.5,
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().from(element).set(opt).save();
  };

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
                  documentType: 'partnership-deed',
                  documentName: formData.documentName,
                  status: 'Draft',
                  formData,
                  createdAt: new Date(),
              });
              toast({title: "Draft Saved!", description: `Saved "${formData.documentName}".`});
              router.push(`/legal-documents/partnership-deed?id=${docRef.id}`);
          }
      } catch (e) {
          console.error(e);
          toast({variant: 'destructive', title: 'Save Failed', description: 'Could not save the draft.'});
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleSuggestClauses = async () => {
    const businessActivity = form.getValues("businessActivity");
    if (!businessActivity) {
      form.setError("businessActivity", {type: "manual", message: "Business activity is required to suggest clauses."});
      return;
    }
    setIsSuggestingClauses(true);
    try {
        const existingClauses = form.getValues("extraClauses");
        const result = await suggestClausesAction({
            documentType: "LLP Agreement",
            businessActivity,
            existingClauses: existingClauses || ""
        });
        if(result?.suggestedClauses && result.suggestedClauses.length > 0) {
            const newClausesText = result.suggestedClauses.map(c => `\n\n${c.title.toUpperCase()}\n${c.clauseText}`).join('');
            form.setValue("extraClauses", (existingClauses || "") + newClausesText);
            toast({ title: "AI Clauses Added", description: "Suggested clauses have been appended." });
        } else {
             toast({ variant: "destructive", title: "Suggestion Failed", description: "Could not generate clauses." });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "An error occurred while generating clauses." });
    } finally {
        setIsSuggestingClauses(false);
    }
  }


  const processStep = async () => {
    let fieldsToValidate: (keyof FormData | `partners.${number}.${keyof z.infer<typeof partnerSchema>}` | "partners")[] = [];
    switch (step) {
        case 1:
            fieldsToValidate = ["documentName", "firmName", "firmAddress", "businessActivity", "commencementDate", "partnershipDuration"];
            break;
        case 2:
            fieldsToValidate = ["partners", "totalCapital"];
            break;
        case 3:
            fieldsToValidate = ["interestOnCapital", "partnerRemuneration"];
            break;
        case 4:
            fieldsToValidate = ["bankAuthority"];
            if (form.getValues("bankAuthority") === 'specific' && !form.getValues("specificPartner")) {
                form.setError("specificPartner", { type: 'manual', message: "Please select a partner."});
                return;
            }
            break;
        case 5:
            fieldsToValidate = ["admissionProcedure", "retirementProcedure", "dissolutionGrounds"];
            break;
        case 6:
            fieldsToValidate = ["arbitration", "arbitrationCity"];
            break;
        case 7:
            fieldsToValidate = ["extraClauses"];
            break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
       if (step < 8) {
        toast({ title: `Step ${step} Saved`, description: `Proceeding to step ${step + 1}.` });
      }
    } else {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please correct the errors on this page before proceeding.",
        });
    }
  };

  const handleBack = () => setStep(prev => prev - 1);

  const renderStep = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin size-8 text-primary"/></div>;
    }
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader><CardTitle>Step 1: Firm Details</CardTitle><CardDescription>Enter the basic details of your partnership firm.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="documentName" render={({ field }) => ( <FormItem><FormLabel>Document Name</FormLabel><FormControl><Input placeholder="A name to identify this draft" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="firmName" render={({ field }) => ( <FormItem><FormLabel>Firm Name</FormLabel><FormControl><Input placeholder="e.g., Acme Innovations" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="firmAddress" render={({ field }) => ( <FormItem><FormLabel>Principal Place of Business</FormLabel><FormControl><Textarea placeholder="Full registered address of the firm" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="businessActivity" render={({ field }) => ( <FormItem><FormLabel>Nature of Business</FormLabel><FormControl><Textarea placeholder="e.g., Trading of textiles, providing software consultancy services, etc." {...field} /></FormControl><FormMessage /></FormItem> )}/>
               <div className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="commencementDate" render={({ field }) => ( <FormItem><FormLabel>Date of Commencement</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   <FormField control={form.control} name="partnershipDuration" render={({ field }) => (
                    <FormItem><FormLabel>Duration of Partnership</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="at-will">Partnership at Will</SelectItem>
                                <SelectItem value="fixed-term">Fixed Term Partnership</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                  )}/>
               </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>} Save Draft</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Partner & Contribution Details</CardTitle><CardDescription>Add details for each partner and their contribution.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="totalCapital" render={({ field }) => (<FormItem><FormLabel>Total Capital Contribution of Firm (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              {form.formState.errors.totalCapital && <p className="text-sm font-medium text-destructive">{form.formState.errors.totalCapital.message}</p>}
              <Separator />
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                  <h3 className="font-medium">Partner {index + 1}</h3>
                  {fields.length > 2 && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  
                  <div className="grid md:grid-cols-3 gap-4">
                     <FormField control={form.control} name={`partners.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField control={form.control} name={`partners.${index}.parentage`} render={({ field }) => ( <FormItem><FormLabel>S/o, W/o, D/o</FormLabel><FormControl><Input placeholder="e.g., S/o John Doe" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField control={form.control} name={`partners.${index}.age`} render={({ field }) => ( <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                   <FormField control={form.control} name={`partners.${index}.address`} render={({ field }) => ( <FormItem><FormLabel>Residential Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField control={form.control} name={`partners.${index}.capitalContribution`} render={({ field }) => ( <FormItem><FormLabel>Capital Contribution (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`partners.${index}.profitShare`} render={({ field }) => ( <FormItem><FormLabel>Profit/Loss Share (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`partners.${index}.occupation`} render={({ field }) => ( <FormItem><FormLabel>Occupation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`partners.${index}.designation`} render={({ field }) => ( <FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="President, Member..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`partners.${index}.isDesignated`} render={({ field }) => ( <FormItem className="flex flex-row items-center justify-start gap-2 pt-8"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id={`isDesignated-${index}`} /></FormControl><Label className="font-normal" htmlFor={`isDesignated-${index}`}>Designated Partner</Label></FormItem> )}/>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => append({ name: "", parentage: "", age: 30, address: "", occupation: "", designation: "Partner", capitalContribution: 0, profitShare: 0, isDesignated: false })}><PlusCircle className="mr-2"/> Add Partner</Button>
              {form.formState.errors.partners?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.partners.root.message}</p>}
               {totalProfitShare !== 100 && !form.formState.errors.partners?.root && (
                    <div className="text-sm font-medium text-destructive">Total profit share must be 100%. Current total: {totalProfitShare.toFixed(2)}%</div>
                )}
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="mr-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
          return (
            <Card>
                <CardHeader><CardTitle>Step 3: Capital & Remuneration</CardTitle><CardDescription>Define interest on capital and remuneration for working partners.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="interestOnCapital" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Interest on Capital (% p.a.)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormDescription>As per the Income Tax Act, the maximum deductible interest is 12% p.a. Enter 0 for no interest.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="partnerRemuneration" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Remuneration to Working Partners (₹ per month, per partner)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                             <FormDescription>This will be payable to partners marked as 'working partner'. Enter 0 for no remuneration.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </CardContent>
                <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="mr-2"/></Button></CardFooter>
            </Card>
          );
      case 4:
        return (
          <Card>
            <CardHeader><CardTitle>Step 4: Banking & Operations</CardTitle><CardDescription>Define how the firm's bank account will be operated.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
               <FormField control={form.control} name="bankAuthority" render={({ field }) => (
                <FormItem>
                    <FormLabel>Bank Account Operation Authority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="joint">Jointly by all partners</SelectItem>
                            <SelectItem value="single">Singly by any partner</SelectItem>
                            <SelectItem value="specific">By a specific designated partner</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage/>
                </FormItem>
               )}/>
               {form.watch("bankAuthority") === "specific" && (
                   <FormField control={form.control} name="specificPartner" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Select Specific Partner</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a partner"/></SelectTrigger></FormControl>
                            <SelectContent>
                                {form.getValues("partners").map((p, i) => p.name && <SelectItem key={i} value={p.name}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage/>
                    </FormItem>
                   )}/>
               )}
            </CardContent>
             <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="mr-2"/></Button></CardFooter>
          </Card>
        );
      case 5:
        return (
            <Card>
                <CardHeader><CardTitle>Step 5: Partner Lifecycle</CardTitle><CardDescription>Define procedures for admission, retirement, and dissolution.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                     <FormField control={form.control} name="admissionProcedure" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Admission of a New Partner</FormLabel>
                            <FormControl><Textarea {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="retirementProcedure" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Retirement of a Partner</FormLabel>
                            <FormControl><Textarea {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="dissolutionGrounds" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dissolution of the Firm</FormLabel>
                            <FormControl><Textarea {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </CardContent>
                 <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="mr-2"/></Button></CardFooter>
            </Card>
        );
       case 6:
        return (
            <Card>
                <CardHeader><CardTitle>Step 6: Dispute Resolution</CardTitle><CardDescription>Define how disputes among partners will be handled.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                     <FormField control={form.control} name="arbitration" render={({ field }) => (
                        <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> <Label>Include Arbitration Clause</Label></FormItem>
                    )}/>
                    {form.watch("arbitration") && (
                        <FormField control={form.control} name="arbitrationCity" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Jurisdiction / City for Arbitration</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormDescription>This will be the city where legal proceedings, if any, will take place.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    )}
                </CardContent>
                <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="mr-2"/></Button></CardFooter>
            </Card>
        );
     case 7:
         return (
          <Card>
            <CardHeader><CardTitle>Step 7: Additional Clauses</CardTitle><CardDescription>Add any custom clauses or use AI to suggest them based on your business.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="extraClauses" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Custom Clauses / Special Conditions</FormLabel>
                        <FormControl><Textarea className="min-h-48" placeholder="e.g., 'No partner shall engage in any competing business without the written consent of all other partners.'" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <Button type="button" onClick={handleSuggestClauses} disabled={isSuggestingClauses}>
                    {isSuggestingClauses ? <Loader2 className="animate-spin mr-2"/> : <Wand2 className="mr-2"/>}
                    Suggest Clauses with AI
                </Button>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Draft <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
     case 8:
        const deponent = formData.partners.find(p => p.name === deponentId);
        return (
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Final Step: Preview & Download Documents</CardTitle>
                        <CardDescription>Review and download the generated Partnership Deed and all supporting annexures required for registration.</CardDescription>
                    </CardHeader>
                     <CardFooter className="justify-start">
                        <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back to Edit</Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Main Document: Partnership Deed</CardTitle></CardHeader>
                    <CardContent><PartnershipDeedToPrint ref={printRefDeed} formData={formData} /></CardContent>
                    <CardFooter><Button onClick={() => handleDownloadPdf(printRefDeed, `Partnership_Deed_${formData.firmName}`)}><Printer className="mr-2"/> Download PDF</Button></CardFooter>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Annexure: Form No. 1</CardTitle><CardDescription>Application for Registration of Firm.</CardDescription></CardHeader>
                    <CardContent><Form1ToPrint ref={printRefForm1} formData={formData} /></CardContent>
                    <CardFooter><Button onClick={() => handleDownloadPdf(printRefForm1, `Form1_${formData.firmName}`)}><Printer className="mr-2"/> Download PDF</Button></CardFooter>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Annexure: Declaration by Partners</CardTitle></CardHeader>
                    <CardContent><DeclarationToPrint ref={printRefDeclaration} formData={formData} /></CardContent>
                    <CardFooter><Button onClick={() => handleDownloadPdf(printRefDeclaration, `Declaration_${formData.firmName}`)}><Printer className="mr-2"/> Download PDF</Button></CardFooter>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Annexure: Proforma for Photos & Fingerprints</CardTitle></CardHeader>
                    <CardContent><ProformaToPrint ref={printRefProforma} formData={formData} /></CardContent>
                    <CardFooter><Button onClick={() => handleDownloadPdf(printRefProforma, `Proforma_${formData.firmName}`)}><Printer className="mr-2"/> Download PDF</Button></CardFooter>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Annexure: Certificate of True Copy</CardTitle></CardHeader>
                    <CardContent><CertificateToPrint ref={printRefCertificate} formData={formData} /></CardContent>
                    <CardFooter><Button onClick={() => handleDownloadPdf(printRefCertificate, `Certificate_${formData.firmName}`)}><Printer className="mr-2"/> Download PDF</Button></CardFooter>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Annexure: Self-Affidavit for Business Premises</CardTitle>
                        <CardDescription>This affidavit is for a partner who is providing their own property for the business address without rent.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-xs mb-4">
                            <Label>Select Deponent (Partner making the affidavit)</Label>
                            <Select value={deponentId} onValueChange={setDeponentId}>
                                <SelectTrigger><SelectValue placeholder="Select a Partner"/></SelectTrigger>
                                <SelectContent>
                                    {formData.partners.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <AffidavitToPrint ref={printRefAffidavit} formData={formData} deponent={deponent} />
                    </CardContent>
                    <CardFooter><Button onClick={() => handleDownloadPdf(printRefAffidavit, `Affidavit_${deponent?.name}`)}><Printer className="mr-2"/> Download PDF</Button></CardFooter>
                </Card>
            </div>
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
        <h1 className="text-3xl font-bold">Partnership Deed Generator</h1>
        <p className="text-muted-foreground">Follow the steps to create your legal document.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
