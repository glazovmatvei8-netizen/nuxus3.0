
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';

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
 * Форматирует статус последней активности пользователя.
 * Для удаленных аккаунтов всегда возвращает "Был(а) давно".
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
