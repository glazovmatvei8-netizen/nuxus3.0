
"use client"

import React, { useEffect } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import ProfileView from './profile-view';
import MusicView from './music-view';
import WalletView from './wallet-view';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import { SettingsModal } from './modals/settings-modal';
import { GlobalSearchModal } from './modals/global-search-modal';
import { ForwardModal } from './modals/forward-modal';
import { UpdateNotifier } from './update-notifier';
import { MusicPlayer } from './music-player';
import { UserAvatar } from './user-avatar';
import type { Call, User as UserType } from '@/lib/types';
import { Users, Phone, MessageCircle, Settings, Search, Archive, Music, Wallet } from 'lucide-react';

/**
 * ОСНОВНОЙ КОНТЕЙНЕР NUXUS
 * Навигация: Чаты по центру!
 */
export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen, setCurrentChatId
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<UserType>(userProfileRef);

  const navVis = profile?.settings?.navVisibility;

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
      <UpdateNotifier />
      
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Desktop Navigation Rail */}
        <div className="hidden md:flex w-[72px] h-full flex-col items-center py-6 bg-[#0a0a0c] border-r border-white/5 shrink-0 z-40">
          <div className="mb-8 cursor-pointer active:scale-90 transition-transform" onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}>
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
          </div>
          
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto scrollbar-hide py-2">
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} label="Звонки" />
            <RailButton icon={Music} active={activeView === 'music'} onClick={() => { setActiveView('music'); setCurrentChatId(null); }} label="Музыка" />
            <RailButton icon={MessageCircle} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} label="Чаты🐱" />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} label="Кошелек" />
            <RailButton icon={Archive} active={activeView === 'archive'} onClick={() => { setActiveView('archive'); setCurrentChatId(null); }} label="Архив" />
          </div>

          <div className="mt-auto flex flex-col gap-6 items-center">
            <button onClick={() => setIsSearchOpen(true)} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors text-muted-foreground hover:text-white">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} className={cn("relative transition-all duration-300 group p-1 rounded-2xl", activeView === 'profile' ? "bg-primary/10" : "hover:bg-white/5")}>
              <UserAvatar userId={user?.uid} className={cn("h-10 w-10 border-2 transition-all", activeView === 'profile' ? "border-primary scale-105" : "border-transparent opacity-70 group-hover:opacity-100")} />
              {activeView === 'profile' && <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]" />}
            </button>
          </div>
        </div>

        <div className={cn("w-full md:w-[350px] lg:w-[400px] h-full flex-shrink-0 border-r border-white/5 transition-all duration-300 z-30 bg-card", (currentChatId && !['profile', 'contacts', 'calls', 'archive', 'music', 'wallet', 'discovery'].includes(activeView)) ? "hidden md:block" : "block")}>
          {activeView === 'chats' && <ChatSidebar />}
          {activeView === 'contacts' && <ContactsView />}
          {activeView === 'calls' && <CallsView />}
          {activeView === 'profile' && <ProfileView />}
          {activeView === 'archive' && <ChatSidebar isArchiveView />}
          {activeView === 'music' && <MusicView />}
          {activeView === 'wallet' && <WalletView />}
        </div>
        
        <div className={cn("flex-1 h-full flex flex-col min-w-0 transition-all duration-300 bg-background relative z-20", (!currentChatId || ['profile', 'music', 'wallet'].includes(activeView)) ? "hidden md:flex" : "flex")}>
          <ChatArea />
        </div>
      </div>

      <MusicPlayer />

      {/* Bottom Navigation (Mobile Only) - ЦЕНТРОВКА */}
      {!currentChatId && (
        <div className="md:hidden fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[500px] h-[76px] bg-[#1c1c1e]/80 backdrop-blur-[50px] border border-white/10 rounded-[2.8rem] flex items-center justify-between px-6 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex flex-1 justify-around items-center gap-2 px-2">
            <NavButton icon={Phone} label="Calls" active={activeView === 'calls'} onClick={() => setActiveView('calls')} />
            <NavButton icon={Music} label="Music" active={activeView === 'music'} onClick={() => setActiveView('music')} />
            <NavButton icon={MessageCircle} label="Чаты🐱" active={activeView === 'chats'} onClick={() => setActiveView('chats')} isCenter />
            <NavButton icon={Wallet} label="Wallet" active={activeView === 'wallet'} onClick={() => setActiveView('wallet')} />
            <NavButton icon={Settings} label="Profile" active={activeView === 'profile'} onClick={() => setActiveView('profile')} isProfile userId={user?.uid} />
          </div>
          <button onClick={() => setIsSearchOpen(true)} className="ml-2 h-[56px] w-[56px] rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.2)] hover:bg-white/10 transition-all active:scale-90">
            <Search className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      <CallOverlay />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <ForwardModal />
    </div>
  );
}

function RailButton({ icon: Icon, active, onClick, label }: { icon: any, active?: boolean, onClick: () => void, label: string }) {
  return (
    <button onClick={onClick} className={cn("group flex flex-col items-center gap-1 transition-all outline-none", active ? "text-primary" : "text-muted-foreground hover:text-white")}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all relative", active ? "bg-primary/10 shadow-lg shadow-primary/5" : "group-hover:bg-white/5")}>
        <Icon className={cn("w-5 h-5 transition-all", active ? "fill-current scale-110" : "scale-100")} />
        {active && <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]" />}
      </div>
      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function NavButton({ icon: Icon, label, active, badge, onClick, isProfile, userId, isCenter }: { icon: any, label: string, active?: boolean, badge?: string, onClick: () => void, isProfile?: boolean, userId?: string, isCenter?: boolean }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center gap-0.5 transition-all relative outline-none", 
      active ? "text-[#007AFF]" : "text-muted-foreground/60",
      isCenter && "scale-110 -translate-y-1"
    )}>
      <div className={cn("relative", isCenter && "bg-primary/10 p-2 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5")}>
        {isProfile ? (
          <UserAvatar userId={userId} className={cn("h-6 w-6 border transition-all", active ? "border-[#007AFF] scale-110" : "border-transparent opacity-60")} />
        ) : (
          <Icon className={cn("w-6 h-6 transition-all", active ? "fill-current scale-110" : "scale-100", isCenter && active && "text-primary")} />
        )}
        {badge && <div className="absolute -top-1 -right-2 bg-[#FF3B30] text-white text-[9px] font-black rounded-full h-4 min-w-4 flex items-center justify-center px-1 border-2 border-[#1c1c1e]">{badge}</div>}
      </div>
      <span className={cn("text-[9px] font-bold mt-0.5 whitespace-nowrap", isCenter && "text-primary/80")}>{label}</span>
    </button>
  );
}
