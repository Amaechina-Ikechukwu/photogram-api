import admin from 'firebase-admin';
import { getSecret } from './secrets.ts';

let initializePromise: Promise<admin.app.App> | null = null;

export async function initializeFirebase(): Promise<admin.app.App> {
  // If already initializing or initialized, return existing promise/app
  if (initializePromise) {
    return initializePromise;
  }

  // Check if app already exists
  try {
    return admin.app();
  } catch (error) {
    // App doesn't exist, proceed with initialization
  }

  initializePromise = (async () => {
    try {
      // Load service account from Google Secret Manager
      const serviceAccountJson = await getSecret('xx');
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      const databaseURL = process.env.FIREBASE_DATABASE_URL || 
                         `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`;

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: databaseURL,
      });

      console.log('Firebase Admin SDK initialized successfully');
      
      return admin.app();
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      initializePromise = null; // Reset on error so it can be retried
      throw error;
    }
  })();

  return initializePromise;
}

export async function getDatabase(): Promise<admin.database.Database> {
  await initializeFirebase();
  return admin.database();
}

export async function getAuth(): Promise<admin.auth.Auth> {
  await initializeFirebase();
  return admin.auth();
}

export { admin };
