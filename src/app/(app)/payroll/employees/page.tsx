
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
    { id: "EMP-001", name: "Rohan Sharma", designation: "Software Engineer", status: "Active" },
    { id: "EMP-002", name: "Priya Mehta", designation: "Product Manager", status: "Active" },
    { id: "EMP-003", name: "Anjali Singh", designation: "UX Designer", status: "Active" },
    { id: "EMP-004", name: "Vikram Rathod", designation: "QA Engineer", status: "Resigned" },
];

export default function PayrollEmployeesPage() {
    const [employees, setEmployees] = useState(initialEmployees);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState({ name: "", designation: "" });
    const { toast } = useToast();

    const handleAddEmployee = () => {
        if (!newEmployee.name || !newEmployee.designation) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please provide both name and designation."});
            return;
        }
        const newId = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
        setEmployees([...employees, { id: newId, ...newEmployee, status: "Active" }]);
        toast({ title: "Employee Added", description: `${newEmployee.name} has been added.` });
        setIsDialogOpen(false);
        setNewEmployee({ name: "", designation: "" });
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
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Employee</DialogTitle>
                            <DialogDescription>Enter the details for the new employee.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="emp-name">Employee Name</Label>
                                <Input id="emp-name" value={newEmployee.name} onChange={e => setNewEmployee(p => ({...p, name: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emp-designation">Designation</Label>
                                <Input id="emp-designation" value={newEmployee.designation} onChange={e => setNewEmployee(p => ({...p, designation: e.target.value}))} />
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
                                <TableHead>Designation</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.map(emp => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-mono">{emp.id}</TableCell>
                                    <TableCell className="font-medium">{emp.name}</TableCell>
                                    <TableCell>{emp.designation}</TableCell>
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
