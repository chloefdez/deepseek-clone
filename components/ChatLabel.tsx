"use client";

import React from "react";

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
  return (
    <div className="group relative flex items-center justify-between rounded-lg px-2 py-2 hover:bg-white/5">
      <span className="truncate text-sm text-white/80">
        Chat {id.slice(-6)}
      </span>

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