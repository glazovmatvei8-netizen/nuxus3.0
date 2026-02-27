
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует имя пользователя. Если аккаунт помечен как удаленный, добавляет эмодзи.
 */
export function formatDisplayName(name: string | undefined | null): string {
  if (!name) return 'Пользователь';
  const lower = name.toLowerCase();
  if (lower.includes('удаленный аккаунт') || lower.includes('удалённый аккаунт')) {
    return 'Удалённый Аккаунт🚫';
  }
  return name;
}

/**
 * Форматирует статус последней активности пользователя в стиле Telegram.
 * Учитывает настройки конфиденциальности.
 */
export function formatLastSeen(lastSeenIso: string | undefined | null, visibility: 'everybody' | 'nobody' = 'everybody'): string {
  if (!lastSeenIso) return 'Был(а) давно';
  if (visibility === 'nobody') return 'был(а) недавно';
  
  try {
    const lastSeen = parseISO(lastSeenIso);
    const now = new Date();
    const diffSeconds = Math.max(0, differenceInSeconds(now, lastSeen));

    if (diffSeconds < 30) return 'в сети';
    if (diffSeconds < 60) return 'был(а) только что';
    
    return `был(а) ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: ru })}`;
  } catch (e) {
    return 'Был(а) давно';
  }
}
