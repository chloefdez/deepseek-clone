"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import type { Chat, Message } from "@/context/types";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

/** Stable ref across hot-reloads/mounts to block duplicate submits */
function getGlobalRef<T extends object>(key: string, init: T): T {
  const root: any = typeof window !== "undefined" ? window : globalThis;
  root.__ds = root.__ds || {};
  if (!root.__ds[key]) root.__ds[key] = init;
  return root.__ds[key] as T;
}

/* ---------- Title helpers ---------- */
const clean = (s: string) =>
  s
    .replace(/[*_#`>~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const suggestTitle = (s: string) => {
  const t = clean(s);
  if (!t) return "New chat";
  const first = t.split(" ").slice(0, 8).join(" ");
  const capped = first.charAt(0).toUpperCase() + first.slice(1);
  return capped.length > 48 ? capped.slice(0, 48).trimEnd() + "…" : capped;
};

async function persistTitle(
  chatId: string,
  title: string,
  getToken: () => Promise<string | null>
) {
  try {
    const token = await getToken();
    await axios.post(
      "/api/chat/rename",
      { chatId, name: title },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );
  } catch {
    /* non-blocking */
  }
}

export default function PromptBox({
  isLoading,
  setIsLoading,
}: {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [prompt, setPrompt] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const { selectedChat, setSelectedChat, setChats } = useAppContext();
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();

  const sendingRef = getGlobalRef<{ current: boolean }>("promptSubmitting", {
    current: false,
  });
  const ctlRef = useRef<AbortController | null>(null);

  // Focus when Sidebar asks for it
  useEffect(() => {
    const fn = () => taRef.current?.focus();
    if (typeof window !== "undefined") {
      window.addEventListener("focus-input", fn);
      return () => window.removeEventListener("focus-input", fn);
    }
  }, []);

  const mirror = (chatId: string, messages: Message[]) => {
    setChats((prev) =>
      (Array.isArray(prev) ? prev : []).map((c: any) =>
        String(c._id) === String(chatId)
          ? { ...c, messages, updatedAt: new Date() }
          : c
      )
    );
  };

  /** Create a chat on the server if none is selected yet */
  const ensureChat = async (initialTitle?: string): Promise<Chat> => {
    if (selectedChat?._id) return selectedChat as Chat;

    const token = await getToken();
    const res = await axios.post(
      "/api/chat/create",
      { title: initialTitle?.slice(0, 60) || "New chat" },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );

    const raw = res.data?.data ?? res.data?.chat ?? res.data;
    const id = raw?._id ?? raw?.id;
    if (!id) throw new Error("Failed to create chat (missing id)");

    const withMsgs: Chat = {
      ...(raw || {}),
      _id: String(id),
      title: raw?.title ?? "New chat",
      name: raw?.name ?? raw?.title ?? "New chat",
      messages: Array.isArray(raw?.messages) ? raw.messages : [],
      updatedAt: new Date(),
    };

    setChats((prev: Chat[]) => [
      withMsgs,
      ...(Array.isArray(prev) ? prev : []),
    ]);
    setSelectedChat(withMsgs);
    return withMsgs;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  /** Add a trailing empty assistant message so the UI shows typing dots */
  const addAssistantPlaceholder = (chatId: string) => {
    setSelectedChat((prev) => {
      if (!prev || String(prev._id) !== String(chatId)) return prev;
      const msgs = [...prev.messages];
      const last = msgs[msgs.length - 1];
      if (!msgs.length || last.role !== "assistant" || last.content) {
        msgs.push({ role: "assistant", content: "", timestamp: Date.now() });
      }
      mirror(chatId, msgs);
      return { ...(prev as Chat), messages: msgs };
    });
  };

  /** Remove a trailing empty assistant message (no content) */
  const removeAssistantPlaceholder = (chatId: string) => {
    setSelectedChat((prev) => {
      if (!prev || String(prev._id) !== String(chatId)) return prev;
      const msgs = [...prev.messages];
      if (
        msgs.length &&
        msgs[msgs.length - 1].role === "assistant" &&
        !msgs[msgs.length - 1].content
      ) {
        msgs.pop();
      }
      mirror(chatId, msgs);
      return { ...(prev as Chat), messages: msgs };
    });
  };

  /** Replace the last assistant message (placeholder or not) with text */
  const replaceAssistantContent = (chatId: string, text: string) => {
    setSelectedChat((prev) => {
      if (!prev || String(prev._id) !== String(chatId)) return prev;
      const msgs = [...prev.messages];
      for (let j = msgs.length - 1; j >= 0; j--) {
        if (msgs[j].role === "assistant") {
          msgs[j] = { ...msgs[j], content: text };
          break;
        }
      }
      mirror(chatId, msgs);
      return { ...(prev as Chat), messages: msgs };
    });
  };

  /** Parse SSE stream from DeepSeek; extract only delta.content/message.content */
  const readStreamToUI = async (res: Response, chatId: string) => {
    const reader = res.body?.getReader();
    if (!reader) return "";

    const decoder = new TextDecoder();
    let buffer = "";
    let running = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);

          if (!line) continue; // skip keep-alives

          // If this is not SSE, treat as plain text
          if (!line.startsWith("data:")) {
            running += line;
            replaceAssistantContent(chatId, running);
            continue;
          }

          const payload = line.slice(5).trim(); // after "data:"
          if (!payload) continue;
          if (payload === "[DONE]") return running;

          // Try to parse JSON frame; fallback to raw text
          try {
            const obj = JSON.parse(payload);
            const piece =
              obj?.choices?.[0]?.delta?.content ??
              obj?.choices?.[0]?.message?.content ??
              "";
            if (piece) {
              running += piece;
              replaceAssistantContent(chatId, running);
            }
          } catch {
            running += payload;
            replaceAssistantContent(chatId, running);
          }
        }
      }
    } finally {
      try {
        reader.releaseLock?.();
      } catch {}
    }

    return running;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignedIn) return toast.error("Login to send message");
    if (isLoading) return;
    if (!prompt.trim()) return;

    if (sendingRef.current) return;
    sendingRef.current = true;

    const promptCopy = prompt;

    try {
      setIsLoading(true);
      setPrompt("");
      taRef.current?.focus();

      const chat = await ensureChat(promptCopy);

      // persist user message (fire-and-forget)
      try {
        const token = await getToken();
        await axios.post(
          `/api/messages/${chat._id}`,
          { content: promptCopy },
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );
      } catch {}

      // auto-title if needed
      const needsTitle =
        !chat?.title ||
        /^new chat$/i.test(chat.title) ||
        chat.title === "New chat";
      if (needsTitle && promptCopy.trim()) {
        const newTitle = suggestTitle(promptCopy);
        setSelectedChat((prev) =>
          prev && prev._id === chat._id
            ? ({ ...prev, title: newTitle, name: newTitle } as Chat)
            : prev
        );
        setChats((prev: Chat[]) =>
          prev.map((c) =>
            c._id === chat._id
              ? ({ ...c, title: newTitle, name: newTitle } as Chat)
              : c
          )
        );
        persistTitle(chat._id, newTitle, getToken);
      }

      // optimistic user bubble
      const userMsg: Message = {
        role: "user",
        content: promptCopy,
        timestamp: Date.now(),
      };
      setSelectedChat((prev) => {
        const base = prev && prev._id === chat._id ? prev : chat;
        const existing = Array.isArray(base?.messages) ? base.messages : [];
        const nextMsgs = [...existing, userMsg];
        mirror(chat._id as string, nextMsgs);
        return { ...(base as Chat), messages: nextMsgs };
      });

      // show typing dots immediately
      addAssistantPlaceholder(chat._id as string);

      // build history for API
      const baseHistory = (Array.isArray(chat?.messages) ? chat.messages : [])
        .filter((m: any) => typeof m?.content === "string" && m.content.trim())
        .map((m: any) => ({ role: m.role, content: m.content }));
      const apiMessages = [
        ...baseHistory,
        { role: "user", content: promptCopy },
      ];

      // call AI backend
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      ctlRef.current?.abort();
      ctlRef.current = new AbortController();

      const res = await fetch("/api/chat/ai", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: apiMessages, chatId: chat._id }),
        signal: ctlRef.current.signal,
      });

      if (!res.ok) {
        removeAssistantPlaceholder(chat._id as string);
        let errText = "";
        try {
          errText = await res.text();
        } catch {}
        toast.error(errText || `AI request failed (${res.status})`);
        return;
      }

      const ctype = (res.headers.get("content-type") || "").toLowerCase();

      if (ctype.includes("application/json")) {
        // JSON fallback
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          const txt = await res.text();
          if (txt?.trim()) replaceAssistantContent(chat._id as string, txt);
          else removeAssistantPlaceholder(chat._id as string);
          return;
        }
        const full =
          typeof data?.content === "string"
            ? data.content
            : typeof data?.message === "string"
            ? data.message
            : "";
        if (!full.trim()) {
          removeAssistantPlaceholder(chat._id as string);
          return;
        }
        replaceAssistantContent(chat._id as string, full);
        try {
          const token2 = await getToken();
          await axios.post(
            `/api/messages/${chat._id}`,
            { role: "assistant", content: full },
            token2
              ? { headers: { Authorization: `Bearer ${token2}` } }
              : undefined
          );
        } catch {}
      } else {
        // STREAMING (text/event-stream or plain text)
        const final = await readStreamToUI(res, chat._id as string);
        if (!final) {
          removeAssistantPlaceholder(chat._id as string);
          return;
        }
        // persist assistant (fire-and-forget)
        try {
          const token2 = await getToken();
          await axios.post(
            `/api/messages/${chat._id}`,
            { role: "assistant", content: final },
            token2
              ? { headers: { Authorization: `Bearer ${token2}` } }
              : undefined
          );
        } catch {}
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        if (selectedChat?._id)
          removeAssistantPlaceholder(selectedChat._id as string);
        toast.error(
          err?.response?.data?.message || err?.message || "Unknown error"
        );
        setPrompt(promptCopy);
      }
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="w-full max-w-2xl bg-[#404045] p-4 rounded-3xl mt-4 transition-all"
    >
      <textarea
        ref={taRef}
        onKeyDown={handleKeyDown}
        className="outline-none w-full resize-none overflow-hidden break-words bg-transparent"
        rows={2}
        placeholder="Message DeepSeek"
        required
        onChange={(e) => setPrompt(e.target.value)}
        value={prompt}
      />
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full">
            <Image
              className="h-5 w-auto"
              src={assets.deepthink_icon}
              alt=""
              width={20}
              height={20}
            />
            DeepThink (R1)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Image
            className="w-4 h-4 cursor-pointer"
            src={assets.pin_icon}
            alt=""
            width={16}
            height={16}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading || sendingRef.current}
            className={`${
              prompt ? "bg-primary" : "bg-[#71717a]"
            } rounded-full p-2 disabled:opacity-60`}
          >
            <Image
              className="w-3.5 h-3.5"
              src={prompt ? assets.arrow_icon : assets.arrow_icon_dull}
              alt=""
              width={14}
              height={14}
            />
          </button>
        </div>
      </div>
    </form>
  );
}