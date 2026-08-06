'use client';

/**
 * NUXUS FIREBASE CORE BARREL V6.1.2
 * Восстановлены стабильные реэкспорты для устранения ошибки "is not a function".
 * Архитектура защищена от циклических зависимостей.
 */

export { initializeFirebase } from './app';
export { 
  FirebaseProvider, 
  useFirebase, 
  useAuth, 
  useFirestore, 
  useUser, 
  useCollection, 
  useDoc,
  useMemoFirebase 
} from './provider';
export { FirebaseClientProvider } from './client-provider';
