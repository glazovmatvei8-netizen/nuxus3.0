
'use client';

import React from 'react';
import { useAppState } from '@/lib/app-state';
import { LegalModal } from './modals/legal-modal';

/**
 * ГЛОБАЛЬНЫЙ КОНТЕЙНЕР МОДАЛОК V6.1.0
 * ИСПРАВЛЕНО: Путь импорта useAppState.
 */
export function GlobalModalsWrapper() {
  const { isLegalOpen, setIsLegalOpen } = useAppState();

  return (
    <>
      <LegalModal open={isLegalOpen} onOpenChange={setIsLegalOpen} />
    </>
  );
}
