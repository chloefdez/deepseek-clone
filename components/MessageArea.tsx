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

  // 1) Fetch fresh messages whenever chat changes
  useEffect(() => {
    const id = selectedChat?._id;
    if (!id) return;

    // If we already have local messages (e.g., user just sent + typing dots), do not clobber.
    const local = Array.isArray(selectedChat?.messages)
      ? selectedChat!.messages
      : [];
    if (local.length > 0) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`/api/messages/${id}`);
        const fetched: Message[] = Array.isArray(data?.data) ? data.data : [];

        if (cancelled) return;

        // Only set if we *still* don’t have local messages.
        setSelectedChat((prev) => {
          if (!prev || String(prev._id) !== String(id)) return prev;
          if (Array.isArray(prev.messages) && prev.messages.length > 0)
            return prev;
          return { ...(prev as Chat), messages: fetched };
        });

        // Mirror into chats[]
        setChats((prev) =>
          Array.isArray(prev)
            ? prev.map((c) =>
                String(c._id) === String(id)
                  ? ({ ...c, messages: fetched } as Chat)
                  : c
              )
            : prev
        );
      } catch {
        // ignore; keep current UI
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedChat?._id, setSelectedChat, setChats]);

  // 2) Base messages array (unconditional)
  const raw = Array.isArray(selectedChat?.messages)
    ? (selectedChat!.messages as Message[])
    : ([] as Message[]);

  // 3) Compact trailing empty assistant placeholders (unconditional)
  const messages = useMemo(() => {
    const out = [...raw];
    // keep at most one empty assistant bubble at the end
    let sawEmpty = false;
    for (let i = out.length - 1; i >= 0; i--) {
      const m = out[i];
      if (m.role === "assistant" && !m.content) {
        if (sawEmpty) out.splice(i, 1);
        else sawEmpty = true;
      }
    }
    return out;
  }, [raw]);

  // 4) Stable keys for rendering + scroll to bottom on change (unconditional)
  const keyed = useMemo(
    () =>
      messages.map((m, i) => {
        const key =
          (m as any).id ??
          (m as any)._id ??
          `${m.timestamp ?? "t"}:${m.role}:${i}`;
        return { key, ...m };
      }),
    [messages]
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [keyed.length]);

  const hasMessages = keyed.length > 0;

  // 5) Render
  if (!hasMessages) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-4 min-h-[calc(100dvh-160px)] flex items-center justify-center text-white/40">
        No messages yet — say hi!
      </div>
    );
  }

  const last = keyed[keyed.length - 1];
  const tailIsEmptyAssistant = last?.role === "assistant" && !last?.content;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 min-h-[calc(100dvh-160px)] flex flex-col justify-end">
      <div className="space-y-3" aria-live="polite" aria-atomic={false}>
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
        {tailIsEmptyAssistant && <div />}
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