'use strict';
/* =====================================================================
   MX GRAPHICS STUDIO — engine.js
   Rendu canvas 1080×1350, éléments, fonds, modèles, stockage.
   ===================================================================== */
const W = 1080, H = 1350;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = s => parseFloat(String(s).replace(',', '.').replace(/[^0-9.\-]/g, '')) || 0;

function mk(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => { if (c == null || c === false) return; n.append(c.nodeType ? c : document.createTextNode(c)); });
  return n;
}

/* ---------- Icônes ---------- */
const ICON = {
  type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  square: '<rect x="3" y="3" width="18" height="18" rx="2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  bars: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  redo: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  back: '<polyline points="15 18 9 12 15 6"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  up: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  down: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  hex: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 6.2L11 5"/><path d="M15 9l-12 12"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.9-4.5-9-10-9z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  font: '<path d="M4 20l6-16 6 16M6.5 14h7M17 20v-9m0 0a3 3 0 1 0 3 3"/>'
};
const icon = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n] || ''}</svg>`;

function toast(msg) {
  const t = mk('div', { class: 'toast' }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), 2300);
  setTimeout(() => t.remove(), 2700);
}

/* ---------- IndexedDB ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('mx-studio', 1);
      r.onupgradeneeded = () => { ['projects', 'players', 'logos', 'fonts'].forEach(s => r.result.createObjectStore(s, { keyPath: 'id' })); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(s, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(s, mode);
      const rq = fn(t.objectStore(s));
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = () => rej(t.error);
    });
  },
  all(s) { return this.tx(s, 'readonly', st => st.getAll()); },
  get(s, id) { return this.tx(s, 'readonly', st => st.get(id)); },
  put(s, v) { return this.tx(s, 'readwrite', st => st.put(v)); },
  del(s, id) { return this.tx(s, 'readwrite', st => st.delete(id)); }
};

/* ---------- Polices ---------- */
const GFONTS = ['Archivo Black', 'Anton', 'Bebas Neue', 'Oswald', 'Barlow Condensed', 'Teko', 'Montserrat', 'Poppins', 'Inter'];
let customFonts = [];
const fontNames = () => [...GFONTS, ...customFonts.map(f => f.name)];
async function loadCustomFonts() {
  const fs = await DB.all('fonts');
  for (const f of fs) {
    try { const ff = new FontFace(f.name, f.data.slice(0)); await ff.load(); document.fonts.add(ff); } catch (e) { console.warn('police', f.name, e); }
  }
  customFonts = fs.map(f => ({ id: f.id, name: f.name }));
}
async function addFontFile(file) {
  const data = await file.arrayBuffer();
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  const ff = new FontFace(name, data.slice(0));
  await ff.load(); document.fonts.add(ff);
  const id = uid();
  await DB.put('fonts', { id, name, data });
  customFonts.push({ id, name });
  return name;
}

/* ---------- Images ---------- */
const imgCache = new Map();
function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
function getImg(proj, id) {
  if (!id) return null;
  let c = imgCache.get(id);
  if (!c) {
    const src = proj.assets[id]; if (!src) return null;
    const im = new Image(); c = { im, ok: false }; imgCache.set(id, c);
    im.onload = () => { c.ok = true; if (typeof requestRender === 'function') requestRender(); };
    im.src = src;
  }
  return c.ok ? c.im : null;
}
function preload(proj) {
  return Promise.all(Object.keys(proj.assets).map(id => {
    const c = imgCache.get(id); if (c && c.ok) return null;
    return new Promise(res => { const im = new Image(); im.onload = () => { imgCache.set(id, { im, ok: true }); res(); }; im.onerror = res; im.src = proj.assets[id]; });
  }));
}
async function fileToDataURL(file, max = 2000) {
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImage(url);
    const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    let out = c.toDataURL('image/webp', 0.92);
    if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
    return out;
  } finally { URL.revokeObjectURL(url); }
}
function addAsset(proj, dataURL) { const id = 'a' + uid(); proj.assets[id] = dataURL; return id; }

/* Détourage d'un fond uni (couleur du coin haut-gauche) + recadrage */
async function knockout(src, tol = 34, trim = true) {
  const im = await loadImage(src);
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
  if (a[3] < 10) return src;
  const r0 = a[0], g0 = a[1], b0 = a[2];
  let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
  for (let i = 0, p = 0; i < a.length; i += 4, p++) {
    const dist = Math.hypot(a[i] - r0, a[i + 1] - g0, a[i + 2] - b0);
    const al = dist < tol ? 0 : dist < tol + 45 ? (dist - tol) / 45 : 1;
    a[i + 3] = Math.round(a[i + 3] * al);
    if (al > 0.05) { const px = p % c.width, py = (p / c.width) | 0; if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
  }
  x.putImageData(d, 0, 0);
  if (maxX < minX) return src;
  if (!trim) return c.toDataURL('image/png');
  const pad = 4; minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(c.width - 1, maxX + pad); maxY = Math.min(c.height - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const o = document.createElement('canvas'); o.width = cw; o.height = ch;
  o.getContext('2d').drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
  return o.toDataURL('image/png');
}

/* Logo MX : mx-logo.webp détouré (fallback : texte) */
let MXLOGO = null;
async function getMXLogo() {
  if (MXLOGO) return MXLOGO;
  try {
    const im = await loadImage('mx-logo.webp');
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    c.getContext('2d').drawImage(im, 0, 0);
    const src = await knockout(c.toDataURL('image/png'), 40, true);
    const t = await loadImage(src);
    MXLOGO = { src, ratio: t.naturalHeight / t.naturalWidth };
  } catch (e) {
    const c = document.createElement('canvas'); c.width = 400; c.height = 200;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.font = '400 190px "Archivo Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MX', 200, 105);
    MXLOGO = { src: c.toDataURL('image/png'), ratio: .5 };
  }
  return MXLOGO;
}

/* ---------- Couleurs / formes ---------- */
function hexA(hex, a) {
  let h = String(hex || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function shapePath(ctx, k, x, y, w, h, r = 0) {
  ctx.beginPath();
  switch (k) {
    case 'circle': ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
    case 'hex': ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h * .25); ctx.lineTo(x + w, y + h * .75); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h * .75); ctx.lineTo(x, y + h * .25); ctx.closePath(); break;
    case 'diamond': ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath(); break;
    case 'tri': ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); break;
    case 'round': rr(ctx, x, y, w, h, Math.min(r, w / 2, h / 2)); break;
    default: ctx.rect(x, y, w, h);
  }
}
function drawFit(ctx, im, x, y, w, h, fit, zoom = 1, ox = 0, oy = 0, flip = false, top = false) {
  const iw = im.naturalWidth, ih = im.naturalHeight;
  let s = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  s *= zoom;
  const dw = iw * s, dh = ih * s;
  const dx = x + (w - dw) / 2 + ox * w / 100;
  const dy = top ? y + oy * h / 100 : y + (h - dh) / 2 + oy * h / 100;
  ctx.save();
  if (flip) { ctx.translate(x + w, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  ctx.drawImage(im, dx, dy, dw, dh);
  ctx.restore();
}

/* ---------- Éléments ---------- */
const base = (type, o) => Object.assign({ id: uid(), type, x: 0, y: 0, w: 200, h: 200, rot: 0, opacity: 1, locked: false, hidden: false, name: '' }, o);
const T = {
  text: o => base('text', Object.assign({ text: 'TEXTE', font: 'Archivo Black', size: 80, weight: 400, italic: false, color: '#ffffff', color2: '', align: 'center', ls: 0, lh: 1.05, upper: true, shadow: '#000000', shadowBlur: 0, stroke: '#000000', strokeW: 0, w: 800, h: 100, name: 'Texte' }, o)),
  shape: o => base('shape', Object.assign({ shape: 'rect', fill: '#0033A0', gradMode: 'none', fill2: '#7a1fff', angle: 90, radius: 30, stroke: '#ffffff', strokeW: 0, glow: '#2d7bff', glowBlur: 0, w: 400, h: 200, name: 'Forme' }, o)),
  image: o => base('image', Object.assign({ src: null, fit: 'cover', mask: 'rect', zoom: 1, ox: 0, oy: 0, flip: false, stroke: '#ffffff', strokeW: 0, glow: '#2d7bff', glowBlur: 0, radius: 40, label: 'IMAGE', w: 400, h: 400, name: 'Image' }, o)),
  player: o => base('player', Object.assign({ src: null, name: 'JOUEUR', nameFont: 'Archivo Black', nameSize: 26, nameColor: '#ffffff', c1: '#0a1d7c', c2: '#9b2cff', glow: '#2d7bff', glowBlur: 36, zoom: 1, ox: 0, oy: 0, w: 160, h: 230 }, o)),
  stat: o => base('stat', Object.assign({ label: 'Statistique', left: '50', right: '50', c1: '#f2c200', c2: '#a21cff', color: '#ffffff', font: 'Inter', vfont: 'Archivo Black', w: 900, h: 70 }, o))
};
const TYPE_NAMES = { text: 'Texte', shape: 'Forme', image: 'Image', player: 'Joueur', stat: 'Statistique' };

const mctx = document.createElement('canvas').getContext('2d');
const fontStr = e => `${e.italic ? 'italic ' : ''}${e.weight} ${e.size}px "${e.font}", "Arial Black", sans-serif`;
function wrapLines(ctx, text, maxW) {
  const out = [];
  text.split('\n').forEach(par => {
    let line = '';
    par.split(' ').forEach(wd => {
      const t = line ? line + ' ' + wd : wd;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = wd; } else line = t;
    });
    out.push(line);
  });
  return out;
}
function textLines(e, ctx) {
  ctx.font = fontStr(e);
  if ('letterSpacing' in ctx) ctx.letterSpacing = (e.ls || 0) + 'px';
  return wrapLines(ctx, e.upper ? String(e.text).toUpperCase() : String(e.text), e.w);
}
const playerFH = e => e.w * 1.1547;
const playerLabelH = e => e.nameSize * 1.9;
function ensureLayout(e) {
  if (!e) return;
  if (e.type === 'text') { const L = textLines(e, mctx); e.h = Math.max(e.size * e.lh, L.length * e.size * e.lh); }
  else if (e.type === 'player') e.h = playerFH(e) + playerLabelH(e);
}

function fillFor(ctx, e) {
  if (e.gradMode === 'none') return e.fill;
  const a = e.angle * Math.PI / 180, cx = e.w / 2, cy = e.h / 2;
  const len = Math.abs(e.w * Math.cos(a)) + Math.abs(e.h * Math.sin(a));
  const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
  const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  g.addColorStop(0, e.fill);
  g.addColorStop(1, e.gradMode === 'fade' ? hexA(e.fill, 0) : e.fill2);
  return g;
}

const DRAW = {
  text(ctx, e) {
    const L = textLines(e, ctx), lh = e.size * e.lh;
    ctx.textBaseline = 'middle'; ctx.textAlign = e.align;
    const x = e.align === 'left' ? 0 : e.align === 'right' ? e.w : e.w / 2;
    let fill = e.color;
    if (e.color2) { const g = ctx.createLinearGradient(0, 0, 0, e.h); g.addColorStop(0, e.color); g.addColorStop(1, e.color2); fill = g; }
    L.forEach((ln, i) => {
      const y = (i + .5) * lh;
      if (e.strokeW > 0) { ctx.lineJoin = 'round'; ctx.lineWidth = e.strokeW * 2; ctx.strokeStyle = e.stroke; ctx.strokeText(ln, x, y); }
      if (e.shadowBlur > 0) { ctx.shadowColor = e.shadow; ctx.shadowBlur = e.shadowBlur; }
      ctx.fillStyle = fill; ctx.fillText(ln, x, y); ctx.shadowBlur = 0;
    });
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  },
  shape(ctx, e) {
    shapePath(ctx, e.shape, 0, 0, e.w, e.h, e.radius);
    ctx.fillStyle = fillFor(ctx, e);
    if (e.glowBlur > 0) { ctx.shadowColor = e.glow; ctx.shadowBlur = e.glowBlur; }
    ctx.fill(); ctx.shadowBlur = 0;
    if (e.strokeW > 0) { ctx.lineWidth = e.strokeW; ctx.strokeStyle = e.stroke; ctx.stroke(); }
  },
  image(ctx, e, proj, o) {
    const w = e.w, h = e.h, im = getImg(proj, e.src), masked = e.mask !== 'none';
    if (masked) {
      if (e.glowBlur > 0) { ctx.save(); shapePath(ctx, e.mask, 0, 0, w, h, e.radius); ctx.shadowColor = e.glow; ctx.shadowBlur = e.glowBlur; ctx.fillStyle = e.glow; ctx.fill(); ctx.restore(); }
      ctx.save(); shapePath(ctx, e.mask, 0, 0, w, h, e.radius); ctx.clip();
    }
    if (im) {
      if (!masked && e.glowBlur > 0) { ctx.shadowColor = e.glow; ctx.shadowBlur = e.glowBlur; }
      drawFit(ctx, im, 0, 0, w, h, e.fit, e.zoom, e.ox, e.oy, e.flip, false);
      ctx.shadowBlur = 0;
    } else if (!o.exp) {
      if (masked) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, 0, w, h); }
    }
    if (masked) ctx.restore();
    if (!im && !o.exp) {
      shapePath(ctx, masked ? e.mask : 'round', 0, 0, w, h, e.radius || 30);
      if (!masked) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill(); }
      ctx.setLineDash([14, 10]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(160,200,255,.7)'; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(190,215,255,.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const s = Math.max(14, Math.min(w, h) * .16);
      ctx.font = `700 ${s}px Inter, sans-serif`; ctx.fillText('+', w / 2, h / 2 - s * .8);
      ctx.font = `700 ${s * .8}px Inter, sans-serif`; ctx.fillText(e.label || 'IMAGE', w / 2, h / 2 + s * .6);
    }
    if (masked && e.strokeW > 0) { shapePath(ctx, e.mask, 0, 0, w, h, e.radius); ctx.lineWidth = e.strokeW; ctx.strokeStyle = e.stroke; ctx.stroke(); }
  },
  player(ctx, e, proj, o) {
    const w = e.w, fh = playerFH(e);
    const g = ctx.createLinearGradient(0, 0, w, fh); g.addColorStop(0, e.c1); g.addColorStop(1, e.c2);
    shapePath(ctx, 'hex', 0, 0, w, fh);
    ctx.save(); if (e.glowBlur > 0) { ctx.shadowColor = e.glow; ctx.shadowBlur = e.glowBlur; } ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); shapePath(ctx, 'hex', 0, 0, w, fh); ctx.clip();
    const im = getImg(proj, e.src);
    if (im) drawFit(ctx, im, 0, 0, w, fh, 'cover', e.zoom, e.ox, e.oy, false, true);
    else {
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.beginPath(); ctx.arc(w / 2, fh * .4, fh * .16, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w / 2, fh * .95, fh * .33, fh * .3, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
    shapePath(ctx, 'hex', 0, 0, w, fh); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(150,195,255,.85)'; ctx.stroke();
    const txt = String(e.name || '').toUpperCase();
    let sz = e.nameSize;
    ctx.font = `400 ${sz}px "${e.nameFont}", "Arial Black", sans-serif`;
    const tw = ctx.measureText(txt).width;
    if (tw > w * 1.45) { sz = sz * w * 1.45 / tw; ctx.font = `400 ${sz}px "${e.nameFont}", "Arial Black", sans-serif`; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = e.nameColor;
    ctx.fillText(txt, w / 2, fh + playerLabelH(e) * .55);
  },
  stat(ctx, e) {
    const w = e.w, h = e.h, l = num(e.left), r = num(e.right), tot = l + r, ratio = tot > 0 ? l / tot : .5;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 26px "${e.font}", sans-serif`; ctx.fillStyle = e.color; ctx.fillText(e.label, w / 2, 13);
    const bx = 150, bw = w - 300, by = 30, bh = 32;
    ctx.save(); ctx.beginPath(); rr(ctx, bx, by, bw, bh, bh / 2); ctx.clip();
    const lw = Math.round(bw * ratio);
    ctx.fillStyle = e.c1; ctx.fillRect(bx, by, lw, bh);
    ctx.fillStyle = e.c2; ctx.fillRect(bx + lw, by, bw - lw, bh);
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, 'rgba(255,255,255,.38)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.2)');
    ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh); ctx.restore();
    ctx.font = `400 44px "${e.vfont}", sans-serif`; ctx.fillStyle = e.color;
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 8;
    ctx.fillText(e.left, 75, by + bh / 2 + 2); ctx.fillText(e.right, w - 75, by + bh / 2 + 2);
    ctx.shadowBlur = 0;
  }
};

