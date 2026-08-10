
'use client';

import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * NUXUS HYPER-ENGINE V12.0
 * Единый синглтон для всех инстансов Firebase.
 */
class FirebaseEngine {
  private static instance: FirebaseEngine;
  public app: FirebaseApp | null = null;
  public auth: Auth | null = null;
  public db: Firestore | null = null;

  private constructor() {
    if (typeof window === 'undefined') return;

    const existingApps = getApps();
    this.app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
  }

  public static getInstance(): FirebaseEngine {
    if (!FirebaseEngine.instance) {
      FirebaseEngine.instance = new FirebaseEngine();
    }
    return FirebaseEngine.instance;
  }
}

export const engine = FirebaseEngine.getInstance();
