"use client";
import { assets } from "@/assets/assets";
import Message from "@/components/Message";
import PromptBox from "@/components/PromptBox";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [expand, setExpand] = useState(false);
  const [messages] = useState<string[]>([]); 
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar expand={expand} setExpand={setExpand} />
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 bg-[#292a2d] text-white relativ">
        <div className="md:hidden absolute px-4 top-6 flex items-center justify-between w-full">
          <Image
            onClick={() => setExpand((v) => !v)}
            className="rotate-180"
            src={assets.menu_icon}
            alt=""
          />
          <Image className="opacity-70" src={assets.chat_icon} alt="" />
        </div>

        <div className="flex flex-col pb-12">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-3">
                <Image src={assets.logo_icon} alt="" className="h-16" />
                <p className="text-2xl font-medium">Hi, I&apos;m Deepseek.</p>
              </div>
              <p className="text-sm mt-2">How can i help you today?</p>
            </div>
          ) : (
            <div className="flex-1">
              <Message role="user" content="What is next js" />
            </div>
          )}
        </div>

        <div className="w-full flex items-center justify-center px-4 pb-4">
          <PromptBox isLoading={isLoading} setIsLoading={setIsLoading} />
        </div>
        <p className="text-xs absolute bottom-1 text-gray-500">
          AI-generated, for reference only
        </p>
      </div>
    </div>
  );
}