/* ---------- Fond ---------- */
let bgCanvas = null, bgKey = '';
function neon(ctx, bg) {
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, bg.c1); g.addColorStop(1, bg.c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const rg = (x, y, r, col, a) => { const q = ctx.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, hexA(col, a)); q.addColorStop(1, hexA(col, 0)); ctx.fillStyle = q; ctx.fillRect(0, 0, W, H); };
  rg(0, 60, 780, bg.accent, .75); rg(W, H - 40, 800, bg.accent, .6); rg(W * .7, H * .35, 720, '#2f6bff', .35);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.42);
  for (let i = -8; i <= 8; i++) {
    const x = i * 150 + ((i % 2) ? 20 : -10), wd = 60 + ((i * 37) % 5 + 5) * 14;
    const q = ctx.createLinearGradient(x - wd / 2, 0, x + wd / 2, 0);
    q.addColorStop(0, 'rgba(120,170,255,0)'); q.addColorStop(.5, `rgba(120,170,255,${.06 + ((i + 8) % 4) * .035})`); q.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = q; ctx.fillRect(x - wd / 2, -H * 1.2, wd, H * 2.4);
  }
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .9);
  v.addColorStop(0, 'rgba(0,0,10,0)'); v.addColorStop(1, 'rgba(0,0,12,.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function paintBG(ctx, proj) {
  const bg = proj.bg;
  if (bg.kind === 'photo' && bg.img) {
    const im = getImg(proj, bg.img);
    ctx.fillStyle = '#050816'; ctx.fillRect(0, 0, W, H);
    if (im) { ctx.save(); if (bg.blur > 0) ctx.filter = `blur(${bg.blur}px)`; drawFit(ctx, im, 0, 0, W, H, 'cover', bg.zoom, bg.ox, bg.oy, false, false); ctx.restore(); }
    if (bg.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${bg.dim})`; ctx.fillRect(0, 0, W, H); }
    if (bg.fade > 0) { const g = ctx.createLinearGradient(0, H * .35, 0, H); g.addColorStop(0, 'rgba(3,8,32,0)'); g.addColorStop(1, `rgba(3,8,32,${bg.fade})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    return;
  }
  if (bg.kind === 'solid') { ctx.fillStyle = bg.c1; ctx.fillRect(0, 0, W, H); return; }
  if (bg.kind === 'gradient') {
    const a = (bg.angle || 0) * Math.PI / 180, len = Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a));
    const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy); g.addColorStop(0, bg.c1); g.addColorStop(1, bg.c2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return;
  }
  neon(ctx, bg);
}
function drawBG(ctx, proj) {
  const im = proj.bg.img ? getImg(proj, proj.bg.img) : null;
  const key = JSON.stringify(proj.bg) + (im ? '1' : '0');
  if (!bgCanvas) { bgCanvas = document.createElement('canvas'); bgCanvas.width = W; bgCanvas.height = H; }
  if (key !== bgKey) { paintBG(bgCanvas.getContext('2d'), proj); bgKey = key; }
  ctx.drawImage(bgCanvas, 0, 0);
}

