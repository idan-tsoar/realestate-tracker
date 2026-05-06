/* ════════════════════════════════════════════════════════════
   clients.js — Client management + property matching
   ════════════════════════════════════════════════════════════ */

const Clients = (() => {

  let _uid   = null;
  let _unsub = null;
  let clients = [];

  // ── Load & listen ────────────────────────────────────────
  function start(uid) {
    _uid = uid;
    document.getElementById('c-loading').style.display  = 'flex';
    document.getElementById('clients-grid').style.display = 'none';
    document.getElementById('c-empty').style.display    = 'none';

    _unsub = db.collection('users').doc(uid).collection('clients')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        render();
      });
  }

  function stop() {
    if (_unsub) { _unsub(); _unsub = null; }
    clients = [];
  }

  // ── Render client list ───────────────────────────────────
  function render() {
    const q     = (document.getElementById('c-search')?.value || '').toLowerCase();
    const qStat = document.getElementById('c-status-f')?.value || '';

    const filtered = clients.filter(c => {
      const hit = !q ||
        (c.name||'').toLowerCase().includes(q) ||
        (c.company||'').toLowerCase().includes(q) ||
        (c.phone||'').toLowerCase().includes(q);
      return hit && (!qStat || c.status === qStat);
    });

    document.getElementById('c-loading').style.display    = 'none';
    const grid  = document.getElementById('clients-grid');
    const empty = document.getElementById('c-empty');

    if (!filtered.length) {
      grid.style.display  = 'none';
      empty.style.display = 'block';
      return;
    }
    grid.style.display  = 'grid';
    empty.style.display = 'none';
    grid.innerHTML = filtered.map(_cardHtml).join('');
  }

  function _matchCount(c) {
    return Props.getAll().filter(p => _matches(p, c)).length;
  }

  function _cardHtml(c) {
    const statusClass = { active:'cs-active', inactive:'cs-inactive', closed:'cs-closed' };
    const statusLabel = { active:'פעיל', inactive:'לא פעיל', closed:'סגור' };
    const matches     = _matchCount(c);

    const budget = (c.minBudget || c.maxBudget)
      ? [(c.minBudget ? '₪'+fmtNum(c.minBudget) : ''), (c.maxBudget ? '₪'+fmtNum(c.maxBudget) : '')].filter(Boolean).join(' – ')
      : '—';

    const sizeRange = (c.minSize || c.maxSize)
      ? [(c.minSize||''), (c.maxSize||'')].filter(Boolean).join('–') + ' מ"ר'
      : '—';

    const typeLabel = { built:'בנוי', shell:'מעטפת', any:'כל סוג' };

    return `
    <div class="client-card">
      <div class="client-card-hdr">
        <div class="client-avatar">${(c.name||'?').charAt(0)}</div>
        <div class="client-meta">
          <div class="client-name">${esc(c.name||'לקוח')}</div>
          ${c.company ? `<div class="client-company">${esc(c.company)}</div>` : ''}
          <span class="client-status ${statusClass[c.status]||'cs-active'}">${statusLabel[c.status]||'פעיל'}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <button class="btn btn-icon btn-sm" onclick="Clients.openEdit('${c.id}')" title="עריכה">✏️</button>
          <button class="btn btn-icon btn-sm" onclick="Clients.confirmDelete('${c.id}')" title="מחיקה">🗑️</button>
        </div>
      </div>

      <div class="client-reqs">
        <div class="req-item"><div class="req-lbl">תקציב חודשי (שכ' + ניהול)</div><div class="req-val">${budget}</div></div>
        <div class="req-item"><div class="req-lbl">גודל נדרש</div><div class="req-val">${sizeRange}</div></div>
        <div class="req-item"><div class="req-lbl">סוג נכס</div><div class="req-val">${typeLabel[c.preferredType]||'כל סוג'}</div></div>
        <div class="req-item"><div class="req-lbl">חניה מינ'</div><div class="req-val">${c.minParking ? c.minParking+' מקומות' : '—'}</div></div>
        ${c.area ? `<div class="req-item" style="grid-column:1/-1"><div class="req-lbl">אזורים מועדפים</div><div class="req-val">${esc(c.area)}</div></div>` : ''}
        ${c.phone ? `<div class="req-item"><div class="req-lbl">טלפון</div><div class="req-val"><a href="tel:${c.phone}" style="color:var(--primary)">${esc(c.phone)}</a></div></div>` : ''}
        ${c.email ? `<div class="req-item"><div class="req-lbl">אימייל</div><div class="req-val"><a href="mailto:${c.email}" style="color:var(--primary)">${esc(c.email)}</a></div></div>` : ''}
      </div>

      <div class="client-card-ftr">
        <button class="btn btn-success btn-sm" onclick="Clients.openMatch('${c.id}')">
          🔍 מצא נכסים מתאימים
        </button>
        <span class="match-count" title="נכסים פנויים מתאימים">
          ${matches > 0 ? `✅ ${matches} נכסים מתאימים` : ''}
        </span>
      </div>
    </div>`;
  }

  // ── Matching logic ───────────────────────────────────────
  function _matches(prop, client) {
    if (prop.status !== 'available') return false;

    const size    = Number(prop.size)  || 0;
    const total   = (Number(prop.rent)||0) + (Number(prop.mgmt)||0);
    const parking = Number(prop.parking) || 0;

    if (client.minSize    && size    < Number(client.minSize))    return false;
    if (client.maxSize    && size    > Number(client.maxSize))    return false;
    if (client.minBudget  && total   < Number(client.minBudget))  return false;
    if (client.maxBudget  && total   > Number(client.maxBudget))  return false;
    if (client.minParking && parking < Number(client.minParking)) return false;
    if (client.preferredType && client.preferredType !== 'any' && prop.type !== client.preferredType) return false;

    return true;
  }

  function _matchScore(prop, client) {
    // Returns 0-100 score for how well a prop matches (for sorting)
    let score = 0;
    const size  = Number(prop.size)  || 0;
    const total = (Number(prop.rent)||0) + (Number(prop.mgmt)||0);
    if (client.minSize && size >= Number(client.minSize))   score += 20;
    if (client.maxSize && size <= Number(client.maxSize))   score += 20;
    if (client.minBudget && total >= Number(client.minBudget)) score += 25;
    if (client.maxBudget && total <= Number(client.maxBudget)) score += 25;
    if (!client.preferredType || client.preferredType === 'any' || prop.type === client.preferredType) score += 10;
    return score;
  }

  // ── Match dialog ─────────────────────────────────────────
  function openMatch(clientId) {
    const c = clients.find(x => x.id === clientId);
    if (!c) return;

    const matching = Props.getAll()
      .filter(p => _matches(p, c))
      .map(p => ({ ...p, _score: _matchScore(p, c) }))
      .sort((a,b) => b._score - a._score);

    document.getElementById('match-client-name').textContent = c.name || 'לקוח';

    const body = document.getElementById('match-body');
    if (!matching.length) {
      body.innerHTML = `
        <div class="empty-state" style="padding:40px 20px">
          <div class="big">🔍</div>
          <h3>לא נמצאו נכסים מתאימים</h3>
          <p>נסה לשנות את הקריטריונים של הלקוח</p>
        </div>`;
    } else {
      body.innerHTML = `
        <p style="color:var(--muted);font-size:13px;margin-bottom:16px;">נמצאו <strong>${matching.length}</strong> נכסים פנויים העונים על הדרישות:</p>
        <div class="properties-grid">
          ${matching.map(p => _matchCardHtml(p, c)).join('')}
        </div>`;
    }

    openOverlay('match-panel');
  }

  function _matchCardHtml(p, c) {
    const total = (Number(p.rent)||0) + (Number(p.mgmt)||0);
    const thumb = (p.photos && p.photos.length)
      ? `<img src="${p.photos[0]}" alt="" />`
      : '🏢';
    const score = p._score;

    return `
    <div class="prop-card" onclick="Props.openDetail('${p.id}');closeOverlay('match-panel')">
      <div class="prop-thumb">
        ${thumb}
        <div class="badge badge-available">פנוי</div>
        <div class="match-score-badge">התאמה ${score}%</div>
      </div>
      <div class="prop-body">
        <div class="prop-name">${esc(p.name||'נכס')}</div>
        <div class="prop-addr">📍 ${esc(p.addr||'')}</div>
        <div class="prop-details">
          <div><div class="det-lbl">גודל</div><div class="det-val">${p.size ? p.size+' מ"ר' : '—'}</div></div>
          <div><div class="det-lbl">סוג</div><div class="det-val">${p.type==='shell'?'מעטפת':'בנוי'}</div></div>
          <div><div class="det-lbl">עלות חודשית</div><div class="det-val">${total ? '₪'+fmtNum(total) : '—'}</div></div>
          <div><div class="det-lbl">חניה</div><div class="det-val">${p.parking ? p.parking+' מק׳' : '—'}</div></div>
        </div>
      </div>
    </div>`;
  }

  // ── Add / Edit Modal ─────────────────────────────────────
  const C_FIELDS = ['c-name','c-company','c-phone','c-email',
    'c-min-size','c-max-size','c-min-budget','c-max-budget','c-min-parking',
    'c-area','c-notes'];

  function openAdd() {
    document.getElementById('c-modal-title').textContent = 'הוסף לקוח חדש';
    document.getElementById('c-id').value = '';
    C_FIELDS.forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('c-pref-type').value = 'any';
    document.getElementById('c-status').value    = 'active';
    openOverlay('client-modal');
  }

  function openEdit(id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
    document.getElementById('c-modal-title').textContent = 'עריכת לקוח';

    const map = {
      'c-id': c.id, 'c-name': c.name, 'c-company': c.company,
      'c-phone': c.phone, 'c-email': c.email,
      'c-status': c.status||'active',
      'c-pref-type': c.preferredType||'any',
      'c-min-size': c.minSize, 'c-max-size': c.maxSize,
      'c-min-budget': c.minBudget, 'c-max-budget': c.maxBudget,
      'c-min-parking': c.minParking,
      'c-area': c.area, 'c-notes': c.notes,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    });
    openOverlay('client-modal');
  }

  async function save() {
    const name = document.getElementById('c-name').value.trim();
    if (!name) { toast('נא למלא שם לקוח', 'err'); return; }

    const id  = document.getElementById('c-id').value;
    const g   = id => document.getElementById(id)?.value || null;

    const data = {
      name,
      company:       g('c-company'),
      phone:         g('c-phone'),
      email:         g('c-email'),
      status:        g('c-status')    || 'active',
      preferredType: g('c-pref-type') || 'any',
      minSize:       g('c-min-size')  ? Number(g('c-min-size'))   : null,
      maxSize:       g('c-max-size')  ? Number(g('c-max-size'))   : null,
      minBudget:     g('c-min-budget')? Number(g('c-min-budget')) : null,
      maxBudget:     g('c-max-budget')? Number(g('c-max-budget')) : null,
      minParking:    g('c-min-parking')? Number(g('c-min-parking')): null,
      area:          g('c-area'),
      notes:         g('c-notes'),
      updatedAt:     firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      const col = db.collection('users').doc(_uid).collection('clients');
      if (id) {
        await col.doc(id).update(data);
        toast('הלקוח עודכן ✓', 'ok');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await col.add(data);
        toast('הלקוח נוסף ✓', 'ok');
      }
      closeOverlay('client-modal');
    } catch (e) { toast('שגיאה: '+e.message, 'err'); }
  }

  async function confirmDelete(id) {
    if (!confirm('למחוק לקוח זה?')) return;
    try {
      await db.collection('users').doc(_uid).collection('clients').doc(id).delete();
      toast('הלקוח נמחק', 'ok');
    } catch (e) { toast('שגיאה', 'err'); }
  }

  return { start, stop, render, openAdd, openEdit, save, confirmDelete, openMatch };

})();
