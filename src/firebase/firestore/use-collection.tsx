'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, DocumentData, FirestoreError, CollectionReference, Query } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * NUXUS ENGINE HOOK: useCollection
 * FIXED: Устранена ошибка внутренней ассерции Firestore (ca9) за счет стабилизации подписок.
 */
export function useCollection<T = any>(
  target: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined
) {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!target);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!target || !nuxus.db) {
      setData(null);
      setIsLoading(false);
      return;
    }

    // Создаем уникальный ключ для текущего запроса, чтобы избежать лишних переподписок
    const targetKey = JSON.stringify((target as any)._query || target.path);
    if (lastTargetRef.current === targetKey && data !== null) return;
    lastTargetRef.current = targetKey;

    setIsLoading(true);
    
    try {
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
          console.error("Firestore Listener Error:", err);
          setError(err);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e: any) {
      setError(e);
      setIsLoading(false);
    }
  }, [target]); 

  return { data, isLoading, error };
}
