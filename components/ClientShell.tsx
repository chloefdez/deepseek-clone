"use client";

import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import PromptBox from "@/components/PromptBox";
import MessageArea from "@/components/MessageArea";
import { assets } from "@/assets/assets";
import { useState } from "react";

export default function ClientShell() {
  const [expand, setExpand] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex h-dvh bg-[#292a2d] text-white">
      <Sidebar expand={expand} setExpand={setExpand} />

      {/* Right pane as a 2-row grid: [content (1fr), footer (auto)] */}
      <main className="relative grid h-dvh flex-1 grid-rows-[1fr_auto]">
        {/* Mobile header (absolute so it doesn't affect the grid rows) */}
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
          {/* MessageArea centers its hero within this row */}
          <MessageArea />
        </section>

        {/* Row 2: footer (prompt + note) */}
        <footer className="bg-[#292a2d]">
          <div className="max-w-3xl mx-auto px-4 pt-2 pb-4">
            <PromptBox isLoading={isLoading} setIsLoading={setIsLoading} />
          </div>
          <p className="text-xs text-center text-gray-500 pb-1">
            AI-generated, for reference only
          </p>
        </footer>
      </main>
    </div>
  );
}