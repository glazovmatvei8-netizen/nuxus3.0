"use client"

import React, { useState, useEffect } from 'react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatDisplayName } from '@/lib/utils';
import Image from 'next/image';

interface UserAvatarProps {
  userId: string | null | undefined;
  className?: string;
  fallbackName?: string;
  fallbackClassName?: string;
  manualAvatarUrl?: string | null;
}

/**
 * Умный компонент аватарки, оптимизированный для Lighthouse с использованием next/image.
 */
export function UserAvatar({ userId, className, fallbackName, fallbackClassName, manualAvatarUrl }: UserAvatarProps) {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  
  const userRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile, isLoading } = useDoc(userRef);

  const displayAvatar = profile?.avatarUrl || manualAvatarUrl;
  const displayName = formatDisplayName(profile?.name || fallbackName || '??');

  useEffect(() => {
    setImgError(false);
  }, [displayAvatar, userId]);

  return (
    <Avatar className={cn("shrink-0 relative overflow-hidden", className)}>
      {!isLoading && displayAvatar && !imgError ? (
        <Image 
          key={displayAvatar}
          src={displayAvatar} 
          alt={displayName} 
          fill
          sizes="(max-width: 768px) 100vw, 48px"
          className="object-cover animate-in fade-in duration-300"
          onError={() => setImgError(true)}
          priority={userId === 'currentUser'}
        />
      ) : (
        <AvatarFallback className={cn("bg-primary/20 text-primary font-bold uppercase h-full w-full flex items-center justify-center", fallbackClassName)}>
          {displayName.slice(0, 2)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
