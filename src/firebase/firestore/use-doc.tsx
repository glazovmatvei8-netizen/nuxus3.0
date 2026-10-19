
'use client';

<<<<<<< HEAD
import { useState, useEffect, useRef } from 'react';
=======
import { useState, useEffect } from 'react';
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
import { onSnapshot, DocumentData, FirestoreError, DocumentReference } from 'firebase/firestore';
import { nuxus } from '@/lib/nuxus-engine';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export type WithId<T> = T & { id: string; isPending?: boolean };

/**
<<<<<<< HEAD
 * NUXUS ENGINE HOOK: useDoc V150
 * FIXED: Добавлен механизм автоматической детонации и перезапуска при ошибке ca9.
=======
 * NUXUS ENGINE HOOK: useDoc
 * FIXED: Добавлена очистка и подавление критических ошибок состояния SDK.
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
 */
export function useDoc<T = any>(docRef: DocumentReference<DocumentData> | null | undefined) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!docRef);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
<<<<<<< HEAD
  const retryCount = useRef(0);

  useEffect(() => {
    const db = nuxus.db;
    if (!docRef || !db) {
=======

  useEffect(() => {
    if (!docRef || !nuxus.db) {
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isUnmounted = false;
<<<<<<< HEAD
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
          retryCount.current = 0; // Сброс счетчика при успехе
        },
        async (err) => {
          if (isUnmounted) return;
          
          const errMsg = err.message || "";
          
          // КРИТИЧЕСКИЙ ПЕРЕХВАТ CA9
          if (errMsg.includes('ca9') || errMsg.includes('Unexpected state')) {
            console.warn("🛰️ Nuxus Kernel: ca9 Detected. Intercepting crash...");
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
=======
    
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
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0

    return () => {
      isUnmounted = true;
      unsubscribe();
    };
  }, [docRef?.path]); 

  return { data, isLoading, error };
}
