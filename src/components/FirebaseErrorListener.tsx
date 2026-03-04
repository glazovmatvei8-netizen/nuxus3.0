
'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '@/firebase';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * Only triggers the error boundary for the specific Owner/Developer UID.
 */
export function FirebaseErrorListener() {
  const { user } = useUser();
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // DEV TOOL LOCK: Only the owner (YOU) sees the crash screen
      // GCvLucN8CjNcdaxPO2vmpZ84hNl1 is YOUR specific ID
      if (user?.uid === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1') {
        setError(error);
      } else {
        // Silent fail for regular users to prevent bad UX
        console.warn("Nuxus Core: Permission denied. Error suppressed for non-admin user.");
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [user]);

  if (error) {
    throw error;
  }

  return null;
}
