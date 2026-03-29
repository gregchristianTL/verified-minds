/**
 * AgentToastStack -- iOS-style stacked notification deck surfacing real-time
 * agent activity (promise, complete, decline, critique) as they arrive.
 *
 * - Top 4 cards visible in a stacked deck; extras represented by a +N badge.
 * - Newest card always on top; older cards peek below with scale/opacity taper.
 * - Clicking a card opens a centered modal with full markdown content.
 */

"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { DeliverableBody } from "@/components/swarm/DeliverableBody";
import { extractAgentGraph } from "@/lib/swarm/agentGraph";
import type { StoredMessage } from "@/lib/swarm/types";

const AUTO_DISMISS_MS = 8000;
const MAX_VISIBLE = 4;

type ToastType = "promise" | "complete" | "decline" | "critique";

interface ToastEntry {
  id: string;
  agentName: string;
  agentId: string;
  type: ToastType;
  snippet: string;
  fullContent: string;
  timestamp: number;
  persistent: boolean;
}

const TYPE_LABELS: Record<ToastType, string> = {
  promise: "Working on it…",
  complete: "Completed",
  decline: "Declined",
  critique: "Critiquing",
};

const TYPE_BORDER: Record<ToastType, string> = {
  promise: "border-l-node-promise",
  complete: "border-l-node-complete",
  decline: "border-l-node-decline",
  critique: "border-l-accent-primary",
};

const TYPE_DOT: Record<ToastType, string> = {
  promise: "bg-node-promise animate-dotPulse",
  complete: "bg-node-complete",
  decline: "bg-node-decline",
  critique: "bg-accent-primary animate-dotPulse",
};

const TYPE_TAG_BG: Record<ToastType, string> = {
  promise: "bg-node-promise/10 text-node-promise",
  complete: "bg-node-complete/10 text-node-complete",
  decline: "bg-node-decline/10 text-node-decline",
  critique: "bg-accent-primary/10 text-accent-primary",
};

function buildNameMap(messages: StoredMessage[]): Map<string, string> {
  const map = new Map<string, string>();
  const graph = extractAgentGraph(messages);
  if (graph) {
    for (const a of graph.agents) map.set(a.id, a.name);
  }
  return map;
}

