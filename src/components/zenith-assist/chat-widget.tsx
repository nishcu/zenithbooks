"use client";

import * as React from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Loader2, Minus, RotateCcw, Send, UserRound, X } from "lucide-react";
import type { ChatbotQueryRequest, ChatbotQueryResponse, ZenithUserRole } from "@/lib/zenith-assist/types";

type UiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  meta?: {
    intent?: string;
    disclaimer?: string;
    actions?: Array<{ type: string; label: string; href: string }>;
    journalEntry?: ChatbotQueryResponse["journalEntry"];
  };
};

const DEFAULT_SUGGESTIONS = [
  "How to upload bulk invoices?",
  "Suggest journal entry: booked taxi for my personal use and paid Rs 450",
  "GST mismatch: CGST/SGST showing wrong totals",
  "What are common GST/TDS due dates?",
  "How to file GSTR-1 and GSTR-3B in ZenithBooks?",
  "Due dates for GSTR-1 under QRMP / IFF?",
  "Due dates for TDS returns (24Q / 26Q / 27Q)?",
  "Difference between TDS payment vs TDS return?",
  "How to do Bank Reconciliation (BRS)?",
  "How to record Sales Return / Credit Note with GST?",
  "Why is my Trial Balance not matching?",
  "How to generate Form 16?",
];

const FOLLOW_UPS_BY_INTENT: Record<string, string[]> = {
  ComplianceDueDates: [
    "Due dates for GSTR-1 under QRMP / IFF?",
    "Due dates for TDS returns (24Q / 26Q / 27Q)?",
    "Difference between TDS payment vs TDS return?",
    "Which return do I need: monthly vs QRMP?",
  ],
  ComplianceExplanation: [
    "Open GST filings steps",
    "Due dates for GSTR-1 under QRMP / IFF?",
    "Due dates for TDS returns (24Q / 26Q / 27Q)?",
  ],
  FeatureHelp: [
    "How to upload bulk invoices?",
    "How to do Bank Reconciliation (BRS)?",
    "How to generate Form 16?",
  ],
  ErrorExplanation: [
    "GST mismatch: CGST/SGST showing wrong totals",
    "Why is my Trial Balance not matching?",
    "How to fix unbalanced journal entry?",
  ],
  AccountingEntry: [
    "Suggest journal entry: sales made to ramesh 270000",
    "Suggest journal entry: received ₹50,000 from Ramesh by bank",
    "Suggest journal entry: purchased stationery ₹5,000 with 18% GST",
    "How to record Sales Return / Credit Note with GST?",
  ],
  FAQ: [
    "Difference between TDS payment vs TDS return?",
    "Personal expense vs business expense (Drawings)?",
    "What are common GST/TDS due dates?",
  ],
  Unknown: ["How to upload bulk invoices?", "How to generate Form 16?", "How to do Bank Reconciliation (BRS)?"],
};

function newId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function mapRoleToZenith(role?: string): ZenithUserRole {
  if (!role) return "Client";
  const r = role.toLowerCase();
  if (r.includes("professional") || r.includes("ca")) return "CA";
  if (r.includes("student")) return "Student";
  return "Client";
}

