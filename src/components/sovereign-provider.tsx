
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { AppProvider } from '@/lib/app-state'; 
import { FirebaseProvider } from '@/firebase/provider';
import { Toaster } from '@/components/ui/toaster';
import { NuxusLogo } from '@/components/nuxus-logo';
import { ThemeApplier } from '@/components/theme-applier';
import { AppIconApplier } from '@/components/app-icon-applier';
import { OfflinePlaceholder } from '@/components/offline-placeholder';
import { Button } from '@/components/ui/button';
import { X, ShieldAlert } from 'lucide-react';

/**
 * SOVEREIGN PROVIDER V121.0 «UX STABILITY»
 * FIXED: Persistent cookie acceptance and session handling.
 */
export function SovereignProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Cookie Check - Persistence Fix
    const accepted = localStorage.getItem('nuxus_cookies_accepted_v121');
    if (!accepted) {
      const timer = setTimeout(() => setShowCookies(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('nuxus_cookies_accepted_v121', 'true');
    setShowCookies(false);
  };

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#010103] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <NuxusLogo size={80} className="opacity-20 animate-pulse" />
          <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.6em]">Nuxus Kernel V121.0</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <FirebaseProvider>
        <ThemeApplier />
        <AppIconApplier />
        <OfflinePlaceholder />
        <Toaster />
        
        <main className="relative h-[100dvh] w-full overflow-hidden bg-[#010103]">
          {children}
        </main>

        {showCookies && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-[#1c1c1e]/95 backdrop-blur-[60px] border border-white/10 p-6 rounded-[2.5rem] z-[10000] shadow-2xl animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <ShieldAlert className="w-5 h-5 text-primary animate-pulse" />
                   <span className="text-[11px] font-black uppercase text-white tracking-widest">Cookie Policy</span>
                </div>
                <button onClick={() => setShowCookies(false)} className="text-white/20 hover:text-white transition-colors"><X size={18} /></button>
              </div>
              <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase tracking-tight italic">
                Ядро использует зашифрованные куки для идентификации вашего узла и обеспечения 100% стабильности связи.
              </p>
              <Button onClick={acceptCookies} className="w-full h-12 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all">Принять условия</Button>
            </div>
          </div>
        )}
      </FirebaseProvider>
    </AppProvider>
  );
}
