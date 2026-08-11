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
import { cn, isUserPremium } from '@/lib/utils';
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
 * CHAT MAIN V19.0 «CRYSTAL FRAME»
 * Полностью новый интерфейс с акцентом на глубину и премиальность.
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
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="flex-1 flex overflow-hidden w-full relative h-full">
        
        {/* Desktop Navigation Rail V19.0 */}
        <div className="hidden md:flex w-[100px] h-full flex-col items-center py-12 bg-white/[0.01] backdrop-blur-3xl border-r border-white/[0.05] shrink-0 z-40 relative">
          <div 
            className="mb-16 cursor-pointer active:scale-90 transition-all relative group" 
            onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}
          >
            <div className="absolute -inset-6 bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 crystal-card flex items-center justify-center relative z-10 group-hover:border-primary/50 transition-all duration-700 shadow-2xl">
              <Sparkles className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            </div>
          </div>
          
          <div className="flex flex-col gap-10 flex-1 overflow-y-auto scrollbar-hide py-2 w-full px-2">
            <RailButton icon={MessageCircle} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} label="СЕТЬ" />
            <RailButton icon={BrainCircuit} active={activeView === 'ai'} onClick={() => { setActiveView('ai'); setCurrentChatId(null); }} label="РАЗУМ" />
            <RailButton icon={Compass} active={activeView === 'discovery'} onClick={() => { setActiveView('discovery'); setCurrentChatId(null); }} label="ХАБ" />
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} label="ЗВОНКИ" />
            <RailButton icon={Gamepad2} active={activeView === 'games'} onClick={() => { setActiveView('games'); setCurrentChatId(null); }} label="ИГРЫ" />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} label="БАНК" />
          </div>

          <div className="mt-auto flex flex-col gap-8 items-center pb-8">
            <button 
              onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} 
              className={cn(
                "relative transition-all duration-700 group p-2 rounded-[1.8rem]", 
                activeView === 'profile' ? "bg-primary/10 border border-primary/20 shadow-2xl" : "hover:bg-white/5"
              )}
            >
              <UserAvatar userId={user?.uid} className={cn("h-12 w-12 border-2 transition-all duration-700", activeView === 'profile' ? "border-primary scale-110 shadow-[0_0_25px_rgba(168,85,247,0.5)]" : "border-transparent opacity-50 group-hover:opacity-100")} />
            </button>
          </div>
        </div>

        {/* Viewport Container V19.0 */}
        <div className="flex-1 flex overflow-hidden h-full relative">
          {/* Sidebar Area */}
          <div className={cn(
            "w-full md:w-[400px] lg:w-[440px] h-full flex-shrink-0 z-30 bg-black/20 backdrop-blur-2xl relative overflow-hidden transition-all duration-500", 
            (currentChatId && !['profile', 'contacts', 'calls', 'music', 'wallet', 'discovery', 'games', 'ai', 'partner'].includes(activeView)) ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full overflow-hidden animate-in fade-in slide-in-from-left-4 duration-700">
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
          
          {/* Main Area */}
          <div className={cn(
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 chat-pattern-bg overflow-hidden transition-all duration-700 md:ml-4 my-2 md:my-4 md:mr-4 md:rounded-[3.5rem] md:border md:border-white/[0.08] md:shadow-2xl md:bg-black/40 md:backdrop-blur-3xl", 
            (!currentChatId || ['profile', 'music', 'wallet', 'games', 'discovery', 'ai', 'partner'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-1000">
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-10 text-center space-y-8 opacity-20">
                   <div className="relative">
                      <div className="absolute -inset-10 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                      <LayoutGrid className="w-32 h-32 text-primary" />
                   </div>
                   <div className="space-y-2">
                      <h2 className="text-2xl font-black uppercase italic tracking-[0.4em] text-white">Quantum Core</h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Выберите узел для обмена сигналами</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MusicPlayer />

      {/* Floating Bottom Navigation (Mobile Only) V19.0 */}
      {!currentChatId && (
        <div className="md:hidden floating-nav">
          <div className="flex flex-1 justify-around items-center h-full">
            <NavButton icon={Terminal} active={activeView === 'partner'} onClick={() => setActiveView('partner')} />
            <NavButton icon={BrainCircuit} active={activeView === 'ai'} onClick={() => setActiveView('ai')} />
            
            <div className="relative -top-5">
              <div className="absolute -inset-6 bg-primary/30 blur-2xl animate-pulse-ring rounded-full" />
              <button 
                onClick={() => setActiveView('chats')}
                className={cn(
                  "h-18 w-18 rounded-[2.2rem] flex items-center justify-center transition-all duration-700 relative z-20 border-2 shadow-2xl hover:scale-110 active:scale-90",
                  activeView === 'chats' ? "bg-primary text-white border-primary/50" : "bg-white/5 text-white/40 border-white/10"
                )}
              >
                <MessageCircle className={cn("w-9 h-9", activeView === 'chats' && "fill-current")} />
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
    <button onClick={onClick} className={cn("group flex flex-col items-center gap-2 transition-all outline-none w-full", active ? "text-primary" : "text-muted-foreground hover:text-white")}>
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative border border-transparent", 
        active ? "bg-primary/10 border-primary/30 shadow-[0_0_30px_rgba(168,85,247,0.3)] scale-110" : "group-hover:bg-white/5"
      )}>
        <Icon className={cn("w-7 h-7 transition-all duration-700", active ? "fill-current" : "group-hover:scale-110")} />
        {active && <div className="absolute -left-[42px] top-1/2 -translate-y-1/2 w-2 h-12 bg-primary rounded-r-full shadow-[0_0_20px_rgba(168,85,247,1)]" />}
      </div>
      <span className="text-[7px] font-black uppercase tracking-[0.3em] opacity-60">{label}</span>
    </button>
  );
}

function NavButton({ icon: Icon, active, onClick, isProfile, userId }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full w-12 transition-all relative outline-none", active ? "text-primary" : "text-muted-foreground/40")}>
      {isProfile ? (
        <UserAvatar userId={userId} className={cn("h-8 w-8 border-2 transition-all duration-700", active ? "border-primary scale-110 shadow-lg" : "border-transparent opacity-60")} />
      ) : (
        <Icon className={cn("w-7 h-7 transition-all duration-700", active ? "fill-current scale-110" : "scale-100")} />
      )}
      {active && <div className="absolute -bottom-2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(168,85,247,1)]" />}
    </button>
  );
}