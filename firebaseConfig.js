// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlNPTboTbctJS5DazkfFsPvM5g0ber0Qc",
  authDomain: "healthtracker-5678a.firebaseapp.com",
  databaseURL: "https://healthtracker-5678a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "healthtracker-5678a",
  storageBucket: "healthtracker-5678a.firebasestorage.app",
  messagingSenderId: "301197149425",
  appId: "1:301197149425:web:b6eb830f11bfa0fb725550"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);