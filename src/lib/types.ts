
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'service';

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

export type ChatType = 'private' | 'group' | 'channel' | 'saved';

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
  pinnedMessageId?: string | null;
  typing?: Record<string, boolean>;
  metadata?: Record<string, {
    name: string;
    username: string;
    avatarUrl: string | null;
    isPremium?: boolean;
  }>;
}

export interface UserPrivacy {
  phoneVisibility: 'everybody' | 'contacts' | 'nobody';
  lastSeenVisibility: 'everybody' | 'nobody';
  allowGroupsFrom: 'everybody' | 'contacts' | 'nobody';
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
  settings?: UserSettings;
  blockedUserIds?: string[];
  pinnedChatIds?: string[];
  isBanned?: boolean;
  isPremium?: boolean;
  premiumUntil?: string | null;
}
