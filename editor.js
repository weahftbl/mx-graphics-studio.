'use strict';
/* =====================================================================
   MX GRAPHICS STUDIO — editor.js
   Interactions canvas, calques, propriétés, historique, export.
   ===================================================================== */
let P = null, selId = null, hist = [], hi = -1, drag = null, guides = [], lastTap = { id: null, t: 0 };
let bound = [], tab = 'model', sheetOpen = false, saveTimer = null, raf = 0;
const view = { scale: 0.4 };
const LIB = { players: [], logos: [] };
const $cv = $('#cv'), $ov = $('#ov'), $stage = $('#stage');
const cx = $cv.getContext('2d'), ox = $ov.getContext('2d');
const PAL = ['#ffffff', '#0033A0', '#29b6ff', '#d53bff', '#f2c200', '#ff2d55', '#0a0f24'];
const isMobile = () => innerWidth < 900;
const sel = () => (P && P.elements.find(e => e.id === selId)) || null;
const byTag = t => P && P.elements.find(e => e.tag === t);
const labelOf = e => e.type === 'text' ? ((e.text || '').replace(/\n/g, ' ').slice(0, 24) || 'Texte') : e.type === 'player' ? (e.name || 'Joueur') : e.type === 'stat' ? e.label : (e.name || TYPE_NAMES[e.type]);

/* ---------- Rendu ---------- */
function requestRender() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; paint(); }); }
function paint() { if (!P) return; renderProject(cx, P, {}); drawOverlay(); }

function rotPt(e, lx, ly) {
  const a = e.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return { x: e.x + e.w / 2 + lx * c - ly * s, y: e.y + e.h / 2 + lx * s + ly * c };
}
function handlesOf(e) {
  const out = [];
  [[-1, -1, 'tl'], [1, -1, 'tr'], [-1, 1, 'bl'], [1, 1, 'br']].forEach(([sx, sy, m]) => { const p = rotPt(e, sx * e.w / 2, sy * e.h / 2); out.push({ mode: m, sx, sy, x: p.x, y: p.y }); });
  const r = rotPt(e, 0, -e.h / 2 - 64 / view.scale); out.push({ mode: 'rot', x: r.x, y: r.y });
  return out;
}
function drawOverlay() {
  ox.clearRect(0, 0, W, H);
  const k = 1 / view.scale;
  guides.forEach(g => {
    ox.strokeStyle = 'rgba(255,70,210,.95)'; ox.lineWidth = 1.5 * k; ox.setLineDash([8 * k, 6 * k]); ox.beginPath();
    if (g.v != null) { ox.moveTo(g.v, 0); ox.lineTo(g.v, H); } else { ox.moveTo(0, g.h); ox.lineTo(W, g.h); }
    ox.stroke();
  });
  ox.setLineDash([]);
  const e = sel(); if (!e || e.hidden) return;
  ox.save(); ox.translate(e.x + e.w / 2, e.y + e.h / 2); ox.rotate(e.rot * Math.PI / 180);
  ox.strokeStyle = '#4aa3ff'; ox.lineWidth = 2 * k; ox.strokeRect(-e.w / 2, -e.h / 2, e.w, e.h); ox.restore();
  if (e.locked) return;
  const hs = handlesOf(e), rot = hs[4], top = rotPt(e, 0, -e.h / 2);
  ox.beginPath(); ox.moveTo(top.x, top.y); ox.lineTo(rot.x, rot.y); ox.strokeStyle = '#4aa3ff'; ox.lineWidth = 2 * k; ox.stroke();
  hs.forEach(h => { ox.beginPath(); ox.arc(h.x, h.y, (h.mode === 'rot' ? 14 : 12) * k, 0, 7); ox.fillStyle = '#fff'; ox.fill(); ox.lineWidth = 3 * k; ox.strokeStyle = '#2b7bff'; ox.stroke(); });
}

function fit() {
  const host = $('#stageHost'); if (!host) return;
  const r = host.getBoundingClientRect(); if (r.width < 10) return;
  const m = isMobile(), pad = m ? 10 : 30;
  const aw = r.width - pad * 2, ah = r.height - pad * 2 - (m ? 50 : 56);
  const s = Math.max(.1, Math.min(aw / W, ah / H));
  const w = Math.floor(W * s);
  $stage.style.width = w + 'px'; $stage.style.height = Math.round(w * H / W) + 'px';
  view.scale = w / W; requestRender();
}
new ResizeObserver(fit).observe($('#stageHost'));
addEventListener('resize', fit);

/* ---------- Historique & sauvegarde ---------- */
const snap = () => JSON.stringify({ e: P.elements, bg: P.bg, f: P.formation, n: P.name });
function commit(initial) {
  const s = snap(); if (hist[hi] === s) return;
  hist = hist.slice(0, hi + 1); hist.push(s); if (hist.length > 80) hist.shift(); hi = hist.length - 1;
  updateUndo(); if (!initial) scheduleSave();
}
function restore(i) {
  hi = i; const o = JSON.parse(hist[i]);
  P.elements = o.e; P.bg = o.bg; P.formation = o.f; P.name = o.n; $('#projName').value = P.name;
  if (selId && !sel()) selId = null;
  refreshAll(); updateUndo(); scheduleSave();
}
const undo = () => { if (hi > 0) restore(hi - 1); };
const redo = () => { if (hi < hist.length - 1) restore(hi + 1); };
function updateUndo() { $('#btnUndo').disabled = hi <= 0; $('#btnRedo').disabled = hi >= hist.length - 1; }
function setSaveState(t, ok) { const s = $('#saveState'); s.textContent = t; s.classList.toggle('ok', !!ok); }
function scheduleSave() { setSaveState('Enregistrement…'); clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 700); }
async function saveNow() {
  clearTimeout(saveTimer); if (!P) return;
  try {
    renderProject(cx, P, {}); P.thumb = makeThumb($cv, 360); P.updated = Date.now();
    await DB.put('projects', P); setSaveState('Enregistré ✓', true);
  } catch (e) { console.error(e); setSaveState('Erreur de sauvegarde'); }
}

