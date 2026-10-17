
"use client"

import React, { useState, memo, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, isUserPremium } from '@/lib/utils';
import type { User } from '@/lib/types';
import { differenceInMinutes, parseISO } from 'date-fns';
import Image from 'next/image';

/**
 * USER AVATAR V129.0 «FINAL AUDIT»
 * FIXED: Larger fallback letters, hydration stability.
 */
export const UserAvatar = memo(({ userId, className, fallbackName, manualAvatarUrl, showOnlineStatus = false, onClick }: any) => {
  const db = useFirestore();
  const [imgError, setImgError] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const userRef = useMemo(() => {
    if (!db || !userId) return null;
    return doc(db, 'users', userId);
  }, [db, userId]);

  const { data: profile } = useDoc<User>(userRef);

  const displayAvatar = useMemo(() => manualAvatarUrl || profile?.avatarUrl || null, [profile, manualAvatarUrl]);
  const premium = useMemo(() => isUserPremium(profile), [profile]);
  
  const isOnline = useMemo(() => {
    if (!mounted || !profile?.lastSeen || profile?.settings?.privacy?.isGhostMode) return false;
    try {
      return differenceInMinutes(new Date(), parseISO(profile.lastSeen)) < 2;
    } catch (e) {
      console.error("Error parsing lastSeen in user avatar:", e);
      return false;
    }
  }, [profile, mounted]);

  const initials = useMemo(() => {
    const text = fallbackName || profile?.name || 'Node';
    return text.trim().slice(0, 1).toUpperCase();
  }, [fallbackName, profile?.name]);

  return (
    <div onClick={onClick} className={cn("relative inline-flex items-center justify-center shrink-0 rounded-full cursor-pointer transition-transform active:scale-95", className)}>
      {premium && (
        <div className="absolute inset-[-3px] rounded-full p-[1.5px] overflow-hidden z-0">
          <div className="absolute inset-[-100%] bg-gradient-to-tr from-primary via-accent to-primary opacity-40 animate-pulse" />
        </div>
      )}

      <div className={cn("rounded-full p-[1.5px] w-full h-full flex items-center justify-center overflow-hidden relative z-10", premium ? "bg-[#020205]" : "bg-white/10")}>
        <Avatar className="bg-black w-full h-full rounded-full border-none">
          {displayAvatar && !imgError ? (
            <div className="relative w-full h-full">
              <Image 
                src={displayAvatar} 
                alt="Avatar" 
                fill 
                className="object-cover rounded-full" 
                onError={() => setImgError(true)} 
                unoptimized 
              />
            </div>
          ) : (
            <AvatarFallback className="bg-[#050505] text-primary font-black uppercase italic text-[24px] tracking-tighter">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {showOnlineStatus && isOnline && (
        <div className="absolute top-[8%] right-[8%] z-20 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0a0c] shadow-[0_0_10px_rgba(34,197,94,1)]" />
      )}
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';
