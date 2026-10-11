
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
import { X } from 'lucide-react';

/**
 * SOVEREIGN PROVIDER V110.0 «UX COMPLETE»
 * Added Cookie Policy Banner and Global Back Navigation Fix.
 */
export function SovereignProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Cookie Check
    const accepted = localStorage.getItem('nuxus_cookies_accepted');
    if (!accepted) setShowCookies(true);

    // Prevent default context menu
    const preventDefault = (e: Event) => {
       // Allow in inputs
    };
    document.addEventListener('contextmenu', preventDefault);

    // Global History Listener to prevent "exit app" on back swipe
    const handlePopState = (e: PopStateEvent) => {
       // Simple guard to keep user in SPA
       window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('nuxus_cookies_accepted', 'true');
    setShowCookies(false);
  };

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#010103] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <NuxusLogo size={80} className="opacity-20 animate-pulse" />
          <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.6em]">Nuxus Kernel V119.0</p>
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
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 p-5 rounded-[2.5rem] z-[5000] shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Cookie Policy</span>
                <button onClick={() => setShowCookies(false)} className="text-white/20 hover:text-white"><X size={16} /></button>
              </div>
              <p className="text-[9px] font-bold text-white/60 leading-relaxed uppercase tracking-tight">
                Nuxus использует куки для обеспечения безопасности и стабильности вашего узла. Продолжая использование, вы соглашаетесь с нашей политикой.
              </p>
              <Button onClick={acceptCookies} className="w-full h-11 bg-primary text-white rounded-xl font-black uppercase text-[9px] tracking-widest">Принимаю</Button>
            </div>
          </div>
        )}
      </FirebaseProvider>
    </AppProvider>
  );
}
