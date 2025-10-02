
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { format } from "date-fns";

const months = [
    { value: "0", label: "January" }, { value: "1", label: "February" }, { value: "2", label: "March" },
    { value: "3", label: "April" }, { value: "4", label: "May" }, { value: "5", label: "June" },
    { value: "6", label: "July" }, { value: "7", label: "August" }, { value: "8", label: "September" },
    { value: "9", label: "October" }, { value: "10", label: "November" }, { value: "11", label: "December" }
];
const years = [new Date().getFullYear(), new Date().getFullYear() - 1];

export default function PayrollReportsPage() {
    const [reportType, setReportType] = useState("payroll_summary");
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const { toast } = useToast();

    const handleDownload = () => {
        toast({
            title: "Download Initiated",
            description: `Your ${reportType} report is being generated.`
        });
        
        // Simulate data generation for the report
        const reportData = [
            { "Employee ID": "EMP-001", "Name": "Rohan Sharma", "Gross Pay": 80000, "Deductions": 15000, "Net Pay": 65000 },
            { "Employee ID": "EMP-002", "Name": "Priya Mehta", "Gross Pay": 120000, "Deductions": 25000, "Net Pay": 95000 },
            { "Employee ID": "EMP-003", "Name": "Anjali Singh", "Gross Pay": 60000, "Deductions": 10000, "Net Pay": 50000 },
        ];

        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll Summary");

        const monthName = months.find(m => m.value === selectedMonth)?.label;
        XLSX.writeFile(workbook, `${reportType}_${monthName}_${selectedYear}.xlsx`);
    };

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Payroll Reports</h1>
                <p className="text-muted-foreground">
                    Generate and download various payroll and compliance reports.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Report Generation</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Report Type</label>
                        <Select value={reportType} onValueChange={setReportType}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="payroll_summary">Payroll Summary (Excel)</SelectItem>
                                <SelectItem value="pf_challan">PF Challan (ECR)</SelectItem>
                                <SelectItem value="esi_challan">ESI Challan</SelectItem>
                                <SelectItem value="form_16">Form 16 Part A & B</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Month</label>
                         <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Year</label>
                         <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button className="w-full" onClick={handleDownload}>
                            <Download className="mr-2"/>
                            Generate & Download
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
