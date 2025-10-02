
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
import { compareGstrReportsAction } from '../actions';
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

const gstrCompareSchema = z.object({
    gstr1: z.custom<File>(val => val instanceof File, "GSTR-1 file is required."),
    gstr3b: z.custom<File>(val => val instanceof File, "GSTR-3B file is required."),
});

export default function GstrComparisonPage() {
    const { toast } = useToast();
    const [gstrCompareResult, setGstrCompareResult] = useState<string | null>(null);
    const [isGstrLoading, setIsGstrLoading] = useState(false);

    const gstrCompareForm = useForm<z.infer<typeof gstrCompareSchema>>({
        resolver: zodResolver(gstrCompareSchema),
    });

    async function onGstrCompareSubmit(values: z.infer<typeof gstrCompareSchema>) {
        setIsGstrLoading(true);
        setGstrCompareResult(null);
        try {
            const [gstr1DataUri, gstr3BDataUri] = await Promise.all([
                fileToDataUri(values.gstr1),
                fileToDataUri(values.gstr3b),
            ]);

            const result = await compareGstrReportsAction({ gstr1DataUri, gstr3BDataUri });
            if (result?.report) {
                setGstrCompareResult(result.report);
                toast({ title: "GSTR Comparison Complete" });
            } else {
                toast({ variant: 'destructive', title: 'Comparison Failed', description: 'Could not get GSTR comparison results.' });
            }
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'An Error Occurred', description: error.message || 'An unexpected error occurred during GSTR comparison.' });
        } finally {
            setIsGstrLoading(false);
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
                    <GitCompareArrows className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">GSTR-1 vs GSTR-3B Comparison</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                   Upload your GSTR-1 and GSTR-3B reports in CSV format. The AI will analyze both filings to find variances and provide suggestions for resolution, ensuring your returns are accurate.
                </p>
            </div>

            <Card className="max-w-3xl mx-auto w-full">
                <CardHeader>
                    <CardTitle>Upload Reports</CardTitle>
                    <CardDescription>Select the GSTR-1 and GSTR-3B files you want to compare.</CardDescription>
                </CardHeader>
                 <Form {...gstrCompareForm}>
                    <form onSubmit={gstrCompareForm.handleSubmit(onGstrCompareSubmit)}>
                        <CardContent className="space-y-4">
                            <FormField
                                control={gstrCompareForm.control}
                                name="gstr1"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>GSTR-1 Report (.csv)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="file" 
                                                accept=".csv"
                                                onChange={(e) => onChange(e.target.files?.[0])}
                                                {...rest}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={gstrCompareForm.control}
                                name="gstr3b"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>GSTR-3B Report (.csv)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="file" 
                                                accept=".csv"
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
                            <Button type="submit" disabled={isGstrLoading} className="w-full sm:w-auto">
                                 {isGstrLoading ? <Loader2 className="mr-2 animate-spin" /> : <GitCompareArrows className="mr-2"/>}
                                Compare Filings
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
                 {gstrCompareResult && (
                    <CardContent>
                         <Alert>
                            <Wand2 className="h-4 w-4" />
                            <AlertTitle>AI-Generated Comparison Report</AlertTitle>
                            <AlertDescription className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
                               {gstrCompareResult}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
