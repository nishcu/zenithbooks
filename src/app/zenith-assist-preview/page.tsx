import { notFound } from "next/navigation";
import { ChatWidget } from "@/components/zenith-assist/chat-widget";

export default function ZenithAssistPreviewPage() {
  // Preview is for local/dev only.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-xl font-semibold">Zenith Assist – Preview</h1>
        <p className="text-sm text-muted-foreground">
          This page exists only for development preview. In production, Zenith Assist appears after login across the app.
        </p>
        <p className="text-sm text-muted-foreground">
          Open the widget in the bottom-right corner and try: “How to upload bulk invoices?” or “Suggest journal entry:
          booked taxi for my personal use and paid Rs 450”.
        </p>
      </div>

      <ChatWidget previewMode defaultOpen userRoleHint="Client" launcherVariant="robot" />
    </div>
  );
}

