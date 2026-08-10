
'use client';

/**
 * NUXUS ORIGIN HUB
 * Прямые экспорты для предотвращения циклической зависимости.
 */

export * from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
