"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, Receipt, Calculator, TrendingUp, FileText, Users, IndianRupee, CheckCircle, ArrowRight, Mic, FileSpreadsheet, BarChart3, Shield } from "lucide-react";

// Smart Automation Preview
export function SmartAutomationPreview() {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-lg border">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="h-6 w-6 text-purple-600" />
          <h4 className="text-lg font-semibold">Smart Journal Entry</h4>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Enter narration</Label>
            <Input 
              value="Purchased office supplies for Rs 5000 with 18% GST" 
              readOnly 
              className="bg-background"
            />
          </div>
          <Button className="w-full">
            <Zap className="h-4 w-4 mr-2" />
            Process Narration
          </Button>
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">Entry Generated</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Debit: Office Supplies ₹5,000</p>
              <p>Debit: Input CGST ₹450</p>
              <p>Debit: Input SGST ₹450</p>
              <p>Credit: Cash ₹5,900</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Card className="border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Bulk Upload</span>
            </div>
            <p className="text-xs text-muted-foreground">CSV/Excel import</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Bank Recon</span>
            </div>
            <p className="text-xs text-muted-foreground">Auto-match entries</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Invoicing Preview
export function InvoicingPreview() {
  return (
    <div className="space-y-4">
      <Card className="border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Create Invoice</CardTitle>
            <Badge variant="outline">GST Ready</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Customer</Label>
              <Input value="ABC Enterprises" readOnly className="bg-muted text-sm" />
            </div>
            <div>
              <Label className="text-xs">Amount</Label>
              <Input value="₹25,000" readOnly className="bg-muted text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              <Zap className="h-3 w-3 mr-1" />
              Rapid
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Mic className="h-3 w-3 mr-1" />
              Voice
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Bulk
            </Button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-lg">₹29,500</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Includes 18% GST (₹4,500)
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Receipt className="h-4 w-4 text-primary" />
          <span className="font-medium">Recent Invoices</span>
        </div>
        <div className="space-y-2">
          {["INV-001", "INV-002", "INV-003"].map((inv) => (
            <div key={inv} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
              <span>{inv}</span>
              <Badge variant="secondary" className="text-xs">Paid</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tax & Finance Preview
export function TaxFinancePreview() {
  return (
    <div className="space-y-4">
      <Card className="border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-600" />
            Asset Tax Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Asset Type</Label>
            <Input value="Property" readOnly className="bg-muted text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Purchase Price</Label>
              <Input value="₹50,00,000" readOnly className="bg-muted text-sm" />
            </div>
            <div>
              <Label className="text-xs">Sale Price</Label>
              <Input value="₹65,00,000" readOnly className="bg-muted text-sm" />
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
            <div className="text-xs text-muted-foreground mb-1">Capital Gains</div>
            <div className="text-xl font-bold text-emerald-700">₹15,00,000</div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-2 gap-3">
        <Card className="border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Loan Calc</span>
            </div>
            <p className="text-xs text-muted-foreground">EMI + Tax benefits</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium">SIP Calc</span>
            </div>
            <p className="text-xs text-muted-foreground">Wealth projection</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Compliance Preview
export function CompliancePreview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">TDS Returns</span>
            </div>
            <p className="text-xs text-muted-foreground">File TDS & TCS seamlessly</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">GST Filings</span>
            </div>
            <p className="text-xs text-muted-foreground">Returns & compliance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// HR Preview
export function HRPreview() {
  return (
    <div className="space-y-4">
      <Card className="border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Payroll Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Salary</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Rajesh K", salary: "₹50,000", status: "Active" },
                { name: "Priya M", salary: "₹45,000", status: "Active" },
                { name: "Amit S", salary: "₹55,000", status: "Active" },
              ].map((emp, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs">{emp.name}</TableCell>
                  <TableCell className="text-xs">{emp.salary}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{emp.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="border">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-rose-600" />
            <span className="text-sm font-medium">Bulk Form 16</span>
          </div>
          <p className="text-xs text-muted-foreground">Generate for multiple employees at once</p>
        </CardContent>
      </Card>
    </div>
  );
}
