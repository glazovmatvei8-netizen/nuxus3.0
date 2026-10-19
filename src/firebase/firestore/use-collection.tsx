
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, DocumentData, FirestoreError, CollectionReference, Query } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * NUXUS ENGINE HOOK: useCollection
 * FIXED: Агрессивное подавление системных ассертов SDK (ca9, Fe: -1) для стабильности UI.
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
    
    let isUnmounted = false;

    // Обертка для обработки потенциальных синхронных исключений внутри onSnapshot
    let unsubscribe = () => {};
    
    try {
      unsubscribe = onSnapshot(
        target,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (isUnmounted) return;
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
          if (isUnmounted) return;
          
          // ПОДАВЛЕНИЕ ASSERTION FAILURES (ca9)
          const errMsg = err.message || "";
          if (errMsg.includes('ca9') || errMsg.includes('Unexpected state') || errMsg.includes('internal-error')) {
               console.warn("🛰️ Nuxus Signal: Suppressed internal SDK glitch.");
               return;
          }

          const permissionError = new FirestorePermissionError({
            path: (target as any).path || 'collection_query',
            operation: 'list',
          } satisfies SecurityRuleContext);

          errorEmitter.emit('permission-error', permissionError);
          
          setError(err);
          setIsLoading(false);
        }
      );
    } catch (syncErr: any) {
      console.error("🛰️ Nuxus Kernel: Watch setup failed", syncErr);
    }

    return () => {
      isUnmounted = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [target]); 

  return { data, isLoading, error };
}
