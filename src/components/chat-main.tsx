
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
import DiscoveryView from './discovery-view';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
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
import { CreateStoryModal } from './modals/create-story-modal';
import type { Call } from '@/lib/types';
import { Phone, MessageCircle, Settings, Search, Archive, Music, Wallet, Gamepad2, Layers, Compass, Plus, Sparkles } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';

export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen, setCurrentChatId,
    isLegalOpen, setIsLegalOpen, isCreateStoryOpen, setIsCreateStoryOpen
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();
  const { t } = useTranslations();

  const incomingCallsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'calls'),
      where('participantIds', 'array-contains', user.uid),
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
    <div className="fixed inset-0 flex flex-col w-screen bg-transparent overflow-hidden h-[100dvh] max-w-full">
      <NotificationListener />
      <UpdateNotifier />
      
      <div className="flex-1 flex overflow-hidden w-full relative max-w-full">
        {/* Desktop Navigation Rail V11.0 (Quantum Rail - AI Removed) */}
        <div className="hidden md:flex w-[88px] h-full flex-col items-center py-10 bg-black/40 backdrop-blur-3xl border-r border-white/[0.03] shrink-0 z-40 relative">
          <div className="mb-12 cursor-pointer active:scale-90 transition-all relative group" onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}>
            <div className="absolute -inset-4 bg-primary/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-14 h-14 bg-white/[0.03] rounded-[1.8rem] flex items-center justify-center border border-white/10 shadow-2xl relative z-10 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-700">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
          </div>
          
          <div className="flex flex-col gap-8 flex-1 overflow-y-auto scrollbar-hide py-2">
            <RailButton icon={MessageCircle} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} label="СЕТЬ" />
            <RailButton icon={Compass} active={activeView === 'discovery'} onClick={() => { setActiveView('discovery'); setCurrentChatId(null); }} label="ХАБ" />
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} label="ЗВОНКИ" />
            <RailButton icon={Gamepad2} active={activeView === 'games'} onClick={() => { setActiveView('games'); setCurrentChatId(null); }} label="ИГРЫ" />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} label="БАНК" />
            <RailButton icon={Archive} active={activeView === 'archive'} onClick={() => { setActiveView('archive'); setCurrentChatId(null); }} label="АРХИВ" />
          </div>

          <div className="mt-auto flex flex-col gap-6 items-center pb-6">
            <button onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} className={cn("relative transition-all duration-700 group p-1.5 rounded-2xl", activeView === 'profile' ? "bg-primary/10 border border-primary/20" : "hover:bg-white/5")}>
              <UserAvatar userId={user?.uid} className={cn("h-11 w-11 border-2 transition-all duration-700", activeView === 'profile' ? "border-primary scale-110 shadow-[0_0_20px_rgba(168,85,247,0.4)]" : "border-transparent opacity-50 group-hover:opacity-100")} />
            </button>
          </div>
        </div>

        {/* Sidebar Container V11.0 (Quantum Panel) */}
        <div className={cn(
          "w-full md:w-[380px] lg:w-[420px] h-full flex-shrink-0 z-30 bg-black/5 backdrop-blur-3xl relative overflow-hidden min-w-0 transition-all duration-500", 
          (currentChatId && !['profile', 'contacts', 'calls', 'archive', 'music', 'wallet', 'discovery', 'games'].includes(activeView)) ? "hidden md:block" : "block"
        )}>
          <div className="h-full w-full overflow-hidden animate-in fade-in slide-in-from-left-4 duration-700">
            {activeView === 'chats' && <ChatSidebar />}
            {activeView === 'contacts' && <ContactsView />}
            {activeView === 'calls' && <CallsView />}
            {activeView === 'profile' && <ProfileView />}
            {activeView === 'archive' && <ChatSidebar isArchiveView />}
            {activeView === 'music' && <MusicView />}
            {activeView === 'wallet' && <WalletView />}
            {activeView === 'games' && <GamesView />}
            {activeView === 'discovery' && <DiscoveryView />}
          </div>
        </div>
        
        {/* Main Viewport V11.0 (Quantum Area) */}
        <div className={cn(
          "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 chat-pattern-bg overflow-hidden max-w-full transition-all duration-700 md:ml-4 my-2 md:my-4 md:mr-4 md:rounded-[3rem] md:border md:border-white/5 md:shadow-2xl", 
          (!currentChatId || ['profile', 'music', 'wallet', 'games', 'discovery'].includes(activeView)) ? "hidden md:flex" : "flex"
        )}>
          <div className="h-full w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-1000">
            <ChatArea />
          </div>
        </div>
      </div>

      <MusicPlayer />

      {/* Floating Bottom Navigation (Mobile Only) V4.0 - AI Removed */}
      {!currentChatId && (
        <div className="md:hidden floating-nav">
          <div className="flex flex-1 justify-around items-center gap-1 z-10">
            <NavButton icon={Compass} label="ХАБ" active={activeView === 'discovery'} onClick={() => setActiveView('discovery')} />
            <NavButton icon={Phone} label="ЗВОНКИ" active={activeView === 'calls'} onClick={() => setActiveView('calls')} />
            
            <div className="relative -top-3">
              <div className="absolute -inset-4 bg-primary/30 blur-2xl animate-pulse" />
              <button 
                onClick={() => setActiveView('chats')}
                className={cn(
                  "h-16 w-16 rounded-[1.8rem] flex items-center justify-center transition-all duration-700 relative z-20 border shadow-2xl hover:scale-110 active:scale-90",
                  activeView === 'chats' ? "bg-primary text-white border-primary/50" : "bg-white/5 text-white/40 border-white/10"
                )}
              >
                <MessageCircle className={cn("w-8 h-8", activeView === 'chats' && "fill-current")} />
              </button>
            </div>

            <NavButton icon={Wallet} label="БАНК" active={activeView === 'wallet'} onClick={() => setActiveView('wallet')} />
            <NavButton icon={Settings} label="УЗЕЛ" active={activeView === 'profile'} onClick={() => setActiveView('profile')} isProfile userId={user?.uid} />
          </div>
        </div>
      )}

      <CallOverlay />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <ForwardModal />
      <UserProfileModal />
      <LegalModal open={isLegalOpen} onOpenChange={setIsLegalOpen} />
      <CreateStoryModal open={isCreateStoryOpen} onOpenChange={setIsCreateStoryOpen} />
    </div>
  );
}

