
"use client"

import React, { useEffect } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import ProfileView from './profile-view';
import MusicView from './music-view';
import WalletView from './wallet-view';
import GamesView from './games-view';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import { SettingsModal } from './modals/settings-modal';
import { GlobalSearchModal } from './modals/global-search-modal';
import { ForwardModal } from './modals/forward-modal';
import { UserProfileModal } from './modals/user-profile-modal';
import { LegalModal } from './modals/legal-modal';
import { UpdateNotifier } from './update-notifier';
import { MusicPlayer } from './music-player';
import { UserAvatar } from './user-avatar';
import type { Call, User as UserType } from '@/lib/types';
import { Users, Phone, MessageCircle, Settings, Search, Archive, Music, Wallet, Gamepad2, Layers } from 'lucide-react';

export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen, setCurrentChatId,
    isLegalOpen, setIsLegalOpen
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user]);
  const { data: profile } = useDoc<UserType>(userProfileRef);

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
    <div className="fixed inset-0 flex flex-col w-full bg-transparent overflow-hidden h-[100dvh]">
      <NotificationListener />
      <UpdateNotifier />
      
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Desktop Navigation Rail */}
        <div className="hidden md:flex w-[84px] h-full flex-col items-center py-8 bg-white/[0.03] backdrop-blur-3xl border-r border-white/[0.05] shrink-0 z-40 relative">
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
          
          <div className="mb-12 cursor-pointer active:scale-90 transition-transform relative group" onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}>
            <div className="absolute -inset-2 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-14 h-14 bg-white/[0.05] rounded-[1.2rem] flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.2)] relative z-10">
              <Layers className="w-7 h-7 text-primary" />
            </div>
          </div>
          
          <div className="flex flex-col gap-8 flex-1 overflow-y-auto scrollbar-hide py-2">
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} label="ЗВОНКИ" />
            <RailButton icon={Music} active={activeView === 'music'} onClick={() => { setActiveView('music'); setCurrentChatId(null); }} label="МУЗЫКА" />
            <RailButton icon={Gamepad2} active={activeView === 'games'} onClick={() => { setActiveView('games'); setCurrentChatId(null); }} label="ИГРЫ" />
            <RailButton icon={MessageCircle} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} label="ЧАТЫ 🐱" />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} label="КОШЕЛЕК" />
            <RailButton icon={Archive} active={activeView === 'archive'} onClick={() => { setActiveView('archive'); setCurrentChatId(null); }} label="АРХИВ" />
          </div>

          <div className="mt-auto flex flex-col gap-8 items-center">
            <button onClick={() => setIsSearchOpen(true)} className="w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-white/5 transition-all text-muted-foreground hover:text-primary group">
              <Search className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
            <button onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} className={cn("relative transition-all duration-500 group p-1 rounded-2xl", activeView === 'profile' ? "bg-primary/10" : "hover:bg-white/5")}>
              <UserAvatar userId={user?.uid} className={cn("h-12 w-12 border-2 transition-all duration-500", activeView === 'profile' ? "border-primary scale-110 shadow-[0_0_25px_rgba(168,85,247,0.4)]" : "border-transparent opacity-60 group-hover:opacity-100")} />
              {activeView === 'profile' && <div className="absolute -right-[43px] top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-l-full shadow-[0_0_15px_rgba(168,85,247,0.8)]" />}
            </button>
          </div>
        </div>

        {/* Content Sidebar - Fixed Horizontal Drift */}
        <div className={cn(
          "w-full md:w-[380px] lg:w-[420px] h-full flex-shrink-0 border-r border-white/[0.05] z-30 bg-white/[0.01] backdrop-blur-2xl overflow-x-hidden", 
          (currentChatId && !['profile', 'contacts', 'calls', 'archive', 'music', 'wallet', 'discovery', 'games'].includes(activeView)) ? "hidden md:block" : "block"
        )}>
          {activeView === 'chats' && <ChatSidebar />}
          {activeView === 'contacts' && <ContactsView />}
          {activeView === 'calls' && <CallsView />}
          {activeView === 'profile' && <ProfileView />}
          {activeView === 'archive' && <ChatSidebar isArchiveView />}
          {activeView === 'music' && <MusicView />}
          {activeView === 'wallet' && <WalletView />}
          {activeView === 'games' && <GamesView />}
        </div>
        
        {/* Main Viewport - Fixed Horizontal Drift */}
        <div className={cn(
          "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 chat-pattern-bg overflow-x-hidden", 
          (!currentChatId || ['profile', 'music', 'wallet', 'games'].includes(activeView)) ? "hidden md:flex" : "flex"
        )}>
          <ChatArea />
        </div>
      </div>

      <MusicPlayer />

      {/* Bottom Navigation (Mobile) */}
      {!currentChatId && (
        <div className="md:hidden fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] h-[84px] bg-black/40 backdrop-blur-[60px] border border-white/10 rounded-[2.5rem] flex items-center justify-between px-6 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div className="flex flex-1 justify-around items-center gap-1">
            <NavButton icon={Phone} label="ЗВОНКИ" active={activeView === 'calls'} onClick={() => setActiveView('calls')} />
            <NavButton icon={Music} label="АУДИО" active={activeView === 'music'} onClick={() => setActiveView('music')} />
            <NavButton icon={Gamepad2} label="ИГРЫ" active={activeView === 'games'} onClick={() => setActiveView('games')} />
            <NavButton icon={MessageCircle} label="ЧАТЫ 🐱" active={activeView === 'chats'} onClick={() => setActiveView('chats')} isCenter />
            <NavButton icon={Wallet} label="БАНК" active={activeView === 'wallet'} onClick={() => setActiveView('wallet')} />
            <NavButton icon={Settings} label="ПРОФИЛЬ" active={activeView === 'profile'} onClick={() => setActiveView('profile')} isProfile userId={user?.uid} />
          </div>
          <button onClick={() => setIsSearchOpen(true)} className="ml-2 h-[60px] w-[60px] rounded-full bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:bg-primary/25 transition-all active:scale-90">
            <Search className="w-7 h-7 text-primary" />
          </button>
        </div>
      )}

      <CallOverlay />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <ForwardModal />
      <UserProfileModal />
      <LegalModal open={isLegalOpen} onOpenChange={setIsLegalOpen} type="privacy" />
    </div>
  );
}

