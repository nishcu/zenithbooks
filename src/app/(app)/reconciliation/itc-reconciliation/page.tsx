
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GitCompareArrows, Loader2, Wand2, ArrowLeft } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { reconcileItcAction } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

// Helper to convert file to Data URI
const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const itcReconSchema = z.object({
    gstr2b: z.custom<File>(val => val instanceof File, "GSTR-2B JSON file is required."),
});


export default function ItcReconciliationPage() {
    const { toast } = useToast();
    const [itcReconResult, setItcReconResult] = useState<string | null>(null);
    const [isItcLoading, setIsItcLoading] = useState(false);

    const itcReconForm = useForm<z.infer<typeof itcReconSchema>>({
        resolver: zodResolver(itcReconSchema),
    });

    async function onItcReconSubmit(values: z.infer<typeof itcReconSchema>) {
        setIsItcLoading(true);
        setItcReconResult(null);
        try {
            const gstr2bDataUri = await fileToDataUri(values.gstr2b);
            const result = await reconcileItcAction({ gstr2bDataUri, purchaseBills: "" }); // Purchase bills are handled on server
            if (result?.reconciliationResults) {
                setItcReconResult(result.reconciliationResults);
                toast({ title: "ITC Reconciliation Complete" });
            } else {
                toast({ variant: 'destructive', title: 'Reconciliation Failed', description: 'Could not get ITC reconciliation results.' });
            }
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'An Error Occurred', description: error.message || 'An unexpected error occurred during ITC reconciliation.' });
        } finally {
            setIsItcLoading(false);
        }
    }


    return (
        <div className="space-y-8">
            <Link href="/reconciliation" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                Back to Reconciliation
            </Link>
             <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4">
                    <Wand2 className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">AI-Powered ITC Reconciliation</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                   Upload your GSTR-2B JSON file. The AI will compare it with your purchase records to find mismatches and suggest corrections, helping you claim the maximum eligible Input Tax Credit.
                </p>
            </div>

            <Card className="max-w-3xl mx-auto w-full">
                <CardHeader>
                    <CardTitle>Upload GSTR-2B</CardTitle>
                    <CardDescription>Select the GSTR-2B JSON file downloaded from the GST portal.</CardDescription>
                </CardHeader>
                <Form {...itcReconForm}>
                    <form onSubmit={itcReconForm.handleSubmit(onItcReconSubmit)}>
                        <CardContent className="space-y-4">
                             <FormField
                                control={itcReconForm.control}
                                name="gstr2b"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>GSTR-2B File (.json)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="file" 
                                                accept=".json"
                                                onChange={(e) => onChange(e.target.files?.[0])}
                                                {...rest}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isItcLoading} className="w-full sm:w-auto">
                                {isItcLoading ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2"/>}
                                Reconcile ITC
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
                {itcReconResult && (
                    <CardContent>
                         <Alert>
                            <Wand2 className="h-4 w-4" />
                            <AlertTitle>AI-Generated Reconciliation Report</AlertTitle>
                            <AlertDescription className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
                               {itcReconResult}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
