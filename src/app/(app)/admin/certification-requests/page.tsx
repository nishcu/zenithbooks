
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, FileSignature, CheckCircle, AlertCircle, Eye, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CA_FIRM } from "@/lib/ca-firm";
import { format } from "date-fns";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import html2pdf from "html2pdf.js";
import { readBrandingSettings } from "@/lib/branding";

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
};

type Request = {
  id: string;
  type: string;
  client: string;
  requestedBy: string;
  date: Date;
  status: 'Pending' | 'Certified' | 'Rejected';
  userId: string;
  certificateData?: any;
  reportType?: string;
  clientName?: string;
  requestDate?: Date;
  draftUrl?: string;
  signedDocumentUrl?: string;
  formData?: any;
};

export default function AdminCertificationRequests() {
  const [user] = useAuthState(auth);
  const [requestsCollection, loading] = useCollection(
    user ? query(collection(db, "certificationRequests"), where("status", "in", ["Pending", "Certified", "Rejected"])) : null
  );

  const requests: Request[] = requestsCollection?.docs.map(doc => ({
    id: doc.id,
    type: doc.data().reportType || 'Unknown',
    client: doc.data().clientName || 'Unknown',
    requestedBy: doc.data().requestedBy || 'Unknown',
    date: doc.data().requestDate?.toDate() || doc.data().createdAt?.toDate() || new Date(),
    status: doc.data().status || 'Pending',
    userId: doc.data().userId,
    certificateData: doc.data().formData,
    reportType: doc.data().reportType,
    clientName: doc.data().clientName,
    requestDate: doc.data().requestDate?.toDate(),
    draftUrl: doc.data().draftUrl,
    signedDocumentUrl: doc.data().signedDocumentUrl,
    formData: doc.data().formData,
  })) as Request[] || [];
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [udin, setUdin] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Certified":
        return <Badge className="bg-green-600 hover:bg-green-700">Certified</Badge>;
      case "Pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "Rejected":
         return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDocument = (req: Request) => {
    setSelectedRequest(req);
    setIsViewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !user || !selectedRequest.userId) {
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: "Invalid request data. User information is missing.",
      });
      return;
    }

    if (!udin.trim()) {
      toast({
        variant: "destructive",
        title: "UDIN Required",
        description: "Please enter the UDIN (Unique Document Identification Number) for this certificate.",
      });
      return;
    }

    setIsLoading('approve');

    try {
      console.log("Approving request:", selectedRequest); // Debug log

      // Update the certification request status to 'Certified'
      await updateDoc(doc(db, "certificationRequests", selectedRequest.id), {
        status: 'Certified',
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
        udin: udin.trim(),
        digitalSignature: digitalSignature.trim(),
        signatureFileUrl: null, // Will be set if file is uploaded
      });

      // Save the certified document to user's userDocuments collection
      const certifiedDocData = {
        userId: selectedRequest.userId,
        documentName: `${selectedRequest.type} - ${selectedRequest.client}`,
        documentType: selectedRequest.type,
        status: 'Certified',
        certificateData: selectedRequest.certificateData,
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
        isCertified: true,
        downloadUrl: null, // Will be set when PDF is generated
        udin: udin.trim(),
        digitalSignature: digitalSignature.trim(),
        signatureFileUrl: null,
      };

      await addDoc(collection(db, "userDocuments"), certifiedDocData);

      toast({
        title: "Request Approved",
        description: `Certification request has been approved with UDIN: ${udin}. The certified document is now available in the client's "My Documents" section.`,
      });

      // Reset form fields
      setUdin('');
      setDigitalSignature('');
      setSignatureFile(null);
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error approving certification request:", error);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: "Failed to approve the certification request. Please try again.",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleDownloadDraft = async (request: Request) => {
    if (!request.certificateData) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Certificate data is not available for this draft.",
      });
      return;
    }

    try {
      // For certificates, use CA firm details instead of user company branding
      const caFirmDetails = {
        companyName: CA_FIRM.name,
        address1: CA_FIRM.tagline,
        address2: "",
        city: CA_FIRM.city,
        state: CA_FIRM.state,
        pincode: CA_FIRM.pincode,
        gstin: CA_FIRM.gstin,
        pan: CA_FIRM.pan
      };
      toast({
        title: "Generating PDF...",
        description: "Your draft certificate is being prepared for download.",
      });

      const data = request.certificateData;
      const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

      let certificateHTML = '';

      // Generate HTML based on certificate type
      switch (request.type.toLowerCase()) {
        case 'net worth certificate':
          const totalAssets = data.assets?.reduce((acc: number, asset: any) => acc + (Number(asset.value) || 0), 0) || 0;
          const totalLiabilities = data.liabilities?.reduce((acc: number, liability: any) => acc + (Number(liability.value) || 0), 0) || 0;
          const netWorth = totalAssets - totalLiabilities;

          certificateHTML = `
            <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #000000; background-color: #ffffff; max-width: 100%; padding: 40px; margin: 0; box-sizing: border-box;">
              <header style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 40px;">
                <h1 style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 0 0 8px 0;">${caFirmDetails.companyName}</h1>
                <p style="font-size: 14px; margin: 0 0 4px 0;">${caFirmDetails.address1}</p>
                <p style="font-size: 12px; margin: 0 0 4px 0;">${caFirmDetails.city}, ${caFirmDetails.state} - ${caFirmDetails.pincode}</p>
                <p style="font-size: 12px; margin: 0;">GSTIN: ${caFirmDetails.gstin}</p>
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
              <p style="margin: 15px 0; text-align: justify;">The net worth of <strong style="font-weight: bold;">${data.clientName || 'N/A'}</strong> as on ${data.asOnDate ? new Date(data.asOnDate).toLocaleDateString('en-GB', dateOptions) : 'N/A'} is <strong style="font-weight: bold;">₹${netWorth.toLocaleString('en-IN')}</strong> (Rupees ${numberToWords(netWorth)} only).</p>

              <div style="margin-top: 60px; text-align: justify;">
                <p style="margin: 15px 0;">This certificate is issued based on the information and records produced before us and is true to the best of our knowledge and belief.</p>
                            <p style="margin: 40px 0 10px 0; font-weight: bold;">For ${caFirmDetails.companyName}</p>
                            <p style="margin: 5px 0;">${caFirmDetails.address1}</p>
                <div style="height: 80px;"></div>
                <p style="margin: 5px 0;">(S. Kranthi Kumar)</p>
                <p style="margin: 5px 0;">Proprietor</p>
                <p style="margin: 5px 0;">Membership No: 224983</p>
              </div>
            </div>
          `;
          break;

        case 'turnover certificate':
          certificateHTML = `
            <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #000000; background-color: #ffffff; max-width: 100%; padding: 40px; margin: 0; box-sizing: border-box;">
              <header style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 40px;">
                <h1 style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 0 0 8px 0;">${caFirmDetails.companyName}</h1>
                <p style="font-size: 14px; margin: 0 0 4px 0;">${caFirmDetails.address1}</p>
                <p style="font-size: 12px; margin: 0 0 4px 0;">${caFirmDetails.city}, ${caFirmDetails.state} - ${caFirmDetails.pincode}</p>
                <p style="font-size: 12px; margin: 0;">GSTIN: ${caFirmDetails.gstin}</p>
              </header>

              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                <div>
                  <p style="font-weight: bold; font-size: 14px;">TO WHOMSOEVER IT MAY CONCERN</p>
                </div>
                <div style="text-align: right;">
                  <p style="font-weight: bold;">UDIN: [UDIN GOES HERE]</p>
                  <p style="font-size: 12px;">Date: ${new Date().toLocaleDateString('en-GB', dateOptions)}</p>
                </div>
              </div>

              <h4 style="font-weight: bold; text-align: center; text-decoration: underline; margin: 40px 0; font-size: 18px;">TURNOVER CERTIFICATE</h4>

              <p style="margin: 20px 0; text-align: justify;">This is to certify that we have verified the books of accounts and other relevant records of <strong style="font-weight: bold;">M/s ${data.entityName || 'N/A'}</strong>, having its registered office at ${data.entityAddress || 'N/A'} and holding PAN <strong style="font-weight: bold;">${data.entityPan || 'N/A'}</strong>.</p>

              <p style="margin: 20px 0; text-align: justify;">Based on our verification of the ${data.dataSource || 'records'}, we certify that the total turnover of the entity for the financial year ended on 31st March ${data.financialYear?.slice(0,4) || 'N/A'} is as follows:</p>

              <table style="width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 14px;">
                <tbody>
                  <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000;">
                    <td style="padding: 12px; font-weight: bold;">Financial Year</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">${data.financialYear || 'N/A'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #000;">
                    <td style="padding: 12px; font-weight: bold;">Turnover / Gross Receipts</td>
                    <td style="padding: 12px; text-align: right; font-family: monospace; font-weight: bold;">₹ ${(data.turnoverAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                </tbody>
              </table>

              <p style="margin: 20px 0;">The total turnover is <strong style="font-weight: bold;">Rupees ${numberToWords(data.turnoverAmount || 0)} only</strong>.</p>

              <p style="margin: 40px 0; font-size: 12px; text-align: justify;">This certificate is issued at the specific request of the entity for the purpose of submitting to [Purpose, e.g., Tender Application]. Our liability is limited to the extent of information provided by the management and is based on the records produced before us.</p>

                        <div style="margin-top: 100px; text-align: right;">
                            <p style="font-weight: bold; margin-bottom: 5px;">For ${caFirmDetails.companyName}</p>
                            <p style="margin-bottom: 5px;">${caFirmDetails.address1}</p>
                <div style="height: 80px;"></div>
                <p style="margin-bottom: 5px;">(S. Kranthi Kumar)</p>
                <p style="margin-bottom: 5px;">Proprietor</p>
                <p style="margin-bottom: 5px;">Membership No: 224983</p>
              </div>
            </div>
          `;
          break;

        default:
          certificateHTML = `
            <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #000000; background-color: #ffffff;">
              <h1 style="font-size: 24px; margin-bottom: 20px;">Draft Certificate</h1>
              <p style="margin-bottom: 10px;"><strong>Document Type:</strong> ${request.type || 'Unknown'}</p>
              <p style="margin-bottom: 10px;"><strong>Client:</strong> ${request.client || 'Unknown'}</p>
              <p style="margin-bottom: 10px;"><strong>Status:</strong> Draft</p>
              <p style="margin-bottom: 20px;"><strong>Date:</strong> ${request.date ? request.date.toLocaleDateString() : 'N/A'}</p>
              <p>This is a draft certificate. Please contact support if you need assistance.</p>
            </div>
          `;
      }

      // Create a new window with the certificate HTML
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        throw new Error('Failed to open print window. Please allow popups for this site.');
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${request.type} - Draft</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${certificateHTML}
        </body>
        </html>
      `);
      printWindow.document.close();

      // Wait for the content to load
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Generate and download PDF
                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `${request.type.replace(/[^a-zA-Z0-9]/g, '_')}_Draft_${request.client.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        allowTaint: true,
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
                };

                await html2pdf().set(opt).from(printWindow.document.body).save();

      // Close the print window
      printWindow.close();

      toast({
        title: "Draft Downloaded",
        description: "Your draft certificate has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Draft download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to generate draft PDF. Please try again or contact support.",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setIsLoading('reject');
    await new Promise(resolve => setTimeout(resolve, 800));
    setRequests(requests.map(r => 
      r.id === selectedRequest.id 
        ? { ...r, status: 'Rejected' as Request['status'] }
        : r
    ));
    toast({
      title: "Request Rejected",
      description: `Certification request ${selectedRequest.id} has been rejected.`,
      variant: "destructive",
    });
    setIsRejectDialogOpen(false);
    setSelectedRequest(null);
    setIsLoading(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <FileSignature className="size-6 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold">Certification Requests</h1>
            <p className="text-muted-foreground">Review, sign, and manage all professional certification requests.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>Review and manage certification document requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Request ID</TableHead>
                  <TableHead className="min-w-[180px]">Document Type</TableHead>
                  <TableHead className="min-w-[150px]">Client</TableHead>
                  <TableHead className="min-w-[150px]">Requested By</TableHead>
                  <TableHead className="min-w-[120px]">Date</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No certification requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono">{req.id}</TableCell>
                      <TableCell className="font-medium">{req.type}</TableCell>
                      <TableCell>{req.client}</TableCell>
                      <TableCell>{req.requestedBy}</TableCell>
                      <TableCell>{format(req.date, 'dd MMM, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => handleViewDocument(req)} disabled={isLoading !== null}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Draft Document
                            </DropdownMenuItem>
                            {req.status === 'Pending' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setIsApproveDialogOpen(true);
                                  }}
                                  disabled={isLoading !== null}
                                  className="text-green-600 focus:text-green-700"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve & Upload Signed
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setIsRejectDialogOpen(true);
                                  }}
                                  disabled={isLoading !== null}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <AlertCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>View certification request information</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Request ID</Label>
                <p className="text-sm font-mono font-medium">{selectedRequest.id}</p>
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <p className="text-sm font-medium">{selectedRequest.type}</p>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <p className="text-sm font-medium">{selectedRequest.client}</p>
              </div>
              <div className="space-y-2">
                <Label>Requested By</Label>
                <p className="text-sm font-medium">{selectedRequest.requestedBy}</p>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <p className="text-sm font-medium">{format(selectedRequest.date, 'dd MMM, yyyy')}</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div>{getStatusBadge(selectedRequest.status)}</div>
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDownloadDraft(selectedRequest)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Download Draft Document
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={(open) => {
        setIsApproveDialogOpen(open);
        if (!open) {
          // Reset form fields when dialog closes
          setUdin('');
          setDigitalSignature('');
          setSignatureFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Approve Certification Request</DialogTitle>
            <DialogDescription>
              Approve certification request {selectedRequest?.id} for {selectedRequest?.type}.
              Please provide the required certification details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="udin" className="text-sm font-medium">
                UDIN (Unique Document Identification Number) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="udin"
                placeholder="Enter UDIN number"
                value={udin}
                onChange={(e) => setUdin(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                UDIN is a unique number assigned by ICAI for audit reports and certificates.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="digital-signature" className="text-sm font-medium">
                Digital Signature / DSC (Optional)
              </Label>
              <Textarea
                id="digital-signature"
                placeholder="Paste digital signature text or enter signature details"
                value={digitalSignature}
                onChange={(e) => setDigitalSignature(e.target.value)}
                className="w-full min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                You can paste the digital signature text or upload a signature file below.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature-file" className="text-sm font-medium">
                Upload Signature File (Optional)
              </Label>
              <Input
                id="signature-file"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Upload a scanned signature image or PDF file (max 5MB).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={isLoading === 'approve'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isLoading === 'approve' || !udin.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading === 'approve' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve & Mark as Certified
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Certification Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject certification request {selectedRequest?.id}? 
              This action will mark the request as rejected and notify the requester.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading === 'reject'}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={isLoading === 'reject'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoading === 'reject' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Reject Request
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
