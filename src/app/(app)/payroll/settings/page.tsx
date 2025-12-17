
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocument } from "react-firebase-hooks/firestore";
import { auth, db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
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
  DialogFooter
} from "@/components/ui/dialog";

type Component = {
    id: string;
    name: string;
    type: 'earning' | 'deduction';
};

// Start empty to avoid showing dummy/default data.
const initialComponents: Component[] = [];

type PayrollSettingsDoc = {
    employerId: string;
    statutory: {
        pfEnabled: boolean;
        pfNumber: string;
        pfEmployeeRatePercent?: number; // user-configurable
        esiEnabled: boolean;
        esiNumber: string;
        esiEmployeeRatePercent?: number; // user-configurable
        ptEnabled: boolean;
        ptEmployeeAmount?: number; // user-configurable fixed amount per month
    };
    components: Component[];
    updatedAt?: any;
    createdAt?: any;
};

export default function PayrollSettingsPage() {
    const [user] = useAuthState(auth);
    const settingsRef = useMemo(() => (user ? doc(db, "payrollSettings", user.uid) : null), [user]);
    const [settingsSnap, settingsLoading, settingsError] = useDocument(settingsRef as any);

    const [components, setComponents] = useState(initialComponents);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newComponent, setNewComponent] = useState({ name: "", type: "earning" as 'earning' | 'deduction' });
    const [editingComponent, setEditingComponent] = useState<Component | null>(null);

    const [pfEnabled, setPfEnabled] = useState(true);
    const [pfNumber, setPfNumber] = useState("");
    const [pfRatePercent, setPfRatePercent] = useState("12");
    const [esiEnabled, setEsiEnabled] = useState(true);
    const [esiNumber, setEsiNumber] = useState("");
    const [esiRatePercent, setEsiRatePercent] = useState("0");
    const [ptEnabled, setPtEnabled] = useState(false);
    const [ptAmount, setPtAmount] = useState("0");

    // Load saved settings from Firestore
    useEffect(() => {
        if (!settingsSnap?.exists()) return;
        const data = settingsSnap.data() as any;
        const statutory = data?.statutory || {};
        setPfEnabled(!!statutory.pfEnabled);
        setPfNumber(statutory.pfNumber || "");
        setPfRatePercent(
            statutory.pfEmployeeRatePercent != null ? String(statutory.pfEmployeeRatePercent) : "12"
        );
        setEsiEnabled(!!statutory.esiEnabled);
        setEsiNumber(statutory.esiNumber || "");
        setEsiRatePercent(
            statutory.esiEmployeeRatePercent != null ? String(statutory.esiEmployeeRatePercent) : "0"
        );
        setPtEnabled(!!statutory.ptEnabled);
        setPtAmount(statutory.ptEmployeeAmount != null ? String(statutory.ptEmployeeAmount) : "0");
        setComponents(Array.isArray(data?.components) ? data.components : []);
    }, [settingsSnap]);

    const toNumberOrZero = (v: string) => {
        const n = parseFloat(String(v || "").replace(/,/g, ""));
        return isNaN(n) ? 0 : n;
    };

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

    const handleSaveSettings = async () => {
        if (!user) return;
        const payload: PayrollSettingsDoc = {
            employerId: user.uid,
            statutory: {
                pfEnabled,
                pfNumber: pfNumber.trim(),
                pfEmployeeRatePercent: toNumberOrZero(pfRatePercent),
                esiEnabled,
                esiNumber: esiNumber.trim(),
                esiEmployeeRatePercent: toNumberOrZero(esiRatePercent),
                ptEnabled,
                ptEmployeeAmount: toNumberOrZero(ptAmount),
            },
            components,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "payrollSettings", user.uid), payload, { merge: true });
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Payroll Settings</h1>
                <p className="text-muted-foreground">Configure your organization's payroll components and rules.</p>
            </div>

            {settingsLoading && (
                <div className="text-sm text-muted-foreground">Loading saved settings...</div>
            )}
            {settingsError && (
                <div className="text-sm text-destructive">
                    Failed to load settings: {(settingsError as any)?.message || "Unknown error"}
                </div>
            )}
            {!user && (
                <div className="text-sm text-destructive">Please login to manage payroll settings.</div>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Statutory Components</CardTitle>
                    <CardDescription>Enable and configure statutory deductions for your employees.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="pf-enabled" checked={pfEnabled} onCheckedChange={(v) => setPfEnabled(!!v)} />
                        <Label htmlFor="pf-enabled">Enable Provident Fund (PF)</Label>
                    </div>
                    <div className="space-y-2 pl-6">
                        <Label>PF Number</Label>
                        <Input placeholder="Enter PF number" value={pfNumber} onChange={(e) => setPfNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2 pl-6">
                        <Label>PF Employee % (Monthly)</Label>
                        <Input
                            inputMode="decimal"
                            placeholder="12"
                            value={pfRatePercent}
                            onChange={(e) => setPfRatePercent(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">This % will be applied on employee Basic (monthly).</p>
                    </div>
                     <div className="flex items-center space-x-2 pt-4">
                        <Checkbox id="esi-enabled" checked={esiEnabled} onCheckedChange={(v) => setEsiEnabled(!!v)} />
                        <Label htmlFor="esi-enabled">Enable Employee State Insurance (ESI)</Label>
                    </div>
                     <div className="space-y-2 pl-6">
                        <Label>ESI Number</Label>
                        <Input placeholder="Enter ESI number" value={esiNumber} onChange={(e) => setEsiNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2 pl-6">
                        <Label>ESI Employee % (Monthly)</Label>
                        <Input
                            inputMode="decimal"
                            placeholder="0.75"
                            value={esiRatePercent}
                            onChange={(e) => setEsiRatePercent(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">This % will be applied on employee Gross (monthly).</p>
                    </div>
                     <div className="flex items-center space-x-2 pt-4">
                        <Checkbox id="pt-enabled" checked={ptEnabled} onCheckedChange={(v) => setPtEnabled(!!v)} />
                        <Label htmlFor="pt-enabled">Enable Professional Tax (PT)</Label>
                    </div>
                    <div className="space-y-2 pl-6">
                        <Label>PT Amount (Monthly)</Label>
                        <Input
                            inputMode="decimal"
                            placeholder="200"
                            value={ptAmount}
                            onChange={(e) => setPtAmount(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Fixed amount per employee per month (e.g., ₹200).</p>
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
                    <Button onClick={handleSaveSettings} disabled={!user}>
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
