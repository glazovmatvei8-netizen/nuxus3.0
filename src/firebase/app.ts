
'use client';

/**
 * DEPRECATED V75.0
 * Используйте src/lib/nuxus-engine.ts для инициализации.
 * Этот файл сохранен как заглушка для предотвращения ошибок импорта.
 */
import { nuxus } from '@/lib/nuxus-engine';

export function initializeFirebase() {
  return {
    firebaseApp: nuxus.app,
    auth: nuxus.auth,
    firestore: nuxus.db
  };
}
