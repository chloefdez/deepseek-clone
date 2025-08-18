"use client";

import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import PromptBox from "@/components/PromptBox";
import MessageArea from "@/components/MessageArea";
import { assets } from "@/assets/assets";
import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";

export default function ClientShell() {
  const [expand, setExpand] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Home mode starts true on hard refresh so you get the welcome screen.
  const [homeMode, setHomeMode] = useState(true);
  const didInit = useRef(false);

  const { selectedChat, setSelectedChat } = useAppContext();

  // On first mount, clear any preselected chat so the welcome shows.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setSelectedChat(undefined as any);
  }, [setSelectedChat]);

  // Listen for “enter/exit home” events fired by Sidebar / PromptBox.
  useEffect(() => {
    const exit = () => setHomeMode(false);
    const enter = () => setHomeMode(true);
    window.addEventListener("exit-home", exit);
    window.addEventListener("enter-home", enter);
    return () => {
      window.removeEventListener("exit-home", exit);
      window.removeEventListener("enter-home", enter);
    };
  }, []);

  // IMPORTANT: don't depend on messages here — if a chat is selected, show the chat UI.
  const showHome = homeMode || !selectedChat?._id;

  return (
    <div className="flex h-dvh bg-[#292a2d] text-white">
      <Sidebar expand={expand} setExpand={setExpand} />

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

        {/* Content */}
        <section className="min-h-0 overflow-y-auto">
          {showHome ? (
            <div className="min-h-[calc(100dvh-120px)] flex flex-col items-center justify-center px-4">
              <div className="text-center mb-6">
                <Image
                  src={assets.logo_icon}
                  alt="Deepseek logo"
                  width={40}
                  height={40}
                  className="mx-auto mb-4 opacity-80"
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
          ) : (
            <MessageArea />
          )}
        </section>

        {/* Footer only in chat view */}
        {!showHome && (
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