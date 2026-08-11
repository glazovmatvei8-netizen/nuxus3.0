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
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import { SettingsModal } from './modals/settings-modal';
import { GlobalSearchModal } from './modals/global-search-modal';
import { ForwardModal } from './modals/forward-modal';
import { UserProfileModal } from './modals/user-profile-modal';
import { UserAvatar } from './user-avatar';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import type { Call, User } from '@/lib/types';
import { 
  MessageSquare, Settings, Phone, Wallet, 
  Globe, Plus, LayoutGrid, UserPlus
} from 'lucide-react';

/**
 * CHAT MAIN V36.0 «SUPREME MULTI-LINK»
 * Глобальный переключатель аккаунтов теперь интегрирован в Sidebar.
 */
export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen, setCurrentChatId,
    activeAccountIndex, setActiveAccountIndex
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();

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
      
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.03)_0%,transparent_70%)]" />
      </div>

      <div className="flex-1 flex overflow-hidden w-full relative h-full z-10">
        
        {/* Command Nexus */}
        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[400px] lg:w-[440px] h-full flex-shrink-0 z-30 bg-black/40 backdrop-blur-3xl border-r border-white/5 relative overflow-hidden transition-all duration-500", 
            (currentChatId && !['profile', 'contacts', 'calls', 'wallet', 'discovery', 'ai', 'partner'].includes(activeView)) ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full animate-in fade-in slide-in-from-left-2 duration-700">
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
                      <div className="absolute -inset-10 bg-primary/10 blur-[80px] rounded-full" />
                      <div className="w-40 h-40 rounded-[4rem] bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-inner relative z-10">
                         <MessageSquare className="w-16 h-16 text-primary" />
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
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/[0.04] backdrop-blur-3xl rounded-[3rem] h-20 flex items-center justify-between px-8 z-[100] w-[92%] border border-white/10 shadow-2xl">
          <NavButton icon={Globe} active={activeView === 'discovery'} onClick={() => setActiveView('discovery')} />
          <NavButton icon={Phone} active={activeView === 'calls'} onClick={() => setActiveView('calls')} />
          
          <div className="relative -top-8">
            <button 
              onClick={() => setActiveView('chats')}
              className={cn(
                "h-20 w-20 rounded-[2.5rem] flex items-center justify-center transition-all duration-300 relative z-20 border shadow-2xl active:scale-90",
                activeView === 'chats' ? "bg-primary text-white border-white/20 shadow-primary/20" : "bg-[#121214] text-white/30 border-white/5"
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

function NavButton({ icon: Icon, active, onClick, isProfile, userId }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full w-14 transition-all relative", active ? "text-primary scale-125" : "text-white/20")}>
      {isProfile ? (
        <UserAvatar userId={userId} className={cn("h-10 w-10 border-2 transition-all", active ? "border-primary shadow-lg" : "border-transparent")} />
      ) : (
        <Icon className={cn("w-6 h-6", active && "fill-current")} />
      )}
    </button>
  );
}
