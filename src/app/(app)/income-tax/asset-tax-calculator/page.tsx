"use client";

import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
  Calculator,
  TrendingUp,
  Info,
  ChevronRight,
  ChevronLeft,
  Download,
  FileJson,
  AlertCircle,
  Sparkles,
  Scale,
  Plus,
  Trash2,
} from "lucide-react";
import {
  runAssetTaxCalculator,
  ASSET_CATEGORY_LABELS,
  type AssetInput,
  type AssetCategory,
  type AssetTaxCalculatorResult,
} from "@/lib/asset-tax-calculator";
import { getCurrentFinancialYear } from "@/lib/itr/constants";

const ASSET_OPTIONS: { value: AssetCategory; label: string }[] = Object.entries(
  ASSET_CATEGORY_LABELS
).map(([value, label]) => ({ value: value as AssetCategory, label }));

const STEPS = [
  { id: 1, title: "Asset & transaction", description: "Category, dates, values" },
  { id: 2, title: "Intent & context", description: "Country, mode, frequency" },
  { id: 3, title: "Results & insights", description: "Tax, optimization, compliance" },
];

const INDEXATION_ELIGIBLE_ASSETS: AssetCategory[] = [
  "real_estate",
  "gold",
  "silver",
  "commodities",
  "foreign_equity",
  "foreign_property",
];

const defaultForm: Partial<AssetInput> = {
  assetCategory: "equity_shares",
  purchaseDate: "",
  purchaseCost: 0,
  saleDate: "",
  saleValue: 0,
  country: "India",
  modeOfHolding: "Investment",
  frequencyOfTransactions: "Low",
  isCrypto: false,
  improvements: [],
  transferExpenses: 0,
};

