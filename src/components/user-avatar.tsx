
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
 * Nuxus Avatar Core v4.6
 * ОПТИМИЗИРОВАНО: Удалены "квадратики" за счет принудительного rounded-full на корне.
 */
export const UserAvatar = memo(({ userId, className, fallbackName, fallbackClassName, manualAvatarUrl, showOnlineStatus = false }: UserAvatarProps) => {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  
  const userRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile } = useDoc<User>(userRef);

  const displayAvatar = useMemo(() => manualAvatarUrl || profile?.avatarUrl, [profile?.avatarUrl, manualAvatarUrl]);
  
  const initialsSource = useMemo(() => {
    const rawName = profile?.name || fallbackName;
    if (rawName && rawName !== 'Пользователь' && rawName !== '??') return rawName;
    if (profile?.username) return profile.username.replace('@', '');
    return 'N'; 
  }, [profile?.name, fallbackName, profile?.username]);

  const displayName = useMemo(() => formatDisplayName(initialsSource), [initialsSource]);

  const premium = useMemo(() => isUserPremium(profile), [profile]);
  const isGhost = useMemo(() => !!profile?.settings?.privacy?.isGhostMode, [profile]);

  const isOnline = useMemo(() => {
    if (!profile?.lastSeen || isGhost) return false;
    try {
      const lastSeen = parseISO(profile.lastSeen);
      return differenceInMinutes(new Date(), lastSeen) < 2;
    } catch (e) {
      return false;
    }
  }, [profile?.lastSeen, isGhost]);

  useEffect(() => {
    setImgError(false);
  }, [displayAvatar, userId]);

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 will-change-transform rounded-full", className)}>
      <div className={cn(
        "rounded-full p-[2px] transition-all w-full h-full flex items-center justify-center overflow-hidden",
        premium ? "bg-gradient-to-tr from-primary via-accent to-primary animate-[spin_4s_linear_infinite] shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-transparent"
      )}>
        <Avatar className={cn("shrink-0 relative overflow-hidden bg-background w-full h-full rounded-full", !premium && "border-none")}>
          {displayAvatar && !imgError ? (
            <Image 
              src={displayAvatar} 
              alt={displayName} 
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover animate-in fade-in duration-300 rounded-full"
              onError={() => setImgError(true)}
              unoptimized={displayAvatar.startsWith('data:')}
            />
          ) : (
            <AvatarFallback className={cn("bg-primary/20 text-primary font-black uppercase h-full w-full flex items-center justify-center rounded-full leading-none", fallbackClassName)}>
              <span className="translate-y-[0.5px]">{initialsSource.slice(0, 2)}</span>
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {showOnlineStatus && isOnline && !isGhost && (
        <div className="absolute top-0 right-0 z-20 translate-x-[10%] translate-y-[10%]">
          <div className="h-3 w-3 bg-[#A855F7] rounded-full border-2 border-[#0a0a0c] shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
        </div>
      )}

      {premium && (
        <div className="absolute bottom-0 right-0 z-30 translate-x-[15%] translate-y-[15%]">
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
