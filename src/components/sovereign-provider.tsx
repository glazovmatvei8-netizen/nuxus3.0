'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { AppProvider } from '@/lib/app-state'; 
import { NuxusLogo } from '@/components/nuxus-logo';

// Динамический импорт провайдеров для предотвращения ошибок 'call' и проблем с гидратацией
const FirebaseProvider = dynamic(() => import('@/firebase/provider').then(m => m.FirebaseProvider), { ssr: false });
const ThemeApplier = dynamic(() => import('@/components/theme-applier').then(m => m.ThemeApplier), { ssr: false });
const AppIconApplier = dynamic(() => import('@/components/app-icon-applier').then(m => m.AppIconApplier), { ssr: false });
const Toaster = dynamic(() => import('@/components/ui/toaster').then(m => m.Toaster), { ssr: false });
const OfflinePlaceholder = dynamic(() => import('@/components/offline-placeholder').then(m => m.OfflinePlaceholder), { ssr: false });
const UpdateNotifier = dynamic(() => import('@/components/update-notifier').then(m => m.UpdateNotifier), { ssr: false });

/**
 * SOVEREIGN PROVIDER V5.9.0
 * 
 * Единый клиентский узел, который предотвращает ошибку 'call' в layout.tsx.
 * Использование dynamic импортов с { ssr: false } гарантирует, что Firebase-зависимости 
 * не будут загружаться на стороне сервера, что полностью убирает TypeError.
 */
export function SovereignProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#010103] flex flex-col items-center justify-center gap-8">
         <NuxusLogo size={80} className="opacity-20" />
         <div className="w-16 h-1 border-t-2 border-primary/20 animate-pulse" />
      </div>
    );
  }

  return (
    <AppProvider>
      <FirebaseProvider>
        <ThemeApplier />
        <AppIconApplier />
        <OfflinePlaceholder />
        <UpdateNotifier />
        <Toaster />
        {children}
      </FirebaseProvider>
    </AppProvider>
  );
}