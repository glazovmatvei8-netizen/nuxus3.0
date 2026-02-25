
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO, differenceInMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует статус последней активности пользователя в стиле Telegram.
 */
export function formatLastSeen(lastSeenIso: string | undefined): string {
  if (!lastSeenIso) return 'был(а) давно';
  
  const lastSeen = parseISO(lastSeenIso);
  const now = new Date();
  const diffMinutes = differenceInMinutes(now, lastSeen);

  if (diffMinutes < 1) return 'в сети';
  if (diffMinutes < 5) return 'был(а) только что';
  
  return `был(а) ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: ru })}`;
}
