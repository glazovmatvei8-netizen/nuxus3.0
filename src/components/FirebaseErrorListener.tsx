'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '@/firebase';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * Safe listener that doesn't crash the UI thread.
 */
export function FirebaseErrorListener() {
  const { user } = useUser();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Log errors for the developer only
      if (user?.uid === 'GCvLucN8CjNcdaxPO2vmpZ84hNl1') {
        console.error("Nuxus Debug: Permission denied.", error.message);
      } else {
        // Silent fail for regular users to prevent bad UX
        console.warn("Nuxus Core: Access restriction encountered.");
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [user]);

  // We no longer throw here to prevent the "Application error: client-side exception" black screen
  return null;
}