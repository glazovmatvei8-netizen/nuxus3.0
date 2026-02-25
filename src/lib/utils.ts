import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует статус последней активности пользователя в стиле Telegram.
 */
export function formatLastSeen(lastSeenIso: string | undefined): string {
  if (!lastSeenIso) return 'был(а) недавно';
  
  try {
    const lastSeen = parseISO(lastSeenIso);
    const now = new Date();
    
    // Используем разницу в секундах для максимальной точности
    const diffSeconds = Math.abs(differenceInSeconds(now, lastSeen));

    if (diffSeconds < 60) return 'в сети';
    if (diffSeconds < 300) return 'был(а) только что';
    
    return `был(а) ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: ru })}`;
  } catch (e) {
    return 'был(а) недавно';
  }
}
