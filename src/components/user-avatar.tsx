
"use client"

import React, { useState, useEffect, memo, useMemo } from 'react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { User } from '@/lib/types';
import { differenceInMinutes, parseISO } from 'date-fns';
import Image from 'next/image';

interface UserAvatarProps {
  userId: string | null | undefined;
  className?: string;
  fallbackName?: string;
  fallbackClassName?: string;
  manualAvatarUrl?: string | null;
  showOnlineStatus?: boolean;
}

/**
 * Nuxus Avatar Core V13.5 «Diamond Shield»
 * УСИЛЕНИЕ: Огромная звезда Premium в углу аватара, подчеркивающая статус.
 */
export const UserAvatar = memo(({ userId, className, fallbackName, fallbackClassName, manualAvatarUrl, showOnlineStatus = false }: UserAvatarProps) => {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  
  const [activeId, setActiveId] = useState<string | null | undefined>(userId);
  if (userId !== activeId) {
    setActiveId(userId);
    setImgError(false);
  }

  const userRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile, isLoading } = useDoc<User>(userRef);

  const displayAvatar = useMemo(() => {
    if (manualAvatarUrl) return manualAvatarUrl;
    if (isLoading || !profile || userId !== profile.id) return null;
    return profile.avatarUrl || null;
  }, [profile, manualAvatarUrl, isLoading, userId]);
  
  const initialsSource = useMemo(() => {
    if (userId === 'bot_nuxus_manager') return 'NM';
    if (userId === 'bot_stickers') return 'SB';
    const rawName = profile?.name || fallbackName;
    if (rawName && !['User', 'Пользователь', '??'].includes(rawName)) return rawName;
    if (profile?.username) return profile.username.replace('@', '');
    return 'N'; 
  }, [profile, fallbackName, userId]);

  const displayName = useMemo(() => formatDisplayName(initialsSource), [initialsSource]);
  const premium = useMemo(() => isUserPremium(profile), [profile]);
  const isGhost = useMemo(() => !!profile?.settings?.privacy?.isGhostMode, [profile]);

  const isOnline = useMemo(() => {
    if (!profile?.lastSeen || isGhost) return false;
    try {
      const lastSeen = parseISO(profile.lastSeen);
      return differenceInMinutes(new Date(), lastSeen) < 2;
    } catch (e) { return false; }
  }, [profile?.lastSeen, isGhost]);

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 rounded-full", className)}>
      <div className={cn(
        "rounded-full p-[2px] w-full h-full flex items-center justify-center overflow-hidden transition-all duration-1000",
        premium ? "bg-gradient-to-tr from-primary via-accent to-primary animate-[spin_8s_linear_infinite] shadow-[0_0_30px_rgba(168,85,247,0.4)]" : "bg-white/10"
      )}>
        <Avatar className="shrink-0 relative overflow-hidden bg-black/60 w-full h-full rounded-full border-none flex items-center justify-center shadow-inner">
          {displayAvatar && !imgError && activeId === userId ? (
            <div className="relative w-full h-full rounded-full overflow-hidden">
              <Image 
                src={displayAvatar} 
                alt={displayName} 
                fill
                sizes="128px"
                className="object-cover animate-in fade-in duration-700 rounded-full"
                onError={() => setImgError(true)}
                unoptimized={displayAvatar.startsWith('data:')}
              />
            </div>
          ) : (
            <AvatarFallback className={cn("bg-[#1c1c1e] text-primary font-black uppercase h-full w-full flex items-center justify-center rounded-full select-none italic tracking-tighter text-[40%]", fallbackClassName)}>
              {initialsSource.slice(0, 2)}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {showOnlineStatus && isOnline && !isGhost && (
        <div className="absolute top-[8%] right-[8%] z-20">
          <div className="h-3 w-3 bg-green-500 rounded-full border-[2.5px] border-[#0a0a0c] shadow-[0_0_15px_rgba(34,197,94,1)] animate-pulse" />
        </div>
      )}

      {premium && (
        <div className="absolute -bottom-1 -right-1 z-30 scale-125 transform hover:rotate-12 transition-transform cursor-help">
          <div className="bg-[#020205] rounded-full p-[1px] shadow-2xl">
            <div className="bg-gradient-to-tr from-yellow-300 via-orange-500 to-yellow-600 p-[3px] rounded-full shadow-inner border border-white/30">
              <Star className="w-4 h-4 text-black fill-current drop-shadow-md" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';
