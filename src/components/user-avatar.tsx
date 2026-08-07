
"use client"

import React, { useState, memo, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatDisplayName, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { differenceInMinutes, parseISO } from 'date-fns';
import Image from 'next/image';

/**
 * USER AVATAR V6.5.5 «STABLE RESOLUTION»
 * ИСПРАВЛЕНО: Корректный импорт хуков через Firebase Barrel.
 */
export const UserAvatar = memo(({ userId, className, fallbackName, manualAvatarUrl, showOnlineStatus = false, onClick }: any) => {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  
  const userRef = useMemo(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile } = useDoc<User>(userRef);

  const displayAvatar = useMemo(() => manualAvatarUrl || profile?.avatarUrl || null, [profile, manualAvatarUrl]);
  const premium = useMemo(() => isUserPremium(profile), [profile]);
  const isOnline = useMemo(() => {
    if (!profile?.lastSeen || profile?.settings?.privacy?.isGhostMode) return false;
    try {
      return differenceInMinutes(new Date(), parseISO(profile.lastSeen)) < 2;
    } catch (e) { return false; }
  }, [profile]);

  return (
    <div onClick={onClick} className={cn("relative inline-flex items-center justify-center shrink-0 rounded-full", className)}>
      {premium && (
        <div className="absolute inset-[-3px] rounded-full p-[1.5px] overflow-hidden z-0">
          <div className="absolute inset-[-100%] bg-gradient-to-tr from-primary via-accent to-primary animate-[spin_30s_linear_infinite] opacity-30" />
        </div>
      )}

      <div className={cn("rounded-full p-[1.5px] w-full h-full flex items-center justify-center overflow-hidden relative z-10", premium ? "bg-[#020205]" : "bg-white/10")}>
        <Avatar className="bg-black w-full h-full rounded-full border-none">
          {displayAvatar && !imgError ? (
            <div className="relative w-full h-full">
              <Image src={displayAvatar} alt="Avatar" fill className="object-cover rounded-full" onError={() => setImgError(true)} unoptimized />
            </div>
          ) : (
            <AvatarFallback className="bg-[#050505] text-primary font-black uppercase italic text-[40%]">
              {(fallbackName || profile?.name || 'N').slice(0, 2)}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {showOnlineStatus && isOnline && (
        <div className="absolute top-[8%] right-[8%] z-20 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0c] shadow-[0_0_8px_rgba(34,197,94,1)]" />
      )}
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';
