
'use client';

/**
 * NUXUS HUB V12.0
 * Единая точка доступа без циклических зависимостей.
 */

export * from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { errorEmitter } from './error-emitter';
export { FirestorePermissionError } from './errors';
