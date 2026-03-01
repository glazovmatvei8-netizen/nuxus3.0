
"use client"

import React, { useEffect, useState, useMemo } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import ProfileView from './profile-view';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import { SettingsModal } from './modals/settings-modal';
import { UserAvatar } from './user-avatar';
import type { Call, User as UserType, Chat, Message } from '@/lib/types';
import { Users, Phone, MessageCircle, Settings, Search } from 'lucide-react';

export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen 
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<UserType>(userProfileRef);

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
        <div className={cn(
          "w-full md:w-[350px] lg:w-[400px] h-full flex-shrink-0 border-r border-white/5 transition-all duration-300 z-30 bg-card",
          currentChatId ? "hidden md:block" : "block"
        )}>
          {activeView === 'chats' && <ChatSidebar />}
          {activeView === 'contacts' && <ContactsView />}
          {activeView === 'calls' && <CallsView />}
          {activeView === 'profile' && <ProfileView />}
        </div>
        
        <div className={cn(
          "flex-1 h-full flex flex-col min-w-0 transition-all duration-300 bg-background relative z-20",
          (!currentChatId || activeView === 'profile') ? "hidden md:flex" : "flex"
        )}>
          <ChatArea />
        </div>
      </div>

      {/* Bottom Navigation Styled as Screenshot */}
      {!currentChatId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-[68px] bg-[#1c1c1e]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex items-center justify-between px-6 z-50 shadow-2xl">
          <div className="flex flex-1 justify-between mr-4">
            <NavButton 
              icon={Users} 
              label="Контакты" 
              active={activeView === 'contacts'} 
              onClick={() => setActiveView('contacts')} 
            />
            <NavButton 
              icon={Phone} 
              label="Звонки" 
              active={activeView === 'calls'} 
              onClick={() => setActiveView('calls')} 
            />
            <ChatsNavButton 
              active={activeView === 'chats'} 
              onClick={() => setActiveView('chats')} 
            />
            <NavButton 
              icon={Settings} 
              label="Настройки" 
              active={activeView === 'profile'} 
              onClick={() => setActiveView('profile')} 
            />
          </div>
          
          <button className="h-[52px] w-[52px] rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
            <Search className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      <CallOverlay />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}

function ChatsNavButton({ active, onClick }: { active: boolean, onClick: () => void }) {
  const { user } = useUser();
  const db = useFirestore();

  // Для полноценного подсчета без collectionGroup мы используем заглушку, 
  // но в реальном приложении здесь был бы агрегатор
  const unreadCount = 1; 

  return (
    <NavButton 
      icon={MessageCircle} 
      label="Чаты" 
      active={active} 
      badge={unreadCount > 0 ? unreadCount.toString() : undefined} 
      onClick={onClick} 
    />
  );
}

function NavButton({ icon: Icon, label, active, badge, onClick }: { icon: any, label: string, active?: boolean, badge?: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 transition-all relative",
        active ? "text-[#007AFF]" : "text-muted-foreground/60"
      )}
    >
      <div className="relative">
        <Icon className={cn("w-6 h-6", active && "fill-current")} />
        {badge && (
          <div className="absolute -top-1 -right-2 bg-[#FF3B30] text-white text-[9px] font-black rounded-full h-4 min-w-4 flex items-center justify-center px-1 border-2 border-[#1c1c1e]">
            {badge}
          </div>
        )}
      </div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
