'use client';

import { useEffect, useContext } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { FirebaseContext } from '@/firebase/provider';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * Updated V33.2.2: Even more silent to prevent UX disruptions.
 * FIX: Using direct context import to avoid circular dependency loop.
 */
export function FirebaseErrorListener() {
  const context = useContext(FirebaseContext);
  const user = context?.user;

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Log errors for the prime admin only
      if (user?.uid === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1' || user?.uid === 'vnctow46') {
        console.error("Nuxus Debug: Permission denied.", error.message);
      } else {
        // Silent log for troubleshooting
        console.log("Nuxus Signal Blocked: Access restricted.");
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [user]);

  return null;
}
