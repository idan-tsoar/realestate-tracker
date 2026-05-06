/* ════════════════════════════════════════════════════════════
   utils.js — Helper functions (globals)
   ════════════════════════════════════════════════════════════ */

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((end - now) / 86400000);
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function fmtNum(n) {
  const num = Number(n);
  if (!num) return '0';
  return num.toLocaleString('he-IL');
}

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

let _toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function openOverlay(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeOverlay(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = '';       }

function openLightbox(url) {
  document.getElementById('lb-img').src = url;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}
