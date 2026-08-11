
'use client';

/**
 * NUXUS CORE HUB V30.0
 * Централизованный экспорт всех системных функций.
 * FIXED: Абсолютная стабильность экспортов для предотвращения TypeError.
 */

export { nuxus, engine } from '@/lib/nuxus-engine';
export { FirebaseProvider, useUser, useFirestore, useAuth, useFirebase } from './provider';
export { useDoc } from './firestore/use-doc';
export { useCollection } from './firestore/use-collection';
export { useMemoFirebase } from './firestore/use-memo-firebase';
