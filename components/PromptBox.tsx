"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";
import type { Chat, Message } from "@/context/types";
import { useAuth, useUser } from "@clerk/nextjs";

type PromptBoxProps = {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function PromptBox({ isLoading, setIsLoading }: PromptBoxProps) {
  const [prompt, setPrompt] = useState("");
  const { setChats, selectedChat, setSelectedChat } = useAppContext();
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();

  // create a chat if one isn't open
  const ensureChat = async () => {
    if (selectedChat?._id) return selectedChat;

    const token = await getToken();
    const res = await axios.post(
      "/api/chat/create",
      { title: prompt.slice(0, 60) || "New chat" },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );

    const created: Chat = res.data?.data ?? res.data?.chat ?? res.data;
    if (!created?._id) throw new Error("Failed to create chat");

    setChats((prev: Chat[]) => [created, ...prev]);
    setSelectedChat(created);
    return created;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(e);
    }
  };

  const sendPrompt = async (
    e: React.FormEvent | React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    e.preventDefault();
    const promptCopy = prompt;

    try {
      if (!isSignedIn) return toast.error("Login to send message");
      if (isLoading) return toast.error("Wait for the previous response");
      if (!prompt.trim()) return;

      setIsLoading(true);
      setPrompt("");

      // 1) make sure we have a chat
      const chat = await ensureChat();

      // 2) optimistic user bubble in the open chat
      const userPrompt: Message = {
        role: "user",
        content: promptCopy,
        timestamp: Date.now(),
      };
      setSelectedChat((prev) =>
        prev ? { ...prev, messages: [...prev.messages, userPrompt] } : prev
      );

      // 3) prepare API messages (history + new user message)
      const history =
        chat?.messages?.map((m) => ({ role: m.role, content: m.content })) ??
        [];
      const apiMessages = [...history, { role: "user", content: promptCopy }];

      // 4) call /api/chat/ai (with a generous timeout)
      const token = await getToken();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/chat/ai", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || typeof data?.content !== "string") {
        console.error("ai.error", res.status, data);
        toast.error(data?.error ?? `AI request failed (${res.status})`);

        // rollback last optimistic user bubble
        setSelectedChat((prev) => {
          if (!prev) return prev;
          const msgs = prev.messages;
          if (msgs.length && msgs[msgs.length - 1].role === "user") {
            return { ...prev, messages: msgs.slice(0, -1) };
          }
          return prev;
        });

        // put text back in the textarea so they can retry
        setPrompt(promptCopy);
        return;
      }

      // 5) show assistant reply (typing animation optional)
      const full = data.content as string;
      const typing = true; // turn off if you want instant display

      if (!typing) {
        setSelectedChat((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  { role: "assistant", content: full, timestamp: Date.now() },
                ],
              }
            : prev
        );
      } else {
        const tokens = full.split(" ");
        let running = "";
        // push a placeholder once, then update its content
        setSelectedChat((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  { role: "assistant", content: "", timestamp: Date.now() },
                ],
              }
            : prev
        );

        tokens.forEach((t, i) => {
          setTimeout(() => {
            running = running ? `${running} ${t}` : t;
            setSelectedChat((prev) => {
              if (!prev) return prev;
              const msgs = [...prev.messages];
              const last = msgs[msgs.length - 1];
              if (!last || last.role !== "assistant") return prev;
              msgs[msgs.length - 1] = { ...last, content: running };
              return { ...prev, messages: msgs };
            });
          }, i * 100);
        });
      }

      // 6) keep the chats list in sync with the final message set
      setChats((prev: Chat[]) =>
        prev.map((c) =>
          c._id === chat._id
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  userPrompt,
                  { role: "assistant", content: full, timestamp: Date.now() },
                ],
              }
            : c
        )
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error).message ||
        "Unknown error";
      toast.error(msg);

      // rollback optimistic user bubble
      setSelectedChat((prev) => {
        if (!prev) return prev;
        const msgs = prev.messages;
        if (msgs.length && msgs[msgs.length - 1].role === "user") {
          return { ...prev, messages: msgs.slice(0, -1) };
        }
        return prev;
      });

      setPrompt(prompt);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
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
              className="h-5"
              src={assets.deepthink_icon}
              alt=""
              width={20}
              height={20}
            />
            DeepThink (R1)
          </p>
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition">
            <Image
              className="h-5"
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
            className="w-4 cursor-pointer"
            src={assets.pin_icon}
            alt=""
            width={16}
            height={16}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className={`${
              prompt ? "bg-primary" : "bg-[#71717a]"
            } rounded-full p-2 cursor-pointer disabled:opacity-60`}
          >
            <Image
              className="w-3.5 aspect-square"
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