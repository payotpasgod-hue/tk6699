import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBA4SPo_2TPU2R5R6LsbmL0xnVLQOGk_LA",
  authDomain: "device-streaming-570d42ac.firebaseapp.com",
  projectId: "device-streaming-570d42ac",
  storageBucket: "device-streaming-570d42ac.firebasestorage.app",
  messagingSenderId: "1046088713729",
  appId: "1:1046088713729:web:4375ac0c57855fea8fa200",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export function isGoogleConfigured(): boolean {
  return true;
}

export async function openGoogleSignIn(): Promise<string> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;

    if (idToken) {
      return idToken;
    }

    const token = await result.user.getIdToken();
    return token;
  } catch (error: any) {
    if (error.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      throw new Error("Redirecting...");
    }
    if (error.code === "auth/cancelled-popup-request" || error.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in cancelled");
    }
    throw new Error(error.message || "Google sign-in failed");
  }
}

export async function handleGoogleRedirectResult(): Promise<string | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;
    if (idToken) return idToken;

    return await result.user.getIdToken();
  } catch {
    return null;
  }
}
