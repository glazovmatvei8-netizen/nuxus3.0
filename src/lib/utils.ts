
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { User } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует имя пользователя.
 * Если имя стандартное или отсутствует, возвращает 'Nuxus User'
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

  if (lower === 'user' || lower === 'пользователь') {
    return 'Nuxus User';
  }

  return name;
}

/**
 * Проверяет наличие глобальных административных прав.
 */
export function isGlobalAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Мастер-UID системы
  const PRIME_UID = 'vnctow46';
  
  if (user.id === PRIME_UID) return true;
  
  // Доступ по номерам админа
  const adminPhones = ['79997457325', '79513332147', '79508784513'];
  const cleanPhone = user.phone?.replace(/\D/g, '');
  
  if (adminPhones.some(p => cleanPhone?.includes(p))) return true;
  
  return !!user.isAdmin;
}

/**
 * Проверяет наличие премиум-статуса у пользователя.
 */
export function isUserPremium(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Админы всегда имеют премиум
  if (isGlobalAdmin(user)) return true;
  
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

    if (diffSeconds < 60) return 'в сети';
    
    return `был(а) ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: ru })}`;
  } catch (e) {
    return 'Был(а) давно';
  }
}
