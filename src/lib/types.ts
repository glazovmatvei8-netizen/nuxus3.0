
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'video_note' | 'service' | 'gift' | 'payment_request' | 'album' | 'poll' | 'broadcast' | 'sticker' | 'music';

export interface BotButton {
  text: string;
  payload?: string;
  color?: 'default' | 'primary' | 'destructive' | 'success';
}

export interface BotKeyboard {
  rows: BotButton[][];
  oneTime?: boolean;
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
  isNft?: boolean;
}

export interface TopUpRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Appeal {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  adminComment?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; 
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
  isPending?: boolean;
  selfDestructAt?: string | null;
  forwardFrom?: string;
  reactions?: Record<string, string[]>;
  keyboard?: BotKeyboard;
  pollData?: {
    question: string;
    options: PollOption[];
    isAnonymous: boolean;
    isMultiple: boolean;
    closedAt?: string;
  };
  metadata?: {
    bubbleStyle?: 'default' | 'neon' | 'gold' | 'ocean';
    senderTitle?: string;
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
  reactions?: Record<string, string[]>;
}

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  participantIds: string[]; 
  chatId: string;
  type: 'audio' | 'video';
  status: 'calling' | 'active' | 'ended' | 'rejected' | 'missed';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  offer?: {
    sdp?: string;
    type?: string;
  };
  answer?: {
    sdp?: string;
    type?: string;
  };
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
  metadata?: Record<string, {
    name: string;
    username: string;
    avatarUrl: string | null;
    isPremium?: boolean;
    customTitle?: string;
    nameColor?: string;
  }>;
}

export type PrivacyOption = 'everybody' | 'contacts' | 'premium' | 'nobody';

export interface UserPrivacy {
  phoneVisibility: PrivacyOption;
  lastSeenVisibility: PrivacyOption;
  allowGroupsFrom: PrivacyOption;
  isGhostMode?: boolean;
  isEnergySaving?: boolean;
}

export interface UserSettings {
  theme: string;
  appearance: 'light' | 'dark';
  chatBackground?: string;
  customAppIconUrl?: string;
  customPrimaryColor?: string;
  bubbleStyle?: 'default' | 'neon' | 'gold' | 'ocean';
  fontFamily?: 'jakarta' | 'inter' | 'system';
  messageSize: 'small' | 'medium' | 'large';
  messageRadius?: number;
  nameColor?: string;
  privacy: UserPrivacy;
  statusText?: string;
  language?: string;
}

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  name: string;
  username: string;
  usernameLowercase?: string;
  bio?: string;
  birthday?: string;
  avatarUrl: string | null;
  lastSeen?: string;
  createdAt: string;
  settings?: UserSettings;
  contactIds?: string[]; 
  isBanned?: boolean;
  isPremium?: boolean;
  isAdmin?: boolean;
  reputation?: number;
  twoFactorEnabled?: boolean;
  twoFactorPin?: string;
  twoFactorPinLength?: '4' | '6';
  balance?: number;
}
