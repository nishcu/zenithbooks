
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
import { MoreHorizontal, CalendarClock, Eye, Calendar, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Appointment = {
  id: string;
  clientName: string;
  service: string;
  professional: string;
  date: Date;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
};

const initialAppointments: Appointment[] = [
    { id: 'APT-001', clientName: 'Rohan Sharma', service: 'GST Registration', professional: 'Priya Mehta', date: new Date(2024, 7, 15, 10, 0), status: 'Confirmed' },
    { id: 'APT-002', clientName: 'Anjali Singh', service: 'ITR Filing', professional: 'Sunil Gupta', date: new Date(2024, 7, 15, 14, 0), status: 'Pending' },
    { id: 'APT-003', clientName: 'Vikram Rathod', service: 'Virtual CFO', professional: 'Rohan Sharma', date: new Date(2024, 7, 16, 11, 0), status: 'Completed' },
    { id: 'APT-004', clientName: 'Neha Desai', service: 'GST Notices', professional: 'Priya Mehta', date: new Date(2024, 7, 17, 15, 0), status: 'Cancelled' },
];

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleViewDetails = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setIsViewDialogOpen(true);
  };

  const handleReschedule = (apt: Appointment) => {
    setSelectedAppointment(apt);
    const dateStr = format(apt.date, 'yyyy-MM-dd');
    const timeStr = format(apt.date, 'HH:mm');
    setRescheduleDate(dateStr);
    setRescheduleTime(timeStr);
    setIsRescheduleDialogOpen(true);
  };

  const handleSaveReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;
    setIsLoading('reschedule');
    await new Promise(resolve => setTimeout(resolve, 800));
    const [hours, minutes] = rescheduleTime.split(':').map(Number);
    const newDate = new Date(rescheduleDate);
    newDate.setHours(hours, minutes);
    
    setAppointments(appointments.map(a => 
      a.id === selectedAppointment.id 
        ? { ...a, date: newDate, status: 'Confirmed' as Appointment['status'] }
        : a
    ));
    toast({
      title: "Appointment Rescheduled",
      description: `Appointment ${selectedAppointment.id} has been rescheduled successfully.`,
    });
    setIsRescheduleDialogOpen(false);
    setSelectedAppointment(null);
    setRescheduleDate('');
    setRescheduleTime('');
    setIsLoading(null);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    setIsLoading('cancel');
    await new Promise(resolve => setTimeout(resolve, 600));
    setAppointments(appointments.map(a => 
      a.id === selectedAppointment.id 
        ? { ...a, status: 'Cancelled' as Appointment['status'] }
        : a
    ));
    toast({
      title: "Appointment Cancelled",
      description: `Appointment ${selectedAppointment.id} has been cancelled.`,
      variant: "destructive",
    });
    setIsCancelDialogOpen(false);
    setSelectedAppointment(null);
    setIsLoading(null);
  };

  return (
    <div className="space-y-6 p-6">
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
          <CardDescription>View and manage appointment bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Appointment ID</TableHead>
                  <TableHead className="min-w-[150px]">Client</TableHead>
                  <TableHead className="min-w-[150px]">Service</TableHead>
                  <TableHead className="min-w-[150px]">Assigned Professional</TableHead>
                  <TableHead className="min-w-[180px]">Date & Time</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No appointments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((apt) => (
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewDetails(apt)} disabled={isLoading !== null}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                              <>
                                <DropdownMenuItem onClick={() => handleReschedule(apt)} disabled={isLoading !== null}>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Reschedule
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedAppointment(apt);
                                    setIsCancelDialogOpen(true);
                                  }}
                                  disabled={isLoading !== null}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Cancel Appointment
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

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>View complete appointment information</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Appointment ID</Label>
                <p className="text-sm font-mono font-medium">{selectedAppointment.id}</p>
              </div>
              <div className="space-y-2">
                <Label>Client Name</Label>
                <p className="text-sm font-medium">{selectedAppointment.clientName}</p>
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <p className="text-sm font-medium">{selectedAppointment.service}</p>
              </div>
              <div className="space-y-2">
                <Label>Assigned Professional</Label>
                <p className="text-sm font-medium">{selectedAppointment.professional}</p>
              </div>
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <p className="text-sm font-medium">{format(selectedAppointment.date, 'dd MMM, yyyy, hh:mm a')}</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div>{getStatusBadge(selectedAppointment.status)}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>Select a new date and time for this appointment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)} disabled={isLoading === 'reschedule'}>Cancel</Button>
            <Button onClick={handleSaveReschedule} disabled={!rescheduleDate || !rescheduleTime || isLoading === 'reschedule'}>
              {isLoading === 'reschedule' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Appointment Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel appointment {selectedAppointment?.id}? 
              This action will notify the client and professional about the cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading === 'cancel'}>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAppointment} disabled={isLoading === 'cancel'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoading === 'cancel' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel Appointment
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
