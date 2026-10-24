"use client"

import React, { useEffect, useMemo } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import ProfileView from './profile-view';
import WalletView from './wallet-view';
import DiscoveryView from './discovery-view';
import KernelShieldView from './kernel-shield-view';
import { useAppState } from '@/lib/app-state';
import { cn, triggerHaptic } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, limit, doc, updateDoc } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import { SettingsModal } from './modals/settings-modal';
import { GlobalSearchModal } from './modals/global-search-modal';
import { ForwardModal } from './modals/forward-modal';
import { UserProfileModal } from './modals/user-profile-modal';
import type { Call } from '@/lib/types';
import { 
  MessageSquare, Phone, Wallet, 
  Globe, LayoutGrid, ShieldCheck, Zap
} from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';

/**
 * MIG MAIN UI V194.0 «AERO-FLUID»
 * ОПТИМИЗИРОВАНО: Премиальный стеклянный интерфейс и плавная навигация.
 */
export default function ChatMain() {
  const { t } = useTranslations();
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    if (!db || !user) return;
    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), { lastSeen: new Date().toISOString() });
      } catch (e) {}
    };
    updatePresence();
    const interval = setInterval(updatePresence, 45000);
    return () => clearInterval(interval);
  }, [db, user?.uid]);

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

  const NAV_ITEMS = [
    { id: 'chats', icon: MessageSquare, label: t('app.chats') },
    { id: 'discovery', icon: Globe, label: t('app.explore') },
    { id: 'ai', icon: ShieldCheck, label: t('app.shield') },
    { id: 'wallet', icon: Wallet, label: t('app.wallet') },
    { id: 'profile', icon: LayoutGrid, label: t('app.profile') },
  ];

  return (
    <div className="fixed inset-0 flex flex-col w-screen bg-[#010103] overflow-hidden h-[100dvh]">
      <NotificationListener />
      
      <div className="flex-1 flex overflow-hidden w-full relative h-full">
        {/* Desktop Rail Navigation */}
        <nav className="hidden md:flex flex-col items-center py-10 w-24 bg-black/40 border-r border-white/5 shrink-0 z-[100] gap-10 backdrop-blur-3xl">
           <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 sonic-glow animate-pulse">
              <Zap className="w-6 h-6 text-primary fill-current" />
           </div>
           <div className="flex flex-col gap-6 flex-1 items-center">
              {NAV_ITEMS.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => { triggerHaptic(); setActiveView(item.id as any); }}
                  className={cn(
                    "relative group p-4 rounded-[1.5rem] transition-all duration-300",
                    activeView === item.id ? "text-primary bg-primary/10 shadow-lg" : "text-white/20 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-6 h-6", activeView === item.id && "fill-current")} />
                  {activeView === item.id && (
                    <div className="absolute -left-2 top-1/4 bottom-1/4 w-1 bg-primary rounded-full sonic-glow" />
                  )}
                </button>
              ))}
           </div>
        </nav>

        <div className="flex-1 flex overflow-hidden h-full relative">
          {/* Main Sidebar (List) */}
          <div className={cn(
            "w-full md:w-[420px] h-full flex-shrink-0 z-30 bg-transparent border-r border-white/5 relative overflow-hidden transition-all duration-500", 
            (currentChatId && activeView === 'chats') ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full">
              {activeView === 'chats' && <ChatSidebar />}
              {activeView === 'discovery' && <DiscoveryView />}
              {activeView === 'ai' && <KernelShieldView />}
              {activeView === 'wallet' && <WalletView />}
              {activeView === 'profile' && <ProfileView />}
              {activeView === 'calls' && <CallsView />}
            </div>
          </div>
          
          {/* Chat Content View */}
          <div className={cn(
            "flex-1 h-full flex flex-col min-w-0 bg-black/20 relative z-20 overflow-hidden", 
            (!currentChatId || ['profile', 'wallet', 'discovery', 'ai'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            {currentChatId ? <ChatArea /> : (
              <div className="hidden md:flex flex-1 flex-col items-center justify-center p-16 text-center space-y-8 opacity-10">
                 <div className="relative">
                    <div className="absolute -inset-20 bg-primary/5 blur-[100px] rounded-full" />
                    <Zap className="w-32 h-32 text-primary relative z-10" />
                 </div>
                 <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">MIG KERNEL</h2>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {(!currentChatId || activeView !== 'chats') && (
        <div className="md:hidden mig-floating-nav">
          {NAV_ITEMS.map((item) => (
             <button 
               key={item.id}
               onClick={() => { triggerHaptic(); setActiveView(item.id as any); }}
               className={cn(
                 "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative flex-1 h-full rounded-full", 
                 activeView === item.id ? "text-primary scale-110" : "text-white/20"
               )}
             >
               <item.icon className={cn("w-6 h-6", activeView === item.id && "fill-current")} />
               <span className={cn(
                 "text-[8px] font-black uppercase tracking-widest",
                 activeView === item.id ? "opacity-100" : "opacity-0"
               )}>
                 {item.label}
               </span>
             </button>
          ))}
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