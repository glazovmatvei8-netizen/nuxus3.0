'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, DocumentData, FirestoreError, DocumentReference } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * NUXUS ENGINE HOOK: useDoc
 * FIXED: Устранена ошибка внутренней ассерции Firestore (ca9).
 */
export function useDoc<T = any>(docRef: DocumentReference<DocumentData> | null | undefined) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!docRef);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!docRef || !nuxus.db) {
      setData(null);
      setIsLoading(false);
      return;
    }

    if (lastPathRef.current === docRef.path && data !== null) return;
    lastPathRef.current = docRef.path;

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
          console.error("Firestore Doc Listener Error:", err);
          setError(err);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e: any) {
      setError(e);
      setIsLoading(false);
    }
  }, [docRef?.path]);

  return { data, isLoading, error };
}
