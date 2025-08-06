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
import { UserResource } from "@clerk/types"
import { Chat, Message } from "@/context/types";

type AppContextType = {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  user: UserResource | null | undefined;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  selectedChat: Chat | null;
  setSelectedChat: React.Dispatch<React.SetStateAction<Chat | null>>;
  fetchUsersChats: () => Promise<void>;
  createNewChat: () => Promise<void>;
};

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

  const { user } = useUser();
  const { getToken } = useAuth();

  const createNewChat = async () => {
    try {
      if (!user) return;

      const token = await getToken();

      await axios.post(
        "/api/chat/create",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchUsersChats();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const fetchUsersChats = async () => {
    try {
      const token = await getToken();

      const { data } = await axios.get("/api/chat/get", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        const chats: Chat[] = data.data;
        setChats(chats);

        if (chats.length === 0) {
          await createNewChat();
          return fetchUsersChats(); // retry after creating
        }

        chats.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        setSelectedChat(chats[0]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsersChats();
    }
  }, [user]);

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
