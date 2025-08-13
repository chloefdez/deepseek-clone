import type { UserResource } from "@clerk/types";

export type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export type Chat = {
  _id: string;
  name: string;
  messages: Message[];
  updatedAt: string;
};

export type AppContextType = {
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