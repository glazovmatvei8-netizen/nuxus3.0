
'use client';

/**
 * NUXUS CORE HUB V28.0
 * Централизованный экспорт всех системных функций.
 */

export { nuxus, engine } from '@/lib/nuxus-engine';
export { FirebaseProvider, useUser, useFirestore, useAuth, useFirebase } from './provider';
export { useDoc } from './firestore/use-doc';
export { useCollection } from './firestore/use-collection';
export { useMemoFirebase } from './firestore/use-memo-firebase';
