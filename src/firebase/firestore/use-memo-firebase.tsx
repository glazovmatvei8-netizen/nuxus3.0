
'use client';

import { useMemo } from 'react';

/**
 * Хук для стабилизации ссылок и запросов Firestore.
 * Предотвращает бесконечные рендеры при использовании Firestore-объектов в зависимостях.
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}
