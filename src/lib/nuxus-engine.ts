
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ORIGIN ENGINE V14.0 (Autonomous Core)
 * Полностью автономный движок мессенджера.
 * Синглтон-архитектура исключает любые ошибки инициализации и циклы.
 */
class NuxusEngine {
  private static instance: NuxusEngine;
  public app: FirebaseApp | null = null;
  public auth: Auth | null = null;
  public db: Firestore | null = null;
  private initialized = false;

  private constructor() {
    if (typeof window === 'undefined') return;
    this.ignite();
  }

  public static getInstance(): NuxusEngine {
    if (!NuxusEngine.instance) {
      NuxusEngine.instance = new NuxusEngine();
    }
    return NuxusEngine.instance;
  }

  private ignite() {
    if (this.initialized) return;
    try {
      const apps = getApps();
      this.app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.initialized = true;
      console.log('🛰️ Nuxus Engine: Online');
    } catch (e) {
      console.error('❌ Nuxus Engine: Core Failure', e);
    }
  }
}

export const nuxus = NuxusEngine.getInstance();
