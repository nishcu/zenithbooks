
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
import { format } from "date-fns";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

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
                <Button variant="outline" className="w-full">
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
