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
import { Phone, MessageCircle, Settings, Search, Archive, Music, Wallet, Gamepad2, Layers, Compass, Plus } from 'lucide-react';
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
        {/* Desktop Navigation Rail V7.5 */}
        <div className="hidden md:flex w-[96px] h-full flex-col items-center py-10 bg-black/40 backdrop-blur-3xl border-r border-white/[0.05] shrink-0 z-40 relative">
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
          
          <div className="mb-14 cursor-pointer active:scale-90 transition-all relative group" onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}>
            <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 bg-white/[0.03] rounded-[1.8rem] flex items-center justify-center border border-white/10 shadow-2xl relative z-10 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-500">
              <Layers className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="flex flex-col gap-10 flex-1 overflow-y-auto scrollbar-hide py-2">
            <RailButton icon={MessageCircle} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} label={t('app.chats')} />
            <RailButton icon={Compass} active={activeView === 'discovery'} onClick={() => { setActiveView('discovery'); setCurrentChatId(null); }} label="HUB" />
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} label={t('app.calls')} />
            <RailButton icon={Gamepad2} active={activeView === 'games'} onClick={() => { setActiveView('games'); setCurrentChatId(null); }} label={t('app.games')} />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} label={t('app.wallet')} />
            <RailButton icon={Archive} active={activeView === 'archive'} onClick={() => { setActiveView('archive'); setCurrentChatId(null); }} label={t('app.archive')} />
          </div>

          <div className="mt-auto flex flex-col gap-10 items-center">
            <button onClick={() => setIsSearchOpen(true)} className="w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-primary/10 transition-all text-muted-foreground hover:text-primary group border border-transparent hover:border-primary/20">
              <Search className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </button>
            <button onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} className={cn("relative transition-all duration-500 group p-1.5 rounded-[1.4rem]", activeView === 'profile' ? "bg-primary/15 border border-primary/20 shadow-[0_0_25px_rgba(168,85,247,0.3)]" : "hover:bg-white/5")}>
              <UserAvatar userId={user?.uid} className={cn("h-12 w-12 border-2 transition-all duration-700", activeView === 'profile' ? "border-primary scale-110" : "border-transparent opacity-60 group-hover:opacity-100")} />
              {activeView === 'profile' && <div className="absolute -right-[43px] top-1/2 -translate-y-1/2 w-1.5 h-10 bg-primary rounded-l-full shadow-[0_0_20px_rgba(168,85,247,1)]" />}
            </button>
          </div>
        </div>

        {/* Sidebar Container */}
        <div className={cn(
          "w-full md:w-[400px] lg:w-[440px] h-full flex-shrink-0 border-r border-white/[0.05] z-30 bg-black/20 backdrop-blur-2xl relative overflow-hidden min-w-0", 
          (currentChatId && !['profile', 'contacts', 'calls', 'archive', 'music', 'wallet', 'discovery', 'games'].includes(activeView)) ? "hidden md:block" : "block"
        )}>
          <div className="h-full w-full overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
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
        
        {/* Main Viewport V7.5 */}
        <div className={cn(
          "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 chat-pattern-bg overflow-hidden max-w-full", 
          (!currentChatId || ['profile', 'music', 'wallet', 'games', 'discovery'].includes(activeView)) ? "hidden md:flex" : "flex"
        )}>
          <div className="h-full w-full overflow-hidden flex flex-col animate-in fade-in duration-700">
            <ChatArea />
          </div>
        </div>
      </div>

      <MusicPlayer />

      {/* Floating Bottom Navigation (Mobile) V7.5 «Event Horizon Dock» */}
      {!currentChatId && (
        <div className="md:hidden fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[450px] z-50">
          <div className="bg-black/40 backdrop-blur-[60px] border border-white/10 rounded-[3rem] h-[88px] flex items-center justify-between px-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            
            <div className="flex flex-1 justify-around items-center gap-1 z-10">
              <NavButton icon={Compass} label="HUB" active={activeView === 'discovery'} onClick={() => setActiveView('discovery')} />
              <NavButton icon={Phone} label="CALLS" active={activeView === 'calls'} onClick={() => setActiveView('calls')} />
              
              {/* Center Action Button */}
              <div className="relative -top-2">
                <div className="absolute -inset-4 bg-primary/20 blur-2xl animate-pulse" />
                <button 
                  onClick={() => setActiveView('chats')}
                  className={cn(
                    "h-16 w-16 rounded-[1.8rem] flex items-center justify-center transition-all duration-500 relative z-20 border shadow-2xl",
                    activeView === 'chats' ? "bg-primary text-white border-primary/50 shadow-primary/30" : "bg-white/5 text-white/40 border-white/10"
                  )}
                >
                  <MessageCircle className={cn("w-8 h-8", activeView === 'chats' && "fill-current")} />
                </button>
              </div>

              <NavButton icon={Wallet} label="WALLET" active={activeView === 'wallet'} onClick={() => setActiveView('wallet')} />
              <NavButton icon={Settings} label="PROFILE" active={activeView === 'profile'} onClick={() => setActiveView('profile')} isProfile userId={user?.uid} />
            </div>
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
    <button onClick={onClick} className={cn("group flex flex-col items-center gap-2.5 transition-all outline-none", active ? "text-primary" : "text-muted-foreground hover:text-white")}>
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative border border-transparent", 
        active ? "bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "group-hover:bg-white/5"
      )}>
        <Icon className={cn("w-7 h-7 transition-all duration-500", active ? "fill-current scale-110" : "scale-100 group-hover:scale-110")} />
        {active && <div className="absolute -left-[41px] top-1/2 -translate-y-1/2 w-1.5 h-10 bg-primary rounded-r-full shadow-[0_0_15px_rgba(168,85,247,1)]" />}
      </div>
      <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function NavButton({ icon: Icon, label, active, onClick, isProfile, userId }: { icon: any, label: string, active?: boolean, onClick: () => void, isProfile?: boolean, userId?: string }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1.5 transition-all relative outline-none py-2", active ? "text-primary" : "text-muted-foreground/60")}>
      <div className="relative transition-all duration-500">
        {isProfile ? (
          <UserAvatar userId={userId} className={cn("h-7 w-7 border-2 transition-all duration-500", active ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-transparent opacity-70")} />
        ) : (
          <Icon className={cn("w-6 h-6 transition-all duration-500", active ? "fill-current scale-110" : "scale-100")} />
        )}
      </div>
      <span className={cn("text-[7px] font-black uppercase tracking-[0.2em] transition-all", active && "text-primary")}>{label}</span>
    </button>
  );
}