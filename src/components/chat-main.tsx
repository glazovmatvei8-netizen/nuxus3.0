
"use client"

import React, { useEffect, useState } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import { SettingsModal } from './modals/settings-modal';
import { UserAvatar } from './user-avatar';
import type { Call, User as UserType } from '@/lib/types';
import { Users, Phone, MessageCircle, UserCircle } from 'lucide-react';

export default function ChatMain() {
  const { currentChatId, activeCallId, setActiveCallId, activeView, setActiveView } = useAppState();
  const { user } = useUser();
  const db = useFirestore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
        {/* Sidebar content switcher */}
        <div className={cn(
          "w-full md:w-[350px] lg:w-[400px] h-full flex-shrink-0 border-r border-white/5 transition-all duration-300 z-30 bg-card",
          currentChatId ? "hidden md:block" : "block"
        )}>
          {activeView === 'chats' && <ChatSidebar />}
          {activeView === 'contacts' && <ContactsView />}
          {activeView === 'calls' && <CallsView />}
          {activeView === 'profile' && <ChatSidebar />} {/* Profile usually triggers settings or shows profile screen */}
        </div>
        
        {/* Chat Area */}
        <div className={cn(
          "flex-1 h-full flex flex-col min-w-0 transition-all duration-300 bg-background relative z-20",
          !currentChatId ? "hidden md:flex" : "flex"
        )}>
          <ChatArea />
        </div>
      </div>

      {/* Bottom Navigation */}
      {!currentChatId && (
        <div className="h-[84px] bg-[#161618]/90 backdrop-blur-2xl border-t border-white/[0.05] flex items-start justify-around px-2 pt-2 z-50">
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
          <NavButton 
            icon={MessageCircle} 
            label="Чаты" 
            active={activeView === 'chats'} 
            badge="4" 
            onClick={() => setActiveView('chats')} 
          />
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 w-20 pt-1 transition-all",
              activeView === 'profile' ? "text-[#007AFF]" : "text-muted-foreground/60"
            )}
          >
            <UserAvatar 
              userId={user?.uid} 
              className={cn("h-7 w-7 border-2", activeView === 'profile' ? "border-[#007AFF]" : "border-transparent")} 
            />
            <span className="text-[10px] font-bold">Профиль</span>
          </button>
        </div>
      )}

      <CallOverlay />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}

function NavButton({ icon: Icon, label, active, badge, onClick }: { icon: any, label: string, active?: boolean, badge?: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 w-20 pt-1 transition-all",
        active ? "text-[#007AFF]" : "text-muted-foreground/60"
      )}
    >
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
