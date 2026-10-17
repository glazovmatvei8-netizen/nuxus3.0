
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, DocumentData, FirestoreError, DocumentReference } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * NUXUS ENGINE HOOK: useDoc
 * FIXED: Добавлена очистка и подавление критических ошибок состояния SDK.
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
    
    const unsubscribe = onSnapshot(
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
        
        if (err.message.includes('ca9') || err.message.includes('Unexpected state')) {
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

    return () => {
      isUnmounted = true;
      unsubscribe();
    };
  }, [docRef?.path]); 

  return { data, isLoading, error };
}
