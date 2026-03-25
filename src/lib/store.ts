"use client"

import React, { createContext, useContext, useState } from 'react';
import type { Message, Story, Track } from './types';

export type MainView = 'chats' | 'contacts' | 'calls' | 'profile' | 'archive' | 'music' | 'wallet' | 'discovery' | 'games';

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
  
  // Update State
  isUpdateDeferred: boolean;
  setIsUpdateDeferred: (v: boolean) => void;
  
  // User Inspection State
  inspectedUserId: string | null;
  setInspectedUserId: (id: string | null) => void;
  
  // Music State
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  isPlayingMusic: boolean;
  setIsPlayingMusic: (v: boolean) => void;
  
  // Story State
  activeStoryId: string | null;
  setActiveStoryId: (id: string | null) => void;
  isCreateStoryOpen: boolean;
  setIsCreateStoryOpen: (v: boolean) => void;
  storiesToView: Story[] | null;
  setStoriesToView: (stories: Story[] | null) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

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
  const [isUpdateDeferred, setIsUpdateDeferred] = useState(false);
  
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [storiesToView, setStoriesToView] = useState<Story[] | null>(null);

  return (
    <AppContext.Provider value={{
      currentChatId,
      setCurrentChatId,
      activeView,
      setActiveView,
      forwardingMessage,
      setForwardingMessage,
      activeCallId,
      setActiveCallId,
      localDrafts,
      setLocalDrafts,
      is2FAVerified,
      setIs2FAVerified,
      isSettingsOpen,
      setIsSettingsOpen,
      isSearchOpen,
      setIsSearchOpen,
      settingsTab,
      setSettingsTab,
      isUpdateDeferred,
      setIsUpdateDeferred,
      inspectedUserId,
      setInspectedUserId,
      currentTrack,
      setCurrentTrack,
      isPlayingMusic,
      setIsPlayingMusic,
      activeStoryId,
      setActiveStoryId,
      isCreateStoryOpen,
      setIsCreateStoryOpen,
      storiesToView,
      setStoriesToView
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