/* ---------- Sélection & modifications ---------- */
function refreshAll() { renderLayers(); buildProps(); buildModel(); buildBg(); updateQuick(); requestRender(); }
function select(id, fromCanvas) {
  selId = id; renderLayers(); buildProps(); updateQuick(); requestRender();
  if (id && fromCanvas && (!isMobile() || sheetOpen)) setTab('props', true);
}
function refreshBound() { bound.forEach(f => f()); }
function place(e) { ensureLayout(e); e.x = Math.round((W - e.w) / 2); e.y = Math.round((H - e.h) / 2 + (P.elements.length % 6) * 24 - 60); }
function addEl(e, center = true) { if (center) place(e); P.elements.push(e); commit(); select(e.id); setTab('props'); }
function dup() { const e = sel(); if (!e) return; const c = JSON.parse(JSON.stringify(e)); c.id = uid(); c.x += 36; c.y += 36; c.tag = undefined; P.elements.splice(P.elements.indexOf(e) + 1, 0, c); commit(); select(c.id); }
function del() { const e = sel(); if (!e) return; P.elements = P.elements.filter(x => x !== e); selId = null; commit(); refreshAll(); }
function moveZ(id, d) { const i = P.elements.findIndex(e => e.id === id), j = i + d; if (i < 0 || j < 0 || j >= P.elements.length) return; [P.elements[i], P.elements[j]] = [P.elements[j], P.elements[i]]; commit(); renderLayers(); requestRender(); }
function toggleLock(e) { e.locked = !e.locked; commit(); renderLayers(); updateQuick(); requestRender(); }

/* ---------- Interaction canvas ---------- */
function toStage(ev) { const r = $stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height }; }
function hitTest(p) {
  for (let i = P.elements.length - 1; i >= 0; i--) {
    const e = P.elements[i]; if (e.hidden || e.locked) continue; ensureLayout(e);
    const a = -e.rot * Math.PI / 180, dx = p.x - (e.x + e.w / 2), dy = p.y - (e.y + e.h / 2);
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= e.w / 2 && Math.abs(ly) <= e.h / 2) return e;
  }
  return null;
}
function hitHandle(e, p) {
  const r = 26 / view.scale;
  return handlesOf(e).find(h => Math.hypot(h.x - p.x, h.y - p.y) <= r) || null;
}
$stage.addEventListener('pointerdown', ev => {
  if (!P) return; ev.preventDefault(); $stage.setPointerCapture(ev.pointerId);
  const p = toStage(ev), e = sel();
  if (e && !e.locked && !e.hidden) {
    const h = hitHandle(e, p);
    if (h) {
      if (h.mode === 'rot') drag = { mode: 'rot', id: e.id, moved: false };
      else drag = { mode: 'resize', id: e.id, sx: h.sx, sy: h.sy, opp: rotPt(e, -h.sx * e.w / 2, -h.sy * e.h / 2), w: e.w, h: e.h, size: e.size, moved: false };
      return;
    }
  }
  const hit = hitTest(p);
  if (hit) { select(hit.id, true); drag = { mode: 'move', id: hit.id, sp: p, ox: hit.x, oy: hit.y, moved: false }; }
  else { select(null); drag = null; }
});
$stage.addEventListener('pointermove', ev => {
  if (!drag || !P) return;
  const e = P.elements.find(x => x.id === drag.id); if (!e) return;
  const p = toStage(ev), k = 1 / view.scale;
  if (drag.mode === 'move') {
    const dx = p.x - drag.sp.x, dy = p.y - drag.sp.y;
    if (!drag.moved && Math.hypot(dx, dy) < 7 * k) return;
    drag.moved = true;
    let nx = drag.ox + dx, ny = drag.oy + dy; guides = [];
    const th = 9 * k;
    if (Math.abs(nx + e.w / 2 - W / 2) < th) { nx = W / 2 - e.w / 2; guides.push({ v: W / 2 }); }
    if (Math.abs(ny + e.h / 2 - H / 2) < th) { ny = H / 2 - e.h / 2; guides.push({ h: H / 2 }); }
    e.x = Math.round(nx); e.y = Math.round(ny);
  } else if (drag.mode === 'rot') {
    drag.moved = true;
    let a = Math.atan2(p.y - (e.y + e.h / 2), p.x - (e.x + e.w / 2)) * 180 / Math.PI + 90;
    a = ((a + 180) % 360 + 360) % 360 - 180;
    const snapA = Math.round(a / 45) * 45; if (Math.abs(a - snapA) < 4) a = snapA;
    e.rot = Math.round(a * 10) / 10;
  } else if (drag.mode === 'resize') {
    drag.moved = true;
    const a = -e.rot * Math.PI / 180, dx = p.x - drag.opp.x, dy = p.y - drag.opp.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    let nw = Math.max(30, lx * drag.sx), nh = Math.max(30, ly * drag.sy);
    const lock = e.type === 'player' || e.type === 'text' || ev.shiftKey;
    if (e.type === 'stat') nh = drag.h;
    else if (lock) { const s = Math.max(nw / drag.w, nh / drag.h); nw = drag.w * s; nh = drag.h * s; }
    if (e.type === 'text') { e.size = Math.max(8, Math.round(drag.size * nw / drag.w)); e.w = Math.round(nw); ensureLayout(e); nh = e.h; }
    else if (e.type === 'player') { e.w = Math.round(nw); ensureLayout(e); nh = e.h; }
    else { e.w = Math.round(nw); e.h = Math.round(nh); }
    const ang = e.rot * Math.PI / 180;
    const ccx = drag.opp.x + (drag.sx * e.w / 2) * Math.cos(ang) - (drag.sy * nh / 2) * Math.sin(ang);
    const ccy = drag.opp.y + (drag.sx * e.w / 2) * Math.sin(ang) + (drag.sy * nh / 2) * Math.cos(ang);
    e.x = Math.round(ccx - e.w / 2); e.y = Math.round(ccy - nh / 2);
  }
  refreshBound(); requestRender();
});
function endDrag(ev) {
  if (!drag) return; const d = drag; drag = null; guides = [];
  if (d.moved) commit();
  else if (d.mode === 'move') {
    const now = performance.now();
    if (lastTap.id === d.id && now - lastTap.t < 420) doubleTap(sel());
    lastTap = { id: d.id, t: now };
  }
  requestRender();
}
$stage.addEventListener('pointerup', endDrag);
$stage.addEventListener('pointercancel', endDrag);
function doubleTap(e) {
  if (!e) return;
  if (e.type === 'text') { setTab('props'); setTimeout(() => { const t = $('#propText'); if (t) { t.focus(); t.select(); } }, 80); }
  else if (e.type === 'image' || e.type === 'player') pickForElement(e);
}
addEventListener('keydown', ev => {
  if (!P || $('#editor').hidden) return;
  const tag = (ev.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const mod = ev.ctrlKey || ev.metaKey, e = sel();
  if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
  else if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); redo(); }
  else if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); dup(); }
  else if (e && (ev.key === 'Delete' || ev.key === 'Backspace')) { ev.preventDefault(); del(); }
  else if (e && ev.key.startsWith('Arrow') && !e.locked) {
    ev.preventDefault(); const s = ev.shiftKey ? 10 : 1;
    if (ev.key === 'ArrowLeft') e.x -= s; if (ev.key === 'ArrowRight') e.x += s; if (ev.key === 'ArrowUp') e.y -= s; if (ev.key === 'ArrowDown') e.y += s;
    refreshBound(); requestRender(); clearTimeout(saveTimer); saveTimer = setTimeout(() => { commit(); }, 400);
  }
});