export function ChatWidget({
  className,
  userRoleHint,
  companyType,
  gstRegistered,
  previewMode,
  defaultOpen,
  launcherVariant,
}: {
  className?: string;
  userRoleHint?: string;
  companyType?: string | null;
  gstRegistered?: boolean | null;
  previewMode?: boolean;
  defaultOpen?: boolean;
  launcherVariant?: "robot" | "corporate";
}) {
  const [user] = useAuthState(auth);
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  const [isLoading, setIsLoading] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<UiMessage[]>([]);
  const [showAllSuggestions, setShowAllSuggestions] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const effectiveUserId = React.useMemo(() => {
    if (user?.uid) return user.uid;
    if (previewMode) return "preview_user";
    return null;
  }, [user?.uid, previewMode]);

  const storageKey = React.useMemo(() => (effectiveUserId ? `zb_chat_${effectiveUserId}` : null), [effectiveUserId]);

  const resetChat = React.useCallback(() => {
    setMessages([]);
    try {
      if (storageKey) localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    // keep widget open and focused
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [storageKey]);

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as UiMessage[];
      if (Array.isArray(parsed)) setMessages(parsed);
    } catch {
      // ignore
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, storageKey]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  React.useEffect(() => {
    if (!open) return;
    // Focus input when opening, so user can continue immediately after navigating elsewhere.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const userRole = mapRoleToZenith(userRoleHint);

  const pushMsg = (m: UiMessage) => setMessages((prev) => [...prev, m]);

  const lastAssistantIntent = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") return m.meta?.intent;
    }
    return undefined;
  }, [messages]);

  const suggestions = React.useMemo(() => {
    if (messages.length === 0) return DEFAULT_SUGGESTIONS;
    if (!lastAssistantIntent) return DEFAULT_SUGGESTIONS;
    return FOLLOW_UPS_BY_INTENT[lastAssistantIntent] || DEFAULT_SUGGESTIONS;
  }, [messages.length, lastAssistantIntent]);

  React.useEffect(() => {
    setShowAllSuggestions(false);
  }, [lastAssistantIntent, messages.length]);

  // IMPORTANT: keep this early return AFTER all hooks to avoid React hook order mismatch.
  if (!user && !previewMode) return null; // show only after login (unless preview mode)

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!effectiveUserId) return;
    pushMsg({ id: newId(), role: "user", text: trimmed });
    setInput("");
    setIsLoading(true);

    try {
      const payload: ChatbotQueryRequest = {
        userId: effectiveUserId,
        userRole,
        companyType: companyType ?? null,
        gstRegistered: gstRegistered ?? null,
        message: trimmed,
      };

      const res = await fetch("/api/chatbot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data: ChatbotQueryResponse | null = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }

      if (!res.ok || !data) {
        pushMsg({
          id: newId(),
          role: "assistant",
          text: "Sorry — I couldn’t process that. Please try again.",
        });
        return;
      }

      pushMsg({
        id: newId(),
        role: "assistant",
        text: data.text,
        meta: {
          intent: data.intent,
          disclaimer: data.disclaimer,
          actions: data.actions as any,
          journalEntry: data.journalEntry,
        },
      });
    } catch {
      pushMsg({
        id: newId(),
        role: "assistant",
        text: "Sorry — something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const effectiveLauncherVariant = launcherVariant ?? (previewMode ? "robot" : "corporate");
  const launcherImageSrc =
    effectiveLauncherVariant === "robot" ? "/zenith-assist/robot.svg" : "/zenith-assist/corporate.svg";

  return (
    <div className={cn("fixed right-4 z-[100] bottom-40 md:bottom-4", className)}>
      {!open ? (
        <Button
          onClick={() => setOpen(true)}
          className="h-12 rounded-full shadow-lg px-2 pr-4 flex items-center gap-2"
          aria-label="Open Zenith Assist"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={launcherImageSrc} alt="Zenith Assist" />
            <AvatarFallback>
              {effectiveLauncherVariant === "robot" ? <Bot className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm font-medium">Zenith Assist</span>
        </Button>
      ) : (
        <Card className="w-[360px] sm:w-[400px] h-[520px] shadow-xl border bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold truncate">Zenith Assist</div>
                <Badge variant="secondary" className="text-[11px]">
                  {userRole}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Fast help for features, entries, and compliance
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={resetChat}
                aria-label="Restart Zenith Assist"
                title="Restart"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Minimize">
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setOpen(false);
                }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[360px] px-4 py-3">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Ask anything about ZenithBooks features, accounting entries, GST/TDS basics.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_SUGGESTIONS.map((s) => (
                      <Button key={s} variant="secondary" size="sm" onClick={() => send(s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      {m.text}
                      {m.meta?.intent && !isUser && (
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                          <Badge variant="outline" className="text-[10px]">
                            {m.meta.intent}
                          </Badge>
                          {m.meta?.disclaimer && (
                            <span className="text-[10px] text-muted-foreground">{m.meta.disclaimer}</span>
                          )}
                        </div>
                      )}

                      {m.meta?.journalEntry && !isUser && (
                        <div className="mt-2 rounded-md border bg-background/50 p-2">
                          <div className="text-xs font-semibold">Suggested entry (review before posting)</div>
                          <div className="text-xs mt-1">
                            <span className="font-medium">Debit:</span> {m.meta.journalEntry.debitAccount || "—"}
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Credit:</span> {m.meta.journalEntry.creditAccount || "—"}
                          </div>
                          {m.meta.journalEntry.warnings?.length ? (
                            <div className="text-xs text-muted-foreground mt-1">
                              {m.meta.journalEntry.warnings[0]}
                            </div>
                          ) : null}
                          <div className="mt-2">
                            <Button asChild size="sm" variant="secondary">
                              <Link href="/accounting/journal/smart-entry">Open Smart Entry</Link>
                            </Button>
                          </div>
                        </div>
                      )}

                      {m.meta?.actions?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.meta.actions.map((a) => (
                            <Button key={`${a.type}_${a.href}`} asChild size="sm" variant="secondary">
                              <Link href={a.href}>{a.label}</Link>
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Follow-up suggestions (interactive) */}
          {!isLoading && (
            <div className="px-4 py-2 border-t bg-background">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">Suggested questions</div>
                {suggestions.length > 4 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setShowAllSuggestions((v) => !v)}
                  >
                    {showAllSuggestions ? "Less" : "More"}
                  </Button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(showAllSuggestions ? suggestions : suggestions.slice(0, 4)).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2 text-[11px] font-normal"
                    onClick={() => send(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <form
            className="px-4 py-3 border-t flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Zenith Assist…"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

