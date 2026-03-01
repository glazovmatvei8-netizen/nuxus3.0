
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'service' | 'gift' | 'payment_request' | 'album' | 'poll';

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of UIDs
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
  giftMessage?: string;
  giftValue?: number;
  giftType?: string;
  isNFT?: boolean;
  serialNumber?: number;
  forwardFrom?: string;
  translation?: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  expiresInSeconds?: number | null;
  isOneTimeView?: boolean;
  isExpired?: boolean;
  isMentionAll?: boolean;
  pollData?: {
    question: string;
    options: PollOption[];
    isAnonymous: boolean;
    isMultiple: boolean;
    closedAt?: string;
  };
  paymentData?: {
    type: 'premium';
    itemName: string;
    targetUserId: string;
    targetUserName: string;
    targetUserUsername: string;
    amount?: number;
    unit?: 'months' | 'years';
    price: number;
    status: 'pending' | 'confirmed' | 'rejected';
  };
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

export interface ReceivedGift {
  id: string;
  giftType: string;
  senderName: string;
  senderId: string;
  receivedAt: string;
  message?: string;
  value?: number;
  isNFT?: boolean;
  serialNumber?: number;
  isSold?: boolean;
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
  allowGroupsFrom: 'everybody' | 'contacts' | 'premium' | 'nobody';
  whoCanMessageMe: 'everybody' | 'premium';
}

export interface UserSettings {
  theme: 'default' | 'ocean' | 'midnight';
  chatBackground: string;
  messageSize: 'small' | 'medium' | 'large';
  privacy: UserPrivacy;
  statusEmoji?: string;
  statusText?: string;
  language?: string;
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
  contactIds?: string[]; // Array of UIDs
  isBanned?: boolean;
  isPremium?: boolean;
  isAdmin?: boolean;
  premiumUntil?: string | null;
  isArchived?: string[]; // array of chatIds
  referralCount?: number;
  invitedBy?: string;
}
