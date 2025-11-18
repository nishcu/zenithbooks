
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
import { MoreHorizontal, BadgeDollarSign, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const sampleSubscribers = [
    { id: 'SUB-001', userName: 'Rohan Sharma', plan: 'Professional', startDate: new Date(2024, 6, 1), status: 'Active' },
    { id: 'SUB-002', userName: 'Priya Mehta', plan: 'Business', startDate: new Date(2024, 5, 15), status: 'Active' },
    { id: 'SUB-003', userName: 'Anjali Singh', plan: 'Business', startDate: new Date(2023, 4, 10), status: 'Cancelled' },
];

type Subscriber = typeof sampleSubscribers[number];

const plans = ["Business", "Professional", "Enterprise"];

const getBillingHistory = (subscriber: Subscriber) => ([
  { id: `${subscriber.id}-INV-101`, amount: subscriber.plan === "Business" ? "₹2,499" : "₹1,499", date: "14 Jul, 2024", status: "Paid" },
  { id: `${subscriber.id}-INV-090`, amount: subscriber.plan === "Business" ? "₹2,499" : "₹1,499", date: "14 Jun, 2024", status: "Paid" },
]);

export default function Subscribers() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState(sampleSubscribers);
  const [billingTarget, setBillingTarget] = useState<Subscriber | null>(null);
  const [planTarget, setPlanTarget] = useState<Subscriber | null>(null);
  const [newPlan, setNewPlan] = useState<string>("");
  const [cancelTarget, setCancelTarget] = useState<Subscriber | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const openBillingHistory = (subscriber: Subscriber) => {
    setBillingTarget(subscriber);
  };

  const openPlanDialog = (subscriber: Subscriber) => {
    setPlanTarget(subscriber);
    setNewPlan(subscriber.plan);
  };

  const handlePlanChange = async () => {
    if (!planTarget || !newPlan) return;
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSubscribers((prev) =>
      prev.map((sub) =>
        sub.id === planTarget.id ? { ...sub, plan: newPlan } : sub
      )
    );
    toast({
      title: "Plan updated",
      description: `${planTarget.userName} has been moved to the ${newPlan} plan.`,
    });
    setIsSaving(false);
    setPlanTarget(null);
  };

  const handleCancelSubscription = async () => {
    if (!cancelTarget) return;
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSubscribers((prev) =>
      prev.map((sub) =>
        sub.id === cancelTarget.id ? { ...sub, status: "Cancelled" } : sub
      )
    );
    toast({
      variant: "destructive",
      title: "Subscription cancelled",
      description: `${cancelTarget.userName} can no longer access paid features.`,
    });
    setIsSaving(false);
    setCancelTarget(null);
  };

  return (
    <>
      <div className="space-y-8">
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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Subscription Plan</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.userName}</TableCell>
                    <TableCell>
                        <Badge variant={sub.plan === 'Professional' ? 'default' : 'secondary'}>{sub.plan}</Badge>
                    </TableCell>
                    <TableCell>{format(sub.startDate, 'dd MMM, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openBillingHistory(sub)}>View Billing History</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openPlanDialog(sub)}>Change Plan</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setCancelTarget(sub)}>Cancel Subscription</DropdownMenuItem>
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

      <Dialog open={!!billingTarget} onOpenChange={(open) => !open && setBillingTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Billing History</DialogTitle>
            <DialogDescription>Recent invoices for the selected subscriber.</DialogDescription>
          </DialogHeader>
          {billingTarget && (
            <div className="space-y-4 text-sm">
              <p className="font-medium">{billingTarget.userName}</p>
              <div className="border rounded-md divide-y">
                {getBillingHistory(billingTarget).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium">{invoice.amount}</p>
                      <p className="text-xs text-muted-foreground">{invoice.id}</p>
                    </div>
                    <div className="text-right">
                      <p>{invoice.date}</p>
                      <Badge variant="secondary">{invoice.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!planTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPlanTarget(null);
            setIsSaving(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>Select a new plan tier for this subscriber.</DialogDescription>
          </DialogHeader>
          {planTarget && (
            <div className="space-y-4">
              <p className="font-medium">{planTarget.userName}</p>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button disabled={isSaving} onClick={handlePlanChange}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open && !isSaving) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will immediately lose access to paid modules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault();
                handleCancelSubscription();
              }}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
