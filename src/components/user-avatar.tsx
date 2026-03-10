
"use client"

import React, { useState, useEffect, memo, useMemo } from 'react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { User } from '@/lib/types';
import { differenceInMinutes, parseISO } from 'date-fns';

interface UserAvatarProps {
  userId: string | null | undefined;
  className?: string;
  fallbackName?: string;
  fallbackClassName?: string;
  manualAvatarUrl?: string | null;
  showOnlineStatus?: boolean;
}

/**
 * Smart Avatar component optimized for iOS Safari.
 * Uses standard img tag for Base64 compatibility.
 */
export const UserAvatar = memo(({ userId, className, fallbackName, fallbackClassName, manualAvatarUrl, showOnlineStatus = false }: UserAvatarProps) => {
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

  const isOnline = useMemo(() => {
    if (!profile?.lastSeen) return false;
    try {
      const lastSeen = parseISO(profile.lastSeen);
      return differenceInMinutes(new Date(), lastSeen) < 2;
    } catch (e) {
      return false;
    }
  }, [profile?.lastSeen]);

  useEffect(() => {
    setImgError(false);
  }, [displayAvatar, userId]);

  return (
    <div className="relative inline-block shrink-0 will-change-transform">
      <Avatar className={cn("shrink-0 relative overflow-hidden", className)}>
        {!isLoading && displayAvatar && !imgError ? (
          /* Standard img is more reliable for heavy Base64 on iOS */
          <img 
            src={displayAvatar} 
            alt={displayName} 
            className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-300"
            onError={() => setImgError(true)}
            decoding="async"
            loading="lazy"
          />
        ) : (
          <AvatarFallback className={cn("bg-primary/20 text-primary font-bold uppercase h-full w-full flex items-center justify-center", fallbackClassName)}>
            {initialsSource.slice(0, 2)}
          </AvatarFallback>
        )}
      </Avatar>

      {/* Online Status Dot */}
      {showOnlineStatus && isOnline && (
        <div className="absolute top-0 right-0 z-20 translate-x-[10%] translate-y-[10%]">
          <div className="h-3 w-3 bg-[#22C55E] rounded-full border-2 border-[#0a0a0c] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
        </div>
      )}

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
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';
