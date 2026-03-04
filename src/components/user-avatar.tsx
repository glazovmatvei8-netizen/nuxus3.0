
"use client"

import React, { useState, useEffect, memo, useMemo } from 'react';
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
 * Smart Avatar component with memoization for maximum performance.
 * Now handles both Premium and Status Emoji badges.
 */
export const UserAvatar = memo(({ userId, className, fallbackName, fallbackClassName, manualAvatarUrl }: UserAvatarProps) => {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  
  const userRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile, isLoading } = useDoc<User>(userRef);

  const displayAvatar = useMemo(() => profile?.avatarUrl || manualAvatarUrl, [profile?.avatarUrl, manualAvatarUrl]);
  const displayName = useMemo(() => formatDisplayName(profile?.name || fallbackName || '??'), [profile?.name, fallbackName]);
  
  const initialsSource = useMemo(() => {
    const rawName = profile?.name || fallbackName || '??';
    return (rawName.toLowerCase() === 'user' || rawName === '??') && profile?.username
      ? profile.username.replace('@', '')
      : displayName;
  }, [profile?.name, fallbackName, profile?.username, displayName]);

  const premium = useMemo(() => isUserPremium(profile), [profile]);

  useEffect(() => {
    setImgError(false);
  }, [displayAvatar, userId]);

  return (
    <div className="relative inline-block shrink-0 will-change-transform">
      <Avatar className={cn("shrink-0 relative overflow-hidden", className)}>
        {!isLoading && displayAvatar && !imgError ? (
          <Image 
            key={displayAvatar}
            src={displayAvatar} 
            alt={displayName} 
            fill
            sizes="128px"
            className="object-cover animate-in fade-in duration-300"
            onError={() => setImgError(true)}
            priority={false}
          />
        ) : (
          <AvatarFallback className={cn("bg-primary/20 text-primary font-bold uppercase h-full w-full flex items-center justify-center", fallbackClassName)}>
            {initialsSource.slice(0, 2)}
          </AvatarFallback>
        )}
      </Avatar>

      {/* Premium Badge (Bottom Right) */}
      {premium && (
        <div className="absolute bottom-0 right-0 z-10 translate-x-[15%] translate-y-[15%]">
          <div className="bg-[#0a0a0c] rounded-full p-[1.5px] shadow-sm">
            <div className="bg-gradient-to-tr from-purple-500 to-accent p-[1.5px] rounded-full shadow-lg border border-white/20">
              <Star className="w-2.5 h-2.5 text-white fill-white" />
            </div>
          </div>
        </div>
      )}

      {/* Status Emoji (Bottom Left) - Minimalist Circular Design */}
      {profile?.statusEmoji && (
        <div className="absolute bottom-0 left-0 z-10 -translate-x-[10%] translate-y-[10%]">
          <div className="bg-[#1c1c1e] w-[18px] h-[18px] rounded-full flex items-center justify-center border border-white/10 shadow-xl">
            <span className="text-[10px] leading-none select-none">{profile.statusEmoji}</span>
          </div>
        </div>
      )}
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';
