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
      try {
        // Try parsing as JSON string first
        credentialData = cert(JSON.parse(envCreds));
      } catch (e) {
        // If not JSON, assume it's a path
        credentialData = cert(envCreds);
      }
    } else {
      // Fallback to local file
      const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
      credentialData = cert(serviceAccountPath);
    }

    initializeApp({
      credential: credentialData
    });
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
