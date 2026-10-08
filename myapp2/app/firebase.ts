// firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore } from 'firebase/firestore'; 
import { initializeAuth } from 'firebase/auth'; 
// @ts-ignore: 型定義エラー回避
import { getReactNativePersistence } from '@firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

const originalWarn = console.warn; 
console.warn = (...args: any[]) => { if (typeof args[0] === 'string' && args[0].includes('AsyncStorage')) return; originalWarn(...args); }; 

const firebaseConfig = {
  apiKey: "AIzaSyDKlxger66VPlnvSf3zwL0eBpzt0PpkeT8", 
  authDomain: "katisouzou-app.firebaseapp.com", 
  projectId: "katisouzou-app", 
  storageBucket: "katisouzou-app.firebasestorage.app", 
  messagingSenderId: "600225146219", 
  appId: "1:600225146219:web:3774fe371719f8c454582e", 
  measurementId: "G-2J5GDR70BH" 
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp(); 
export const db = getFirestore(app); // DBを公開

let authInstance; 
try { authInstance = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); } catch (e) { authInstance = require('firebase/auth').getAuth(app); } 
export const auth = authInstance; 

export default {};