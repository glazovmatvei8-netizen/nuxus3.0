"use client"

import React, { useEffect, useMemo } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import ProfileView from './profile-view';
import WalletView from './wallet-view';
import DiscoveryView from './discovery-view';
import { useAppState } from '@/lib/app-state';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, limit } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import { SettingsModal } from './modals/settings-modal';
import { GlobalSearchModal } from './modals/global-search-modal';
import { ForwardModal } from './modals/forward-modal';
import { UserProfileModal } from './modals/user-profile-modal';
import { UserAvatar } from './user-avatar';
import type { Call } from '@/lib/types';
import { 
  MessageSquare, Settings, Phone, Wallet, 
  Globe, LayoutGrid
} from 'lucide-react';

export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();

  const incomingCallsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'calls'),
      where('participantIds', 'array-contains', user.uid),
      where('status', '==', 'calling'),
      limit(1)
    );
  }, [db, user?.uid]);

  const { data: incomingCalls } = useCollection<Call>(incomingCallsQuery);

  useEffect(() => {
    if (incomingCalls?.length && !activeCallId) {
      setActiveCallId(incomingCalls[0].id);
    }
  }, [incomingCalls, activeCallId, setActiveCallId]);

  const NAV_ITEMS = [
    { id: 'discovery', icon: Globe, label: 'EXPLORE' },
    { id: 'calls', icon: Phone, label: 'CALLS' },
    { id: 'chats', icon: MessageSquare, label: 'CHATS' },
    { id: 'wallet', icon: Wallet, label: 'WALLET' },
    { id: 'profile', icon: Settings, label: 'NODES' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col w-screen bg-[#010103] overflow-hidden h-[100dvh]">
      <NotificationListener />
      
      <div className="flex-1 flex overflow-hidden w-full relative h-full z-10">
        
        {/* Desktop Sidebar (hidden on mobile) */}
        <nav className="hidden md:flex flex-col items-center py-8 w-20 bg-black/60 border-r border-white/5 shrink-0 z-[100] gap-8">
           <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <LayoutGrid className="w-6 h-6 text-primary" />
           </div>
           
           <div className="flex flex-col gap-6 flex-1 items-center">
              {NAV_ITEMS.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className={cn(
                    "relative group p-3 rounded-2xl transition-all duration-300",
                    activeView === item.id ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "text-white/20 hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-6 h-6", activeView === item.id && "fill-current")} />
                </button>
              ))}
           </div>
        </nav>

        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[400px] lg:w-[440px] h-full flex-shrink-0 z-30 bg-black/20 backdrop-blur-[120px] border-r border-white/5 relative overflow-hidden transition-all duration-500", 
            (currentChatId && activeView === 'chats') ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full">
              {activeView === 'chats' && <ChatSidebar />}
              {activeView === 'contacts' && <ContactsView />}
              {activeView === 'calls' && <CallsView />}
              {activeView === 'profile' && <ProfileView />}
              {activeView === 'wallet' && <WalletView />}
              {activeView === 'discovery' && <DiscoveryView />}
            </div>
          </div>
          
          <div className={cn(
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 overflow-hidden transition-all duration-500 md:p-6 lg:p-10", 
            (!currentChatId || ['profile', 'wallet', 'discovery', 'calls'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col bg-white/[0.01] md:rounded-[4rem] border border-white/5 shadow-[0_50px_150px_rgba(0,0,0,0.8)]">
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-16 text-center space-y-12 opacity-30">
                   <div className="relative">
                      <div className="absolute -inset-16 bg-primary/10 blur-[100px] rounded-full animate-pulse" />
                      <div className="w-48 h-48 rounded-[4.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-inner relative z-10">
                         <MessageSquare className="w-20 h-20 text-primary" />
                      </div>
                   </div>
                   <h2 className="text-4xl font-black text-white uppercase tracking-tight">NUXUS CORE</h2>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV - REPLICATING PHOTO */}
      {(!currentChatId || activeView !== 'chats') && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1000] pb-[env(safe-area-inset-bottom)] nuxus-bottom-nav">
          <div className="h-20 flex items-center justify-around px-4">
            {NAV_ITEMS.map((item) => (
               <NavButton 
                 key={item.id}
                 icon={item.icon} 
                 label={item.label}
                 active={activeView === item.id} 
                 onClick={() => setActiveView(item.id as any)} 
                 isProfile={item.id === 'profile'}
                 userId={user?.uid}
               />
            ))}
          </div>
        </div>
      )}

      <CallOverlay />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <ForwardModal />
      <UserProfileModal />
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick, isProfile, userId }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 transition-all duration-300", 
        active ? "text-primary scale-110" : "text-white/20"
      )}
    >
      <div className={cn(
        "relative",
        active && isProfile && "p-0.5 rounded-full border-2 border-primary shadow-[0_0_20px_rgba(var(--primary),0.6)]"
      )}>
        {isProfile ? (
          <UserAvatar userId={userId} className="h-7 w-7" />
        ) : (
          <Icon className={cn("w-5 h-5", active && "fill-current")} strokeWidth={active ? 2.5 : 2} />
        )}
      </div>
      <span className={cn(
        "text-[8px] font-black uppercase tracking-widest",
        active ? "opacity-100" : "opacity-60"
      )}>
        {label}
      </span>
    </button>
  );
}