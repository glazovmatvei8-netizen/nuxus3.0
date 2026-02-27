
"use client"

import React, { useEffect } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import type { Call } from '@/lib/types';

/**
 * Main application layout with improved mobile responsiveness and call signaling.
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
    <div className="fixed inset-0 flex w-full bg-background overflow-hidden h-[100dvh]">
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

      <CallOverlay />
    </div>
  );
}
