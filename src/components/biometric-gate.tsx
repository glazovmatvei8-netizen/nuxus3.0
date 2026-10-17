
'use client';

import React, { useState, useEffect } from 'react';
import { checkBiometric } from '@/services/biometric-service';
import { NuxusLogo } from './nuxus-logo';
import { Fingerprint, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Глобальный биометрический заслон Nuxus V24.0.
 * Блокирует интерфейс до успешного сканирования Face ID в нативном приложении.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Проверка окружения Capacitor
    const isCap = typeof window !== 'undefined' && (window as any).Capacitor;
    setIsNative(!!isCap);

    if (isCap) {
      handleUnlock();
    } else {
      setIsLocked(false); // В браузере/PWA пропускаем на основной интерфейс (там своя 2FA)
    }
  }, []);

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    const ok = await checkBiometric();
    if (ok) {
      setIsLocked(false);
    }
    setIsAuthenticating(false);
  };

  if (isLocked && isNative) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#020203] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
        
        <div className="relative z-10 space-y-12 w-full max-w-sm">
          <div className="flex flex-col items-center gap-6">
            <NuxusLogo size={140} />
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-tight">Ядро Заблокировано</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Hardware Encryption Active</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 w-24 h-24 rounded-[2.8rem] flex items-center justify-center mx-auto shadow-2xl relative">
            {isAuthenticating ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <Fingerprint className="w-10 h-10 text-primary animate-pulse" />
            )}
            <div className="absolute -inset-2 border border-primary/20 rounded-[3rem] animate-ping opacity-20" />
          </div>

          <div className="space-y-6 pt-10">
            <Button 
              onClick={handleUnlock} 
              disabled={isAuthenticating}
              className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all text-sm border border-white/10"
            >
              Идентифицировать узел
            </Button>
            
            <div className="flex flex-col items-center gap-3 opacity-30">
               <ShieldCheck className="w-5 h-5 text-primary" />
               <span className="text-[8px] font-black uppercase tracking-[0.5em] text-white">Secure Enclave Link Established</span>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-10 text-[7px] font-black uppercase tracking-[0.8em] text-white/10">
          Nuxus Kernel v24.0
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