/* ---------- Onglets ---------- */
function setTab(t, keepSheet) {
  tab = t;
  $$('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $$('.panel').forEach(p => p.classList.toggle('on', p.id === 'p' + t[0].toUpperCase() + t.slice(1)));
  if (isMobile() && !keepSheet) { sheetOpen = true; $('#inspector').classList.add('open'); }
}
$('#tabs').addEventListener('click', ev => {
  const b = ev.target.closest('.tab'); if (!b) return;
  if (isMobile() && sheetOpen && tab === b.dataset.tab) { sheetOpen = false; $('#inspector').classList.remove('open'); return; }
  setTab(b.dataset.tab);
});

/* ---------- Modales ---------- */
function openModal(title, body, opts = {}) {
  let ov;
  const close = () => { ov.classList.remove('in'); setTimeout(() => ov.remove(), 220); if (opts.onClose) opts.onClose(); };
  ov = mk('div', { class: 'modal-ov', onclick: e => { if (e.target === ov) close(); } },
    mk('div', { class: 'sheet' + (opts.wide ? ' wide' : '') },
      mk('div', { class: 'sheet-h' }, mk('h3', {}, title), mk('button', { class: 'icon-btn', 'aria-label': 'Fermer', onclick: close, html: icon('x') })),
      mk('div', { class: 'sheet-b' }, body)));
  $('#modalRoot').append(ov); requestAnimationFrame(() => ov.classList.add('in'));
  return close;
}
function pickFile(accept, multiple) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept; if (multiple) i.multiple = true;
    i.onchange = () => res(multiple ? Array.from(i.files) : (i.files[0] || null)); i.click();
  });
}
async function addToLib(kind, name, photo) { const rec = { id: uid(), name, photo }; await DB.put(kind, rec); LIB[kind].push(rec); return rec; }
const prettyName = f => f.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function openPicker(opts) {
  const kind = opts.kind; let q = '', close = () => {};
  const grid = mk('div', { class: 'lib-grid' });
  const saveBox = mk('input', { type: 'checkbox' }); saveBox.checked = true;
  const render = () => {
    grid.innerHTML = '';
    const items = LIB[kind].filter(i => i.name.toLowerCase().includes(q));
    if (!items.length) grid.append(mk('p', { class: 'muted' }, LIB[kind].length ? 'Aucun résultat.' : 'Ta bibliothèque est vide. Importe une image ci-dessus : elle sera enregistrée pour la prochaine fois.'));
    items.forEach(it => grid.append(mk('button', { class: 'lib-item', onclick: () => { opts.onPick(it.photo, it.name); close(); } }, mk('img', { src: it.photo, alt: it.name }), mk('span', {}, it.name))));
  };
  const up = mk('button', { class: 'btn primary', html: icon('upload') + '<span>Importer depuis la galerie</span>', onclick: async () => {
    const f = await pickFile('image/*'); if (!f) return;
    const d = await fileToDataURL(f, kind === 'players' ? 1400 : 900), name = prettyName(f.name);
    if (saveBox.checked) await addToLib(kind, name, d);
    opts.onPick(d, name); close();
  } });
  const body = mk('div', {}, mk('div', { class: 'row gap' }, up),
    mk('label', { class: 'check' }, saveBox, mk('span', {}, 'Enregistrer dans la bibliothèque')),
    mk('input', { class: 'input', placeholder: 'Rechercher dans la bibliothèque…', oninput: e => { q = e.target.value.toLowerCase(); render(); } }), grid);
  render();
  close = openModal(opts.title || (kind === 'players' ? 'Choisir un joueur' : 'Choisir un logo'), body);
}
function setElImage(e, d, name, after) {
  e.src = addAsset(P, d); if (e.type === 'player' && name) e.name = String(name).toUpperCase();
  commit(); refreshAll(); if (after) after();
}
async function pickForElement(e, after) {
  if (e.type === 'player') return openPicker({ kind: 'players', onPick: (d, n) => setElImage(e, d, n, after) });
  if (e.type === 'image' && e.mask === 'none') return openPicker({ kind: 'logos', onPick: (d, n) => setElImage(e, d, null, after) });
  const f = await pickFile('image/*'); if (!f) return;
  setElImage(e, await fileToDataURL(f), null, after);
}

