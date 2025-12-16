"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import Link from "next/link";
import * as XLSX from "xlsx";
import { allAccounts } from "@/lib/accounts";
import { Download, Loader2, UploadCloud, UsersIcon, Briefcase, AlertTriangle } from "lucide-react";

type PartyType = "Customer" | "Vendor";

type ParsedPartyRow = {
  id: number;
  type: PartyType;
  name: string;
  gstin?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status: "pending" | "success" | "error";
  error?: string;
};

const COLUMN_ALIASES: Record<string, string[]> = {
  type: ["type", "party type", "category"],
  name: ["name", "party name", "company", "customer", "vendor", "supplier"],
  gstin: ["gstin", "gst", "tax id"],
  email: ["email", "email id", "mail"],
  phone: ["phone", "mobile", "contact", "phone number"],
  address1: ["address", "address1", "street"],
  city: ["city", "town"],
  state: ["state", "province"],
  pincode: ["pincode", "zip", "postal code"],
};

const buildTemplateWorkbook = () => {
  const worksheet = XLSX.utils.json_to_sheet([
    {
      Type: "Customer",
      Name: "Acme Retail",
      GSTIN: "27ABCDE1234F1Z5",
      Email: "accounts@acme.in",
      Phone: "9876543210",
      Address: "22 Business Park",
      City: "Pune",
      State: "Maharashtra",
      Pincode: "411001",
    },
    {
      Type: "Vendor",
      Name: "Premier Supplies",
      GSTIN: "29PQRSF7890L1Z2",
      Email: "sales@premier.com",
      Phone: "9988776655",
      Address: "Industrial Layout",
      City: "Bengaluru",
      State: "Karnataka",
      Pincode: "560001",
    },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  return workbook;
};

const createRowAccessor = (row: Record<string, any>) => {
  const normalized: Record<string, any> = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[key.toLowerCase().trim()] = value;
  });
  return (aliases: string[]) => {
    for (const alias of aliases) {
      const key = alias.toLowerCase();
      if (key in normalized) {
        return normalized[key];
      }
    }
    return "";
  };
};

const normalizeType = (value: string | undefined, fallback: PartyType): PartyType => {
  if (!value) return fallback;
  const normalized = value.toLowerCase().trim();
  if (["customer", "c"].includes(normalized)) return "Customer";
  if (["vendor", "supplier", "vendor/supplier", "v"].includes(normalized)) return "Vendor";
  return fallback;
};

const createAccountCodeAllocator = async (userId: string) => {
  const range = { start: 1300, end: 1499 };
  const userAccountsRef = collection(db, "user_accounts");
  const snapshot = await getDocs(query(userAccountsRef, where("userId", "==", userId)));
  const userAccounts = snapshot.docs.map((doc) => doc.data());
  const existingCodes = new Set<number>();
  [...allAccounts, ...userAccounts].forEach((acc) => {
    if (acc.type === "Current Asset" && acc.code) {
      const parsed = parseInt(acc.code, 10);
      if (!Number.isNaN(parsed)) existingCodes.add(parsed);
    }
  });

  let pointer = range.start;
  return () => {
    while (pointer <= range.end && existingCodes.has(pointer)) {
      pointer++;
    }
    if (pointer > range.end) {
      throw new Error("No available account codes in the configured range.");
    }
    const allocated = pointer;
    existingCodes.add(allocated);
    pointer++;
    return String(allocated).padStart(4, "0");
  };
};

const numberToString = (value: any) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

