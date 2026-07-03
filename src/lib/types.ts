
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'video_note' | 'service' | 'gift' | 'payment_request' | 'album' | 'poll' | 'broadcast' | 'sticker' | 'music' | 'ai_video';

export interface StickerPack {
  id: string;
  ownerId: string;
  name: string;
  iconUrl: string | null;
  stickerUrls: string[];
  createdAt: string;
  isPublic?: boolean;
}

export interface ReceivedGift {
  id: string;
  senderId: string;
  senderName: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  price: number;
  receivedAt: string;
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
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'gift_purchase';
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
  isPending?: boolean; // NEW: Indicates message is queued locally
  selfDestructAt?: string | null;
  forwardFrom?: string;
  reactions?: Record<string, string[]>; // emoji -> [uids]
  pollData?: {
    question: string;
    options: PollOption[];
    isAnonymous: boolean;
    isMultiple: boolean;
    closedAt?: string;
  };
  metadata?: {
    bubbleStyle?: 'default' | 'neon' | 'gold' | 'ocean';
    aiModel?: string;
    translation?: string;
    [key: string]: any;
  };
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
  participantIds: string[]; // For privacy filtering
  chatId: string;
  type: 'audio' | 'video';
  status: 'calling' | 'active' | 'ended' | 'rejected' | 'missed';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface ArchiveRequest {
  id: string;
  userId: string;
  userName: string;
  status: 'pending' | 'collecting' | 'ready' | 'delivered';
  createdAt: string;
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
  isGhostMode?: boolean;
}

export interface UserSettings {
  theme: string;
  appearance: 'light' | 'dark';
  chatBackground: string;
  chatBackgroundFit?: 'cover' | 'contain';
  customAppIconUrl?: string;
  customPrimaryColor?: string;
  bubbleStyle?: 'default' | 'neon' | 'gold' | 'ocean';
  messageSize: 'small' | 'medium' | 'large';
  privacy: UserPrivacy;
  statusEmoji?: string;
  statusText?: string;
  language?: string;
  stickers?: string[];
  interfaceOverrides?: Record<string, string>;
  biometricEnabled?: boolean;
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
  countryCode?: string;
  balance?: number;
}
