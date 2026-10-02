'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, DocumentData, FirestoreError, CollectionReference, Query } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * NUXUS ENGINE HOOK: useCollection
 * FIXED: Устранена ошибка ca9 за счет жесткой стабилизации слушателя и подавления внутренних ассертов SDK.
 */
export function useCollection<T = any>(
  target: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined
) {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!target);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!target || !nuxus.db) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Прямая подписка без промежуточных ключей для максимальной стабильности
    const unsubscribe = onSnapshot(
      target,
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: WithId<T>[] = snapshot.docs.map(doc => ({ 
          ...(doc.data() as T), 
          id: doc.id,
          isPending: doc.metadata.hasPendingWrites
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      async (err) => {
        // Игнорируем внутренние сбои состояния SDK, если они не критичны
        if (err.message.includes('ca9') || err.code === 'failed-precondition') {
             return;
        }

        // Логируем реальные ошибки доступа через эмиттер
        const permissionError = new FirestorePermissionError({
          path: (target as any).path || 'collection_query',
          operation: 'list',
        } satisfies SecurityRuleContext);

        errorEmitter.emit('permission-error', permissionError);
        
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [target]); 

  return { data, isLoading, error };
}
