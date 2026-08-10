
'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS ORIGIN ENGINE V13.0 (Singleton Core)
 * Полностью автономный движок, исключающий циклические зависимости.
 */
class OriginEngine {
  private static instance: OriginEngine;
  public app: FirebaseApp | null = null;
  public auth: Auth | null = null;
  public db: Firestore | null = null;
  private initialized = false;

  private constructor() {
    if (typeof window === 'undefined') return;
    this.init();
  }

  public static getInstance(): OriginEngine {
    if (!OriginEngine.instance) {
      OriginEngine.instance = new OriginEngine();
    }
    return OriginEngine.instance;
  }

  private init() {
    if (this.initialized) return;
    try {
      const apps = getApps();
      this.app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.initialized = true;
      console.log('Nuxus Origin Engine: Online');
    } catch (e) {
      console.error('Nuxus Origin Engine: Critical Failure', e);
    }
  }
}

export const nuxus = OriginEngine.getInstance();
