
"use client";

import { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel, FormDescription } from "@/components/ui/form";
import {
  ArrowLeft,
  ArrowRight,
  PlusCircle,
  Trash2,
  FileDown,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useReactToPrint } from "react-to-print";

const founderSchema = z.object({
  name: z.string().min(2, "Founder name is required."),
  address: z.string().min(10, "Address is required."),
  role: z.string().min(2, "Role/Title is required."),
  responsibilities: z.string().min(10, "Responsibilities are required."),
  equity: z.coerce.number().min(0).max(100),
  capitalContribution: z.coerce.number().min(0, "Capital contribution must be positive or zero."),
});

const formSchema = z.object({
  projectName: z.string().min(3, "Project/Company name is required."),
  projectDescription: z.string().min(10, "A brief description is required."),
  effectiveDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  
  founders: z.array(founderSchema).min(2, "At least two founders are required."),
  
  vestingYears: z.coerce.number().positive().default(4),
  vestingCliffMonths: z.coerce.number().min(0).default(12),
  
  nonCompeteYears: z.coerce.number().min(0).default(1),

  decisionMaking: z.enum(["unanimous", "majority"]).default("unanimous"),
  ipAssignment: z.string().default("All Intellectual Property (including any and all work product, inventions, and ideas) developed by any Founder related to the Project, during the term of their engagement with the Project, shall be the sole and exclusive property of the Company."),
  confidentiality: z.string().default("Founders agree to keep all proprietary information, technical data, trade secrets or know-how of the Project strictly confidential."),
  disputeResolution: z.string().default("Any disputes arising out of this Agreement shall first be attempted to be resolved through mutual negotiation. If unresolved within 30 days, disputes shall be subject to binding arbitration in [City] in accordance with the Arbitration and Conciliation Act, 1996."),
  
}).refine(data => {
    const totalEquity = data.founders.reduce((acc, f) => acc + f.equity, 0);
    return totalEquity === 100;
}, {
    message: "Total equity must equal 100%.",
    path: ["founders"],
});

type FormData = z.infer<typeof formSchema>;

