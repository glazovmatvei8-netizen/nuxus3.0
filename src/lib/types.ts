export type MessageType = 'text' | 'image' | 'service' | 'audio' | 'video';

export interface Reaction {
  emoji: string;
  users: string[]; // array of phone/ids
}

export interface Message {
  id: string;
  senderPhone: string;
  senderName: string;
  content: string;
  sentAt: string;
  contentType: MessageType;
  duration?: number; // duration for audio/video in seconds
  reactions?: Record<string, string[]>;
}

export type ChatType = 'private' | 'group' | 'channel';

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  username: string;
  description?: string;
  avatarUrl: string | null;
  participantIds: string[];
  adminIds: string[];
  createdAt: string;
  ownerId: string;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  inactivityDeletion?: string;
}