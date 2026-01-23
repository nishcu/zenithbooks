
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import { ChevronDown } from "lucide-react";
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';


export default function UserManagementPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("viewer");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<Array<{id: string, name: string}>>([]);
  const [isProfessional, setIsProfessional] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const [roleFocusedIndex, setRoleFocusedIndex] = useState(-1);
  const [clientFocusedIndex, setClientFocusedIndex] = useState(-1);
  
  const roles = [
    { value: "admin", label: "Admin (Full Access)" },
    { value: "accountant", label: "Accountant (Billing & Accounting)" },
    { value: "sales", label: "Sales (Billing only)" },
    { value: "viewer", label: "Viewer (Read-only)" },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
        setRoleFocusedIndex(-1);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
        setClientFocusedIndex(-1);
      }
    };

    if (showRoleDropdown || showClientDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showRoleDropdown, showClientDropdown]);

  // Handle keyboard navigation for role dropdown
  const handleRoleKeyDown = (e: React.KeyboardEvent) => {
    if (!showRoleDropdown) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setShowRoleDropdown(true);
        setRoleFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setRoleFocusedIndex((prev) => (prev < roles.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setRoleFocusedIndex((prev) => (prev > 0 ? prev - 1 : roles.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (roleFocusedIndex >= 0) {
          setNewUserRole(roles[roleFocusedIndex].value);
          setShowRoleDropdown(false);
          setRoleFocusedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowRoleDropdown(false);
        setRoleFocusedIndex(-1);
        break;
    }
  };

  // Handle keyboard navigation for client dropdown
  const handleClientKeyDown = (e: React.KeyboardEvent) => {
    const clientOptions = [
      { value: null, label: "Organization-wide (All Clients)" },
      ...clients.map(c => ({ value: c.id, label: `${c.name} (Client-specific)` }))
    ];

    if (!showClientDropdown) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setShowClientDropdown(true);
        setClientFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setClientFocusedIndex((prev) => (prev < clientOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setClientFocusedIndex((prev) => (prev > 0 ? prev - 1 : clientOptions.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (clientFocusedIndex >= 0) {
          const selected = clientOptions[clientFocusedIndex];
          setSelectedClientId(selected.value);
          setShowClientDropdown(false);
          setClientFocusedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowClientDropdown(false);
        setClientFocusedIndex(-1);
        break;
    }
  };

  const invitesQuery = user ? query(collection(db, 'userInvites'), where("invitedBy", "==", user.uid)) : null;
  const [invitesSnapshot, invitesLoading] = useCollection(invitesQuery);

  const users = useMemo(() => {
    return invitesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data()})) || [];
  }, [invitesSnapshot]);

  // Load user type and clients for professionals
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userType = userData?.userType;
          setIsProfessional(userType === 'professional');
          
          // Load clients if professional
          if (userType === 'professional') {
            const clientsQuery = query(
              collection(db, 'professional_clients'),
              where('professionalId', '==', user.uid)
            );
            const clientsSnapshot = await getDocs(clientsQuery);
            const clientsList = clientsSnapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data().name || 'Unknown Client'
            }));
            setClients(clientsList);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, [user]);

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
        const inviteData: any = {
            email: newUserEmail,
            role: newUserRole,
            status: "Invited",
            invitedBy: user.uid,
            invitedAt: new Date(),
        };
        
        // Add clientId if professional is inviting for a specific client
        if (isProfessional && selectedClientId) {
            inviteData.clientId = selectedClientId;
            inviteData.inviteType = 'client-specific';
        } else {
            inviteData.inviteType = 'organization-wide';
        }
        
        await addDoc(collection(db, "userInvites"), inviteData);

        toast({
            title: "Invitation Recorded",
            description: `${newUserEmail} has been invited as a ${newUserRole}. They need to sign up to accept.`
        });

        setIsInviteDialogOpen(false);
        setNewUserEmail("");
        setNewUserRole("viewer");
        setSelectedClientId(null);
        setShowRoleDropdown(false);
        setShowClientDropdown(false);

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
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen} modal={false}>
            <DialogTrigger asChild>
                 <Button>
                    <UserPlus className="mr-2"/>
                    Invite User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => {
              // Prevent closing when clicking on Select dropdowns
              const target = e.target as HTMLElement;
              if (target.closest('[role="listbox"]') || target.closest('[data-radix-portal]')) {
                e.preventDefault();
              }
            }}>
                <DialogHeader>
                    <DialogTitle>Invite a New User</DialogTitle>
                    <DialogDescription>
                        {isProfessional 
                          ? "Invite a user to help manage your organization or a specific client. They will need to sign up with this email."
                          : "The user will need to sign up with this email to join your organization."
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4" style={{ position: 'relative', zIndex: 1 }}>
                     <div className="space-y-2">
                        <Label htmlFor="user-email">Email Address</Label>
                        <Input id="user-email" type="email" placeholder="name@example.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                     </div>
                     {isProfessional && clients.length > 0 && (
                       <div className="space-y-2 relative">
                         <Label htmlFor="invite-scope">Invite For</Label>
                         <div className="relative" ref={clientDropdownRef}>
                           <button
                             type="button"
                             onClick={() => {
                               setShowClientDropdown(!showClientDropdown);
                               setShowRoleDropdown(false);
                               if (!showClientDropdown) {
                                 setClientFocusedIndex(0);
                               }
                             }}
                             onKeyDown={handleClientKeyDown}
                             className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                           >
                             <span>
                               {selectedClientId 
                                 ? clients.find(c => c.id === selectedClientId)?.name + " (Client-specific)"
                                 : "Organization-wide (All Clients)"
                               }
                             </span>
                             <ChevronDown className="h-4 w-4 opacity-50" />
                           </button>
                           {showClientDropdown && (
                             <div className="absolute z-[200] mt-1 w-full rounded-md border bg-popover shadow-md">
                               <div className="p-1">
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setSelectedClientId(null);
                                     setShowClientDropdown(false);
                                     setClientFocusedIndex(-1);
                                   }}
                                   onMouseEnter={() => setClientFocusedIndex(0)}
                                   className={`relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none ${
                                     clientFocusedIndex === 0 
                                       ? 'bg-accent text-accent-foreground' 
                                       : 'hover:bg-accent hover:text-accent-foreground'
                                   }`}
                                 >
                                   Organization-wide (All Clients)
                                 </button>
                                 {clients.map((client, index) => (
                                   <button
                                     key={client.id}
                                     type="button"
                                     onClick={() => {
                                       setSelectedClientId(client.id);
                                       setShowClientDropdown(false);
                                       setClientFocusedIndex(-1);
                                     }}
                                     onMouseEnter={() => setClientFocusedIndex(index + 1)}
                                     className={`relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none ${
                                       clientFocusedIndex === index + 1 
                                         ? 'bg-accent text-accent-foreground' 
                                         : 'hover:bg-accent hover:text-accent-foreground'
                                     }`}
                                   >
                                     {client.name} (Client-specific)
                                   </button>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                         <p className="text-xs text-muted-foreground">
                           {selectedClientId 
                             ? "This user will only have access to the selected client's data."
                             : "This user will have access to all clients and your organization data."
                           }
                         </p>
                       </div>
                     )}
                      <div className="space-y-2 relative">
                        <Label htmlFor="user-role">Role</Label>
                        <div className="relative" ref={roleDropdownRef}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowRoleDropdown(!showRoleDropdown);
                              setShowClientDropdown(false);
                              if (!showRoleDropdown) {
                                setRoleFocusedIndex(0);
                              }
                            }}
                            onKeyDown={handleRoleKeyDown}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <span>
                              {newUserRole === "admin" && "Admin (Full Access)"}
                              {newUserRole === "accountant" && "Accountant (Billing & Accounting)"}
                              {newUserRole === "sales" && "Sales (Billing only)"}
                              {newUserRole === "viewer" && "Viewer (Read-only)"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </button>
                          {showRoleDropdown && (
                            <div className="absolute z-[200] mt-1 w-full rounded-md border bg-popover shadow-md">
                              <div className="p-1">
                                {roles.map((role, index) => (
                                  <button
                                    key={role.value}
                                    type="button"
                                    onClick={() => {
                                      setNewUserRole(role.value);
                                      setShowRoleDropdown(false);
                                      setRoleFocusedIndex(-1);
                                    }}
                                    onMouseEnter={() => setRoleFocusedIndex(index)}
                                    className={`relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none ${
                                      roleFocusedIndex === index 
                                        ? 'bg-accent text-accent-foreground' 
                                        : 'hover:bg-accent hover:text-accent-foreground'
                                    }`}
                                  >
                                    {role.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
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
                        {isProfessional && <TableHead>Scope</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invitesLoading ? (
                        <TableRow><TableCell colSpan={isProfessional ? 5 : 4} className="h-24 text-center">Loading users...</TableCell></TableRow>
                    ) : users.length === 0 ? (
                         <TableRow><TableCell colSpan={isProfessional ? 5 : 4} className="h-24 text-center text-muted-foreground">No users have been invited yet.</TableCell></TableRow>
                    ) : (
                        users.map((u: any) => {
                          const clientName = u.clientId && clients.find(c => c.id === u.clientId)?.name;
                          return (
                        <TableRow key={u.id}>
                            <TableCell>
                                <div className="font-medium">{u.name || u.email}</div>
                                {u.name && <div className="text-sm text-muted-foreground">{u.email}</div>}
                            </TableCell>
                            <TableCell>{u.role}</TableCell>
                            {isProfessional && (
                              <TableCell>
                                {u.clientId ? (
                                  <Badge variant="outline">{clientName || 'Client'}</Badge>
                                ) : (
                                  <Badge variant="secondary">All Clients</Badge>
                                )}
                              </TableCell>
                            )}
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
                        );
                      })
                    )}
                </TableBody>
            </Table>
          </CardContent>
      </Card>
    </div>
  );
}
