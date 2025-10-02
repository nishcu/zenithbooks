
"use client";

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
import { MoreHorizontal, FileSignature, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const sampleRequests = [
    { id: 'CR-001', type: 'Net Worth Certificate', client: 'Innovate LLC', requestedBy: 'Rohan Sharma', date: new Date(2024, 7, 14), status: 'Pending' },
    { id: 'CR-002', type: 'Turnover Certificate', client: 'Quantum Services', requestedBy: 'Priya Mehta', date: new Date(2024, 7, 12), status: 'Certified' },
    { id: 'CR-003', type: 'Form 15CB', client: 'Synergy Corp', requestedBy: 'Anjali Singh', date: new Date(2024, 7, 11), status: 'Certified' },
    { id: 'CR-004', type: 'Capital Contribution', client: 'Innovate LLC', requestedBy: 'Rohan Sharma', date: new Date(2024, 7, 10), status: 'Rejected' },
];

export default function AdminCertificationRequests() {

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

  return (
    <div className="space-y-8">
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleRequests.map((req) => (
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
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Draft Document</DropdownMenuItem>
                        <DropdownMenuItem className="text-green-600 focus:text-green-700"><CheckCircle className="mr-2"/>Approve & Upload Signed</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive"><AlertCircle className="mr-2"/>Reject</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
