
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { PlusCircle, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Sample Data
const sampleUnits = [
    { id: "u-001", symbol: "nos", formalName: "Numbers" },
    { id: "u-002", symbol: "kgs", formalName: "Kilograms" },
    { id: "u-003", symbol: "pcs", formalName: "Pieces" },
    { id: "u-004", symbol: "mtr", formalName: "Meters" },
    { id: "u-005", symbol: "ltr", formalName: "Litres" },
];

export default function UnitsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [units, setUnits] = useState(sampleUnits);

  const handleAction = (action: 'Edit' | 'Delete', id: string) => {
    toast({
        title: `Action: ${action}`,
        description: `This would ${action.toLowerCase()} unit ${id}. This functionality is a placeholder.`
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Units of Measure</h1>
          <p className="text-muted-foreground">
            Manage the units used for your stock items (e.g., pcs, kgs).
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2"/>
                    New Unit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Unit of Measure</DialogTitle>
                    <DialogDescription>
                        Add a new unit for quantifying your stock items.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="unit-symbol">Symbol</Label>
                        <Input id="unit-symbol" placeholder="e.g., box" />
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit-name">Formal Name</Label>
                        <Input id="unit-name" placeholder="e.g., Boxes" />
                     </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Save Unit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Unit List</CardTitle>
              <CardDescription>A list of all units of measure.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Formal Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {units.map((unit) => (
                        <TableRow key={unit.id}>
                            <TableCell className="font-mono">{unit.symbol}</TableCell>
                            <TableCell className="font-medium">{unit.formalName}</TableCell>
                            <TableCell className="text-right">
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => handleAction("Edit", unit.id)}><Edit className="mr-2"/>Edit</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onSelect={() => handleAction("Delete", unit.id)}>
                                            <Trash2 className="mr-2"/>Delete
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

