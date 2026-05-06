/* ════════════════════════════════════════════════════════════
   alerts.js — Contract expiry alerts + email notifications
   ════════════════════════════════════════════════════════════ */

const Alerts = (() => {

  let _sentAlerts = new Set(JSON.parse(localStorage.getItem('sentAlerts') || '[]'));

  function check(properties, uid) {
    const expiring = properties.filter(p => {
      const d = daysLeft(p.contractEnd);
      return d !== null && d <= 90 && d >= 0;
    });

    const banner  = document.getElementById('alert-banner');
    const textEl  = document.getElementById('alert-text');

    if (expiring.length) {
      banner.style.display = 'flex';
      textEl.innerHTML =
        `<strong>התראה:</strong> ${expiring.length} חוזה/ים מסתיים/ים בתוך 90 יום: ` +
        expiring.map(p =>
          `<strong>${esc(p.name)}</strong> (${daysLeft(p.contractEnd)} ימים)`
        ).join(', ');

      // Throttle: send once per property per calendar month
      const monthKey = `${new Date().getFullYear()}_${new Date().getMonth()}`;
      expiring.forEach(p => {
        const key = `${p.id}_${monthKey}`;
        if (!_sentAlerts.has(key)) {
          _sendEmail(p, uid);
          _sentAlerts.add(key);
        }
      });
      localStorage.setItem('sentAlerts', JSON.stringify([..._sentAlerts]));
    } else {
      banner.style.display = 'none';
    }
  }

  async function _sendEmail(prop, uid) {
    if (EMAILJS_CONFIG.publicKey === 'YOUR_EMAILJS_PUBLIC_KEY') return;
    try {
      const user = auth.currentUser;
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
        to_email:      user ? user.email : '',
        property_name: prop.name   || 'נכס',
        address:       prop.addr   || '—',
        tenant:        prop.tenant || 'לא מצוין',
        days_left:     daysLeft(prop.contractEnd),
        contract_end:  fmtDate(prop.contractEnd),
        rent:          prop.rent ? '₪' + fmtNum(prop.rent) : '—',
      });
    } catch (e) {
      console.warn('EmailJS error:', e);
    }
  }

  return { check };

})();
