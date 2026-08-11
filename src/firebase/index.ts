'use client';

/**
 * NUXUS ORIGIN HUB V22.0
 * Единый шлюз для доступа ко всем ресурсам нового движка.
 */

export * from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { nuxus } from '@/lib/nuxus-engine';
