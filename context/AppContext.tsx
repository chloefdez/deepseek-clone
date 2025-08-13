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
};

export const AppContext = createContext<AppContextType>(defaultValue);
export const useAppContext = () => useContext(AppContext);

type AppContextProviderProps = {
  children: ReactNode;
};

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
        const list: Chat[] = data.data ?? [];

        if (list.length === 0) {
          await createNewChat();
          return; 
        }

        list.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        setChats(list);
        setSelectedChat(list[0]);
      } else {
        toast.error(data?.message ?? "Failed to fetch chats"); 
        return; 
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Error fetching chats"
      ); 
      return; 
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
      return; 
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error.message || "Error creating chat"
      ); 
      return; 
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
