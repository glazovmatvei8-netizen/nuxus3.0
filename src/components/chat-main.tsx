"use client"

import React, { useEffect, useMemo } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import ProfileView from './profile-view';
import WalletView from './wallet-view';
import GamesView from './games-view';
import DiscoveryView from './discovery-view';
import NuxusAiView from './nuxus-ai-view';
import PartnerView from './partner-view';
import { useAppState } from '@/lib/store.tsx';
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
  MessageCircle, Settings, Phone, Music, Wallet, 
  Gamepad2, Compass, BrainCircuit, Terminal, 
  Zap, Shield, LayoutGrid, Activity, Star
} from 'lucide-react';

/**
 * CHAT MAIN V24.0 «COMMAND CENTER»
 * Полный редизайн интерфейса. Глубокое погружение в кибер-эстетику Nebula Glass.
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
      
      {/* Neural Link Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20" />
        <div className="absolute top-[-30%] left-[-20%] w-[100%] h-[100%] bg-primary/10 blur-[200px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-accent/5 blur-[150px] rounded-full" />
      </div>

      <div className="flex-1 flex overflow-hidden w-full relative h-full z-10">
        
        {/* Neural Rail V24.0 */}
        <div className="hidden md:flex w-[110px] h-full flex-col items-center py-12 nebula-panel border-r border-white/[0.03] shrink-0 z-50">
          <div 
            className="mb-16 cursor-pointer active:scale-90 transition-all relative group" 
            onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}
          >
            <div className="absolute -inset-8 bg-primary/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="w-16 h-16 quantum-card flex items-center justify-center relative z-10 border-primary/40 shadow-2xl neon-glow-primary">
              <Zap className="w-8 h-8 text-primary animate-signal" />
            </div>
          </div>
          
          <div className="flex flex-col gap-10 flex-1 overflow-y-auto no-scrollbar py-2 w-full px-4">
            <RailButton icon={MessageCircle} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} />
            <RailButton icon={BrainCircuit} active={activeView === 'ai'} onClick={() => { setActiveView('ai'); setCurrentChatId(null); }} />
            <RailButton icon={Compass} active={activeView === 'discovery'} onClick={() => { setActiveView('discovery'); setCurrentChatId(null); }} />
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} />
          </div>

          <div className="mt-auto flex flex-col items-center gap-8 pb-6">
            <button 
              onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} 
              className={cn(
                "relative transition-all duration-500 p-1.5 rounded-full border-2", 
                activeView === 'profile' ? "border-primary scale-110 neon-glow-primary" : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              <UserAvatar userId={user?.uid} className="h-14 w-14" />
            </button>
          </div>
        </div>

        {/* Unified Viewport V24.0 */}
        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[440px] lg:w-[480px] h-full flex-shrink-0 z-30 bg-black/20 backdrop-blur-[80px] border-r border-white/5 relative overflow-hidden transition-all duration-700", 
            (currentChatId && !['profile', 'contacts', 'calls', 'wallet', 'discovery', 'ai', 'partner'].includes(activeView)) ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full animate-in fade-in slide-in-from-left-8 duration-700">
              {activeView === 'chats' && <ChatSidebar />}
              {activeView === 'contacts' && <ContactsView />}
              {activeView === 'calls' && <CallsView />}
              {activeView === 'profile' && <ProfileView />}
              {activeView === 'wallet' && <WalletView />}
              {activeView === 'games' && <GamesView />}
              {activeView === 'discovery' && <DiscoveryView />}
              {activeView === 'ai' && <NuxusAiView />}
              {activeView === 'partner' && <PartnerView />}
            </div>
          </div>
          
          <div className={cn(
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 overflow-hidden transition-all duration-700 md:px-10 py-6", 
            (!currentChatId || ['profile', 'wallet', 'ai', 'partner'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col nebula-panel md:rounded-[4rem] border-white/[0.08] shadow-[0_80px_200px_rgba(0,0,0,1)] animate-in fade-in zoom-in-98 duration-1000">
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 text-center space-y-16 opacity-30">
                   <div className="relative">
                      <div className="absolute -inset-24 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                      <div className="w-56 h-56 quantum-card flex items-center justify-center shadow-2xl border-white/10 relative z-10">
                        <Activity className="w-28 h-28 text-primary animate-signal" />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <h2 className="text-4xl font-black uppercase italic tracking-[1em] text-white drop-shadow-2xl">ORIGIN</h2>
                      <p className="text-[12px] font-black uppercase tracking-[0.6em] text-primary/60 italic">Quantum Signal Idle...</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tactical Bottom Nav (Mobile) V24.0 */}
      {!currentChatId && (
        <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 nebula-panel rounded-[3rem] h-[84px] flex items-center justify-between px-10 z-[100] w-[90%] border-white/[0.12] shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
          <NavButton icon={Compass} active={activeView === 'discovery'} onClick={() => setActiveView('discovery')} />
          <NavButton icon={BrainCircuit} active={activeView === 'ai'} onClick={() => setActiveView('ai')} />
          
          <div className="relative -top-10">
            <div className="absolute -inset-10 bg-primary/40 blur-3xl animate-pulse rounded-full" />
            <button 
              onClick={() => setActiveView('chats')}
              className={cn(
                "h-22 w-22 rounded-[3.2rem] flex items-center justify-center transition-all duration-500 relative z-20 border-2 shadow-2xl active:scale-90 neon-glow-primary",
                activeView === 'chats' ? "bg-primary text-white border-primary/50" : "bg-[#0a0a0c] text-white/30 border-white/10"
              )}
            >
              <MessageCircle className={cn("w-11 h-11", activeView === 'chats' && "fill-current")} />
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

function RailButton({ icon: Icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "group h-18 w-18 btn-tactile rounded-[2rem] flex items-center justify-center border transition-all duration-500", 
        active 
          ? "bg-primary/20 border-primary/50 text-primary neon-glow-primary scale-110" 
          : "bg-white/5 border-transparent text-white/20 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className={cn("w-8 h-8 transition-all duration-500", active ? "fill-current scale-110" : "group-hover:scale-110")} />
    </button>
  );
}

function NavButton({ icon: Icon, active, onClick, isProfile, userId }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full w-16 transition-all relative btn-tactile", active ? "text-primary scale-110" : "text-white/20")}>
      {isProfile ? (
        <UserAvatar userId={userId} className={cn("h-10 w-10 border-2 transition-all", active ? "border-primary shadow-lg" : "border-transparent")} />
      ) : (
        <Icon className={cn("w-8 h-8", active && "fill-current")} />
      )}
    </button>
  );
}
