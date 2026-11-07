// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRl-nhzJP7BzyyAlGORadU4bCO5r2jowI",
  authDomain: "quadrats-inteligente-fll.firebaseapp.com",
  projectId: "quadrats-inteligente-fll",
  storageBucket: "quadrats-inteligente-fll.firebasestorage.app",
  messagingSenderId: "1001062070514",
  appId: "1:1001062070514:web:1cc74608cdfa093b21786b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => undefined);
