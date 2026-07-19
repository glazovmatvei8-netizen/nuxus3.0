
"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Message, Story, Track } from './types';

export type MainView = 'chats' | 'contacts' | 'calls' | 'profile' | 'archive' | 'music' | 'wallet' | 'games' | 'discovery';

interface AppState {
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  activeView: MainView;
  setActiveView: (view: MainView) => void;
  forwardingMessage: Message | null;
  setForwardingMessage: (msg: Message | null) => void;
  activeCallId: string | null;
  setActiveCallId: (id: string | null) => void;
  localDrafts: Record<string, string>;
  setLocalDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  is2FAVerified: boolean;
  setIs2FAVerified: (v: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (v: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (v: boolean) => void;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  
  // Multi-Account Core
  activeAccountIndex: number;
  setActiveAccountIndex: (index: number) => void;
  
  // Legal State
  isLegalOpen: boolean;
  setIsLegalOpen: (v: boolean) => void;
  
  // User Inspection State
  inspectedUserId: string | null;
  setInspectedUserId: (id: string | null) => void;
  
  // Music State
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  isPlayingMusic: boolean;
  setIsPlayingMusic: (v: boolean) => void;
  
  // Story State
  isCreateStoryOpen: boolean;
  setIsCreateStoryOpen: (v: boolean) => void;
  storiesToView: Story[] | null;
  setStoriesToView: (stories: Story[] | null) => void;
}

export const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<MainView>('chats');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [is2FAVerified, setIs2FAVerified] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nuxus_active_index');
      if (saved) setActiveAccountIndex(parseInt(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nuxus_active_index', activeAccountIndex.toString());
  }, [activeAccountIndex]);
  
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [storiesToView, setStoriesToView] = useState<Story[] | null>(null);

  return (
    <AppContext.Provider value={{
      currentChatId, setCurrentChatId,
      activeView, setActiveView,
      forwardingMessage, setForwardingMessage,
      activeCallId, setActiveCallId,
      localDrafts, setLocalDrafts,
      is2FAVerified, setIs2FAVerified,
      isSettingsOpen, setIsSettingsOpen,
      isSearchOpen, setIsSearchOpen,
      settingsTab, setSettingsTab,
      activeAccountIndex, setActiveAccountIndex,
      isLegalOpen, setIsLegalOpen,
      inspectedUserId, setInspectedUserId,
      currentTrack, setCurrentTrack,
      isPlayingMusic, setIsPlayingMusic,
      isCreateStoryOpen, setIsCreateStoryOpen,
      storiesToView, setStoriesToView
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used within AppProvider');
  return context;
};
