
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
import { MoreHorizontal, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const sampleUsers = [
    { id: 'USR-001', name: 'Rohan Sharma', email: 'rohan.sharma@example.com', type: 'Professional', joinedOn: new Date(2024, 6, 1), status: 'Active' },
    { id: 'USR-002', name: 'Priya Mehta', email: 'priya.mehta@example.com', type: 'Business', joinedOn: new Date(2024, 5, 15), status: 'Active' },
    { id: 'USR-003', name: 'Anjali Singh', email: 'anjali.singh@example.com', type: 'Business', joinedOn: new Date(2024, 5, 10), status: 'Inactive' },
];

type User = typeof sampleUsers[number];

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState(sampleUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "reset" | "suspend"; user: User } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
      case "Inactive":
         return <Badge variant="secondary">Inactive</Badge>;
      case "Suspended":
         return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const handleConfirmableAction = (type: "reset" | "suspend", user: User) => {
    setConfirmAction({ type, user });
  };

  const processAction = async () => {
    if (!confirmAction) return;
    setIsProcessingAction(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (confirmAction.type === "reset") {
      toast({
        title: "Password reset link sent",
        description: `An email has been sent to ${confirmAction.user.email}.`,
      });
    } else {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === confirmAction.user.id ? { ...user, status: "Suspended" } : user
        )
      );
      toast({
        variant: "destructive",
        title: "User suspended",
        description: `${confirmAction.user.name} no longer has access.`,
      });
    }
    setIsProcessingAction(false);
    setConfirmAction(null);
  };

  return (
    <>
      <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <Users className="size-6 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold">All Users</h1>
            <p className="text-muted-foreground">View and manage all registered users on the platform.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>User Type</TableHead>
                <TableHead>Joined On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                      <Badge variant={user.type === 'Professional' ? 'default' : 'outline'}>{user.type}</Badge>
                  </TableCell>
                  <TableCell>{format(user.joinedOn, 'dd MMM, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleViewDetails(user)}>View User Details</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleConfirmableAction("reset", user)}>Reset Password</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => handleConfirmableAction("suspend", user)}>Suspend User</DropdownMenuItem>
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
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) setSelectedUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Key information about the selected user.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{selectedUser.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p>{selectedUser.email}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">User Type</p>
                  <p>{selectedUser.type}</p>
                </div>
                {getStatusBadge(selectedUser.status)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined On</p>
                <p>{format(selectedUser.joinedOn, "dd MMM, yyyy")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open && !isProcessingAction) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "reset" ? "Send password reset link?" : "Suspend this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "reset"
                ? `We will email ${confirmAction?.user.email} with a secure password reset link.`
                : `${confirmAction?.user.name} will immediately lose access to the platform.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isProcessingAction}
              onClick={(event) => {
                event.preventDefault();
                processAction();
              }}
            >
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmAction?.type === "reset" ? "Send Link" : "Suspend User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
