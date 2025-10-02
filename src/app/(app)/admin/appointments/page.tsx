
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
import { MoreHorizontal, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const sampleAppointments = [
    { id: 'APT-001', clientName: 'Rohan Sharma', service: 'GST Registration', professional: 'Priya Mehta', date: new Date(2024, 7, 15, 10, 0), status: 'Confirmed' },
    { id: 'APT-002', clientName: 'Anjali Singh', service: 'ITR Filing', professional: 'Sunil Gupta', date: new Date(2024, 7, 15, 14, 0), status: 'Pending' },
    { id: 'APT-003', clientName: 'Vikram Rathod', service: 'Virtual CFO', professional: 'Rohan Sharma', date: new Date(2024, 7, 16, 11, 0), status: 'Completed' },
    { id: 'APT-004', clientName: 'Neha Desai', service: 'GST Notices', professional: 'Priya Mehta', date: new Date(2024, 7, 17, 15, 0), status: 'Cancelled' },
];

export default function AdminAppointments() {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Confirmed":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Confirmed</Badge>;
      case "Pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "Completed":
        return <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>;
      case "Cancelled":
         return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <CalendarClock className="size-6 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold">Manage Appointments</h1>
            <p className="text-muted-foreground">View and manage all booked appointments on the platform.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Appointment ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Assigned Professional</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleAppointments.map((apt) => (
                <TableRow key={apt.id}>
                  <TableCell className="font-mono">{apt.id}</TableCell>
                  <TableCell className="font-medium">{apt.clientName}</TableCell>
                  <TableCell>{apt.service}</TableCell>
                  <TableCell>{apt.professional}</TableCell>
                  <TableCell>{format(apt.date, 'dd MMM, yyyy, hh:mm a')}</TableCell>
                  <TableCell>{getStatusBadge(apt.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Reschedule</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Cancel Appointment</DropdownMenuItem>
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
