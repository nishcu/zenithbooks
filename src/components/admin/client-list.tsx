
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, ArrowRightLeft, FileArchive, LogIn, Users, Inbox, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";

interface ClientListProps {
  onSwitchWorkspace: (client: { id: string, name: string } | null) => void;
  activeClientId: string | null;
}

interface Client {
  id: string;
  name: string;
  gstin: string;
  email: string;
  createdAt?: any;
}

export function ClientList({ onSwitchWorkspace, activeClientId }: ClientListProps) {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newClientName, setNewClientName] = useState("");
  const [newClientGstin, setNewClientGstin] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");

  // Load clients from Firestore
  const clientsQuery = user 
    ? query(
        collection(db, "professional_clients"),
        where("professionalId", "==", user.uid),
        orderBy("createdAt", "desc")
      )
    : null;
  
  const [clientsSnapshot, clientsLoading] = useCollection(clientsQuery);
  const clients: Client[] = clientsSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Client)) || [];

  const handleSwitchWorkspace = (client: {id: string, name: string} | null) => {
    if (client && client.id === activeClientId) {
      // If clicking the active client, switch back to own workspace
      onSwitchWorkspace(null);
      toast({
        title: "Switched to Own Workspace",
      });
    } else {
      onSwitchWorkspace(client);
      if(client) {
        toast({
            title: `Switched to ${client.name}'s Workspace`,
            description: `You are now managing the account for ${client.name}.`,
        });
      }
    }
  };
  
  const handleAddNewClient = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not authenticated", description: "Please sign in to add clients."});
      return;
    }

    if (!newClientName || !newClientGstin || !newClientEmail) {
        toast({ variant: "destructive", title: "Missing fields", description: "Please fill out all client details."});
        return;
    }

    setIsSaving(true);
    try {
      // Save client to Firestore
      const clientData = {
        professionalId: user.uid,
        name: newClientName.trim(),
        gstin: newClientGstin.trim(),
        email: newClientEmail.trim(),
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "professional_clients"), clientData);

      toast({ 
        title: "Client Added", 
        description: `${newClientName.trim()} has been added to your client list.` 
      });
      
      // Clear form
      setNewClientName("");
      setNewClientGstin("");
      setNewClientEmail("");
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message || "Failed to add client. Please try again." 
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Client Management</CardTitle>
          <CardDescription>View clients linked to your professional account and switch between their workspaces to manage their data.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex justify-end mb-4">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2" /> Add New Client
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Client</DialogTitle>
                            <DialogDescription>Enter the details of the new client you want to manage.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="client-name">Client Name / Business Name</Label>
                                <Input id="client-name" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="e.g., Apex Solutions" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="client-gstin">Client GSTIN</Label>
                                <Input id="client-gstin" value={newClientGstin} onChange={e => setNewClientGstin(e.target.value)} placeholder="15-digit GSTIN" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="client-email">Contact Email</Label>
                                <Input id="client-email" type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="contact@example.com" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleAddNewClient} disabled={isSaving}>
                              {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                "Add Client"
                              )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            {clientsLoading ? (
              <div className="border rounded-md p-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading clients...</p>
                </div>
              </div>
            ) : clients.length === 0 ? (
              <div className="border rounded-md p-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No clients yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start managing your clients by adding your first client to the list.
                    </p>
                  </div>
                  <Button onClick={() => setIsDialogOpen(true)} className="mt-4">
                    <PlusCircle className="mr-2" /> Add Your First Client
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className={!activeClientId ? "bg-primary/10" : ""}>
                      <TableCell className="font-medium">My Workspace</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">Your own business data</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={!activeClientId ? "default" : "outline"}
                          size="sm"
                          disabled={!activeClientId}
                          onClick={() => handleSwitchWorkspace(null)}
                        >
                          <LogIn className="mr-2" />
                          My Workspace
                        </Button>
                      </TableCell>
                    </TableRow>
                    {clients.map((client) => (
                      <TableRow key={client.id} className={activeClientId === client.id ? "bg-primary/10" : ""}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {client.gstin}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={activeClientId === client.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSwitchWorkspace(client)}
                          >
                            <ArrowRightLeft className="mr-2" />
                            {activeClientId === client.id ? "Viewing" : "Manage"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileArchive /> Assigned Work</CardTitle>
          <CardDescription>A list of certification requests and other tasks assigned to you by the Super Admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md p-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Inbox className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No assigned work</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tasks and certification requests assigned to you will appear here.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
