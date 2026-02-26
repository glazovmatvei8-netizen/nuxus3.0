
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует статус последней активности пользователя в стиле Telegram.
 * Учитывает настройки конфиденциальности.
 */
export function formatLastSeen(lastSeenIso: string | undefined, visibility: 'everybody' | 'nobody' = 'everybody'): string {
  if (visibility === 'nobody') return 'был(а) недавно';
  if (!lastSeenIso) return 'был(а) недавно';
  
  try {
    const lastSeen = parseISO(lastSeenIso);
    const now = new Date();
    const diffSeconds = Math.max(0, differenceInSeconds(now, lastSeen));

    if (diffSeconds < 30) return 'в сети';
    if (diffSeconds < 60) return 'был(а) только что';
    
    return `был(а) ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: ru })}`;
  } catch (e) {
    return 'был(а) недавно';
  }
}