function renderProject(ctx, proj, opts = {}) {
  ctx.clearRect(0, 0, W, H);
  drawBG(ctx, proj);
  proj.elements.forEach(e => {
    if (e.hidden) return;
    ctx.save(); ensureLayout(e);
    ctx.globalAlpha = e.opacity;
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2); ctx.rotate(e.rot * Math.PI / 180); ctx.translate(-e.w / 2, -e.h / 2);
    DRAW[e.type](ctx, e, proj, opts);
    ctx.restore();
  });
}

/* ---------- Projets & modèles ---------- */
const TPL_NAMES = { compo: 'Composition', result: 'Résultat', breaking: 'Breaking', stats: 'Statistiques', free: 'Création libre' };
function blankProject(type) {
  return { id: uid(), name: TPL_NAMES[type] || 'Création', type, created: Date.now(), updated: Date.now(), formation: null, thumb: null, assets: {},
    bg: { kind: 'neon', c1: '#040a2e', c2: '#0a1f80', accent: '#d53bff', img: null, zoom: 1, ox: 0, oy: 0, dim: .2, blur: 0, fade: .5, angle: 135 }, elements: [] };
}
const FORMATIONS = { '4-2-3-1': [1, 3, 2, 4, 1], '4-3-3': [3, 3, 4, 1], '4-4-2': [2, 4, 4, 1], '3-5-2': [2, 5, 3, 1], '3-4-3': [3, 4, 3, 1], '4-1-4-1': [1, 4, 1, 4, 1], '4-5-1': [1, 5, 4, 1], '5-3-2': [2, 3, 5, 1], '3-4-2-1': [1, 2, 4, 3, 1] };
function formationPositions(rows, cw) {
  const n = rows.length, top = 240, fh = cw * 1.1547, lab = 26 * 1.9, bottom = H - 30;
  const step = n > 1 ? Math.min(250, (bottom - top - fh - lab) / (n - 1)) : 0, out = [];
  rows.forEach((cnt, ri) => { for (let i = 0; i < cnt; i++) { const cx = W * (0.11 + 0.78 * (i + .5) / cnt); out.push({ x: Math.round(cx - cw / 2), y: Math.round(top + ri * step) }); } });
  return out;
}
function applyFormation(proj, key) {
  const pos = formationPositions(FORMATIONS[key], 160);
  const pl = proj.elements.filter(e => e.type === 'player');
  while (pl.length < 11) { const p = T.player({ name: 'JOUEUR ' + (pl.length + 1) }); proj.elements.push(p); pl.push(p); }
  pos.forEach((p, i) => { pl[i].x = p.x; pl[i].y = p.y; pl[i].w = 160; ensureLayout(pl[i]); });
  proj.formation = key;
}
const STAT_DEFAULTS = [['Possession (%)', '41', '59'], ['xG', '1,92', '2,16'], ['Grosses occasions', '5', '3'], ['Tirs', '13', '16'], ['Arrêts du gardien', '2', '5'], ['Corners', '4', '6'], ['Fautes', '15', '8'], ['Passes', '446', '644'], ['Tacles', '10', '15'], ['Coups francs', '8', '15'], ['Cartons jaunes', '1', '0']];

