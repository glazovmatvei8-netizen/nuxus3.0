
export type MessageType = 'text' | 'image' | 'service' | 'audio' | 'video';

export interface Reaction {
  emoji: string;
  users: string[]; 
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  contentType: MessageType;
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

export interface UserPrivacy {
  phoneVisibility: 'everybody' | 'contacts' | 'nobody';
  lastSeenVisibility: 'everybody' | 'nobody';
  allowGroupsFrom: 'everybody' | 'contacts';
}

export interface UserSettings {
  theme: 'default' | 'ocean' | 'midnight';
  chatBackground: string;
  messageSize: 'small' | 'medium' | 'large';
  privacy: UserPrivacy;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  lastSeen?: string;
  createdAt: string;
  inactivityDeletion: '1-month' | '3-months' | '6-months' | '1-year' | 'never';
  settings?: UserSettings;
  blockedUserIds?: string[];
  isBanned?: boolean;
  frozenUntil?: string; // ISO timestamp
}
