'use client';

/**
 * NUXUS HYPER-ENGINE V11.0
 * Единый диспетчерский узел Firebase. 
 * Гарантирует отсутствие циклических зависимостей и корректность типов.
 */

export * from './app';
export * from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { errorEmitter } from './error-emitter';
export { FirestorePermissionError } from './errors';
