
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, DocumentData, FirestoreError, DocumentReference } from 'firebase/firestore';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * ORIGIN HOOK: useDoc
 * Работает напрямую с ядром, минуя тяжелые провайдеры.
 */
export function useDoc<T = any>(docRef: DocumentReference<DocumentData> | null | undefined) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!docRef);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef?.path]); // Стабильная зависимость по пути

  return { data, isLoading, error };
}
