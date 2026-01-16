
"use client";

import { Suspense } from "react";
import DashboardContent from './dashboard-content';
import { MobileDashboard } from './mobile-dashboard';
import { Loader2 } from "lucide-react";

export default function Page() {
    return (
        <div className="w-full">
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin size-8 text-primary"/></div>}>
                {/* Mobile Dashboard */}
                <div className="md:hidden">
                    <MobileDashboard />
                </div>
                
                {/* Desktop Dashboard */}
                <div className="hidden md:block">
                    <DashboardContent />
                </div>
            </Suspense>
        </div>
    );
}
