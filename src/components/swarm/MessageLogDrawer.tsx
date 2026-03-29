/**
 * MessageLogDrawer -- slide-in panel showing ITP protocol events.
 *
 * Each message renders as a card with a color-coded left border
 * matching its type (INTENT, PROMISE, COMPLETE, etc.).
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import type { StoredMessage } from "@/lib/swarm/types";

interface MessageLogDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: StoredMessage[];
}

const TYPE_META: Record<string, { label: string; border: string; dot: string; tag: string }> = {
  INTENT:   { label: "Intent",   border: "border-l-node-intent",    dot: "bg-node-intent",    tag: "bg-node-intent/10 text-node-intent" },
  PROMISE:  { label: "Promise",  border: "border-l-node-promise",   dot: "bg-node-promise",   tag: "bg-node-promise/10 text-node-promise" },
  COMPLETE: { label: "Complete", border: "border-l-node-complete",  dot: "bg-node-complete",  tag: "bg-node-complete/10 text-node-complete" },
  ASSESS:   { label: "Assess",   border: "border-l-node-fulfilled", dot: "bg-node-fulfilled", tag: "bg-node-fulfilled/10 text-node-fulfilled" },
  DECLINE:  { label: "Decline",  border: "border-l-node-decline",   dot: "bg-node-decline",   tag: "bg-node-decline/10 text-node-decline" },
};

const FALLBACK_META = { label: "Event", border: "border-l-border-default", dot: "bg-text-tertiary", tag: "bg-surface-secondary text-text-secondary" };

/**
 * MessageLogDrawer -- right-side panel with the raw protocol stream.
 *
 * @example
 * ```tsx
 * <MessageLogDrawer open={isOpen} onClose={close} messages={messages} />
 * ```
 */
export function MessageLogDrawer({ open, onClose, messages }: MessageLogDrawerProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent): void => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed top-0 right-0 z-50 h-full w-[360px] bg-surface-elevated border-l border-border-default flex flex-col shadow-lg"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
              <h2 className="text-sm font-semibold text-text-primary tracking-tight">Protocol Log</h2>
              {messages.length > 0 && <span className="text-[10px] font-mono text-text-tertiary">{messages.length}</span>}
            </div>
            <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-secondary text-text-tertiary hover:text-text-primary transition-colors" aria-label="Close log">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
                <p className="text-sm text-text-secondary">No messages yet</p>
                <p className="text-xs text-text-tertiary">Post an intent to see protocol events here.</p>
              </div>
            )}
            {messages.map((msg) => <LogEntry key={msg.seq} message={msg} />)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LogEntry({ message }: { message: StoredMessage }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[message.type] ?? FALLBACK_META;
  const content = String(message.payload?.content ?? message.payload?.reason ?? "...");
  const senderLabel = message.senderId.length > 20 ? `${message.senderId.slice(0, 18)}…` : message.senderId;

  return (
    <motion.div layout className={`rounded-lg border border-border-subtle ${meta.border} border-l-2 bg-surface-primary/60 transition-colors hover:bg-surface-primary/90`}>
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${meta.tag}`}>{meta.label}</span>
            <span className="text-[10px] font-mono text-text-tertiary truncate">{senderLabel}</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">{content}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <span className="text-[9px] font-mono text-text-tertiary">#{message.seq}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`text-text-tertiary transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="px-3 pb-3">
              <div className="rounded-md bg-surface-secondary/60 border border-border-subtle px-3 py-2.5">
                <p className="text-[11px] text-text-primary leading-relaxed whitespace-pre-wrap break-words">{content}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                {message.intentId && <span className="text-[9px] font-mono text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded">intent: {message.intentId}</span>}
                {message.promiseId && <span className="text-[9px] font-mono text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded">promise: {message.promiseId}</span>}
                <span className="text-[9px] font-mono text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded">{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
