
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, FileText, Loader2, File, Database, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const exportOptions = [
    { title: "Day Book", description: "All transactional vouchers.", type: "xlsx" },
    { title: "General Ledger", description: "Full transaction history for all accounts.", type: "xlsx" },
    { title: "Trial Balance", description: "Summary of all ledger balances.", type: "csv" },
    { title: "All Sales Invoices", description: "Detailed list of all sales invoices.", type: "xlsx" },
    { title: "All Purchase Bills", description: "Detailed list of all purchase bills.", type: "xlsx" },
    { title: "Customer & Vendor List", description: "Complete list of all parties.", type: "csv" },
    { title: "Stock Item List", description: "Complete list of all stock items.", type: "csv" },
];

export default function ImportExportPage() {
    const [tallyVoucherFile, setTallyVoucherFile] = useState<File | null>(null);
    const [tallyMasterFile, setTallyMasterFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();

    const [gstr1File, setGstr1File] = useState<File | null>(null);
    const [gstr2bFile, setGstr2bFile] = useState<File | null>(null);
    const [itrJsonFile, setItrJsonFile] = useState<File | null>(null);
    const [aisFile, setAisFile] = useState<File | null>(null);


    const handleTallyImport = async (importType: 'vouchers' | 'masters') => {
        const fileToImport = importType === 'vouchers' ? tallyVoucherFile : tallyMasterFile;
        if (!fileToImport) {
            toast({
                variant: "destructive",
                title: "No File Selected",
                description: "Please select a Tally XML file to import.",
            });
            return;
        }

        setIsImporting(true);
        toast({
            title: `Importing Tally ${importType}...`,
            description: "This may take a few moments.",
        });

        const formData = new FormData();
        formData.append('file', fileToImport);

        try {
            // In a real app, you might have different endpoints or pass the importType
            const response = await fetch('/api/import/tally', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "An unknown error occurred.");
            }
            
            toast({
                title: "Import Successful!",
                description: result.message,
            });

        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Import Failed",
                description: error.message,
            });
        } finally {
            setIsImporting(false);
            if(importType === 'vouchers') setTallyVoucherFile(null);
            else setTallyMasterFile(null);
        }
    };
    
    const handleGenericImport = (file: File | null, type: string) => {
         if (!file) {
            toast({ variant: "destructive", title: "No File Selected", description: `Please select a file for ${type}.` });
            return;
        }
         toast({ title: "Import Successful (Simulated)", description: `Your ${type} file '${file.name}' has been processed.`});
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Import & Export Data</h1>
                <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
                    Seamlessly move your data in and out of ZenithBooks.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Upload/> Import Data</CardTitle>
                        <CardDescription>Import data from other software and sources.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Tabs defaultValue="tally">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="tally">Tally</TabsTrigger>
                                <TabsTrigger value="gst">GST Portal</TabsTrigger>
                                <TabsTrigger value="it">Income Tax</TabsTrigger>
                            </TabsList>
                            <TabsContent value="tally" className="pt-4">
                                <div className="space-y-6">
                                    <div className="p-4 border rounded-lg space-y-4">
                                        <h3 className="font-semibold flex items-center gap-2"><File className="text-primary"/> Vouchers (Day Book)</h3>
                                        <p className="text-sm text-muted-foreground">Upload your Day Book exported from Tally in XML format. We'll automatically create the corresponding accounting vouchers.</p>
                                        <div className="space-y-2">
                                            <Label htmlFor="tally-file-vouchers">Tally Day Book (.xml)</Label>
                                            <Input id="tally-file-vouchers" type="file" accept=".xml" onChange={(e) => setTallyVoucherFile(e.target.files?.[0] || null)} />
                                        </div>
                                        <Button onClick={() => handleTallyImport('vouchers')} disabled={isImporting || !tallyVoucherFile}>
                                            {isImporting ? <Loader2 className="mr-2 animate-spin"/> : <Upload className="mr-2" />}
                                            Import Vouchers
                                        </Button>
                                    </div>
                                     <div className="p-4 border rounded-lg space-y-4">
                                        <h3 className="font-semibold flex items-center gap-2"><Users className="text-primary"/> Masters (Ledgers & Items)</h3>
                                        <p className="text-sm text-muted-foreground">Upload your Masters export from Tally in XML format to import customers, vendors, and stock items.</p>
                                        <div className="space-y-2">
                                            <Label htmlFor="tally-file-masters">Tally Masters (.xml)</Label>
                                            <Input id="tally-file-masters" type="file" accept=".xml" onChange={(e) => setTallyMasterFile(e.target.files?.[0] || null)} />
                                        </div>
                                        <Button onClick={() => handleTallyImport('masters')} disabled={isImporting || !tallyMasterFile}>
                                            {isImporting ? <Loader2 className="mr-2 animate-spin"/> : <Upload className="mr-2" />}
                                            Import Masters
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                             <TabsContent value="gst" className="pt-4">
                                <div className="p-4 border rounded-lg space-y-6">
                                    <h3 className="font-semibold flex items-center gap-2"><Database className="text-primary"/> GST Data</h3>
                                    <p className="text-sm text-muted-foreground">Import your monthly GST returns data from the official portal's JSON or CSV files.</p>
                                    
                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="gstr1-upload">GSTR-1 Data</Label>
                                            <p className="text-xs text-muted-foreground">Import outward supplies data from GSTR-1.</p>
                                            <div className="flex gap-2">
                                                <Input id="gstr1-upload" type="file" accept=".json,.csv" onChange={e => setGstr1File(e.target.files?.[0] || null)} />
                                                <Button variant="outline" onClick={() => handleGenericImport(gstr1File, 'GSTR-1')}>Import</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="gstr2b-upload">GSTR-2B Data</Label>
                                            <p className="text-xs text-muted-foreground">Import ITC data from GSTR-2B for reconciliation.</p>
                                            <div className="flex gap-2">
                                                <Input id="gstr2b-upload" type="file" accept=".json,.csv" onChange={e => setGstr2bFile(e.target.files?.[0] || null)} />
                                                <Button variant="outline" onClick={() => handleGenericImport(gstr2bFile, 'GSTR-2B')}>Import</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                             <TabsContent value="it" className="pt-4">
                               <div className="p-4 border rounded-lg space-y-6">
                                    <h3 className="font-semibold flex items-center gap-2"><Database className="text-primary"/> Income Tax Data</h3>
                                    <p className="text-sm text-muted-foreground">Import pre-filled ITR JSON, AIS/TIS, or Form 26AS data to simplify your tax filing process.</p>
                                    
                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="itr-json-upload">ITR Pre-filled JSON</Label>
                                            <p className="text-xs text-muted-foreground">Upload the JSON from the Income Tax portal to pre-fill ITR forms.</p>
                                            <div className="flex gap-2">
                                                <Input id="itr-json-upload" type="file" accept=".json" onChange={e => setItrJsonFile(e.target.files?.[0] || null)} />
                                                <Button variant="outline" onClick={() => handleGenericImport(itrJsonFile, 'ITR JSON')}>Import Data</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ais-upload">AIS/TIS Report</Label>
                                            <p className="text-xs text-muted-foreground">Import Annual Information Statement (AIS) or Taxpayer Information Summary (TIS).</p>
                                            <div className="flex gap-2">
                                                <Input id="ais-upload" type="file" accept=".pdf,.json" onChange={e => setAisFile(e.target.files?.[0] || null)}/>
                                                <Button variant="outline" onClick={() => handleGenericImport(aisFile, 'AIS/TIS')}>Import Data</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Download/> Export Data</CardTitle>
                        <CardDescription>Export your ZenithBooks data for backups or use in other applications.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-2">
                        {exportOptions.map(opt => (
                             <div key={opt.title} className="p-2 border rounded-md flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {opt.type === 'xlsx' ? <FileSpreadsheet className="size-5 text-green-600"/> : <FileText className="size-5 text-blue-600"/>}
                                    <div>
                                        <p className="font-medium">{opt.title}</p>
                                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => toast({ title: "Export Started (Simulated)", description: `Your ${opt.title} report is being generated.`})}>Export</Button>
                             </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
