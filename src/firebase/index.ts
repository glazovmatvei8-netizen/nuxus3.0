'use client';

/**
 * NUXUS CORE HUB V65.0
 * Централизованный экспорт без циклов.
 */

export { nuxus, engine } from '@/lib/nuxus-engine';
export { useUser, useFirestore, useAuth, useFirebase } from './provider';
export { useDoc } from './firestore/use-doc';
export { useCollection } from './firestore/use-collection';
export { useMemoFirebase } from './firestore/use-memo-firebase';
