"use client"

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Message, Story, Track } from './types';

export type MainView = 'chats' | 'contacts' | 'calls' | 'profile' | 'archive' | 'music' | 'wallet' | 'games' | 'discovery' | 'ai' | 'partner';

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
  activeAccountIndex: number;
  setActiveAccountIndex: (index: number) => void;
  slotNames: string[];
  setSlotName: (index: number, name: string) => void;
  inspectedUserId: string | null;
  setInspectedUserId: (id: string | null) => void;
  isLegalOpen: boolean;
  setIsLegalOpen: (v: boolean) => void;
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  isPlayingMusic: boolean;
  setIsPlayingMusic: (v: boolean) => void;
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
  const [slotNames, setSlotNames] = useState<string[]>(['', '', '', '', '']);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedIndex = localStorage.getItem('nuxus_active_account_v31');
      if (savedIndex) setActiveAccountIndex(parseInt(savedIndex));
      
      const savedNames = localStorage.getItem('nuxus_slot_names');
      if (savedNames) {
        try {
          setSlotNames(JSON.parse(savedNames));
        } catch (e) {
          console.error("Failed to parse slot names");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nuxus_active_account_v31', activeAccountIndex.toString());
    }
  }, [activeAccountIndex]);

  const setSlotName = (index: number, name: string) => {
    setSlotNames(prev => {
      const newNames = [...prev];
      newNames[index] = name;
      localStorage.setItem('nuxus_slot_names', JSON.stringify(newNames));
      return newNames;
    });
  };
  
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [storiesToView, setStoriesToView] = useState<Story[] | null>(null);

  const value = useMemo(() => ({
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
    slotNames, setSlotName,
    isLegalOpen, setIsLegalOpen,
    inspectedUserId, setInspectedUserId,
    currentTrack, setCurrentTrack,
    isPlayingMusic, setIsPlayingMusic,
    isCreateStoryOpen, setIsCreateStoryOpen,
    storiesToView, setStoriesToView
  }), [
    currentChatId, activeView, forwardingMessage, activeCallId, localDrafts,
    is2FAVerified, isSettingsOpen, isSearchOpen, settingsTab,
    activeAccountIndex, slotNames, isLegalOpen, inspectedUserId, currentTrack,
    isPlayingMusic, isCreateStoryOpen, storiesToView
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppState = (): AppState => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppState: AppProvider is not ready.");
  return context;
};
