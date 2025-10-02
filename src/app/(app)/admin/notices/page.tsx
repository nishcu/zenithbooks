
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
import { MoreHorizontal, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const sampleNotices = [
    { id: 'NTC-001', clientName: 'Innovate LLC', noticeType: 'GST Notice', submittedOn: new Date(2024, 7, 13), assignedTo: 'Priya Mehta', status: 'In Progress' },
    { id: 'NTC-002', clientName: 'Quantum Services', noticeType: 'Income Tax Notice', submittedOn: new Date(2024, 7, 11), assignedTo: 'Sunil Gupta', status: 'Resolved' },
    { id: 'NTC-003', clientName: 'Synergy Corp', noticeType: 'ROC Notice', submittedOn: new Date(2024, 7, 10), assignedTo: 'Unassigned', status: 'Pending Assignment' },
];

export default function AdminNotices() {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Assignment":
        return <Badge variant="destructive">Pending Assignment</Badge>;
      case "In Progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "Resolved":
        return <Badge className="bg-green-600 hover:bg-green-700">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <MailWarning className="size-6 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold">Submitted Notices</h1>
            <p className="text-muted-foreground">View and manage all departmental notices submitted by users.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Submitted Notices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notice ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Notice Type</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleNotices.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell className="font-mono">{notice.id}</TableCell>
                  <TableCell className="font-medium">{notice.clientName}</TableCell>
                  <TableCell>{notice.noticeType}</TableCell>
                  <TableCell>{format(notice.submittedOn, 'dd MMM, yyyy')}</TableCell>
                  <TableCell>{notice.assignedTo}</TableCell>
                  <TableCell>{getStatusBadge(notice.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details & Document</DropdownMenuItem>
                        <DropdownMenuItem>Assign to Professional</DropdownMenuItem>
                        <DropdownMenuItem>Update Status</DropdownMenuItem>
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