export default function PartiesBulkUploadPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [defaultType, setDefaultType] = useState<PartyType>("Customer");
  const [parsedRows, setParsedRows] = useState<ParsedPartyRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const stats = useMemo(() => {
    const total = parsedRows.length;
    const success = parsedRows.filter((row) => row.status === "success").length;
    const pending = parsedRows.filter((row) => row.status === "pending").length;
    const errors = parsedRows.filter((row) => row.status === "error").length;
    const customers = parsedRows.filter((row) => row.type === "Customer").length;
    const vendors = parsedRows.filter((row) => row.type === "Vendor").length;
    return { total, success, pending, errors, customers, vendors };
  }, [parsedRows]);

  const handleDownloadTemplate = () => {
    const workbook = buildTemplateWorkbook();
    XLSX.writeFile(workbook, "parties_import_template.xlsx");
    toast({
      title: "Template downloaded",
      description: "Fill the sheet and upload it to import customers and vendors.",
    });
  };

  const parseFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    setIsParsing(true);
    setParsedRows([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook =
          extension === "csv"
            ? XLSX.read(data as string, { type: "binary", raw: false })
            : XLSX.read(data as ArrayBuffer, { type: "array", raw: false });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const rows = json.map((row, idx) => {
          const getValue = createRowAccessor(row);
          const typeValue = String(getValue(COLUMN_ALIASES.type) || "");
          const resolvedType = normalizeType(typeValue, defaultType);
          const party: ParsedPartyRow = {
            id: idx + 1,
            type: resolvedType,
            name: String(getValue(COLUMN_ALIASES.name) || "").trim(),
            gstin: String(getValue(COLUMN_ALIASES.gstin) || "").trim() || undefined,
            email: String(getValue(COLUMN_ALIASES.email) || "").trim() || undefined,
            phone: numberToString(getValue(COLUMN_ALIASES.phone)) || undefined,
            address1: String(getValue(COLUMN_ALIASES.address1) || "").trim() || undefined,
            city: String(getValue(COLUMN_ALIASES.city) || "").trim() || undefined,
            state: String(getValue(COLUMN_ALIASES.state) || "").trim() || undefined,
            pincode: numberToString(getValue(COLUMN_ALIASES.pincode)) || undefined,
            status: "pending",
          };

          if (!party.name) {
            party.status = "error";
            party.error = "Name is required.";
          }

          return party;
        });

        setParsedRows(rows);
        toast({
          title: "File parsed",
          description: `${rows.length} row${rows.length === 1 ? "" : "s"} ready for review.`,
        });
      } catch (error: any) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Parsing failed",
          description: error.message || "Could not read the file.",
        });
      } finally {
        setIsParsing(false);
      }
    };

    if (extension === "csv") {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    parseFile(file);
    event.target.value = "";
  };

  const handleCreateParties = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Please sign in to continue." });
      return;
    }
    const rowsToSave = parsedRows.filter((row) => row.status === "pending");
    if (rowsToSave.length === 0) {
      toast({
        variant: "destructive",
        title: "No rows to import",
        description: "Fix validation errors or upload a file first.",
      });
      return;
    }

    setIsSaving(true);
    const updatedRows = [...parsedRows];
    let successCount = 0;
    let errorCount = 0;
    let accountAllocator: (() => string) | null = null;

    const ensureAllocator = async () => {
      if (!accountAllocator) {
        accountAllocator = await createAccountCodeAllocator(user.uid);
      }
      return accountAllocator;
    };

    for (const row of rowsToSave) {
      try {
        if (row.type === "Customer") {
          const allocator = await ensureAllocator();
          const accountCode = allocator();
          const batch = writeBatch(db);
          const accountRef = doc(collection(db, "user_accounts"));
          batch.set(accountRef, {
            code: accountCode,
            name: row.name,
            type: "Current Asset",
            userId: user.uid,
          });

          const customerRef = doc(collection(db, "customers"));
          batch.set(customerRef, {
            userId: user.uid,
            name: row.name,
            gstin: row.gstin || "",
            email: row.email || "",
            phone: row.phone || "",
            address1: row.address1 || "",
            city: row.city || "",
            state: row.state || "",
            pincode: row.pincode || "",
            accountCode,
          });

          await batch.commit();
        } else {
          await addDoc(collection(db, "vendors"), {
            userId: user.uid,
            name: row.name,
            gstin: row.gstin || "",
            email: row.email || "",
            phone: row.phone || "",
            address1: row.address1 || "",
            city: row.city || "",
            state: row.state || "",
            pincode: row.pincode || "",
          });
        }

        row.status = "success";
        row.error = undefined;
        successCount++;
      } catch (error: any) {
        row.status = "error";
        row.error = error.message || "Failed to save record.";
        errorCount++;
      }
    }

    setParsedRows(updatedRows);
    setIsSaving(false);
    toast({
      title: "Import finished",
      description: `${successCount} record${successCount === 1 ? "" : "s"} created. ${
        errorCount ? `${errorCount} failed.` : "All good!"
      }`,
      variant: errorCount ? "destructive" : "default",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bulk Upload Customers & Vendors</h1>
          <p className="text-muted-foreground max-w-2xl">
            Move away from spreadsheets in minutes. Upload your CRM or supplier master, review the rows, and spin up account codes automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Link href="/parties" className="inline-flex">
            <Button variant="secondary">Back to Parties</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Accepts .xlsx or .csv files. Include the Type column or choose a default.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="border rounded-md p-4">
              <h4 className="font-semibold mb-2">Default type</h4>
              <RadioGroup
                value={defaultType}
                onValueChange={(value) => setDefaultType(value as PartyType)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Customer" id="default-customer" />
                  <Label htmlFor="default-customer" className="flex items-center gap-1 cursor-pointer">
                    <UsersIcon className="h-4 w-4" /> Customer
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Vendor" id="default-vendor" />
                  <Label htmlFor="default-vendor" className="flex items-center gap-1 cursor-pointer">
                    <Briefcase className="h-4 w-4" /> Vendor / Supplier
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground mt-2">
                Rows without a Type column will default to this selection.
              </p>
            </div>
            <div className="border rounded-md p-4">
              <h4 className="font-semibold mb-2">Quick tips</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Include a “Type” column to mix customers and vendors.</li>
                <li>Phone & Pincode are treated as text to preserve leading zeroes.</li>
                <li>Account codes are created automatically for customers.</li>
              </ul>
            </div>
          </div>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={isParsing || isSaving}
          />
          {isParsing && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing file...
            </div>
          )}
        </CardContent>
      </Card>

      {parsedRows.length > 0 && (
        <Alert>
          <AlertTitle>Import summary</AlertTitle>
          <AlertDescription>
            Total rows: {stats.total}. Customers: {stats.customers}. Vendors: {stats.vendors}. Ready: {stats.pending}. Errors: {stats.errors}.
          </AlertDescription>
        </Alert>
      )}

      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Review each party before creating them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        {(row.address1 || row.city) && (
                          <div className="text-xs text-muted-foreground">
                            {[row.address1, row.city, row.state, row.pincode].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.gstin || "—"}</TableCell>
                      <TableCell>{row.email || "—"}</TableCell>
                      <TableCell>{row.phone || "—"}</TableCell>
                      <TableCell>
                        {row.status === "pending" && <Badge variant="secondary">Pending</Badge>}
                        {row.status === "success" && (
                          <Badge variant="outline" className="text-green-600">Imported</Badge>
                        )}
                        {row.status === "error" && (
                          <div className="space-y-1">
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Error
                            </Badge>
                            <p className="text-xs text-muted-foreground">{row.error}</p>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setParsedRows([])}
                disabled={isSaving}
              >
                Clear
              </Button>
              <Button onClick={handleCreateParties} disabled={isSaving || stats.pending === 0}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating records...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Create {stats.pending} record{stats.pending === 1 ? "" : "s"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

