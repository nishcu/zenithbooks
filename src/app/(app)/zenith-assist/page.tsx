"use client";

import { ChatWidget } from "@/components/zenith-assist/chat-widget";

export default function ZenithAssistPage() {
  return (
    <div className="min-h-[calc(100vh-6rem)] p-4 sm:p-6">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-xl font-semibold">Zenith Assist</h1>
        <p className="text-sm text-muted-foreground">
          Ask about features, journal entries (with GST), and common compliance basics. Always review before posting.
        </p>
      </div>

      {/* Open by default on this page */}
      <ChatWidget defaultOpen launcherVariant="corporate" />
    </div>
  );
}

