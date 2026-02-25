
"use client"

import React, { useState } from 'react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string | null | undefined;
  className?: string;
  fallbackName?: string;
  fallbackClassName?: string;
}

/**
 * Умный компонент аватарки, который всегда отображает актуальное фото пользователя из Firestore.
 * Оптимизирован для мобильных устройств и обработки ошибок загрузки.
 */
export function UserAvatar({ userId, className, fallbackName, fallbackClassName }: UserAvatarProps) {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  
  const userRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile, isLoading } = useDoc(userRef);

  const displayAvatar = profile?.avatarUrl;
  const displayName = profile?.name || fallbackName || '??';

  return (
    <Avatar className={cn("shrink-0 relative", className)}>
      {/* Используем обычный img для лучшей поддержки тяжелых Base64 на мобильных устройствах */}
      {!isLoading && displayAvatar && !imgError ? (
        <img 
          src={displayAvatar} 
          alt={displayName} 
          className="aspect-square h-full w-full object-cover"
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
