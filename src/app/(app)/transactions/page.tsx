"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Removed unused Tabs import
import { format } from "date-fns";
import { IndianRupee, Receipt, FileText, CreditCard, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, getDoc } from "firebase/firestore";

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

// Stable empty array reference outside component
const EMPTY_TRANSACTIONS: Transaction[] = [];

export default function TransactionsPage() {
  // All hooks must be called unconditionally at the top level
  // IMPORTANT: All hooks must be in the same order on every render
  const [user] = useAuthState(auth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [userData, setUserData] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Ensure component is mounted on client side to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch user data and transactions together
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setTransactions([]);
      setUserData(null);
      return;
    }

    const fetchAllData = async () => {
      try {
        setLoading(true);
        const allTransactions: Transaction[] = [];

        // Fetch user data and certification requests in parallel
        const [userDoc, certRequestsSnapshot, paymentsSnapshot] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDocs(
            query(
              collection(db, "certificationRequests"),
              // Avoid composite index requirement (where + orderBy).
              // We'll sort combined results client-side anyway.
              where("userId", "==", user.uid)
            )
          ),
          getDocs(
            query(
              collection(db, "paymentTransactions"),
              // Avoid composite index requirement (where + orderBy).
              // We'll sort combined results client-side anyway.
              where("userId", "==", user.uid)
            )
          ),
        ]);

        // Set user data
        if (userDoc.exists()) {
          const userDataFromDoc = userDoc.data();
          setUserData(userDataFromDoc);

          // Add subscription payment from user data (if available)
          // Backward-compatible behavior:
          // - paymentAmount can be 0 if older flows didn't pass order_amount back; still show it
          // - some legacy users may have active plan but missing lastPaymentDate/paymentAmount; show a basic entry
          const subscriptionPlan = userDataFromDoc?.subscriptionPlan;
          const subscriptionStatus = userDataFromDoc?.subscriptionStatus;
          const isPaidPlan =
            subscriptionPlan === "business" || subscriptionPlan === "professional";
          const isActive =
            typeof subscriptionStatus === "string" &&
            subscriptionStatus.toLowerCase() === "active";

          if (userDataFromDoc?.lastPaymentDate && userDataFromDoc?.paymentAmount != null) {
            const paymentDate = userDataFromDoc.lastPaymentDate?.toDate() || new Date();
            allTransactions.push({
              id: `subscription_${userDataFromDoc.cashfreeOrderId || "latest"}`,
              type: "subscription",
              description: `${subscriptionPlan || "Subscription"} Plan`,
              amount: Number(userDataFromDoc.paymentAmount) || 0,
              date: paymentDate,
              status: subscriptionStatus || "active",
              orderId: userDataFromDoc.cashfreeOrderId,
              paymentId: userDataFromDoc.cashfreePaymentId,
            });
          } else if (isPaidPlan && isActive) {
            // Minimal fallback record so subscribed users can see something in Transaction History
            allTransactions.push({
              id: `subscription_${userDataFromDoc?.cashfreeOrderId || "active_plan"}`,
              type: "subscription",
              description: `${subscriptionPlan} Plan`,
              amount: Number(userDataFromDoc?.paymentAmount) || 0,
              date: new Date(),
              status: subscriptionStatus,
              orderId: userDataFromDoc?.cashfreeOrderId,
              paymentId: userDataFromDoc?.cashfreePaymentId,
            });
          }
        }

        // Process certification requests
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

        // Process payment transactions (on-demand + subscription payments)
        paymentsSnapshot.forEach((docSnap) => {
          const data: any = docSnap.data();
          const dt = data.createdAt?.toDate?.() || data.updatedAt?.toDate?.() || new Date();
          const pid = String(data.planId || "");

          let type: Transaction["type"] = "subscription";
          let description = pid || "Payment";

          if (pid === "business" || pid === "professional") {
            type = "subscription";
            description = `${pid} Plan`;
          } else if (pid.includes("notice")) {
            type = "notice";
            description = "Notice Handling";
          } else if (pid.includes("cma")) {
            type = "report";
            description = "CMA Report";
          } else if (pid.includes("form16")) {
            type = "report";
            description = "Form 16";
          } else if (pid.includes("download") || pid.includes("agreement") || pid.includes("deed") || pid.includes("letter") || pid.includes("resolution")) {
            type = "legal_document";
            description = "Legal Document";
          } else {
            type = "legal_document";
          }

          allTransactions.push({
            id: `pay_${docSnap.id}`,
            type,
            description,
            amount: Number(data.amount) || 0,
            date: dt,
            status: String(data.status || "SUCCESS"),
            orderId: data.orderId,
            paymentId: data.paymentId,
            serviceId: data.planId,
            reportType: data.planId,
          });
        });

        // Sort by date (newest first)
        allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        // Update transactions - React will handle re-render optimization
        setTransactions(allTransactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  // Filter transactions - use stable empty array reference
  // Memoize with stable dependencies to prevent hook order issues
  const filteredTransactions = useMemo(() => {
    // Defensive check - ensure transactions is always an array
    const txArray = Array.isArray(transactions) ? transactions : [];
    
    // Early return for empty array
    if (txArray.length === 0) {
      return EMPTY_TRANSACTIONS;
    }

    // Apply filters sequentially
    let filtered = txArray;

    // Filter by type
    if (filterType && filterType !== "all") {
      filtered = filtered.filter((t) => t?.type === filterType);
    }

    // Filter by search term
    const trimmedSearch = searchTerm?.trim() || "";
    if (trimmedSearch) {
      const searchLower = trimmedSearch.toLowerCase();
      filtered = filtered.filter((t) => {
        if (!t) return false;
        return (
          t.description?.toLowerCase().includes(searchLower) ||
          t.status?.toLowerCase().includes(searchLower) ||
          t.orderId?.toLowerCase().includes(searchLower) ||
          t.paymentId?.toLowerCase().includes(searchLower)
        );
      });
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

  // Memoize calculations with stable return values
  const totalAmount = useMemo(() => {
    const filtered = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    if (filtered.length === 0) {
      return 0;
    }
    return filtered.reduce((sum, t) => {
      return sum + (typeof t?.amount === 'number' ? t.amount : 0);
    }, 0);
  }, [filteredTransactions]);

  const paidCount = useMemo(() => {
    const filtered = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    if (filtered.length === 0) {
      return 0;
    }
    return filtered.filter((t) => {
      if (!t) return false;
      const status = (t.status || "").toLowerCase();
      return status === "success" || status === "paid" || status === "active" || status === "certified";
    }).length;
  }, [filteredTransactions]);

  // Early returns after all hooks are called
  // Prevent rendering until mounted to avoid hydration mismatches
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

