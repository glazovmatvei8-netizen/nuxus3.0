'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, DocumentData, FirestoreError, DocumentReference } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string; isPending?: boolean };

export function useDoc<T = any>(docRef: DocumentReference<DocumentData> | null | undefined) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!docRef);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    const db = nuxus.db;
    if (!docRef || !db) {
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
          retryCount.current = 0; 
        },
        async (err) => {
          if (isUnmounted) return;
          
          const errMsg = err.message || "";
          
          if (errMsg.includes('ca9') || errMsg.includes('Unexpected state')) {
            console.warn("🛰️ Nuxus Kernel: Aggregator Out of Sync (ca9). Recalibrating...");
            unsubscribe();
            if (retryCount.current < 3) {
              retryCount.current++;
              setTimeout(() => { if (!isUnmounted) setIsLoading(true); }, 1000);
            }
            return;
          }

          if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: docRef.path,
              operation: 'get',
            }));
          }

          setError(err);
          setIsLoading(false);
        }
      );
    } catch (syncErr) {
      console.error("🛰️ Nuxus Kernel: Watch setup failed", syncErr);
    }

    return () => {
      isUnmounted = true;
      unsubscribe();
    };
  }, [docRef?.path]); 

  return { data, isLoading, error };
}