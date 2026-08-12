
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
import { useAppState } from '@/lib/store';
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
import { useAuth } from '@/firebase/provider';
import type { Call } from '@/lib/types';
import { 
  MessageSquare, Settings, Phone, Wallet, 
  Globe, Activity
} from 'lucide-react';

/**
 * CHAT MAIN V49.0 «AUTO-RESPONSE UI»
 * ОБНОВЛЕНИЕ: Полная адаптивность Dock под любые экраны.
 * Устранены выходы элементов за пределы видимости.
 */
export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen
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
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/5 blur-[140px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/5 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.03)_0%,transparent_80%)]" />
      </div>

      <div className="flex-1 flex overflow-hidden w-full relative h-full z-10">
        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[420px] lg:w-[480px] h-full flex-shrink-0 z-30 bg-black/40 backdrop-blur-[120px] border-r border-white/5 relative overflow-hidden transition-all duration-500", 
            (currentChatId && !['profile', 'contacts', 'calls', 'wallet', 'discovery', 'ai', 'partner'].includes(activeView)) ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full">
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
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 overflow-hidden transition-all duration-500 md:p-6 lg:p-10", 
            (!currentChatId || ['profile', 'wallet', 'ai', 'partner'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col bg-white/[0.01] md:rounded-[4rem] border border-white/5 shadow-[0_50px_150px_rgba(0,0,0,0.8)]">
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-16 text-center space-y-12 opacity-30">
                   <div className="relative">
                      <div className="absolute -inset-16 bg-primary/10 blur-[100px] rounded-full animate-pulse" />
                      <div className="w-48 h-48 rounded-[4.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-inner relative z-10">
                         <MessageSquare className="w-20 h-20 text-primary" />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <h2 className="text-4xl font-black text-white uppercase tracking-tight">NUXUS CORE</h2>
                      <p className="text-sm font-bold text-white/40 max-w-xs mx-auto uppercase tracking-[0.3em]">Выберите диалог для инициализации связи</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Nav (Mobile) - FULLY RESPONSIVE */}
      {!currentChatId && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[94%] max-w-[420px] animate-in slide-in-from-bottom-6 duration-700">
          <div className="bg-[#0c0c0e]/90 backdrop-blur-3xl rounded-[2.5rem] h-20 flex items-center justify-around px-2 shadow-[0_30px_80px_rgba(0,0,0,0.9)] border border-white/10 relative">
            <NavButton icon={Globe} active={activeView === 'discovery'} onClick={() => setActiveView('discovery')} />
            <NavButton icon={Phone} active={activeView === 'calls'} onClick={() => setActiveView('calls')} />
            
            <div className="relative -mt-10">
              <button 
                onClick={() => setActiveView('chats')}
                className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-300 relative z-20 border shadow-[0_15px_40px_rgba(var(--primary),0.4)] active:scale-90",
                  activeView === 'chats' ? "bg-primary text-white border-white/20" : "bg-[#161618] text-white/20 border-white/5"
                )}
              >
                <MessageSquare className={cn("w-7 h-7", activeView === 'chats' && "fill-current")} />
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

function NavButton({ icon: Icon, active, onClick, isProfile, userId }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full transition-all relative flex-1 min-w-0 px-2", active ? "text-primary scale-105" : "text-white/20 hover:text-white/40")}>
      {isProfile ? (
        <div className={cn("rounded-xl p-[1.5px] transition-all shadow-lg", active ? "bg-primary" : "bg-transparent")}>
           <UserAvatar userId={userId} className="h-8 w-8 rounded-lg" />
        </div>
      ) : (
        <Icon className={cn("w-7 h-7 transition-transform duration-300", active && "fill-current")} />
      )}
      {active && !isProfile && <div className="absolute -bottom-2 w-1 w-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),1)]" />}
    </button>
  );
}
