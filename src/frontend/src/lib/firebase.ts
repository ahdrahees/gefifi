// gefifi-2/src/frontend/src/lib/firebase.ts

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';

/**
 * Your web app's Firebase configuration.
 * These variables are loaded from the .env file by Vite.
 *
 * Make sure you have a .env file in the root of your project with these values.
 */
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// --- App Initialization (Singleton Pattern) ---
// This ensures Firebase is initialized only once across your entire app.
let app: FirebaseApp;
if (!getApps().length) {
	app = initializeApp(firebaseConfig);
	console.log('[Firebase] Firebase App initialized.');
} else {
	app = getApps()[0];
	console.log('[Firebase] Re-using existing Firebase App instance.');
}

// --- Services ---
// Get a reference to the Auth and Functions services.
const auth: Auth = getAuth(app);
const functions: Functions = getFunctions(app, 'asia-south1');

// --- Emulator Connection ---
// This is the crucial part. It tells the Firebase SDK
// to use your local emulators when in development mode, instead of trying
// to connect to the live production services.
if (import.meta.env.DEV) {
	console.log('[Firebase] Development mode detected. Connecting to local emulators...');
	try {
		// Point the Auth and Functions SDKs to their local emulators
		connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
		connectFunctionsEmulator(functions, 'localhost', 5001);
		console.log('[Firebase] Auth and Functions emulators connected successfully.');
	} catch (error) {
		console.warn(
			'[Firebase] Error connecting to emulators. This might happen on a hot reload and is usually safe to ignore.',
			error
		);
	}
} else {
	console.log('[Firebase] Production mode detected. Using live Firebase services.');
}

// Export the initialized services for use in other components.
export { app, auth, functions };
