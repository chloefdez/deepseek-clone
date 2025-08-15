"use client";

import Image from "next/image";
import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import Message from "@/components/Message";

export default function MessageArea() {
  const { selectedChat } = useAppContext();
  const messages = selectedChat?.messages ?? [];

  // No messages -> perfectly centered inside grid row 1
  if (!messages.length) {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Image
              src={assets.logo_icon}
              alt="Deepseek"
              className="h-16 w-16"
            />
            <p className="text-2xl font-medium">Hi, I&apos;m Deepseek.</p>
          </div>
          <p className="mt-2 text-sm text-gray-300">
            How can i help you today?
          </p>
        </div>
      </div>
    );
  }

  // Messages -> center column
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      {messages.map((m, i) => (
        <Message key={i} role={m.role} content={m.content} />
      ))}
    </div>
  );
}
