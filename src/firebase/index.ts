'use client';

/**
 * NUXUS FIREBASE CORE BARREL V6.5.0
 * ОПТИМИЗИРОВАНО: Прямые реэкспорты из provider.tsx для предотвращения циклов.
 */

export { initializeFirebase } from './app';
export { 
  FirebaseProvider, 
  useFirebase, 
  useAuth, 
  useFirestore, 
  useUser,
  useMemoFirebase,
  useCollection,
  useDoc
} from './provider';
export { FirebaseClientProvider } from './client-provider';
