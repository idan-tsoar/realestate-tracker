/* ════════════════════════════════════════════════════════════
   config.example.js — העתק לקובץ config.js והכנס ערכים אמיתיים
   ════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

const EMAILJS_CONFIG = {
  publicKey:  "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId:  "YOUR_SERVICE_ID",
  templateId: "YOUR_TEMPLATE_ID",
};

firebase.initializeApp(FIREBASE_CONFIG);
const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

if (EMAILJS_CONFIG.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY") {
  emailjs.init(EMAILJS_CONFIG.publicKey);
}
