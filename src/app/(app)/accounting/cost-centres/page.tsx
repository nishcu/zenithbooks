
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
import { costCentres } from "@/lib/accounts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function CostCentresPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // In a real app, this would come from a database and have full CRUD functionality
  const [centres, setCentres] = useState(costCentres);

  const handleAction = (action: 'Edit' | 'Delete', id: string) => {
    toast({
        title: `Action: ${action}`,
        description: `This would ${action.toLowerCase()} cost centre ${id}. This functionality is a placeholder.`
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cost Centres</h1>
          <p className="text-muted-foreground">
            Create and manage cost centres for tracking departmental or project-based finances.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2"/>
                    New Cost Centre
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Cost Centre</DialogTitle>
                    <DialogDescription>
                        Add a new cost centre to allocate income and expenses.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="cc-id">ID</Label>
                        <Input id="cc-id" placeholder="e.g., cc-sales" />
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="cc-name">Name</Label>
                        <Input id="cc-name" placeholder="e.g., Sales Department" />
                     </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Save Cost Centre</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Cost Centre List</CardTitle>
              <CardDescription>A list of all active cost centres.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cost Centre ID</TableHead>
                        <TableHead>Cost Centre Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {centres.map((centre) => (
                        <TableRow key={centre.id}>
                            <TableCell className="font-mono">{centre.id}</TableCell>
                            <TableCell className="font-medium">{centre.name}</TableCell>
                            <TableCell className="text-right">
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => handleAction("Edit", centre.id)}><Edit className="mr-2"/>Edit</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onSelect={() => handleAction("Delete", centre.id)}>
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
