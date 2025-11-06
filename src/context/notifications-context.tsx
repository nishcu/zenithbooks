
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, orderBy, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export interface Notification {
    id: string;
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'compliance' | 'appointment' | 'system';
    title: string;
    message: string;
    read: boolean;
    actionUrl?: string;
    actionLabel?: string;
    createdAt: Date;
    expiresAt?: Date;
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    addNotification: (notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function useNotifications() {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error("useNotifications must be used within NotificationsProvider");
    }
    return context;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const [user] = useAuthState(auth);
    
    const notificationsQuery = user 
        ? query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
          )
        : null;
    
    const [notificationsSnapshot, loading, error] = useCollection(notificationsQuery);
    
    const notifications: Notification[] = notificationsSnapshot?.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            expiresAt: data.expiresAt?.toDate(),
        } as Notification;
    }).filter((n: Notification) => !n.expiresAt || n.expiresAt > new Date()) || [];
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    const markAsRead = async (id: string) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, "notifications", id), { read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };
    
    const markAllAsRead = async () => {
        if (!user) return;
        try {
            const unreadNotifications = notifications.filter(n => !n.read);
            await Promise.all(
                unreadNotifications.map(n => 
                    updateDoc(doc(db, "notifications", n.id), { read: true })
                )
            );
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };
    
    const deleteNotification = async (id: string) => {
        if (!user) return;
        try {
            // In Firestore, we'll mark it as deleted instead of actually deleting
            await updateDoc(doc(db, "notifications", id), { deleted: true });
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };
    
    const addNotification = async (notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>) => {
        if (!user) return;
        try {
            await addDoc(collection(db, "notifications"), {
                ...notification,
                userId: user.uid,
                read: false,
                createdAt: Timestamp.now(),
            });
        } catch (error) {
            console.error("Error adding notification:", error);
        }
    };
    
    return (
        <NotificationsContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            addNotification,
        }}>
            {children}
        </NotificationsContext.Provider>
    );
}

