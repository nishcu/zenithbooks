
"use client";

import { Suspense } from "react";
import DashboardContent from './dashboard-content';
import { Loader2 } from "lucide-react";

export default function Page() {
    return (
        <div className="w-full">
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin size-8 text-primary"/></div>}>
                <DashboardContent />
            </Suspense>
        </div>
    );
}
