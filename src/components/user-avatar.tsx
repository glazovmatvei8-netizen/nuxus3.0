
"use client"

import React from 'react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string | null | undefined;
  className?: string;
  fallbackName?: string;
  fallbackClassName?: string;
}

/**
 * Умный компонент аватарки, который всегда отображает актуальное фото пользователя из Firestore.
 */
export function UserAvatar({ userId, className, fallbackName, fallbackClassName }: UserAvatarProps) {
  const db = useFirestore();
  
  const userRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile } = useDoc(userRef);

  const displayAvatar = profile?.avatarUrl;
  const displayName = profile?.name || fallbackName || '??';

  return (
    <Avatar className={cn("shrink-0", className)}>
      <AvatarImage src={displayAvatar || ''} alt={displayName} className="object-cover" />
      <AvatarFallback className={cn("bg-primary/20 text-primary font-bold uppercase", fallbackClassName)}>
        {displayName.slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  );
}
