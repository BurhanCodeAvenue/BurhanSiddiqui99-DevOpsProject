// src/server/config/firebaseAdmin.ts
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Initialize db and authAdmin to null and allow null type
let db: admin.firestore.Firestore | null = null;
let authAdmin: admin.auth.Auth | null = null;

// Check if Firebase Admin SDK has already been initialized
if (!admin.apps.length) {
  try {
    let serviceAccountJsonString: string | null = null;
    let serviceAccount: ServiceAccount | null = null;

    // Option 1: Load from Base64 encoded string
    if (process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64) {
      console.log('Attempting to initialize Firebase Admin SDK from Base64 string...');
      try {
        // Ensure the Base64 string is not empty
        if (!process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64.trim()) {
            throw new Error('FIREBASE_ADMIN_SDK_CONFIG_BASE64 environment variable is empty.');
        }
        serviceAccountJsonString = Buffer.from(process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64, 'base64').toString('utf-8');
      } catch (decodeError: any) {
         console.error('Firebase Admin SDK: Failed to decode Base64 string:', decodeError.message);
         throw new Error('Invalid FIREBASE_ADMIN_SDK_CONFIG_BASE64 format. Ensure it is a valid Base64 encoded JSON string.');
      }

       try {
        // Ensure the decoded string is not empty
        if (!serviceAccountJsonString?.trim()) {
            throw new Error('Decoded Base64 string is empty.');
        }
        serviceAccount = JSON.parse(serviceAccountJsonString);
       } catch (parseError: any) {
         console.error('Firebase Admin SDK: Failed to parse decoded JSON string:', parseError.message);
         console.error('Decoded string content (first 100 chars):', serviceAccountJsonString?.substring(0, 100)); // Log part of the string for debugging
         throw new Error('Invalid JSON content in FIREBASE_ADMIN_SDK_CONFIG_BASE64.');
       }
    }
    // Option 2: Load from file path (less recommended for deployed environments)
    // else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
    //   console.log(`Attempting to initialize Firebase Admin SDK from path: ${process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH}`);
    //   serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
    // }
    else {
      console.error('Firebase Admin SDK configuration is missing.');
      throw new Error('Firebase Admin SDK configuration is missing. Set FIREBASE_ADMIN_SDK_CONFIG_BASE64 environment variable.');
    }

    // Ensure serviceAccount was successfully parsed/loaded
    if (!serviceAccount) {
        throw new Error('Failed to load Firebase service account credentials.');
    }

    // Explicitly check for project_id *after* confirming serviceAccount is loaded and parsed
    // Use type assertion carefully or check property existence robustly
    if (typeof serviceAccount !== 'object' || serviceAccount === null || !('project_id' in serviceAccount) || !serviceAccount.project_id) {
      console.error('Firebase Admin SDK: Service account JSON object is missing the "project_id" field or it is empty.');
      console.error('Parsed Service Account Object Keys:', serviceAccount ? Object.keys(serviceAccount) : 'null'); // Log keys to see what *is* present
      throw new Error('Service account key JSON is missing the required "project_id" field.');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // projectId is inferred from the credential. Explicitly setting it might cause issues
      // if there's a mismatch or if the credential object structure changes.
      // Rely on the SDK's inference unless specifically needed.
      // projectId: serviceAccount.project_id,
    });
    console.log('Firebase Admin SDK initialized successfully.');

  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // Ensure instances remain null if initialization failed
    db = null;
    authAdmin = null;
  }
} else {
    console.log('Firebase Admin SDK already initialized.');
}

// Initialize Firestore and Auth instances only if admin app exists and they are not already set
if (admin.apps.length > 0 && db === null && authAdmin === null) {
  try {
    db = admin.firestore();
    authAdmin = admin.auth();
     console.log('Firestore and Auth Admin instances retrieved.');
  } catch (error: any) {
    console.error('Failed to get Firestore/Auth instance after checking admin apps.', error.message);
    db = null; // Ensure they remain null on error
    authAdmin = null;
  }
}


export { admin, db, authAdmin }; // Export potentially null values
