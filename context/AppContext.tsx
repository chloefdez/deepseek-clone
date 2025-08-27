"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import toast from "react-hot-toast";
import type { AppContextType, Chat } from "./types";

const defaultValue: AppContextType = {
  isLoading: false,
  setIsLoading: () => {},
  user: null,

  chats: [],
  setChats: () => {},

  selectedChat: undefined,
  setSelectedChat: () => {},

  fetchUsersChats: async () => {},
  createNewChat: async () => {},
  selectChatById: () => {},
};

export const AppContext = createContext<AppContextType>(defaultValue);
export const useAppContext = () => useContext(AppContext);

type Props = { children: ReactNode };

export const AppContextProvider = ({ children }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null | undefined>(
    undefined
  );

  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  async function fetchUsersChats() {
    setIsLoading(true);
    try {
      const token = await getToken?.();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const res = await axios.get("/api/chat/get", { headers });
      const raw = res.data?.data ?? res.data ?? [];
      const list: Chat[] = Array.isArray(raw) ? raw : [];

      // IMPORTANT: only setChats here; do NOT auto-select anything
      setChats(list);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to load chats"
      );
    } finally {
      setIsLoading(false);
    }
  }

  const createNewChat = async (): Promise<void> => {
    try {
      if (!user) return;

      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const res = await axios.post(
        "/api/chat/create",
        { title: "New chat" },
        { headers }
      );

      const raw = res.data?.data ?? res.data?.chat ?? res.data;
      const id = String(raw?._id ?? raw?.id ?? "");
      if (!id) {
        toast.error("Failed to create chat");
        return;
      }

      const newChat: Chat = {
        ...(raw || {}),
        _id: id,
        title: raw?.title ?? "New chat",
        name: raw?.name ?? raw?.title ?? "New chat",
        messages: Array.isArray(raw?.messages) ? raw.messages : [],
        updatedAt: new Date(),
      };

      setChats((prev) => [newChat, ...(Array.isArray(prev) ? prev : [])]);
      // selection is handled by Sidebar after creation; keeping
      // this pure avoids double-mount/race conditions
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error.message || "Error creating chat"
      );
    }
  };

  /** Pure local select. Sidebar is responsible for fetching messages. */
  const selectChatById = (id: string): void => {
    const found =
      (Array.isArray(chats) ? chats : []).find(
        (c) => String(c._id) === String(id)
      ) ?? null;
    setSelectedChat(found);
  };

  // Auth gate: load/clear chats on sign-in state changes
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      fetchUsersChats();
    } else {
      setChats([]);
      setSelectedChat(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user?.id]);

  const value: AppContextType = {
    isLoading,
    setIsLoading,
    user,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    fetchUsersChats,
    createNewChat,
    selectChatById,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};