export default function FoundersAgreementPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const printRef = useRef(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      projectDescription: "",
      effectiveDate: new Date().toISOString().split("T")[0],
      founders: [
        { name: "", address: "", role: "CEO", responsibilities: "Overall strategy and fundraising.", equity: 50, capitalContribution: 50000 },
        { name: "", address: "", role: "CTO", responsibilities: "Technology development and team management.", equity: 50, capitalContribution: 50000 },
      ],
      vestingYears: 4,
      vestingCliffMonths: 12,
      nonCompeteYears: 1,
      decisionMaking: "unanimous",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "founders",
  });
  
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const totalEquity = form.watch("founders").reduce((acc, founder) => acc + (founder.equity || 0), 0);

  const processStep = async () => {
    let fieldsToValidate: any[] = [];
    switch (step) {
        case 1:
            fieldsToValidate = ["projectName", "projectDescription", "effectiveDate", "founders"];
            break;
        case 2:
            fieldsToValidate = ["vestingYears", "vestingCliffMonths", "nonCompeteYears"];
            break;
        case 3:
            fieldsToValidate = ["decisionMaking", "ipAssignment", "confidentiality", "disputeResolution"];
            break;
    }
    
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(prev => prev + 1);
      if (step < 4) {
        toast({ title: `Step ${step} Saved`, description: `Proceeding to step ${step + 1}.` });
      }
    } else {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please correct the errors before proceeding.",
        });
    }
  };

  const handleBack = () => setStep(prev => prev - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader><CardTitle>Step 1: Project & Founders</CardTitle><CardDescription>Define the venture and its founding members.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
               <FormField control={form.control} name="projectName" render={({ field }) => ( <FormItem><FormLabel>Project / Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
               <FormField control={form.control} name="projectDescription" render={({ field }) => ( <FormItem><FormLabel>Project Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
               <FormField control={form.control} name="effectiveDate" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Agreement Effective Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <Separator />
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                  <h3 className="font-medium">Founder {index + 1}</h3>
                  {fields.length > 2 && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  
                  <FormField control={form.control} name={`founders.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                   <FormField control={form.control} name={`founders.${index}.address`} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name={`founders.${index}.role`} render={({ field }) => ( <FormItem><FormLabel>Role (e.g., CEO, CTO)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name={`founders.${index}.equity`} render={({ field }) => ( <FormItem><FormLabel>Equity Share (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <FormField control={form.control} name={`founders.${index}.responsibilities`} render={({ field }) => ( <FormItem><FormLabel>Primary Responsibilities</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name={`founders.${index}.capitalContribution`} render={({ field }) => ( <FormItem><FormLabel>Capital Contribution (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => append({ name: "", address: "", role: "", responsibilities: "", equity: 0, capitalContribution: 0 })}><PlusCircle className="mr-2"/> Add Founder</Button>
               {form.formState.errors.founders?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.founders.root.message}</p>}
               {totalEquity !== 100 && !form.formState.errors.founders?.root && <p className="text-sm font-medium text-destructive">Total equity must equal 100%. Current total: {totalEquity}%</p>}
            </CardContent>
            <CardFooter className="justify-end"><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Step 2: Equity Vesting & Restrictions</CardTitle><CardDescription>Define the schedule for earning equity and post-engagement restrictions.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold">Vesting Schedule</h3>
                    <p className="text-sm text-muted-foreground mb-4">A vesting schedule protects the company. If a founder leaves early, they only keep earned equity. The standard is a 4-year schedule with a 1-year cliff.</p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="vestingYears" render={({ field }) => ( <FormItem><FormLabel>Vesting Period (in Years)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>Total time to earn 100% of equity.</FormDescription><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="vestingCliffMonths" render={({ field }) => ( <FormItem><FormLabel>Vesting Cliff (in Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>If a founder leaves before the cliff, they get 0% equity.</FormDescription><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                <Separator/>
                <div>
                    <h3 className="text-lg font-semibold">Non-Compete Clause</h3>
                     <p className="text-sm text-muted-foreground mb-4">This prevents a founder from starting or joining a competing business for a certain period after leaving.</p>
                     <FormField control={form.control} name="nonCompeteYears" render={({ field }) => ( <FormItem className="max-w-xs"><FormLabel>Non-Compete Duration (in Years)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>Duration after leaving the company.</FormDescription><FormMessage /></FormItem> )}/>
                </div>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Next <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader><CardTitle>Step 3: Governance & IP</CardTitle><CardDescription>Define rules for decision-making and intellectual property.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
               <FormField control={form.control} name="decisionMaking" render={({ field }) => ( <FormItem><FormLabel>Decision Making for Major Issues</FormLabel>
                <FormControl>
                    <div className="flex gap-4">
                        <Button type="button" variant={field.value === 'unanimous' ? 'default' : 'outline'} onClick={() => field.onChange('unanimous')}>Unanimous Consent</Button>
                        <Button type="button" variant={field.value === 'majority' ? 'default' : 'outline'} onClick={() => field.onChange('majority')}>Majority Vote</Button>
                    </div>
                </FormControl>
               <FormDescription>How will major company decisions (e.g. fundraising, acquisition) be made?</FormDescription><FormMessage /></FormItem> )}/>
               <Separator/>
               <FormField control={form.control} name="ipAssignment" render={({ field }) => ( <FormItem><FormLabel>Intellectual Property (IP) Assignment</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
               <FormField control={form.control} name="confidentiality" render={({ field }) => ( <FormItem><FormLabel>Confidentiality</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
               <FormField control={form.control} name="disputeResolution" render={({ field }) => ( <FormItem><FormLabel>Dispute Resolution</FormLabel><FormControl><Textarea className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </CardContent>
            <CardFooter className="justify-between"><Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button><Button type="button" onClick={processStep}>Preview Draft <ArrowRight className="ml-2"/></Button></CardFooter>
          </Card>
        );
      case 4:
        const formData = form.getValues();
        return (
             <Card>
                <CardHeader><CardTitle>Final Step: Preview & Download</CardTitle><CardDescription>Review the generated Founders' Agreement.</CardDescription></CardHeader>
                <CardContent>
                    <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-6 bg-muted/20 leading-relaxed">
                        <h2 className="text-center font-bold">FOUNDERS' AGREEMENT</h2>
                        <p>This Founders' Agreement (the "Agreement") is made and entered into as of <strong>{new Date(formData.effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> (the "Effective Date"), by and among:</p>
                        
                        {formData.founders.map((p, i) => (
                        <div key={p.name} className="my-2">
                            <p><strong>{p.name}</strong>, residing at {p.address} (hereinafter referred to as "Founder {i + 1}"),</p>
                        </div>
                        ))}
                        <p>(Collectively referred to as the "Founders").</p>
                        
                        <h4 className="font-bold mt-4">1. PURPOSE</h4>
                        <p>The Founders agree to collaborate and establish a business venture under the proposed name <strong>{formData.projectName}</strong> (the “Company”), for the purpose of {formData.projectDescription}.</p>
                        
                        <h4 className="font-bold mt-4">2. ROLES & RESPONSIBILITIES</h4>
                        <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                            {formData.founders.map(p => (
                                <li key={p.name}><strong>{p.name} ({p.role}):</strong> {p.responsibilities}</li>
                            ))}
                        </ul>
                        <p>Day-to-day operations may be handled by each Founder within their defined roles. However, major strategic decisions shall require <strong>{formData.decisionMaking}</strong> consent.</p>


                        <h4 className="font-bold mt-4">3. EQUITY & OWNERSHIP</h4>
                        <p>Upon formation of a legal entity for the Company, the equity securities shall be allocated to the Founders as follows, subject to the vesting schedule in Clause 4:</p>
                        <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                            {formData.founders.map(p => (
                                <li key={p.name}><strong>{p.name}:</strong> {p.equity}%</li>
                            ))}
                        </ul>

                        <h4 className="font-bold mt-4">4. VESTING SCHEDULE</h4>
                        <p>The equity allocated to each Founder shall vest over a period of <strong>{formData.vestingYears} years</strong>, with a <strong>{formData.vestingCliffMonths}-month cliff</strong>. This means that if a Founder departs from the Project for any reason before the {formData.vestingCliffMonths}-month cliff is met, they shall forfeit all their equity. After the cliff, equity shall vest monthly in equal installments. Unvested shares of a departing Founder shall be returned to the Company.</p>
                        
                        <h4 className="font-bold mt-4">5. CAPITAL CONTRIBUTION</h4>
                        <p>The initial capital contribution by each Founder to the Company shall be as follows:</p>
                        <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                            {formData.founders.map(p => (
                                <li key={p.name}><strong>{p.name}:</strong> ₹{p.capitalContribution.toLocaleString('en-IN')}</li>
                            ))}
                        </ul>
                        <p>No Founder shall be entitled to interest on their capital contribution. Any additional capital contributions shall be decided mutually.</p>

                        <h4 className="font-bold mt-4">6. INTELLECTUAL PROPERTY (IP)</h4>
                        <p>{formData.ipAssignment}</p>

                        <h4 className="font-bold mt-4">7. DECISION-MAKING</h4>
                        <p>Strategic decisions, including but not limited to, fundraising, mergers, acquisitions, issuing new equity, selling the company, or changing the primary business focus, shall require the <strong>{formData.decisionMaking}</strong> approval of all Founders.</p>

                        <h4 className="font-bold mt-4">8. CONFIDENTIALITY & NON-COMPETE</h4>
                        <p>{formData.confidentiality} Furthermore, no Founder shall directly or indirectly engage in any business that competes with the Company, during their engagement and for a period of <strong>{formData.nonCompeteYears} year(s)</strong> after ceasing to be a Founder.</p>

                        <h4 className="font-bold mt-4">9. EXIT & TRANSFER OF SHARES (RIGHT OF FIRST REFUSAL)</h4>
                        <p>If a Founder wishes to sell or transfer their vested shares, they must first offer them to the remaining Founders in proportion to their existing holdings. This offer must be made in writing and shall be open for 30 days. Only if the remaining Founders decline to purchase the shares may they be offered to an external party on the same terms.</p>
                        
                        <h4 className="font-bold mt-4">10. DISPUTE RESOLUTION</h4>
                        <p>{formData.disputeResolution}</p>
                        
                        <h4 className="font-bold mt-4">11. TERM & TERMINATION</h4>
                        <p>This Agreement shall remain in full force and effect until it is superseded by a formal Shareholders’ Agreement upon the incorporation of the Company, or until the Project is mutually dissolved by the Founders.</p>
                        
                        <h4 className="font-bold mt-4">12. GOVERNING LAW</h4>
                        <p>This Agreement shall be governed by and construed in accordance with the laws of India.</p>

                        <p className="mt-8">IN WITNESS WHEREOF, the Founders have executed this Agreement as of the Effective Date.</p>
                        
                        <div className="grid grid-cols-2 gap-16 mt-16">
                            {formData.founders.map(p => (
                                <div key={p.name} className="text-left">
                                    <p className="mb-12">_________________________</p>
                                    <p><strong>{p.name}</strong></p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-16">
                            <p className="font-bold">WITNESSES:</p>
                            <div className="grid grid-cols-2 gap-16 mt-16">
                                <div>
                                    <p className="mb-12">1. _________________________</p>
                                    <p>Name: </p>
                                    <p>Address: </p>
                                </div>
                                <div>
                                    <p className="mb-12">2. _________________________</p>
                                    <p>Name: </p>
                                    <p>Address: </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between mt-6">
                  <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>
                  <Button type="button" onClick={handlePrint}><Printer className="mr-2"/> Print / Save as PDF</Button>
                </CardFooter>
            </Card>
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
        <h1 className="text-3xl font-bold">Founders’ Agreement Generator</h1>
        <p className="text-muted-foreground">Follow the steps to create an essential legal document for your startup.</p>
      </div>
      <Form {...form}>
        <form className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
}
