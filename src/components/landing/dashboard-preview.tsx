"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IndianRupee, Receipt, TrendingUp, ChevronDown, ChevronUp, Calculator, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardPreview() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock data for preview
  const mockStats = [
    { title: "Receivables", value: "₹2,45,000", icon: IndianRupee, color: "text-green-600" },
    { title: "Payables", value: "₹1,20,000", icon: Receipt, color: "text-orange-600" },
    { title: "GST Payable", value: "₹18,500", icon: Calculator, color: "text-blue-600" },
  ];

  const mockInvoices = [
    { id: "INV-001", customer: "ABC Enterprises", amount: "₹45,000", date: "25 Jan 2026", status: "Paid" },
    { id: "INV-002", customer: "XYZ Corp", amount: "₹32,500", date: "24 Jan 2026", status: "Pending" },
    { id: "INV-003", customer: "Tech Solutions", amount: "₹28,000", date: "23 Jan 2026", status: "Paid" },
  ];

  return (
    <div className="w-full">
      <Card className="border-2 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Dashboard Preview</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              {isExpanded ? (
                <>
                  <span className="hidden sm:inline">Collapse</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Click to Explore</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This is what you'll see after logging in. All data shown here is for demonstration purposes.
          </p>
        </CardHeader>

        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {mockStats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="bg-muted/50 rounded-lg p-4 border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <stat.icon className={cn("h-5 w-5", stat.color)} />
                      </div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Click "Click to Explore" above to see the full dashboard preview
                  </p>
                </div>
              </CardContent>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <CardContent className="p-6 space-y-6">
                {/* Financial Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {mockStats.map((stat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-5 border shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <stat.icon className={cn("h-6 w-6", stat.color)} />
                      </div>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Chart Placeholder */}
                <div className="bg-muted/30 rounded-lg p-6 border border-dashed">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <h3 className="text-lg font-semibold">Financial Summary Chart</h3>
                  </div>
                  <div className="h-48 bg-background/50 rounded flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Interactive chart showing revenue, expenses, and profit trends
                    </p>
                  </div>
                </div>

                {/* Recent Invoices */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Receipt className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Recent Invoices</h3>
                  </div>
                  <div className="space-y-2">
                    {mockInvoices.map((invoice, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground">{invoice.customer}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{invoice.amount}</p>
                          <p className="text-xs text-muted-foreground">{invoice.date}</p>
                        </div>
                        <div className="ml-4">
                          <span
                            className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              invoice.status === "Paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            )}
                          >
                            {invoice.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Quick Access Cards */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Quick Access</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["Invoices", "Accounting", "GST", "Reports"].map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + idx * 0.05 }}
                        className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border text-center cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <p className="text-sm font-medium">{item}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
