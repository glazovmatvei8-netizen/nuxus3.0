
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

/**
 * Инициализация Firebase v22.0.0.
 * Максимальная защита от "белого экрана" в Windows-приложениях.
 */
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.error('Firebase initialization critical failure:', e);
      firebaseApp = getApp();
    }

    // Защита от сбоя инициализации в Electron/Nativefier
    if (typeof window !== 'undefined') {
      try {
        initializeAppCheck(firebaseApp, {
          provider: new ReCaptchaEnterpriseProvider(firebaseConfig.apiKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (err) {
        // Если App Check не поддерживается средой ПК, просто работаем дальше
        console.warn('Nuxus Shield (App Check) disabled for compatibility:', err);
      }
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
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
