import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Tus credenciales reales de la Copa Tigrilla
const firebaseConfig = {
  apiKey: "AIzaSyA1_TU_CLAVE_REAL...", 
  authDomain: "copa-tigrilla-2026.firebaseapp.com",
  projectId: "copa-tigrilla-2026",
  storageBucket: "copa-tigrilla-2026.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcd1234efgh"
};

// Inicializamos Firebase evitando duplicados
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Base de datos Firestore limpia
export const db = getFirestore(app);

// Autenticación segura y compatible sin funciones rotas
let authInstance;
try {
  authInstance = getAuth(app);
} catch (error) {
  authInstance = initializeAuth(app);
}

export { authInstance as auth };
