
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'video_note' | 'service' | 'gift' | 'payment_request' | 'album' | 'poll' | 'broadcast' | 'sticker' | 'music';

export interface StickerPack {
  id: string;
  ownerId: string;
  name: string;
  iconUrl: string | null;
  stickerUrls: string[];
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of UIDs
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  coverUrl: string;
  duration: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
  status: 'completed' | 'pending' | 'failed';
  otherPartyId?: string;
  otherPartyName?: string;
  createdAt: string;
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
  isSilent?: boolean;
  selfDestructAt?: string;
  forwardFrom?: string;
  reactions?: Record<string, string[]>; // emoji -> [uids]
  pollData?: {
    question: string;
    options: PollOption[];
    isAnonymous: boolean;
    isMultiple: boolean;
    closedAt?: string;
  };
  metadata?: any;
}

export interface Story {
  id: string;
  userId: string;
  content: string;
  contentType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewers: string[];
  reactions?: Record<string, string[]>; // emoji -> [uids]
}

export interface Call {
  id: string;
  callerId: string;
  callerName?: string;
  receiverId: string;
  chatId: string;
  type: 'audio' | 'video';
  status: 'calling' | 'active' | 'ended' | 'rejected' | 'missed';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
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
  lastMessageAt?: string;
  ownerId: string;
  pinnedMessageId?: string | null;
  typing?: Record<string, boolean>;
  isPublic?: boolean;
  isArchived?: boolean;
  isManualUnread?: boolean;
  mutedUntil?: string | null;
  slowModeSeconds?: number;
  metadata?: Record<string, {
    name: string;
    username: string;
    avatarUrl: string | null;
    isPremium?: boolean;
    statusEmoji?: string;
    mutedUntil?: string | null;
  }>;
}

export interface UserPrivacy {
  phoneVisibility: 'everybody' | 'contacts' | 'nobody';
  lastSeenVisibility: 'everybody' | 'nobody';
  allowGroupsFrom: 'everybody' | 'contacts' | 'premium' | 'nobody';
  whoCanMessageMe: 'everybody' | 'premium';
}

export interface UserSettings {
  theme: 'default' | 'ocean' | 'midnight' | 'rainbow' | 'gold' | 'emerald';
  chatBackground: string;
  chatBackgroundFit?: 'cover' | 'contain';
  customAppIconUrl?: string;
  messageSize: 'small' | 'medium' | 'large';
  privacy: UserPrivacy;
  notifications?: {
    messages: boolean;
    groups: boolean;
    channels: boolean;
    previews: boolean;
  };
  navVisibility?: {
    contacts: boolean;
    calls: boolean;
    archive: boolean;
  };
  statusEmoji?: string;
  statusText?: string;
  language?: string;
  stickers?: string[];
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
  settings?: UserSettings;
  blockedUserIds?: string[];
  pinnedChatIds?: string[];
  contactIds?: string[]; 
  isBanned?: boolean;
  bannedUntil?: string | null;
  isPremium?: boolean;
  isAdmin?: boolean;
  premiumUntil?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorPin?: string;
  statusEmoji?: string;
  statusText?: string;
  referralCount?: number;
  invitedBy?: string;
  installedStickerPackIds?: string[];
  lastIp?: string;
  balance?: number;
}
