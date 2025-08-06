export type Message = {
  role: string;
  content: string;
  timestamp: number;
};

export type Chat = {
  _id: string;
  name: string;
  userId: string;
  messages: Message[];
  updatedAt: string;
};