'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ENGINE V23.0 «QUANTUM TERMINAL»
 * 
 * ПОЛНАЯ ИЗОЛЯЦИЯ: Ядро теперь работает как чистый синглтон,
 * защищенный от SSR-конфликтов Next.js 15.
 */

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

const ignite = () => {
  if (typeof window === 'undefined') return;
  if (appInstance) return;

  try {
    const apps = getApps();
    // Инициализируем только если нет существующих приложений
    appInstance = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    console.log('🛰️ Nuxus Engine V23.0: Quantum Sync Active');
  } catch (e) {
    console.warn('⚠️ Nuxus Engine: Ignition delayed or re-routed');
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
