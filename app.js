'use strict';
/* =====================================================================
   MX GRAPHICS STUDIO — app.js
   Accueil, bibliothèque, sauvegarde, démarrage.
   ===================================================================== */
const TEMPLATES = [
  { id: 'compo', name: 'Composition', desc: 'Le XI en hexagones, tactique modifiable.' },
  { id: 'result', name: 'Résultat', desc: 'Score, logos, buteurs et photo de fond.' },
  { id: 'breaking', name: 'Breaking', desc: 'Photo, bandeau BREAKING et gros titre.' },
  { id: 'stats', name: 'Statistiques', desc: 'Barres comparatives qui se calculent seules.' },
  { id: 'free', name: 'Création libre', desc: 'Page blanche : tu construis tout.' }
];
const thumbs = {};

function injectIcons(root = document) { $$('[data-icon]', root).forEach(n => { if (!n.firstChild) n.innerHTML = icon(n.dataset.icon, +n.dataset.size || 20); }); }

/* ---------- Accueil ---------- */
function renderTemplates() {
  const g = $('#tplGrid'); g.innerHTML = '';
  TEMPLATES.forEach((t, i) => {
    const img = mk('img', { alt: '', draggable: 'false' });
    const card = mk('button', { class: 'tpl-card reveal', style: `--d:${i * 70}ms`, onclick: () => startTemplate(t.id) },
      mk('div', { class: 'tpl-thumb' }, mk('span', { class: 'sk' }), img),
      mk('div', { class: 'tpl-meta' }, mk('b', {}, t.name), mk('small', {}, t.desc)), mk('span', { class: 'tpl-go', html: '→' }));
    card.dataset.tpl = t.id; if (thumbs[t.id]) { img.src = thumbs[t.id]; card.classList.add('ready'); }
    g.append(card);
  });
  observeReveal();
}
async function generateThumbs() {
  const hero = $$('#heroStack .hcard'), map = ['stats', 'compo', 'result'];
  for (const t of TEMPLATES) {
    try {
      thumbs[t.id] = await renderTemplateThumb(t.id);
      const card = $(`.tpl-card[data-tpl="${t.id}"]`);
      if (card) { $('img', card).src = thumbs[t.id]; card.classList.add('ready'); }
      const hi = map.indexOf(t.id); if (hi >= 0) { $('img', hero[hi]).src = thumbs[t.id]; hero[hi].classList.add('ready'); }
    } catch (e) { console.warn('miniature', t.id, e); }
  }
}
async function startTemplate(id) {
  toast('Préparation du modèle…');
  const p = await buildTemplate(id); await openEditor(p);
}
async function renderProjects() {
  const list = (await DB.all('projects')).sort((a, b) => b.updated - a.updated);
  const g = $('#projGrid'); g.innerHTML = '';
  $('#projEmpty').style.display = list.length ? 'none' : '';
  list.forEach(p => {
    const d = new Date(p.updated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const act = (ic, t, fn) => mk('button', { class: 'lbtn', title: t, 'aria-label': t, html: icon(ic, 17), onclick: ev => { ev.stopPropagation(); fn(); } });
    g.append(mk('div', { class: 'proj-card', tabindex: 0, onclick: async () => openEditor(await DB.get('projects', p.id)) },
      mk('div', { class: 'proj-thumb' }, p.thumb ? mk('img', { src: p.thumb, alt: '' }) : mk('span', { html: icon('image', 30) })),
      mk('div', { class: 'proj-meta' }, mk('div', {}, mk('b', {}, p.name), mk('small', {}, d)),
        mk('div', { class: 'row' },
          act('copy', 'Dupliquer', async () => { const c = JSON.parse(JSON.stringify(p)); c.id = uid(); c.name = p.name + ' (copie)'; c.updated = Date.now(); await DB.put('projects', c); renderProjects(); toast('Projet dupliqué'); }),
          act('trash', 'Supprimer', async () => { if (!confirm('Supprimer « ' + p.name + ' » ?')) return; await DB.del('projects', p.id); renderProjects(); })))));
  });
}

/* ---------- Bibliothèque ---------- */
async function loadLib() { LIB.players = await DB.all('players'); LIB.logos = await DB.all('logos'); updateCounts(); }
function updateCounts() {
  const s = (n, a, b) => n + ' ' + (n > 1 ? b : a);
  $('#cntPlayers').textContent = s(LIB.players.length, 'photo', 'photos');
  $('#cntLogos').textContent = s(LIB.logos.length, 'logo', 'logos');
  $('#cntFonts').textContent = s(customFonts.length, 'police', 'polices');
}
function openLibrary(start = 'players') {
  let kind = start; const body = mk('div', { class: 'lib' }), content = mk('div', {});
  const seg = mk('div', { class: 'seg' });
  const names = { players: 'Joueurs', logos: 'Logos', fonts: 'Polices' };
  const segBtns = Object.keys(names).map(k => mk('button', { onclick: () => { kind = k; render(); } }, names[k]));
  segBtns.forEach(b => seg.append(b));
  body.append(seg, content);
  const render = () => {
    segBtns.forEach((b, i) => b.classList.toggle('on', Object.keys(names)[i] === kind));
    content.innerHTML = '';
    if (kind === 'fonts') return renderFonts();
    const ko = mk('input', { type: 'checkbox' }); ko.checked = kind === 'logos';
    const add = mk('button', { class: 'btn primary', html: icon('upload') + `<span>Ajouter des ${kind === 'players' ? 'photos' : 'logos'}</span>`, onclick: async () => {
      const files = await pickFile('image/*', true); if (!files.length) return;
      let n = 0;
      for (const f of files) {
        try { let d = await fileToDataURL(f, kind === 'players' ? 1400 : 900); if (ko.checked) d = await knockout(d, 34, kind === 'logos'); await addToLib(kind, prettyName(f.name), d); n++; } catch (e) { console.warn(e); }
      }
      toast(n + ' ajouté' + (n > 1 ? 's' : '')); updateCounts(); render();
    } });
    const grid = mk('div', { class: 'lib-grid manage' });
    if (!LIB[kind].length) grid.append(mk('p', { class: 'muted' }, 'Rien pour l\'instant. Ajoute plusieurs images d\'un coup : le nom du fichier devient le nom affiché (modifiable).'));
    LIB[kind].slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(it => {
      const inp = mk('input', { class: 'lib-name', value: it.name, 'aria-label': 'Nom' });
      inp.onchange = async () => { it.name = inp.value.trim() || it.name; await DB.put(kind, it); };
      grid.append(mk('div', { class: 'lib-item static' }, mk('img', { src: it.photo, alt: '' }), inp,
        mk('button', { class: 'lbtn del', 'aria-label': 'Supprimer', html: icon('trash', 16), onclick: async () => { await DB.del(kind, it.id); LIB[kind] = LIB[kind].filter(x => x.id !== it.id); updateCounts(); render(); } })));
    });
    content.append(mk('div', { class: 'row gap wrap' }, add, mk('label', { class: 'check' }, ko, mk('span', {}, 'Détourer le fond uni'))), grid);
  };
  const renderFonts = () => {
    const add = mk('button', { class: 'btn primary', html: icon('upload') + '<span>Importer une police (.ttf .otf .woff2)</span>', onclick: async () => {
      const files = await pickFile('.ttf,.otf,.woff,.woff2', true); if (!files.length) return;
      for (const f of files) { try { await addFontFile(f); } catch (e) { toast('Police illisible : ' + f.name); } }
      updateCounts(); render(); toast('Police ajoutée — disponible dans l\'éditeur');
    } });
    const list = mk('div', { class: 'font-list' });
    if (!customFonts.length) list.append(mk('p', { class: 'muted' }, 'Aucune police importée. Les polices de ton média (titres, scores…) apparaîtront dans le choix de police de l\'éditeur.'));
    customFonts.forEach(f => list.append(mk('div', { class: 'font-row' }, mk('div', {}, mk('small', {}, f.name), mk('span', { style: `font-family:"${f.name}"` }, 'OM Marseille 1-0')),
      mk('button', { class: 'lbtn', 'aria-label': 'Supprimer', html: icon('trash', 16), onclick: async () => { await DB.del('fonts', f.id); customFonts = customFonts.filter(x => x.id !== f.id); updateCounts(); render(); toast('Supprimée (retirée au prochain démarrage)'); } }))));
    content.append(add, list);
  };
  render(); openModal('Bibliothèque', body, { wide: true });
}

/* ---------- Sauvegarde ---------- */
const toB64 = buf => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = str => { const s = atob(str), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b.buffer; };
async function exportAll() {
  const fonts = (await DB.all('fonts')).map(f => ({ id: f.id, name: f.name, data: toB64(f.data) }));
  const data = { app: 'mx-graphics-studio', v: 1, date: Date.now(), projects: await DB.all('projects'), players: await DB.all('players'), logos: await DB.all('logos'), fonts };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' }), a = mk('a', { href: URL.createObjectURL(blob), download: 'mx-studio-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json' });
  document.body.append(a); a.click(); a.remove(); toast('Sauvegarde exportée');
}
async function importAll() {
  const f = await pickFile('.json,application/json'); if (!f) return;
  try {
    const d = JSON.parse(await f.text()); if (d.app !== 'mx-graphics-studio') throw new Error('format');
    for (const p of d.projects || []) await DB.put('projects', p);
    for (const p of d.players || []) await DB.put('players', p);
    for (const p of d.logos || []) await DB.put('logos', p);
    for (const x of d.fonts || []) await DB.put('fonts', { id: x.id, name: x.name, data: fromB64(x.data) });
    await loadCustomFonts(); await loadLib(); await renderProjects(); toast('Sauvegarde importée ✓');
  } catch (e) { console.error(e); toast('Fichier de sauvegarde invalide'); }
}

/* ---------- Animations ---------- */
let io;
function observeReveal() {
  if (!io) io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
  $$('.reveal:not(.in)').forEach(n => io.observe(n));
}
function heroParallax() {
  const hero = $('.hero'), st = $('#heroStack');
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    st.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg'); st.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
  });
}
addEventListener('scroll', () => $('#homeNav').classList.toggle('scrolled', scrollY > 12), { passive: true });

/* ---------- Démarrage ---------- */
(async function init() {
  injectIcons();
  try { await DB.open(); } catch (e) { console.error(e); toast('Stockage local indisponible : mode lecture seule'); }
  try { await loadCustomFonts(); await loadLib(); } catch (e) { console.warn(e); }
  $('#btnLib').onclick = () => openLibrary('players');
  $$('[data-lib]').forEach(b => b.onclick = () => openLibrary(b.dataset.lib));
  $('#btnBackup').onclick = () => $('#sauvegarde').scrollIntoView({ behavior: 'smooth' });
  $('#btnExportAll').onclick = exportAll; $('#btnImportAll').onclick = importAll;
  renderTemplates(); renderProjects(); updateCounts(); observeReveal(); heroParallax();
  requestAnimationFrame(() => document.body.classList.add('ready'));
  setTimeout(() => $('#boot').classList.add('hide'), 350);
  const fontsReady = Promise.all(GFONTS.map(f => document.fonts.load(`400 40px "${f}"`).catch(() => null)));
  await Promise.race([fontsReady, new Promise(r => setTimeout(r, 4000))]);
  generateThumbs();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
