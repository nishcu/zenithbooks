
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
} from "@/components/ui/alert-dialog"

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

    const handleDownload = (doc: any) => {
        // For certified documents, download the PDF
        if (doc.isCertified && doc.downloadUrl) {
            window.open(doc.downloadUrl, '_blank');
        } else {
            toast({
                title: "Download Not Available",
                description: "The PDF for this certified document is not yet available. Please contact support.",
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
    };


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