function makeSnippet(content: string, fallback: string): string {
  const trimmed = (content ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.length > 120 ? `${trimmed.slice(0, 118)}…` : trimmed;
}

interface AgentToastStackProps {
  messages: StoredMessage[];
}

/**
 * AgentToastStack -- stacked notification deck in the bottom-right corner.
 *
 * @example
 * ```tsx
 * <AgentToastStack messages={messages} />
 * ```
 */
export function AgentToastStack({ messages }: AgentToastStackProps): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const lastSeenSeq = useRef<number>(-1);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setFocusedId((prev) => (prev === id ? null : prev));
    const timer = timers.current.get(id);
    if (timer !== undefined) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const scheduleDismiss = useCallback((id: string) => {
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    timers.current.set(id, timer);
  }, [dismiss]);

  const openModal = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) { clearTimeout(timer); timers.current.delete(id); }
    setFocusedId(id);
  }, []);

  const closeModal = useCallback(() => { setFocusedId(null); }, []);

  useEffect(() => {
    if (!focusedId) return;
    const handler = (e: KeyboardEvent): void => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusedId, closeModal]);

  useEffect(() => {
    if (messages.length === 0) { lastSeenSeq.current = -1; return; }

    const nameMap = buildNameMap(messages);
    const newToasts: ToastEntry[] = [];
    const justCompletedAgents = new Set<string>();

    for (const m of messages) {
      if (m.seq <= lastSeenSeq.current) continue;
      const payload = m.payload as Record<string, unknown>;
      const content = String(payload.content ?? "");
      let type: ToastType | null = null;
      let persistent = false;

      if (m.type === "PROMISE") { type = "promise"; persistent = true; }
      else if (m.type === "COMPLETE") { type = "complete"; justCompletedAgents.add(m.senderId); }
      else if (m.type === "INTENT" && m.senderId !== "swarm-orchestrator" && m.senderId !== "human" && content.includes("declined:")) { type = "decline"; }
      else if (m.type === "INTENT" && payload.isCritique && m.senderId !== "human") { type = "critique"; }

      if (type) {
        newToasts.push({
          id: `${m.seq}-${type}`, agentName: nameMap.get(m.senderId) ?? m.senderId,
          agentId: m.senderId, type,
          snippet: makeSnippet(content, TYPE_LABELS[type]),
          fullContent: content.trim() || TYPE_LABELS[type],
          timestamp: m.timestamp, persistent,
        });
      }
    }

    if (messages.length > 0) lastSeenSeq.current = Math.max(...messages.map((m) => m.seq));
    if (newToasts.length === 0 && justCompletedAgents.size === 0) return;

    setToasts((prev) => {
      let updated = [...prev];
      for (const agentId of justCompletedAgents) {
        updated = updated.filter((t) => {
          if (t.persistent && t.agentId === agentId) {
            const timer = timers.current.get(t.id);
            if (timer !== undefined) { clearTimeout(timer); timers.current.delete(t.id); }
            return false;
          }
          return true;
        });
      }
      return [...updated, ...newToasts];
    });

    for (const t of newToasts) { if (!t.persistent) scheduleDismiss(t.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    const timerMap = timers.current;
    return () => { for (const timer of timerMap.values()) clearTimeout(timer); timerMap.clear(); };
  }, []);

  const ordered = [...toasts].reverse();
  const visible = ordered.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, ordered.length - MAX_VISIBLE);
  const focusedToast = focusedId ? toasts.find((t) => t.id === focusedId) ?? null : null;

  return (
    <LayoutGroup>
      <div className="fixed bottom-20 right-4 z-20 pointer-events-none" style={{ width: 300, height: 0 }}>
        <AnimatePresence>
          {hiddenCount > 0 && (
            <motion.div key="overflow-badge" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute -bottom-7 right-0 pointer-events-auto">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-primary text-accent-primary-text">+{hiddenCount} more</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {visible.map((toast, i) => {
            const fanExtra = hovered && i > 0 ? i * 4 : 0;
            const yOffset = -(i * 8 + fanExtra);
            return (
              <motion.div
                key={toast.id} layoutId={toast.id}
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1 - i * 0.2, scale: 1 - i * 0.03, y: yOffset, x: 0 }}
                exit={{ opacity: 0, x: 40, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ position: "absolute", bottom: 0, right: 0, width: 300, zIndex: MAX_VISIBLE - i, pointerEvents: i === 0 ? "auto" : "none" }}
                onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
              >
                <div className={`agent-toast border-l-2 ${TYPE_BORDER[toast.type]} cursor-pointer select-none`} onClick={() => openModal(toast.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openModal(toast.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${TYPE_DOT[toast.type]}`} />
                      <span className="text-xs font-semibold text-text-primary truncate">{toast.agentName}</span>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_TAG_BG[toast.type]}`}>{TYPE_LABELS[toast.type]}</span>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); dismiss(toast.id); }} className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors mt-0.5" aria-label="Dismiss">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed mt-1 line-clamp-2">{toast.snippet}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-text-tertiary font-mono">{new Date(toast.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                    <span className="text-[9px] text-text-tertiary">tap to read</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <ToastModal toast={focusedToast} onClose={closeModal} onDismiss={dismiss} />
    </LayoutGroup>
  );
}

/** Expanded modal for reading a toast's full content. */
function ToastModal({ toast, onClose, onDismiss }: {
  toast: ToastEntry | null;
  onClose: () => void;
  onDismiss: (id: string) => void;
}): React.JSX.Element | null {
  if (!toast) return null;
  return (
    <AnimatePresence>
      <motion.div key="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
        <motion.div layoutId={toast.id} transition={{ type: "spring", stiffness: 300, damping: 32 }} className={`agent-toast border-l-2 ${TYPE_BORDER[toast.type]} pointer-events-auto w-full max-w-[460px]`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[toast.type]}`} />
              <span className="text-sm font-semibold text-text-primary">{toast.agentName}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${TYPE_TAG_BG[toast.type]}`}>{TYPE_LABELS[toast.type]}</span>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors" aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin text-text-primary">
            <DeliverableBody content={toast.fullContent} />
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border-subtle">
            <span className="text-[10px] text-text-tertiary font-mono">{new Date(toast.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            <button type="button" onClick={() => onDismiss(toast.id)} className="text-[10px] text-node-decline hover:opacity-80 transition-opacity">Dismiss</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
