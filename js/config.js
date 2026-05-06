/* ════════════════════════════════════════════════════════════
   config.js — Firebase + EmailJS configuration
   עדכן את הערכים כאן לפני הפעלת האפליקציה
   ════════════════════════════════════════════════════════════

   שלב 1 — Firebase:
   1. כנס ל-https://console.firebase.google.com
   2. צור פרויקט חדש
   3. הפעל: Authentication → Email/Password
   4. הפעל: Firestore Database (Production mode)
   5. הפעל: Storage
   6. לחץ על ⚙️ → Project Settings → Web app → Copy config

   שלב 2 — EmailJS (התראות מייל אוטומטיות):
   1. הירשם בחינם ב-https://www.emailjs.com
   2. צור Email Service (Gmail / Outlook)
   3. צור Email Template — משתני תבנית:
      {{to_email}} {{property_name}} {{address}}
      {{tenant}} {{days_left}} {{contract_end}} {{rent}}
   4. העתק Service ID, Template ID, Public Key לכאן
   ════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAstD20t4_2Hew0lnhgU-0ILYG9T4SDxhw",
  authDomain: "ortal-oficina.firebaseapp.com",
  projectId: "ortal-oficina",
  storageBucket: "ortal-oficina.firebasestorage.app",
  messagingSenderId: "860434400881",
  appId: "1:860434400881:web:0126a8e4b7a226c1e4bdd0",
  measurementId: "G-Y0QR5VMCX5"
};

const EMAILJS_CONFIG = {
  publicKey:  "pczCEgFBLahJbRNJQ",  // מ-EmailJS → Account → General
  serviceId:  "service_t1bfmdk",          // מ-EmailJS → Email Services
  templateId: "template_gu77toc",         // מ-EmailJS → Email Templates
};

/* ── Initialize ─────────────────────────────────────────────── */
firebase.initializeApp(FIREBASE_CONFIG);

const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

if (EMAILJS_CONFIG.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY") {
  emailjs.init(EMAILJS_CONFIG.publicKey);
}
