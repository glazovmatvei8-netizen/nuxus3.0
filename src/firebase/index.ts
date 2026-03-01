
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

/**
 * Инициализация Firebase с максимально надежной обработкой ошибок.
 * Предотвращает "белый экран" при сбоях в App Check или нестандартных окружениях (Electron).
 */
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.error('Firebase initialization critical failure:', e);
      // fallback
      firebaseApp = getApp();
    }

    // App Check инициализируется только в браузере и не блокирует работу если упадет
    if (typeof window !== 'undefined') {
      try {
        // Мы используем тот же API ключ для инициализации провайдера ReCaptcha
        // Если вы видите ошибки 403 в консоли, проверьте настройки ReCaptcha в Google Cloud
        initializeAppCheck(firebaseApp, {
          provider: new ReCaptchaEnterpriseProvider(firebaseConfig.apiKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (err) {
        // Логируем, но не падаем, чтобы приложение не превратилось в белый экран
        console.warn('Nuxus Shield (App Check) warning: App will work in limited mode:', err);
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
