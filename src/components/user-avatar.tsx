
"use client"

import React, { useState, useEffect } from 'react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string | null | undefined;
  className?: string;
  fallbackName?: string;
  fallbackClassName?: string;
  manualAvatarUrl?: string | null;
}

/**
 * Умный компонент аватарки, который всегда отображает актуальное фото пользователя из Firestore.
 * Оптимизирован для мобильных устройств и мгновенного обновления данных.
 */
export function UserAvatar({ userId, className, fallbackName, fallbackClassName, manualAvatarUrl }: UserAvatarProps) {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  
  const userRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile, isLoading } = useDoc(userRef);

  // Приоритет: ручной URL (если уже есть у родителя) > данные из Firestore
  const displayAvatar = manualAvatarUrl !== undefined ? manualAvatarUrl : profile?.avatarUrl;
  const displayName = profile?.name || fallbackName || '??';

  // Сбрасываем ошибку, если URL изменился (например, пользователь загрузил новое фото)
  useEffect(() => {
    setImgError(false);
  }, [displayAvatar, userId]);

  return (
    <Avatar className={cn("shrink-0 relative overflow-hidden", className)}>
      {!isLoading && displayAvatar && !imgError ? (
        <img 
          key={displayAvatar} // Key заставляет React перерисовать img при смене URL
          src={displayAvatar} 
          alt={displayName} 
          className="aspect-square h-full w-full object-cover animate-in fade-in duration-300"
          onError={() => setImgError(true)}
        />
      ) : (
        <AvatarFallback className={cn("bg-primary/20 text-primary font-bold uppercase h-full w-full flex items-center justify-center", fallbackClassName)}>
          {displayName.slice(0, 2)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