function RailButton({ icon: Icon, active, onClick, label }: { icon: any, active?: boolean, onClick: () => void, label: string }) {
  return (
    <button onClick={onClick} className={cn("group flex flex-col items-center gap-2 transition-all outline-none", active ? "text-primary" : "text-muted-foreground hover:text-white")}>
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative border border-transparent", 
        active ? "bg-primary/10 border-primary/30 shadow-[0_0_25px_rgba(168,85,247,0.2)]" : "group-hover:bg-white/5"
      )}>
        <Icon className={cn("w-6 h-6 transition-all duration-700", active ? "fill-current scale-110" : "scale-100 group-hover:scale-110")} />
        {active && <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-1.5 h-10 bg-primary rounded-r-full shadow-[0_0_15px_rgba(168,85,247,1)]" />}
      </div>
      <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function NavButton({ icon: Icon, label, active, onClick, isProfile, userId }: { icon: any, label: string, active?: boolean, onClick: () => void, isProfile?: boolean, userId?: string }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1 transition-all relative outline-none py-1", active ? "text-primary" : "text-muted-foreground/60")}>
      <div className="relative transition-all duration-700">
        {isProfile ? (
          <UserAvatar userId={userId} className={cn("h-7 w-7 border-2 transition-all duration-700", active ? "border-primary scale-110" : "border-transparent opacity-70")} />
        ) : (
          <Icon className={cn("w-6 h-6 transition-all duration-700", active ? "fill-current scale-110" : "scale-100")} />
        )}
      </div>
      <span className={cn("text-[7px] font-black uppercase tracking-widest transition-all", active && "text-primary")}>{label}</span>
    </button>
  );
}
