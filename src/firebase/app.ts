'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * NUXUS QUANTUM INITIALIZER V11.0
 * Добавлена проверка на наличие конфига перед инициализацией.
 */
export function initializeFirebase(instanceName: string = '[DEFAULT]') {
  if (typeof window === 'undefined') {
    return { firebaseApp: null, auth: null, firestore: null };
  }

  if (!firebaseConfig.apiKey) {
    console.error("NUXUS ENGINE: Missing Firebase Configuration!");
    return { firebaseApp: null, auth: null, firestore: null };
  }

  let app: FirebaseApp;
  const existingApps = getApps();
  const existing = existingApps.find(a => a.name === instanceName);

  if (existing) {
    app = existing;
  } else {
    try {
      app = initializeApp(firebaseConfig, instanceName);
    } catch (e) {
      app = getApp(instanceName);
    }
  }
  
  const auth: Auth = getAuth(app);
  const db: Firestore = getFirestore(app);

  return {
    firebaseApp: app,
    auth: auth,
    firestore: db
  };
}
