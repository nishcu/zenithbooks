
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
import { MoreHorizontal, FileText, Edit, Trash2, Download, FileArchive } from "lucide-react";
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


    return (
        <div className="space-y-8">
             <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
                    <FileArchive className="size-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">My Saved Documents</h1>
                    <p className="text-muted-foreground">A central place for all your generated document drafts.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Document Drafts</CardTitle>
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
                            ) : documents.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">You haven't saved any document drafts yet.</TableCell></TableRow>
                            ) : (
                                documents.map((doc: any) => (
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
