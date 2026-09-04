
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Preferences } from '@capacitor/preferences';

/**
 * NUXUS ENGINE V68.3 «TITANIUM SOVEREIGN»
 * 
 * ФИКС ОШИБКИ 500: Использование нативной памяти Capacitor для хранения сессий.
 * Это предотвращает сброс авторизации при очистке памяти Android.
 */

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

const ignite = () => {
  if (typeof window === 'undefined') return;
  if (appInstance) return;

  try {
    const apps = getApps();
    appInstance = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    
    // ПРАВИЛЬНАЯ НАДЁЖНАЯ МОБИЛЬНАЯ АВТОРИЗАЦИЯ ДЛЯ APK
    // Используем мост Preferences для эмуляцииReactNativePersistence внутри Capacitor
    authInstance = initializeAuth(appInstance, {
      persistence: getReactNativePersistence(Preferences as any)
    });

    dbInstance = getFirestore(appInstance);
    
    console.log('%c🛰️ NUXUS SOVEREIGN ACTIVE [TITANIUM PERSISTENCE]', 'color: #007AFF; font-weight: bold;');
  } catch (e) {
    console.error("NUXUS ENGINE IGNITION FAILED:", e);
  }
};

export const nuxus = {
  get app() { 
    if (typeof window !== 'undefined' && !appInstance) ignite();
    return appInstance; 
  },
  get auth() { 
    if (typeof window !== 'undefined' && !authInstance) ignite();
    return authInstance; 
  },
  get db() { 
    if (typeof window !== 'undefined' && !dbInstance) ignite();
    return dbInstance; 
  }
};

export const engine = nuxus;
