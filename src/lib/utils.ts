import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { User, PrivacyOption } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ИНТЕЛЛЕКТУАЛЬНЫЙ НОРМАЛИЗАТОР НОМЕРОВ V82.0
 * Приводит любой ввод (89xx, 9xx, +7xx) к стандарту E.164.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Удаляем все не-цифры
  let cleaned = phone.replace(/\D/g, '');
  
  // Если начинается с 8 и длина 11 (РФ стандарт)
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '7' + cleaned.substring(1);
  } 
  // Если начинается с 9 и длина 10 (пропущенная семерка)
  else if (cleaned.startsWith('9') && cleaned.length === 10) {
    cleaned = '7' + cleaned;
  }
  // Если просто короткий номер без кода страны, но мы в контексте РФ (опционально)
  
  return cleaned ? `+${cleaned}` : '';
}

/**
 * АБСОЛЮТНЫЙ ИДЕНТИФИКАТОР V74.1
 * Защищенный дешифратор для предотвращения крахов UI.
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

export function isUserAnomaly(user: User | null | undefined): boolean {
  if (!user) return false;
  const name = (user.name || '').trim().toLowerCase();
  const username = (user.username || '').trim().replace('@', '');
  const isDefaultName = name === 'user' || name === '' || name === 'null' || name === '??';
  const isMissingUsername = username === '' || username.length < 2;
  return isDefaultName || isMissingUsername;
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
  
  // Распознаем только наши префиксы
  const isEncoded = content.startsWith('NX_SECURE_') || content.startsWith('NX_');
  if (!isEncoded) return content;

  try {
    const prefix = content.startsWith('NX_SECURE_') ? 'NX_SECURE_' : 'NX_';
    const raw = content.replace(prefix, '');
    // Проверка валидности base64 перед декодированием
    if (!/^[A-Za-z0-9+/=]+$/.test(raw)) return content;
    return decodeURIComponent(atob(raw));
  } catch (e) { 
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

export function formatLastSeen(
  lastSeenIso: string | undefined | null, 
  visibility: PrivacyOption = 'everybody',
  onlineString: string = 'в сети'
): string {
  if (!lastSeenIso || visibility === 'nobody') return 'был(а) недавно';
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

/**
 * РЕПУТАЦИОННЫЙ ЩИТ V78.0
 * Возвращает информацию о щите репутации на основе очков.
 */
export function getReputationInfo(reputation: number = 0) {
  const level = Math.floor(reputation / 10) + 1;
  
  if (reputation >= 60) return { level, color: 'text-red-500', icon: '🛡️', shadow: 'shadow-red-500/20' };
  if (reputation >= 45) return { level, color: 'text-yellow-500', icon: '🛡️', shadow: 'shadow-yellow-500/20' };
  if (reputation >= 30) return { level, color: 'text-purple-500', icon: '🛡️', shadow: 'shadow-purple-500/20' };
  if (reputation >= 20) return { level, color: 'text-green-500', icon: '🛡️', shadow: 'shadow-green-500/20' };
  if (reputation >= 10) return { level, color: 'text-blue-500', icon: '🛡️', shadow: 'shadow-blue-500/20' };
  
  return { level, color: 'text-white/60', icon: '🛡️', shadow: 'shadow-white/10' };
}
