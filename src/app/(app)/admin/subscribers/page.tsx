
"use client";

import { useState, useEffect } from "react";
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
import { MoreHorizontal, BadgeDollarSign, Eye, CreditCard, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { SUPER_ADMIN_UID } from "@/lib/constants";

type Subscriber = {
  id: string;
  userId: string;
  userName: string;
  plan: string;
  startDate: string | null;
  status: 'Active' | 'Cancelled';
};

function formatSubscriberDate(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return format(date, 'dd MMM, yyyy');
}

export default function Subscribers() {
  const [user] = useAuthState(auth);
  const isSuperAdmin = !!user?.uid && user.uid === SUPER_ADMIN_UID;
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('Business');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSubscribers = async () => {
    if (!user?.uid) return;
    setIsLoadingList(true);
    try {
      const res = await fetch('/api/admin/subscribers', { headers: { 'x-user-id': user.uid } });
      if (res.status === 403) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'Super admin only.' });
        setSubscribers([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to load subscribers');
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load subscribers.' });
      setSubscribers([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (user && isSuperAdmin) fetchSubscribers();
    else if (!user) setIsLoadingList(false);
  }, [user?.uid, isSuperAdmin]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
      case "Cancelled":
         return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewBilling = (sub: Subscriber) => {
    setSelectedSubscriber(sub);
    setIsViewDialogOpen(true);
  };

  const handleChangePlan = (sub: Subscriber) => {
    setSelectedSubscriber(sub);
    setSelectedPlan(sub.plan || 'Business');
    setIsChangePlanDialogOpen(true);
  };

  const handleSavePlanChange = async () => {
    if (!selectedSubscriber) return;
    setIsLoading('change-plan');
    // TODO: add API to update planTier in compliance_subscriptions if needed
    setSubscribers(subscribers.map(s => 
      s.id === selectedSubscriber.id 
        ? { ...s, plan: selectedPlan }
        : s
    ));
    toast({
      title: "Plan Changed",
      description: `${selectedSubscriber.userName}'s subscription plan has been changed to ${selectedPlan}.`,
    });
    setIsChangePlanDialogOpen(false);
    setSelectedSubscriber(null);
    setIsLoading(null);
  };

  const handleCancelSubscription = async () => {
    if (!selectedSubscriber) return;
    setIsLoading('cancel');
    try {
      const res = await fetch('/api/admin/subscribers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.uid ?? '' },
        body: JSON.stringify({ subscriptionId: selectedSubscriber.id, status: 'cancelled' }),
      });
      if (!res.ok) throw new Error('Failed to cancel');
      setSubscribers(subscribers.map(s => 
        s.id === selectedSubscriber.id 
          ? { ...s, status: 'Cancelled' as const }
          : s
      ));
      toast({
        title: "Subscription Cancelled",
        description: `${selectedSubscriber.userName}'s subscription has been cancelled.`,
        variant: "destructive",
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to cancel subscription.' });
    } finally {
      setIsCancelDialogOpen(false);
      setSelectedSubscriber(null);
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <BadgeDollarSign className="size-6 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold">Subscribers</h1>
            <p className="text-muted-foreground">View and manage all active and past subscribers.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Subscribers</CardTitle>
          <CardDescription>Manage subscription plans and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">User</TableHead>
                  <TableHead className="min-w-[150px]">Subscription Plan</TableHead>
                  <TableHead className="min-w-[120px]">Start Date</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingList ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="inline h-5 w-5 animate-spin" /> Loading...
                    </TableCell>
                  </TableRow>
                ) : subscribers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No subscribers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  subscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.userName}</TableCell>
                      <TableCell>
                          <Badge variant={sub.plan === 'Complete' ? 'default' : 'secondary'}>{sub.plan}</Badge>
                      </TableCell>
                      <TableCell>{formatSubscriberDate(sub.startDate)}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewBilling(sub)} disabled={isLoading !== null}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Billing History
                            </DropdownMenuItem>
                            {sub.status === 'Active' && (
                              <>
                                <DropdownMenuItem onClick={() => handleChangePlan(sub)} disabled={isLoading !== null}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Change Plan
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedSubscriber(sub);
                                    setIsCancelDialogOpen(true);
                                  }}
                                  disabled={isLoading !== null}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Cancel Subscription
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

      {/* View Billing Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Billing History</DialogTitle>
            <DialogDescription>View subscription billing information</DialogDescription>
          </DialogHeader>
          {selectedSubscriber && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Subscriber</Label>
                <p className="text-sm font-medium">{selectedSubscriber.userName}</p>
              </div>
              <div className="space-y-2">
                <Label>Current Plan</Label>
                <Badge variant={selectedSubscriber.plan === 'Professional' ? 'default' : 'secondary'}>
                  {selectedSubscriber.plan}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <p className="text-sm font-medium">{formatSubscriberDate(selectedSubscriber.startDate)}</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div>{getStatusBadge(selectedSubscriber.status)}</div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Billing history will be displayed here.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={isChangePlanDialogOpen} onOpenChange={setIsChangePlanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>Select a new plan for this subscriber</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="change-plan">New Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger id="change-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Core">Core</SelectItem>
                  <SelectItem value="Statutory">Statutory</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePlanDialogOpen(false)} disabled={isLoading === 'change-plan'}>Cancel</Button>
            <Button onClick={handleSavePlanChange} disabled={isLoading === 'change-plan'}>
              {isLoading === 'change-plan' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel {selectedSubscriber?.userName}'s subscription? 
              This action will immediately cancel their access to premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading === 'cancel'}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription} disabled={isLoading === 'cancel'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoading === 'cancel' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel Subscription
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
