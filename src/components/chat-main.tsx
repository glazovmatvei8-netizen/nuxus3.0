
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
 * CHAT MAIN V48.0 «COMFORT & COMMAND»
 * ОБНОВЛЕНИЕ: Увеличены размеры кнопок навигации (Dock).
 * Оптимизирована эргономика для больших экранов и удобства нажатий.
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

      {/* Floating Bottom Nav (Mobile) - RE-SIZED FOR COMFORT */}
      {!currentChatId && (
        <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-[420px] animate-in slide-in-from-bottom-6 duration-700">
          <div className="bg-[#0c0c0e]/85 backdrop-blur-3xl rounded-[3rem] h-22 flex items-center justify-between px-10 shadow-[0_40px_100px_rgba(0,0,0,0.9)] border border-white/10 relative">
            <NavButton icon={Globe} active={activeView === 'discovery'} onClick={() => setActiveView('discovery')} />
            <NavButton icon={Phone} active={activeView === 'calls'} onClick={() => setActiveView('calls')} />
            
            <div className="relative">
              <button 
                onClick={() => setActiveView('chats')}
                className={cn(
                  "h-20 w-20 rounded-[1.8rem] flex items-center justify-center transition-all duration-300 relative z-20 border shadow-[0_20px_50px_rgba(var(--primary),0.3)] active:scale-90 -mt-12",
                  activeView === 'chats' ? "bg-primary text-white border-white/20" : "bg-[#161618] text-white/20 border-white/5"
                )}
              >
                <MessageSquare className={cn("w-9 h-9", activeView === 'chats' && "fill-current")} />
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
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full transition-all relative px-4", active ? "text-primary scale-110" : "text-white/20 hover:text-white/40")}>
      {isProfile ? (
        <div className={cn("rounded-2xl p-[2px] transition-all shadow-lg", active ? "bg-primary scale-110" : "bg-transparent")}>
           <UserAvatar userId={userId} className="h-10 w-10 rounded-xl" />
        </div>
      ) : (
        <Icon className={cn("w-8 h-8 transition-transform duration-300", active && "fill-current")} />
      )}
      {active && !isProfile && <div className="absolute -bottom-3 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary),1)]" />}
    </button>
  );
}
