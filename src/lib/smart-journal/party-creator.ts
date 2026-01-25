/**
 * Party Account Creator
 * Automatically creates customer/vendor accounts when counterparty is detected
 */

import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ParsedNarration } from "./types";

export interface PartyAccount {
  accountCode: string;
  accountName: string;
  accountType: "Liability" | "Asset";
  partyId?: string; // Firestore document ID
  partyType: "Customer" | "Vendor";
}

/**
 * Find or create party account for counterparty
 * Returns account code and party info
 */
export async function findOrCreatePartyAccount(
  parsed: ParsedNarration,
  userId: string
): Promise<PartyAccount | null> {
  if (!parsed.counterparty) {
    return null;
  }

  const counterpartyName = parsed.counterparty.trim();
  if (!counterpartyName) {
    return null;
  }

  // Determine party type based on transaction
  const isSale = parsed.transactionType === "sale" || parsed.transactionType === "income";
  const partyType = isSale ? "Customer" : "Vendor";
  const collectionName = isSale ? "customers" : "vendors";

  try {
    // Check if party already exists
    const partyQuery = query(
      collection(db, collectionName),
      where("userId", "==", userId),
      where("name", "==", counterpartyName)
    );
    const partySnapshot = await getDocs(partyQuery);

    if (!partySnapshot.empty) {
      // Party exists - return existing account code
      const partyDoc = partySnapshot.docs[0];
      const partyData = partyDoc.data();
      return {
        accountCode: partyData.accountCode || generateAccountCode(partyType),
        accountName: partyData.name,
        accountType: isSale ? "Liability" : "Liability", // Both are liabilities (Debtors/Creditors)
        partyId: partyDoc.id,
        partyType,
      };
    }

    // Party doesn't exist - create it
    const accountCode = generateAccountCode(partyType);
    
    // Create party document
    const partyRef = await addDoc(collection(db, collectionName), {
      userId,
      name: counterpartyName,
      accountCode,
      gstin: "",
      email: "",
      phone: "",
      address1: "",
      city: "",
      state: "",
      pincode: "",
      createdAt: new Date().toISOString(),
    });

    // Create corresponding account in user_accounts
    await addDoc(collection(db, "user_accounts"), {
      code: accountCode,
      name: counterpartyName,
      type: isSale ? "Current Asset" : "Current Liability", // Debtors are Assets, Creditors are Liabilities
      userId,
      partyId: partyRef.id,
      partyType,
    });

    return {
      accountCode,
      accountName: counterpartyName,
      accountType: isSale ? "Liability" : "Liability",
      partyId: partyRef.id,
      partyType,
    };
  } catch (error: any) {
    console.error("Error creating party account:", error);
    // Return a fallback account code if creation fails
    return {
      accountCode: generateAccountCode(partyType),
      accountName: counterpartyName,
      accountType: "Liability",
      partyType,
    };
  }
}

/**
 * Generate account code for party
 * Format: 2XXX for customers (debtors), 2XXX for vendors (creditors)
 */
function generateAccountCode(partyType: "Customer" | "Vendor"): string {
  // Use a simple incrementing approach
  // In production, use a proper allocator
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const baseCode = partyType === "Customer" ? "2002" : "2001";
  return `${baseCode}${random.toString().padStart(3, "0")}`;
}
