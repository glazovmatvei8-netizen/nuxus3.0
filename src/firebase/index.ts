'use client';

/**
 * NUXUS CORE HUB V43.0
 * Централизованный экспорт всех системных функций.
 * ГАРАНТИЯ СТАБИЛЬНОСТИ: Все хуки теперь доступны из одного места.
 */

export { nuxus, engine } from '@/lib/nuxus-engine';
export { FirebaseProvider, useUser, useFirestore, useAuth, useFirebase } from './provider';
export { useDoc } from './firestore/use-doc';
export { useCollection } from './firestore/use-collection';
export { useMemoFirebase } from './firestore/use-memo-firebase';
