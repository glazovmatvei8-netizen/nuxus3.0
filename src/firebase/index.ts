
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Инициализация Firebase с поддержкой App Check
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.error('Firebase initialization failed:', e);
      firebaseApp = initializeApp(firebaseConfig);
    }

    // App Check помогает защитить ваш проект от несанкционированного доступа ботов.
    // Если у вас нет ключа ReCaptcha Enterprise, этот блок можно пропустить.
    if (typeof window !== 'undefined') {
      try {
        // Мы используем тот же API ключ для инициализации провайдера
        initializeAppCheck(firebaseApp, {
          provider: new ReCaptchaEnterpriseProvider(firebaseConfig.apiKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (err) {
        // Не блокируем работу приложения, если App Check не инициализировался
        console.warn('App Check failed to initialize, continuing without it:', err);
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
