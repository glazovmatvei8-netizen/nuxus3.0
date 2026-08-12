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
 * CHAT MAIN V42.0 «OBSIDIAN SINGULARITY»
 * Глобальный редизайн с эффектом "iPhone будущего".
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
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/10 blur-[140px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/10 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.05)_0%,transparent_80%)]" />
      </div>

      <div className="flex-1 flex overflow-hidden w-full relative h-full z-10">
        
        {/* Main Interface Structure */}
        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[420px] lg:w-[480px] h-full flex-shrink-0 z-30 bg-black/40 backdrop-blur-[120px] border-r border-white/5 relative overflow-hidden transition-all duration-500", 
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
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 overflow-hidden transition-all duration-500 md:p-6 lg:p-10", 
            (!currentChatId || ['profile', 'wallet', 'ai', 'partner'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col bg-white/[0.01] md:rounded-[4rem] border border-white/5 shadow-[0_50px_150px_rgba(0,0,0,0.8)] animate-in fade-in duration-1000">
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-16 text-center space-y-12 opacity-30">
                   <div className="relative">
                      <div className="absolute -inset-16 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                      <div className="w-48 h-48 rounded-[4.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-inner relative z-10">
                         <MessageSquare className="w-20 h-20 text-primary" />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">NUXUS CORE</h2>
                      <p className="text-sm font-bold text-white/40 max-w-xs mx-auto uppercase tracking-[0.3em]">Выберите диалог для инициализации связи</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Nav (Mobile) */}
      {!currentChatId && (
        <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 obsidian-glass rounded-[4rem] h-22 flex items-center justify-between px-10 z-[100] w-[90%] shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
          <NavButton icon={Globe} active={activeView === 'discovery'} onClick={() => setActiveView('discovery')} />
          <NavButton icon={Phone} active={activeView === 'calls'} onClick={() => setActiveView('calls')} />
          
          <div className="relative -top-10">
            <button 
              onClick={() => setActiveView('chats')}
              className={cn(
                "h-22 w-22 rounded-[3.5rem] flex items-center justify-center transition-all duration-300 relative z-20 border shadow-2xl active:scale-90",
                activeView === 'chats' ? "bg-primary text-white border-white/20 shadow-primary/40" : "bg-[#121214] text-white/30 border-white/5"
              )}
            >
              <MessageSquare className={cn("w-10 h-10", activeView === 'chats' && "fill-current")} />
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
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center h-full w-16 transition-all relative", active ? "text-primary scale-125" : "text-white/20")}>
      {isProfile ? (
        <UserAvatar userId={userId} className={cn("h-11 w-11 border-2 transition-all", active ? "border-primary shadow-lg" : "border-transparent")} />
      ) : (
        <Icon className={cn("w-7 h-7", active && "fill-current")} />
      )}
    </button>
  );
}