function RailButton({ icon: Icon, active, onClick, label }: { icon: any, active?: boolean, onClick: () => void, label: string }) {
  return (
    <button onClick={onClick} className={cn("group flex flex-col items-center gap-1.5 transition-all outline-none", active ? "text-primary" : "text-muted-foreground hover:text-white")}>
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative", active ? "bg-primary/15 shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "group-hover:bg-white/5")}>
        <Icon className={cn("w-6 h-6 transition-all duration-500", active ? "fill-current scale-110" : "scale-100")} />
        {active && <div className="absolute -left-[43px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
      </div>
      <span className="text-[7px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function NavButton({ icon: Icon, label, active, badge, onClick, isProfile, userId, isCenter }: { icon: any, label: string, active?: boolean, badge?: string, onClick: () => void, isProfile?: boolean, userId?: string, isCenter?: boolean }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center gap-1 transition-all relative outline-none", 
      active ? "text-primary" : "text-muted-foreground/60",
      isCenter && "scale-110 -translate-y-2"
    )}>
      <div className={cn("relative transition-all duration-500", isCenter && "bg-primary/20 p-3 rounded-[1.5rem] border border-primary/25 shadow-[0_0_25px_rgba(168,85,247,0.25)]")}>
        {isProfile ? (
          <UserAvatar userId={userId} className={cn("h-7 w-7 border-2 transition-all duration-500", active ? "border-primary scale-110 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "border-transparent opacity-60")} />
        ) : (
          <Icon className={cn("w-6 h-6 transition-all duration-500", active ? "fill-current scale-110" : "scale-100", isCenter && active && "text-primary")} />
        )}
        {badge && <div className="absolute -top-1 -right-2 bg-destructive text-white text-[9px] font-black rounded-full h-4 min-w-4 flex items-center justify-center px-1 border-2 border-background">{badge}</div>}
      </div>
      <span className={cn("text-[8px] font-black uppercase tracking-widest mt-0.5 whitespace-nowrap transition-all", isCenter && "text-primary/80 tracking-[0.3em]")}>{label}</span>
    </button>
  );
}
