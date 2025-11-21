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
import { Download, Loader2, UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import Link from "next/link";

type ParsedItemRow = {
  id: number;
  name: string;
  description?: string;
  hsn?: string;
  gstRate?: number;
  stock?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  status: "pending" | "success" | "error";
  error?: string;
};

const COLUMN_ALIASES: Record<
  keyof Omit<ParsedItemRow, "id" | "status" | "error">
, string[]> = {
  name: ["name", "item name", "product", "product name"],
  description: ["description", "details"],
  hsn: ["hsn", "hsn code", "sac", "sac code"],
  gstRate: ["gst", "gst rate", "tax rate", "gst%", "tax%"],
  stock: ["stock", "opening stock", "qty", "quantity"],
  purchasePrice: ["purchase price", "cost price", "buy price", "purchase"],
  sellingPrice: ["selling price", "sale price", "mrp", "sell price"],
};

const REQUIRED_FIELDS: Array<keyof ParsedItemRow> = ["name"];

const numberOrNull = (value: any): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const createRowAccessor = (row: Record<string, any>) => {
  const normalized: Record<string, any> = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[key.toLowerCase().trim()] = value;
  });
  return (aliases: string[]) => {
    for (const alias of aliases) {
      if (alias.toLowerCase() in normalized) {
        return normalized[alias.toLowerCase()];
      }
    }
    return "";
  };
};

const buildTemplateWorkbook = () => {
  const worksheet = XLSX.utils.json_to_sheet([
    {
      "Item Name": "USB-C Hub",
      Description: "6-in-1 docking station",
      HSN: "8471",
      "GST Rate (%)": 18,
      "Opening Stock": 25,
      "Purchase Price": 2200,
      "Selling Price": 2799,
    },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  return workbook;
};

export default function ItemBulkUploadPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [parsedRows, setParsedRows] = useState<ParsedItemRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const stats = useMemo(() => {
    const total = parsedRows.length;
    const success = parsedRows.filter((row) => row.status === "success").length;
    const pending = parsedRows.filter((row) => row.status === "pending").length;
    const errors = parsedRows.filter((row) => row.status === "error").length;
    return { total, success, pending, errors };
  }, [parsedRows]);

  const handleDownloadTemplate = () => {
    const workbook = buildTemplateWorkbook();
    XLSX.writeFile(workbook, "items_import_template.xlsx");
    toast({
      title: "Template downloaded",
      description: "Fill the Excel file and upload it here.",
    });
  };

  const normalizeRow = (row: Record<string, any>, index: number): ParsedItemRow => {
    const getValue = createRowAccessor(row);
    const item: ParsedItemRow = {
      id: index,
      name: String(getValue(COLUMN_ALIASES.name) || "").trim(),
      description: String(getValue(COLUMN_ALIASES.description) || "").trim() || undefined,
      hsn: String(getValue(COLUMN_ALIASES.hsn) || "").trim() || undefined,
      gstRate: numberOrNull(getValue(COLUMN_ALIASES.gstRate)),
      stock: numberOrNull(getValue(COLUMN_ALIASES.stock)),
      purchasePrice: numberOrNull(getValue(COLUMN_ALIASES.purchasePrice)),
      sellingPrice: numberOrNull(getValue(COLUMN_ALIASES.sellingPrice)),
      status: "pending",
    };

    const errors: string[] = [];
    if (!item.name) errors.push("Item name is required.");
    if (item.gstRate !== undefined && (item.gstRate < 0 || item.gstRate > 100)) {
      errors.push("GST must be between 0 and 100.");
    }
    if (item.stock !== undefined && item.stock < 0) {
      errors.push("Stock cannot be negative.");
    }

    if (errors.length > 0) {
      item.status = "error";
      item.error = errors.join(" ");
    }

    return item;
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
        const rows = json.map((row, idx) => normalizeRow(row, idx + 1));
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

  const handleCreateItems = async () => {
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

    for (const row of rowsToSave) {
      try {
        await addDoc(collection(db, "items"), {
          userId: user.uid,
          name: row.name,
          description: row.description || "",
          hsn: row.hsn || "",
          gstRate: row.gstRate ?? 0,
          stock: row.stock ?? 0,
          purchasePrice: row.purchasePrice ?? 0,
          sellingPrice: row.sellingPrice ?? 0,
          createdAt: new Date().toISOString(),
        });
        row.status = "success";
        row.error = undefined;
        successCount++;
      } catch (error: any) {
        row.status = "error";
        row.error = error.message || "Failed to save item.";
        errorCount++;
      }
    }

    setParsedRows(updatedRows);
    setIsSaving(false);
    toast({
      title: "Import finished",
      description: `${successCount} item${successCount === 1 ? "" : "s"} created. ${
        errorCount ? `${errorCount} failed.` : "All good!"
      }`,
      variant: errorCount ? "destructive" : "default",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bulk Upload Items</h1>
          <p className="text-muted-foreground max-w-2xl">
            Import hundreds of SKUs at once. Upload a CSV or Excel file, review the rows, and push them straight into your stock master.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Link href="/items" className="inline-flex">
            <Button variant="secondary">Back to Items</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Accepts .xlsx or .csv files. The first sheet is processed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="border rounded-md p-4">
              <h4 className="font-semibold mb-2">Steps</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Download the template or export items from another system.</li>
                <li>Ensure at least the item name column is filled.</li>
                <li>Upload the file here and review the parsed rows.</li>
                <li>Click “Create Items” to sync with ZenithBooks.</li>
              </ol>
            </div>
            <div className="border rounded-md p-4">
              <h4 className="font-semibold mb-2">Supported Columns</h4>
              <p className="text-sm text-muted-foreground">
                Item Name*, Description, HSN/SAC, GST Rate (%), Opening Stock, Purchase Price, Selling Price.
              </p>
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
            Total rows: {stats.total}. Ready: {stats.pending}. Created: {stats.success}. Errors: {stats.errors}.
          </AlertDescription>
        </Alert>
      )}

      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Review every row before pushing it to the database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead>GST%</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Purchase</TableHead>
                    <TableHead>Selling</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        {row.description && (
                          <div className="text-xs text-muted-foreground">{row.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.hsn || "—"}</TableCell>
                      <TableCell>{row.gstRate ?? "—"}</TableCell>
                      <TableCell>{row.stock ?? "—"}</TableCell>
                      <TableCell>₹{row.purchasePrice?.toFixed(2) ?? "—"}</TableCell>
                      <TableCell>₹{row.sellingPrice?.toFixed(2) ?? "—"}</TableCell>
                      <TableCell>
                        {row.status === "pending" && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            Pending
                          </Badge>
                        )}
                        {row.status === "success" && (
                          <Badge variant="outline" className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Created
                          </Badge>
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
              <Button onClick={handleCreateItems} disabled={isSaving || stats.pending === 0}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating items...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Create {stats.pending} item{stats.pending === 1 ? "" : "s"}
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

