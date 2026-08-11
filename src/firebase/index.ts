'use client';

/**
 * NUXUS CORE HUB V36.0
 * Централизованный экспорт всех системных функций.
 * ГАРАНТИЯ СТАБИЛЬНОСТИ: useCollection и useDoc теперь экспортируются корректно.
 */

export { nuxus, engine } from '@/lib/nuxus-engine';
export { FirebaseProvider, useUser, useFirestore, useAuth, useFirebase } from './provider';
export { useDoc } from './firestore/use-doc';
export { useCollection } from './firestore/use-collection';
export { useMemoFirebase } from './firestore/use-memo-firebase';
