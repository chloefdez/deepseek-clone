"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import type { Chat, Message } from "@/context/types";
import { useAuth, useUser } from "@clerk/nextjs";

type PromptBoxProps = {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

/* ──────────────────────────────────────────────
   Title helpers
   ────────────────────────────────────────────── */
function cleanForTitle(s: string) {
  return s
    .replace(/[*_#`>~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function suggestTitle(text: string) {
  const cleaned = cleanForTitle(text);
  if (!cleaned) return "New chat";
  const first = cleaned.split(" ").slice(0, 8).join(" ");
  const capped = first.charAt(0).toUpperCase() + first.slice(1);
  return capped.length > 48 ? capped.slice(0, 48).trimEnd() + "…" : capped;
}
async function saveTitle(
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
    /* no-op; UI already updated optimistically */
  }
}

export default function PromptBox({ isLoading, setIsLoading }: PromptBoxProps) {
  const [prompt, setPrompt] = useState("");
  const { setChats, selectedChat, setSelectedChat } = useAppContext();
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();

  const mirrorMessages = (chatId: string, messages: Message[]) => {
    setChats((prev: Chat[]) =>
      prev.map((c) => (c._id === chatId ? { ...c, messages } : c))
    );
  };

  const sendingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const ensureChat = async () => {
    if (selectedChat?._id) return selectedChat;

    const token = await getToken();
    const res = await axios.post(
      "/api/chat/create",
      { title: prompt.slice(0, 60) || "New chat" },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );

    const raw = res.data?.data ?? res.data?.chat ?? res.data;
    const normId = (raw as any)?._id ?? (raw as any)?.id ?? null;

    const withMsgs: Chat = {
      ...(raw || {}),
      _id: normId,
      messages: Array.isArray(raw?.messages) ? raw.messages : [],
    };
    if (!withMsgs._id) throw new Error("Failed to create chat (missing id)");

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

  const sendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendingRef.current) return;
    sendingRef.current = true;

    const promptCopy = prompt;

    try {
      if (!isSignedIn) {
        toast.error("Login to send message");
        return;
      }
      if (isLoading) return;
      if (!prompt.trim()) return;

      setIsLoading(true);
      setPrompt("");

      // 1) ensure chat exists
      const chat = await ensureChat();

      // 1.5) auto-name if needed
      const needsTitle =
        !chat?.title ||
        chat.title === "New chat" ||
        /^Chat\s/i.test(chat.title);
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
        saveTitle(chat._id as string, newTitle, getToken);
      }

      // 2) persist to /api/messages/:chatId
      await axios.post(`/api/messages/${chat._id}`, { content: promptCopy });

      // 3) optimistic user bubble
      const userPrompt: Message = {
        role: "user",
        content: promptCopy,
        timestamp: Date.now(),
      };
      setSelectedChat((prev) => {
        const base = prev && prev._id === chat._id ? prev : chat;
        const existing = Array.isArray(base?.messages) ? base.messages : [];
        const next = { ...(base as Chat), messages: [...existing, userPrompt] };
        mirrorMessages(chat._id as string, next.messages);
        return next;
      });

      // assistant placeholder (same as your original)
      const assistantPlaceholder: Message = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      setSelectedChat((prev) => {
        if (!prev) return prev;
        const msgs = [...prev.messages];
        if (
          msgs.length &&
          msgs[msgs.length - 1].role === "assistant" &&
          !msgs[msgs.length - 1].content
        ) {
          msgs.pop();
        }
        const next = {
          ...(prev as Chat),
          messages: [...msgs, assistantPlaceholder],
        };
        mirrorMessages(prev._id as string, next.messages);
        return next;
      });

      // 4) call AI backend (unchanged)
      const history =
        chat?.messages?.map((m) => ({ role: m.role, content: m.content })) ??
        [];
      const apiMessages = [...history, { role: "user", content: promptCopy }];

      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/chat/ai", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: apiMessages, chatId: chat._id }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        toast.error(data?.error ?? `AI request failed (${res.status})`);
        return;
      }

      const full = typeof data?.content === "string" ? data.content : "";
      if (!full.trim()) return;

      // stream into assistant bubble (unchanged)
      const words = full.split(" ");
      let running = "";
      const pushChunk = (i: number) => {
        if (i >= words.length) return;
        running = running ? `${running} ${words[i]}` : words[i];

        setSelectedChat((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          let found = false;
          for (let j = msgs.length - 1; j >= 0; j--) {
            if (msgs[j].role === "assistant") {
              msgs[j] = { ...msgs[j], content: running };
              found = true;
              break;
            }
          }
          if (!found) {
            msgs.push({
              role: "assistant",
              content: running,
              timestamp: Date.now(),
            });
          }
          const next = { ...(prev as Chat), messages: msgs };
          mirrorMessages(prev._id as string, next.messages);
          return next;
        });

        setTimeout(() => requestAnimationFrame(() => pushChunk(i + 1)), 30);
      };
      requestAnimationFrame(() => pushChunk(0));
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ||
        (err as Error)?.message ||
        "Unknown error";
      toast.error(msg);
      setPrompt(promptCopy); // restore input
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={sendPrompt}
      className={`w-full ${
        false ? "max-w-3xl" : "max-w-2xl"
      } bg-[#404045] p-4 rounded-3xl mt-4 transition-all`}
    >
      <textarea
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
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition">
            <Image
              className="h-5 w-auto"
              src={assets.deepthink_icon}
              alt=""
              width={20}
              height={20}
            />
            DeepThink (R1)
          </p>
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition">
            <Image
              className="h-5 w-auto"
              src={assets.search_icon}
              alt=""
              width={20}
              height={20}
            />
            Search
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
            } rounded-full p-2 cursor-pointer disabled:opacity-60`}
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