import { cert, initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Firestore;

export function initDb() {
  if (!getApps().length) {
    let credentialData;
    const envCreds = process.env.FIREBASE_CREDENTIALS;

    if (envCreds) {
      console.log('Firebase: Attempting to initialize using FIREBASE_CREDENTIALS environment variable.');
      try {
        // Try parsing as JSON string (this is preferred for Railway)
        const parsed = JSON.parse(envCreds);
        credentialData = cert(parsed);
        console.log('Firebase: Successfully parsed credentials from environment variable.');
      } catch (e) {
        // If not JSON, assume it's a path (less common in cloud)
        console.log('Firebase: Credentials env var is not JSON, treating as file path.');
        credentialData = cert(envCreds);
      }
    } else {
      // Fallback to local file
      const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
      console.log(`Firebase: FIREBASE_CREDENTIALS env var not found. Falling back to local file: ${serviceAccountPath}`);
      credentialData = cert(serviceAccountPath);
    }

    try {
      initializeApp({
        credential: credentialData
      });
      console.log('Firebase: Application initialized successfully.');
    } catch (err: any) {
      console.error('Firebase: Initialization failed!');
      if (err.code === 'ENOENT') {
         throw new Error('CRITICAL: Firebase Credentials missing! Please set the FIREBASE_CREDENTIALS environment variable in Railway with your service account JSON contents.');
      }
      throw err;
    }
  }
  db = getFirestore();
  return db;
}

export function getDb(): Firestore {
  if (!db) {
    return initDb();
  }
  return db;
}
