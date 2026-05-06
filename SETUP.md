# הגדרת מערכת ניהול נכסי נדל"ן

## שלב 1 — הגדרת Firebase (5 דקות)

1. כנס ל-[console.firebase.google.com](https://console.firebase.google.com)
2. לחץ **Add project** → תן שם → צור
3. הפעל **Authentication**:
   - לחץ על Authentication → Get started → Email/Password → Enable → Save
4. הפעל **Firestore Database**:
   - לחץ על Firestore → Create database → Production mode → בחר אזור → Enable
5. הפעל **Storage**:
   - לחץ על Storage → Get started → Production mode → Done
6. קבל את ה-Config:
   - ⚙️ Project Settings → Your apps → Web app (`</>`) → Register app
   - העתק את `firebaseConfig`

## שלב 2 — עדכון הקובץ

פתח את הקובץ **`js/config.js`** והחלף:
```js
const FIREBASE_CONFIG = {
  apiKey:            "...",   // ← הדבק כאן
  authDomain:        "...",
  projectId:         "...",
  storageBucket:     "...",
  messagingSenderId: "...",
  appId:             "..."
};
```

## שלב 3 — העלאת Firestore Rules

בטרמינל (בתיקיית הפרויקט):
```bash
npm install -g firebase-tools
firebase login
firebase init firestore    # בחר את הפרויקט שיצרת
firebase deploy --only firestore:rules
firebase deploy --only storage
```

**לחלופין** — ניתן להדביד את הרולס ידנית בקונסול:
- Firestore → Rules → העתק תוכן `firestore.rules` → Publish
- Storage → Rules → העתק תוכן `storage.rules` → Publish

## שלב 4 — הפעלת האתר (אופציונלי — Firebase Hosting)

```bash
firebase init hosting      # Public directory: . (נקודה)
firebase deploy
```
האתר יהיה זמין ב: `https://YOUR_PROJECT_ID.web.app`

---

## התראות מייל (אופציונלי)

1. הירשם ב-[emailjs.com](https://www.emailjs.com) (חינם עד 200 מיילים/חודש)
2. Email Services → Add Service → בחר Gmail/Outlook
3. Email Templates → Create Template, השתמש במשתנים:
   ```
   נכס {{property_name}} בכתובת {{address}}
   שוכר: {{tenant}}
   ימים לסיום חוזה: {{days_left}}
   תאריך סיום: {{contract_end}}
   ```
4. עדכן ב-`js/config.js`:
   ```js
   const EMAILJS_CONFIG = {
     publicKey:  "...",
     serviceId:  "...",
     templateId: "...",
   };
   ```

---

## מבנה הקבצים

```
realestate tracker/
├── index.html           ← דף הכניסה הראשי
├── css/
│   └── styles.css       ← עיצוב
├── js/
│   ├── config.js        ← 🔧 עדכן כאן את ה-Firebase config
│   ├── utils.js         ← פונקציות עזר
│   ├── auth.js          ← כניסה / הרשמה
│   ├── properties.js    ← ניהול נכסים
│   ← clients.js        ← ניהול לקוחות + התאמה
│   ├── alerts.js        ← התראות חוזה
│   └── app.js           ← אורכסטרטור
├── firestore.rules      ← כללי אבטחה Firestore
└── storage.rules        ← כללי אבטחה Storage
```

## פתיחה מקומית (ללא hosting)

האתר **לא יעבוד** בדפדפן כ-`file://` בגלל CORS של Firebase.

הפתרון הקל ביותר — הפעל שרת לוקאלי:
```bash
# Python
python -m http.server 8000

# Node
npx serve .

# VS Code — התקן Live Server extension
```
ואז פתח: `http://localhost:8000`
