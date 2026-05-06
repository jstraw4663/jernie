import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Must be set on globalThis before initializeAppCheck — Firebase reads it at init time.
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
}
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});
export const db = getDatabase(app);
export const auth = getAuth(app);

// Resolves once anonymous auth is confirmed via onAuthStateChanged.
// onAuthStateChanged (not the signInAnonymously promise) is used because
// the Firestore SDK propagates auth tokens via its own internal listener —
// awaiting the signInAnonymously promise alone leaves a window where
// Firestore hasn't applied the token yet.
export const authReady: Promise<void> = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      unsubscribe();
      resolve();
    }
  });
  signInAnonymously(auth).catch(() => resolve());
});

// persistentLocalCache enables offline IndexedDB caching for
// all read PlaceEntity docs — detail sheets work offline after first load
export const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
