
export type MessageType = 'text' | 'image' | 'service' | 'audio' | 'video';

export interface Reaction {
  emoji: string;
  users: string[]; // array of phone/ids
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  contentType: MessageType;
  duration?: number;
  replyToId?: string;
  replyToContent?: string;
  editedAt?: string;
  isRead?: boolean;
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
  typing?: Record<string, boolean>;
  metadata?: Record<string, {
    name: string;
    username: string;
    avatarUrl: string | null;
  }>;
}

export interface UserSettings {
  theme: 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight';
  chatBackground: string;
  messageSize: 'small' | 'medium' | 'large';
}

export interface User {
  id: string;
  phone: string;
  name: string;
  username: string;
  bio?: string;
  avatarUrl: string | null;
  lastSeen?: string;
  createdAt: string;
  inactivityDeletion?: string;
  settings?: UserSettings;
}
