
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ReportRow = {
    deductee: string;
    pan: string;
    invoiceId: string;
    invoiceDate: string;
    invoiceAmount: number;
    tdsSection: string;
    tdsRate: number;
    tdsAmount: number;
};

// Generates a list of financial years, e.g., "2024-2025"
const getFinancialYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
        const startYear = currentYear - i;
        years.push(`${startYear}-${startYear + 1}`);
    }
    return years;
};

const months = [
    { value: "04", label: "April" }, { value: "05", label: "May" }, { value: "06", label: "June" },
    { value: "07", label: "July" }, { value: "08", label: "August" }, { value: "09", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
    { value: "01", label: "January" }, { value: "02", label: "February" }, { value: "03", label: "March" }
];

export default function TdsTcsReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("tds");
  const [period, setPeriod] = useState("monthly");
  const [financialYear, setFinancialYear] = useState(getFinancialYears()[0]);
  const [month, setMonth] = useState("04");
  const [quarter, setQuarter] = useState("q1");
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [reportTitle, setReportTitle] = useState("");

  const financialYears = getFinancialYears();

  const generateReport = () => {
    toast({
        title: "Generating Report...",
        description: "Simulating data fetch for the selected period."
    });
    
    // Simulate fetching data based on selection
    const generatedData: ReportRow[] = [
      {
        deductee: "Global Tech Inc.",
        pan: "ABCDE1234F",
        invoiceId: "INV-001",
        invoiceDate: "2024-05-15",
        invoiceAmount: 25000.0,
        tdsSection: "194J",
        tdsRate: 10,
        tdsAmount: 2500.0,
      },
      {
        deductee: "Innovate Solutions",
        pan: "FGHIJ5678K",
        invoiceId: "INV-002",
        invoiceDate: "2024-05-20",
        invoiceAmount: 15000.0,
        tdsSection: "194C",
        tdsRate: 1,
        tdsAmount: 150.0,
      },
    ];
    setReportData(generatedData);
    
    let periodLabel = "";
    if (period === 'monthly') {
        const monthLabel = months.find(m => m.value === month)?.label;
        periodLabel = `${monthLabel} ${financialYear.split('-')[0]}`;
    } else {
        periodLabel = `${quarter.toUpperCase()}, ${financialYear}`;
    }
    setReportTitle(`${reportType.toUpperCase()} Report for ${periodLabel}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">TDS &amp; TCS Reports</h1>
        <p className="text-muted-foreground">
          Generate reports for TDS deducted on payments and TCS collected on sales.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
          <CardDescription>Select the report parameters to generate your report.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Financial Year</label>
            <Select value={financialYear} onValueChange={setFinancialYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {financialYears.map(fy => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tds">TDS Report</SelectItem>
                <SelectItem value="tcs">TCS Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Period</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === 'monthly' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {period === 'quarterly' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Quarter</label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="q1">Q1 (Apr-Jun)</SelectItem>
                  <SelectItem value="q2">Q2 (Jul-Sep)</SelectItem>
                  <SelectItem value="q3">Q3 (Oct-Dec)</SelectItem>
                  <SelectItem value="q4">Q4 (Jan-Mar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={generateReport}>Generate Report</Button>
        </CardFooter>
      </Card>
      
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{reportTitle || "Generated Report"}</CardTitle>
            <CardDescription>A summary of tax deducted/collected for the selected period will appear here.</CardDescription>
          </div>
          <Button variant="outline" disabled={reportData.length === 0}>
            <FileDown className="mr-2" />
            Export Report
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deductee/Collectee</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead className="text-right">Invoice Amount</TableHead>
                <TableHead>TDS/TCS Section</TableHead>
                <TableHead className="text-right">Rate (%)</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {reportData.length > 0 ? (
                    reportData.map((row, index) => (
                        <TableRow key={index}>
                        <TableCell className="font-medium">{row.deductee}</TableCell>
                        <TableCell>{row.pan}</TableCell>
                        <TableCell>{row.invoiceId}</TableCell>
                        <TableCell>{row.invoiceDate}</TableCell>
                        <TableCell className="text-right">₹{row.invoiceAmount.toFixed(2)}</TableCell>
                        <TableCell>{row.tdsSection}</TableCell>
                        <TableCell className="text-right">{row.tdsRate}%</TableCell>
                        <TableCell className="text-right">₹{row.tdsAmount.toFixed(2)}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                            No report data. Please generate a report to see the results.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
