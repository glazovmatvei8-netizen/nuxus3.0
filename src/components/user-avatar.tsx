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
 * Nuxus Avatar Core v6.0
 * ОПТИМИЗИРОВАНО: Полное удаление "квадратов" и "фантомных" аватарок.
 * Принудительное скругление всех слоев контейнера.
 */
export const UserAvatar = memo(({ userId, className, fallbackName, fallbackClassName, manualAvatarUrl, showOnlineStatus = false }: UserAvatarProps) => {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  
  const userRef = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile, isLoading } = useDoc<User>(userRef);

  // Reset error when user changes to avoid showing fallback for new user with good image
  useEffect(() => {
    setImgError(false);
  }, [userId, manualAvatarUrl]);

  const displayAvatar = useMemo(() => {
    if (manualAvatarUrl) return manualAvatarUrl;
    if (isLoading) return null; // Prevent ghost flicker
    return profile?.avatarUrl || null;
  }, [profile?.avatarUrl, manualAvatarUrl, isLoading]);
  
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

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden", className)}>
      {/* Premium Gradient Ring */}
      <div className={cn(
        "rounded-full p-[2.5px] transition-all w-full h-full flex items-center justify-center overflow-hidden",
        premium ? "bg-gradient-to-tr from-primary via-accent to-primary animate-[spin_4s_linear_infinite] shadow-[0_0_20px_rgba(168,85,247,0.4)]" : "bg-transparent"
      )}>
        <Avatar className={cn("shrink-0 relative overflow-hidden bg-muted/20 w-full h-full rounded-full border-none flex items-center justify-center")}>
          {displayAvatar && !imgError ? (
            <div className="relative w-full h-full rounded-full overflow-hidden">
              <Image 
                src={displayAvatar} 
                alt={displayName} 
                fill
                sizes="(max-width: 768px) 100px, 200px"
                className="object-cover animate-in fade-in duration-500 rounded-full"
                onError={() => setImgError(true)}
                unoptimized={displayAvatar.startsWith('data:')}
              />
            </div>
          ) : (
            <AvatarFallback className={cn("bg-primary/10 text-primary font-black uppercase h-full w-full flex items-center justify-center rounded-full leading-none select-none", fallbackClassName)}>
              <span className="translate-y-[0.5px] text-center">{initialsSource.slice(0, 2)}</span>
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {showOnlineStatus && isOnline && !isGhost && (
        <div className="absolute top-[8%] right-[8%] z-20">
          <div className="h-3 w-3 bg-[#A855F7] rounded-full border-2 border-[#0a0a0c] shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
        </div>
      )}

      {premium && (
        <div className="absolute bottom-0 right-0 z-30 translate-x-[5%] translate-y-[5%]">
          <div className="bg-[#0a0a0c] rounded-full p-[1.5px] shadow-lg">
            <div className="bg-gradient-to-tr from-purple-500 to-accent p-[2px] rounded-full shadow-inner border border-white/10">
              <Star className="w-2.5 h-2.5 text-white fill-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';
