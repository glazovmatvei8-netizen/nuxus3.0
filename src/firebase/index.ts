
'use client';

/**
 * NUXUS FIREBASE CORE V9.7.0
 * Единая точка входа для хуков и утилит.
 * ВНИМАНИЕ: FirebaseClientProvider исключен для предотвращения циклических ссылок.
 */

export * from './app';
export * from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './provider';