export default function AssetTaxCalculatorPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<AssetInput>>(defaultForm);
  const [result, setResult] = useState<AssetTaxCalculatorResult | null>(null);
  const [simulateSaleDate, setSimulateSaleDate] = useState<string | null>(null);

  const canProceedStep1 = () => {
    return (
      form.assetCategory &&
      form.purchaseDate &&
      form.purchaseCost != null &&
      form.purchaseCost >= 0 &&
      form.saleDate &&
      form.saleValue != null &&
      form.saleValue >= 0
    );
  };

  const runCalculation = (overrideSaleDate?: string | null) => {
    const input: AssetInput = {
      assetCategory: form.assetCategory!,
      purchaseDate: form.purchaseDate!,
      purchaseCost: Number(form.purchaseCost) || 0,
      saleDate: form.saleDate!,
      saleValue: Number(form.saleValue) || 0,
      country: form.country!,
      modeOfHolding: form.modeOfHolding!,
      frequencyOfTransactions: form.frequencyOfTransactions!,
      isCrypto: form.assetCategory === "crypto" || !!form.isCrypto,
      simulateSaleDate: overrideSaleDate || undefined,
      improvements: form.improvements?.filter(imp => imp.date && imp.amount > 0) || undefined,
      transferExpenses: Number(form.transferExpenses) || 0,
    };
    const res = runAssetTaxCalculator(input);
    setResult(res);
  };

  const handleNext = () => {
    if (step === 2) {
      runCalculation(null);
      setSimulateSaleDate(null);
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const simResult = useMemo(() => {
    if (!simulateSaleDate || !form.assetCategory || !form.purchaseDate || !form.saleDate || !form.purchaseCost || !form.saleValue)
      return null;
    const input: AssetInput = {
      assetCategory: form.assetCategory,
      purchaseDate: form.purchaseDate,
      purchaseCost: Number(form.purchaseCost) || 0,
      saleDate: form.saleDate,
      saleValue: Number(form.saleValue) || 0,
      country: form.country!,
      modeOfHolding: form.modeOfHolding!,
      frequencyOfTransactions: form.frequencyOfTransactions!,
      isCrypto: form.assetCategory === "crypto" || !!form.isCrypto,
      simulateSaleDate,
      improvements: form.improvements?.filter(imp => imp.date && imp.amount > 0) || undefined,
      transferExpenses: Number(form.transferExpenses) || 0,
    };
    return runAssetTaxCalculator(input);
  }, [simulateSaleDate, form]);

  const effectiveResult = simResult || result;

  const downloadComputationSummary = () => {
    if (!effectiveResult) return;
    const lines: string[] = [
      "ZenithBooks – Intelligent Asset Tax Calculator",
      "Computation Summary",
      `Generated: ${format(new Date(), "PPpp")}`,
      `FY: ${getCurrentFinancialYear()}`,
      "",
      "--- ASSET SUMMARY ---",
      `Category: ${effectiveResult.assetSummary.categoryLabel}`,
      `Purchase: ${effectiveResult.holdingPeriodDetails.purchaseDate} | ${formatCurrency(effectiveResult.assetSummary.purchaseCost)}`,
      `Sale: ${effectiveResult.holdingPeriodDetails.saleDate} | ${formatCurrency(effectiveResult.assetSummary.saleValue)}`,
      `Gain/Loss: ${formatCurrency(effectiveResult.assetSummary.gainLoss)}`,
      "",
      "--- INCOME CLASSIFICATION ---",
      `Type: ${effectiveResult.incomeClassification.incomeType}${effectiveResult.incomeClassification.gainType ? ` (${effectiveResult.incomeClassification.gainType})` : ""}`,
      effectiveResult.incomeClassification.reasoningText,
      "",
      "--- HOLDING PERIOD ---",
      `Days: ${effectiveResult.holdingPeriodDetails.holdingDays} | ${effectiveResult.holdingPeriodDetails.isShortTerm ? "Short-term" : "Long-term"}`,
      effectiveResult.holdingPeriodDetails.applicableRule,
      "",
      "--- TAX COMPUTATION ---",
      `Capital gain: ${formatCurrency(effectiveResult.taxComputation.capitalGainAmount)}`,
      `Exemptions: ${formatCurrency(effectiveResult.taxComputation.exemptions)}`,
      `Taxable: ${formatCurrency(effectiveResult.taxComputation.taxableAmount)}`,
      `Tax payable: ${formatCurrency(effectiveResult.taxComputation.taxPayable)}`,
      `Health & Edu cess: ${formatCurrency(effectiveResult.taxComputation.healthEducationCess)}`,
      `Total tax: ${formatCurrency(effectiveResult.taxComputation.totalTaxLiability)}`,
    ];
    if (effectiveResult.indexation?.applies) {
      lines.push("", "--- INDEXATION ---");
      lines.push(`Purchase cost: ${formatCurrency(effectiveResult.indexation.indexedPurchaseCost)} (CII ${effectiveResult.indexation.ciiPurchase} → ${effectiveResult.indexation.ciiSale})`);
      if (effectiveResult.indexation.indexedImprovements.length > 0) {
        lines.push("", "Cost of improvements (indexed):");
        effectiveResult.indexation.indexedImprovements.forEach((imp, idx) => {
          lines.push(`  ${idx + 1}. ${imp.description || "Improvement"} - ${format(new Date(imp.date), "dd-MMM-yyyy")}`);
          lines.push(`     Original: ${formatCurrency(imp.amount)} | Indexed: ${formatCurrency(imp.indexedAmount)} (CII ${imp.ciiImprovement} → ${effectiveResult.indexation!.ciiSale})`);
        });
        lines.push(`Total indexed improvements: ${formatCurrency(effectiveResult.indexation.indexedImprovements.reduce((sum, imp) => sum + imp.indexedAmount, 0))}`);
      }
      if (effectiveResult.indexation.transferExpenses > 0) {
        lines.push(`Transfer expenses: ${formatCurrency(effectiveResult.indexation.transferExpenses)}`);
      }
      lines.push(`Total indexed cost: ${formatCurrency(effectiveResult.indexation.totalIndexedCost)}`);
      lines.push(`Final indexed cost (with transfer expenses): ${formatCurrency(effectiveResult.indexation.finalIndexedCost)}`);
      lines.push(`Tax saved (indexation): ${formatCurrency(effectiveResult.indexation.taxSavedDueToIndexation)}`);
    }
    lines.push("", "--- COMPLIANCE ---");
    lines.push(`Schedule CG: ${effectiveResult.complianceMapping.scheduleCG}`);
    lines.push(`Schedule BP: ${effectiveResult.complianceMapping.scheduleBP}`);
    lines.push(`Schedule FA: ${effectiveResult.complianceMapping.scheduleFA}`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `asset-tax-computation-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadItrJson = () => {
    if (!effectiveResult) return;
    const blob = new Blob([JSON.stringify(effectiveResult.complianceMapping.itrAutoFillJson, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `itr-asset-tax-autofill-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calculator className="h-8 w-8" />
          Intelligent Asset Tax Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Classify income, apply holding-period rules, compute tax, and get optimisation insights. India-specific.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <Badge
            key={s.id}
            variant={step === s.id ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStep(s.id)}
          >
            {s.id}. {s.title}
          </Badge>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Asset & transaction</CardTitle>
            <CardDescription>Category, purchase and sale dates, values.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Asset category</Label>
              <Select
                value={form.assetCategory}
                onValueChange={(v) => setForm((f) => ({ ...f, assetCategory: v as AssetCategory }))}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {ASSET_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase date</Label>
                <Input
                  type="date"
                  value={form.purchaseDate || ""}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Sale date</Label>
                <Input
                  type="date"
                  value={form.saleDate || ""}
                  onChange={(e) => setForm((f) => ({ ...f, saleDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase cost (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.purchaseCost ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseCost: e.target.value ? Number(e.target.value) : 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Sale value (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.saleValue ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, saleValue: e.target.value ? Number(e.target.value) : 0 }))}
                />
              </div>
            </div>
            {INDEXATION_ELIGIBLE_ASSETS.includes(form.assetCategory as AssetCategory) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Cost of improvements</h4>
                      <p className="text-xs text-muted-foreground">
                        Add improvements made during holding period. Each improvement will be indexed separately.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          improvements: [...(f.improvements || []), { date: "", amount: 0, description: "" }],
                        }));
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add improvement
                    </Button>
                  </div>
                  {form.improvements && form.improvements.length > 0 && (
                    <div className="space-y-3">
                      {form.improvements.map((imp, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 border rounded-md">
                          <div className="md:col-span-3 space-y-1">
                            <Label className="text-xs">Date</Label>
                            <Input
                              type="date"
                              value={imp.date || ""}
                              onChange={(e) => {
                                const newImps = [...(form.improvements || [])];
                                newImps[idx] = { ...newImps[idx], date: e.target.value };
                                setForm((f) => ({ ...f, improvements: newImps }));
                              }}
                            />
                          </div>
                          <div className="md:col-span-4 space-y-1">
                            <Label className="text-xs">Amount (₹)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={imp.amount || ""}
                              onChange={(e) => {
                                const newImps = [...(form.improvements || [])];
                                newImps[idx] = { ...newImps[idx], amount: Number(e.target.value) || 0 };
                                setForm((f) => ({ ...f, improvements: newImps }));
                              }}
                            />
                          </div>
                          <div className="md:col-span-4 space-y-1">
                            <Label className="text-xs">Description (optional)</Label>
                            <Input
                              type="text"
                              placeholder="e.g., Renovation, Extension"
                              value={imp.description || ""}
                              onChange={(e) => {
                                const newImps = [...(form.improvements || [])];
                                newImps[idx] = { ...newImps[idx], description: e.target.value };
                                setForm((f) => ({ ...f, improvements: newImps }));
                              }}
                            />
                          </div>
                          <div className="md:col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newImps = form.improvements?.filter((_, i) => i !== idx) || [];
                                setForm((f) => ({ ...f, improvements: newImps.length > 0 ? newImps : undefined }));
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Transfer expenses (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.transferExpenses ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, transferExpenses: e.target.value ? Number(e.target.value) : 0 }))}
                    placeholder="Brokerage, stamp duty, registration, etc."
                  />
                  <p className="text-xs text-muted-foreground">
                    Include brokerage, stamp duty, registration fees, and other transfer-related expenses.
                  </p>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleNext} disabled={!canProceedStep1()}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Intent & context</CardTitle>
            <CardDescription>Country, mode of holding, transaction frequency. These affect Capital Gains vs Business Income.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Country</Label>
              <Select
                value={form.country}
                onValueChange={(v) => setForm((f) => ({ ...f, country: v as "India" | "Foreign" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Foreign">Foreign</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Mode of holding</Label>
              <Select
                value={form.modeOfHolding}
                onValueChange={(v) => setForm((f) => ({ ...f, modeOfHolding: v as "Investment" | "Trading" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Investment">Investment</SelectItem>
                  <SelectItem value="Trading">Trading</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Investment supports Capital Gains; Trading may lead to Business Income.</p>
            </div>
            <div className="grid gap-2">
              <Label>Frequency of transactions</Label>
              <Select
                value={form.frequencyOfTransactions}
                onValueChange={(v) => setForm((f) => ({ ...f, frequencyOfTransactions: v as "Low" | "Medium" | "High" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-crypto"
                checked={form.assetCategory === "crypto" || !!form.isCrypto}
                disabled={form.assetCategory === "crypto"}
                onCheckedChange={(c) => setForm((f) => ({ ...f, isCrypto: !!c }))}
              />
              <Label htmlFor="is-crypto" className="font-normal cursor-pointer">
                {form.assetCategory === "crypto" ? "Crypto / VDA (auto-selected)" : "This asset is crypto / VDA (special treatment)"}
              </Label>
            </div>
            {(form.assetCategory === "crypto" || form.isCrypto) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Crypto</AlertTitle>
                <AlertDescription>Crypto gains have special treatment (TDS, Schedule SFT-2). Ensure correct disclosure.</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={handleBack}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={handleNext}>Calculate <Calculator className="h-4 w-4 ml-1" /></Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Asset summary & tax
              </CardTitle>
              <CardDescription>{result.assetSummary.categoryLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Purchase</p>
                  <p className="font-medium">{formatCurrency(result.assetSummary.purchaseCost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sale</p>
                  <p className="font-medium">{formatCurrency(result.assetSummary.saleValue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gain / Loss</p>
                  <p className={`font-medium ${result.assetSummary.gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(result.assetSummary.gainLoss)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total tax</p>
                  <p className="font-medium">
                    {effectiveResult ? formatCurrency(effectiveResult.taxComputation.totalTaxLiability) : "—"}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Income classification</h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge>{effectiveResult?.incomeClassification.incomeType}</Badge>
                  {effectiveResult?.incomeClassification.gainType && (
                    <Badge variant="secondary">{effectiveResult.incomeClassification.gainType}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{effectiveResult?.incomeClassification.reasoningText}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Holding period</h4>
                <p className="text-sm">
                  {effectiveResult?.holdingPeriodDetails.holdingDays} days
                  ({effectiveResult?.holdingPeriodDetails.isShortTerm ? "Short-term" : "Long-term"})
                  — {effectiveResult?.holdingPeriodDetails.applicableRule}
                </p>
              </div>

              {effectiveResult?.indexation?.applies && (
                <div>
                  <h4 className="font-medium mb-2">Indexation</h4>
                  <div className="text-sm space-y-2">
                    {new Date(effectiveResult!.holdingPeriodDetails.purchaseDate) < new Date("2001-04-01") && (
                      <Alert className="mb-2">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Pre-2001 Purchase</AlertTitle>
                        <AlertDescription>
                          Asset purchased before 01-Apr-2001. Indexation is calculated from base year 2001-02 (CII = 100) as per Income Tax Act.
                        </AlertDescription>
                      </Alert>
                    )}
                    <p>
                      <span className="font-medium">Purchase cost (indexed):</span>{" "}
                      {formatCurrency(effectiveResult.indexation!.indexedPurchaseCost)} (CII {effectiveResult.indexation!.ciiPurchase} → {effectiveResult.indexation!.ciiSale})
                    </p>
                    {effectiveResult.indexation!.indexedImprovements.length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Cost of improvements (indexed):</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {effectiveResult.indexation!.indexedImprovements.map((imp, idx) => (
                            <li key={idx}>
                              {imp.description || `Improvement ${idx + 1}`} ({format(new Date(imp.date), "dd-MMM-yyyy")}):{" "}
                              {formatCurrency(imp.amount)} → {formatCurrency(imp.indexedAmount)} (CII {imp.ciiImprovement} → {effectiveResult.indexation!.ciiSale})
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1">
                          <span className="font-medium">Total indexed improvements:</span>{" "}
                          {formatCurrency(effectiveResult.indexation!.indexedImprovements.reduce((sum, imp) => sum + imp.indexedAmount, 0))}
                        </p>
                      </div>
                    )}
                    {effectiveResult.indexation!.transferExpenses > 0 && (
                      <p>
                        <span className="font-medium">Transfer expenses:</span>{" "}
                        {formatCurrency(effectiveResult.indexation!.transferExpenses)}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Final indexed cost:</span>{" "}
                      {formatCurrency(effectiveResult.indexation!.finalIndexedCost)}
                    </p>
                    <p className="text-green-600">
                      <span className="font-medium">Tax saved (indexation):</span>{" "}
                      {formatCurrency(effectiveResult.indexation!.taxSavedDueToIndexation)}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Tax computation</h4>
                <ul className="text-sm space-y-1">
                  <li>Capital gain: {formatCurrency(effectiveResult!.taxComputation.capitalGainAmount)}</li>
                  <li>Exemptions: {formatCurrency(effectiveResult!.taxComputation.exemptions)}</li>
                  <li>Taxable: {formatCurrency(effectiveResult!.taxComputation.taxableAmount)}</li>
                  <li>Tax + Cess: {formatCurrency(effectiveResult!.taxComputation.totalTaxLiability)}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                What if I sell later?
              </CardTitle>
              <CardDescription>Simulate a different sale date to see tax impact.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-2">
                  <Label>Simulate sale on</Label>
                  <Input
                    type="date"
                    value={simulateSaleDate || ""}
                    onChange={(e) => setSimulateSaleDate(e.target.value || null)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSimulateSaleDate(null)}
                >
                  Clear simulation
                </Button>
              </div>
              {simResult && (
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertTitle>Simulation result</AlertTitle>
                  <AlertDescription>
                    If you sell on {simulateSaleDate}, tax = {formatCurrency(simResult.taxComputation.totalTaxLiability)}.
                    {result.taxComputation.totalTaxLiability !== simResult.taxComputation.totalTaxLiability && (
                      <> (Current: {formatCurrency(result.taxComputation.totalTaxLiability)})</>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {effectiveResult && effectiveResult.optimizationInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tax optimisation insights
                </CardTitle>
                <CardDescription>Data-driven suggestions to reduce tax.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {effectiveResult.optimizationInsights.map((ins, i) => (
                    <li key={i} className="flex gap-3">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{ins.title}</p>
                        <p className="text-sm text-muted-foreground">{ins.description}</p>
                        {ins.impactAmount != null && (
                          <p className="text-sm text-green-600 mt-1">
                            Impact: {formatCurrency(ins.impactAmount)}
                            {ins.impactPercent != null && ` (${ins.impactPercent.toFixed(1)}%)`}
                          </p>
                        )}
                        {ins.actionable && (
                          <p className="text-sm mt-1 text-primary">{ins.actionable}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {effectiveResult && effectiveResult.warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {effectiveResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Compliance & download</CardTitle>
              <CardDescription>ITR schedules, AIS flags, and CA-friendly computation sheet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {effectiveResult?.complianceMapping.scheduleCG && <Badge>Schedule CG</Badge>}
                {effectiveResult?.complianceMapping.scheduleBP && <Badge>Schedule BP</Badge>}
                {effectiveResult?.complianceMapping.scheduleFA && <Badge>Schedule FA</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                AIS flags: {effectiveResult?.complianceMapping.aisReconciliationFlags.join(", ") || "—"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadComputationSummary}>
                  <Download className="h-4 w-4 mr-2" />
                  Download computation summary
                </Button>
                <Button variant="outline" onClick={downloadItrJson}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Download ITR auto-fill JSON
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => { setStep(1); setResult(null); setSimulateSaleDate(null); }}>
                <ChevronLeft className="h-4 w-4 mr-1" /> New calculation
              </Button>
              <Button variant="outline" onClick={handleBack}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === 3 && !result && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Run a calculation from step 2 to see results.
            <Button variant="outline" className="mt-4 ml-2" onClick={() => setStep(2)}>Go to step 2</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
