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
  selectedChat: null,
  setSelectedChat: () => {},
  fetchUsersChats: async () => {},
  createNewChat: async () => {},
  selectChatById: async () => {},
};

export const AppContext = createContext<AppContextType>(defaultValue);
export const useAppContext = () => useContext(AppContext);

type AppContextProviderProps = {
  children: ReactNode;
};

function tsOrZero(x?: string | Date) {
  if (!x) return 0;
  const n = new Date(x).getTime();
  return Number.isFinite(n) ? n : 0;
}

export const AppContextProvider = ({ children }: AppContextProviderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const fetchUsersChats = async (): Promise<void> => {
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const { data } = await axios.get("/api/chat/get", { headers });

      if (data?.success) {
        const list: Chat[] = Array.isArray(data.data) ? data.data : [];

        if (list.length === 0) {
          await createNewChat();
          return;
        }

        list.sort((a, b) => tsOrZero(b.updatedAt) - tsOrZero(a.updatedAt));

        setChats(list);
        setSelectedChat(list[0] ?? null);
      } else {
        toast.error(data?.message ?? "Failed to fetch chats");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Error fetching chats"
      );
    }
  };

  const createNewChat = async (): Promise<void> => {
    try {
      if (!user) return;

      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const { data } = await axios.post("/api/chat/create", {}, { headers });

      if (!data?.success) {
        toast.error(data?.message ?? "Failed to create chat");
        return;
      }

      await fetchUsersChats();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error.message || "Error creating chat"
      );
    }
  };

  const selectChatById = async (id: string): Promise<void> => {
    // optimistic: show whatever we already have
    const existing = chats.find((c) => String(c._id) === String(id)) ?? null;
    setSelectedChat(existing);

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const { data } = await axios.get("/api/chat/get", {
        headers,
        params: { id },
      });

      if (!data?.success) {
        toast.error(data?.message ?? "Failed to load chat");
        return;
      }

      const full: Chat = data.data;
      setSelectedChat(full);
      setChats((prev) =>
        Array.isArray(prev)
          ? prev.map((c) =>
              String(c._id) === String(id) ? { ...c, ...full } : c
            )
          : prev
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Error loading chat messages"
      );
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      fetchUsersChats();
    } else {
      setChats([]);
      setSelectedChat(null);
    }
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