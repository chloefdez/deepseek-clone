export type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
};

export type Chat = {
  _id: string;
  title?: string;
  name?: string;
  messages: Message[];
  updatedAt?: string | Date;
};

export type AppContextType = {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  user: any | null;

  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;

  selectedChat: Chat | null | undefined;
  setSelectedChat: React.Dispatch<
    React.SetStateAction<Chat | null | undefined>
  >;

  fetchUsersChats: () => Promise<void>;
  createNewChat: () => Promise<void>;

  /** NOTE: pure local select (no network). Sidebar fetches messages. */
  selectChatById: (id: string) => void;
};