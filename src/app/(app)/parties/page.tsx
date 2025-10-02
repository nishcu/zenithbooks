
"use client";

import { useState, useMemo, useContext } from "react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  MoreHorizontal,
  FileText,
  Edit,
  Trash2,
  Search,
  Users,
  Briefcase,
  Upload,
  Download,
  ChevronDown,
  FileSpreadsheet
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AccountingContext } from "@/context/accounting-context";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartyDialog } from "@/components/billing/add-new-dialogs";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';

export default function PartiesPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("customers");
  const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
  const [vendorsSnapshot, vendorsLoading] = useCollection(vendorsQuery);
  const vendors = useMemo(() => vendorsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [vendorsSnapshot]);
  
  const handleOpenDialog = (party: any | null = null) => {
    setSelectedParty(party);
    setIsPartyDialogOpen(true);
  }

  const handleDeleteParty = async (party: any) => {
    const collectionName = activeTab === 'customers' ? 'customers' : 'vendors';
    const partyDocRef = doc(db, collectionName, party.id);
    try {
        await deleteDoc(partyDocRef);
        toast({ title: "Party Deleted", description: `${party.name} has been removed.`})
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete the party."})
    }
  }
  
  const handleViewLedger = (party: any) => {
      router.push(`/accounting/ledgers?account=${party.id}`);
  }

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendors;
    return vendors.filter(v => 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  const handleExport = (type: 'customers' | 'vendors') => {
    const dataToExport = type === 'customers' ? customers : vendors;
    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(p => ({
        Name: p.name,
        GSTIN: p.gstin,
        Email: p.email,
        Phone: p.phone,
        Address: p.address1,
        City: p.city,
        State: p.state,
        Pincode: p.pincode,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type.charAt(0).toUpperCase() + type.slice(1));
    XLSX.writeFile(workbook, `${type}_export.xlsx`);
    toast({ title: "Export Successful", description: `Your ${type} list has been downloaded.` });
  };
  
  const handleDownloadTemplate = () => {
    const templateData = [{
        Name: "Sample Customer",
        GSTIN: "27ABCDE1234F1Z5",
        Email: "sample@example.com",
        Phone: "9876543210",
        Address: "123 Sample St",
        City: "Mumbai",
        State: "Maharashtra",
        Pincode: "400001",
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, `parties_import_template.xlsx`);
  };
  
  const handleImport = async () => {
    if (!importFile || !user) {
        toast({ variant: "destructive", title: "No file selected", description: "Please upload a file to import."});
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const collectionName = activeTab === 'customers' ? 'customers' : 'vendors';
        const batch = writeBatch(db);

        json.forEach(row => {
            const newDocRef = doc(collection(db, collectionName));
            batch.set(newDocRef, {
                userId: user.uid,
                name: row.Name || '',
                gstin: row.GSTIN || '',
                email: row.Email || '',
                phone: String(row.Phone || ''),
                address1: row.Address || '',
                city: row.City || '',
                state: row.State || '',
                pincode: String(row.Pincode || ''),
            });
        });

        try {
            await batch.commit();
            toast({ title: "Import Successful", description: `${json.length} parties were imported.`});
            setIsImportDialogOpen(false);
            setImportFile(null);
        } catch (error) {
            toast({ variant: "destructive", title: "Import Failed", description: "There was an error writing to the database." });
        }
    };
    reader.readAsArrayBuffer(importFile);
  };
  
  const PartyTable = ({ parties, type, loading } : { parties: any[], type: 'Customer' | 'Vendor', loading: boolean}) => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>GSTIN</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow>
          ) : parties.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No {type.toLowerCase()}s found.</TableCell></TableRow>
          ) : (
            parties.map((party) => (
              <TableRow key={party.id}>
                <TableCell className="font-medium">{party.name}</TableCell>
                <TableCell className="font-mono text-xs">{party.gstin || 'N/A'}</TableCell>
                <TableCell>{party.email || 'N/A'}</TableCell>
                <TableCell>{party.phone || 'N/A'}</TableCell>
                <TableCell className="text-right">
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewLedger(party)}><FileText className="mr-2"/> View Ledger</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDialog(party)}><Edit className="mr-2"/> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteParty(party)}><Trash2 className="mr-2"/> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parties</h1>
          <p className="text-muted-foreground">
            Manage your customers and vendors from one central place.
          </p>
        </div>
        <div className="flex gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <Download className="mr-2"/> Export <ChevronDown className="ml-2"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleExport('customers')}><FileSpreadsheet className="mr-2"/> Export Customers</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExport('vendors')}><FileSpreadsheet className="mr-2"/> Export Vendors</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><Upload className="mr-2"/> Import</Button>
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2"/>Add New {activeTab === 'customers' ? 'Customer' : 'Vendor'}</Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="customers"><Users className="mr-2"/>Customers</TabsTrigger>
            <TabsTrigger value="vendors"><Briefcase className="mr-2"/>Vendors</TabsTrigger>
        </TabsList>
        <div className="relative pt-4 mt-4">
            <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or GSTIN..."
              className="pl-8 w-full md:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <TabsContent value="customers" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Customer List</CardTitle>
                    <CardDescription>A list of all your customers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PartyTable parties={filteredCustomers} type="Customer" loading={customersLoading}/>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="vendors" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Vendor List</CardTitle>
                    <CardDescription>A list of all your vendors.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PartyTable parties={filteredVendors} type="Vendor" loading={vendorsLoading}/>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      <PartyDialog
        open={isPartyDialogOpen}
        onOpenChange={setIsPartyDialogOpen}
        type={activeTab === 'customers' ? 'Customer' : 'Vendor'}
        party={selectedParty}
      />

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import {activeTab === 'customers' ? 'Customers' : 'Vendors'}</DialogTitle>
                    <DialogDescription>
                        Upload an Excel (.xlsx) file to bulk import parties. Make sure the file matches the template format.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="import-file">Upload File</Label>
                        <Input id="import-file" type="file" accept=".xlsx" onChange={e => setImportFile(e.target.files?.[0] || null)} />
                    </div>
                     <Button variant="link" size="sm" className="p-0" onClick={handleDownloadTemplate}>
                        <Download className="mr-2"/> Download Template
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={!importFile}>Import Data</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
