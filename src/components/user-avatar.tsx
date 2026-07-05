"use client"

import React, { useState, memo, useMemo } from 'react';
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
 * USER AVATAR V26.9.0
 * ОПТИМИЗИРОВАНО: Исправлен порядок наложения и LCP производительность.
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
      {/* ПРЕМИАЛЬНАЯ АНИМИРОВАННАЯ ПОДЛОЖКА (Z-Index: 0) */}
      {premium && (
        <div className="absolute inset-0 rounded-full p-[1px] overflow-hidden z-0">
          <div className="absolute inset-[-100%] bg-gradient-to-tr from-primary via-accent to-primary animate-[spin_8s_linear_infinite] will-change-transform opacity-100" />
        </div>
      )}

      {/* ОСНОВНОЙ КОНТЕЙНЕР АВАТАРА (Z-Index: 10) */}
      <div className={cn(
        "rounded-full p-[2px] w-full h-full flex items-center justify-center overflow-hidden transition-all duration-1000 relative z-10 bg-[#020205]",
        !premium && "bg-white/10"
      )}>
        <Avatar className="shrink-0 relative overflow-hidden bg-black w-full h-full rounded-full border-none flex items-center justify-center shadow-inner">
          {displayAvatar && !imgError && activeId === userId ? (
            <div className="relative w-full h-full rounded-full overflow-hidden">
              <Image 
                src={displayAvatar} 
                alt={initialsSource} 
                fill
                sizes="(max-width: 768px) 64px, 128px"
                className="object-cover rounded-full"
                onError={() => setImgError(true)}
                unoptimized={displayAvatar.startsWith('data:')}
                priority={userId === 'bot_nuxus_manager' || premium}
              />
            </div>
          ) : (
            <AvatarFallback className={cn("bg-[#050505] text-primary font-black uppercase h-full w-full flex items-center justify-center rounded-full select-none italic tracking-tighter text-[40%]", fallbackClassName)}>
              {initialsSource.slice(0, 2)}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {showOnlineStatus && isOnline && !isGhost && (
        <div className="absolute top-[8%] right-[8%] z-20">
          <div className="h-3 w-3 bg-green-500 rounded-full border-[2px] border-[#0a0a0c] shadow-[0_0_10px_rgba(34,197,94,1)] animate-pulse" />
        </div>
      )}

      {premium && (
        <div className="absolute -bottom-[5%] -right-[5%] z-30 transform hover:scale-110 transition-transform w-[35%] h-[35%] max-w-[32px] max-h-[32px]">
          <div className="bg-[#020205] rounded-full p-[1px] shadow-lg border border-white/20 w-full h-full">
            <div className="bg-gradient-to-tr from-yellow-300 to-orange-500 p-[15%] rounded-full shadow-inner flex items-center justify-center w-full h-full">
               <Star className="w-[85%] h-[85%] text-black fill-current" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';
