"use client";

import { useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import PromptBox from "@/components/PromptBox";
import Message from "@/components/Message";
import { assets } from "@/assets/assets";

export default function Home() {
  const [expand, setExpand] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messages: string[] = [];

  return (
    <div className="flex h-screen">
      <Sidebar expand={expand} setExpand={setExpand} />

      <div className="relative flex flex-1 flex-col items-center justify-center bg-[#292a2d] px-4 pb-8 text-white">
        <div className="absolute top-6 w-full px-4 md:hidden">
          <div className="flex items-center justify-between">
            <Image
              onClick={() => setExpand((v) => !v)}
              className="rotate-180 cursor-pointer"
              src={assets.menu_icon}
              alt="menu"
              width={24}
              height={24}
              priority
            />
            <Image
              className="opacity-70"
              src={assets.chat_icon}
              alt="chat"
              width={24}
              height={24}
              priority
            />
          </div>
        </div>

        <div className="flex flex-col pb-12">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-3">
                <Image
                  src={assets.logo_icon}
                  alt="Deepseek logo"
                  className="h-16 w-16"
                  width={64}
                  height={64}
                  priority
                />
                <p className="text-2xl font-medium">Hi, I&apos;m Deepseek.</p>
              </div>
              <p className="mt-2 text-sm">How can I help you today?</p>
            </div>
          ) : (
            <div className="flex-1">
              <Message role="user" content="What is Next.js?" />
            </div>
          )}
        </div>

        <div className="w-full px-4 pb-4">
          <div className="mx-auto max-w-2xl">
            <PromptBox isLoading={isLoading} setIsLoading={setIsLoading} />
          </div>
        </div>

        <p className="absolute bottom-1 text-xs text-gray-500">
          AI-generated, for reference only
        </p>
      </div>
    </div>
  );
}