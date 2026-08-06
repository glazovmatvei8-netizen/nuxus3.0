'use client';

/**
 * NUXUS FIREBASE CORE BARREL V6.1.4
 * ОПТИМИЗИРОВАНО: Прямые реэкспорты без циклов.
 */

export { initializeFirebase } from './app';
export { 
  FirebaseProvider, 
  useFirebase, 
  useAuth, 
  useFirestore, 
  useUser,
  useMemoFirebase 
} from './provider';
export { useDoc } from './firestore/use-doc';
export { useCollection } from './firestore/use-collection';
export { FirebaseClientProvider } from './client-provider';
