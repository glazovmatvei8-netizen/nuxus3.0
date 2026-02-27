
"use client"

import React, { useState, useEffect } from 'react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { User } from '@/lib/types';

interface UserAvatarProps {
  userId: string | null | undefined;
  className?: string;
  fallbackName?: string;
  fallbackClassName?: string;
  manualAvatarUrl?: string | null;
}

/**
 * Умный компонент аватарки с поддержкой Premium-значка.
 */
export function UserAvatar({ userId, className, fallbackName, fallbackClassName, manualAvatarUrl }: UserAvatarProps) {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  
  const userRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile, isLoading } = useDoc<User>(userRef);

  const displayAvatar = profile?.avatarUrl || manualAvatarUrl;
  const displayName = formatDisplayName(profile?.name || fallbackName || '??');
  const premium = isUserPremium(profile);

  useEffect(() => {
    setImgError(false);
  }, [displayAvatar, userId]);

  return (
    <div className="relative inline-block shrink-0">
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
      {premium && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 z-10">
          <div className="bg-gradient-to-tr from-purple-500 to-accent p-0.5 rounded-full shadow-sm">
            <Star className="w-2.5 h-2.5 text-white fill-white" />
          </div>
        </div>
      )}
    </div>
  );
}
