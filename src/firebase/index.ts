'use client';

/**
 * NUXUS ORIGIN HUB V23.0
 * ОПТИМИЗИРОВАНО: Удалены ре-экспорты хуков, вызывавшие циклические зависимости.
 * Теперь это только точка доступа к Engine.
 */

export { nuxus, engine } from '@/lib/nuxus-engine';
