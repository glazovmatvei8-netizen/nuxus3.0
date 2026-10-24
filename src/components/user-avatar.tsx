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
      return false;
    }
  }, [profile, mounted]);

  const initials = useMemo(() => {
    const text = fallbackName || profile?.name || 'Node';
    return text.trim().slice(0, 1).toUpperCase();
  }, [fallbackName, profile?.name]);

  return (
    <div onClick={onClick} className={cn("relative inline-flex items-center justify-center shrink-0 rounded-[inherit] cursor-pointer transition-all duration-500 hover:scale-105 active:scale-95", className)}>
      {premium && (
        <div className="absolute inset-[-4px] rounded-[inherit] border border-primary/20 p-[1px] animate-orbit overflow-hidden">
           <div className="absolute inset-[-100%] bg-gradient-to-tr from-primary via-transparent to-primary opacity-60" />
        </div>
      )}

      <div className={cn(
        "rounded-[inherit] p-[2px] w-full h-full flex items-center justify-center overflow-hidden relative z-10", 
        premium ? "bg-black" : "bg-white/10"
      )}>
        <Avatar className="bg-black w-full h-full rounded-[inherit] border-none">
          {displayAvatar && !imgError ? (
            <div className="relative w-full h-full">
              <Image 
                src={displayAvatar} 
                alt="Avatar" 
                fill 
                className="object-cover rounded-[inherit]" 
                onError={() => setImgError(true)} 
                unoptimized 
              />
            </div>
          ) : (
            <AvatarFallback className="bg-white/[0.02] text-primary font-black uppercase italic text-[24px] tracking-tighter">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {showOnlineStatus && isOnline && (
        <div className="absolute top-[5%] right-[5%] z-20 w-4 h-4 bg-green-500 rounded-full border-[3px] border-black shadow-[0_0_15px_rgba(34,197,94,1)] animate-pulse" />
      )}
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';