"use client";

import { useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import type { Chat, Message } from "@/context/types";

function TypingDots() {
  return (
    <span className="inline-flex gap-1 align-middle">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 animate-[blink_1s_ease-in-out_infinite]" />
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 animate-[blink_1s_ease-in-out_infinite] [animation-delay:.15s]" />
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 animate-[blink_1s_ease-in-out_infinite] [animation-delay:.3s]" />
      <style jsx>{`
        @keyframes blink {
          0%,
          80%,
          100% {
            opacity: 0.2;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }
      `}</style>
    </span>
  );
}

export default function MessageArea() {
  const { selectedChat, setSelectedChat, setChats } = useAppContext();

  // ——————————————————————————————————————
  // Fetch fresh messages whenever chat changes
  // ——————————————————————————————————————
  useEffect(() => {
    const id = selectedChat?._id;
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        const { data } = await axios.get(`/api/messages/${id}`);
        const msgs: Message[] = Array.isArray(data?.data) ? data.data : [];

        if (cancelled) return;

        // update selectedChat
        setSelectedChat((prev) =>
          prev && prev._id === id ? ({ ...prev, messages: msgs } as Chat) : prev
        );

        // mirror into chats[]
        setChats((prev) =>
          Array.isArray(prev)
            ? prev.map((c) =>
                c._id === id ? ({ ...c, messages: msgs } as Chat) : c
              )
            : prev
        );
      } catch {
        // ignore — keep whatever is already in memory
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedChat?._id, setSelectedChat, setChats]);

  const raw = selectedChat?.messages ?? [];

  // Friendly empty state
  if (raw.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-4 min-h-[calc(100dvh-160px)] flex items-center justify-center text-white/40">
        No messages yet — say hi!
      </div>
    );
  }

  // compact the last empty assistant bubble (typing dots handling)
  const messages = useMemo(() => {
    if (raw.length < 2) return raw;
    const out = [...raw];
    let foundEmpty = false;
    for (let i = out.length - 1; i >= 0; i--) {
      const m = out[i];
      if (m.role === "assistant" && !m.content) {
        if (!foundEmpty) {
          foundEmpty = true;
        } else {
          out.splice(i, 1);
        }
      }
    }
    return out;
  }, [raw]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Stable keys for animation
  const keyed = useMemo(
    () =>
      messages.map((m, i) => {
        const stableId =
          (m as any).id ??
          (m as any)._id ??
          `${m.timestamp ?? "t"}:${m.role}:${i}`;
        return { key: stableId, ...m };
      }),
    [messages]
  );

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [keyed.length]);

  const last = keyed[keyed.length - 1];
  const hasEmptyAssistantTail = last?.role === "assistant" && !last?.content;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 min-h-[calc(100dvh-160px)] flex flex-col justify-end">
      <div className="space-y-3">
        {keyed.map((m) => {
          const isUser = m.role === "user";
          const isEmptyAssistant = m.role === "assistant" && !m.content;
          return (
            <div
              key={m.key}
              className={[
                "flex transition-all duration-300",
                isUser ? "justify-end" : "justify-start",
              ].join(" ")}
            >
              <div
                className={[
                  "rounded-2xl px-4 py-2 max-w-[80%] whitespace-pre-wrap break-words",
                  isUser
                    ? "bg-primary text-white"
                    : "bg-[#404045] text-white/90",
                  "opacity-0 translate-y-1 animate-[fadeInUp_200ms_ease-out_forwards]",
                ].join(" ")}
              >
                {isEmptyAssistant ? <TypingDots /> : m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}