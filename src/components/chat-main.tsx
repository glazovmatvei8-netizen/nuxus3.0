"use client"

import React, { useEffect, useMemo } from 'react';
import ChatSidebar from './chat-sidebar';
import ChatArea from './chat-area';
import ContactsView from './contacts-view';
import CallsView from './calls-view';
import ProfileView from './profile-view';
import WalletView from './wallet-view';
import DiscoveryView from './discovery-view';
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
import type { Call } from '@/lib/types';
import { 
  MessageSquare, Settings, Phone, Wallet, 
  Globe, LayoutGrid
} from 'lucide-react';

/**
 * CHAT MAIN V65.0 «AI ANNIHILATED»
 * ОБНОВЛЕНИЕ: ИИ удален навсегда. Док оптимизирован под 5 кнопок.
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

  const NAV_ITEMS = [
    { id: 'discovery', icon: Globe, label: 'Explore' },
    { id: 'calls', icon: Phone, label: 'Calls' },
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    { id: 'profile', icon: Settings, label: 'Node' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col w-screen bg-[#010103] overflow-hidden h-[100dvh]">
      <NotificationListener />
      
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/5 blur-[140px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/5 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.03)_0%,transparent_80%)]" />
      </div>

      <div className="flex-1 flex overflow-hidden w-full relative h-full z-10">
        
        <nav className="hidden md:flex flex-col items-center py-8 w-20 bg-black/60 border-r border-white/5 shrink-0 z-[100] gap-8">
           <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <LayoutGrid className="w-6 h-6 text-primary" />
           </div>
           
           <div className="flex flex-col gap-6 flex-1 items-center">
              {NAV_ITEMS.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className={cn(
                    "relative group p-3 rounded-2xl transition-all duration-300",
                    activeView === item.id ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "text-white/20 hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-6 h-6", activeView === item.id && "fill-current")} />
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap shadow-2xl z-[200]">
                    {item.label}
                  </div>
                </button>
              ))}
           </div>

           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="p-3 rounded-2xl text-white/20 hover:text-white transition-all hover:bg-white/5"
           >
              <UserAvatar userId={user?.uid} className="h-7 w-7 rounded-lg" />
           </button>
        </nav>

        <div className="flex-1 flex overflow-hidden h-full relative">
          <div className={cn(
            "w-full md:w-[400px] lg:w-[440px] h-full flex-shrink-0 z-30 bg-black/20 backdrop-blur-[120px] border-r border-white/5 relative overflow-hidden transition-all duration-500", 
            (currentChatId && activeView === 'chats') ? "hidden md:block" : "block"
          )}>
            <div className="h-full w-full">
              {activeView === 'chats' && <ChatSidebar />}
              {activeView === 'contacts' && <ContactsView />}
              {activeView === 'calls' && <CallsView />}
              {activeView === 'profile' && <ProfileView />}
              {activeView === 'wallet' && <WalletView />}
              {activeView === 'discovery' && <DiscoveryView />}
            </div>
          </div>
          
          <div className={cn(
            "flex-1 h-full flex flex-col min-w-0 bg-transparent relative z-20 overflow-hidden transition-all duration-500 md:p-6 lg:p-10", 
            (!currentChatId || ['profile', 'wallet', 'discovery', 'calls'].includes(activeView)) ? "hidden md:flex" : "flex"
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

      {(!currentChatId || activeView !== 'chats') && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[94%] max-w-[440px] animate-in slide-in-from-bottom-6 duration-700">
          <div className="bg-[#0c0c0e]/95 backdrop-blur-3xl rounded-[2.5rem] h-20 flex items-center justify-around px-1 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 relative">
            
            <NavButton icon={Globe} active={activeView === 'discovery'} onClick={() => setActiveView('discovery')} label="Explore" />
            <NavButton icon={Phone} active={activeView === 'calls'} onClick={() => setActiveView('calls')} label="Calls" />
            
            <div className="relative -mt-12 flex flex-col items-center group">
              <button 
                onClick={() => setActiveView('chats')}
                className={cn(
                  "h-16 w-16 rounded-[1.8rem] flex items-center justify-center transition-all duration-300 relative z-20 border shadow-[0_15px_40px_rgba(var(--primary),0.5)] active:scale-90",
                  activeView === 'chats' ? "bg-primary text-white border-white/20" : "bg-[#161618] text-white/40 border-white/10"
                )}
              >
                <MessageSquare className={cn("w-7 h-7", activeView === 'chats' && "fill-current")} />
              </button>
              <span className={cn("text-[7px] font-black uppercase tracking-widest mt-2 transition-colors", activeView === 'chats' ? "text-primary" : "text-white/20")}>Chats</span>
            </div>

            <NavButton icon={Wallet} active={activeView === 'wallet'} onClick={() => setActiveView('wallet')} label="Wallet" />
            <NavButton icon={Settings} active={activeView === 'profile'} onClick={() => setActiveView('profile')} isProfile userId={user?.uid} label="Node" />
          
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

function NavButton({ icon: Icon, active, onClick, isProfile, userId, label }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "flex flex-col items-center justify-center h-full transition-all relative flex-1 min-w-0 gap-1.5", 
        active ? "text-primary" : "text-white/20 hover:text-white/40"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all duration-300",
        active && !isProfile && "bg-primary/10 shadow-lg shadow-primary/5"
      )}>
        {isProfile ? (
          <div className={cn("rounded-lg p-[1px] transition-all", active ? "bg-primary shadow-lg shadow-primary/20" : "bg-transparent")}>
             <UserAvatar userId={userId} className="h-6 w-6 rounded-lg" />
          </div>
        ) : (
          <Icon className={cn("w-5 h-5 transition-transform duration-300", active && "scale-110", active && "fill-current")} />
        )}
      </div>
      
      <span className={cn(
        "text-[7px] font-black uppercase tracking-widest transition-colors",
        active ? "text-primary opacity-100" : "opacity-40"
      )}>
        {label}
      </span>

      {active && (
        <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),1)] animate-in fade-in zoom-in" />
      )}
    </button>
  );
}
