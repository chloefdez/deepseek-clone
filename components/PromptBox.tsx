"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Chat, Message } from "@/context/types";
import { useAuth } from "@clerk/nextjs"; 

type PromptBoxProps = {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

function PromptBox({ isLoading, setIsLoading }: PromptBoxProps) {
  const [prompt, setPrompt] = useState("");
  const { user, setChats, selectedChat, setSelectedChat } = useAppContext();
  const { getToken } = useAuth(); 

  // Pressing Enter submits; Shift+Enter makes a newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(e);
    }
  };

  const sendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    const promptCopy = prompt;

    try {
      if (!user) return toast.error("Login to send message");
      if (!selectedChat?._id) return toast.error("Open or create a chat first");
      if (isLoading) return toast.error("Wait for the previous response");
      if (!prompt.trim()) return;

      setIsLoading(true);
      setPrompt("");

      const userPrompt: Message = {
        role: "user",
        content: promptCopy, // keep what the user actually typed
        timestamp: Date.now(),
      };

      // ✅ Optimistic UI: append the user's message locally
      setSelectedChat((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...prev.messages, userPrompt] };
      });

      // ✅ KEY FIX: include Clerk token so getAuth(req) resolves userId on the server
      const token = await getToken();
      const { data } = await axios.post(
        "/api/chat/ai",
        { chatId: selectedChat._id, prompt: promptCopy },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      if (data?.success) {
        const full = data.data.content as string;
        const tokens = full.split(" ");

        const assistantMessage: Message = {
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        };

        setSelectedChat((prev) => {
          if (!prev) return prev;
          return { ...prev, messages: [...prev.messages, assistantMessage] };
        });

        for (let i = 0; i < tokens.length; i++) {
          setTimeout(() => {
            assistantMessage.content = tokens.slice(0, i + 1).join(" ");
            setSelectedChat((prev) => {
              if (!prev) return prev;
              const updated = [...prev.messages];
              updated[updated.length - 1] = assistantMessage;
              return { ...prev, messages: updated };
            });
          }, i * 100);
        }

        setChats((prevChats) =>
          prevChats.map((chat: Chat) =>
            chat._id === selectedChat._id
              ? { ...chat, messages: [...chat.messages, data.data] }
              : chat
          )
        );
      } else {
        toast.error(data?.message ?? "Failed to get a response");
        setPrompt(promptCopy);
        setSelectedChat((prev) => {
          if (!prev) return prev;
          return { ...prev, messages: prev.messages.slice(0, -1) };
        });
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err.message || "Unknown error"
      );
      setPrompt(promptCopy);
      setSelectedChat((prev) => {
        if (!prev) return prev;
        const msgs = prev.messages;
        if (msgs.length && msgs[msgs.length - 1].role === "user") {
          return { ...prev, messages: msgs.slice(0, -1) };
        }
        return prev;
      });
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

export default PromptBox;