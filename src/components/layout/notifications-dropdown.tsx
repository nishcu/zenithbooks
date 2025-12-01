
"use client";

import { Bell, Check, CheckCheck, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/context/notifications-context";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
        case 'success':
            return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'warning':
            return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
        case 'error':
            return <AlertCircle className="h-4 w-4 text-red-600" />;
        case 'compliance':
            return <FileText className="h-4 w-4 text-blue-600" />;
        case 'appointment':
            return <Calendar className="h-4 w-4 text-purple-600" />;
        default:
            return <Info className="h-4 w-4 text-blue-600" />;
    }
};

export function NotificationsDropdown() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    
    const unreadNotifications = notifications.filter(n => !n.read);
    const recentNotifications = notifications.slice(0, 10);
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                    {unreadCount > 0 && unreadCount < 100 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    markAllAsRead();
                                }}
                            >
                                <CheckCheck className="h-3 w-3 mr-1" />
                                Mark all read
                            </Button>
                        </div>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[400px]">
                    {recentNotifications.length > 0 ? (
                        <div className="space-y-1 p-1">
                            {recentNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted",
                                        !notification.read && "bg-muted/50"
                                    )}
                                    onClick={() => {
                                        if (!notification.read) {
                                            markAsRead(notification.id);
                                        }
                                        if (notification.actionUrl) {
                                            window.location.href = notification.actionUrl;
                                        }
                                    }}
                                >
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={cn(
                                                "text-sm font-medium line-clamp-2",
                                                !notification.read && "font-semibold"
                                            )}>
                                                {notification.title}
                                            </p>
                                            {!notification.read && (
                                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {notification.actionUrl && (
                                                    <Link
                                                        href={notification.actionUrl}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        {notification.actionLabel || "View"}
                                                    </Link>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No notifications</p>
                        </div>
                    )}
                </ScrollArea>
                {notifications.length > 10 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/notifications" className="w-full text-center">
                                View all notifications
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

