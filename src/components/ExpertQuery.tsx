"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { Send, MessageSquare } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExpertQueryProps {
  profileId: string;
}

export default function ExpertQuery({
  profileId,
}: ExpertQueryProps): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { play } = useSoundSystem();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function handleSend(): Promise<void> {
    const question = input.trim();
    if (!question || loading) return;

    play("send");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/expertise/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, question }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? data.error ?? "No response",
        },
      ]);
      play("receive");
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
      play("error");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 space-y-3">
        {messages.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={gentle}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="size-5 text-primary" />
            </div>
            <p className="text-white font-medium">Ask anything</p>
            <p className="text-white/50 text-sm mt-1">
              This expert&apos;s knowledge is ready for your questions.
            </p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              className={`max-w-[85%] ${
                msg.role === "user" ? "ml-auto" : "mr-auto"
              }`}
              initial={{
                opacity: 0,
                x: msg.role === "user" ? 20 : -20,
                scale: 0.95,
              }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "backdrop-blur-lg bg-white/5 border border-white/10 text-white/90 rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="mr-auto"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={gentle}
            >
              <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 w-fit">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((dot) => (
                    <motion.div
                      key={dot}
                      className="w-2 h-2 rounded-full bg-primary/40"
                      animate={{ y: [0, -6, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="pt-4 mt-2 border-t border-white/10">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 h-11 rounded-xl px-4 text-sm text-white placeholder:text-white/30
                       backdrop-blur-lg bg-white/5 border border-white/10
                       focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50
                       transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="inline-flex items-center justify-center h-11 w-11 shrink-0 rounded-xl
                       bg-primary text-primary-foreground
                       hover:shadow-[0_0_20px_rgba(232,104,48,0.3)]
                       transition-all active:scale-[0.97]
                       disabled:opacity-40 disabled:pointer-events-none"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
