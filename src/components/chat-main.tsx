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
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, query, where, limit, doc, updateDoc } from 'firebase/firestore';
import { CallOverlay } from './modals/call-overlay';
import { NotificationListener } from './notification-listener';
import { SettingsModal } from './modals/settings-modal';
import { GlobalSearchModal } from './modals/global-search-modal';
import { ForwardModal } from './modals/forward-modal';
import { UserProfileModal } from './modals/user-profile-modal';
import type { Call, User as UserType } from '@/lib/types';
import { 
  MessageSquare, Wallet, Globe, LayoutGrid, ShieldCheck, Zap
} from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';

export default function ChatMain() {
  const { t } = useTranslations();
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<UserType>(userProfileRef);

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
    return query(collection(db, 'calls'), where('receiverId', '==', user.uid), where('status', '==', 'calling'), limit(1));
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

  const navStyleClass = useMemo(() => {
    const style = profile?.settings?.navStyle || 'liquid';
    if (style === 'neon') return 'mig-nav-neon';
    if (style === 'stealth') return 'mig-nav-stealth';
    return 'mig-nav-liquid';
  }, [profile?.settings?.navStyle]);

  return (
    <div className="fixed inset-0 flex flex-col w-screen bg-background overflow-hidden h-[100dvh]">
      <NotificationListener />
      
      <div className="flex-1 flex overflow-hidden w-full relative h-full">
        {/* Modern Command Rail */}
        <nav className="hidden lg:flex flex-col items-center py-12 w-28 bg-black/40 border-r border-white/5 shrink-0 z-[100] gap-12 backdrop-blur-[40px]">
           <div className="p-4 rounded-[1.8rem] bg-primary/15 border border-primary/20 sonic-glow group cursor-pointer transition-all active:scale-90" onClick={() => window.location.reload()}>
              <Zap className="w-8 h-8 text-primary fill-current group-hover:scale-110 transition-transform duration-500" />
           </div>
           <div className="flex flex-col gap-8 flex-1 items-center">
              {NAV_ITEMS.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => { triggerHaptic(); setActiveView(item.id as any); }}
                  className={cn(
                    "relative p-5 rounded-[1.8rem] transition-all duration-500 group",
                    activeView === item.id 
                      ? "text-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.2)]" 
                      : "text-white/20 hover:text-white/60 hover:bg-white/[0.04]"
                  )}
                >
                  <item.icon className={cn("w-7 h-7", activeView === item.id && "fill-current")} />
                  {activeView === item.id && (
                    <div className="absolute -left-2 top-1/3 bottom-1/3 w-1 bg-primary rounded-full sonic-glow" />
                  )}
                  <span className="absolute left-full ml-4 px-3 py-1.5 bg-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[200]">
                    {item.label}
                  </span>
                </button>
              ))}
           </div>
        </nav>

        <div className="flex-1 flex overflow-hidden h-full relative">
          {/* Unified Explorer Layer */}
          <div className={cn(
            "w-full lg:w-[480px] h-full flex-shrink-0 z-30 bg-black/20 border-r border-white/5 relative overflow-hidden transition-all duration-700", 
            (currentChatId && activeView === 'chats') ? "hidden lg:block" : "block"
          )}>
            <div className="h-full w-full titanium-gradient">
              {activeView === 'chats' && <ChatSidebar />}
              {activeView === 'discovery' && <DiscoveryView />}
              {activeView === 'ai' && <KernelShieldView />}
              {activeView === 'wallet' && <WalletView />}
              {activeView === 'profile' && <ProfileView />}
              {activeView === 'calls' && <CallsView />}
            </div>
          </div>
          
          {/* Signal Stream Layer */}
          <div className={cn(
            "flex-1 h-full flex flex-col min-w-0 bg-[#050508]/40 relative z-20 overflow-hidden", 
            (!currentChatId || ['profile', 'wallet', 'discovery', 'ai'].includes(activeView)) ? "hidden lg:flex" : "flex"
          )}>
            {currentChatId ? <ChatArea /> : (
              <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-20 text-center space-y-10">
                 <div className="relative">
                    <div className="absolute -inset-24 bg-primary/5 blur-[120px] rounded-full animate-pulse" />
                    <Zap className="w-40 h-40 text-primary relative z-10 opacity-5" />
                 </div>
                 <h2 className="text-6xl font-black text-white/5 uppercase tracking-[0.5em] italic">MIG CORE</h2>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Navigation (Mobile/Tablet) */}
      {(!currentChatId || activeView !== 'chats') && (
        <div className={cn("lg:hidden mig-floating-nav", navStyleClass)}>
          {NAV_ITEMS.map((item) => (
             <button 
               key={item.id}
               onClick={() => { triggerHaptic(); setActiveView(item.id as any); }}
               className="flex flex-col items-center justify-center gap-1.5 transition-all duration-500 relative flex-1 h-full rounded-2xl"
             >
               <item.icon className={cn(
                 "w-6 h-6 transition-transform duration-500", 
                 activeView === item.id ? "text-primary scale-110 fill-current" : "text-white/30"
               )} />
               <span className={cn(
                 "text-[8px] font-black uppercase tracking-widest transition-all",
                 activeView === item.id ? "text-primary opacity-100" : "text-white/20 opacity-60"
               )}>
                 {item.label}
               </span>
               {activeView === item.id && (
                 <div className="absolute bottom-1 w-6 h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(0,212,255,0.8)]" />
               )}
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