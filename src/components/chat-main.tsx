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
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
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
import { Phone, MessageCircle, Settings, Search, Music, Wallet, Gamepad2, Compass, Sparkles, BrainCircuit, Terminal, LayoutGrid, Zap, Shield } from 'lucide-react';

/**
 * CHAT MAIN V23.0 «QUANTUM TERMINAL»
 * Полный редизайн интерфейса. Глубокое погружение в кибер-эстетику.
 */
export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen, setCurrentChatId
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

  return (
    <div className="fixed inset-0 flex flex-col w-screen bg-[#010103] overflow-hidden h-[100dvh]">
      <NotificationListener />
      
      {/* Quantum Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      
      {/* Ambient Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-primary/10 blur-[180px] rounded-full pointer-events-none opacity-40 animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-accent/5 blur-[150px] rounded-full pointer-events-none opacity-30" />

      <div className="flex-1 flex overflow-hidden w-full relative h-full">
        
        {/* Navigation Rail V23.0 */}
        <div className="hidden md:flex w-[120px] h-full flex-col items-center py-12 obsidian-glass border-r border-white/[0.03] shrink-0 z-40 relative">
          <div 
            className="mb-14 cursor-pointer active:scale-90 transition-all relative group" 
            onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}
          >
            <div className="absolute -inset-10 bg-primary/40 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="w-18 h-18 crystal-card flex items-center justify-center relative z-10 border-primary/40 shadow-2xl neon-border rotate-45">
              <Zap className="w-9 h-9 text-primary -rotate-45 group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
          
          <div className="flex flex-col gap-12 flex-1 overflow-y-auto terminal-scroll py-2 w-full px-3">
            <RailButton icon={MessageCircle} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} label="NODE" />
            <RailButton icon={BrainCircuit} active={activeView === 'ai'} onClick={() => { setActiveView('ai'); setCurrentChatId(null); }} label="NX-AI" />
            <RailButton icon={Compass} active={activeView === 'discovery'} onClick={() => { setActiveView('discovery'); setCurrentChatId(null); }} label="HUB" />
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} label="LINK" />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} label="BANK" />
          </div>

          <div className="mt-auto flex flex-col gap-8 items-center pb-10">
            <button 
              onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} 
              className={cn(
                "relative transition-all duration-700 group p-2.5 rounded-[2.5rem] border border-transparent", 
                activeView === 'profile' ? "bg-primary/20 border-primary/50 shadow-[0_0_40px_rgba(168,85,247,0.4)]" : "hover:bg-white/5"
              )}
            >
              <UserAvatar userId={user?.uid} className={cn("h-16 w-16 border-2 transition-all duration-700", activeView === 'profile' ? "border-primary scale-110 shadow-2xl" : "border-transparent opacity-40 group-hover:opacity-100")} />
            </button>
          </div>
        </div>

        {/* Dynamic Viewport V23.0 */}
        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[460px] lg:w-[500px] h-full flex-shrink-0 z-30 bg-black/40 backdrop-blur-[60px] relative overflow-hidden transition-all duration-700", 
            (currentChatId && !['profile', 'contacts', 'calls', 'music', 'wallet', 'discovery', 'games', 'ai', 'partner'].includes(activeView)) ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full overflow-hidden animate-in fade-in slide-in-from-left-12 duration-1000">
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
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 overflow-hidden transition-all duration-1000 md:ml-10 my-4 md:my-10 md:mr-10 md:rounded-[4rem] md:border md:border-white/[0.06] md:shadow-[0_80px_200px_rgba(0,0,0,0.9)] md:bg-black/60 md:backdrop-blur-[100px]", 
            (!currentChatId || ['profile', 'music', 'wallet', 'games', 'discovery', 'ai', 'partner'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-98 duration-1000">
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 text-center space-y-20 opacity-30">
                   <div className="relative">
                      <div className="absolute -inset-32 bg-primary/20 blur-[150px] rounded-full animate-pulse" />
                      <div className="w-64 h-64 obsidian-glass rounded-[4rem] flex items-center justify-center shadow-2xl border-white/5 relative z-10 neon-border">
                        <LayoutGrid className="w-32 h-32 text-primary" />
                      </div>
                   </div>
                   <div className="space-y-8">
                      <h2 className="text-5xl font-black uppercase italic tracking-[0.8em] text-white drop-shadow-2xl">QUANTUM</h2>
                      <p className="text-[14px] font-black uppercase tracking-[0.5em] text-primary/60 italic">Waiting for Signal Encryption...</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MusicPlayer />

      {/* Floating Bottom Nav for Mobile V23.0 */}
      {!currentChatId && (
        <div className="md:hidden fixed bottom-10 left-1/2 -translate-x-1/2 obsidian-glass rounded-[3rem] h-[86px] flex items-center justify-between px-10 z-[100] w-[92%] border-white/[0.1] shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
          <NavButton icon={Terminal} active={activeView === 'partner'} onClick={() => setActiveView('partner')} />
          <NavButton icon={BrainCircuit} active={activeView === 'ai'} onClick={() => setActiveView('ai')} />
          
          <div className="relative -top-8">
            <div className="absolute -inset-12 bg-primary/40 blur-3xl animate-pulse-neon rounded-full" />
            <button 
              onClick={() => setActiveView('chats')}
              className={cn(
                "h-24 w-24 rounded-[3.5rem] flex items-center justify-center transition-all duration-700 relative z-20 border-2 shadow-2xl hover:scale-110 active:scale-90 neon-border",
                activeView === 'chats' ? "bg-primary text-white border-primary/50" : "bg-[#101014] text-white/30 border-white/10"
              )}
            >
              <MessageCircle className={cn("w-12 h-12", activeView === 'chats' && "fill-current")} />
            </button>
          </div>

          <NavButton icon={Wallet} active={activeView === 'wallet'} onClick={() => setActiveView('wallet')} />
          <NavButton icon={Settings} active={activeView === 'profile'} onClick={() => setActiveView('profile')} isProfile userId={user?.uid} />
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
    <button onClick={onClick} className={cn("group flex flex-col items-center gap-5 transition-all outline-none w-full", active ? "text-primary" : "text-muted-foreground/40 hover:text-white")}>
      <div className={cn(
        "w-20 h-20 rounded-[2.8rem] flex items-center justify-center transition-all duration-700 relative border border-transparent", 
        active ? "bg-primary/15 border-primary/50 shadow-[0_0_60px_rgba(168,85,247,0.5)] scale-110" : "hover:bg-white/5"
      )}>
        <Icon className={cn("w-10 h-10 transition-all duration-700", active ? "fill-current" : "group-hover:scale-110")} />
        {active && <div className="absolute -left-[45px] top-1/2 -translate-y-1/2 w-3 h-18 bg-primary rounded-r-full shadow-[0_0_40px_rgba(168,85,247,1)]" />}
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.6em] opacity-80 italic">{label}</span>
    </button>
  );
}

function NavButton({ icon: Icon, active, onClick, isProfile, userId }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full w-18 transition-all relative outline-none", active ? "text-primary" : "text-muted-foreground/30")}>
      {isProfile ? (
        <UserAvatar userId={userId} className={cn("h-11 w-11 border-2 transition-all duration-700", active ? "border-primary scale-110 shadow-2xl" : "border-transparent opacity-60")} />
      ) : (
        <Icon className={cn("w-10 h-10 transition-all duration-700", active ? "fill-current scale-110" : "scale-100")} />
      )}
      {active && <div className="absolute -bottom-5 w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_rgba(168,85,247,1)]" />}
    </button>
  );
}
