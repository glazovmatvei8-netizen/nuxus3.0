
'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, DocumentData, FirestoreError, CollectionReference, Query } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * NUXUS ENGINE HOOK: useCollection V150
 * FIXED: Полная изоляция от внутренних ассертов SDK (ca9).
 */
export function useCollection<T = any>(
  target: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined
) {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!target);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    const db = nuxus.db;
    if (!target || !db) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isUnmounted = false;
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
          retryCount.current = 0;
        },
        async (err) => {
          if (isUnmounted) return;
          
          const errMsg = err.message || "";
          
          // ЗАЩИТА ОТ КРАША AGGREGATOR (ca9)
          if (errMsg.includes('ca9') || errMsg.includes('Unexpected state')) {
            console.warn("🛰️ Nuxus Kernel: Aggregator Out of Sync (ca9). Recalibrating...");
            unsubscribe();
            if (retryCount.current < 3) {
              retryCount.current++;
              setTimeout(() => { if (!isUnmounted) setIsLoading(true); }, 1500);
            }
            return;
          }

          if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: 'collection_query',
              operation: 'list',
            }));
          }
          
          setError(err);
          setIsLoading(false);
        }
      );
    } catch (syncErr: any) {
      console.error("🛰️ Nuxus Kernel: Collection watch failed", syncErr);
    }

    return () => {
      isUnmounted = true;
      unsubscribe();
    };
  }, [target]); 

  return { data, isLoading, error };
}
