"use client"

import React, { createContext, useContext, useState } from 'react';

interface AppState {
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  return (
    <AppContext.Provider value={{
      currentChatId,
      setCurrentChatId,
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
