
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { User } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDisplayName(name: string | undefined | null): string {
  if (!name) return 'Пользователь';
  const lower = name.toLowerCase();
  
  if (
    lower.includes('удаленный') || 
    lower.includes('удалённый') || 
    lower.includes('@deleted') || 
    lower.includes('🚫') ||
    lower === 'deleted user'
  ) {
    return 'Удалённый Аккаунт🚫';
  }

  if (lower === 'user' || lower === 'пользователь') {
    return 'Nuxus User';
  }

  return name;
}

/**
 * Квантовое шифрование сигнала Nuxus (QES)
 * Шифрует текст перед отправкой в Ядро.
 */
export function encryptSignal(text: string): string {
  if (!text) return '';
  try {
    const encoded = btoa(encodeURIComponent(text));
    return `NX_${encoded}`;
  } catch (e) {
    return text;
  }
}

/**
 * Дешифровка сигнала Nuxus
 * Доступна участникам и Prime-администраторам.
 */
export function decryptSignal(content: string): string {
  if (!content || !content.startsWith('NX_')) return content;
  try {
    const raw = content.replace('NX_', '');
    return decodeURIComponent(atob(raw));
  } catch (e) {
    return '[Сигнал зашифрован]';
  }
}

export function isGlobalAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  const PRIME_ADMINS = [
    'vnctow46',
    'GCvLucN8CjNcdaxPO2vmpZ84hNl1'
  ];
  if (PRIME_ADMINS.includes(user.id)) return true;
  const adminPhones = ['79997457325', '79513332147', '79508784513'];
  const cleanPhone = user.phone?.replace(/\D/g, '');
  if (adminPhones.some(p => cleanPhone?.includes(p))) return true;
  return !!user.isAdmin;
}

export function isUserPremium(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isGlobalAdmin(user)) return true;
  if (!user.isPremium || !user.premiumUntil) return false;
  try {
    return new Date(user.premiumUntil) > new Date();
  } catch (e) {
    return false;
  }
}

export function isUserActuallyBanned(user: User | null | undefined): boolean {
  if (!user || !user.isBanned) return false;
  if (user.bannedUntil) {
    try {
      const expiry = new Date(user.bannedUntil);
      return expiry > new Date();
    } catch (e) {
      return true;
    }
  }
  return true;
}

export function formatLastSeen(
  lastSeenIso: string | undefined | null, 
  visibility: 'everybody' | 'nobody' = 'everybody',
  isDeleted: boolean = false
): string {
  if (isDeleted || !lastSeenIso) return 'Был(а) давно';
  if (visibility === 'nobody') return 'был(а) недавно';
  try {
    const lastSeen = parseISO(lastSeenIso);
    const now = new Date();
    const diffSeconds = Math.max(0, differenceInSeconds(now, lastSeen));
    if (diffSeconds < 60) return 'в сети';
    return `был(а) ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: ru })}`;
  } catch (e) {
    return 'Был(а) давно';
  }
}

/**
 * Super Aggressive compression for ultra-fast transfers and iOS stability.
 */
export async function compressImage(dataUrl: string, maxWidth = 600, quality = 0.3): Promise<string> {
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
