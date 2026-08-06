'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, DocumentSnapshot, DocumentData, FirestoreError } from 'firebase/firestore';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * РЕАЛЬНЫЙ ХУК useDoc V6.1.4
 * Восстановлен для устранения "Cannot destructure property 'data'".
 */
export function useDoc<T = any>(memoizedDocRef: any) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      { includeMetadataChanges: true },
      (snapshot: DocumentSnapshot<DocumentData>) => {
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
      (error: FirestoreError) => {
        setError(error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef]);

  return { data, isLoading, error };
}
