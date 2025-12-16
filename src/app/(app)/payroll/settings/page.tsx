
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, PlusCircle, Trash2, Edit } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

type Component = {
    id: string;
    name: string;
    type: 'earning' | 'deduction';
};

const initialComponents: Component[] = [
    { id: 'basic', name: 'Basic Salary', type: 'earning' },
    { id: 'hra', name: 'House Rent Allowance (HRA)', type: 'earning' },
    { id: 'special', name: 'Special Allowance', type: 'earning' },
    { id: 'pf', name: 'Provident Fund (PF)', type: 'deduction' },
    { id: 'proftax', name: 'Professional Tax', type: 'deduction' },
];


export default function PayrollSettingsPage() {
    const [components, setComponents] = useState(initialComponents);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newComponent, setNewComponent] = useState({ name: "", type: "earning" as 'earning' | 'deduction' });
    const [editingComponent, setEditingComponent] = useState<Component | null>(null);

    const handleOpenDialog = (component: Component | null = null) => {
        setEditingComponent(component);
        setNewComponent(component || { name: "", type: "earning" });
        setIsDialogOpen(true);
    };

    const handleSaveComponent = () => {
        if(editingComponent) {
            setComponents(components.map(c => c.id === editingComponent.id ? {...c, ...newComponent} : c));
        } else {
             setComponents([...components, { ...newComponent, id: `comp-${Date.now()}` }]);
        }
        setIsDialogOpen(false);
    };
    
    const handleDeleteComponent = (id: string) => {
        setComponents(components.filter(c => c.id !== id));
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Payroll Settings</h1>
                <p className="text-muted-foreground">Configure your organization's payroll components and rules.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Statutory Components</CardTitle>
                    <CardDescription>Enable and configure statutory deductions for your employees.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="pf-enabled" defaultChecked/>
                        <Label htmlFor="pf-enabled">Enable Provident Fund (PF)</Label>
                    </div>
                    <div className="space-y-2 pl-6">
                        <Label>PF Number</Label>
                        <Input defaultValue="MH/BOM/1234567/000/1234567"/>
                    </div>
                     <div className="flex items-center space-x-2 pt-4">
                        <Checkbox id="esi-enabled" defaultChecked/>
                        <Label htmlFor="esi-enabled">Enable Employee State Insurance (ESI)</Label>
                    </div>
                     <div className="space-y-2 pl-6">
                        <Label>ESI Number</Label>
                        <Input defaultValue="12345678901234567"/>
                    </div>
                     <div className="flex items-center space-x-2 pt-4">
                        <Checkbox id="pt-enabled"/>
                        <Label htmlFor="pt-enabled">Enable Professional Tax (PT)</Label>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Salary Components</CardTitle>
                    <CardDescription>Manage earnings and deduction components for your salary structure.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex justify-end mb-4">
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2"/> Add Component
                        </Button>
                    </div>
                     <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Component Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {components.map(comp => (
                                    <TableRow key={comp.id}>
                                        <TableCell className="font-medium">{comp.name}</TableCell>
                                        <TableCell className="capitalize">{comp.type}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(comp)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteComponent(comp.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                </CardContent>
                 <CardFooter className="justify-end">
                    <Button>
                        <Save className="mr-2"/>
                        Save Settings
                    </Button>
                </CardFooter>
            </Card>

             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Salary Component</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Component Name</Label>
                            <Input value={newComponent.name} onChange={e => setNewComponent(p => ({...p, name: e.target.value}))}/>
                        </div>
                        <div className="space-y-2">
                            <Label>Component Type</Label>
                             <select className="h-10 w-full rounded-md border border-input px-3" value={newComponent.type} onChange={e => setNewComponent(p => ({...p, type: e.target.value as any}))}>
                                <option value="earning">Earning</option>
                                <option value="deduction">Deduction</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveComponent}>Save Component</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
