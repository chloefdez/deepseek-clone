"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { assets } from "@/assets/assets";
import { useClerk, useUser, UserButton, useAuth } from "@clerk/nextjs";
import ChatLabel from "./ChatLabel";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import type { Chat, Message } from "@/context/types";

type SidebarProps = {
  expand: boolean;
  setExpand: React.Dispatch<React.SetStateAction<boolean>>;
};

function recencyTs(c: any): number {
  const ua = c?.updatedAt
    ? +new Date(typeof c.updatedAt === "string" ? c.updatedAt : c.updatedAt)
    : 0;
  if (ua) return ua;
  const msgs: Message[] = Array.isArray(c?.messages) ? c.messages : [];
  const last = msgs.length ? msgs[msgs.length - 1] : null;
  return typeof last?.timestamp === "number" ? last.timestamp : 0;
}

export default function Sidebar({ expand, setExpand }: SidebarProps) {
  const { openSignIn } = useClerk();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const { chats, setChats, selectChatById, setSelectedChat } = useAppContext();

  const [openMenu, setOpenMenu] = useState<{
    id: string | null;
    open: boolean;
  }>({ id: null, open: false });

  // Prevent duplicate fetches if a user spam-clicks chats
  const inFlight = useRef<Set<string>>(new Set());

  // Headers helper for API calls in this component
  const getAuthHeaders = useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, [getToken]);

  const handleToggleMenu = (
    e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>,
    id: string
  ) => {
    e.stopPropagation();
    setOpenMenu((prev) =>
      prev.id === id ? { id, open: !prev.open } : { id, open: true }
    );
  };
  const handleCloseMenu = () => setOpenMenu({ id: null, open: false });

  function showLoginToast() {
    toast.custom((t) => (
      <div className="bg-[#1f1f22] text-white/90 border border-white/10 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
        <span>Please login to begin a new chat</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            openSignIn?.();
          }}
          className="ml-2 rounded-md bg-primary px-3 py-1 text-sm font-medium hover:opacity-90"
        >
          Sign in
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="ml-1 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10"
        >
          Later
        </button>
      </div>
    ));
  }

  /** Logo → go home (clear selection + route to "/") */
  const goHome = () => {
    setSelectedChat(undefined as any);
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("enter-home"));
    router.push("/");
  };

  /** Load a chat’s messages on demand, then select it */
  const openChat = async (id: string) => {
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("exit-home"));

    try {
      // Optimistic select first for snappy UI
      selectChatById(id);

      // If we already have messages, skip fetch
      const existing = (Array.isArray(chats) ? (chats as Chat[]) : []).find(
        (c) => String((c as any)?._id) === id
      );
      if (existing?.messages?.length) return;

      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);

      const headers = await getAuthHeaders();
      const res = await axios.get(`/api/messages/${id}`, { headers });

      const msgs: Message[] =
        res.data?.data ??
        res.data?.messages ??
        (Array.isArray(res.data) ? res.data : []) ??
        [];

      setChats((prev: Chat[]) =>
        (Array.isArray(prev) ? prev : []).map((c: any) =>
          String(c?._id) === id
            ? { ...c, messages: msgs, updatedAt: new Date() }
            : c
        )
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load messages"
      );
    } finally {
      inFlight.current.delete(id);
    }
  };

  /** New Chat: make it PURE LOCAL. PromptBox will create on first submit. */
  const handleNewChat = () => {
    if (!isSignedIn) {
      showLoginToast();
      return;
    }

    // Clear current selection and focus the input; no server call here.
    setSelectedChat(undefined as any);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("exit-home"));
      window.dispatchEvent(new Event("focus-input"));
    }

    // If you use a home route, keep this:
    router.push("/");
  };

  const sorted = Array.isArray(chats)
    ? [...(chats as Chat[])].sort((a, b) => recencyTs(b) - recencyTs(a))
    : [];

  return (
    <div
      className={`z-50 flex flex-col bg-[#212327] pt-7 transition-all
      max-md:absolute max-md:h-screen h-full min-h-0
      ${expand ? "w-64 p-4" : "w-0 max-md:overflow-hidden md:w-20"}`}
    >
      <div className="flex h-full flex-col">
        {/* ===== TOP ===== */}
        <div className="flex flex-col gap-8">
          <div
            className={`flex ${
              expand
                ? "w-full flex-row items-center justify-between gap-4"
                : "flex-col items-center gap-8"
            }`}
          >
            {/* Logo → Home */}
            <button
              type="button"
              onClick={goHome}
              aria-label="Go to Deepseek Home"
              className="focus:outline-none"
              title="Deepseek Home"
            >
              <Image
                className={expand ? "w-36 h-auto" : "w-10 h-auto"}
                src={expand ? assets.logo_text : assets.logo_icon}
                alt="Deepseek"
                width={expand ? 144 : 40}
                height={expand ? 36 : 40}
                loading="lazy"
              />
            </button>

            <div
              onClick={() => setExpand(!expand)}
              className="group relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-all duration-300 hover:bg-gray-500/20"
            >
              <Image
                src={assets.menu_icon}
                alt="menu"
                className="md:hidden"
                width={20}
                height={20}
              />
              <Image
                src={expand ? assets.sidebar_close_icon : assets.sidebar_icon}
                alt="toggle sidebar"
                className="hidden w-7 h-auto md:block"
                width={28}
                height={28}
              />
              <div
                className={`pointer-events-none absolute w-max rounded-lg bg-black px-3 py-2 text-sm text-white opacity-0 shadow-lg transition group-hover:opacity-100 ${
                  expand ? "left-1/2 top-12 -translate-x-1/2" : "-top-12 left-0"
                }`}
              >
                {expand ? "Close sidebar" : "Open sidebar"}
                <div
                  className={`absolute h-3 w-3 rotate-45 bg-black ${
                    expand
                      ? "left-1/2 -top-1.5 -translate-x-1/2"
                      : "left-4 -bottom-1.5"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* New chat */}
          <button
            type="button"
            onClick={handleNewChat}
            className={`group relative flex cursor-pointer items-center justify-center ${
              expand
                ? "w-max gap-2 rounded-2xl bg-primary p-2.5 hover:opacity-90"
                : "mx-auto h-9 w-9 rounded-lg hover:bg-gray-500/30"
            }`}
          >
            <Image
              className={expand ? "w-6 h-auto" : "w-7 h-auto"}
              src={expand ? assets.chat_icon : assets.chat_icon_dull}
              alt="new chat"
              width={expand ? 24 : 28}
              height={expand ? 24 : 28}
            />
            {!expand && (
              <div className="pointer-events-none absolute -right-12 -top-12 w-max rounded-lg bg-black px-3 py-2 text-sm text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                New Chat
                <div className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 bg-black" />
              </div>
            )}
            {expand && <p className="font-medium text-white">New Chat</p>}
          </button>
        </div>

        {/* ===== MIDDLE: Recents ===== */}
        {expand && (
          <div className="mt-6 flex-1 overflow-y-auto pr-2">
            <p className="my-1 text-sm text-white/25">Recents</p>
            <div className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-transparent">
              <div className="space-y-1">
                {sorted.length > 0 ? (
                  sorted.map((c: any) => {
                    const id =
                      typeof c._id === "string" ? c._id : String(c._id);
                    return (
                      <div
                        key={id}
                        onClick={() => openChat(id)}
                        className="cursor-pointer"
                      >
                        <ChatLabel
                          id={id}
                          isOpen={openMenu.open && openMenu.id === id}
                          toggleMenu={(e) => handleToggleMenu(e, id)}
                          closeMenu={handleCloseMenu}
                          onSelect={() => openChat(id)}
                        />
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-white/40">No chats yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== BOTTOM ===== */}
        <div className="mt-2 mt-auto flex flex-col gap-2">
          <div
            className={`group relative flex cursor-pointer items-center ${
              expand
                ? "gap-1 rounded-lg border border-primary p-2.5 text-sm text-white/80 hover:bg-white/10"
                : "mx-auto h-10 w-10 rounded-lg hover:bg-gray-500/30"
            }`}
          >
            <Image
              className={expand ? "w-5 h-auto" : "mx-auto w-6 h-auto"}
              src={expand ? assets.phone_icon : assets.phone_icon_dull}
              alt="get app"
              width={expand ? 20 : 24}
              height={expand ? 20 : 24}
            />
            <div
              className={`absolute hidden w-max opacity-0 transition group-hover:block group-hover:opacity-100 ${
                expand ? "-top-60 pb-8" : "-top-60 -right-40 pb-8"
              }`}
            >
              <div className="relative w-max rounded-lg bg-black p-3 text-sm text-white shadow-lg">
                <Image
                  src={assets.qrcode}
                  alt="QR"
                  className="w-44 h-auto"
                  width={176}
                  height={176}
                />
                <p>Scan to get DeepSeek App</p>
                <div
                  className={`absolute -bottom-1.5 h-3 w-3 rotate-45 bg-black ${
                    expand ? "right-1/2" : "left-4"
                  }`}
                />
              </div>
            </div>

            {expand && (
              <>
                <span>Get App</span>
                <Image
                  className="w-4 h-4"
                  alt=""
                  src={assets.new_icon}
                  width={18}
                  height={18}
                />
              </>
            )}
          </div>

          <div
            className={`flex items-center gap-3 p-2 text-sm text-white/60 ${
              expand ? "rounded-lg hover:bg-white/10" : "w-full justify-center"
            }`}
          >
            {user ? (
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonPopoverCard:
                      "bg-[#1f1f22] text-white border border-white/10",
                  },
                }}
              />
            ) : (
              <div onClick={() => openSignIn()} className="cursor-pointer">
                <Image
                  src={assets.profile_icon}
                  alt="profile"
                  className="w-7 h-7"
                  width={28}
                  height={28}
                />
              </div>
            )}
            {expand && <span>My Profile</span>}
          </div>
        </div>
      </div>
    </div>
  );
}