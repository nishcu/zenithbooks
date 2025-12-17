
"use client";

import { useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, query, serverTimestamp, where } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// NOTE: payroll employees are stored in Firestore ("employees" collection).
// Dummy data removed to avoid confusion.

type PayrollEmployee = {
  id: string;
  employerId?: string;
  name: string;
  pan: string;
  aadhaar?: string;
  designation: string;
  doj?: string;
  employmentType?: "permanent" | "contract" | "probation";
  residentialStatus?: "resident" | "non-resident" | "resident-but-not-ordinarily-resident";
  taxRegime?: "OLD" | "NEW";
  status?: "Active" | "Resigned";
};

export default function PayrollEmployeesPage() {
    const [user] = useAuthState(auth);
    const employeesQuery = user ? query(collection(db, "employees"), where("employerId", "==", user.uid)) : null;
    const [employeesSnapshot, employeesLoading, employeesError] = useCollection(employeesQuery);
    const employees: PayrollEmployee[] = useMemo(() => {
      // If not logged in, show empty list (no dummy data)
      if (!user) return [];
      return employeesSnapshot?.docs.map(d => ({ id: d.id, ...(d.data() as any) })) || [];
    }, [employeesSnapshot, user]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        name: "",
        pan: "",
        aadhaar: "",
        designation: "",
        doj: "",
        employmentType: "permanent" as "permanent" | "contract" | "probation",
        residentialStatus: "resident" as "resident" | "non-resident" | "resident-but-not-ordinarily-resident",
        taxRegime: "NEW" as "OLD" | "NEW"
    });
    const { toast } = useToast();

    const handleAddEmployee = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Login required", description: "Please login to add employees." });
            return;
        }
        if (!newEmployee.name || !newEmployee.pan || !newEmployee.designation) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please provide name, PAN, and designation."
            });
            return;
        }

        // Validate PAN format
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(newEmployee.pan)) {
            toast({
                variant: "destructive",
                title: "Invalid PAN",
                description: "PAN must be in format ABCDE1234F"
            });
            return;
        }

        try {
            await addDoc(collection(db, "employees"), {
                employerId: user.uid,
                name: newEmployee.name.trim(),
                pan: newEmployee.pan.trim().toUpperCase(),
                aadhaar: (newEmployee.aadhaar || "").trim(),
                designation: newEmployee.designation.trim(),
                doj: newEmployee.doj || "",
                employmentType: newEmployee.employmentType,
                residentialStatus: newEmployee.residentialStatus,
                taxRegime: newEmployee.taxRegime,
                status: "Active",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast({ title: "Employee Added", description: `${newEmployee.name} has been added.` });
            setIsDialogOpen(false);
            setNewEmployee({
                name: "",
                pan: "",
                aadhaar: "",
                designation: "",
                doj: "",
                employmentType: "permanent",
                residentialStatus: "resident",
                taxRegime: "NEW",
            });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Failed to add employee", description: e?.message || "Unknown error" });
        }
    };

    const handleDeactivate = async (employeeId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "employees", employeeId));
            toast({ title: "Employee removed" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Action failed", description: e?.message || "Unknown error" });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Employees</h1>
                    <p className="text-muted-foreground">Manage your employee master data.</p>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2"/>
                            Add New Employee
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Employee</DialogTitle>
                            <DialogDescription>Enter comprehensive employee details for payroll and Form 16 generation.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emp-name">Employee Name *</Label>
                                    <Input
                                        id="emp-name"
                                        value={newEmployee.name}
                                        onChange={e => setNewEmployee(p => ({...p, name: e.target.value}))}
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emp-pan">PAN Number *</Label>
                                    <Input
                                        id="emp-pan"
                                        value={newEmployee.pan}
                                        onChange={e => setNewEmployee(p => ({...p, pan: e.target.value.toUpperCase()}))}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emp-aadhaar">Aadhaar Number</Label>
                                    <Input
                                        id="emp-aadhaar"
                                        value={newEmployee.aadhaar}
                                        onChange={e => setNewEmployee(p => ({...p, aadhaar: e.target.value}))}
                                        placeholder="12-digit Aadhaar number"
                                        maxLength={12}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emp-designation">Designation *</Label>
                                    <Input
                                        id="emp-designation"
                                        value={newEmployee.designation}
                                        onChange={e => setNewEmployee(p => ({...p, designation: e.target.value}))}
                                        placeholder="Job title/designation"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emp-doj">Date of Joining</Label>
                                    <Input
                                        id="emp-doj"
                                        type="date"
                                        value={newEmployee.doj}
                                        onChange={e => setNewEmployee(p => ({...p, doj: e.target.value}))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emp-type">Employment Type</Label>
                                    <select
                                        id="emp-type"
                                        className="h-10 w-full rounded-md border border-input px-3"
                                        value={newEmployee.employmentType}
                                        onChange={e => setNewEmployee(p => ({...p, employmentType: e.target.value as any}))}
                                    >
                                        <option value="permanent">Permanent</option>
                                        <option value="contract">Contract</option>
                                        <option value="probation">Probation</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="residential-status">Residential Status</Label>
                                    <select
                                        id="residential-status"
                                        className="h-10 w-full rounded-md border border-input px-3"
                                        value={newEmployee.residentialStatus}
                                        onChange={e => setNewEmployee(p => ({...p, residentialStatus: e.target.value as any}))}
                                    >
                                        <option value="resident">Resident</option>
                                        <option value="non-resident">Non-Resident</option>
                                        <option value="resident-but-not-ordinarily-resident">RNOR</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tax-regime">Tax Regime</Label>
                                    <select
                                        id="tax-regime"
                                        className="h-10 w-full rounded-md border border-input px-3"
                                        value={newEmployee.taxRegime}
                                        onChange={e => setNewEmployee(p => ({...p, taxRegime: e.target.value as any}))}
                                    >
                                        <option value="NEW">New Tax Regime (FY 2023-24 onwards)</option>
                                        <option value="OLD">Old Tax Regime</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddEmployee}>Add Employee</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Employee List</CardTitle>
                </CardHeader>
                <CardContent>
                    {employeesError && (
                        <div className="mb-3 text-sm text-destructive">
                            Failed to load employees: {(employeesError as any)?.message || "Unknown error"}
                        </div>
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>PAN</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Tax Regime</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employeesLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        Loading employees...
                                    </TableCell>
                                </TableRow>
                            ) : employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        No employees yet. Click “Add New Employee” to create one.
                                    </TableCell>
                                </TableRow>
                            ) : employees.map(emp => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-mono">{emp.id}</TableCell>
                                    <TableCell className="font-medium">{emp.name}</TableCell>
                                    <TableCell className="font-mono">{emp.pan}</TableCell>
                                    <TableCell>{emp.designation}</TableCell>
                                    <TableCell>
                                        <Badge variant={emp.taxRegime === "NEW" ? "default" : "secondary"}>
                                            {emp.taxRegime}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.status === "Active" ? "default" : "destructive"} className={emp.status === "Active" ? "bg-green-600" : ""}>
                                            {emp.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem><FileText className="mr-2"/> View Profile</DropdownMenuItem>
                                                <DropdownMenuItem><Edit className="mr-2"/> Edit Employee</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeactivate(emp.id)}>
                                                    <Trash2 className="mr-2"/> Remove
                                                </DropdownMenuItem>
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
    );
}
