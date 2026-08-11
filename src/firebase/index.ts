'use client';

/**
 * NUXUS ORIGIN HUB V26.0
 * 
 * ГЛОБАЛЬНЫЙ МОСТ: Экспорт всех хуков и движка.
 * Линейная структура исключает ошибку "is not a function".
 */

export { nuxus, engine } from '@/lib/nuxus-engine';
export { FirebaseProvider, useUser, useFirestore, useAuth, useFirebase } from './provider';
export { useDoc } from './firestore/use-doc';
export { useCollection } from './firestore/use-collection';
