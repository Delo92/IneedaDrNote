import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore, FieldValue } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getAuth, type Auth } from "firebase-admin/auth";

let _app: App | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;
let _auth: Auth | null = null;

function getCredentials(): { projectId: string; clientEmail: string; privateKey: string } {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const cleaned = serviceAccountKey
        .replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\');
      const parsed = JSON.parse(cleaned);
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (e) {
      try {
        const base64Decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
        const parsed = JSON.parse(base64Decoded);
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      } catch {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON or base64");
      }
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

  if (clientEmail && privateKey && projectId) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  throw new Error(
    "Firebase credentials not found. Set either FIREBASE_SERVICE_ACCOUNT_KEY (JSON) " +
    "or individual FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID env vars."
  );
}

function ensureInitialized(): App {
  if (_app) return _app;

  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const creds = getCredentials();
  console.log("Initializing Firebase Admin SDK (lazy initialization)");

  _app = initializeApp({
    credential: cert({
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      privateKey: creds.privateKey,
    }),
    storageBucket: `${creds.projectId}.firebasestorage.app`,
  });

  return _app;
}

export function getDb(): Firestore {
  if (_db) return _db;
  const app = ensureInitialized();
  _db = getFirestore(app);
  return _db;
}

export function getAdminStorage(): Storage {
  if (_storage) return _storage;
  const app = ensureInitialized();
  _storage = getStorage(app);
  return _storage;
}

export function getAdminAuth(): Auth {
  if (_auth) return _auth;
  const app = ensureInitialized();
  _auth = getAuth(app);
  return _auth;
}

export { FieldValue };

export const firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export const firebaseStorage = new Proxy({} as Storage, {
  get(_target, prop) {
    return (getAdminStorage() as any)[prop];
  },
});

export const firebaseAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getAdminAuth() as any)[prop];
  },
});
