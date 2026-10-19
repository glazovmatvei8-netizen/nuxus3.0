'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
<<<<<<< HEAD
import {FirestorePermissionError} from '@/firebase/errors';
=======
import { FirestorePermissionError } from '@/firebase/errors';
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch(error => {
<<<<<<< HEAD
=======
    console.error("Firestore setDocumentNonBlocking error:", error);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write', // or 'create'/'update' based on options
        requestResourceData: data,
      })
<<<<<<< HEAD
    )
  })
  // Execution continues immediately
}


=======
    );
  });
  // Execution continues immediately
}

>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .catch(error => {
<<<<<<< HEAD
=======
      console.error("Firestore addDocumentNonBlocking error:", error);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
<<<<<<< HEAD
      )
=======
      );
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
    });
  return promise;
}

<<<<<<< HEAD

=======
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => {
<<<<<<< HEAD
=======
      console.error("Firestore updateDocumentNonBlocking error:", error);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
<<<<<<< HEAD
      )
    });
}


=======
      );
    });
}

>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
<<<<<<< HEAD
=======
      console.error("Firestore deleteDocumentNonBlocking error:", error);
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
<<<<<<< HEAD
      )
=======
      );
>>>>>>> 85aad308fcd508d891265b38c5fe72dfd11d7fc0
    });
}