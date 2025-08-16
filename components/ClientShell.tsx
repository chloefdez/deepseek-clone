"use client";

import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import PromptBox from "@/components/PromptBox";
import MessageArea from "@/components/MessageArea";
import { assets } from "@/assets/assets";
import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext"; 

export default function ClientShell() {
  const [expand, setExpand] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { selectedChat } = useAppContext(); 
  const hasMessages =
    !!selectedChat &&
    Array.isArray(selectedChat.messages) &&
    selectedChat.messages.length > 0;

  useEffect(() => {
    const DEBUG = false; // set to true if you ever want logs back in dev
    if (DEBUG && process.env.NODE_ENV === "development") {
      console.log("[ClientShell] selectedChat changed", {
        id: selectedChat?._id,
        messagesLen: selectedChat?.messages?.length ?? 0,
      });
    }
  }, [selectedChat]);

  return (
    <div className="flex h-dvh bg-[#292a2d] text-white">
      <Sidebar expand={expand} setExpand={setExpand} />

      {/* Right pane as a 2-row grid: [content (1fr), footer (auto)] */}
      <main className="relative grid h-dvh flex-1 grid-rows-[1fr_auto]">
        {/* Mobile header */}
        <div className="md:hidden absolute top-6 left-0 right-0 px-4 flex items-center justify-between">
          <Image
            onClick={() => setExpand((v) => !v)}
            className="rotate-180 cursor-pointer"
            src={assets.menu_icon}
            alt="menu"
          />
          <Image className="opacity-70" src={assets.chat_icon} alt="chat" />
        </div>

        {/* Row 1: scrollable content area */}
        <section className="min-h-0 overflow-y-auto">
          {hasMessages ? (
            // Normal chat view
            <MessageArea />
          ) : (
            // Empty state: center greeting + prompt
            <div className="min-h-[calc(100dvh-120px)] flex flex-col items-center justify-center px-4">
              <div className="text-center mb-6">
                <Image
                  src={assets.logo_icon}
                  alt="Deepseek logo"
                  width={40}
                  height={40}
                  className="mx-auto mb-4 opacity-80"
                  priority
                />
                <h1 className="text-2xl font-semibold mb-2">
                  Hi, I&apos;m Deepseek.
                </h1>
                <p className="text-gray-400">How can I help you today?</p>
              </div>
              <div className="w-full max-w-2xl">
                <PromptBox isLoading={isLoading} setIsLoading={setIsLoading} />
              </div>
            </div>
          )}
        </section>

        {/* Row 2: footer (only when there are messages) */}
        {hasMessages && (
          <footer className="bg-[#292a2d]">
            <div className="max-w-3xl mx-auto px-4 pt-2 pb-4">
              <PromptBox isLoading={isLoading} setIsLoading={setIsLoading} />
            </div>
            <p className="text-xs text-center text-gray-500 pb-1">
              AI-generated, for reference only
            </p>
          </footer>
        )}
      </main>
    </div>
  );
}