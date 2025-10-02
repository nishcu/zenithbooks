
"use client";

import React, { createContext, useState, ReactNode, useContext } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

type JournalLine = {
    account: string;
    debit: string;
    credit: string;
    costCentre?: string;
};

export type JournalVoucher = {
    id: string;
    date: string;
    narration: string;
    lines: JournalLine[];
    amount: number;
    userId?: string;
    customerId?: string;
    vendorId?: string;
    reverses?: string;
};

type AccountingContextType = {
    journalVouchers: JournalVoucher[];
    loading: boolean;
    error: any;
    addJournalVoucher: (voucher: Omit<JournalVoucher, 'userId'>) => Promise<void>;
    updateJournalVoucher: (id: string, voucherData: Partial<Omit<JournalVoucher, 'id' | 'userId'>>) => Promise<void>;
};

export const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const useAccountingContext = () => {
    const context = useContext(AccountingContext);
    if (!context) {
        throw new Error("useAccountingContext must be used within an AccountingProvider");
    }
    return context;
};

export const AccountingProvider = ({ children }: { children: ReactNode }) => {
    const [user] = useAuthState(auth);

    const journalVouchersRef = collection(db, "journalVouchers");
    const journalVouchersQuery = user ? query(journalVouchersRef, where("userId", "==", user.uid), orderBy("date", "desc")) : null;
    const [journalVouchersSnapshot, loading, error] = useCollection(journalVouchersQuery);

    const journalVouchers: JournalVoucher[] = journalVouchersSnapshot?.docs.map(doc => ({ ...doc.data() } as JournalVoucher)) || [];

    const addJournalVoucher = async (voucher: Omit<JournalVoucher, 'userId'>) => {
        if (!user) throw new Error("User not authenticated");
        if (!voucher.id) throw new Error("Voucher ID is required");

        const docRef = doc(db, "journalVouchers", voucher.id);
        await setDoc(docRef, { ...voucher, userId: user.uid });
    };
    
    const updateJournalVoucher = async (id: string, voucherData: Partial<Omit<JournalVoucher, 'id' | 'userId'>>) => {
        if (!user) throw new Error("User not authenticated");
        
        const docRef = doc(db, "journalVouchers", id);
        await updateDoc(docRef, voucherData);
    };

    return (
        <AccountingContext.Provider value={{ journalVouchers, loading, error, addJournalVoucher, updateJournalVoucher }}>
            {children}
        </AccountingContext.Provider>
    );
};
