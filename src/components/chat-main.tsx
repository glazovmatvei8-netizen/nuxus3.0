
"use client"

import React, { useEffect } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import type { Call } from '@/lib/types';
import { Users, Phone, MessageCircle, UserCircle } from 'lucide-react';

/**
 * Main application layout with improved mobile responsiveness and bottom navigation.
 */
export default function ChatMain() {
  const { currentChatId, activeCallId, setActiveCallId } = useAppState();
  const { user } = useUser();
  const db = useFirestore();

  // Listen for incoming calls
  const incomingCallsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'calling'),
      limit(1)
    );
  }, [db, user]);

  const { data: incomingCalls } = useCollection<Call>(incomingCallsQuery);

  useEffect(() => {
    if (incomingCalls?.length && !activeCallId) {
      setActiveCallId(incomingCalls[0].id);
    }
  }, [incomingCalls, activeCallId, setActiveCallId]);

  return (
    <div className="fixed inset-0 flex flex-col w-full bg-background overflow-hidden h-[100dvh]">
      <NotificationListener />
      
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Sidebar: hidden on mobile when a chat is selected */}
        <div className={cn(
          "w-full md:w-[350px] lg:w-[400px] h-full flex-shrink-0 border-r border-white/5 transition-all duration-300 z-30 bg-card",
          currentChatId ? "hidden md:block" : "block"
        )}>
          <ChatSidebar />
        </div>
        
        {/* Chat Area: hidden on mobile when NO chat is selected */}
        <div className={cn(
          "flex-1 h-full flex flex-col min-w-0 transition-all duration-300 bg-background relative z-20",
          !currentChatId ? "hidden md:flex" : "flex"
        )}>
          <ChatArea />
        </div>
      </div>

      {/* Bottom Navigation Styled like Reference */}
      {!currentChatId && (
        <div className="md:hidden h-[84px] bg-[#161618]/90 backdrop-blur-2xl border-t border-white/[0.05] flex items-start justify-around px-2 pt-2 z-50">
          <NavButton icon={Users} label="Контакты" />
          <NavButton icon={Phone} label="Звонки" />
          <NavButton icon={MessageCircle} label="Чаты" active badge="4" />
          <NavButton icon={UserCircle} label="Профиль" />
        </div>
      )}

      <CallOverlay />
    </div>
  );
}

function NavButton({ icon: Icon, label, active, badge }: { icon: any, label: string, active?: boolean, badge?: string }) {
  return (
    <button className={cn(
      "flex flex-col items-center gap-1 w-20 pt-1 transition-all",
      active ? "text-[#007AFF]" : "text-muted-foreground/60"
    )}>
      <div className="relative">
        <Icon className={cn("w-7 h-7", active && "fill-current")} />
        {badge && (
          <div className="absolute -top-1 -right-2 bg-[#FF3B30] text-white text-[10px] font-black rounded-full h-4 min-w-4 flex items-center justify-center px-1 border-2 border-[#161618]">
            {badge}
          </div>
        )}
      </div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
