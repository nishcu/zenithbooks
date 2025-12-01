
"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';


export default function UserManagementPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("viewer");

  const invitesQuery = user ? query(collection(db, 'userInvites'), where("invitedBy", "==", user.uid)) : null;
  const [invitesSnapshot, invitesLoading] = useCollection(invitesQuery);

  const users = useMemo(() => {
    return invitesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data()})) || [];
  }, [invitesSnapshot]);

  const handleAction = (action: string, userId: string) => {
    toast({
        title: `Action: ${action}`,
        description: `This is a placeholder for ${action} on user ${userId}.`
    });
  }

  const handleSendInvite = async () => {
    if (!newUserEmail || !newUserRole) {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Please enter an email and select a role."
        });
        return;
    }

    if (!user) {
        toast({ variant: "destructive", title: "Not Authenticated" });
        return;
    }

    setIsInviting(true);
    try {
        await addDoc(collection(db, "userInvites"), {
            email: newUserEmail,
            role: newUserRole,
            status: "Invited",
            invitedBy: user.uid,
            invitedAt: new Date(),
        });

        toast({
            title: "Invitation Recorded",
            description: `${newUserEmail} has been invited as a ${newUserRole}. They need to sign up to accept.`
        });

        setIsInviteDialogOpen(false);
        setNewUserEmail("");
        setNewUserRole("viewer");

    } catch(error: any) {
         toast({
            variant: "destructive",
            title: "Failed to send invite",
            description: error.message || "Could not save the invitation to the database."
        });
    } finally {
        setIsInviting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Invite, manage, and set permissions for users in your organization.
          </p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
                 <Button>
                    <UserPlus className="mr-2"/>
                    Invite User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite a New User</DialogTitle>
                    <DialogDescription>
                        The user will need to sign up with this email to join your organization.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="user-email">Email Address</Label>
                        <Input id="user-email" type="email" placeholder="name@example.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-role">Role</Label>
                        <Select value={newUserRole} onValueChange={setNewUserRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin (Full Access)</SelectItem>
                                <SelectItem value="accountant">Accountant (Billing & Accounting)</SelectItem>
                                <SelectItem value="sales">Sales (Billing only)</SelectItem>
                                <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                </div>
                <DialogFooter>
                     <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={handleSendInvite} disabled={isInviting}>
                        {isInviting && <Loader2 className="mr-2 animate-spin"/>}
                        Send Invitation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Invited & Active Users</CardTitle>
              <CardDescription>A list of all users with access to this organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invitesLoading ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading users...</TableCell></TableRow>
                    ) : users.length === 0 ? (
                         <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No users have been invited yet.</TableCell></TableRow>
                    ) : (
                        users.map((u: any) => (
                        <TableRow key={u.id}>
                            <TableCell>
                                <div className="font-medium">{u.name || u.email}</div>
                                {u.name && <div className="text-sm text-muted-foreground">{u.email}</div>}
                            </TableCell>
                            <TableCell>{u.role}</TableCell>
                             <TableCell>
                                <Badge variant={u.status === "Active" ? "default" : "secondary"} className={u.status === "Active" ? "bg-green-600" : ""}>
                                    {u.status}
                                </Badge>
                             </TableCell>
                            <TableCell className="text-right">
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => handleAction("Edit", u.id)}><Edit className="mr-2"/>Edit Role</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onSelect={() => handleAction("Delete", u.id)}>
                                            <Trash2 className="mr-2"/>Remove User
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )))}
                </TableBody>
            </Table>
          </CardContent>
      </Card>
    </div>
  );
}
