'use client';

import { useEffect, useContext } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirebaseContext } from '@/firebase/provider';

/**
 * Слушатель системных ошибок Firebase.
 */
export function FirebaseErrorListener() {
  const context = useContext(FirebaseContext);
  const user = context?.user;

  useEffect(() => {
    const handleError = (error: any) => {
      if (user?.uid === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1') {
        console.error("Nuxus Debug:", error.message);
      }
    };

    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, [user]);

  return null;
}
