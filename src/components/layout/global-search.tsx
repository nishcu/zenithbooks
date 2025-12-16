"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, X, FileText, Users, Warehouse, Receipt, Calculator, TrendingUp, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from "react-firebase-hooks/auth";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SearchResult {
  id: string;
  type: 'invoice' | 'customer' | 'vendor' | 'item' | 'report' | 'page';
  title: string;
  description?: string;
  href: string;
  icon: any;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const [user] = useAuthState(auth);

  // Declare Firestore queries and hooks first
  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);

  const vendorsQuery = user ? query(collection(db, 'vendors'), where("userId", "==", user.uid)) : null;
  const [vendorsSnapshot, vendorsLoading] = useCollection(vendorsQuery);

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);

  // Add loading state for better UX (after all hooks are declared)
  const isLoading = customersLoading || vendorsLoading || itemsLoading;

  // Data processing hooks with safe access
  const customers = useMemo(() => {
    try {
      if (!customersSnapshot || !customersSnapshot.docs) return [];
      return customersSnapshot.docs
        .map(doc => {
          try {
            return { id: doc.id, ...doc.data() };
          } catch (error) {
            console.warn('Error processing customer doc:', error);
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      console.warn('Error processing customers:', error);
      return [];
    }
  }, [customersSnapshot]);

  const vendors = useMemo(() => {
    try {
      if (!vendorsSnapshot || !vendorsSnapshot.docs) return [];
      return vendorsSnapshot.docs
        .map(doc => {
          try {
            return { id: doc.id, ...doc.data() };
          } catch (error) {
            console.warn('Error processing vendor doc:', error);
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      console.warn('Error processing vendors:', error);
      return [];
    }
  }, [vendorsSnapshot]);

  const items = useMemo(() => {
    try {
      if (!itemsSnapshot || !itemsSnapshot.docs) return [];
      return itemsSnapshot.docs
        .map(doc => {
          try {
            return { id: doc.id, ...doc.data() };
          } catch (error) {
            console.warn('Error processing item doc:', error);
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      console.warn('Error processing items:', error);
      return [];
    }
  }, [itemsSnapshot]);

  const searchResults = useMemo(() => {
    try {
      if (!searchTerm.trim()) return [];

      const term = searchTerm.toLowerCase();
      const results: SearchResult[] = [];

    // Search customers (only if not loading and data exists)
    if (!customersLoading && customers && Array.isArray(customers)) {
      try {
        customers.forEach((customer: any) => {
          try {
            if (customer && typeof customer === 'object' && customer.name && typeof customer.name === 'string') {
              const name = customer.name.toLowerCase();
              const gstin = customer.gstin && typeof customer.gstin === 'string' ? customer.gstin.toLowerCase() : '';
              const email = customer.email && typeof customer.email === 'string' ? customer.email.toLowerCase() : '';

              if (name.includes(term) || gstin.includes(term) || email.includes(term)) {
                results.push({
                  id: customer.id || `customer-${Math.random()}`,
                  type: 'customer',
                  title: customer.name,
                  description: customer.gstin || customer.email || '',
                  href: `/parties?customer=${customer.id || ''}`,
                  icon: Users,
                });
              }
            }
          } catch (error) {
            console.warn('Error processing customer in search:', error);
          }
        });
      } catch (error) {
        console.warn('Error in customers search:', error);
      }
    }

    // Search vendors (only if not loading and data exists)
    if (!vendorsLoading && vendors && Array.isArray(vendors)) {
      try {
        vendors.forEach((vendor: any) => {
          try {
            if (vendor && typeof vendor === 'object' && vendor.name && typeof vendor.name === 'string') {
              const name = vendor.name.toLowerCase();
              const gstin = vendor.gstin && typeof vendor.gstin === 'string' ? vendor.gstin.toLowerCase() : '';
              const email = vendor.email && typeof vendor.email === 'string' ? vendor.email.toLowerCase() : '';

              if (name.includes(term) || gstin.includes(term) || email.includes(term)) {
                results.push({
                  id: vendor.id || `vendor-${Math.random()}`,
                  type: 'vendor',
                  title: vendor.name,
                  description: vendor.gstin || vendor.email || '',
                  href: `/parties?vendor=${vendor.id || ''}`,
                  icon: Users,
                });
              }
            }
          } catch (error) {
            console.warn('Error processing vendor in search:', error);
          }
        });
      } catch (error) {
        console.warn('Error in vendors search:', error);
      }
    }

    // Search items (only if not loading and data exists)
    if (!itemsLoading && items && Array.isArray(items)) {
      try {
        items.forEach((item: any) => {
          try {
            if (item && typeof item === 'object' && item.name && typeof item.name === 'string') {
              const name = item.name.toLowerCase();
              const hsn = item.hsn && typeof item.hsn === 'string' ? item.hsn.toLowerCase() : '';

              if (name.includes(term) || hsn.includes(term)) {
                results.push({
                  id: item.id || `item-${Math.random()}`,
                  type: 'item',
                  title: item.name,
                  description: item.hsn || `₹${item.price || item.sellingPrice || 0}`,
                  href: `/items?item=${item.id || ''}`,
                  icon: Warehouse,
                });
              }
            }
          } catch (error) {
            console.warn('Error processing item in search:', error);
          }
        });
      } catch (error) {
        console.warn('Error in items search:', error);
      }
    }

    // Search pages
    const pages: SearchResult[] = [
      { id: 'invoices', type: 'page', title: 'Invoices', description: 'View and manage sales invoices', href: '/billing/invoices', icon: Receipt },
      { id: 'voice-invoice', type: 'page', title: 'Voice Invoice', description: 'Create invoice using voice', href: '/billing/invoices/voice', icon: Receipt },
      { id: 'rapid-invoice', type: 'page', title: 'Rapid Invoice', description: 'Quick invoice entry', href: '/billing/invoices/rapid', icon: Receipt },
      { id: 'purchases', type: 'page', title: 'Purchase Bills', description: 'View and manage purchase bills', href: '/purchases', icon: Receipt },
      { id: 'gstr1', type: 'page', title: 'GSTR-1', description: 'File GSTR-1 return', href: '/gst-filings/gstr-1-wizard', icon: FileText },
      { id: 'gstr3b', type: 'page', title: 'GSTR-3B', description: 'File GSTR-3B return', href: '/gst-filings/gstr-3b-wizard', icon: FileText },
      { id: 'trial-balance', type: 'page', title: 'Trial Balance', description: 'View trial balance report', href: '/accounting/trial-balance', icon: Calculator },
      { id: 'balance-sheet', type: 'page', title: 'Balance Sheet', description: 'View balance sheet', href: '/accounting/financial-statements/balance-sheet', icon: TrendingUp },
      { id: 'profit-loss', type: 'page', title: 'Profit & Loss', description: 'View profit and loss statement', href: '/accounting/financial-statements/profit-and-loss', icon: TrendingUp },
    ];

    try {
      pages.forEach(page => {
        try {
          if (page.title.toLowerCase().includes(term) || (page.description && page.description.toLowerCase().includes(term))) {
            results.push(page);
          }
        } catch (error) {
          console.warn('Error processing page in search:', error);
        }
      });
    } catch (error) {
      console.warn('Error in pages search:', error);
    }

      // Return up to 15 results for better coverage
      return results.slice(0, 15);
    } catch (error) {
      console.error('Error in search results computation:', error);
      return [];
    }
  }, [searchTerm, customers, vendors, items, customersLoading, vendorsLoading, itemsLoading]);

  const handleSelect = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
    setSearchTerm("");
  }, [router]);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64 lg:w-80"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers, vendors, items, invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <ScrollArea className="h-[400px]">
              {isLoading && searchTerm.trim() && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    Searching...
                  </div>
                </div>
              )}
              {!isLoading && searchResults.length === 0 && searchTerm.trim() && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No results found for "{searchTerm}"
                </div>
              )}
              {!isLoading && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <Link
                      key={result.id}
                      href={result.href}
                      onClick={() => {
                        setOpen(false);
                        setSearchTerm("");
                      }}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                    >
                      <result.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{result.title}</div>
                        {result.description && (
                          <div className="text-sm text-muted-foreground truncate">{result.description}</div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

