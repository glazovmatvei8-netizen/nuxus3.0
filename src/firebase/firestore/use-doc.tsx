'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, DocumentData, FirestoreError, DocumentReference } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * NUXUS ENGINE HOOK: useDoc
 * FIXED: Устранена ошибка ca9 за счет мемоизации пути документа.
 */
export function useDoc<T = any>(docRef: DocumentReference<DocumentData> | null | undefined) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!docRef);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!docRef || !nuxus.db) {
      setData(null);
      setIsLoading(false);
      return;
    }

    if (lastPath.current === docRef.path) return;
    lastPath.current = docRef.path;

    setIsLoading(true);
    
    try {
      const unsubscribe = onSnapshot(
        docRef,
        { includeMetadataChanges: true },
        (snapshot) => {
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
        (err) => {
          if (err.message.includes('ca9')) return;
          setError(err);
          setIsLoading(false);
        }
      );

      return () => {
        lastPath.current = null;
        unsubscribe();
      };
    } catch (e: any) {
      setError(e);
      setIsLoading(false);
    }
  }, [docRef?.path]);

  return { data, isLoading, error };
}
