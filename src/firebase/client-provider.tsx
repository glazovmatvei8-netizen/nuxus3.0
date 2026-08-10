
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { engine } from '@/lib/firebase-engine';

/**
 * ENGINE ACTIVATOR V12.0
 * ОПТИМИЗИРОВАНО: Полное исключение Hydration Mismatch через Phantom Mounting.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !engine.app || !engine.db || !engine.auth) {
    return (
      <>
        <div className="fixed inset-0 z-[10000] bg-[#020205] flex flex-col items-center justify-center gap-6">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
           <p className="text-[9px] font-black uppercase text-primary/40 tracking-[0.4em] animate-pulse">Syncing Engine V12</p>
        </div>
        <div className="invisible opacity-0 pointer-events-none">{children}</div>
      </>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={engine.app}
      auth={engine.auth}
      firestore={engine.db}
    >
      {children}
    </FirebaseProvider>
  );
}
