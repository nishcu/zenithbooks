
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

// Sample Data - in a real app, this would come from a database.
const sampleStockGroups = [
    { id: "grp-001", name: "Finished Goods", under: "Primary" },
    { id: "grp-002", name: "Raw Materials", under: "Primary" },
    { id: "grp-003", name: "Electronics", under: "Finished Goods" },
    { id: "grp-004", name: "Office Supplies", under: "Finished Goods" },
    { id: "grp-005", name: "Services", under: "Primary" },
];

export default function StockGroupsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [groups, setGroups] = useState(sampleStockGroups);

  const handleAction = (action: 'Edit' | 'Delete', id: string) => {
    toast({
        title: `Action: ${action}`,
        description: `This would ${action.toLowerCase()} stock group ${id}. This functionality is a placeholder.`
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Groups</h1>
          <p className="text-muted-foreground">
            Categorize your stock items into hierarchical groups.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2"/>
                    New Stock Group
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Stock Group</DialogTitle>
                    <DialogDescription>
                        Add a new group to categorize your items.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="sg-name">Group Name</Label>
                        <Input id="sg-name" placeholder="e.g., Laptops" />
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="sg-under">Under</Label>
                        <Input id="sg-under" placeholder="e.g., Electronics" />
                     </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Save Group</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Stock Group List</CardTitle>
              <CardDescription>A list of all your stock item groups.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Under</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groups.map((group) => (
                        <TableRow key={group.id}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell className="font-mono text-xs">{group.under}</TableCell>
                            <TableCell className="text-right">
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => handleAction("Edit", group.id)}><Edit className="mr-2"/>Edit</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onSelect={() => handleAction("Delete", group.id)}>
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

