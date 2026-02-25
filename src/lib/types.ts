export type MessageType = 'text' | 'image' | 'service';

export interface Reaction {
  emoji: string;
  users: string[]; // array of phone/ids
}

export interface Message {
  id: string;
  senderPhone: string;
  senderName: string;
  text: string;
  time: number;
  type: MessageType;
  reactions?: Record<string, string[]>;
}

export type ChatType = 'private' | 'group' | 'channel';

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  username: string;
  description?: string;
  avatar: string | null;
  participants: string[];
  admins: string[];
  messages: Message[];
  createdAt: number;
}

export interface User {
  phone: string;
  name: string;
  username: string;
  avatar: string | null;
  createdAt: number;
  password?: string;
}