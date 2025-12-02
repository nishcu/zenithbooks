"use client";

import { useState, useMemo } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { IndianRupee, Receipt, FileText, CreditCard, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, getDoc } from "firebase/firestore";
import { useEffect } from "react";

interface Transaction {
  id: string;
  type: "subscription" | "ca_certificate" | "legal_document" | "report" | "notice";
  description: string;
  amount: number;
  date: Date;
  status: string;
  orderId?: string;
  paymentId?: string;
  serviceId?: string;
  reportType?: string;
}

export default function TransactionsPage() {
  const [user] = useAuthState(auth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [userData, setUserData] = useState<any>(null);

  // Fetch user data for subscription payments
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  // Fetch certification requests
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const allTransactions: Transaction[] = [];

        // Fetch certification requests (CA certificates, legal documents, reports, notices)
        const certRequestsQuery = query(
          collection(db, "certificationRequests"),
          where("userId", "==", user.uid),
          orderBy("requestDate", "desc")
        );

        const certRequestsSnapshot = await getDocs(certRequestsQuery);
        certRequestsSnapshot.forEach((doc) => {
          const data = doc.data();
          const requestDate = data.requestDate?.toDate() || data.createdAt?.toDate() || new Date();
          
          // Determine transaction type based on reportType or service
          let type: Transaction["type"] = "ca_certificate";
          let description = data.reportType || data.serviceId || "Certificate Request";
          
          if (data.reportType?.includes("CMA") || data.reportType === "cma_report") {
            type = "report";
            description = "CMA Report";
          } else if (data.reportType?.toLowerCase().includes("notice")) {
            type = "notice";
            description = data.reportType || "Notice Handling";
          } else if (data.reportType && !data.reportType.includes("Certificate")) {
            // Legal documents typically don't have "Certificate" in the name
            const legalDocTypes = ["nda", "agreement", "deed", "letter", "resolution"];
            if (legalDocTypes.some(docType => data.reportType?.toLowerCase().includes(docType))) {
              type = "legal_document";
              description = data.reportType || "Legal Document";
            }
          } else {
            type = "ca_certificate";
            description = data.reportType || data.clientName || "CA Certificate";
          }

          allTransactions.push({
            id: doc.id,
            type,
            description,
            amount: data.amount || 0,
            date: requestDate,
            status: data.status || "Pending",
            orderId: data.cashfreeOrderId,
            paymentId: data.paymentId,
            serviceId: data.serviceId,
            reportType: data.reportType,
          });
        });

        // Add subscription payment from user data (if available)
        if (userData?.lastPaymentDate && userData?.paymentAmount) {
          const paymentDate = userData.lastPaymentDate?.toDate() || new Date();
          allTransactions.push({
            id: `subscription_${userData.cashfreeOrderId || "latest"}`,
            type: "subscription",
            description: `${userData.subscriptionPlan || "Subscription"} Plan`,
            amount: userData.paymentAmount || 0,
            date: paymentDate,
            status: userData.subscriptionStatus || "active",
            orderId: userData.cashfreeOrderId,
            paymentId: userData.cashfreePaymentId,
          });
        }

        // Sort by date (newest first)
        allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        setTransactions(allTransactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, userData]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(searchLower) ||
          t.status.toLowerCase().includes(searchLower) ||
          t.orderId?.toLowerCase().includes(searchLower) ||
          t.paymentId?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [transactions, filterType, searchTerm]);

  const getTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "subscription":
        return <CreditCard className="h-4 w-4" />;
      case "ca_certificate":
        return <FileText className="h-4 w-4" />;
      case "legal_document":
        return <FileText className="h-4 w-4" />;
      case "report":
        return <FileText className="h-4 w-4" />;
      case "notice":
        return <Receipt className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "success" || statusLower === "paid" || statusLower === "active" || statusLower === "certified") {
      return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
    } else if (statusLower === "pending") {
      return <Badge variant="secondary">Pending</Badge>;
    } else if (statusLower === "failed" || statusLower === "rejected") {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const paidCount = filteredTransactions.filter((t) => {
    const status = t.status.toLowerCase();
    return status === "success" || status === "paid" || status === "active" || status === "certified";
  }).length;

  if (!user) {
    return (
      <div className="space-y-8 p-8">
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please sign in to view your transaction history.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="mt-2 text-muted-foreground">
          View all your payments, subscriptions, and service orders
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Paid transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidCount}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description, status, order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="subscription">Subscriptions</SelectItem>
                <SelectItem value="ca_certificate">CA Certificates</SelectItem>
                <SelectItem value="legal_document">Legal Documents</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
                <SelectItem value="notice">Notices</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {filteredTransactions.length === 0
              ? "No transactions found"
              : `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? "s" : ""} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions found. Start by making a payment or requesting a service.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {getTypeIcon(transaction.type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(transaction.date, "MMM dd, yyyy 'at' hh:mm a")}
                        {transaction.orderId && ` • Order: ${transaction.orderId}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">
                        {transaction.amount > 0 ? (
                          <>
                            <IndianRupee className="inline h-4 w-4" />
                            {transaction.amount.toLocaleString()}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Free</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

