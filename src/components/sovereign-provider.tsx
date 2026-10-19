'use client';

import React, { useState, useEffect, type ReactNode, useRef } from 'react';
import { AppProvider } from '@/lib/app-state'; 
import { FirebaseProvider, useUser, useFirestore } from '@/firebase/provider';
import { Toaster } from '@/components/ui/toaster';
import { NuxusLogo } from '@/components/nuxus-logo';
import { ThemeApplier } from '@/components/theme-applier';
import { AppIconApplier } from '@/components/app-icon-applier';
import { OfflinePlaceholder } from '@/components/offline-placeholder';
import { Button } from '@/components/ui/button';
import { X, ShieldAlert } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn, triggerHaptic } from '@/lib/utils';
import { doc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { addDays } from 'date-fns';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { User } from '@/lib/types';

/**
 * SOVEREIGN PROVIDER V149.0 «ANTI-CRASH GUARD»
 * ОПТИМИЗИРОВАНО: Cleaned from merge conflict markers.
 */
function SubscriptionGuard({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const db = useFirestore();
  const userRef = React.useMemo(() => (!db || !user) ? null : doc(db, 'users', user.uid), [db, user?.uid]);
  const { data: profile } = useDoc<User>(userRef);
  
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      hasCheckedRef.current = false;
      return;
    }

    if (!db || !user || !profile || hasCheckedRef.current) return;

    const checkRenewal = async () => {
      hasCheckedRef.current = true;

      const isExpired = profile.premiumUntil && new Date(profile.premiumUntil) < new Date();
      
      if (isExpired && profile.autoRenew && profile.premiumTier && profile.premiumTier !== 'none') {
        const price = profile.premiumTier === 'plus' ? 299 : 500;
        const planName = profile.premiumTier === 'plus' ? 'Nuxus Plus' : 'Nuxus One+';

        if ((profile.balance || 0) >= price) {
          try {
            const nextExpiry = addDays(new Date(), 30).toISOString();
            await updateDoc(doc(db, 'users', user.uid), {
              balance: increment(-price),
              premiumUntil: nextExpiry,
              isPremium: true
            });

            await addDoc(collection(db, 'users', user.uid, 'transactions'), {
              amount: -price,
              type: 'subscription_renewal',
              status: 'completed',
              otherPartyName: `${planName} (Автопродление)`,
              createdAt: new Date().toISOString()
            });

            console.log(`🛰️ Nuxus Kernel: Subscription ${planName} auto-renewed until ${nextExpiry}`);
          } catch (e) {
            console.error("Nuxus Kernel: Auto-renewal failed", e);
          }
        } else {
          await updateDoc(doc(db, 'users', user.uid), {
            isPremium: false,
            premiumTier: 'none',
            autoRenew: false
          });
        }
      }
    };

    checkRenewal();
  }, [profile?.id, user?.uid, db]);

  return <>{children}</>;
}

export function SovereignProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const accepted = localStorage.getItem('nuxus_cookies_accepted_v123');
    if (!accepted) {
      const timer = setTimeout(() => setShowCookies(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('nuxus_cookies_accepted_v123', 'true');
    setShowCookies(false);
  };

  return (
    <AppProvider>
      <FirebaseProvider>
        <SubscriptionGuard>
          <TooltipProvider delayDuration={0}>
            <ThemeApplier />
            <AppIconApplier />
            <OfflinePlaceholder />
            <Toaster />
            
            <main className="relative h-[100dvh] w-full overflow-hidden bg-[#010103]">
              {children}
            </main>

            <div className={cn(
              "fixed inset-0 z-[10000] bg-[#010103] flex flex-col items-center justify-center transition-opacity duration-1000 pointer-events-none",
              mounted ? "opacity-0" : "opacity-100"
            )}>
              <div className="flex flex-col items-center gap-6">
                <NuxusLogo size={80} className="opacity-20 animate-pulse" />
                <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.6em]">Nuxus Kernel V155.0</p>
              </div>
            </div>

            {mounted && showCookies && (
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
                    Ядро использует зашифрованные куки для идентификации вашего узла и обеспечения стабильности связи.
                  </p>
                  <Button onClick={acceptCookies} className="w-full h-12 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all">Принять условия</Button>
                </div>
              </div>
            )}
          </TooltipProvider>
        </SubscriptionGuard>
      </FirebaseProvider>
    </AppProvider>
  );
}