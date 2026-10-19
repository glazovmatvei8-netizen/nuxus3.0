
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, DocumentData, FirestoreError, DocumentReference } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * NUXUS ENGINE HOOK: useDoc
 * FIXED: Добавлена превентивная защита от критических ошибок состояния SDK (ca9).
 */
export function useDoc<T = any>(docRef: DocumentReference<DocumentData> | null | undefined) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!docRef);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!docRef || !nuxus.db) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isUnmounted = false;
    
    let unsubscribe = () => {};

    try {
      unsubscribe = onSnapshot(
        docRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (isUnmounted) return;
          if (snapshot.exists()) {
            setData({ 
              ...(snapshot.data() as T), 
              id: snapshot.id,
              isPending: snapshot.metadata.hasPendingWrites
            });
          } else {
            setData(null);
          }
          setError(null);
          setIsLoading(false);
        },
        async (err) => {
          if (isUnmounted) return;
          
          const errMsg = err.message || "";
          if (errMsg.includes('ca9') || errMsg.includes('Unexpected state') || errMsg.includes('internal-error')) {
            console.warn("🛰️ Nuxus Signal: Suppressed document watch glitch.");
            return;
          }

          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
          } satisfies SecurityRuleContext);

          errorEmitter.emit('permission-error', permissionError);

          setError(err);
          setIsLoading(false);
        }
      );
    } catch (syncErr) {
      console.error("🛰️ Nuxus Kernel: Doc sync setup failed", syncErr);
    }

    return () => {
      isUnmounted = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [docRef?.path]); 

  return { data, isLoading, error };
}
