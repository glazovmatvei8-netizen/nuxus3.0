
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  Firestore,
  terminate
} from 'firebase/firestore';

/**
 * Инициализация Firebase v0.65.2 Quantum Resilience.
 * Максимальная совместимость со старыми браузерами и Electron-оболочками.
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
    // Детекция отсутствия Proxy (ES6) или среды Electron/PWA
    const hasProxy = typeof window !== 'undefined' && !!window.Proxy;
    const isOldAndroid = typeof navigator !== 'undefined' && /Android [45]/.test(navigator.userAgent);
    const isDesktopApp = typeof window !== 'undefined' && (window as any).process?.type === 'renderer';

    if (!hasProxy || isOldAndroid || isDesktopApp) {
      console.log('Nuxus Core: Resilience Mode active. Forcing standard Firestore.');
      cachedFirestore = getFirestore(firebaseApp);
    } else {
      try {
        cachedFirestore = initializeFirestore(firebaseApp, {
          localCache: {
            kind: 'persistent'
          }
        } as any);
      } catch (e) {
        console.warn('Nuxus Core: Cache initialization failed, falling back.');
        cachedFirestore = getFirestore(firebaseApp);
      }
    }
  }

  // Graceful shutdown helper for Desktop
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (cachedFirestore) {
        // Не блокируем выход, но пытаемся корректно закрыть соединение
        try { terminate(cachedFirestore); } catch(e) {}
      }
    });
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
