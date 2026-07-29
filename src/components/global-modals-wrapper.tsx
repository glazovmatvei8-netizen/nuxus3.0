'use client';

import React from 'react';
import { useAppState } from '@/lib/store';
import { LegalModal } from './modals/legal-modal';
import { FirebaseErrorListener } from './FirebaseErrorListener';

/**
 * ГЛОБАЛЬНЫЙ КОНТЕЙНЕР МОДАЛОК V6.0.2
 * Обеспечивает доступность правовой информации и слушателя ошибок во всем Ядре.
 */
export function GlobalModalsWrapper() {
  const { isLegalOpen, setIsLegalOpen } = useAppState();

  return (
    <>
      <FirebaseErrorListener />
      <LegalModal open={isLegalOpen} onOpenChange={setIsLegalOpen} />
    </>
  );
}
