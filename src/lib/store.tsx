"use client"

import React, { createContext, useContext, useState } from 'react';
import type { Message } from './types';

interface AppState {
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  forwardingMessage: Message | null;
  setForwardingMessage: (msg: Message | null) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

  return (
    <AppContext.Provider value={{
      currentChatId,
      setCurrentChatId,
      forwardingMessage,
      setForwardingMessage
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
