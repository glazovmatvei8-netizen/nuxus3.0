
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ENGINE V68.4 «TITANIUM SOVEREIGN»
 * 
 * ФИКС ОШИБКИ 500: Использование IndexedDB для хранения сессий.
 * Это самый стабильный метод для Android WebView (Capacitor).
 * В отличие от localStorage, IndexedDB не очищается системой при нехватке памяти.
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
    
    /**
     * ПРАВИЛЬНАЯ НАДЁЖНАЯ АВТОРИЗАЦИЯ ДЛЯ APK (Capacitor)
     * Используем массив приоритетов: IndexedDB (самый надежный) -> LocalStorage.
     * Это предотвращает "вылеты" и ошибку 500 при сворачивании приложения.
     */
    authInstance = initializeAuth(appInstance, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    });

    dbInstance = getFirestore(appInstance);
    
    console.log('%c🛰️ NUXUS SOVEREIGN ACTIVE [INDEXED_DB PERSISTENCE]', 'color: #007AFF; font-weight: bold;');
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
