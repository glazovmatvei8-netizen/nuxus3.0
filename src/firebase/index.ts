
'use client';

/**
 * NUXUS CORE HUB V29.0
 * Централизованный экспорт всех системных функций.
 * FIXED: Exports normalized to prevent runtime TypeErrors.
 */

export { nuxus, engine } from '@/lib/nuxus-engine';
export { FirebaseProvider, useUser, useFirestore, useAuth, useFirebase } from './provider';
export { useDoc } from './firestore/use-doc';
export { useCollection } from './firestore/use-collection';
export { useMemoFirebase } from './firestore/use-memo-firebase';