/* ---------- Constructeurs de champs ---------- */
const hexOf = v => { v = String(v || ''); if (/^#[0-9a-f]{6}$/i.test(v)) return v; if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map(c => c + c).join(''); return '#ffffff'; };
function fld(label, ...c) { return mk('div', { class: 'fld' }, mk('label', {}, label), ...c); }
function sec(title, nodes, open = true) { const d = mk('details', { class: 'sec' }, mk('summary', {}, title), mk('div', { class: 'sec-b' }, nodes)); d.open = open; return d; }
function numField(label, o, prop, min, max, step = 1, after) {
  const r = mk('input', { type: 'range', min, max, step }), n = mk('input', { type: 'number', min, max, step, class: 'num' });
  const sync = () => { const v = o[prop]; r.value = v; n.value = Math.round(v * 100) / 100; };
  sync(); bound.push(sync);
  const set = v => { v = parseFloat(v); if (isNaN(v)) return; o[prop] = v; if (after) after(o); ensureLayout(o); requestRender(); };
  r.oninput = () => { set(r.value); n.value = r.value; };
  n.oninput = () => { set(n.value); r.value = n.value; };
  r.onchange = n.onchange = () => commit();
  return fld(label, mk('div', { class: 'row' }, r, n));
}
function colorField(label, o, prop, after) {
  const i = mk('input', { type: 'color', class: 'color' });
  const sync = () => { i.value = hexOf(o[prop]); }; sync(); bound.push(sync);
  i.oninput = () => { o[prop] = i.value; if (after) after(o); requestRender(); }; i.onchange = () => commit();
  const dots = PAL.map(c => mk('button', { class: 'dot', style: `background:${c}`, 'aria-label': c, onclick: () => { o[prop] = c; sync(); if (after) after(o); requestRender(); commit(); } }));
  return fld(label, mk('div', { class: 'row wrap' }, i, mk('div', { class: 'dots' }, dots)));
}
function selField(label, o, prop, opts, after) {
  const s = mk('select', { class: 'input' }, opts.map(([v, t]) => mk('option', { value: v }, t)));
  const sync = () => { s.value = o[prop]; }; sync(); bound.push(sync);
  s.onchange = () => { o[prop] = isNaN(+opts[0][0]) ? s.value : +s.value; if (after) after(o); ensureLayout(o); requestRender(); commit(); };
  return fld(label, s);
}
function chips(label, o, prop, opts, after) {
  const btns = opts.map(([v, t]) => mk('button', { class: 'chip-btn', onclick: () => { o[prop] = v; sync(); if (after) after(o); ensureLayout(o); requestRender(); commit(); } }, t));
  const sync = () => btns.forEach((b, i) => b.classList.toggle('on', o[prop] === opts[i][0])); sync(); bound.push(sync);
  return fld(label, mk('div', { class: 'chips' }, btns));
}
function toggle(label, o, prop, after) {
  const c = mk('input', { type: 'checkbox' }); const sync = () => { c.checked = !!o[prop]; }; sync(); bound.push(sync);
  c.onchange = () => { o[prop] = c.checked; if (after) after(o); ensureLayout(o); requestRender(); commit(); };
  return mk('label', { class: 'switch' }, c, mk('i', {}), mk('span', {}, label));
}
function textInput(label, o, prop, multi, after, id) {
  const i = mk(multi ? 'textarea' : 'input', { class: 'input', rows: multi ? 3 : null, id });
  i.value = o[prop]; bound.push(() => { if (document.activeElement !== i) i.value = o[prop]; });
  i.oninput = () => { o[prop] = i.value; ensureLayout(o); if (after) after(o); requestRender(); };
  i.onchange = () => { commit(); renderLayers(); };
  return fld(label, i);
}
function fontField(label, o, prop) {
  const s = mk('select', { class: 'input' }, fontNames().map(f => mk('option', { value: f, style: `font-family:"${f}"` }, f)));
  s.value = o[prop]; s.onchange = () => { o[prop] = s.value; document.fonts.load(`400 24px "${s.value}"`).then(() => requestRender()); ensureLayout(o); requestRender(); commit(); };
  return fld(label, s);
}
function btn(html, fn, cls = '') { return mk('button', { class: 'btn ' + cls, html, onclick: fn }); }
const WEIGHTS = [[400, 'Normal'], [500, 'Medium'], [600, 'Semi-gras'], [700, 'Gras'], [800, 'Extra-gras'], [900, 'Noir']];
const SHAPES = [['rect', 'Rectangle'], ['round', 'Arrondi'], ['circle', 'Ovale'], ['hex', 'Hexagone'], ['diamond', 'Losange'], ['tri', 'Triangle']];

/* ---------- Panneau Propriétés ---------- */
function buildProps() {
  bound = []; const box = $('#pProps'); box.innerHTML = ''; const e = sel();
  if (!e) {
    box.append(mk('div', { class: 'empty' }, mk('div', { class: 'empty-ic', html: icon('wand', 34) }), mk('h4', {}, 'Aucun élément sélectionné'),
      mk('p', {}, 'Touche un élément du visuel pour le modifier. Double-touche un texte pour l\'éditer, une photo pour la remplacer.'),
      btn(icon('plus') + '<span>Ajouter un élément</span>', () => setTab('add'), 'primary')));
    return;
  }
  box.append(mk('div', { class: 'prop-head' }, mk('span', { class: 'chip' }, TYPE_NAMES[e.type]), mk('b', {}, labelOf(e))));
  if (e.locked) box.append(mk('div', { class: 'note' }, 'Cet élément est verrouillé. Déverrouille-le pour le déplacer.'));

  if (e.type === 'text') {
    const wrap = [];
    wrap.push(textInput('Contenu', e, 'text', true, null, 'propText'));
    wrap.push(fontField('Police', e, 'font'));
    wrap.push(numField('Taille', e, 'size', 8, 400, 1));
    wrap.push(selField('Graisse', e, 'weight', WEIGHTS));
    wrap.push(chips('Alignement', e, 'align', [['left', 'Gauche'], ['center', 'Centre'], ['right', 'Droite']]));
    wrap.push(mk('div', { class: 'row gap' }, toggle('Italique', e, 'italic'), toggle('MAJUSCULES', e, 'upper')));
    wrap.push(colorField('Couleur', e, 'color'));
    wrap.push(toggle('Dégradé vertical', { get dg() { return !!e.color2; }, set dg(v) { e.color2 = v ? '#9db7ff' : ''; } }, 'dg', () => buildProps()));
    if (e.color2) wrap.push(colorField('Couleur du bas', e, 'color2'));
    box.append(sec('Texte', wrap));
    box.append(sec('Espacement & effets', [numField('Largeur du bloc', e, 'w', 50, 1300), numField('Interlettrage', e, 'ls', -5, 30, .5), numField('Interligne', e, 'lh', .7, 2, .01),
      numField('Ombre / lueur', e, 'shadowBlur', 0, 80), colorField('Couleur de l\'ombre', e, 'shadow'), numField('Contour', e, 'strokeW', 0, 20, .5), colorField('Couleur du contour', e, 'stroke')], false));
  }
  if (e.type === 'shape') {
    box.append(sec('Forme', [chips('Type', e, 'shape', SHAPES), colorField('Couleur', e, 'fill'),
      selField('Dégradé', e, 'gradMode', [['none', 'Aucun'], ['two', 'Deux couleurs'], ['fade', 'Fondu transparent']], () => buildProps()),
      e.gradMode === 'two' ? colorField('Couleur 2', e, 'fill2') : null, e.gradMode !== 'none' ? numField('Angle', e, 'angle', 0, 360, 1) : null,
      e.shape === 'round' ? numField('Arrondi', e, 'radius', 0, 300) : null]));
    box.append(sec('Contour & lueur', [numField('Contour', e, 'strokeW', 0, 40), colorField('Couleur du contour', e, 'stroke'), numField('Lueur', e, 'glowBlur', 0, 100), colorField('Couleur de la lueur', e, 'glow')], false));
  }
  if (e.type === 'image') {
    box.append(sec('Image', [btn(icon('image') + '<span>Changer l\'image</span>', () => pickForElement(e), 'primary wide'),
      btn(icon('wand') + '<span>Détourer le fond uni</span>', async () => { if (!e.src) return toast('Ajoute d\'abord une image'); e.src = addAsset(P, await knockout(P.assets[e.src], 34, e.mask === 'none')); commit(); requestRender(); toast('Fond retiré'); }, 'wide'),
      chips('Cadre', e, 'mask', [['rect', 'Carré'], ['round', 'Arrondi'], ['circle', 'Rond'], ['hex', 'Hexagone'], ['diamond', 'Losange'], ['none', 'Libre']], () => buildProps()),
      chips('Ajustement', e, 'fit', [['cover', 'Remplir'], ['contain', 'Contenir']]),
      e.mask === 'round' ? numField('Arrondi', e, 'radius', 0, 300) : null,
      numField('Zoom', e, 'zoom', .3, 4, .01), numField('Décalage horizontal', e, 'ox', -100, 100, .5), numField('Décalage vertical', e, 'oy', -100, 100, .5), toggle('Miroir', e, 'flip')]));
    box.append(sec('Contour & lueur', [numField('Contour', e, 'strokeW', 0, 40), colorField('Couleur du contour', e, 'stroke'), numField('Lueur', e, 'glowBlur', 0, 100), colorField('Couleur de la lueur', e, 'glow')], false));
  }
  if (e.type === 'player') {
    box.append(sec('Joueur', [btn(icon('users') + '<span>Choisir dans la bibliothèque</span>', () => pickForElement(e), 'primary wide'),
      btn(icon('wand') + '<span>Détourer le fond uni</span>', async () => { if (!e.src) return toast('Ajoute d\'abord une photo'); e.src = addAsset(P, await knockout(P.assets[e.src], 34, false)); commit(); requestRender(); toast('Fond retiré'); }, 'wide'),
      textInput('Nom affiché', e, 'name', false), numField('Taille du nom', e, 'nameSize', 12, 60), fontField('Police du nom', e, 'nameFont'), colorField('Couleur du nom', e, 'nameColor'),
      numField('Zoom photo', e, 'zoom', 1, 3, .01), numField('Décalage horizontal', e, 'ox', -60, 60, .5), numField('Décalage vertical', e, 'oy', -60, 60, .5)]));
    box.append(sec('Style du cadre', [colorField('Couleur 1', e, 'c1'), colorField('Couleur 2', e, 'c2'), colorField('Lueur', e, 'glow'), numField('Intensité de la lueur', e, 'glowBlur', 0, 100),
      btn(icon('copy') + '<span>Appliquer ce style à tous les joueurs</span>', () => { P.elements.filter(x => x.type === 'player').forEach(x => ['c1', 'c2', 'glow', 'glowBlur', 'nameColor', 'nameSize', 'nameFont'].forEach(k => x[k] = e[k])); commit(); requestRender(); toast('Style appliqué'); }, 'wide')], false));
  }
  if (e.type === 'stat') {
    box.append(sec('Statistique', [textInput('Intitulé', e, 'label', false), textInput('Valeur gauche', e, 'left', false), textInput('Valeur droite', e, 'right', false),
      colorField('Barre gauche', e, 'c1'), colorField('Barre droite', e, 'c2'), colorField('Texte', e, 'color'),
      btn(icon('copy') + '<span>Appliquer ces couleurs à toutes les barres</span>', () => { P.elements.filter(x => x.type === 'stat').forEach(x => { x.c1 = e.c1; x.c2 = e.c2; x.color = e.color; }); commit(); requestRender(); toast('Couleurs appliquées'); }, 'wide'),
      btn(icon('bars') + '<span>Modifier toutes les stats</span>', openStats, 'primary wide')]));
    box.append(sec('Polices', [fontField('Intitulé', e, 'font'), fontField('Valeurs', e, 'vfont')], false));
  }
  const geo = [numField('Position X', e, 'x', -400, 1500), numField('Position Y', e, 'y', -400, 1750)];
  if (e.type === 'shape' || e.type === 'image') geo.push(numField('Largeur', e, 'w', 20, 1600), numField('Hauteur', e, 'h', 20, 1900));
  if (e.type === 'player' || e.type === 'stat') geo.push(numField('Largeur', e, 'w', 40, 1300));
  geo.push(numField('Rotation', e, 'rot', -180, 180, .5), numField('Opacité', e, 'opacity', 0, 1, .01));
  box.append(sec('Position & taille', geo, e.type === 'shape' || e.type === 'image'));
}

/* ---------- Calques ---------- */
function renderLayers() {
  const box = $('#pLayers'); box.innerHTML = '';
  if (!P) return;
  box.append(mk('h4', { class: 'ph' }, 'Calques ', mk('small', {}, P.elements.length + ' éléments')));
  if (!P.elements.length) box.append(mk('p', { class: 'muted' }, 'Aucun élément pour le moment.'));
  const list = mk('div', { class: 'layers' });
  [...P.elements].reverse().forEach(e => {
    const ib = (ic, t, fn) => mk('button', { class: 'lbtn', title: t, 'aria-label': t, html: icon(ic, 16), onclick: ev => { ev.stopPropagation(); fn(); } });
    const ico = { text: 'type', shape: 'square', image: 'image', player: 'hex', stat: 'bars' }[e.type];
    list.append(mk('div', { class: 'layer' + (e.id === selId ? ' sel' : '') + (e.hidden ? ' off' : ''), onclick: () => select(e.id, false) },
      mk('span', { class: 'lico', html: icon(ico, 16) }), mk('span', { class: 'lname' }, labelOf(e)),
      ib('up', 'Avancer', () => moveZ(e.id, 1)), ib('down', 'Reculer', () => moveZ(e.id, -1)),
      ib(e.hidden ? 'eyeoff' : 'eye', 'Afficher / masquer', () => { e.hidden = !e.hidden; commit(); renderLayers(); requestRender(); }),
      ib(e.locked ? 'lock' : 'unlock', 'Verrouiller', () => toggleLock(e))));
  });
  box.append(list);
}

function updateQuick() {
  const q = $('#quick'); q.innerHTML = ''; const e = sel(); q.classList.toggle('show', !!e); if (!e) return;
  const b = (ic, t, fn, cls = '') => mk('button', { class: 'qb ' + cls, title: t, 'aria-label': t, onclick: fn, html: icon(ic, 19) });
  if (e.type === 'image' || e.type === 'player') q.append(b('image', 'Changer la photo', () => pickForElement(e)));
  q.append(b('copy', 'Dupliquer', dup), b('up', 'Avancer', () => moveZ(e.id, 1)), b('down', 'Reculer', () => moveZ(e.id, -1)),
    b(e.locked ? 'lock' : 'unlock', e.locked ? 'Déverrouiller' : 'Verrouiller', () => toggleLock(e)), b('trash', 'Supprimer', del, 'danger'));
}

/* ---------- Panneau Ajouter ---------- */
function buildAdd() {
  const box = $('#pAdd'); box.innerHTML = '';
  const tile = (ic, t, fn, sub) => mk('button', { class: 'tile', onclick: fn }, mk('span', { class: 'tile-ic', html: icon(ic, 24) }), mk('b', {}, t), sub ? mk('small', {}, sub) : null);
  box.append(mk('h4', { class: 'ph' }, 'Ajouter à ton visuel'));
  box.append(mk('div', { class: 'tiles' },
    tile('type', 'Texte', () => addEl(T.text({ text: 'TON TEXTE', size: 90 }))),
    tile('type', 'Titre XL', () => addEl(T.text({ text: 'TITRE', size: 170, shadow: '#2d7bff', shadowBlur: 30, name: 'Titre' }))),
    tile('image', 'Photo', async () => { const f = await pickFile('image/*'); if (!f) return; const d = await fileToDataURL(f), im = await loadImage(d); const w = 640; addEl(T.image({ src: addAsset(P, d), w, h: Math.round(w * im.naturalHeight / im.naturalWidth), name: 'Photo' })); }, 'depuis ta galerie'),
    tile('users', 'Logo club', () => openPicker({ kind: 'logos', onPick: async (d) => { const im = await loadImage(d); const w = 220; addEl(T.image({ src: addAsset(P, d), w, h: Math.round(w * im.naturalHeight / im.naturalWidth), mask: 'none', fit: 'contain', name: 'Logo' })); } }), 'bibliothèque'),
    tile('zap', 'Logo MX', async () => { const mx = await getMXLogo(); P.assets.mxlogo = mx.src; addEl(T.image({ src: 'mxlogo', w: 220, h: Math.round(220 * mx.ratio), mask: 'none', fit: 'contain', name: 'Logo MX' })); }),
    tile('hex', 'Joueur', () => addEl(T.player({ name: 'JOUEUR' }))),
    tile('bars', 'Barre stat', () => addEl(T.stat({ label: 'Statistique', left: '10', right: '12' }))),
    tile('zap', 'Bandeau', () => { const s = T.shape({ x: 0, y: 600, w: 600, h: 104, fill: '#0033A0', glow: '#2d7bff', glowBlur: 24, name: 'Bandeau' }), t = T.text({ text: 'BREAKING', x: 40, y: 615, w: 520, size: 70, italic: true, align: 'left', name: 'Texte bandeau' }); P.elements.push(s, t); commit(); select(t.id); setTab('props'); })));
  box.append(mk('h4', { class: 'ph' }, 'Formes'));
  box.append(mk('div', { class: 'shapes' }, SHAPES.map(([k, n]) => mk('button', { class: 'shape-btn', onclick: () => addEl(T.shape({ shape: k, w: k === 'circle' || k === 'hex' || k === 'diamond' || k === 'tri' ? 300 : 500, h: k === 'rect' || k === 'round' ? 220 : 300, name: n })) },
    mk('span', { html: '<svg viewBox="0 0 40 40" width="34" height="34" fill="currentColor">' + { rect: '<rect x="4" y="9" width="32" height="22"/>', round: '<rect x="4" y="9" width="32" height="22" rx="8"/>', circle: '<circle cx="20" cy="20" r="15"/>', hex: '<path d="M20 3l15 8.5v17L20 37 5 28.5v-17z"/>', diamond: '<path d="M20 3l16 17-16 17L4 20z"/>', tri: '<path d="M20 5l16 30H4z"/>' }[k] + '</svg>' }), mk('span', {}, n)))));
  box.append(mk('p', { class: 'muted' }, 'Astuce : tire les poignées blanches pour redimensionner, la poignée du haut pour tourner. Un aimant te guide au centre du visuel.'));
}

/* ---------- Panneau Modèle (édition rapide) ---------- */
function buildModel() {
  const b = $('#pModel'); b.innerHTML = ''; if (!P) return;
  b.append(mk('h4', { class: 'ph' }, 'Édition rapide ', mk('small', {}, TPL_NAMES[P.type])));
  let any = false;
  const tf = (label, tag, multi) => { const e = byTag(tag); if (!e) return; any = true; b.append(textInput(label, e, 'text', multi, null)); };
  const lg = (label, tag) => {
    const e = byTag(tag); if (!e) return; any = true;
    const src = e.src && P.assets[e.src];
    b.append(mk('button', { class: 'logo-btn', onclick: () => pickForElement(e) }, mk('span', { class: 'logo-th' }, src ? mk('img', { src }) : mk('span', { html: icon('plus', 18) })), mk('span', {}, label)));
  };
  const bgBtn = () => { any = true; b.append(btn(icon('image') + '<span>Choisir la photo de fond</span>', () => { setTab('bg'); }, 'primary wide')); };
  if (P.type === 'compo') {
    tf('Titre', 'title');
    any = true; b.append(selField('Disposition tactique', P, 'formation', Object.keys(FORMATIONS).map(k => [k, k]), () => { applyFormation(P, P.formation); renderLayers(); }));
    b.append(btn(icon('users') + '<span>Modifier le XI (noms & photos)</span>', openXI, 'primary wide'));
    b.append(mk('div', { class: 'logos2' })); lg('Logo équipe A', 'logoA'); lg('Logo équipe B', 'logoB');
  } else if (P.type === 'result') {
    bgBtn(); tf('Titre', 'title'); tf('Score équipe A', 'scoreA'); tf('Score équipe B', 'scoreB'); tf('Compétition', 'comp'); tf('Buteurs A', 'scorersA', true); tf('Buteurs B', 'scorersB', true); lg('Logo équipe A', 'logoA'); lg('Logo équipe B', 'logoB');
  } else if (P.type === 'breaking') {
    bgBtn(); tf('Bandeau', 'bannerText'); tf('Sur-titre', 'kicker'); tf('Titre de l\'info', 'headline', true); tf('Sous-texte', 'sub', true);
  } else if (P.type === 'stats') {
    tf('Titre', 'title'); tf('Score', 'score'); lg('Logo équipe A', 'logoA'); lg('Logo équipe B', 'logoB');
    any = true; b.append(btn(icon('bars') + '<span>Modifier toutes les stats</span>', openStats, 'primary wide'));
  }
  if (!any) b.append(mk('div', { class: 'empty' }, mk('div', { class: 'empty-ic', html: icon('wand', 34) }), mk('h4', {}, 'Page blanche'), mk('p', {}, 'Ajoute textes, formes, photos et logos depuis l\'onglet Ajouter.'), btn(icon('plus') + '<span>Ajouter un élément</span>', () => setTab('add'), 'primary')));
  b.append(mk('p', { class: 'muted' }, 'Les changements se voient instantanément sur le visuel. Tout reste modifiable librement dans les autres onglets.'));
}
function openXI() {
  const body = mk('div', { class: 'xi-list' });
  const render = () => {
    body.innerHTML = '';
    P.elements.filter(e => e.type === 'player').forEach((e, i) => {
      const src = e.src && P.assets[e.src];
      const inp = mk('input', { class: 'input', value: e.name }); inp.oninput = () => { e.name = inp.value; requestRender(); }; inp.onchange = () => { commit(); renderLayers(); };
      body.append(mk('div', { class: 'xi-row' }, mk('span', { class: 'xi-n' }, String(i + 1)), mk('button', { class: 'xi-th', onclick: () => pickForElement(e, render) }, src ? mk('img', { src }) : mk('span', { html: icon('user', 18) })), inp));
    });
  };
  render(); openModal('Modifier le XI', body);
}
function openStats() {
  const body = mk('div', { class: 'stat-list' });
  const render = () => {
    body.innerHTML = '';
    const rows = P.elements.filter(e => e.type === 'stat');
    const first = rows[0];
    if (first) {
      const c = o => { const i = mk('input', { type: 'color', class: 'color' }); i.value = hexOf(first[o]); i.oninput = () => { rows.forEach(r => r[o] = i.value); requestRender(); }; i.onchange = () => commit(); return i; };
      body.append(mk('div', { class: 'row gap center' }, mk('span', { class: 'muted' }, 'Couleurs équipe A / B :'), c('c1'), c('c2')));
    }
    rows.forEach(e => {
      const f = (p, cls) => { const i = mk('input', { class: 'input ' + cls, value: e[p] }); i.oninput = () => { e[p] = i.value; if (p === 'label') e.name = i.value; requestRender(); }; i.onchange = () => { commit(); renderLayers(); }; return i; };
      body.append(mk('div', { class: 'stat-row' }, f('left', 'sv'), f('label', 'sl'), f('right', 'sv'), mk('button', { class: 'lbtn', 'aria-label': 'Supprimer', html: icon('trash', 16), onclick: () => { P.elements = P.elements.filter(x => x !== e); commit(); render(); renderLayers(); requestRender(); } })));
    });
    body.append(btn(icon('plus') + '<span>Ajouter une ligne</span>', () => {
      const last = rows[rows.length - 1], n = T.stat({ label: 'Nouvelle stat', left: '0', right: '0', x: last ? last.x : 90, y: last ? last.y + 81 : 345, c1: last ? last.c1 : '#f2c200', c2: last ? last.c2 : '#a21cff' });
      P.elements.push(n); commit(); render(); renderLayers(); requestRender();
    }, 'wide'));
  };
  render(); openModal('Modifier les stats', body, { onClose: () => { commit(); renderLayers(); } });
}

/* ---------- Panneau Fond ---------- */
const BG_PRESETS = [
  { n: 'OM Néon', c1: '#040a2e', c2: '#0a1f80', accent: '#d53bff' }, { n: 'Bleu OM', c1: '#021a5c', c2: '#0a6fd8', accent: '#2fd0ff' },
  { n: 'Nuit', c1: '#03040a', c2: '#0b1030', accent: '#3b5bff' }, { n: 'Ciel', c1: '#0a2a7a', c2: '#37a8ff', accent: '#ffffff' },
  { n: 'Or', c1: '#1a1200', c2: '#5a3d00', accent: '#ffc928' }, { n: 'Rouge', c1: '#1a0408', c2: '#5a0a1f', accent: '#ff2d55' }];
function buildBg() {
  const b = $('#pBg'); if (!P) return;
  const keep = bound.slice(); b.innerHTML = '';
  const bg = P.bg, nodes = [];
  b.append(mk('h4', { class: 'ph' }, 'Arrière-plan'));
  b.append(chips('Type de fond', bg, 'kind', [['neon', 'Néon MX'], ['gradient', 'Dégradé'], ['solid', 'Uni'], ['photo', 'Photo']], () => buildBg()));
  if (bg.kind === 'neon' || bg.kind === 'photo' && !bg.img) {
    b.append(fld('Palettes', mk('div', { class: 'presets' }, BG_PRESETS.map(p => mk('button', { class: 'preset', title: p.n, style: `background:linear-gradient(135deg,${p.c1},${p.c2} 70%,${p.accent})`, onclick: () => { Object.assign(bg, { c1: p.c1, c2: p.c2, accent: p.accent }); if (bg.kind === 'photo') bg.kind = 'neon'; commit(); buildBg(); requestRender(); } }, mk('span', {}, p.n))))));
  }
  if (bg.kind === 'neon') b.append(colorField('Couleur 1', bg, 'c1'), colorField('Couleur 2', bg, 'c2'), colorField('Lueurs', bg, 'accent'));
  if (bg.kind === 'gradient') b.append(colorField('Couleur 1', bg, 'c1'), colorField('Couleur 2', bg, 'c2'), numField('Angle', bg, 'angle', 0, 360));
  if (bg.kind === 'solid') b.append(colorField('Couleur', bg, 'c1'));
  if (bg.kind === 'photo') {
    b.append(btn(icon('image') + `<span>${bg.img ? 'Changer la photo' : 'Importer une photo de fond'}</span>`, async () => { const f = await pickFile('image/*'); if (!f) return; bg.img = addAsset(P, await fileToDataURL(f, 2400)); commit(); buildBg(); requestRender(); }, 'primary wide'));
    if (bg.img) b.append(numField('Zoom', bg, 'zoom', 1, 4, .01), numField('Décalage horizontal', bg, 'ox', -50, 50, .5), numField('Décalage vertical', bg, 'oy', -50, 50, .5),
      numField('Assombrir', bg, 'dim', 0, .9, .01), numField('Dégradé sombre en bas', bg, 'fade', 0, 1, .01), numField('Flou', bg, 'blur', 0, 30, .5),
      btn(icon('trash') + '<span>Retirer la photo</span>', () => { bg.img = null; commit(); buildBg(); requestRender(); }, 'wide'));
  }
  bound = keep.concat(bound.slice(keep.length));
}

/* ---------- Export ---------- */
async function exportFlow() {
  if (!P) return;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  renderProject(c.getContext('2d'), P, { exp: true });
  let blob; try { blob = await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/png')); } catch (e) { return toast('Export impossible : ouvre le site via https (pas en fichier local).'); }
  const url = URL.createObjectURL(blob), fname = (P.name || 'visuel').replace(/[^\w\-]+/g, '_') + '.png';
  const file = new File([blob], fname, { type: 'image/png' });
  const canShare = navigator.canShare && navigator.canShare({ files: [file] });
  const body = mk('div', { class: 'export' }, mk('img', { src: url, class: 'export-img', alt: 'Aperçu' }), mk('p', { class: 'muted center' }, '1080 × 1350 px • PNG • format Instagram 4:5'),
    mk('div', { class: 'row gap' },
      mk('a', { class: 'btn primary grow', href: url, download: fname, html: icon('download') + '<span>Télécharger</span>' }),
      canShare ? btn(icon('share') + '<span>Partager</span>', () => navigator.share({ files: [file], title: P.name }).catch(() => {}), 'grow') : null));
  openModal('Ton visuel est prêt', body, { onClose: () => setTimeout(() => URL.revokeObjectURL(url), 5000) });
}

/* ---------- Ouverture / fermeture ---------- */
async function openEditor(proj) {
  P = proj; if (!P.formation && P.type === 'compo') P.formation = '4-2-3-1';
  await preload(P); selId = null; hist = []; hi = -1; commit(true);
  $('#projName').value = P.name; setSaveState('Prêt', true);
  document.body.classList.add('editing'); $('#editor').hidden = false;
  requestAnimationFrame(() => $('#editor').classList.add('in'));
  sheetOpen = false; $('#inspector').classList.remove('open');
  buildAdd(); refreshAll(); setTab(P.type === 'free' ? 'add' : 'model', true);
  fit(); setTimeout(fit, 60); setTimeout(fit, 350);
  const mx = await getMXLogo(); void mx;
}
async function closeEditor() {
  await saveNow();
  $('#editor').classList.remove('in'); document.body.classList.remove('editing');
  setTimeout(() => { $('#editor').hidden = true; }, 260);
  P = null; selId = null; if (typeof renderProjects === 'function') renderProjects();
}
$('#btnBack').onclick = closeEditor;
$('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo;
$('#btnExport').onclick = exportFlow;
$('#projName').oninput = e => { P.name = e.target.value; };
$('#projName').onchange = () => commit();
addEventListener('beforeunload', () => { if (P) saveNow(); });
