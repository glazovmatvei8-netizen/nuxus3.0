'use client';

/**
 * NUXUS ORIGIN HUB
 * Центральный узел распределения ресурсов Nuxus Engine.
 */

export * from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { nuxus } from '@/lib/nuxus-engine';
