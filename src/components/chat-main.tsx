
"use client"

import React, { useEffect, useMemo } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import ProfileView from './profile-view';
import WalletView from './wallet-view';
import DiscoveryView from './discovery-view';
<<<<<<< HEAD
=======
import NuxusAiView from './nuxus-ai-view';
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
import { useAppState } from '@/lib/app-state';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
<<<<<<< HEAD
  Globe, LayoutGrid
} from 'lucide-react';

/**
 * NUXUS CHAT MAIN V143.0 «PRIME NAVIGATION»
 * ОПТИМИЗИРОВАНО: 5 кнопок в нижней панели для идеального баланса на мобильных устройствах.
=======
  Globe, LayoutGrid, Sparkles
} from 'lucide-react';

/**
 * NUXUS CHAT MAIN V127.0 «PRESENCE HEARTBEAT»
 * Внедрен механизм обновления статуса "В сети" в реальном времени.
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
 */
export default function ChatMain() {
  const { 
    currentChatId, activeCallId, setActiveCallId, 
    activeView, setActiveView, isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen
  } = useAppState();
  const { user } = useUser();
  const db = useFirestore();

  // 1. PRESENCE HEARTBEAT
  useEffect(() => {
    if (!db || !user) return;

    const updatePresence = async () => {
      const userRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userRef, {
          lastSeen: new Date().toISOString()
        });
      } catch (e) {
<<<<<<< HEAD
        console.warn("Nuxus Presence: Heartbeat failed");
=======
        console.error("Nuxus Presence: Heartbeat failed", e);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      }
    };

    updatePresence(); // Сразу при входе
    const interval = setInterval(updatePresence, 30000); // Каждые 30 секунд

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

<<<<<<< HEAD
  // ГАРАНТИРОВАННЫЕ 5 КНОПОК ДЛЯ МОБИЛЬНОЙ ВЕРСИИ
=======
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
  const NAV_ITEMS = [
    { id: 'discovery', icon: Globe, label: 'EXPLORE' },
    { id: 'calls', icon: Phone, label: 'CALLS' },
    { id: 'chats', icon: MessageSquare, label: 'CHATS' },
<<<<<<< HEAD
=======
    { id: 'ai', icon: Sparkles, label: 'AI CORE' },
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
    { id: 'wallet', icon: Wallet, label: 'WALLET' },
    { id: 'profile', icon: LayoutGrid, label: 'NODES' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col w-screen bg-[#121212] overflow-hidden h-[100dvh] transition-colors duration-500">
      <NotificationListener />
      
      <div className="flex-1 flex overflow-hidden w-full relative h-full z-10">
        
        {/* Desktop Sidebar */}
        <nav className="hidden md:flex flex-col items-center py-8 w-20 bg-[#0a0a0c] border-r border-white/5 shrink-0 z-[100] gap-8 transform translate-z-0">
           <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 mb-4 shadow-sm">
              <LayoutGrid className="w-6 h-6 text-primary" />
           </div>
           
           <div className="flex flex-col gap-6 flex-1 items-center">
              {NAV_ITEMS.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className={cn(
                    "relative group p-3 rounded-2xl transition-all duration-200",
                    activeView === item.id ? "text-primary bg-white/5" : "text-muted-foreground hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-6 h-6", activeView === item.id && "fill-current")} />
                  {activeView === item.id && (
                    <div className="absolute -left-[1px] top-1/4 bottom-1/4 w-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(229,142,56,0.8)]" />
                  )}
                </button>
              ))}
           </div>
        </nav>

        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
<<<<<<< HEAD
            "w-full md:w-[400px] lg:w-[440px] h-full flex-shrink-0 z-30 bg-transparent border-r border-white/5 relative overflow-hidden transition-all duration-300", 
=======
            "w-full h-full flex-shrink-0 z-30 bg-transparent relative overflow-hidden transition-all duration-300", 
            activeView === 'ai' ? "w-full border-r-0" : "md:w-[400px] lg:w-[440px] border-r border-white/5",
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
            (currentChatId && activeView === 'chats') ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full contain-strict">
              {activeView === 'chats' && <ChatSidebar />}
              {activeView === 'contacts' && <ContactsView />}
              {activeView === 'calls' && <CallsView />}
<<<<<<< HEAD
=======
              {activeView === 'ai' && <NuxusAiView />}
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
              {activeView === 'profile' && <ProfileView />}
              {activeView === 'wallet' && <WalletView />}
              {activeView === 'discovery' && <DiscoveryView />}
            </div>
          </div>
          
<<<<<<< HEAD
          <div className={cn(
            "flex-1 h-full flex flex-col min-w-0 bg-[#0a0a0c]/50 relative z-20 overflow-hidden transition-all duration-300", 
            (!currentChatId || ['profile', 'wallet', 'discovery', 'calls'].includes(activeView)) ? "hidden md:flex" : "flex"
          )}>
            <div className="h-full w-full overflow-hidden flex flex-col bg-transparent contain-content">
=======
          {activeView !== 'ai' && (
            <div className={cn(
              "flex-1 h-full flex flex-col min-w-0 bg-[#0a0a0c]/50 relative z-20 overflow-hidden transition-all duration-300", 
              (!currentChatId || ['profile', 'wallet', 'discovery', 'calls'].includes(activeView)) ? "hidden md:flex" : "flex"
            )}>
              <div className="h-full w-full overflow-hidden flex flex-col bg-transparent contain-content">
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
              {currentChatId ? <ChatArea /> : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-16 text-center space-y-12 opacity-30">
                   <div className="relative">
                      <div className="absolute -inset-16 bg-primary/10 blur-[60px] rounded-full animate-pulse" />
                      <div className="w-48 h-48 rounded-[4.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-inner relative z-10">
                         <MessageSquare className="w-20 h-20 text-primary" />
                      </div>
                   </div>
                   <h2 className="text-4xl font-black text-white uppercase tracking-tight italic">NUXUS CORE</h2>
                </div>
              )}
            </div>
          </div>
<<<<<<< HEAD
        </div>
      </div>

      {/* MOBILE BOTTOM NAV - GUAARANTEED 5 BUTTONS FOR MAX COMFORT */}
=======
        )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      {(!currentChatId || activeView !== 'chats') && (
        <div className="md:hidden nuxus-floating-nav">
          {NAV_ITEMS.map((item) => (
             <NavButton 
               key={item.id}
               icon={item.icon} 
               label={item.label}
               active={activeView === item.id} 
<<<<<<< HEAD
               onClick={() => { triggerHaptic(); setActiveView(item.id as any); }} 
=======
               onClick={() => setActiveView(item.id as any)} 
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
               isProfile={item.id === 'profile'}
               userId={user?.uid}
             />
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

function NavButton({ icon: Icon, label, active, onClick, isProfile, userId }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
<<<<<<< HEAD
        "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative flex-1 min-w-0", 
=======
        "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 relative min-w-[60px]", 
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
        active ? "text-white" : "text-muted-foreground/60"
      )}
    >
      {active && <div className="nav-active-glow" />}
      <div className="relative">
        {isProfile ? (
          <div className={cn(
            "p-0.5 rounded-full border-2 transition-all duration-300",
            active ? "border-white shadow-md scale-110" : "border-white/10"
          )}>
            <UserAvatar userId={userId} className="h-6 w-6" />
          </div>
        ) : (
          <Icon className={cn("w-5 h-5", active && "fill-current scale-110")} />
        )}
      </div>
      <span className={cn(
<<<<<<< HEAD
        "text-[7px] font-black uppercase tracking-widest italic transition-colors truncate w-full",
=======
        "text-[8px] font-black uppercase tracking-widest italic transition-colors",
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
        active ? "text-primary" : "text-muted-foreground/40"
      )}>
        {label}
      </span>
    </button>
  );
}
