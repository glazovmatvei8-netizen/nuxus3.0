
'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string, isPending?: boolean };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * V7.0: Supports offline pending state (isPending).
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  // CRITICAL: Immediate data reset on reference change
  const [prevPath, setPrevPath] = useState<string | null>(null);
  const currentPath = memoizedDocRef?.path || null;

  if (currentPath !== prevPath) {
    setPrevPath(currentPath);
    setData(null); // Wipe ghost data instantly
    setIsLoading(!!memoizedDocRef);
    setError(null);
  }

  useEffect(() => {
    if (!memoizedDocRef) {
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      { includeMetadataChanges: true }, // Listen for metadata sync changes
      (snapshot: DocumentSnapshot<DocumentData>) => {
        // Double check if the current callback matches the current active ref path
        if (memoizedDocRef.path !== currentPath) return;

        if (snapshot.exists()) {
          setData({ 
            ...(snapshot.data() as T), 
            id: snapshot.id,
            isPending: snapshot.metadata.hasPendingWrites // Detect if doc is synced
          });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        })

        setError(contextualError)
        setIsLoading(false)
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef, currentPath]);

  return { data, isLoading, error };
}
