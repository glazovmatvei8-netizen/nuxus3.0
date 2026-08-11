"use client"

import React, { useEffect, useMemo } from 'react';
import ChatSidebar from './chat-sidebar.tsx';
import ChatArea from './chat-area.tsx';
import ContactsView from './contacts-view.tsx';
import CallsView from './calls-view.tsx';
import ProfileView from './profile-view.tsx';
import MusicView from './music-view.tsx';
import WalletView from './wallet-view.tsx';
import GamesView from './games-view.tsx';
import DiscoveryView from './discovery-view.tsx';
import NuxusAiView from './nuxus-ai-view.tsx';
import PartnerView from './partner-view.tsx';
import { useAppState } from '@/lib/store.tsx';
import { cn } from '@/lib/utils.ts';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase/provider.tsx';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay.tsx';
import { NotificationListener } from './notification-listener.tsx';
import { SettingsModal } from './modals/settings-modal.tsx';
import { GlobalSearchModal } from './modals/global-search-modal.tsx';
import { ForwardModal } from './modals/forward-modal.tsx';
import { UserProfileModal } from './modals/user-profile-modal.tsx';
import { MusicPlayer } from './music-player.tsx';
import { UserAvatar } from './user-avatar.tsx';
import type { Call, User as UserType } from '@/lib/types.ts';
import { Phone, MessageCircle, Settings, Search, Music, Wallet, Gamepad2, Compass, Sparkles, BrainCircuit, Terminal, LayoutGrid } from 'lucide-react';

/**
 * CHAT MAIN V21.0 «ABSOLUTE ZERO»
 * Революционный интерфейс с системой Fluid Layers.
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
      
      {/* Quantum Ambient Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-primary/20 blur-[200px] rounded-full pointer-events-none animate-pulse opacity-40" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-accent/10 blur-[180px] rounded-full pointer-events-none opacity-30" />

      <div className="flex-1 flex overflow-hidden w-full relative h-full">
        
        {/* Rail Navigation V21.0 */}
        <div className="hidden md:flex w-[110px] h-full flex-col items-center py-10 bg-white/[0.01] backdrop-blur-[40px] border-r border-white/[0.04] shrink-0 z-40 relative">
          <div 
            className="mb-16 cursor-pointer active:scale-90 transition-all relative group" 
            onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}
          >
            <div className="absolute -inset-10 bg-primary/30 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="w-18 h-18 crystal-card flex items-center justify-center relative z-10 border-primary/20 shadow-2xl neon-border">
              <Sparkles className="w-9 h-9 text-primary group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
          
          <div className="flex flex-col gap-10 flex-1 overflow-y-auto scrollbar-hide py-2 w-full px-2">
            <RailButton icon={MessageCircle} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} label="СЕТЬ" />
            <RailButton icon={BrainCircuit} active={activeView === 'ai'} onClick={() => { setActiveView('ai'); setCurrentChatId(null); }} label="РАЗУМ" />
            <RailButton icon={Compass} active={activeView === 'discovery'} onClick={() => { setActiveView('discovery'); setCurrentChatId(null); }} label="ХАБ" />
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} label="СВЯЗЬ" />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} label="БАНК" />
          </div>

          <div className="mt-auto flex flex-col gap-6 items-center pb-8">
            <button 
              onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} 
              className={cn(
                "relative transition-all duration-700 group p-3 rounded-[2.2rem] border border-transparent", 
                activeView === 'profile' ? "bg-primary/15 border-primary/40 shadow-2xl" : "hover:bg-white/5"
              )}
            >
              <UserAvatar userId={user?.uid} className={cn("h-14 w-14 border-2 transition-all duration-700", activeView === 'profile' ? "border-primary scale-110 shadow-[0_0_40px_rgba(168,85,247,0.7)]" : "border-transparent opacity-50 group-hover:opacity-100")} />
            </button>
          </div>
        </div>

        {/* Viewport Engine V21.0 */}
        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[440px] lg:w-[480px] h-full flex-shrink-0 z-30 bg-black/40 backdrop-blur-[50px] relative overflow-hidden transition-all duration-700", 
            (currentChatId && !['profile', 'contacts', 'calls', 'music', 'wallet', 'discovery', 'games', 'ai', 'partner'].includes(activeView)) ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full overflow-hidden animate-in fade-in slide-in-from-left-8 duration-1000">
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
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 chat-pattern-bg overflow-hidden transition-all duration-1000 md:ml-6 my-2 md:my-6 md:mr-6 md:rounded-[4.5rem] md:border md:border-white/[0.08] md:shadow-[0_60px_150px_rgba(0,0,0,0.9)] md:bg-black/60 md:backdrop-blur-[80px]", 
            (!currentChatId || ['profile', 'music', 'wallet', 'games', 'discovery', 'ai', 'partner'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-99 duration-1000">
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-10 text-center space-y-16 opacity-30">
                   <div className="relative">
                      <div className="absolute -inset-24 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                      <div className="w-48 h-48 obsidian-glass rounded-[3rem] flex items-center justify-center shadow-2xl border-white/5 relative z-10">
                        <LayoutGrid className="w-24 h-24 text-primary" />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <h2 className="text-4xl font-black uppercase italic tracking-[0.6em] text-white">Quantum Void</h2>
                      <p className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/60 italic">Инициализируйте сигнал для связи</p>
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
            
            <div className="relative -top-7">
              <div className="absolute -inset-10 bg-primary/40 blur-3xl animate-pulse-ring rounded-full" />
              <button 
                onClick={() => setActiveView('chats')}
                className={cn(
                  "h-22 w-22 rounded-[3rem] flex items-center justify-center transition-all duration-700 relative z-20 border-2 shadow-[0_30px_70px_rgba(0,0,0,0.6)] hover:scale-110 active:scale-90 neon-border",
                  activeView === 'chats' ? "bg-primary text-white border-primary/50 shadow-primary/30" : "bg-[#1c1c1e] text-white/30 border-white/10"
                )}
              >
                <MessageCircle className={cn("w-11 h-11", activeView === 'chats' && "fill-current")} />
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
    <button onClick={onClick} className={cn("group flex flex-col items-center gap-4 transition-all outline-none w-full", active ? "text-primary" : "text-muted-foreground/50 hover:text-white")}>
      <div className={cn(
        "w-18 h-18 rounded-[2.2rem] flex items-center justify-center transition-all duration-700 relative border border-transparent", 
        active ? "bg-primary/15 border-primary/40 shadow-[0_0_50px_rgba(168,85,247,0.5)] scale-110" : "hover:bg-white/5"
      )}>
        <Icon className={cn("w-9 h-9 transition-all duration-700", active ? "fill-current" : "group-hover:scale-110")} />
        {active && <div className="absolute -left-[42px] top-1/2 -translate-y-1/2 w-2.5 h-16 bg-primary rounded-r-full shadow-[0_0_30px_rgba(168,85,247,1)]" />}
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-80 italic">{label}</span>
    </button>
  );
}

function NavButton({ icon: Icon, active, onClick, isProfile, userId }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full w-16 transition-all relative outline-none", active ? "text-primary" : "text-muted-foreground/40")}>
      {isProfile ? (
        <UserAvatar userId={userId} className={cn("h-10 w-10 border-2 transition-all duration-700", active ? "border-primary scale-110 shadow-xl" : "border-transparent opacity-70")} />
      ) : (
        <Icon className={cn("w-9 h-9 transition-all duration-700", active ? "fill-current scale-110" : "scale-100")} />
      )}
      {active && <div className="absolute -bottom-4 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_20px_rgba(168,85,247,1)]" />}
    </button>
  );
}
