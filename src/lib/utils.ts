
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { User } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует имя пользователя. Если аккаунт помечен как заблокирован (удален), возвращает системную строку.
 */
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
  return name;
}

/**
 * Проверяет наличие премиум-статуса у пользователя.
 */
export function isUserPremium(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Вечный премиум для админа (проверяем все форматы номера)
  const adminPhones = ['+79513332147', '89513332147', '79513332147'];
  const isAdmin = adminPhones.includes(user.phone) || 
                  user.id === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1' ||
                  user.username === '@admin';

  if (isAdmin) return true;
  
  if (!user.isPremium || !user.premiumUntil) return false;
  
  try {
    return new Date(user.premiumUntil) > new Date();
  } catch (e) {
    return false;
  }
}

/**
 * Форматирует статус последней активности пользователя.
 */
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

    // Если прошло меньше минуты - считаем онлайн
    if (diffSeconds < 60) return 'в сети';
    
    return `был(а) ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: ru })}`;
  } catch (e) {
    return 'Был(а) давно';
  }
}
