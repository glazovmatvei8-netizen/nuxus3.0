
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, QuerySnapshot, DocumentData, FirestoreError, CollectionReference, Query } from 'firebase/firestore';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * ORIGIN HOOK: useCollection
 * Оптимизирован для Origin Engine V13.
 */
export function useCollection<T = any>(
  target: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined
) {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!target);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!target) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [target instanceof Object ? null : target]); // Использование стабильного хеша или ссылочной стабильности

  return { data, isLoading, error };
}
