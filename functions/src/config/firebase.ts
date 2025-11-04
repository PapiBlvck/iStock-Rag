// We use the Firebase Admin SDK to interact with Firestore, Auth, and Storage from the backend.
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

/**
 * Initializes Firebase Admin SDK if not already initialized.
 * This is crucial for environments like Cloud Functions where a single instance 
 * should be shared across multiple requests/invocations.
 */
if (!getApps().length) {
    // The Admin SDK automatically finds credentials in Google Cloud environments.
    // For local emulation, ensure FIREBASE_CONFIG is set correctly, or use a service account key.
    initializeApp({
        // For security and best practice, we don't pass explicit credentials in Cloud Functions.
        // It relies on the environment's service account (Application Default Credentials).
    });
}

// Export the initialized services for use in tRPC routers.
export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();
