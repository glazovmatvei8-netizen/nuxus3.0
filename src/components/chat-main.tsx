"use client"

import React, { useEffect, useMemo } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import ProfileView from './profile-view';
import MusicView from './music-view';
import WalletView from './wallet-view';
import GamesView from './games-view';
import DiscoveryView from './discovery-view';
import NuxusAiView from './nuxus-ai-view';
import PartnerView from './partner-view';
import { useAppState } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import { SettingsModal } from './modals/settings-modal';
import { GlobalSearchModal } from './modals/global-search-modal';
import { ForwardModal } from './modals/forward-modal';
import { UserProfileModal } from './modals/user-profile-modal';
import { MusicPlayer } from './music-player';
import { UserAvatar } from './user-avatar';
import type { Call, User as UserType } from '@/lib/types';
import { Phone, MessageCircle, Settings, Search, Music, Wallet, Gamepad2, Compass, Sparkles, BrainCircuit, Terminal, LayoutGrid } from 'lucide-react';

/**
 * CHAT MAIN V20.0 «EVENT HORIZON»
 * Переосмысленный интерфейс с акцентом на глубину, премиальность и тактильность.
 */
export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen, setCurrentChatId
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<UserType>(userRef);

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

  return (
    <div className="fixed inset-0 flex flex-col w-screen bg-[#020205] overflow-hidden h-[100dvh]">
      <NotificationListener />
      
      {/* Dynamic Ambient Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[180px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="flex-1 flex overflow-hidden w-full relative h-full">
        
        {/* Rail Navigation V20.0 */}
        <div className="hidden md:flex w-[110px] h-full flex-col items-center py-12 bg-white/[0.01] backdrop-blur-[32px] border-r border-white/[0.04] shrink-0 z-40 relative">
          <div 
            className="mb-20 cursor-pointer active:scale-90 transition-all relative group" 
            onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}
          >
            <div className="absolute -inset-8 bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="w-16 h-16 crystal-card flex items-center justify-center relative z-10 group-hover:border-primary/40 transition-all duration-700 shadow-2xl neon-border">
              <Sparkles className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
          
          <div className="flex flex-col gap-12 flex-1 overflow-y-auto scrollbar-hide py-2 w-full px-2">
            <RailButton icon={MessageCircle} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} label="СЕТЬ" />
            <RailButton icon={BrainCircuit} active={activeView === 'ai'} onClick={() => { setActiveView('ai'); setCurrentChatId(null); }} label="РАЗУМ" />
            <RailButton icon={Compass} active={activeView === 'discovery'} onClick={() => { setActiveView('discovery'); setCurrentChatId(null); }} label="ХАБ" />
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} label="СВЯЗЬ" />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} label="БАНК" />
          </div>

          <div className="mt-auto flex flex-col gap-8 items-center pb-8">
            <button 
              onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} 
              className={cn(
                "relative transition-all duration-700 group p-2.5 rounded-[2rem] border border-transparent", 
                activeView === 'profile' ? "bg-primary/10 border-primary/20 shadow-2xl" : "hover:bg-white/5"
              )}
            >
              <UserAvatar userId={user?.uid} className={cn("h-12 w-12 border-2 transition-all duration-700", activeView === 'profile' ? "border-primary scale-110 shadow-[0_0_30px_rgba(168,85,247,0.6)]" : "border-transparent opacity-40 group-hover:opacity-100")} />
            </button>
          </div>
        </div>

        {/* Viewport Engine V20.0 */}
        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[420px] lg:w-[460px] h-full flex-shrink-0 z-30 bg-black/30 backdrop-blur-[40px] relative overflow-hidden transition-all duration-700", 
            (currentChatId && !['profile', 'contacts', 'calls', 'music', 'wallet', 'discovery', 'games', 'ai', 'partner'].includes(activeView)) ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full overflow-hidden animate-in fade-in slide-in-from-left-6 duration-1000">
              {activeView === 'chats' && <ChatSidebar />}
              {activeView === 'contacts' && <ContactsView />}
              {activeView === 'calls' && <CallsView />}
              {activeView === 'profile' && <ProfileView />}
              {activeView === 'music' && <MusicView />}
              {activeView === 'wallet' && <WalletView />}
              {activeView === 'games' && <GamesView />}
              {activeView === 'discovery' && <DiscoveryView />}
              {activeView === 'ai' && <NuxusAiView />}
              {activeView === 'partner' && <PartnerView />}
            </div>
          </div>
          
          <div className={cn(
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 chat-pattern-bg overflow-hidden transition-all duration-700 md:ml-6 my-2 md:my-6 md:mr-6 md:rounded-[4rem] md:border md:border-white/[0.06] md:shadow-[0_40px_100px_rgba(0,0,0,0.8)] md:bg-black/50 md:backdrop-blur-[60px]", 
            (!currentChatId || ['profile', 'music', 'wallet', 'games', 'discovery', 'ai', 'partner'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-98 duration-1000">
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-10 text-center space-y-12 opacity-20">
                   <div className="relative">
                      <div className="absolute -inset-16 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                      <LayoutGrid className="w-40 h-40 text-primary" />
                   </div>
                   <div className="space-y-4">
                      <h2 className="text-3xl font-black uppercase italic tracking-[0.5em] text-white">Quantum Void</h2>
                      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/60 italic">Выберите узел для инициализации сигнала</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MusicPlayer />

      {!currentChatId && (
        <div className="md:hidden floating-nav">
          <div className="flex flex-1 justify-around items-center h-full">
            <NavButton icon={Terminal} active={activeView === 'partner'} onClick={() => setActiveView('partner')} />
            <NavButton icon={BrainCircuit} active={activeView === 'ai'} onClick={() => setActiveView('ai')} />
            
            <div className="relative -top-6">
              <div className="absolute -inset-8 bg-primary/30 blur-3xl animate-pulse-ring rounded-full" />
              <button 
                onClick={() => setActiveView('chats')}
                className={cn(
                  "h-20 w-20 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 relative z-20 border-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-90 neon-border",
                  activeView === 'chats' ? "bg-primary text-white border-primary/40 shadow-primary/20" : "bg-[#1c1c1e] text-white/30 border-white/5"
                )}
              >
                <MessageCircle className={cn("w-10 h-10", activeView === 'chats' && "fill-current")} />
              </button>
            </div>

            <NavButton icon={Wallet} active={activeView === 'wallet'} onClick={() => setActiveView('wallet')} />
            <NavButton icon={Settings} active={activeView === 'profile'} onClick={() => setActiveView('profile')} isProfile userId={user?.uid} />
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

function RailButton({ icon: Icon, active, onClick, label }: any) {
  return (
    <button onClick={onClick} className={cn("group flex flex-col items-center gap-3 transition-all outline-none w-full", active ? "text-primary" : "text-muted-foreground/40 hover:text-white")}>
      <div className={cn(
        "w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-700 relative border border-transparent", 
        active ? "bg-primary/10 border-primary/30 shadow-[0_0_40px_rgba(168,85,247,0.4)] scale-110" : "hover:bg-white/5"
      )}>
        <Icon className={cn("w-8 h-8 transition-all duration-700", active ? "fill-current" : "group-hover:scale-110")} />
        {active && <div className="absolute -left-[38px] top-1/2 -translate-y-1/2 w-2 h-14 bg-primary rounded-r-full shadow-[0_0_25px_rgba(168,85,247,1)]" />}
      </div>
      <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-60 italic">{label}</span>
    </button>
  );
}

function NavButton({ icon: Icon, active, onClick, isProfile, userId }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full w-14 transition-all relative outline-none", active ? "text-primary" : "text-muted-foreground/30")}>
      {isProfile ? (
        <UserAvatar userId={userId} className={cn("h-9 w-9 border-2 transition-all duration-700", active ? "border-primary scale-110 shadow-lg" : "border-transparent opacity-60")} />
      ) : (
        <Icon className={cn("w-8 h-8 transition-all duration-700", active ? "fill-current scale-110" : "scale-100")} />
      )}
      {active && <div className="absolute -bottom-3 w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_rgba(168,85,247,1)]" />}
    </button>
  );
}
