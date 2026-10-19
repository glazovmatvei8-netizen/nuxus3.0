
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isToday, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { User, PrivacyOption } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ИНТЕЛЛЕКТУАЛЬНЫЙ НОРМАЛИЗАТОР НОМЕРОВ V83.0
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '7' + cleaned.substring(1);
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    cleaned = '7' + cleaned;
  } else if (cleaned.length >= 7 && cleaned.length <= 10 && !cleaned.startsWith('7')) {
    cleaned = '7' + cleaned;
  }
  return cleaned ? `+${cleaned}` : '';
}

/**
 * АБСОЛЮТНЫЙ ИДЕНТИФИКАТОР V74.1
 */
export function formatDisplayName(name: string | undefined | null, username?: string | null): string {
  if (
    name && 
    name.trim() !== '' && 
    name.toLowerCase() !== 'null' && 
    name.toLowerCase() !== 'user' && 
    name.toLowerCase() !== 'undefined' &&
    name !== '??'
  ) {
    return name;
  }
  const cleanUsername = username?.trim();
  if (cleanUsername && cleanUsername !== '' && cleanUsername !== '@' && cleanUsername !== 'null') {
    return cleanUsername;
  }
  return 'Узел Сети';
}

/**
 * ПРОВЕРКА АНОМАЛИЙ V102.0
 */
export function isUserAnomaly(user: User | null | undefined): boolean {
  if (!user) return false;
  const username = (user.username || '').trim().replace('@', '');
  const isMissingUsername = username === '' || username.length < 2;
  return isMissingUsername;
}

export function encryptSignal(text: string): string {
  if (!text) return '';
  try {
    const encoded = btoa(encodeURIComponent(text.trim()));
    return `NX_${encoded}`;
<<<<<<< HEAD
  } catch (e) { return text; }
=======
  } catch (e) {
    console.error("encryptSignal error:", e);
    return text;
  }
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
}

export function decryptSignal(content: string | undefined | null): string {
  if (!content || typeof content !== 'string') return content || '';
  const isEncoded = content.startsWith('NX_SECURE_') || content.startsWith('NX_');
  if (!isEncoded) return content;
  try {
    const prefix = content.startsWith('NX_SECURE_') ? 'NX_SECURE_' : 'NX_';
    const raw = content.replace(prefix, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(raw)) return content;
    return decodeURIComponent(atob(raw));
  } catch (e) { 
<<<<<<< HEAD
=======
    console.error("decryptSignal error:", e);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
    return "Сигнал зашифрован"; 
  }
}

export function isGlobalAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  const PRIME_ADMINS = ['vnctow46', 'GCvLucN8CjNcdaxPO2vmpZ84hNl1'];
  if (PRIME_ADMINS.includes(user.id)) return true;
  return !!user.isAdmin;
}

export function isUserPremium(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isGlobalAdmin(user)) return true;
  return !!user.isPremium;
}

export function isUserActuallyBanned(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.isBanned) return true;
  if (isUserAnomaly(user) && !isGlobalAdmin(user)) return true;
  return false;
}

/**
 * ПРЕЦИЗИОННЫЙ СТАТУС В СЕТИ V128.0
 */
export function formatLastSeen(
  lastSeenIso: string | undefined | null, 
  visibility: PrivacyOption = 'everybody',
  onlineString: string = 'в сети'
): string {
  if (!lastSeenIso || visibility === 'nobody') return 'был(а) недавно';
  try {
    const lastSeenDate = parseISO(lastSeenIso);
    const now = new Date();
    const diffSeconds = Math.max(0, differenceInSeconds(now, lastSeenDate));
    
    if (diffSeconds < 60) return onlineString;

    if (isToday(lastSeenDate)) {
      return `был(а) сегодня в ${format(lastSeenDate, 'HH:mm')}`;
    }
    
    return `был(а) ${format(lastSeenDate, 'd MMM в HH:mm', { locale: ru })}`;
  } catch (e) { 
<<<<<<< HEAD
=======
    console.error("formatLastSeen error:", e);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
    return 'был(а) недавно'; 
  }
}

export async function compressImage(dataUrl: string, maxWidth = 1200, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, width, height); }
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
  });
}

/**
 * REPUTATION SYSTEM V2.0
 */
export function getReputationInfo(reputation: number = 0) {
  const safeRep = typeof reputation === 'number' ? reputation : 0;
  const level = Math.floor(safeRep / 10) + 1;
  const currentExp = Math.floor((safeRep % 10) * 10); 

  if (safeRep >= 100) return { level, name: 'Core Architect', color: 'text-red-500', icon: '💎', shadow: 'shadow-red-500/30', progress: 100 };
  if (safeRep >= 70) return { level, name: 'Legendary Node', color: 'text-orange-500', icon: '👑', shadow: 'shadow-orange-500/20', progress: currentExp };
  if (safeRep >= 45) return { level, name: 'Elite Node', color: 'text-yellow-500', icon: '🌟', shadow: 'shadow-yellow-500/20', progress: currentExp };
  if (safeRep >= 25) return { level, name: 'Trusted Node', color: 'text-purple-500', icon: '🛡️', shadow: 'shadow-purple-500/20', progress: currentExp };
  if (safeRep >= 10) return { level, name: 'Active Node', color: 'text-green-500', icon: '⚡', shadow: 'shadow-green-500/20', progress: currentExp };
  return { level, name: 'New Node', color: 'text-white/40', icon: '🛰️', shadow: 'shadow-white/5', progress: currentExp };
}

export function triggerHaptic() {
  if (typeof window !== 'undefined' && window.navigator?.vibrate) {
    window.navigator.vibrate(20);
  }
}
