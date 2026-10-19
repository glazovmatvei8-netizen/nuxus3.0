'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, indexedDBLocalPersistence, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { Firestore, persistentLocalCache, initializeFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ENGINE V154 «ULTIMATE SHIELD»
 * ОПТИМИЗИРОВАНО: Глобальный Singleton-паттерн через window для исключения ошибки 'ca9'.
 */

declare global {
  interface Window {
    __NUXUS_APP__: FirebaseApp;
    __NUXUS_AUTH__: Auth;
    __NUXUS_DB__: Firestore;
    __NUXUS_IGNITED__: boolean;
  }
}

const ignite = () => {
  if (typeof window === 'undefined' || window.__NUXUS_IGNITED__) return;

  try {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    
    // Инициализация Firestore с базовым кэшем для мобильной стабильности
    const db = initializeFirestore(app, {
      localCache: persistentLocalCache({})
    });

    const auth = getAuth(app);
    setPersistence(auth, indexedDBLocalPersistence).catch(() => {
      setPersistence(auth, browserLocalPersistence);
    });

    window.__NUXUS_APP__ = app;
    window.__NUXUS_DB__ = db;
    window.__NUXUS_AUTH__ = auth;
    window.__NUXUS_IGNITED__ = true;

    console.log('%c🛰️ NUXUS KERNEL: TITANIUM SHIELD ACTIVE V154', 'color: #E58E38; font-weight: bold;');
  } catch (e: any) {
    console.error("NUXUS KERNEL: IGNITION CRASHED", e);
  }
};

export const nuxus = {
  get app() { 
    if (typeof window !== 'undefined') {
      if (!window.__NUXUS_IGNITED__) ignite();
      return window.__NUXUS_APP__;
    }
    return undefined;
  },
  get auth() { 
    if (typeof window !== 'undefined') {
      if (!window.__NUXUS_IGNITED__) ignite();
      return window.__NUXUS_AUTH__;
    }
    return undefined;
  },
  get db() { 
    if (typeof window !== 'undefined') {
      if (!window.__NUXUS_IGNITED__) ignite();
      return window.__NUXUS_DB__;
    }
    return undefined;
  }
};

export const engine = nuxus;