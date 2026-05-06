/* ════════════════════════════════════════════════════════════
   properties.js — Property management (CRUD, render, detail)
   ════════════════════════════════════════════════════════════ */

const Props = (() => {

  // ── State ────────────────────────────────────────────────
  let _uid        = null;
  let _unsub      = null;
  let _currentId  = null;
  let properties  = [];

  function getAll() { return properties; }
  function getById(id) { return properties.find(p => p.id === id); }

  // ── Load & listen ────────────────────────────────────────
  function start(uid) {
    _uid = uid;
    _showLoading();

    _unsub = db.collection('users').doc(uid).collection('properties')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        properties = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _updateStats();
        Alerts.check(properties, uid);
        render();
      });
  }

  function stop() {
    if (_unsub) { _unsub(); _unsub = null; }
    properties = [];
  }

  // ── Render list ──────────────────────────────────────────
  function render() {
    const q      = (document.getElementById('q-search')?.value || '').toLowerCase();
    const qStat  = document.getElementById('q-status')?.value  || '';
    const qType  = document.getElementById('q-type')?.value    || '';

    const filtered = properties.filter(p => {
      const hit = !q ||
        (p.name||'').toLowerCase().includes(q) ||
        (p.addr||'').toLowerCase().includes(q) ||
        (p.tenant||'').toLowerCase().includes(q) ||
        (p.ownerName||'').toLowerCase().includes(q);
      return hit && (!qStat || p.status === qStat) && (!qType || p.type === qType);
    });

    document.getElementById('p-loading').style.display  = 'none';
    const grid  = document.getElementById('props-grid');
    const empty = document.getElementById('p-empty');

    if (!filtered.length) {
      grid.style.display  = 'none';
      empty.style.display = 'block';
      return;
    }
    grid.style.display  = 'grid';
    empty.style.display = 'none';
    grid.innerHTML = filtered.map(_cardHtml).join('');
  }

  function _cardHtml(p) {
    const days  = daysLeft(p.contractEnd);
    const thumb = (p.photos && p.photos.length)
      ? `<img src="${p.photos[0]}" alt="" />`
      : '🏢';

    const statusLabel = { available:'פנוי', occupied:'מושכר', maintenance:'תחזוקה' };
    const statusClass = { available:'badge-available', occupied:'badge-occupied', maintenance:'badge-maintenance' };

    const expBadge = (days !== null && days <= 90 && days >= 0)
      ? `<div class="expire-badge">⚠️ ${days} ימים</div>` : '';
    const expiredBadge = (days !== null && days < 0)
      ? `<div class="expire-badge">⚠️ חוזה פג!</div>` : '';

    const daysClass = days !== null && days < 0 ? 'crit' : days !== null && days <= 90 ? 'warn' : '';
    const daysHtml  = (days !== null && p.status === 'occupied')
      ? `<span class="days-left ${daysClass}">${days < 0 ? 'חוזה פג!' : days + ' ימים לסיום'}</span>`
      : '';

    return `
    <div class="prop-card" onclick="Props.openDetail('${p.id}')">
      <div class="prop-thumb">
        ${thumb}
        <div class="badge ${statusClass[p.status]||'badge-available'}">${statusLabel[p.status]||'פנוי'}</div>
        ${expBadge}${expiredBadge}
      </div>
      <div class="prop-body">
        <div class="prop-name">${esc(p.name||'נכס ללא שם')}</div>
        <div class="prop-addr">📍 ${esc(p.addr||'כתובת לא מצוינת')}</div>
        <div class="prop-details">
          <div><div class="det-lbl">גודל</div><div class="det-val">${p.size ? p.size + ' מ"ר' : '—'}</div></div>
          <div><div class="det-lbl">סוג</div><div class="det-val">${p.type==='shell'?'מעטפת':'בנוי'}</div></div>
          <div><div class="det-lbl">שכירות</div><div class="det-val">${p.rent ? '₪'+fmtNum(p.rent) : '—'}</div></div>
          <div><div class="det-lbl">דמי ניהול</div><div class="det-val">${p.mgmt ? '₪'+fmtNum(p.mgmt) : '—'}</div></div>
        </div>
      </div>
      <div class="prop-footer">
        <div class="tenant-row">
          ${p.tenant
            ? `<div class="tenant-av">${p.tenant.charAt(0)}</div><span>${esc(p.tenant)}</span>`
            : `<span style="color:var(--muted)">אין שוכר</span>`}
        </div>
        ${daysHtml}
      </div>
    </div>`;
  }

  // ── Stats ────────────────────────────────────────────────
  function _updateStats() {
    const total    = properties.length;
    const avail    = properties.filter(p => p.status === 'available').length;
    const occ      = properties.filter(p => p.status === 'occupied').length;
    const expiring = properties.filter(p => { const d=daysLeft(p.contractEnd); return d!==null&&d<=90&&d>=0; }).length;
    const income   = properties
      .filter(p => p.status === 'occupied')
      .reduce((s,p) => s + (Number(p.rent)||0) + (Number(p.mgmt)||0), 0);

    _set('s-total', total);
    _set('s-avail', avail);
    _set('s-occ',   occ);
    _set('s-exp',   expiring);
    _set('s-inc',  '₪'+fmtNum(income));
  }

  function _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Add / Edit Modal ─────────────────────────────────────
  const FIELDS = [
    'p-name','p-addr','p-size','p-floor','p-parking','p-dir',
    'p-rent','p-mgmt','p-security',
    'p-tenant','p-contact','p-phone','p-temail','p-start','p-end',
    'p-owner-name','p-owner-company','p-owner-phone','p-owner-email',
    'p-notes','p-arnona'
  ];

  function openAdd() {
    document.getElementById('modal-title').textContent = 'הוסף נכס חדש';
    document.getElementById('p-id').value = '';
    FIELDS.forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('p-type').value       = 'built';
    document.getElementById('p-status').value     = 'available';
    document.getElementById('p-vat').value        = 'no';
    document.getElementById('p-arnona-who').value = 'tenant';
    openOverlay('prop-modal');
  }

  function openEdit(id) {
    const p = getById(id || _currentId);
    if (!p) return;
    document.getElementById('modal-title').textContent = 'עריכת נכס';

    const map = {
      'p-id': p.id, 'p-name': p.name, 'p-addr': p.addr,
      'p-size': p.size, 'p-floor': p.floor,
      'p-type': p.type||'built', 'p-status': p.status||'available',
      'p-parking': p.parking, 'p-dir': p.direction,
      'p-rent': p.rent, 'p-mgmt': p.mgmt,
      'p-vat': p.vat||'no', 'p-security': p.security,
      'p-tenant': p.tenant, 'p-contact': p.contact,
      'p-phone': p.phone, 'p-temail': p.tenantEmail,
      'p-start': p.contractStart, 'p-end': p.contractEnd,
      'p-owner-name': p.ownerName, 'p-owner-company': p.ownerCompany,
      'p-owner-phone': p.ownerPhone, 'p-owner-email': p.ownerEmail,
      'p-notes': p.notes,
      'p-arnona': p.arnona, 'p-arnona-who': p.arnonaWho||'tenant',
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    });
    openOverlay('prop-modal');
  }

  async function save() {
    const name = document.getElementById('p-name').value.trim();
    const addr = document.getElementById('p-addr').value.trim();
    if (!name || !addr) { toast('נא למלא שם וכתובת', 'err'); return; }

    const id = document.getElementById('p-id').value;
    const g  = id => document.getElementById(id)?.value || null;

    const data = {
      name, addr,
      size:         g('p-size'),
      floor:        g('p-floor'),
      type:         g('p-type'),
      status:       g('p-status'),
      parking:      g('p-parking'),
      direction:    g('p-dir'),
      rent:         g('p-rent'),
      mgmt:         g('p-mgmt'),
      vat:          g('p-vat'),
      security:     g('p-security'),
      tenant:       g('p-tenant'),
      contact:      g('p-contact'),
      phone:        g('p-phone'),
      tenantEmail:  g('p-temail'),
      contractStart:g('p-start'),
      contractEnd:  g('p-end'),
      ownerName:    g('p-owner-name'),
      ownerCompany: g('p-owner-company'),
      ownerPhone:   g('p-owner-phone'),
      ownerEmail:   g('p-owner-email'),
      notes:        g('p-notes'),
      arnona:       g('p-arnona'),
      arnonaWho:    g('p-arnona-who'),
      updatedAt:    firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      const col = db.collection('users').doc(_uid).collection('properties');
      if (id) {
        await col.doc(id).update(data);
        toast('הנכס עודכן ✓', 'ok');
        // refresh detail panel if open
        if (_currentId === id) openDetail(id);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        data.photos = []; data.floorplans = [];
        await col.add(data);
        toast('הנכס נוסף ✓', 'ok');
      }
      closeOverlay('prop-modal');
    } catch (e) { toast('שגיאה: ' + e.message, 'err'); }
  }

  // ── Detail panel ─────────────────────────────────────────
  function openDetail(id) {
    const p = getById(id);
    if (!p) return;
    _currentId = id;

    // Hero image
    document.getElementById('hero-name').textContent = p.name || '';
    document.getElementById('hero-addr').textContent = p.addr || '';
    const bg = document.getElementById('hero-bg');
    if (p.photos && p.photos.length) {
      bg.innerHTML = `<img src="${p.photos[0]}" alt="" />`;
    } else {
      bg.innerHTML = '🏢';
      bg.style.background = 'linear-gradient(135deg,#1e3a8a,#2563eb)';
    }

    // Info grid
    const days = daysLeft(p.contractEnd);
    const statusLabel = { available:'פנוי ✅', occupied:'מושכר 👥', maintenance:'תחזוקה 🔧' };
    const totalRent   = (Number(p.rent)||0) + (Number(p.mgmt)||0);

    const cards = [
      { lbl:'גודל',          val: p.size ? p.size+' מ"ר' : '—' },
      { lbl:'קומה',          val: p.floor || '—' },
      { lbl:'סוג',           val: p.type==='shell' ? 'מעטפת' : 'בנוי' },
      { lbl:'סטטוס',         val: statusLabel[p.status] || '—' },
      { lbl:'שכירות',        val: p.rent ? '₪'+fmtNum(p.rent) : '—', sub: p.vat==='yes' ? 'כולל מע"מ' : '+ מע"מ' },
      { lbl:'דמי ניהול',     val: p.mgmt ? '₪'+fmtNum(p.mgmt) : '—' },
      { lbl:'סה"כ חודשי',    val: totalRent ? '₪'+fmtNum(totalRent) : '—' },
      { lbl:'סיום חוזה',     val: p.contractEnd ? fmtDate(p.contractEnd) : '—',
        sub: days!==null ? (days<0?'⚠️ חוזה פג!':days+' ימים') : '' },
      { lbl:'חניה',          val: p.parking ? p.parking+' מקומות' : '—' },
      { lbl:'כיוון',         val: p.direction || '—' },
      { lbl:'ארנונה שנתית',  val: p.arnona ? '₪'+fmtNum(p.arnona) : '—',
        sub: p.arnona ? (p.arnonaWho==='tenant' ? 'ע"ח שוכר' : 'ע"ח בעלים') : '' },
      { lbl:'ביטחונות',      val: p.security || '—' },
    ];

    document.getElementById('det-info').innerHTML = cards.map(c => `
      <div class="info-card">
        <div class="lbl">${c.lbl}</div>
        <div class="val">${c.val}</div>
        ${c.sub ? `<div class="sub">${c.sub}</div>` : ''}
      </div>`).join('');

    // Tenant block
    const tenEl = document.getElementById('det-tenant');
    if (p.tenant || p.contact) {
      tenEl.innerHTML = `
        <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;">👤 פרטי שוכר</h3>
        <div class="detail-block">
          ${p.tenant  ? `<div><div class="block-lbl">חברה / שוכר</div><div class="block-val">${esc(p.tenant)}</div></div>` : ''}
          ${p.contact ? `<div><div class="block-lbl">איש קשר</div><div class="block-val">${esc(p.contact)}</div></div>` : ''}
          ${p.phone   ? `<div><div class="block-lbl">טלפון</div><div class="block-val"><a href="tel:${p.phone}">${esc(p.phone)}</a></div></div>` : ''}
          ${p.tenantEmail ? `<div><div class="block-lbl">אימייל</div><div class="block-val"><a href="mailto:${p.tenantEmail}">${esc(p.tenantEmail)}</a></div></div>` : ''}
          ${p.contractStart ? `<div><div class="block-lbl">תחילת חוזה</div><div class="block-val">${fmtDate(p.contractStart)}</div></div>` : ''}
          ${p.contractEnd   ? `<div><div class="block-lbl">סיום חוזה</div><div class="block-val" style="${days!==null&&days<=90?'color:var(--danger)':''}">${fmtDate(p.contractEnd)}</div></div>` : ''}
        </div>`;
    } else { tenEl.innerHTML = ''; }

    // Owner block
    const ownEl = document.getElementById('det-owner');
    if (p.ownerName || p.ownerPhone || p.ownerEmail) {
      ownEl.innerHTML = `
        <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;">🏠 פרטי בעל הנכס</h3>
        <div class="detail-block">
          ${p.ownerName    ? `<div><div class="block-lbl">שם</div><div class="block-val">${esc(p.ownerName)}</div></div>` : ''}
          ${p.ownerCompany ? `<div><div class="block-lbl">חברה</div><div class="block-val">${esc(p.ownerCompany)}</div></div>` : ''}
          ${p.ownerPhone   ? `<div><div class="block-lbl">טלפון</div><div class="block-val"><a href="tel:${p.ownerPhone}">${esc(p.ownerPhone)}</a></div></div>` : ''}
          ${p.ownerEmail   ? `<div><div class="block-lbl">אימייל</div><div class="block-val"><a href="mailto:${p.ownerEmail}">${esc(p.ownerEmail)}</a></div></div>` : ''}
        </div>`;
    } else { ownEl.innerHTML = ''; }

    // Notes
    const notesEl = document.getElementById('det-notes');
    notesEl.innerHTML = p.notes
      ? `<h3 style="font-size:15px;font-weight:700;margin-bottom:10px;">📝 הערות</h3>
         <div style="background:var(--bg);border-radius:var(--radius-sm);padding:16px;font-size:14px;line-height:1.65;margin-bottom:24px;">${esc(p.notes)}</div>`
      : '';

    _renderGallery(p.photos     || [], 'photos');
    _renderGallery(p.floorplans || [], 'floorplans');

    document.getElementById('detail-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    document.getElementById('detail-overlay').classList.remove('open');
    document.body.style.overflow = '';
    _currentId = null;
  }

  // ── Delete ───────────────────────────────────────────────
  async function deleteCurrent() {
    if (!_currentId) return;
    if (!confirm('האם אתה בטוח שברצונך למחוק נכס זה?')) return;
    try {
      await db.collection('users').doc(_uid).collection('properties').doc(_currentId).delete();
      closeDetail();
      toast('הנכס נמחק', 'ok');
    } catch (e) { toast('שגיאה במחיקה', 'err'); }
  }

  // ── Media upload ─────────────────────────────────────────
  // ── File type helpers ────────────────────────────────────
  function _getFileName(url) {
    try {
      // Firebase Storage URL: .../TYPE%2FTIMESTAMP_filename.ext?token=...
      const raw = url.split('/o/').pop().split('?')[0];
      const decoded = decodeURIComponent(raw);
      // Take last segment after /
      const base = decoded.split('/').pop();
      // Strip leading timestamp (e.g. "1778056913659_")
      return base.replace(/^\d+_/, '');
    } catch { return 'קובץ'; }
  }

  function _getExt(name) {
    return (name.split('.').pop() || '').toLowerCase();
  }

  const IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','svg','bmp','tiff','avif'];

  function _fileIcon(ext) {
    if (ext === 'pdf')                          return '📄';
    if (['doc','docx'].includes(ext))           return '📝';
    if (['xls','xlsx'].includes(ext))           return '📊';
    if (['dwg','dxf'].includes(ext))            return '📐';
    if (['zip','rar','7z'].includes(ext))       return '🗜️';
    return '📎';
  }

  function _renderGallery(items, type) {
    const gallery = document.getElementById('gallery-'+type);
    const empty   = document.getElementById(type+'-empty');
    if (!items || !items.length) { gallery.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display='none';

    gallery.innerHTML = items.map((url, i) => {
      const name    = _getFileName(url);
      const ext     = _getExt(name);
      const isImage = IMAGE_EXTS.includes(ext);

      if (isImage) {
        return `
        <div class="gallery-item" onclick="openLightbox('${url}')">
          <img src="${url}" alt="${esc(name)}" />
          <button class="gallery-rm" onclick="event.stopPropagation();Props.removeMedia('${type}',${i})" title="מחק">✕</button>
        </div>`;
      }

      // Non-image file — show card with icon + download
      return `
      <div class="file-card">
        <div class="file-card-icon">${_fileIcon(ext)}</div>
        <div class="file-card-name" title="${esc(name)}">${esc(name)}</div>
        <div class="file-card-ext">${ext.toUpperCase()}</div>
        <div class="file-card-actions">
          <a href="${url}" target="_blank" rel="noopener" class="btn btn-secondary btn-xs">פתח</a>
          <a href="${url}" download="${esc(name)}" class="btn btn-primary btn-xs">הורד ⬇</a>
          <button class="btn btn-danger-soft btn-xs" onclick="Props.removeMedia('${type}',${i})">מחק</button>
        </div>
      </div>`;
    }).join('');
  }

  async function uploadMedia(input, type) {
    if (!input.files.length || !_currentId) return;
    const p = getById(_currentId);
    if (!p) return;
    toast('מעלה קבצים...', '');
    const urls = [...(p[type]||[])];
    for (const file of input.files) {
      try {
        const ref = storage.ref(`${_uid}/${_currentId}/${type}/${Date.now()}_${file.name}`);
        await ref.put(file);
        urls.push(await ref.getDownloadURL());
      } catch (e) { toast('שגיאה: '+e.message, 'err'); }
    }
    await db.collection('users').doc(_uid).collection('properties').doc(_currentId).update({ [type]: urls });
    _renderGallery(urls, type);
    toast('הקבצים הועלו ✓', 'ok');
    input.value = '';
  }

  async function removeMedia(type, idx) {
    if (!confirm('למחוק קובץ זה?')) return;
    const p = getById(_currentId);
    if (!p) return;
    const urls = [...(p[type]||[])];
    urls.splice(idx, 1);
    await db.collection('users').doc(_uid).collection('properties').doc(_currentId).update({ [type]: urls });
    p[type] = urls;
    _renderGallery(urls, type);
    toast('הקובץ הוסר', 'ok');
  }

  // ── Helpers ──────────────────────────────────────────────
  function _showLoading() {
    document.getElementById('p-loading').style.display  = 'flex';
    document.getElementById('props-grid').style.display = 'none';
    document.getElementById('p-empty').style.display    = 'none';
  }

  // ── Public API ───────────────────────────────────────────
  return { start, stop, render, getAll, getById, openAdd, openEdit, save, openDetail, closeDetail, deleteCurrent, uploadMedia, removeMedia };

})();
