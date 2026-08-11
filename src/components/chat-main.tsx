
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
import { useUser, useFirestore, useCollection } from '@/firebase';
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

/**
 * CHAT MAIN V30.0 «MODERN MINIMALISM»
 * РЕДИЗАЙН: Чистый, дорогой интерфейс. Удаление визуального шума.
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
      
      <div className="flex-1 flex overflow-hidden w-full relative h-full z-10">
        
        {/* Modern Rail (Sidebar for Desktop) */}
        <div className="hidden md:flex w-[100px] h-full flex-col items-center py-10 bg-white/[0.01] border-r border-white/5 shrink-0 z-50 shadow-2xl">
          <div 
            className="mb-14 cursor-pointer active:scale-90 transition-all relative group" 
            onClick={() => { setActiveView('chats'); setCurrentChatId(null); }}
          >
            <div className="w-14 h-14 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center shadow-xl group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all">
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          
          <div className="flex flex-col gap-8 flex-1 overflow-y-auto no-scrollbar py-2 w-full px-5">
            <RailButton icon={MessageSquare} active={activeView === 'chats'} onClick={() => { setActiveView('chats'); setCurrentChatId(null); }} />
            <RailButton icon={Globe} active={activeView === 'discovery'} onClick={() => { setActiveView('discovery'); setCurrentChatId(null); }} />
            <RailButton icon={Phone} active={activeView === 'calls'} onClick={() => { setActiveView('calls'); setCurrentChatId(null); }} />
            <RailButton icon={Wallet} active={activeView === 'wallet'} onClick={() => { setActiveView('wallet'); setCurrentChatId(null); }} />
          </div>

          <div className="mt-auto flex flex-col items-center gap-8 pb-4">
            <button 
              onClick={() => { setActiveView('profile'); setCurrentChatId(null); }} 
              className={cn(
                "relative transition-all duration-300 p-1 rounded-full border-2", 
                activeView === 'profile' ? "border-blue-500 scale-110 shadow-lg" : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              <UserAvatar userId={user?.uid} className="h-12 w-12" />
            </button>
          </div>
        </div>

        {/* Command Nexus */}
        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[420px] lg:w-[460px] h-full flex-shrink-0 z-30 bg-black/20 backdrop-blur-3xl border-r border-white/5 relative overflow-hidden transition-all duration-500", 
            (currentChatId && !['profile', 'contacts', 'calls', 'wallet', 'discovery', 'ai', 'partner'].includes(activeView)) ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full animate-in fade-in duration-700">
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
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 overflow-hidden transition-all duration-500 md:p-6 lg:p-8", 
            (!currentChatId || ['profile', 'wallet', 'ai', 'partner'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col bg-white/[0.01] md:rounded-[3rem] border border-white/5 shadow-2xl animate-in fade-in duration-1000">
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-16 text-center space-y-8 opacity-40">
                   <div className="relative">
                      <div className="absolute -inset-10 bg-blue-500/10 blur-[80px] rounded-full" />
                      <div className="w-40 h-40 rounded-[4rem] bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-inner relative z-10">
                         <MessageSquare className="w-16 h-16 text-blue-500" />
                      </div>
                   </div>
                   <div className="space-y-4">
                      <h2 className="text-3xl font-bold text-white tracking-tight">Выберите чат</h2>
                      <p className="text-sm font-medium text-white/40 max-w-xs mx-auto">Начните общение с друзьями или создайте новую группу.</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Nav (Mobile) */}
      {!currentChatId && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/[0.04] backdrop-blur-2xl rounded-[3rem] h-20 flex items-center justify-between px-8 z-[100] w-[92%] border border-white/10 shadow-2xl">
          <NavButton icon={Globe} active={activeView === 'discovery'} onClick={() => setActiveView('discovery')} />
          <NavButton icon={Phone} active={activeView === 'calls'} onClick={() => setActiveView('calls')} />
          
          <div className="relative -top-8">
            <button 
              onClick={() => setActiveView('chats')}
              className={cn(
                "h-20 w-20 rounded-[2.5rem] flex items-center justify-center transition-all duration-300 relative z-20 border shadow-2xl active:scale-90",
                activeView === 'chats' ? "bg-blue-600 text-white border-white/20 shadow-blue-500/20" : "bg-[#121214] text-white/30 border-white/5"
              )}
            >
              <MessageSquare className={cn("w-9 h-9", activeView === 'chats' && "fill-current")} />
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
        "group h-14 w-14 rounded-2xl flex items-center justify-center border transition-all duration-300", 
        active 
          ? "bg-blue-600 text-white border-white/10 shadow-lg scale-110" 
          : "bg-white/5 border-transparent text-white/20 hover:bg-white/[0.08] hover:text-white"
      )}
    >
      <Icon className={cn("w-6 h-6 transition-all", active ? "fill-current" : "group-hover:scale-110")} />
    </button>
  );
}

function NavButton({ icon: Icon, active, onClick, isProfile, userId }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full w-14 transition-all relative", active ? "text-blue-500 scale-125" : "text-white/20")}>
      {isProfile ? (
        <UserAvatar userId={userId} className={cn("h-10 w-10 border-2 transition-all", active ? "border-blue-500 shadow-lg" : "border-transparent")} />
      ) : (
        <Icon className={cn("w-6 h-6", active && "fill-current")} />
      )}
    </button>
  );
}