async function buildTemplate(type) {
  const p = blankProject(type), mx = await getMXLogo();
  p.assets.mxlogo = mx.src;
  const mxEl = (x, y, w) => T.image({ src: 'mxlogo', x, y, w, h: Math.round(w * mx.ratio), mask: 'none', fit: 'contain', name: 'Logo MX', tag: 'mx' });
  const slot = (tag, x, y, s, name) => T.image({ tag, x, y, w: s, h: s, mask: 'none', fit: 'contain', name, label: 'LOGO' });
  const E = p.elements;
  if (type === 'compo') {
    E.push(T.text({ tag: 'title', text: 'LE XI', x: 200, y: 55, w: 680, size: 150, name: 'Titre', shadow: '#2d7bff', shadowBlur: 30 }));
    E.push(slot('logoA', 45, 50, 120, 'Logo A'), slot('logoB', 45, 190, 120, 'Logo B'), mxEl(885, 85, 140));
    applyFormation(p, '4-2-3-1');
  } else if (type === 'result') {
    p.bg.kind = 'photo'; p.bg.dim = .15; p.bg.fade = .4;
    E.push(T.shape({ tag: 'shade', x: 0, y: 560, w: W, h: 790, fill: '#020619', gradMode: 'fade', angle: 270, name: 'Voile sombre' }));
    E.push(T.text({ tag: 'title', text: 'SENSATIONNEL', x: 20, y: 80, w: 1040, size: 100, italic: true, color: '#ffffff', color2: '#aebfff', name: 'Titre', shadow: '#000000', shadowBlur: 24 }));
    E.push(slot('logoA', 80, 790, 170, 'Logo A'));
    E.push(T.text({ tag: 'scoreA', text: '1', x: 270, y: 760, w: 170, size: 230, name: 'Score A', shadow: '#000000', shadowBlur: 18 }));
    E.push(T.text({ tag: 'comp', text: 'LIGUE 1', x: 440, y: 860, w: 200, size: 30, name: 'Compétition' }));
    E.push(T.text({ tag: 'scoreB', text: '2', x: 640, y: 760, w: 170, size: 230, name: 'Score B', shadow: '#000000', shadowBlur: 18 }));
    E.push(slot('logoB', 830, 790, 170, 'Logo B'));
    E.push(T.text({ tag: 'scorersA', text: "⚽ BUTEUR 20'", x: 70, y: 1060, w: 450, size: 38, align: 'left', name: 'Buteurs A', shadow: '#000000', shadowBlur: 10 }));
    E.push(T.text({ tag: 'scorersB', text: "BUTEUR 2' ⚽\nBUTEUR 82' ⚽", x: 560, y: 1060, w: 450, size: 38, align: 'right', name: 'Buteurs B', shadow: '#000000', shadowBlur: 10 }));
    E.push(mxEl(470, 1235, 140));
  } else if (type === 'breaking') {
    p.bg.kind = 'photo'; p.bg.dim = .2; p.bg.fade = .55;
    E.push(T.shape({ tag: 'shade', x: 0, y: 480, w: W, h: 870, fill: '#020619', gradMode: 'fade', angle: 270, name: 'Voile sombre' }));
    E.push(T.shape({ tag: 'banner', x: 0, y: 640, w: 580, h: 104, fill: '#0033A0', glow: '#2d7bff', glowBlur: 30, name: 'Bandeau' }));
    E.push(T.shape({ x: 580, y: 640, w: 14, h: 104, fill: '#29b6ff', name: 'Liseré' }));
    E.push(T.text({ tag: 'bannerText', text: 'BREAKING', x: 40, y: 655, w: 520, size: 70, italic: true, align: 'left', name: 'Texte bandeau' }));
    E.push(T.text({ tag: 'kicker', text: 'OM • INFO', x: 60, y: 772, w: 800, size: 28, font: 'Inter', weight: 700, color: '#8fb2ff', align: 'left', ls: 3, name: 'Sur-titre' }));
    E.push(T.text({ tag: 'headline', text: "TITRE DE L'INFO SUR DEUX OU TROIS LIGNES MAXIMUM", x: 60, y: 815, w: 960, size: 80, align: 'left', lh: 1.06, name: 'Titre', shadow: '#000000', shadowBlur: 16 }));
    E.push(T.text({ tag: 'sub', text: "Texte secondaire pour détailler l'information.", x: 60, y: 1120, w: 900, size: 34, font: 'Inter', weight: 600, color: '#c4d2ff', align: 'left', upper: false, name: 'Sous-texte' }));
    E.push(mxEl(60, 60, 150));
  } else if (type === 'stats') {
    E.push(T.text({ tag: 'title', text: 'LES STATS', x: 200, y: 55, w: 680, size: 120, name: 'Titre', shadow: '#2d7bff', shadowBlur: 24 }));
    E.push(slot('logoA', 300, 205, 120, 'Logo A'));
    E.push(T.text({ tag: 'score', text: '1-2', x: 440, y: 195, w: 200, size: 110, name: 'Score' }));
    E.push(slot('logoB', 660, 205, 120, 'Logo B'), mxEl(50, 70, 120));
    STAT_DEFAULTS.forEach((s, i) => E.push(T.stat({ label: s[0], left: s[1], right: s[2], x: 90, y: 345 + i * 81, name: s[0] })));
  } else {
    E.push(T.text({ text: 'TON TITRE', x: 90, y: 560, w: 900, size: 140, name: 'Titre', shadow: '#2d7bff', shadowBlur: 30 }));
    E.push(mxEl(470, 1200, 140));
  }
  E.forEach(ensureLayout);
  return p;
}

function makeThumb(canvas, w = 360) {
  const h = Math.round(w * H / W), c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(canvas, 0, 0, w, h);
  return c.toDataURL('image/jpeg', .82);
}
async function renderTemplateThumb(type) {
  const p = await buildTemplate(type); await preload(p);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  renderProject(c.getContext('2d'), p, { exp: false });
  return makeThumb(c, 420);
}
