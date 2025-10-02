
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, ArrowRightLeft, FileArchive, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

const sampleClients = [
  { id: "CL-001", name: "Innovate LLC", gstin: "29AABCI5678G1Z4", email: "contact@innovate.llc" },
  { id: "CL-002", name: "Quantum Services", gstin: "07LMNOP1234Q1Z9", email: "accounts@quantum.com" },
  { id: "CL-003", name: "Synergy Corp", gstin: "24AAACS4321H1Z2", email: "finance@synergy.io" },
];

const sampleAssignedWork = [
    { id: 'REQ-001', client: 'Innovate LLC', type: 'Net Worth Certificate', dueDate: '2024-08-15', status: 'Pending' },
    { id: 'REQ-002', client: 'Synergy Corp', type: 'GST Notice Reply', dueDate: '2024-08-10', status: 'In Progress' },
];

interface ClientListProps {
  onSwitchWorkspace: (client: { id: string, name: string } | null) => void;
  activeClientId: string | null;
}

export function ClientList({ onSwitchWorkspace, activeClientId }: ClientListProps) {
  const { toast } = useToast();
  const [clients, setClients] = useState(sampleClients);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newClientName, setNewClientName] = useState("");
  const [newClientGstin, setNewClientGstin] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");


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
  
  const handleAddNewClient = () => {
    if (!newClientName || !newClientGstin || !newClientEmail) {
        toast({ variant: "destructive", title: "Missing fields", description: "Please fill out all client details."});
        return;
    }
    const newClient = {
        id: `CL-${String(clients.length + 1).padStart(3, '0')}`,
        name: newClientName,
        gstin: newClientGstin,
        email: newClientEmail,
    };
    setClients(prev => [...prev, newClient]);
    toast({ title: "Client Added", description: `${newClient.name} has been added to your client list.`});
    
    setNewClientName("");
    setNewClientGstin("");
    setNewClientEmail("");
    setIsDialogOpen(false);
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
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddNewClient}>Add Client</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
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
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileArchive /> Assigned Work</CardTitle>
          <CardDescription>A list of certification requests and other tasks assigned to you by the Super Admin.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Task / Document Type</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {sampleAssignedWork.map((work) => (
                        <TableRow key={work.id}>
                            <TableCell className="font-medium">{work.client}</TableCell>
                            <TableCell>{work.type}</TableCell>
                            <TableCell>{work.dueDate}</TableCell>
                            <TableCell><Badge variant={work.status === 'Pending' ? 'secondary' : 'default'}>{work.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm">View Details</Button>
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
