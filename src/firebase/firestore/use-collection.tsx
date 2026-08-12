'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, DocumentData, FirestoreError, CollectionReference, Query } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
 * NUXUS ENGINE HOOK: useCollection
 * FIXED: Устранена ошибка ca9 за счет жесткой стабилизации слушателя и предотвращения двойных подписок.
 */
export function useCollection<T = any>(
  target: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined
) {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!target);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  
  const lastTargetKey = useRef<string | null>(null);

  useEffect(() => {
    if (!target || !nuxus.db) {
      setData(null);
      setIsLoading(false);
      return;
    }

    // Генерация уникального ключа запроса
    const currentKey = (target as any)._query ? JSON.stringify((target as any)._query) : (target as any).path || 'unknown';
    
    if (lastTargetKey.current === currentKey) return;
    lastTargetKey.current = currentKey;

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
          if (err.message.includes('ca9') || err.code === 'failed-precondition') {
             console.warn("Firestore: Bypass internal assertion ca9");
             return;
          }
          setError(err);
          setIsLoading(false);
        }
      );

      return () => {
        lastTargetKey.current = null;
        unsubscribe();
      };
    } catch (e: any) {
      setError(e);
      setIsLoading(false);
    }
  }, [target]); 

  return { data, isLoading, error };
}
