
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED, 
  enableMultiTabIndexedDbPersistence 
} from 'firebase/firestore';

/**
 * Инициализация Firebase v0.53.0 Resilience Core.
 * Включена система Offline Persistence для работы при глушении интернета.
 */
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.warn('Firebase core warm-up...');
      firebaseApp = getApp();
    }
  } else {
    firebaseApp = getApp();
  }

  const auth = getAuth(firebaseApp);
  
  // Инициализация Firestore с неограниченным кэшем для работы оффлайн
  const firestore = initializeFirestore(firebaseApp, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  });

  // Включение многовкладочного оффлайн-режима для работы без интернета
  if (typeof window !== 'undefined') {
    enableMultiTabIndexedDbPersistence(firestore).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Nuxus Resilience: Multiple tabs open, persistence enabled in first tab only');
      } else if (err.code === 'unimplemented') {
        console.warn('Nuxus Resilience: Browser does not support offline persistence');
      }
    });
  }

  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
