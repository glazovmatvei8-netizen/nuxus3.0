'use client';

import React from 'react';
import { useAppState } from '@/lib/store.tsx';
import { LegalModal } from './modals/legal-modal';

/**
 * ГЛОБАЛЬНЫЙ КОНТЕЙНЕР МОДАЛОК V6.1.0
 * ОПТИМИЗИРОВАНО: Логика FirebaseErrorListener перенесена в провайдер для устранения циклической зависимости.
 */
export function GlobalModalsWrapper() {
  const { isLegalOpen, setIsLegalOpen } = useAppState();

  return (
    <>
      <LegalModal open={isLegalOpen} onOpenChange={setIsLegalOpen} />
    </>
  );
}
