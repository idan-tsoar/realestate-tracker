/* ════════════════════════════════════════════════════════════
   auth.js — Authentication (login, register, logout)
   ════════════════════════════════════════════════════════════ */

function switchAuthTab(t) {
  document.getElementById('tab-login').classList.toggle('active', t === 'login');
  document.getElementById('tab-reg').classList.toggle('active',   t === 'reg');
  document.getElementById('frm-login').style.display = t === 'login' ? '' : 'none';
  document.getElementById('frm-reg').style.display   = t === 'reg'   ? '' : 'none';
  document.getElementById('auth-err').style.display  = 'none';
}

function showAuthErr(msg) {
  const el = document.getElementById('auth-err');
  el.textContent = msg;
  el.style.display = 'block';
}

function authErrMsg(code) {
  const map = {
    'auth/user-not-found':      'משתמש לא קיים במערכת',
    'auth/wrong-password':      'סיסמה שגויה',
    'auth/invalid-credential':  'אימייל או סיסמה שגויים',
    'auth/email-already-in-use':'כתובת המייל כבר רשומה',
    'auth/weak-password':       'הסיסמה חלשה מדי (לפחות 6 תווים)',
    'auth/invalid-email':       'כתובת מייל לא תקינה',
    'auth/too-many-requests':   'יותר מדי ניסיונות — נסה שוב מאוחר יותר',
  };
  return map[code] || 'שגיאה: ' + code;
}

async function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  if (!email || !pass) { showAuthErr('נא למלא אימייל וסיסמה'); return; }
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) { showAuthErr(authErrMsg(e.code)); }
}

async function doRegister() {
  const name    = document.getElementById('r-name').value.trim();
  const company = document.getElementById('r-company').value.trim();
  const email   = document.getElementById('r-email').value.trim();
  const pass    = document.getElementById('r-pass').value;
  if (!name || !email || !pass) { showAuthErr('נא למלא את כל השדות המסומנים בכוכבית'); return; }
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    await db.collection('users').doc(cred.user.uid).set({
      name, company, email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { showAuthErr(authErrMsg(e.code)); }
}

async function doLogout() {
  await auth.signOut();
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display  = 'block';
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      const d   = doc.data();
      document.getElementById('disp-name').textContent = (d && d.name) ? d.name : user.email;
    } catch {
      document.getElementById('disp-name').textContent = user.email;
    }
    App.init(user);
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display  = 'none';
    App.reset();
  }
});
