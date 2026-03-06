
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  Firestore
} from 'firebase/firestore';

/**
 * Инициализация Firebase v0.62.0 Quantum Resilience.
 * Максимальная совместимость со старыми браузерами (Android 5.0 / LG).
 * Полностью отключены современные функции кэширования для старых устройств.
 */
let cachedFirestore: Firestore | null = null;

export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  const auth = getAuth(firebaseApp);

  if (!cachedFirestore) {
    // Детекция старых устройств: Android 4/5, старые iOS или отсутствие Proxy (ES6)
    const isLegacy = typeof navigator !== 'undefined' && (
      /Android [45]/.test(navigator.userAgent) || 
      /iPhone OS [8910]/.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && !window.Proxy)
    );

    if (isLegacy) {
      console.log('Nuxus Core: Legacy detected. Disabling all Firestore caching for stability.');
      // Для Android 5 используем ТОЛЬКО базовый Firestore без кэша и полифиллов
      cachedFirestore = getFirestore(firebaseApp);
    } else {
      try {
        // Попытка инициализации с кэшем для современных устройств
        const { persistentLocalCache, persistentMultipleTabManager, CACHE_SIZE_UNLIMITED } = require('firebase/firestore');
        cachedFirestore = initializeFirestore(firebaseApp, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
            cacheSizeBytes: CACHE_SIZE_UNLIMITED
          })
        });
      } catch (e) {
        console.warn('Nuxus Core: Cache initialization failed, falling back to basic.');
        cachedFirestore = getFirestore(firebaseApp);
      }
    }
  }

  return {
    firebaseApp,
    auth,
    firestore: cachedFirestore
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
