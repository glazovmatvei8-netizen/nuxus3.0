
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { User, PrivacyOption } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * АБСОЛЮТНЫЙ ИДЕНТИФИКАТОР V40.1
 * Приоритет: Реальное имя из базы -> Юзернейм. Без заглушек.
 */
export function formatDisplayName(name: string | undefined | null, username?: string | null): string {
  const cleanName = name?.trim();
  if (cleanName && cleanName !== '' && cleanName.toLowerCase() !== 'null' && cleanName !== 'user' && cleanName !== '??') {
    return cleanName;
  }
  const cleanUsername = username?.trim();
  if (cleanUsername && cleanUsername !== '' && cleanUsername !== '@' && cleanUsername !== 'null') {
    return cleanUsername;
  }
  return 'Узел Сети';
}

export function encryptSignal(text: string): string {
  if (!text) return '';
  try {
    const encoded = btoa(encodeURIComponent(text.trim()));
    return `NX_${encoded}`;
  } catch (e) { return text; }
}

export function decryptSignal(content: string | undefined | null): string {
  if (!content || typeof content !== 'string') return content || '';
  const prefix = content.startsWith('NX_SECURE_') ? 'NX_SECURE_' : content.startsWith('NX_') ? 'NX_' : null;
  if (!prefix) return content;
  try {
    const raw = content.replace(prefix, '');
    return decodeURIComponent(atob(raw));
  } catch (e) { return content; }
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
  if (!user.isPremium) return false;
  if (user.premiumUntil) {
    try { return isAfter(parseISO(user.premiumUntil), new Date()); } 
    catch (e) { return false; }
  }
  return true;
}

export function isUserActuallyBanned(user: User | null | undefined): boolean {
  if (!user || !user.isBanned) return false;
  if (user.bannedUntil) {
    try { return isAfter(parseISO(user.bannedUntil), new Date()); } 
    catch (e) { return true; }
  }
  return true;
}

export function formatLastSeen(
  lastSeenIso: string | undefined | null, 
  visibility: PrivacyOption = 'everybody',
  isDeleted: boolean = false,
  onlineString: string = 'в сети',
  whitelist: string[] = [],
  currentUserId?: string
): string {
  if (isDeleted || !lastSeenIso) return 'был(а) недавно';
  const isExempt = currentUserId && whitelist.includes(currentUserId);
  if (!isExempt && visibility === 'nobody') return 'был(а) недавно';
  try {
    const lastSeen = parseISO(lastSeenIso);
    const diffSeconds = Math.max(0, differenceInSeconds(new Date(), lastSeen));
    if (diffSeconds < 120) return onlineString;
    return `был(а) ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: ru })}`;
  } catch (e) { return 'был(а) недавно'; }
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
