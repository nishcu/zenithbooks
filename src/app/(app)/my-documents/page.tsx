
"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from "@/lib/firebase";
import { collection, query, where, deleteDoc, doc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText, Edit, Trash2, Download, FileArchive, CheckCircle, Bell, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import html2pdf from "html2pdf.js";

export default function MyDocumentsPage() {
    const [user, loadingUser] = useAuthState(auth);
    const router = useRouter();
    const { toast } = useToast();

    const userDocsQuery = user ? query(collection(db, "userDocuments"), where("userId", "==", user.uid)) : null;
    const [docsSnapshot, docsLoading] = useCollection(userDocsQuery);

    const documents = useMemo(() =>
        docsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [],
    [docsSnapshot]);

    // Separate certified and draft documents
    const certifiedDocuments = useMemo(() =>
        documents?.filter(doc => doc.isCertified) || [],
    [documents]);

    const draftDocuments = useMemo(() =>
        documents?.filter(doc => !doc.isCertified) || [],
    [documents]);

    // Check for newly certified documents (approved in last 7 days)
    const newCertifiedDocuments = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return (certifiedDocuments || []).filter(doc =>
            doc.approvedAt && doc.approvedAt.toDate() > sevenDaysAgo
        );
    }, [certifiedDocuments]);
    
    const docTypeToUrl: Record<string, string> = {
        // CA Certificates
        'net-worth-certificate': '/ca-certificates/net-worth',
        'capital-contribution-certificate': '/ca-certificates/capital-contribution',
        'foreign-remittance-certificate': '/ca-certificates/foreign-remittance',
        'general-attestation-certificate': '/ca-certificates/general-attestation',
        'turnover-certificate': '/ca-certificates/turnover',
        'visa-immigration-certificate': '/ca-certificates/visa-immigration',
        // Legal Documents
        'partnership-deed': '/legal-documents/partnership-deed',
        'rental-deed': '/legal-documents/rental-deed',
        'lease-deed': '/legal-documents/lease-deed',
        'self-affidavit-gst': '/legal-documents/self-affidavit-gst',
        'llp-agreement': '/legal-documents/llp-agreement',
        'rental-receipt': '/legal-documents/rental-receipt',
        'founders-agreement': '/legal-documents/founders-agreement',
        'consultant-agreement': '/legal-documents/consultant-agreement',
        'service-agreement': '/legal-documents/service-agreement',
        'vendor-agreement': '/legal-documents/vendor-agreement',
        'franchise-agreement': '/legal-documents/franchise-agreement',
        'offer-letter': '/legal-documents/offer-letter',
        'appointment-letter': '/legal-documents/appointment-letter',
        'internship-agreement': '/legal-documents/internship-agreement',
        'shareholders-agreement': '/legal-documents/shareholders-agreement',
        'esop-policy': '/legal-documents/esop-policy',
        'safe-agreement': '/legal-documents/safe-agreement',
        'society-registration-deed': '/legal-documents/society-registration-deed',
        'trust-deed': '/legal-documents/trust-deed',
        'moa-aoa': '/legal-documents/moa-aoa',
        'loan-agreement': '/legal-documents/loan-agreement',
        'nda': '/legal-documents/nda',
        'accounting-engagement-letter': '/legal-documents/accounting-engagement-letter',
        'gst-engagement-letter': '/legal-documents/gst-engagement-letter',
        'board-resolution': '/legal-documents/board-resolutions',
    }
    
    const handleEdit = (doc: any) => {
        const baseUrl = docTypeToUrl[doc.documentType];
        if (baseUrl) {
            router.push(`${baseUrl}?id=${doc.id}`);
        } else {
            toast({ variant: 'destructive', title: 'Cannot Edit', description: 'This document type does not support editing.' });
        }
    }

     const handleDelete = async (docId: string, docName: string) => {
        try {
            await deleteDoc(doc(db, "userDocuments", docId));
            toast({ title: "Draft Deleted", description: `"${docName}" has been removed.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the document draft.' });
            console.error("Error deleting document: ", error);
        }
    };

    const handleDownload = async (doc: any) => {
        // For certified documents, generate PDF on-demand
        if (doc.isCertified) {
            try {
                toast({
                    title: "Generating PDF...",
                    description: "Your certified document is being prepared for download.",
                });

                // Create a temporary element with the certificate content
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '-9999px';

                // Generate certificate HTML based on document type and data
                const certificateHTML = generateCertificateHTML(doc);
                tempDiv.innerHTML = certificateHTML;
                document.body.appendChild(tempDiv);

                // Generate and download PDF
                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `${doc.documentName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
                };

                await html2pdf().set(opt).from(tempDiv).save();

                // Clean up
                document.body.removeChild(tempDiv);

                toast({
                    title: "PDF Downloaded",
                    description: "Your certified document has been downloaded successfully.",
                });
            } catch (error) {
                console.error("PDF generation error:", error);
                toast({
                    variant: "destructive",
                    title: "Download Failed",
                    description: "Failed to generate PDF. Please try again or contact support.",
                });
            }
        } else if (doc.downloadUrl) {
            window.open(doc.downloadUrl, '_blank');
        } else {
            toast({
                title: "Download Not Available",
                description: "The PDF for this document is not available. Please contact support.",
                variant: "destructive",
            });
        }
    };

    const handleView = (doc: any) => {
        // For certified documents, show details
        if (doc.isCertified) {
            toast({
                title: "Certified Document",
                description: `This is a certified ${doc.documentType} for ${doc.documentName}. Use the download button to get the PDF.`,
            });
        }
    }

    const generateCertificateHTML = (doc: any) => {
        const data = doc.certificateData;
        if (!data) return '<div>No certificate data available</div>';

        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

        // Generate HTML based on certificate type
        switch (doc.documentType.toLowerCase()) {
            case 'net worth certificate':
                const totalAssets = data.assets?.reduce((acc: number, asset: any) => acc + (Number(asset.value) || 0), 0) || 0;
                const totalLiabilities = data.liabilities?.reduce((acc: number, liability: any) => acc + (Number(liability.value) || 0), 0) || 0;
                const netWorth = totalAssets - totalLiabilities;

                return `
                    <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #000000; background-color: #ffffff; max-width: 100%; padding: 40px; margin: 0; box-sizing: border-box;">
                        <header style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 40px;">
                            <h1 style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 0 0 8px 0;">S. KRANTHI KUMAR & Co.</h1>
                            <p style="font-size: 14px; margin: 0 0 4px 0;">Chartered Accountants</p>
                            <p style="font-size: 12px; margin: 0 0 4px 0;">H.No. 2-2-1130/2/A, G-1, Amberpet, Hyderabad-500013</p>
                            <p style="font-size: 12px; margin: 0;">Email: skkandco@gmail.com</p>
                        </header>
                        <h4 style="font-weight: bold; text-align: center; margin: 20px 0; font-size: 16px;">TO WHOM IT MAY CONCERN</h4>
                        <h4 style="font-weight: bold; text-align: center; text-decoration: underline; margin: 20px 0; font-size: 18px;">NET WORTH CERTIFICATE</h4>
                        <p style="margin: 20px 0; text-align: justify;">This is to certify that the Net Worth of Sri <strong style="font-weight: bold;">${data.clientName || 'N/A'}</strong>, S/o (or other relation) [Parent's Name], R/o ${data.clientAddress || 'N/A'} (PAN: <strong style="font-weight: bold;">${data.clientPan || 'N/A'}</strong>) as on <strong style="font-weight: bold;">${data.asOnDate ? new Date(data.asOnDate).toLocaleDateString('en-GB', dateOptions) : 'N/A'}</strong> is as follows:</p>

                        <h5 style="font-weight: bold; margin: 30px 0 15px 0; font-size: 16px;">A. ASSETS</h5>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                            <thead>
                                <tr style="border-bottom: 1px solid #000;">
                                    <th style="width: 70%; text-align: left; padding: 8px 12px; font-weight: bold;">Description</th>
                                    <th style="text-align: right; padding: 8px 12px; font-weight: bold;">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(data.assets || []).map((asset: any) => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 8px 12px;">${asset.description || ''}</td>
                                        <td style="text-align: right; padding: 8px 12px; font-family: monospace;">${(asset.value || 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="border-top: 2px solid #000;">
                                    <td style="padding: 8px 12px; font-weight: bold;">Total Assets</td>
                                    <td style="text-align: right; padding: 8px 12px; font-weight: bold; font-family: monospace;">${totalAssets.toLocaleString('en-IN')}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <h5 style="font-weight: bold; margin: 30px 0 15px 0; font-size: 16px;">B. LIABILITIES</h5>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                            <thead>
                                <tr style="border-bottom: 1px solid #000;">
                                    <th style="width: 70%; text-align: left; padding: 8px 12px; font-weight: bold;">Description</th>
                                    <th style="text-align: right; padding: 8px 12px; font-weight: bold;">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(data.liabilities || []).map((liability: any) => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 8px 12px;">${liability.description || ''}</td>
                                        <td style="text-align: right; padding: 8px 12px; font-family: monospace;">${(liability.value || 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="border-top: 2px solid #000;">
                                    <td style="padding: 8px 12px; font-weight: bold;">Total Liabilities</td>
                                    <td style="text-align: right; padding: 8px 12px; font-weight: bold; font-family: monospace;">${totalLiabilities.toLocaleString('en-IN')}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <h5 style="font-weight: bold; margin: 30px 0 15px 0; font-size: 16px;">NET WORTH (A - B)</h5>
                        <p style="margin: 15px 0; text-align: justify;">The net worth of <strong style="font-weight: bold;">${data.clientName || 'N/A'}</strong> as on ${data.asOnDate ? new Date(data.asOnDate).toLocaleDateString('en-GB', dateOptions) : 'N/A'} is <strong style="font-weight: bold;">₹${netWorth.toLocaleString('en-IN')}</strong>.</p>

                        <div style="margin-top: 60px; text-align: justify;">
                            <p style="margin: 15px 0;">This certificate is issued based on the information and records produced before us and is true to the best of our knowledge and belief.</p>
                            <p style="margin: 40px 0 10px 0; font-weight: bold;">For S. KRANTHI KUMAR & Co.</p>
                            <p style="margin: 5px 0;">Chartered Accountants</p>
                            <div style="height: 80px;"></div>
                            <p style="margin: 5px 0;">(S. Kranthi Kumar)</p>
                            <p style="margin: 5px 0;">Proprietor</p>
                            <p style="margin: 5px 0;">Membership No: 224983</p>
                        </div>
                    </div>
                `;

            default:
                return `
                    <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                        <h1>Certified Document</h1>
                        <p><strong>Document Type:</strong> ${doc.documentType}</p>
                        <p><strong>Client:</strong> ${doc.documentName}</p>
                        <p><strong>Status:</strong> Certified</p>
                        <p><strong>Approved Date:</strong> ${doc.approvedAt ? doc.approvedAt.toDate().toLocaleDateString() : 'N/A'}</p>
                        <p>This is a certified document approved by S. KRANTHI KUMAR & Co.</p>
                    </div>
                `;
        }
    };;


    return (
        <div className="space-y-8">
             <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
                    <FileArchive className="size-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">My Documents</h1>
                    <p className="text-muted-foreground">A central place for all your document drafts and certified documents.</p>
                </div>
            </div>

            {/* Alert for new certified documents */}
            {newCertifiedDocuments.length > 0 && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">New Certified Documents Available!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        You have {newCertifiedDocuments.length} new certified document{newCertifiedDocuments.length > 1 ? 's' : ''} ready for download.
                        Check the "Certified Documents" section below.
                    </AlertDescription>
                </Alert>
            )}

            {/* Certified Documents Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Certified Documents
                        {certifiedDocuments.length > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {certifiedDocuments.length}
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription>Official certified documents approved by our Chartered Accountants.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Certified Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {docsLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Loading documents...</TableCell></TableRow>
                            ) : certifiedDocuments.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No certified documents yet.</TableCell></TableRow>
                            ) : (
                                certifiedDocuments.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium">{doc.documentName}</TableCell>
                                        <TableCell>{doc.documentType}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Certified
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {doc.approvedAt ? format(doc.approvedAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Download PDF
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleView(doc)}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Document Drafts Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Document Drafts
                        {draftDocuments.length > 0 && (
                            <Badge variant="secondary">
                                {draftDocuments.length}
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription>Here are all the legal and CA certificate drafts you have saved.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Saved</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {docsLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Loading documents...</TableCell></TableRow>
                            ) : draftDocuments.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">You haven't saved any document drafts yet.</TableCell></TableRow>
                            ) : (
                                draftDocuments.map((doc: any) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium">{doc.documentName}</TableCell>
                                        <TableCell className="capitalize text-muted-foreground">{doc.documentType.replace(/-/g, ' ')}</TableCell>
                                        <TableCell><Badge variant={doc.status === 'Certified' ? 'default' : 'secondary'}>{doc.status}</Badge></TableCell>
                                        <TableCell>{format(doc.createdAt.toDate(), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(doc)}><Edit className="mr-2"/> Edit Draft</DropdownMenuItem>
                                                    {doc.status === 'Certified' && <DropdownMenuItem><Download className="mr-2"/> Download Certified Copy</DropdownMenuItem>}
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                          <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2"/> Delete</DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                              This action cannot be undone. This will permanently delete the draft for "{doc.documentName}".
                                                            </AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(doc.id, doc.documentName)}>Delete</AlertDialogAction>
                                                          </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                      </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
