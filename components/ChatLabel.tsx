"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import type { Chat } from "@/context/types";

/** Shows a toast only if the op takes > delay ms. */
function savingToast(label = "Saving…", delay = 400) {
  let toastId: string | null = null;
  const timer = setTimeout(() => {
    toastId = toast.loading(label);
  }, delay);
  return () => {
    clearTimeout(timer);
    if (toastId) toast.dismiss(toastId);
  };
}

type ChatLabelProps = {
  id: string;
  isOpen: boolean;
  toggleMenu: (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => void;
  closeMenu: () => void;
  onSelect?: (id: string) => void;
};

function cleanPreview(s: unknown, max = 40) {
  const text =
    typeof s === "string"
      ? s
          .replace(/[*_#`>~\-]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export default function ChatLabel({
  id,
  isOpen,
  toggleMenu,
  closeMenu,
  onSelect,
}: ChatLabelProps) {
  const { chats, selectedChat, setSelectedChat, setChats } = useAppContext();
  const { getToken } = useAuth();

  const getAuthHeaders = useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, [getToken]);

  const chat = Array.isArray(chats)
    ? (chats as any[]).find((c) => String(c._id) === String(id))
    : null;

  const explicit =
    (chat?.title && chat.title.trim?.()) ||
    (chat?.name && chat.name.trim?.()) ||
    "";

  let title = explicit;
  if (!title || /^new chat$/i.test(title)) {
    const msgs = Array.isArray(chat?.messages) ? chat!.messages : [];
    const firstUser = msgs.find(
      (m: any) => m.role === "user" && m.content?.trim()
    );
    if (firstUser?.content) title = cleanPreview(firstUser.content, 48);
    if (!title) title = "Untitled";
  }

  const msgs = Array.isArray(chat?.messages) ? chat!.messages : [];
  const lastAssistant = [...msgs]
    .reverse()
    .find((m: any) => m.role === "assistant");
  const preview = cleanPreview(
    (lastAssistant ?? msgs[msgs.length - 1])?.content ?? ""
  );

  const isActive = selectedChat?._id === id;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSelect = () => {
    if (onSelect) onSelect(id);
    else if (chat) {
      setSelectedChat(chat);
      closeMenu();
    }
  };

  const doRename = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === title) {
      setEditing(false);
      setDraft(title);
      return;
    }

    const now = new Date();
    const prevChats = chats as Chat[];
    const prevSel = selectedChat;

    setChats((prev) =>
      Array.isArray(prev)
        ? prev.map((c) =>
            String((c as any)._id) === id
              ? ({
                  ...c,
                  title: trimmed,
                  name: trimmed,
                  updatedAt: now,
                } as Chat)
              : c
          )
        : prev
    );
    setSelectedChat((prev) =>
      prev && String((prev as any)._id) === id
        ? ({
            ...(prev as Chat),
            title: trimmed,
            name: trimmed,
            updatedAt: now,
          } as Chat)
        : prev
    );

    try {
      const headers = await getAuthHeaders();
      const dismiss = savingToast();
      await axios.post(
        "/api/chat/rename",
        { chatId: id, name: trimmed },
        { headers }
      );
      dismiss();
    } catch (err: any) {
      setChats(prevChats as any);
      setSelectedChat(prevSel as any);
      toast.error(
        err?.response?.data?.message || err?.message || "Rename failed"
      );
    } finally {
      setEditing(false);
    }
  };

  const doDelete = async () => {
    if (!confirm("Delete this chat? This cannot be undone.")) return;

    const prevChats = chats as Chat[];
    const prevSel = selectedChat;
    setChats((prev) =>
      Array.isArray(prev)
        ? prev.filter((c) => String((c as any)._id) !== id)
        : prev
    );
    if (String(prevSel?._id) === id) {
      setSelectedChat(undefined as any);
    }
    closeMenu();

    try {
      const headers = await getAuthHeaders();
      const dismiss = savingToast();
      await axios.post("/api/chat/delete", { chatId: id }, { headers });
      dismiss();
      toast.success("Deleted");
    } catch (err: any) {
      setChats(prevChats as any);
      setSelectedChat(prevSel as any);
      toast.error(
        err?.response?.data?.message || err?.message || "Delete failed"
      );
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 ${
        isActive ? "bg-white/10" : "hover:bg-white/5"
      }`}
      title={title}
      aria-current={isActive ? "page" : undefined}
      data-test-id="chat-label"
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                doRename(draft);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
                setDraft(title);
              }
            }}
            onBlur={() => doRename(draft)}
            className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white outline-none"
            placeholder="Chat title"
          />
        ) : (
          <>
            <div className="truncate text-sm text-white/90">{title}</div>
            {preview && (
              <div className="truncate text-[11px] leading-tight text-white/45">
                {preview}
              </div>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="ml-2 rounded px-2 py-1 text-lg leading-none opacity-0 hover:bg-white/10 group-hover:opacity-100"
      >
        ⋯
      </button>

      {isOpen && !editing && (
        <div
          role="menu"
          className="absolute right-2 top-9 z-10 w-28 rounded-md border border-white/10 bg-[#1a1b1e] p-1 text-sm text-white/80 shadow-xl"
          onMouseLeave={closeMenu}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-white/10"
            onClick={() => {
              setEditing(true);
              setDraft(title);
              closeMenu();
            }}
          >
            Rename
          </button>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-white/10 text-red-300"
            onClick={doDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}