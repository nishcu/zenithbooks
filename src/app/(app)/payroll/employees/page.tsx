
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


const initialEmployees = [
    {
        id: "EMP-001",
        name: "Rohan Sharma",
        pan: "ABCDE1234F",
        aadhaar: "123456789012",
        designation: "Software Engineer",
        doj: "2023-04-01",
        employmentType: "permanent",
        residentialStatus: "resident",
        taxRegime: "NEW",
        status: "Active"
    },
    {
        id: "EMP-002",
        name: "Priya Mehta",
        pan: "FGHIJ5678K",
        aadhaar: "234567890123",
        designation: "Product Manager",
        doj: "2023-01-15",
        employmentType: "permanent",
        residentialStatus: "resident",
        taxRegime: "NEW",
        status: "Active"
    },
    {
        id: "EMP-003",
        name: "Anjali Singh",
        pan: "LMNOP9012M",
        aadhaar: "345678901234",
        designation: "UX Designer",
        doj: "2023-06-01",
        employmentType: "contract",
        residentialStatus: "resident",
        taxRegime: "OLD",
        status: "Active"
    },
    {
        id: "EMP-004",
        name: "Vikram Rathod",
        pan: "QRSTU3456N",
        aadhaar: "456789012345",
        designation: "QA Engineer",
        doj: "2022-08-10",
        employmentType: "permanent",
        residentialStatus: "resident",
        taxRegime: "NEW",
        status: "Resigned"
    },
];

export default function PayrollEmployeesPage() {
    const [employees, setEmployees] = useState(initialEmployees);
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

    const handleAddEmployee = () => {
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

        const newId = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
        setEmployees([...employees, { id: newId, ...newEmployee, status: "Active" }]);
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
            taxRegime: "NEW"
        });
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
                            {employees.map(emp => (
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
                                                <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2"/> Deactivate</DropdownMenuItem>
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
