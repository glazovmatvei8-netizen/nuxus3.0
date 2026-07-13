import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { User } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ОКОНЧАТЕЛЬНЫЙ ФИКС ИМЕН V34.0
 * Максимальный приоритет реальному имени из профиля.
 */
export function formatDisplayName(name: string | undefined | null): string {
  if (!name) return 'Nuxus Agent';
  
  const trimmed = name.trim();
  if (trimmed === '') return 'Nuxus Agent';
  
  const lower = trimmed.toLowerCase();
  
  // Черный список системных заглушек
  const blacklist = ['deleted user', 'null node', 'неизвестный', 'unknown'];
  if (blacklist.includes(lower) || lower.includes('🚫')) {
    return 'Null Node 🚫';
  }

  // Если это не пустая строка и не заглушка - возвращаем как есть
  return trimmed;
}

export function encryptSignal(text: string): string {
  if (!text) return '';
  try {
    const encoded = btoa(encodeURIComponent(text.trim()));
    return `NX_${encoded}`;
  } catch (e) {
    return text;
  }
}

export function decryptSignal(content: string | undefined | null): string {
  if (!content || typeof content !== 'string') return content || '';
  const prefix = content.startsWith('NX_SECURE_') ? 'NX_SECURE_' : content.startsWith('NX_') ? 'NX_' : null;
  if (!prefix) return content;
  try {
    const raw = content.replace(prefix, '');
    return decodeURIComponent(atob(raw));
  } catch (e) {
    return content;
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
  if (!user.isPremium) return false;
  if (user.premiumUntil) {
    try {
      return isAfter(parseISO(user.premiumUntil), new Date());
    } catch (e) {
      return false;
    }
  }
  return true;
}

export function isUserActuallyBanned(user: User | null | undefined): boolean {
  if (!user || !user.isBanned) return false;
  if (user.bannedUntil) {
    try {
      return isAfter(parseISO(user.bannedUntil), new Date());
    } catch (e) {
      return true;
    }
  }
  return true;
}

export function formatLastSeen(
  lastSeenIso: string | undefined | null, 
  visibility: 'everybody' | 'nobody' = 'everybody',
  isDeleted: boolean = false,
  onlineString: string = 'в сети'
): string {
  if (isDeleted || !lastSeenIso) return 'был(а) недавно';
  if (visibility === 'nobody') return 'был(а) недавно';
  try {
    const lastSeen = parseISO(lastSeenIso);
    const now = new Date();
    const diffSeconds = Math.max(0, differenceInSeconds(now, lastSeen));
    if (diffSeconds < 60) return onlineString;
    return `был(а) ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: ru })}`;
  } catch (e) {
    return 'оффлайн';
  }
}

export async function compressImage(dataUrl: string, maxWidth = 1200, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
  });
}
