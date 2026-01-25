"use client";

import { useState } from "react";
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
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  runSIPCalculator,
  type SIPInput,
  type InvestmentType,
  type InvestmentMode,
  type SIPFrequency,
  type SIPCalculatorResult,
} from "@/lib/sip-calculator";
import { getCurrentFinancialYear } from "@/lib/itr/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: "equity_mf", label: "Equity Mutual Fund" },
  { value: "debt_mf", label: "Debt Mutual Fund" },
  { value: "hybrid_mf", label: "Hybrid Fund" },
  { value: "etf", label: "ETF (Indian)" },
  { value: "index_fund", label: "Index Fund" },
];

const STEPS = [
  { id: 1, title: "Investment details", description: "Type, mode, amount, dates" },
  { id: 2, title: "Returns & exit", description: "CAGR, NAV, redemption" },
  { id: 3, title: "Results & analysis", description: "Post-tax wealth, insights" },
];

const defaultForm: Partial<SIPInput> = {
  investmentType: "equity_mf",
  investmentMode: "sip",
  amount: 5000,
  frequency: "Monthly",
  startDate: "",
  exitDate: "",
  expectedCAGR: 12,
  taxProfile: "individual",
  redemptionType: "Full",
  equityPercentage: 70,
};

export default function SIPCalculatorPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<SIPInput>>(defaultForm);
  const [result, setResult] = useState<SIPCalculatorResult | null>(null);

  const canProceedStep1 = () => {
    return (
      form.investmentType &&
      form.investmentMode &&
      form.amount != null &&
      form.amount > 0 &&
      form.startDate &&
      form.exitDate
    );
  };

  const canProceedStep2 = () => {
    return canProceedStep1() && (form.expectedCAGR != null || form.navHistory?.length);
  };

  const runCalculation = () => {
    if (!canProceedStep2()) return;

    const input: SIPInput = {
      investmentType: form.investmentType!,
      investmentMode: form.investmentMode!,
      amount: Number(form.amount) || 0,
      frequency: form.investmentMode === "sip" ? form.frequency : undefined,
      startDate: form.startDate!,
      exitDate: form.exitDate!,
      expectedCAGR: form.expectedCAGR,
      navHistory: form.navHistory,
      taxProfile: "individual",
      redemptionType: form.redemptionType || "Full",
      partialRedemptionAmount: form.redemptionType === "Partial" ? form.partialRedemptionAmount : undefined,
      equityPercentage: form.investmentType === "hybrid_mf" ? form.equityPercentage : undefined,
    };

    const res = runSIPCalculator(input);
    setResult(res);
  };

  const handleNext = () => {
    if (step === 2) {
      runCalculation();
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const downloadComputationSummary = () => {
    if (!result) return;
    const lines: string[] = [
      "ZenithBooks - SIP / NAV-based Post-Tax Wealth Calculator",
      "Computation Summary",
      `Generated: ${format(new Date(), "PPpp")}`,
      `FY: ${getCurrentFinancialYear()}`,
      "",
      "--- INVESTMENT SUMMARY ---",
      `Type: ${INVESTMENT_TYPES.find(t => t.value === form.investmentType)?.label}`,
      `Mode: ${form.investmentMode === "sip" ? "SIP" : "Lump Sum"}`,
      `Amount: ${form.investmentMode === "sip" ? `₹${form.amount}/installment (${form.frequency})` : `₹${form.amount}`}`,
      `Start: ${result.investmentSummary.numberOfLots > 0 ? result.unitBreakup[0].installmentDate : form.startDate}`,
      `Exit: ${form.exitDate}`,
      `Total invested: ${formatCurrency(result.investmentSummary.totalInvested)}`,
      `Total units: ${result.investmentSummary.totalUnits.toFixed(4)}`,
      `Current NAV: ${formatCurrency(result.investmentSummary.currentNAV)}`,
      `Market value: ${formatCurrency(result.investmentSummary.marketValue)}`,
      `Total gain: ${formatCurrency(result.investmentSummary.totalGain)} (${result.investmentSummary.totalGainPercent.toFixed(2)}%)`,
      "",
      "--- CAPITAL GAINS SUMMARY ---",
      `STCG: ${formatCurrency(result.capitalGainsSummary.stcgAmount)} (${result.capitalGainsSummary.stcgLots} lot(s))`,
      `LTCG: ${formatCurrency(result.capitalGainsSummary.ltcgAmount)} (${result.capitalGainsSummary.ltcgLots} lot(s))`,
      `Exemptions: ${formatCurrency(result.capitalGainsSummary.exemptions)}`,
      `Taxable amount: ${formatCurrency(result.capitalGainsSummary.totalTaxable)}`,
      "",
      "--- TAX COMPUTATION ---",
      `STCG tax: ${formatCurrency(result.taxComputation.stcgTax)}`,
      `LTCG tax: ${formatCurrency(result.taxComputation.ltcgTax)}`,
      `Total tax: ${formatCurrency(result.taxComputation.totalTax)}`,
      `Health & Edu cess: ${formatCurrency(result.taxComputation.healthEducationCess)}`,
      `Total tax liability: ${formatCurrency(result.taxComputation.totalTaxLiability)}`,
      "",
      "--- POST-TAX METRICS ---",
      `Pre-tax CAGR: ${result.postTaxMetrics.preTaxCAGR.toFixed(2)}%`,
      `Post-tax CAGR: ${result.postTaxMetrics.postTaxCAGR.toFixed(2)}%`,
      `Tax drag: ${result.postTaxMetrics.taxDragPercent.toFixed(2)}%`,
      `Post-tax value: ${formatCurrency(result.postTaxMetrics.postTaxValue)}`,
      `Post-tax return: ${formatCurrency(result.postTaxMetrics.absolutePostTaxReturn)} (${result.postTaxMetrics.postTaxReturnPercent.toFixed(2)}%)`,
    ];

    if (result.redemptionLots.length > 0) {
      lines.push("", "--- FIFO REDEMPTION BREAKDOWN ---");
      result.redemptionLots.forEach((lot, idx) => {
        lines.push(`${idx + 1}. ${format(new Date(lot.installmentDate), "dd-MMM-yyyy")} | Units: ${lot.units.toFixed(4)} | Gain: ${formatCurrency(lot.gain)} | Type: ${lot.gainType}`);
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sip-tax-computation-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadItrJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.itrMapping.itrAutoFillJson, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `itr-sip-autofill-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          SIP / NAV-based Post-Tax Wealth Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate SIP returns using industry-standard formula, then compute NAV-based units, FIFO exits, capital gains tax, and post-tax returns.
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
            <CardTitle>Investment details</CardTitle>
            <CardDescription>Type, mode, amount, and dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Investment type</Label>
              <Select
                value={form.investmentType}
                onValueChange={(v) => setForm((f) => ({ ...f, investmentType: v as InvestmentType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Investment mode</Label>
              <Select
                value={form.investmentMode}
                onValueChange={(v) => setForm((f) => ({ ...f, investmentMode: v as InvestmentMode }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sip">SIP (Systematic Investment Plan)</SelectItem>
                  <SelectItem value="lump_sum">Lump Sum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.investmentMode === "sip" && (
              <div className="grid gap-2">
                <Label>SIP frequency</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as SIPFrequency }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>{form.investmentMode === "sip" ? "SIP amount per installment (₹)" : "Investment amount (₹)"}</Label>
              <Input
                type="number"
                min={0}
                step={100}
                value={form.amount ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value ? Number(e.target.value) : 0 }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.startDate || ""}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Exit / Redemption date</Label>
                <Input
                  type="date"
                  value={form.exitDate || ""}
                  onChange={(e) => setForm((f) => ({ ...f, exitDate: e.target.value }))}
                />
              </div>
            </div>
            {form.investmentType === "hybrid_mf" && (
              <div className="grid gap-2">
                <Label>Equity percentage (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.equityPercentage ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, equityPercentage: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="e.g., 70 (for 70% equity)"
                />
                <p className="text-xs text-muted-foreground">Funds with &gt;65% equity follow equity tax rules.</p>
              </div>
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
            <CardTitle>Returns & exit</CardTitle>
            <CardDescription>Expected CAGR or NAV history, redemption type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="cagr" className="w-full">
              <TabsList>
                <TabsTrigger value="cagr">Expected CAGR</TabsTrigger>
                <TabsTrigger value="nav">NAV History (Advanced)</TabsTrigger>
              </TabsList>
              <TabsContent value="cagr" className="space-y-4">
                <div className="grid gap-2">
                  <Label>Expected CAGR (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.expectedCAGR ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, expectedCAGR: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="e.g., 12"
                  />
                  <p className="text-xs text-muted-foreground">Annualized expected return percentage.</p>
                </div>
              </TabsContent>
              <TabsContent value="nav" className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>NAV History</AlertTitle>
                  <AlertDescription>
                    Upload NAV history for accurate calculations. For now, use Expected CAGR. NAV upload feature coming soon.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
            <div className="grid gap-2">
              <Label>Redemption type</Label>
              <Select
                value={form.redemptionType}
                onValueChange={(v) => setForm((f) => ({ ...f, redemptionType: v as "Full" | "Partial" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full">Full redemption</SelectItem>
                  <SelectItem value="Partial">Partial redemption</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.redemptionType === "Partial" && (
              <div className="grid gap-2">
                <Label>Partial redemption amount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={form.partialRedemptionAmount ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, partialRedemptionAmount: e.target.value ? Number(e.target.value) : 0 }))}
                />
              </div>
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
                <PieChart className="h-5 w-5" />
                Investment summary
              </CardTitle>
              <CardDescription>
                {"Calculated using standard SIP formula: FV = P × [({(1 + r)^n - 1} / r) × (1 + r)]"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total invested</p>
                  <p className="font-medium text-lg">{formatCurrency(result.investmentSummary.totalInvested)}</p>
                  <p className="text-xs text-muted-foreground">{result.investmentSummary.numberOfLots} installment(s)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Market value</p>
                  <p className="font-medium text-lg">{formatCurrency(result.investmentSummary.marketValue)}</p>
                  <p className="text-xs text-muted-foreground">At exit NAV: {formatCurrency(result.investmentSummary.currentNAV)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total gain</p>
                  <p className={`font-medium text-lg ${result.investmentSummary.totalGain >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(result.investmentSummary.totalGain)} ({result.investmentSummary.totalGainPercent.toFixed(2)}%)
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total units</p>
                  <p className="font-medium text-lg">{result.investmentSummary.totalUnits.toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground">NAV-based calculation</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="text-xs text-muted-foreground">
                <p>Investment period: {result.investmentSummary.investmentPeriodMonths} months ({result.investmentSummary.investmentPeriodDays} days)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Capital gains & tax (Income Tax)
              </CardTitle>
              <CardDescription>
                Tax calculated using FIFO method with STCG/LTCG classification per Indian Income Tax Act.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">STCG</p>
                  <p className="font-medium">{formatCurrency(result.capitalGainsSummary.stcgAmount)}</p>
                  <p className="text-xs text-muted-foreground">{result.capitalGainsSummary.stcgLots} lot(s)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">LTCG</p>
                  <p className="font-medium">{formatCurrency(result.capitalGainsSummary.ltcgAmount)}</p>
                  <p className="text-xs text-muted-foreground">{result.capitalGainsSummary.ltcgLots} lot(s)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Exemptions</p>
                  <p className="font-medium text-green-600">{formatCurrency(result.capitalGainsSummary.exemptions)}</p>
                  <p className="text-xs text-muted-foreground">₹1.25L equity LTCG</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total tax</p>
                  <p className="font-medium text-lg text-red-600">{formatCurrency(result.taxComputation.totalTaxLiability)}</p>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Tax computation breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">STCG tax</p>
                    <p className="font-medium">{formatCurrency(result.taxComputation.stcgTax)}</p>
                    {form.investmentType === "equity_mf" || form.investmentType === "etf" || form.investmentType === "index_fund" || 
                     (form.investmentType === "hybrid_mf" && (form.equityPercentage ?? 0) > 65) ? (
                      <p className="text-xs text-muted-foreground">Rate: 15% (equity)</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Rate: Slab rate (debt)</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">LTCG tax</p>
                    <p className="font-medium">{formatCurrency(result.taxComputation.ltcgTax)}</p>
                    {form.investmentType === "equity_mf" || form.investmentType === "etf" || form.investmentType === "index_fund" || 
                     (form.investmentType === "hybrid_mf" && (form.equityPercentage ?? 0) > 65) ? (
                      <p className="text-xs text-muted-foreground">Rate: 10% (equity, after exemption)</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Rate: Slab rate (debt, post 1-Apr-2023)</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Health & Education Cess (4%)</span>
                    <span className="font-medium">{formatCurrency(result.taxComputation.healthEducationCess)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 font-medium text-lg">
                    <span>Total tax liability</span>
                    <span className="text-red-600">{formatCurrency(result.taxComputation.totalTaxLiability)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Post-tax metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Pre-tax CAGR</p>
                  <p className="font-medium">{result.postTaxMetrics.preTaxCAGR.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Post-tax CAGR</p>
                  <p className="font-medium text-green-600">{result.postTaxMetrics.postTaxCAGR.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tax drag</p>
                  <p className="font-medium text-red-600">{result.postTaxMetrics.taxDragPercent.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Post-tax value</p>
                  <p className="font-medium text-lg">{formatCurrency(result.postTaxMetrics.postTaxValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.exitSimulations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Exit date simulations
                </CardTitle>
                <CardDescription>Compare post-tax returns for different exit dates.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exit date</TableHead>
                        <TableHead>Market value</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>Post-tax value</TableHead>
                        <TableHead>Post-tax CAGR</TableHead>
                        <TableHead>Tax drag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.exitSimulations.map((sim, idx) => (
                        <TableRow key={idx} className={sim.isOptimal ? "bg-green-50 dark:bg-green-950" : ""}>
                          <TableCell>{format(new Date(sim.exitDate), "dd-MMM-yyyy")}</TableCell>
                          <TableCell>{formatCurrency(sim.marketValue)}</TableCell>
                          <TableCell>{formatCurrency(sim.taxLiability)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(sim.postTaxValue)}</TableCell>
                          <TableCell>{sim.postTaxCAGR.toFixed(2)}%</TableCell>
                          <TableCell>{sim.taxDragPercent.toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {result.exitSimulations.some(s => s.isOptimal) && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Optimal exit identified</AlertTitle>
                    <AlertDescription>
                      {result.exitSimulations.find(s => s.isOptimal)?.optimalReason}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {result.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Insights & recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {result.insights.map((ins, i) => (
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

          {result.redemptionLots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>FIFO redemption breakdown</CardTitle>
                <CardDescription>Lots redeemed in FIFO order with tax classification.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Invested</TableHead>
                        <TableHead>NAV</TableHead>
                        <TableHead>Units</TableHead>
                        <TableHead>Redemption value</TableHead>
                        <TableHead>Gain</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Holding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.redemptionLots.map((lot, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{format(new Date(lot.installmentDate), "dd-MMM-yyyy")}</TableCell>
                          <TableCell>{formatCurrency(lot.investedAmount)}</TableCell>
                          <TableCell>{formatCurrency(lot.nav)}</TableCell>
                          <TableCell>{lot.units.toFixed(4)}</TableCell>
                          <TableCell>{formatCurrency(lot.currentValue || 0)}</TableCell>
                          <TableCell className={lot.gain >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(lot.gain)}
                          </TableCell>
                          <TableCell><Badge variant={lot.gainType === "STCG" ? "destructive" : "default"}>{lot.gainType}</Badge></TableCell>
                          <TableCell>{lot.holdingMonths} months</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Compliance & download</CardTitle>
              <CardDescription>ITR schedules and computation statement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {result.itrMapping.scheduleCG && <Badge>Schedule CG</Badge>}
                {result.itrMapping.scheduleOS && <Badge>Schedule OS</Badge>}
              </div>
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
              <Button variant="outline" onClick={() => { setStep(1); setResult(null); }}>
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
