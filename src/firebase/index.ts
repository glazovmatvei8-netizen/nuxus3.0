
'use client';

/**
 * NUXUS FIREBASE CORE V7.1.0
 * Единая точка входа для всех сервисов и хуков.
 * ОПТИМИЗИРОВАНО: Предотвращение циклических ссылок.
 */

export * from './app';
export * from './provider';
export * from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './provider';
