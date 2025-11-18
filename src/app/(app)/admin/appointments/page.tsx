
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const sampleAppointments = [
    { id: 'APT-001', clientName: 'Rohan Sharma', service: 'GST Registration', professional: 'Priya Mehta', date: new Date(2024, 7, 15, 10, 0), status: 'Confirmed' },
    { id: 'APT-002', clientName: 'Anjali Singh', service: 'ITR Filing', professional: 'Sunil Gupta', date: new Date(2024, 7, 15, 14, 0), status: 'Pending' },
    { id: 'APT-003', clientName: 'Vikram Rathod', service: 'Virtual CFO', professional: 'Rohan Sharma', date: new Date(2024, 7, 16, 11, 0), status: 'Completed' },
    { id: 'APT-004', clientName: 'Neha Desai', service: 'GST Notices', professional: 'Priya Mehta', date: new Date(2024, 7, 17, 15, 0), status: 'Cancelled' },
];

type Appointment = typeof sampleAppointments[number];

export default function AdminAppointments() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState(sampleAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

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

  const openDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsOpen(true);
  };

  const openReschedule = (appointment: Appointment) => {
    setRescheduleTarget(appointment);
    setRescheduleSlot(format(appointment.date, "yyyy-MM-dd'T'HH:mm"));
    setRescheduleNotes("");
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleSlot) {
      toast({
        variant: "destructive",
        title: "Missing slot",
        description: "Select a new date and time to reschedule.",
      });
      return;
    }
    setIsRescheduling(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === rescheduleTarget.id
          ? { ...apt, date: new Date(rescheduleSlot), status: "Confirmed" }
          : apt
      )
    );
    toast({
      title: "Appointment rescheduled",
      description: `${rescheduleTarget.clientName} has been notified.`,
    });
    setIsRescheduling(false);
    setRescheduleTarget(null);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === cancelTarget.id ? { ...apt, status: "Cancelled" } : apt
      )
    );
    toast({
      variant: "destructive",
      title: "Appointment cancelled",
      description: `${cancelTarget.clientName} and ${cancelTarget.professional} will receive alerts.`,
    });
    setIsCancelling(false);
    setCancelTarget(null);
  };

  return (
    <>
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
                {appointments.map((apt) => (
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
                          <DropdownMenuItem onSelect={() => openDetails(apt)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openReschedule(apt)}>Reschedule</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setCancelTarget(apt)}>Cancel Appointment</DropdownMenuItem>
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

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedAppointment(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>Full context for the selected booking.</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedAppointment.clientName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Professional</p>
                  <p>{selectedAppointment.professional}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Service</p>
                <p>{selectedAppointment.service}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                  <p>{format(selectedAppointment.date, 'dd MMM, yyyy, hh:mm a')}</p>
                </div>
                {getStatusBadge(selectedAppointment.status)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p>{selectedAppointment.status === "Pending" ? "Awaiting confirmation from professional." : "No additional notes."}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleTarget(null);
            setIsRescheduling(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>Pick a new slot and optionally add internal notes.</DialogDescription>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="font-medium">{rescheduleTarget.clientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New Date & Time</p>
                <Input
                  type="datetime-local"
                  value={rescheduleSlot}
                  onChange={(event) => setRescheduleSlot(event.target.value)}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notes to send</p>
                <Textarea
                  placeholder="Share context with the client and professional..."
                  value={rescheduleNotes}
                  onChange={(event) => setRescheduleNotes(event.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={isRescheduling}
              onClick={handleReschedule}
            >
              {isRescheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open && !isCancelling) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Both the client and professional will be notified immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelling}
              onClick={(event) => {
                event.preventDefault();
                handleCancel();
              }}
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
