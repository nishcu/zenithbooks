
"use client";

import { useState, useMemo } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, deleteDoc, doc } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";
import { ItemDialog } from "@/components/billing/add-new-dialogs";
import Link from "next/link";

type Item = {
  id: string;
  name: string;
  hsn?: string;
  stock?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  [key: string]: any;
};

export default function ItemsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);
  const items = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [itemsSnapshot]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hsn?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleOpenDialog = (item: Item | null = null) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  }

  const handleDeleteItem = async (item: Item) => {
    const itemDocRef = doc(db, "items", item.id);
    try {
        await deleteDoc(itemDocRef);
        toast({ title: "Item Deleted", description: `${item.name} has been removed.` });
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete the item." });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Items & Services</h1>
          <p className="text-muted-foreground">
            Manage your products, services, and inventory.
          </p>
        </div>
        <div className="flex gap-2">
            <Link href="/items/suggest-hsn">
                 <Button variant="outline"><Wand2 className="mr-2"/>Suggest HSN (AI)</Button>
            </Link>
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2"/>Add New Item</Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Item List</CardTitle>
          <CardDescription>
            A list of all products and services you buy and sell.
          </CardDescription>
           <div className="relative pt-4">
                <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or HSN code..."
                  className="pl-8 w-full md:w-1/3"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Item Name</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead className="text-right">Stock on Hand</TableHead>
                <TableHead className="text-right">Purchase Price (₹)</TableHead>
                <TableHead className="text-right">Selling Price (₹)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading items...</TableCell></TableRow>
              ) : filteredItems.length === 0 ? (
                 <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No items found.</TableCell></TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.hsn || 'N/A'}</TableCell>
                    <TableCell className="text-right">{item.stock || 0}</TableCell>
                    <TableCell className="text-right font-mono">{item.purchasePrice?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right font-mono">{item.sellingPrice?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(item as Item)}><Edit className="mr-2"/> Edit Item</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteItem(item as Item)}><Trash2 className="mr-2"/> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ItemDialog 
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        item={selectedItem}
      />
    </div>
  );
}

