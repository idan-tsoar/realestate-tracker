/* ════════════════════════════════════════════════════════════
   app.js — Main application orchestrator
   ════════════════════════════════════════════════════════════ */

const App = (() => {

  let _currentTab = 'properties';

  function init(user) {
    _currentTab = 'properties';
    _showTab('properties');
    Props.start(user.uid);
    Clients.start(user.uid);
  }

  function reset() {
    Props.stop();
    Clients.stop();
  }

  function _showTab(tab) {
    _currentTab = tab;
    document.querySelectorAll('.page-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.querySelectorAll('.page-section').forEach(el => {
      el.classList.toggle('active', el.id === 'sec-' + tab);
    });
  }

  function switchTab(tab) { _showTab(tab); }

  return { init, reset, switchTab };

})();

/* ── Close overlays on background click ──────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  ['prop-modal','client-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeOverlay(id); });
  });

  const match = document.getElementById('match-panel');
  if (match) match.addEventListener('click', e => { if (e.target === match) closeOverlay('match-panel'); });
});
