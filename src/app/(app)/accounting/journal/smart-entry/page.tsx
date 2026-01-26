"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  X,
  Info,
  Calculator,
  Eye,
  ExternalLink,
  History,
} from "lucide-react";
import {
  processNarration,
  createJournalEntry,
  validateJournalEntry,
  applyUserEdits,
  addGSTToJournalEntry,
  type ParsingResult,
  type JournalEntry,
  type JournalConfirmation,
  type VoucherType,
} from "@/lib/smart-journal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountingContext, type JournalVoucher } from "@/context/accounting-context";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";

const VOUCHER_TYPES: { value: VoucherType; label: string }[] = [
  { value: "Payment", label: "Payment" },
  { value: "Receipt", label: "Receipt" },
  { value: "Journal", label: "Journal" },
  { value: "Sales", label: "Sales" },
  { value: "Purchase", label: "Purchase" },
];

export default function SmartJournalEntryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const accountingContext = useContext(AccountingContext);
  const { journalVouchers: allVouchers, addJournalVoucher, loading } = accountingContext || {
    journalVouchers: [],
    addJournalVoucher: () => {},
    loading: false,
  };

  const [narration, setNarration] = useState("");
  const [parsingResult, setParsingResult] = useState<ParsingResult | null>(null);
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState<JournalEntry | null>(null);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGSTDialog, setShowGSTDialog] = useState(false);
  const [gstRate, setGstRate] = useState("18");
  const [gstType, setGstType] = useState<"CGST_SGST" | "IGST">("CGST_SGST");
  const [isGSTInclusive, setIsGSTInclusive] = useState(false);
  const [expenseType, setExpenseType] = useState<"business" | "personal" | "auto">("auto");

  const handleProcess = async () => {
    if (!narration.trim()) {
      alert("Please enter a narration");
      return;
    }

    setIsProcessing(true);
    try {
      console.log("Processing narration:", narration);
      let processedNarration = narration;
      
      // If user explicitly selected business or personal, prepend to narration for better detection
      if (expenseType === "personal") {
        processedNarration = `for personal use ${narration}`;
      } else if (expenseType === "business") {
        processedNarration = `business expense ${narration}`;
      }
      
      const result = await processNarration(processedNarration, undefined, undefined, user?.uid);
      console.log("Parsing result:", result);
      setParsingResult(result);

      if (result.errors.length === 0) {
        const entry = createJournalEntry(result);
        console.log("Journal entry created:", entry);
        setJournalEntry(entry);
        setEditedEntry(entry);
        setIsEditing(false);
        const validationResult = validateJournalEntry(entry);
        setValidation(validationResult);
      } else {
        console.log("Errors found:", result.errors);
        setJournalEntry(null);
        setValidation(null);
      }
    } catch (error: any) {
      console.error("Error processing narration:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process narration. Please check console for details.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddGST = () => {
    if (!journalEntry) return;
    
    const rate = parseFloat(gstRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({
        variant: "destructive",
        title: "Invalid GST Rate",
        description: "Please enter a valid GST rate between 0 and 100.",
      });
      return;
    }

    try {
      const updatedEntry = addGSTToJournalEntry(
        journalEntry,
        rate,
        isGSTInclusive,
        gstType
      );
      setJournalEntry(updatedEntry);
      setEditedEntry(updatedEntry);
      setShowGSTDialog(false);
      const validationResult = validateJournalEntry(updatedEntry);
      setValidation(validationResult);
      toast({
        title: journalEntry.gstDetails ? "GST Updated" : "GST Added",
        description: `GST @ ${rate}% has been ${journalEntry.gstDetails ? 'updated' : 'added'} to the journal entry.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add GST.",
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedEntry) return;

    const validationResult = validateJournalEntry(editedEntry);
    setValidation(validationResult);

    if (validationResult.isValid) {
      setJournalEntry(editedEntry);
      setIsEditing(false);
    } else {
      alert("Please fix errors before saving");
    }
  };

  const handleCancel = () => {
    setEditedEntry(journalEntry);
    setIsEditing(false);
  };

  const handleEditGST = () => {
    if (!journalEntry || !journalEntry.gstDetails) return;
    
    // Pre-fill the dialog with current GST values
    setGstRate(journalEntry.gstDetails.gstRate?.toString() || "18");
    setGstType(journalEntry.gstDetails.gstType || "CGST_SGST");
    setIsGSTInclusive(journalEntry.gstDetails.isInclusive || false);
    setShowGSTDialog(true);
  };

  const handlePost = async () => {
    if (!journalEntry || !accountingContext) return;

    const validationResult = validateJournalEntry(journalEntry);
    if (!validationResult.isValid) {
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: validationResult.errors.join(", "),
      });
      return;
    }

    try {
      // Convert Smart Journal Entry to Journal Voucher format
      const voucher: JournalVoucher = {
        id: `SMART-${Date.now()}`,
        date: journalEntry.date,
        narration: journalEntry.narration,
        voucherType: journalEntry.voucherType || "Journal",
        lines: journalEntry.entries.map((entry) => ({
          account: entry.accountCode,
          debit: entry.isDebit ? entry.amount.toString() : "0",
          credit: !entry.isDebit ? entry.amount.toString() : "0",
          costCentre: "",
        })),
        amount: journalEntry.totalDebit,
      };

      await addJournalVoucher(voucher);

      toast({
        title: "Entry posted successfully!",
        description: `Journal entry ${voucher.id} has been created.`,
      });

      // Reset form
      setNarration("");
      setParsingResult(null);
      setJournalEntry(null);
      setEditedEntry(null);
      setIsEditing(false);
      setValidation(null);

      // Switch to history tab to show the new entry
      setActiveTab("history");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to post entry",
        description: error.message || "An error occurred while posting the entry.",
      });
    }
  };

  // Filter smart entries (entries starting with SMART-)
  const smartEntries = (allVouchers || []).filter(
    (v: JournalVoucher | null) => v && v.id && v.id.startsWith("SMART-")
  ).sort((a: JournalVoucher, b: JournalVoucher) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const updateEntryField = (field: keyof JournalEntry, value: any) => {
    if (!editedEntry) return;
    setEditedEntry({ ...editedEntry, [field]: value });
  };

  const updateEntryAmount = (index: number, amount: number) => {
    if (!editedEntry) return;
    const newEntries = [...editedEntry.entries];
    newEntries[index] = { ...newEntries[index], amount };
    setEditedEntry({
      ...editedEntry,
      entries: newEntries,
      totalDebit: newEntries.filter((e) => e.isDebit).reduce((sum, e) => sum + e.amount, 0),
      totalCredit: newEntries.filter((e) => !e.isDebit).reduce((sum, e) => sum + e.amount, 0),
    });
  };

  const currentEntry = isEditing ? editedEntry : journalEntry;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8" />
          Smart Journal Entry
        </h1>
        <p className="text-muted-foreground mt-1">
          Convert plain English narration into accurate double-entry accounting journal entries with GST support.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "history")} className="w-full">
        <TabsList>
          <TabsTrigger value="create">
            <Sparkles className="h-4 w-4 mr-2" />
            Create Entry
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Posted Entries ({smartEntries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>Enter narration</CardTitle>
          <CardDescription>
            Describe your transaction in plain English. Example: "Purchased stationery for Rs 1800 paid in cash"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Is this expense for business or personal use?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={expenseType === "business" ? "default" : "outline"}
                onClick={() => setExpenseType("business")}
                className="flex-1"
              >
                Business
              </Button>
              <Button
                type="button"
                variant={expenseType === "personal" ? "default" : "outline"}
                onClick={() => setExpenseType("personal")}
                className="flex-1"
              >
                Personal
              </Button>
              <Button
                type="button"
                variant={expenseType === "auto" ? "default" : "outline"}
                onClick={() => setExpenseType("auto")}
                className="flex-1"
              >
                Auto-detect
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Select to improve accuracy. Personal expenses are treated as Drawings.
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label>Narration</Label>
            <Input
              placeholder="e.g., Purchased stationery for Rs 1800 paid in cash"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleProcess();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Enter to process
            </p>
          </div>

          <Button 
            onClick={handleProcess} 
            className="w-full" 
            disabled={!narration.trim()}
            type="button"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Process Narration
          </Button>
          {narration.trim() && (
            <p className="text-xs text-muted-foreground text-center">
              Example: "Paid Electricity bill Rs 1800 in cash" or "Purchased stationery for ₹5000 with 18% GST"
            </p>
          )}
        </CardContent>
      </Card>

      {parsingResult && parsingResult.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errors - Please fix these issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {parsingResult.errors.map((error, i) => (
                <li key={i} className="font-medium">{error}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">Tip: Make sure to include the amount in your narration, e.g., "Paid Electricity bill Rs 1800 in cash"</p>
          </AlertDescription>
        </Alert>
      )}

      {parsingResult && parsingResult.warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside">
              {parsingResult.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {currentEntry && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Generated Journal Entry
                  {currentEntry.isBalanced ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Balanced
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Balanced
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Confidence: {(parsingResult?.parsed.confidence || 0) * 100}%
                </CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Voucher type</Label>
                {isEditing ? (
                  <Select
                    value={editedEntry?.voucherType}
                    onValueChange={(v) => updateEntryField("voucherType", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VOUCHER_TYPES.map((vt) => (
                        <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">{currentEntry.voucherType}</Badge>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedEntry?.date}
                    onChange={(e) => updateEntryField("date", e.target.value)}
                  />
                ) : (
                  <p className="text-sm">{currentEntry.date}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Total</Label>
                <p className="text-sm font-medium">
                  Debit: {formatCurrency(currentEntry.totalDebit)} | Credit: {formatCurrency(currentEntry.totalCredit)}
                </p>
              </div>
            </div>

            {isEditing && (
              <div className="grid gap-2">
                <Label>Narration</Label>
                <Input
                  value={editedEntry?.narration}
                  onChange={(e) => updateEntryField("narration", e.target.value)}
                />
              </div>
            )}

            <Separator />

            <div>
              <Label className="mb-2 block">Account entries</Label>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Narration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEntry.entries.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{entry.accountName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.accountType}</Badge>
                        </TableCell>
                        <TableCell>
                          {entry.isDebit ? (
                            isEditing ? (
                              <Input
                                type="number"
                                value={entry.amount}
                                onChange={(e) => updateEntryAmount(index, parseFloat(e.target.value) || 0)}
                                className="w-32"
                              />
                            ) : (
                              formatCurrency(entry.amount)
                            )
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {!entry.isDebit ? (
                            isEditing ? (
                              <Input
                                type="number"
                                value={entry.amount}
                                onChange={(e) => updateEntryAmount(index, parseFloat(e.target.value) || 0)}
                                className="w-32"
                              />
                            ) : (
                              formatCurrency(entry.amount)
                            )
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.narration || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {!currentEntry.gstDetails && (currentEntry.voucherType === "Sales" || currentEntry.voucherType === "Purchase") && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="font-medium text-blue-900">GST not detected</p>
                  <p className="text-sm text-blue-700">Add GST to this entry if applicable</p>
                </div>
                <Button onClick={() => setShowGSTDialog(true)} variant="outline" size="sm">
                  <Calculator className="h-4 w-4 mr-2" />
                  Add GST
                </Button>
              </div>
            )}

            {currentEntry.gstDetails && currentEntry.gstDetails.isGSTApplicable && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>GST details</Label>
                    <Button onClick={handleEditGST} variant="outline" size="sm">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit GST Rate
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">GST rate</p>
                      <p className="font-medium">{currentEntry.gstDetails.gstRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taxable value</p>
                      <p className="font-medium">{formatCurrency(currentEntry.gstDetails.taxableValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total GST</p>
                      <p className="font-medium">{formatCurrency(currentEntry.gstDetails.totalGST)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total amount</p>
                      <p className="font-medium">{formatCurrency(currentEntry.gstDetails.totalAmount)}</p>
                    </div>
                  </div>
                  {currentEntry.gstDetails.cgstAmount && (
                    <div className="mt-2 text-xs">
                      CGST: {formatCurrency(currentEntry.gstDetails.cgstAmount)} | 
                      SGST: {formatCurrency(currentEntry.gstDetails.sgstAmount || 0)}
                    </div>
                  )}
                  {currentEntry.gstDetails.igstAmount && (
                    <div className="mt-2 text-xs">
                      IGST: {formatCurrency(currentEntry.gstDetails.igstAmount)}
                    </div>
                  )}
                  {currentEntry.gstDetails.isRCM && (
                    <Badge className="mt-2 bg-yellow-100 text-yellow-800">RCM Applicable</Badge>
                  )}
                  {currentEntry.gstDetails.blockedCredit && (
                    <Badge className="mt-2 bg-red-100 text-red-800">
                      ITC Blocked: {currentEntry.gstDetails.reason}
                    </Badge>
                  )}
                </div>
              </>
            )}

            {validation && (
              <>
                <Separator />
                {validation.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validation.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {validation.warnings.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Warnings</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validation.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={handlePost} disabled={!validation?.isValid}>
                Post Entry
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Posted Smart Entries</CardTitle>
                  <CardDescription>
                    View all journal entries created using Smart Journal Entry
                  </CardDescription>
                </div>
                <Link href="/accounting/journal">
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All Journal Entries
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading entries...</p>
                </div>
              ) : smartEntries.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No smart entries posted yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first entry using the "Create Entry" tab.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Voucher #</TableHead>
                        <TableHead>Narration</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {smartEntries.map((voucher: JournalVoucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell>{format(new Date(voucher.date), "dd MMM, yyyy")}</TableCell>
                          <TableCell className="font-medium">{voucher.id}</TableCell>
                          <TableCell className="max-w-md truncate">{voucher.narration}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(voucher.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href="/accounting/journal">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* GST Dialog */}
      <Dialog open={showGSTDialog} onOpenChange={setShowGSTDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{journalEntry?.gstDetails ? "Edit GST" : "Add GST"} to Journal Entry</DialogTitle>
            <DialogDescription>
              {journalEntry?.gstDetails 
                ? "Update GST details for this journal entry. The entry will be recalculated with the new GST rate."
                : "Add GST details to this journal entry. The entry will be updated with GST calculations."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>GST Rate (%)</Label>
              <Input
                type="number"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                placeholder="18"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
            <div className="grid gap-2">
              <Label>GST Type</Label>
              <Select value={gstType} onValueChange={(v) => setGstType(v as "CGST_SGST" | "IGST")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CGST_SGST">CGST + SGST (Intra-state)</SelectItem>
                  <SelectItem value="IGST">IGST (Inter-state)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="gst-inclusive"
                checked={isGSTInclusive}
                onChange={(e) => setIsGSTInclusive(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="gst-inclusive" className="cursor-pointer">
                GST is inclusive in the amount
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGSTDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGST}>
              <Calculator className="h-4 w-4 mr-2" />
              {journalEntry?.gstDetails ? "Update GST" : "Add GST"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
