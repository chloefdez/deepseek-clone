"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";

type ChatLabelProps = {
  id: string;
  isOpen: boolean;
  toggleMenu: (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => void;
  closeMenu: () => void;
};

export default function ChatLabel({
  id,
  isOpen,
  toggleMenu,
  closeMenu,
}: ChatLabelProps) {
  const { chats, selectedChat, setSelectedChat } = useAppContext();

  const chat = Array.isArray(chats)
    ? (chats as any[]).find((c) => String(c._id) === String(id))
    : null;

  const title = (chat?.title?.trim?.() ||
    chat?.name?.trim?.() ||
    `Chat ${String(id).slice(-6)}`) as string;

  const isActive = selectedChat?._id === id;

  const handleSelect = () => {
    if (chat) {
      setSelectedChat(chat);
      closeMenu();
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-2 py-2
        ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
      title={title}
    >
      <span className="truncate text-sm text-white/80">{title}</span>

      <button
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="rounded px-2 py-1 text-lg leading-none opacity-0 hover:bg-white/10 group-hover:opacity-100"
      >
        ⋯
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-2 top-9 z-10 w-28 rounded-md border border-white/10 bg-[#1a1b1e] p-1 text-sm text-white/80 shadow-xl"
          onMouseLeave={closeMenu}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="block w-full rounded px-2 py-1 text-left hover:bg-white/10">
            Rename
          </button>
          <button className="block w-full rounded px-2 py-1 text-left hover:bg-white/10">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}