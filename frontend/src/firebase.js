import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDXNPlEN_9Btebc1v_8iCaEv4D6RxW4V-g',
  authDomain: 'interview-ai-127f8.firebaseapp.com',
  projectId: 'interview-ai-127f8',
  storageBucket: 'interview-ai-127f8.firebasestorage.app',
  messagingSenderId: '641314468288',
  appId: '1:641314468288:web:5ab75406155eaf07c2d825',
  measurementId: 'G-LDGY3TPKRB',
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error', error);
    throw error;
  }
}

export { auth, analytics };
