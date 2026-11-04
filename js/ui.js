'use strict';
/* Virus Défense — entrées tactiles, panneau, pouvoirs, tutoriel, éditeur de niveaux */
/* ---------------- entrées : toucher, glisser, pincer ---------------- */
const ptrs = new Map(); let gesture = null;
cv.addEventListener('pointerdown', e => {
  initAudio();
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gesture = { pinch: true, d: Math.hypot(a.x - b.x, a.y - b.y), z: L.zoom }; }
  else if (ptrs.size === 1) {
    gesture = { pinch: false, moved: false };
    if (state === 'play' && G && !G.over && !G.aim) { const [mx, my] = toMap(e.clientX, e.clientY), tx = Math.floor(mx), ty = Math.floor(my); if (tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && G.towerAt[ty][tx]) { gesture.tower = G.towerAt[ty][tx]; try { cv.setPointerCapture(e.pointerId); } catch (er) { } } }
  }
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && G && state === 'play') { const [mx, my] = toMap(e.clientX, e.clientY); G.hover = [Math.floor(mx), Math.floor(my)]; }
  if (e.pointerType === 'mouse' && ED && state === 'edit') { const [mx, my] = toMap(e.clientX, e.clientY); ED.hover = [Math.floor(mx), Math.floor(my)]; }
  const p = ptrs.get(e.pointerId); if (!p || (state !== 'play' && state !== 'edit')) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (!gesture) return;
  if (gesture.pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    setZoom(gesture.z * d / gesture.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
    gesture.moved = true;
  } else if (!gesture.pinch) {
    if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 12) gesture.moved = true;
    if (state === 'edit' && ED && ED.tool && ED.tool !== 'path' && ptrs.size === 1 && gesture.moved) { // peindre en glissant
      const [mx, my] = toMap(e.clientX, e.clientY), tx = Math.floor(mx), ty = Math.floor(my), k = tx + ',' + ty;
      if (!gesture.paint) { gesture.paint = new Set(); edSnap(); const [sx0, sy0] = toMap(p.sx, p.sy), arr = ED.tool === 'obst' ? ED.obst : ED.bonus; gesture.mode = ED.tool === 'erase' ? 'del' : tileIn(arr, Math.floor(sx0), Math.floor(sy0)) >= 0 ? 'del' : 'add'; edPaint(Math.floor(sx0), Math.floor(sy0), gesture.mode); gesture.paint.add(Math.floor(sx0) + ',' + Math.floor(sy0)); }
      if (!gesture.paint.has(k)) { gesture.paint.add(k); if (edPaint(tx, ty, gesture.mode)) { sfx('build'); edUpdate(); } }
      return;
    }
    if (gesture.tower && gesture.moved) { G.dragSell = { t: gesture.tower, x: e.clientX, y: e.clientY, out: !inArea(e.clientX, e.clientY) }; dragGhost(G.dragSell); return; } // glisser une tourelle hors de la carte pour la vendre
    if (gesture.moved && L.zoom > 1.01) {
      if (L.port) { L.vx -= dy / L.s; L.vy += dx / L.s; } else { L.vx -= dx / L.s; L.vy -= dy / L.s; }
      clampView(); if (G && G.sel) placePopup();
    }
  }
});
cv.addEventListener('pointerleave', e => { if (G) G.hover = null; });
function pEnd(e) {
  const p = ptrs.get(e.pointerId); if (!p) return;
  ptrs.delete(e.pointerId);
  const g = gesture;
  if (G && G.dragSell) { const ds = G.dragSell; G.dragSell = null; dragGhost(null); if (e.type === 'pointerup' && !inArea(e.clientX, e.clientY) && G.towers.includes(ds.t)) sellTower(ds.t); if (ptrs.size === 0) gesture = null; return; }
  if (ptrs.size === 0) gesture = null; else if (g && g.pinch) g.moved = true;
  if (g && !g.moved && !g.pinch && e.type !== 'pointercancel' && state === 'edit') { const [mx, my] = toMap(e.clientX, e.clientY); edTap(Math.floor(mx), Math.floor(my)); return; }
  if (!g || g.moved || g.pinch || e.type === 'pointercancel' || !G || state !== 'play') return;
  const [mx, my] = toMap(e.clientX, e.clientY), tx = Math.floor(mx), ty = Math.floor(my);
  const inMap = tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS;
  if (G.aim === 'strike') { if (inMap) doPower('strike', mx, my); return; }
  const tw = inMap ? G.towerAt[ty][tx] : null;
  if (tw && tw.hacked > 0) { tw.hacked = 0; stat('repairs'); G.fx.push({ kind: 'ring', x: tw.x + .5, y: tw.y + .5, r: .8, col: '#69f0ae', life: .35, max: .35 }); floatText(tw.x + .5, tw.y, 'Réparée !', '#69f0ae'); sfx('build'); return; }
  if (tw) {
    const now = performance.now();
    if (G.lastTap && G.lastTap.t === tw && now - G.lastTap.at < 380 && tw.lvl !== TMAX - 1) { G.lastTap = null; upgradeTower(tw); return; } // double-tap : améliorer
    G.lastTap = { t: tw, at: now }; openPopup(tw); return;
  }
  if (G.sel) { closePopup(); return; }
  if (G.tool && inMap) tryPlace(G.tool, tx, ty);
}
cv.addEventListener('pointerup', pEnd); cv.addEventListener('pointercancel', pEnd);
cv.addEventListener('wheel', e => { if (state !== 'play' && state !== 'edit') return; e.preventDefault(); setZoom(L.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); if (G && G.sel) placePopup(); }, { passive: false });
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => {
  if (state === 'play' && G) {
    const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
    if (i >= 0) selectTool(TORDER[i]);
    if (e.code === 'Space') { e.preventDefault(); startWave(); }
    if (e.code === 'Escape' || e.code === 'KeyP') pauseGame();
    if (e.code === 'KeyU' && G.sel) upgradeTower(G.sel);
    if (e.code === 'KeyS' && G.sel) sellTower(G.sel);
  } else if (state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) resumeGame();
});

// tourelle « fantôme » qui suit le doigt pendant la revente glissée (au-dessus du panneau)
function dragGhost(d) {
  const el = $('#dragGhost');
  if (!d) { el.classList.add('hidden'); el.dataset.k = ''; return; }
  const t = d.t, key = t.type + t.lvl;
  if (el.dataset.k !== key) { el.dataset.k = key; const c = el.querySelector('canvas'), g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 64, 64); g.setTransform(64, 0, 0, 64, 32, 32); drawTower(g, t.type, t.lvl, t.ang, 0, 0); }
  el.classList.remove('hidden'); el.classList.toggle('out', d.out);
  el.style.left = clamp(d.x, 95, SW - 95) + 'px'; el.style.top = Math.max(70, d.y) + 'px';
  el.querySelector('b').textContent = d.out ? '💰 Lâche : +' + Math.floor(t.invested * sellRate()) + ' cr' : 'Glisse hors de la carte pour vendre';
}
/* ---------------- panneau ---------------- */
function buildTowerBar() {
  const bar = $('#towerBar'); bar.innerHTML = '';
  for (const k of TORDER) {
    const d = TOWERS[k], b = document.createElement('button'); b.className = 'tbtn'; b.dataset.t = k;
    const c = document.createElement('canvas'); c.width = c.height = 68;
    const g = c.getContext('2d'); g.setTransform(68, 0, 0, 68, 34, 34); drawTower(g, k, 1, -Math.PI / 4, 0);
    b.appendChild(c);
    const nm = document.createElement('em'); nm.textContent = tName(k, true); b.appendChild(nm);
    const s = document.createElement('span'); s.textContent = unlockedT(k) ? tCost(k) + ' cr' : '🔒'; b.appendChild(s);
    if (!unlockedT(k)) b.classList.add('locked');
    b.addEventListener('pointerdown', ev => { initAudio(); ev.preventDefault(); dragT = { k, id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, active: false, was: G.tool === k }; });
    bar.appendChild(b);
  }
}
// glisser une tourelle depuis le panneau jusqu'à la carte
let dragT = null;
const inArea = (x, y) => x >= L.ax && y >= L.ay && x <= L.ax + L.aw && y <= L.ay + L.ah;
document.addEventListener('pointermove', ev => {
  if (!dragT || ev.pointerId !== dragT.id || !G) return;
  if (!dragT.active && Math.hypot(ev.clientX - dragT.sx, ev.clientY - dragT.sy) > 12) { dragT.active = true; selectTool(dragT.k, true); }
  if (dragT.active) {
    const off = ev.pointerType === 'mouse' ? 0 : 60; // la tourelle apparaît au-dessus du doigt
    if (inArea(ev.clientX, ev.clientY - off)) { const [mx, my] = toMap(ev.clientX, ev.clientY - off); G.hover = [Math.floor(mx), Math.floor(my)]; } else G.hover = null;
  }
});
function dragEnd(ev) {
  if (!dragT || ev.pointerId !== dragT.id || !G) return;
  const d = dragT; dragT = null;
  if (!d.active) { selectTool(d.was ? null : d.k); return; }
  const h = G.hover; G.hover = null;
  if (h && ev.type === 'pointerup') tryPlace(d.k, h[0], h[1]);
}
document.addEventListener('pointerup', dragEnd); document.addEventListener('pointercancel', dragEnd);
function towerInfo() {
  const el = $('#tInfo'); if (!el || !G) return;
  const k = G.tool;
  if (!k) { el.innerHTML = '<small>Choisis une tourelle puis touche le circuit</small>'; return; }
  const d = TOWERS[k], st = tStats(k, 1), bar = (v, m) => '<i style="width:' + Math.round(Math.min(1, v / m) * 100) + '%"></i>';
  const nums = k === 'boost' ? 'Bonus +' + Math.round(st.boost * 100) + ' % · portée ' + st.range.toFixed(1) : k === 'miner' ? '+' + st.gain + ' cr par vague' :
    'Dégâts ' + st.dmg.toFixed(1) + ' · Portée ' + st.range.toFixed(1) + ' · ' + st.rate.toFixed(1) + '/s';
  el.innerHTML = '<b style="color:' + d.col + '">' + tName(k) + ' <em>' + tCost(k) + ' cr</em></b><span class="tdesc">' + tDesc(k) + '</span><span class="tnums">' + nums + (d.ground ? ' · sol' : '') + '</span>' +
    '<div class="tbars"><label>Dégâts</label><u>' + bar(st.dmg * st.rate * (st.chain || 1), 60) + '</u><label>Portée</label><u>' + bar(st.range, 4.5) + '</u><label>Cadence</label><u>' + bar(st.rate, 4) + '</u></div>';
}
function selectTool(k, quiet) {
  G.tool = k; closePopup(); towerInfo();
  document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('sel', b.dataset.t === k));
  if (k && !unlockedT(k)) { toast('🔒 ' + tName(k) + ' : débloque-la dans la Boutique avec ' + UNLOCK[k] + ' ⬢'); G.tool = null; document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('sel')); towerInfo(); return; }
  if (k && !quiet) toast(tName(k) + ' (' + tCost(k) + ' cr) : ' + tDesc(k) + ' — touche le circuit ou glisse-la sur la carte');
}
const lastP = {};
function setTxt(id, v) { if (lastP[id] !== v) { lastP[id] = v; $(id).textContent = v; } }
function updatePanel(force) {
  if (!G || G.demo) return;
  if (force) for (const k in lastP) delete lastP[k];
  setTxt('#sLives', String(G.lives).padStart(2, '0'));
  setTxt('#sCash', String(G.cash));
  setTxt('#sWave', String(G.wave).padStart(2, '0') + '/' + (G.endless ? '∞' : G.total));
  updatePowers(); tutoTick();
  if (G.cash >= 1000) unlockAch('rich');
  G.achT = (G.achT || 0) - 1; if (G.achT <= 0) { G.achT = 30; checkAch(); }
  setTxt('#sScore', String(G.score).padStart(6, '0'));
  const bw = $('#bWave');
  let label;
  if (G.wave >= G.total) label = '🏁 Finale';
  else if (G.wave === 0) label = '▶ Vague 1';
  else if (G.queue.length || G.enemies.length) label = '⏩ ' + (G.wave + 1) + ' · +' + earlyBonus();
  else label = '▶ Vague ' + (G.wave + 1);
  setTxt('#bWave', label);
  bw.classList.toggle('off', G.wave >= G.total);
  if (G.wave < G.total) { const w = waveDef(G.wave + 1); setTxt('#nextInfo', 'Suivante : ' + w.n + ' × ' + ETYPES[w.type].name + (w.type2 ? ' + ' + w.n2 + ' × ' + ETYPES[w.type2].name : '')); }
  else setTxt('#nextInfo', 'Élimine les derniers virus !');
  const key = TORDER.map(k => G.cash >= tCost(k) ? 1 : 0).join('');
  if (lastP.poor !== key) { lastP.poor = key; document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('poor', G.cash < tCost(b.dataset.t))); }
  if (G.sel) { const k2 = G.cash + ':' + G.sel.lvl; if (lastP.pop !== k2) { lastP.pop = k2; fillPopup(); } }
}
$('#bWave').onclick = () => { initAudio(); startWave(); };
const maxSpeed = () => G && !G.daily && (save.stars[curDiff + G.mi + 'won'] || G.endless) ? 4 : 3;
$('#bSpeed').onclick = () => { G.speed = G.speed >= maxSpeed() ? 1 : G.speed + 1; $('#bSpeed').textContent = '×' + G.speed; if (G.speed === 4) toast('⏩ Vitesse ×4 débloquée (zone déjà gagnée)'); };
$('#bPause').onclick = () => pauseGame();

/* ---------------- fenêtre tourelle ---------------- */
function dockPopup() {
  const p = $('#tpop'), dock = !L.port && hasPanel();
  if (dock) { if (p.parentNode !== $('#panel')) $('#panel').insertBefore(p, $('#tInfo')); }
  else if (p.parentNode !== document.body) document.body.appendChild(p);
  p.classList.toggle('dock', dock);
  $('#panel').classList.toggle('seltower', dock && !!(G && G.sel));
}
function openPopup(t) { if (!t) return; G.sel = t; dockPopup(); $('#tpop').classList.remove('hidden'); fillPopup(); placePopup(); }
function closePopup() { if (G) G.sel = null; $('#tpop').classList.add('hidden'); $('#panel').classList.remove('seltower'); }
function fillPopup() {
  const t = G.sel; if (!t) return;
  const d = TOWERS[t.type], s = t.st;
  $('#tpName').textContent = tName(t.type) + ' · niv. ' + t.lvl + '/' + maxLvl(t.type);
  let html = t.type === 'boost' ? 'Bonus de dégâts : <b>+' + Math.round(s.boost * 100) + ' %</b><br>Portée : <b>' + s.range.toFixed(1) + '</b>' :
    t.type === 'miner' ? 'Gain par vague : <b>+' + s.gain + ' cr</b>' :
    'Dégâts : <b>' + s.dmg.toFixed(1) + '</b> · Portée : <b>' + s.range.toFixed(1) + '</b><br>Cadence : <b>' + s.rate.toFixed(1) + '/s</b>';
  if (s.burn) html += '<br>Brûlure : <b>' + s.burn.toFixed(1) + '/s</b>';
  if (t.boost > 1) html += '<br><b style="color:#69f0ae">Boostée +' + Math.round((t.boost - 1) * 100) + ' %</b>';
  if (s.splash) html += ' · Zone : <b>' + s.splash.toFixed(1) + '</b>';
  if (s.slow) html += '<br>Ralentit à <b>' + Math.round(s.slow * 100) + '%</b> pendant ' + s.slowT.toFixed(1) + ' s';
  if (s.chain) html += '<br>Touche <b>' + s.chain + '</b> virus';
  if (d.ground) html += '<br><small>Ne touche pas les volants</small>';
  if (s.special) html += '<br><b style="color:#ffd740">★ ' + SPECIAL[t.type] + '</b>';
  if (s.alt) html += '<br><b style="color:#40c4ff">★ ' + SPECIALB[t.type] + '</b>';
  if (s.ramp) html += '<br><small>Surchauffe actuelle : ×' + (t.rampK || 1).toFixed(1) + '</small>';
  if (t.hot) html += '<br><b style="color:#ff9100">🔥 Case brûlante : +35 % de dégâts</b>';
  if (t.rateB) html += '<br><b style="color:#40c4ff">Accélérée +' + Math.round(t.rateB * 100) + ' % de cadence</b>';
  if (t.lvl < TMAX && t.type !== 'boost' && t.type !== 'miner') { const n = tStats(t.type, t.lvl + 1); html += '<br><small style="color:#a5d6a7">Niv. suivant : dégâts ' + n.dmg.toFixed(1) + ', portée ' + n.range.toFixed(1) + '</small>'; }
  if (t.lvl === TMAX - 1) html += '<br><small style="color:#ffd740">Niv. 5, choisis ta voie :<br>A · ' + SPECIAL[t.type] + '</small><br><small style="color:#40c4ff">B · ' + SPECIALB[t.type] + '</small>' + (maxLvl(t.type) < TMAX ? '<br><small>(🔒 recherche 2 en Boutique)</small>' : '');
  const totD = G.towers.reduce((a, o) => a + (o.dmg || 0), 0);
  html += '<br><small>Virus éliminés : ' + (t.kills || 0) + ' · Dégâts : ' + fmtN(t.dmg || 0) + (totD > 0 ? ' (' + Math.round(100 * (t.dmg || 0) / totD) + ' %)' : '') + '</small>';
  $('#tpMode').textContent = '🎯 ' + MODE_NAMES[t.mode || 'first'];
  $('#tpMode').classList.toggle('hidden', t.type === 'boost' || t.type === 'miner'); $('#tpModeAll').classList.toggle('hidden', t.type === 'boost' || t.type === 'miner');
  $('#tpStats').innerHTML = html;
  const up = $('#tpUp'), paths = $('#tpPaths'), choose = t.lvl === TMAX - 1 && maxLvl(t.type) >= TMAX;
  paths.classList.toggle('hidden', !choose);
  if (choose) { const c = upCost(t); paths.querySelectorAll('button').forEach((b, i) => { b.innerHTML = (i ? 'B' : 'A') + ' · ' + PATHS[t.type][i][0] + '<small>' + c + ' cr</small>'; b.classList.toggle('off', G.cash < c); }); }
  if (t.lvl < maxLvl(t.type)) { const c = upCost(t); up.textContent = '⬆ ' + c + ' cr'; up.className = 'buy' + (G.cash >= c ? '' : ' off'); }
  else if (t.lvl < TMAX) { up.textContent = '🔒 Niv. 5'; up.className = 'buy off'; }
  else { up.textContent = 'MAX'; up.className = 'buy off'; }
  up.classList.toggle('hidden', choose);
  $('#tpSell').textContent = 'Vendre +' + Math.floor(t.invested * sellRate());
}
function placePopup() {
  const t = G.sel; if (!t) return;
  const p = $('#tpop'); if (p.classList.contains('dock')) { p.style.left = p.style.top = ''; return; }
  const [sx, sy] = toScreen(t.x + .5, t.y + .5), w = p.offsetWidth || 210, h = p.offsetHeight || 150;
  let x = sx + L.s * .7, y = sy - h / 2;
  if (x + w > L.ax + L.aw - 6) x = sx - L.s * .7 - w;
  x = clamp(x, L.ax + 6, L.ax + L.aw - w - 6); y = clamp(y, 6, SH - h - (L.port ? 235 : 6));
  p.style.left = x + 'px'; p.style.top = y + 'px';
}
$('#tpClose').onclick = closePopup;
$('#tpUp').onclick = () => G.sel && upgradeTower(G.sel);
document.querySelectorAll('#tpPaths button').forEach((b, i) => b.onclick = () => G.sel && upgradeTower(G.sel, i));
const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 1e4 ? Math.round(n / 1e3) + ' k' : n >= 1e3 ? (n / 1e3).toFixed(1) + ' k' : Math.round(n) + '';
$('#tpSell').onclick = () => G.sel && sellTower(G.sel);
$('#tpModeAll').onclick = () => { const t = G.sel; if (!t) return; let n = 0; for (const o of G.towers) if (o.type !== 'boost' && o.type !== 'miner') { o.mode = t.mode || 'first'; n++; } toast('🎯 ' + n + ' tourelles en mode « ' + MODE_NAMES[t.mode || 'first'] + ' »'); sfx('build'); };
$('#tpMode').onclick = () => { const t = G.sel; if (!t) return; t.mode = MODES[(MODES.indexOf(t.mode || 'first') + 1) % MODES.length]; fillPopup(); sfx('build'); };

/* ---------------- pouvoirs actifs ---------------- */
const SVGA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">';
const PWSVG = {
  strike: SVGA + '<circle cx="15" cy="15" r="4.5" fill="currentColor" stroke="none"/><path d="M12 12 4 4M15.5 9.5 9 3M9.5 15.5 3 9"/></svg>',
  freeze: SVGA + '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M12 2l-2.5 2.5M12 2l2.5 2.5M12 22l-2.5-2.5M12 22l2.5-2.5"/></svg>',
  reboot: SVGA + '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v6h-6"/></svg>',
  cov: SVGA + '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  undo: SVGA + '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>'
};
document.querySelectorAll('#powers .pw[data-p]').forEach(b => { b.querySelector('i').innerHTML = PWSVG[b.dataset.p]; b.insertAdjacentHTML('beforeend', '<em></em>'); });
$('#bCov').querySelector('i').innerHTML = PWSVG.cov; $('#bUndo').querySelector('i').innerHTML = PWSVG.undo;
const pwStock = k => G && G.demo ? 99 : ((save.pwStock || {})[k] ?? 5);
const PW_PACK = { strike: [3, 30], freeze: [3, 35], reboot: [3, 45] }; // [charges, prix en puces]
const POWERS = {
  strike: { name: 'Frappe orbitale', ic: '☄', cd: 40, desc: 'Touche ensuite la carte : énorme explosion.' },
  freeze: { name: 'Gel système', ic: '❄', cd: 55, desc: 'Fige tous les virus pendant 3 s.' },
  reboot: { name: 'Redémarrage', ic: '⟲', cd: 80, desc: 'Renvoie tous les virus 6 cases en arrière.' }
};
function usePower(k) {
  if (!G || G.over || state !== 'play') return;
  initAudio();
  if (G.muts && G.muts.nopower) { toast('🚫 Mutateur « Sans pouvoirs » actif'); sfx('err'); return; }
  if (pwStock(k) <= 0) { toast(POWERS[k].ic + ' Plus de charges de ' + POWERS[k].name + ' : achète-en dans la Boutique (onglet Pouvoirs) 🛒'); sfx('err'); return; }
  if (G.pw[k] > 0) { toast(POWERS[k].ic + ' ' + POWERS[k].name + ' : prêt dans ' + Math.ceil(G.pw[k]) + ' s'); sfx('err'); return; }
  if (!G.enemies.length) { toast(POWERS[k].ic + ' ' + POWERS[k].name + ' : ' + POWERS[k].desc + ' (attends les virus)'); sfx('err'); return; }
  if (k === 'strike') { G.aim = G.aim ? null : 'strike'; if (G.aim) { closePopup(); toast('☄ Touche la carte pour lancer la frappe orbitale'); } updatePowers(); return; }
  doPower(k);
}
function doPower(k, x, y) {
  G.pw[k] = POWERS[k].cd; G.powerUsed = true; G.aim = null; stat('powers'); vibe(40);
  if (!G.demo) { save.pwStock = save.pwStock || {}; save.pwStock[k] = Math.max(0, pwStock(k) - 1); persist(); }
  if (k === 'strike') {
    const dmg = 70 * hpScale(Math.max(1, G.wave)) * G.d.hp; G.shooter = null;
    for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 1.8 + e.r) hurt(e, dmg * (isBoss(e) ? .5 : 1), true);
    G.fx.push({ kind: 'ring', x, y, r: 2.4, col: 'rgba(255,145,0,.8)', life: .55, max: .55 }, { kind: 'pop', x, y, r: 1, col: '#ffd740', life: .4, max: .4 }, { kind: 'flash', col: '255,200,120', life: .25, max: .25 });
    for (let i = 0; i < 40; i++) G.parts.push(part(x, y, i % 2 ? '#ffd740' : '#ff6d00', 6));
    smoke(x, y, 10, .4); crater(x, y, .8, '#ff9100'); G.shake = 12; G.hitstop = .07; G.punch = .05; sfx('boom');
  } else if (k === 'freeze') {
    for (const e of G.enemies) { const t = ETYPES[e.type].noslow || isBoss(e) ? 1.2 : 3; e.stunT = Math.max(e.stunT || 0, t); e.frozen = Math.max(e.frozen || 0, t); }
    G.fx.push({ kind: 'flash', col: '160,230,255', life: .5, max: .5 }); sfx('frost'); sfx('wave');
  } else if (k === 'reboot') {
    for (const e of G.enemies) { const back = isBoss(e) ? 3 : 6; G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: .5, col: '#69f0ae', life: .3, max: .3 }); e.ri = Math.max(0, e.ri - back); const p = e.route[e.ri]; e.x = p[0] + .5; e.y = p[1] + .5; e.tx = p[0]; e.ty = p[1]; }
    G.fx.push({ kind: 'flash', col: '120,255,160', life: .4, max: .4 }); sfx('up');
  }
  updatePowers();
}
function updatePowers() {
  const box = $('#powers'); if (!box) return;
  const on = !!(G && !G.demo && state === 'play' && !G.over);
  box.classList.toggle('hidden', !on); if (!on) return;
  box.querySelectorAll('.pw[data-p]').forEach(b => {
    const k = b.dataset.p, cd = G.pw[k] || 0;
    b.style.setProperty('--cd', Math.round(cd / POWERS[k].cd * 100) + '%');
    const st = pwStock(k);
    b.classList.toggle('ready', cd <= 0 && st > 0); b.classList.toggle('aim', G.aim === k); b.classList.toggle('empty', st <= 0);
    b.querySelector('span').textContent = cd > 0 && st > 0 ? Math.ceil(cd) : '';
    b.querySelector('em').textContent = st;
    b.classList.toggle('cool', cd > 0 && st > 0);
  });
  $('#bCov').classList.toggle('on', !!G.showCov);
  const u = G.undo && G.towers.includes(G.undo.t);
  $('#bUndo').classList.toggle('hidden', !u);
  if (u) $('#bUndo').querySelector('span').textContent = Math.ceil(G.undo.until - G.time);
}
document.querySelectorAll('#powers .pw[data-p]').forEach(b => b.addEventListener('click', () => usePower(b.dataset.p)));
$('#bCov').onclick = () => { if (!G) return; G.showCov = !G.showCov; toast(G.showCov ? '👁 Couverture : rouge = couloir que personne ne touche' : 'Couverture masquée'); updatePowers(); };
$('#bUndo').onclick = () => { if (!G || !G.undo) return; const t = G.undo.t; G.undo = null; if (G.towers.includes(t)) { sellTower(t, true); toast('↶ Pose annulée : crédits remboursés'); } updatePowers(); };

// meilleure case pour une tourelle (tutoriel)
function bestTile() {
  let best = null, bv = -1;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (canPlace(x, y) !== null) continue;
    let v = 0; for (const f of G.flow) if (Math.hypot(f.x - x, f.y - y) < 2.1) v++;
    v -= Math.hypot(x - G.starts[0][0], y - G.starts[0][1]) * .05;
    if (v > bv) { bv = v; best = [x, y]; }
  }
  return best;
}
/* ---------------- tutoriel ---------------- */
const TUTO = [
  { t: '👋 Bienvenue ! Les virus vont suivre le couloir sombre jusqu\'au processeur. Touche le <b>Pulseur</b> dans le panneau.', el: () => $('.tbtn[data-t="pulse"]'), done: () => G.tool === 'pulse' },
  { t: 'Maintenant touche la <b>case qui clignote</b>, sur le circuit juste à côté du couloir.', tile: () => G.tutoTile, done: () => G.towers.length >= 1 },
  { t: 'Bravo ! Pose encore <b>2 tourelles</b> le long du couloir.', done: () => G.towers.length >= 3 },
  { t: 'Prêt ? Lance la <b>première vague</b> !', el: () => $('#bWave'), done: () => G.wave >= 1 },
  { t: 'Chaque virus détruit rapporte des crédits. <b>Touche une tourelle</b> posée pour l\'améliorer ⬆, ou pose-en d\'autres.', done: () => G.towers.some(t => t.lvl >= 2) || G.wave >= 3 },
  { t: 'En cas de coup dur, utilise un <b>pouvoir</b> : ☄ frappe, ❄ gel, ⟲ redémarrage. Tu as 5 charges de chacun, d\'autres s\'achètent en Boutique.', el: () => $('#powers'), done: () => G.powerUsed || G.wave >= 5 }
];
function tutoTick() {
  const box = $('#tuto'), on = G && !G.demo && G.tuto !== undefined && state === 'play' && !G.over;
  box.classList.toggle('hidden', !on); if (!on) return;
  const st = TUTO[G.tuto];
  if (st.done()) {
    G.tuto++; sfx('coin');
    if (G.tuto >= TUTO.length) { G.tuto = undefined; save.tuto = 1; persist(); box.classList.add('hidden'); toast('🎓 Tutoriel terminé ! Défends bien l\'ordinateur.'); return; }
    return tutoTick();
  }
  $('#tutoTxt').innerHTML = st.t;
  const ring = $('#tutoRing'); let r = null;
  if (st.el) { const el = st.el(); if (el) { const b = el.getBoundingClientRect(); r = [b.left - 4, b.top - 4, b.width + 8, b.height + 8]; } }
  if (st.tile) { const tl = st.tile(); if (tl) { const [sx, sy] = toScreen(tl[0] + .5, tl[1] + .5); r = [sx - L.s * .6, sy - L.s * .6, L.s * 1.2, L.s * 1.2]; } }
  ring.classList.toggle('hidden', !r);
  if (r) Object.assign(ring.style, { left: r[0] + 'px', top: r[1] + 'px', width: r[2] + 'px', height: r[3] + 'px' });
  const tb = $('#tutoBox'); tb.style.left = (L.ax + L.aw / 2) + 'px'; tb.style.top = (L.ay + L.ah - 62) + 'px';
}
$('#tutoSkip').onclick = () => { if (G) G.tuto = undefined; save.tuto = 1; persist(); $('#tuto').classList.add('hidden'); };

/* ---------------- éditeur de niveaux (partage par code, sans serveur) ---------------- */
let ED = null;
const hashStr = t => { let h = 7; for (const c of t) h = Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0; return h % 99991; };
const onEdge = (x, y) => x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
// virus et boss qu'on peut choisir dans l'éditeur (l'ordre fixe le code de partage : ne pas le changer)
const ED_VIR = ['bug', 'runner', 'swarm', 'armor', 'flyer', 'regen', 'splitter', 'shield', 'ghost', 'healer', 'giant', 'jumper', 'worm', 'ember', 'packet', 'zombie', 'cryo', 'glitch', 'pixel', 'drone',
  'capa', 'chipset', 'slag', 'phoenix', 'byte', 'stream', 'firewall', 'spam', 'yeti', 'flake', 'spectre', 'replicant', 'knight', 'invader', 'droplet', 'thunder'];
// tous les virus utilisables dans les vagues personnalisées (ordre fixe : il sert au code de partage, on ne fait qu'ajouter à la fin)
const ED_WT = ED_VIR.concat(['mini', 'bit', 'boss', 'kernel', 'magma', 'trojan', 'ddos', 'glacier', 'aicore', 'mainframe', 'tempest']);
const ED_BOSS = ['', 'boss'].concat(WBOSS);
const ED_DEF = { vir: ['bug', 'runner', 'swarm', 'armor', 'flyer', 'regen', 'splitter', 'shield', 'ghost', 'healer', 'giant', 'jumper'], boss: 'auto', megas: true, cash: 0, lives: 0,
  obst: [], bonus: [], allowed: null, hp: 100, spd: 100, rew: 100, noRule: false, noPower: false, desc: '', wl: null };
const tilesStr = a => (a || []).map(([x, y]) => x.toString(36) + y.toString(36)).join('');
const strTiles = t => { const p = []; for (let i = 0; i + 1 < (t || '').length; i += 2) p.push([parseInt(t[i], 36), parseInt(t[i + 1], 36)]); return p; };
const edBossIdx = d => d.boss === 'auto' ? 99 : Math.max(0, ED_BOSS.indexOf(d.boss));
// vagues personnalisées : vagues séparées par |, groupes par , et champs d'un groupe par :
// groupe = virus (rang dans ED_WT), nombre, écart et départ (dixièmes de seconde), entrée (0 = toutes à tour de rôle)
const wlEncode = wl => wl.map(w => w.g.map(g => [ED_WT.indexOf(g.t), g.n, Math.round(g.gap * 10), Math.round(g.d * 10), g.e || 0].map(v => v.toString(36)).join(':')).join(',')).join('|');
const wlDecode = s => s.split('|').map(w => ({ g: w.split(',').filter(Boolean).map(gs => { const f = gs.split(':').map(v => parseInt(v, 36)); return { t: ED_WT[f[0]], n: clamp(f[1] || 1, 1, 300), gap: clamp((f[2] || 0) / 10, .1, 5), d: clamp((f[3] || 0) / 10, 0, 60), e: clamp(f[4] || 0, 0, 8) }; }) }));
// ---- format VD4 : code compact (bits serrés en base64url), environ 3 fois plus court que VD3 ----
function BitW() { const b = []; return { put(v, n) { for (let i = n - 1; i >= 0; i--) b.push((v >>> i) & 1); }, bytes() { const o = new Uint8Array(Math.ceil(b.length / 8)); b.forEach((x, i) => { if (x) o[i >> 3] |= 128 >> (i & 7); }); return o; } }; }
function BitR(by) { let p = 0; return { get(n) { let v = 0; for (let i = 0; i < n; i++) { const k = p++; v = v * 2 + ((by[k >> 3] >> (7 - (k & 7))) & 1); } return v; }, left() { return by.length * 8 - p; } }; }
const b64u = by => btoa(String.fromCharCode(...by)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const putStr = (w, s, nb) => { const by = new TextEncoder().encode(s); const n = Math.min(by.length, (1 << nb) - 1); w.put(n, nb); for (let i = 0; i < n; i++) w.put(by[i], 8); };
const getStr = (r, nb) => { const n = r.get(nb), by = new Uint8Array(n); for (let i = 0; i < n; i++) by[i] = r.get(8); return new TextDecoder().decode(by); };
// entiers de taille variable (code exp-Golomb d'ordre k) : les petites valeurs prennent peu de bits
const putVar = (w, v, k) => { const u = v + (1 << k), nb = Math.floor(Math.log2(u)); w.put(0, nb - k); w.put(u, nb + 1); };
const getVar = (r, k) => { let z = 0; while (r.left() > 0 && r.get(1) === 0) z++; const nb = z + k; return (1 << nb) + r.get(nb) - (1 << k); };
const putPt = (w, [x, y]) => { w.put(x, 5); w.put(y, 4); }, getPt = r => [r.get(5), r.get(4)];
function lvlEncode(d) {
  const w = BitW(), vir = d.vir || ED_DEF.vir, virDef = vir.join() === ED_DEF.vir.join(), ps = d.paths.filter(p => p.length >= 2);
  w.put(1, 3); w.put(d.world, 3); w.put(clamp(d.waves, 1, 99), 7); putStr(w, (d.name || 'Niveau').slice(0, 30), 6);
  w.put(ps.length, 4);
  for (const p of ps) { w.put(p.length, 6); putPt(w, p[0]); for (let i = 1; i < p.length; i++) { const v = p[i][0] === p[i - 1][0]; w.put(v ? 1 : 0, 1); w.put(v ? p[i][1] : p[i][0], v ? 4 : 5); } }
  const am = d.allowed && d.allowed.length < TORDER.length ? d.allowed.reduce((a, k) => a | (1 << TORDER.indexOf(k)), 0) : 0;
  const F = [!virDef, d.boss !== 'auto', d.megas === false, !!d.cash, !!d.lives, !!(d.obst || []).length, !!(d.bonus || []).length, !!am, (d.hp || 100) !== 100, (d.spd || 100) !== 100, (d.rew || 100) !== 100, !!d.noRule, !!d.noPower, !!d.desc, !!(d.wl && d.wl.length)];
  F.forEach(f => w.put(f ? 1 : 0, 1));
  if (F[0]) for (const k of ED_VIR) w.put(vir.includes(k) ? 1 : 0, 1);
  if (F[1]) w.put(Math.max(0, ED_BOSS.indexOf(d.boss)), 4);
  if (F[3]) w.put(clamp(d.cash, 0, 2000), 11);
  if (F[4]) w.put(clamp(d.lives, 0, 99), 7);
  if (F[5]) { w.put(d.obst.length, 7); d.obst.forEach(q => putPt(w, q)); }
  if (F[6]) { w.put(d.bonus.length, 5); d.bonus.forEach(q => putPt(w, q)); }
  if (F[7]) w.put(am, TORDER.length);
  if (F[8]) w.put(clamp(Math.round((d.hp - 25) / 25), 0, 15), 4);
  if (F[9]) w.put(clamp(Math.round((d.spd - 50) / 10), 0, 15), 4);
  if (F[10]) w.put(clamp(Math.round((d.rew - 25) / 25), 0, 15), 4);
  if (F[13]) putStr(w, d.desc.slice(0, 140), 9);
  if (F[14]) { w.put(d.wl.length, 7); for (const wv of d.wl) { w.put(wv.g.length - 1, 3); for (const g of wv.g) { w.put(ED_WT.indexOf(g.t), 6); putVar(w, clamp(g.n, 1, 300) - 1, 3); putVar(w, clamp(Math.round(g.gap * 10), 1, 50) - 1, 2); putVar(w, clamp(Math.round(g.d * 10), 0, 600), 1); putVar(w, g.e || 0, 0); } } }
  return 'VD4~' + b64u(w.bytes());
}
function lvlDecode4(s) {
  const r = BitR(unb64u(s));
  if (r.get(3) !== 1) return null;
  const d = JSON.parse(JSON.stringify(ED_DEF)); d.world = r.get(3); d.waves = r.get(7); d.name = getStr(r, 6) || 'Niveau';
  d.paths = []; for (let n = r.get(4), i = 0; i < n; i++) { const L = r.get(6), p = [getPt(r)]; for (let j = 1; j < L; j++) { const v = r.get(1), c = r.get(v ? 4 : 5), q = p[j - 1]; p.push(v ? [q[0], c] : [c, q[1]]); } d.paths.push(p); }
  const F = []; for (let i = 0; i < 15; i++) F.push(r.get(1) === 1);
  if (F[0]) { d.vir = ED_VIR.filter(() => r.get(1)); if (!d.vir.length) return null; }
  if (F[1]) { d.boss = ED_BOSS[r.get(4)]; if (d.boss === undefined) return null; }
  d.megas = !F[2];
  if (F[3]) d.cash = r.get(11);
  if (F[4]) d.lives = r.get(7);
  if (F[5]) for (let n = r.get(7), i = 0; i < n; i++) d.obst.push(getPt(r));
  if (F[6]) for (let n = r.get(5), i = 0; i < n; i++) d.bonus.push(getPt(r));
  if (F[7]) { const am = r.get(TORDER.length); d.allowed = TORDER.filter((k, i) => am & (1 << i)); }
  if (F[8]) d.hp = 25 + 25 * r.get(4);
  if (F[9]) d.spd = 50 + 10 * r.get(4);
  if (F[10]) d.rew = 25 + 25 * r.get(4);
  d.noRule = F[11]; d.noPower = F[12];
  if (F[13]) d.desc = getStr(r, 9);
  if (F[14]) { d.wl = []; for (let n = r.get(7), i = 0; i < n; i++) { const g = []; for (let m = r.get(3) + 1, j = 0; j < m; j++) { const t = ED_WT[r.get(6)], n = getVar(r, 3) + 1, gap = (getVar(r, 2) + 1) / 10, dl = getVar(r, 1) / 10, e = getVar(r, 0); if (!t || n > 300 || gap > 5 || dl > 60 || e > 8) return null; g.push({ t, n, gap, d: dl, e }); } d.wl.push({ g }); } d.waves = d.wl.length; }
  if (r.left() < 0) return null;
  return d;
}
// identifiant d'un niveau pour ses records (indépendant du nom et du format du code)
const lvKeyOf = code => { const d = lvlDecode(code); return d ? hashStr(JSON.stringify([d.world, d.waves, d.paths, d.vir, d.boss, d.obst, d.bonus, d.wl, d.hp, d.spd, d.allowed])) : 0; };
// format VD3 (lisible ; les anciens codes VD1, VD2 et VD3 restent valides)
function lvlEncode3(d) {
  const mask = (d.vir || ED_DEF.vir).reduce((a, k) => a + (ED_VIR.indexOf(k) >= 0 ? Math.pow(2, ED_VIR.indexOf(k)) : 0), 0);
  const am = d.allowed && d.allowed.length < TORDER.length ? d.allowed.reduce((a, k) => a + Math.pow(2, TORDER.indexOf(k)), 0) : 0;
  return 'VD3~' + encodeURIComponent((d.name || 'Niveau').replace(/~/g, '').slice(0, 30)) + '~' + d.world + '~' + d.waves + '~' +
    d.paths.filter(p => p.length >= 2).map(p => p.map(([x, y]) => x.toString(36) + y.toString(36)).join('')).join('.') + '~' +
    mask.toString(36) + '~' + edBossIdx(d) + '~' + (d.megas === false ? 0 : 1) + '~' + (d.cash || 0) + '~' + (d.lives || 0) + '~' +
    tilesStr(d.obst) + '~' + tilesStr(d.bonus) + '~' + am.toString(36) + '~' + (d.hp || 100) + '~' + (d.spd || 100) + '~' + (d.rew || 100) + '~' +
    ((d.noRule ? 1 : 0) + (d.noPower ? 2 : 0)) + '~' + encodeURIComponent((d.desc || '').replace(/~/g, '').slice(0, 140)) +
    (d.wl && d.wl.length ? '~' + wlEncode(d.wl) : '');
}
function lvlDecode(code) {
  try {
    if (code.trim().startsWith('VD4~')) { const d = lvlDecode4(code.trim().slice(4)); return d && !edCheck(d) ? d : null; }
    const a = code.trim().split('~'); if (!((a[0] === 'VD1' && a.length === 5) || (a[0] === 'VD2' && a.length === 10) || (a[0] === 'VD3' && (a.length === 18 || a.length === 19)))) return null;
    const world = +a[2], waves = +a[3];
    if (!(world >= 0 && world < WORLDS.length) || !(waves >= 1 && waves <= 99)) return null;
    const paths = a[4].split('.').filter(Boolean).map(strTiles);
    const d = Object.assign(JSON.parse(JSON.stringify(ED_DEF)), { name: decodeURIComponent(a[1]) || 'Niveau', world, waves, paths });
    if (a[0] !== 'VD1') {
      const mask = parseInt(a[5], 36), bi = +a[6];
      d.vir = ED_VIR.filter((k, i) => Math.floor(mask / Math.pow(2, i)) % 2); if (!d.vir.length) return null;
      d.boss = bi === 99 ? 'auto' : ED_BOSS[bi]; if (d.boss === undefined) return null;
      d.megas = a[7] !== '0'; d.cash = clamp(+a[8] || 0, 0, 2000); d.lives = clamp(+a[9] || 0, 0, 99);
    }
    if (a[0] === 'VD3') {
      d.obst = strTiles(a[10]); d.bonus = strTiles(a[11]);
      const am = parseInt(a[12], 36) || 0; d.allowed = am ? TORDER.filter((k, i) => Math.floor(am / Math.pow(2, i)) % 2) : null;
      d.hp = clamp(+a[13] || 100, 25, 400); d.spd = clamp(+a[14] || 100, 50, 200); d.rew = clamp(+a[15] || 100, 25, 300);
      const fl = +a[16] || 0; d.noRule = !!(fl & 1); d.noPower = !!(fl & 2); d.desc = decodeURIComponent(a[17] || '');
      if (a[18]) { d.wl = wlDecode(a[18]); d.waves = d.wl.length; }
    }
    return edCheck(d) ? null : d;
  } catch (e) { return null; }
}
function edCheck(d) { // renvoie le problème, ou null si le niveau est jouable
  const ps = d.paths.filter(p => p.length >= 2);
  if (!ps.length) return 'Trace au moins un couloir (entrée sur un bord → processeur)';
  if (ps.length > 8) return '8 couloirs au maximum';
  const all = new Set(), tiles = ps.map(pathTiles); let entries = 0;
  for (let n = 0; n < ps.length; n++) {
    const p = ps[n];
    for (let i = 0; i < p.length; i++) { const [x, y] = p[i]; if (!(x >= 0 && y >= 0 && x < COLS && y < ROWS)) return 'Point hors de la carte'; if (i && p[i - 1][0] !== x && p[i - 1][1] !== y) return 'Couloir non aligné'; }
    if (onEdge(p[0][0], p[0][1])) entries++;
    else if (!tiles.some((t, j) => j !== n && t.some(q => q[0] === p[0][0] && q[1] === p[0][1]))) return 'Chaque couloir commence sur un bord (entrée) ou sur un autre couloir (division)';
    const own = new Set();
    for (const q of tiles[n]) { const k = q + ''; if (own.has(k)) return 'Un couloir ne peut pas repasser sur lui-même'; own.add(k); all.add(k); }
  }
  if (!entries) return 'Il faut au moins une entrée sur un bord';
  if (all.size < 10) return 'Le couloir est trop court (10 cases minimum)';
  if ((d.obst || []).length > 80 || (d.bonus || []).length > 30) return 'Trop d\'obstacles ou de cases bonus';
  if (d.wl) { if (!d.wl.length || d.wl.length > 99) return 'Entre 1 et 99 vagues'; for (let i = 0; i < d.wl.length; i++) { const w = d.wl[i]; if (!w.g.length) return 'La vague ' + (i + 1) + ' est vide'; if (w.g.length > 8) return 'Vague ' + (i + 1) + ' : 8 groupes au maximum'; if (w.g.some(g => !ETYPES[g.t])) return 'Vague ' + (i + 1) + ' : virus inconnu'; } }
  if ((d.obst || []).concat(d.bonus || []).some(([x, y]) => !(x >= 0 && y >= 0 && x < COLS && y < ROWS))) return 'Case hors de la carte';
  return null;
}
function defToMap(d, seed) {
  const b = MAPS[d.world * 3];
  return processMap({ name: d.name, base: b.base, acc: b.acc, waves: d.wl ? d.wl.length : d.waves, wl: d.wl ? JSON.parse(JSON.stringify(d.wl)) : null, world: d.world, custom: true, paths: d.paths.filter(p => p.length >= 2).map(p => p.map(q => q.slice())),
    vir: (d.vir || ED_DEF.vir).slice(), bossK: d.boss === undefined ? 'auto' : d.boss, megas: d.megas !== false, cashC: d.cash || 0, livesC: d.lives || 0,
    obstC: (d.obst || []).map(q => q.slice()), bonusC: (d.bonus || []).map(q => q.slice()), allowedC: d.allowed && d.allowed.length ? d.allowed.slice() : null,
    hpC: (d.hp || 100) / 100, spdC: (d.spd || 100) / 100, rewC: (d.rew || 100) / 100, noRule: !!d.noRule, noPower: !!d.noPower, desc: d.desc || '' }, seed);
}
// ---- outils de l'éditeur : couloir, obstacle, case bonus, gomme ----
const ED_TOOLS = { path: 'Couloir', obst: 'Obstacle', bonus: 'Bonus', erase: 'Gomme' };
const tileIn = (arr, x, y) => (arr || []).findIndex(q => q[0] === x && q[1] === y);
const onCorridor = (x, y) => ED.paths.some(p => (p.length >= 2 ? pathTiles(p) : p).some(c => c[0] === x && c[1] === y));
function edSnap() { // historique pour Annuler / Rétablir
  ED.hist = ED.hist || []; ED.redo = [];
  ED.hist.push(JSON.stringify({ p: ED.paths, o: ED.obst, b: ED.bonus, c: ED.cur })); if (ED.hist.length > 80) ED.hist.shift();
}
function edRestore(js) { const st = JSON.parse(js); ED.paths = st.p; ED.obst = st.o; ED.bonus = st.b; ED.cur = st.c; edUpdate(); }
function edUpdate() {
  if (!ED) return;
  ED.obst = ED.obst || []; ED.bonus = ED.bonus || [];
  // un couloir dessiné par-dessus efface les obstacles et bonus qu'il recouvre
  ED.obst = ED.obst.filter(([x, y]) => !onCorridor(x, y)); ED.bonus = ED.bonus.filter(([x, y]) => !onCorridor(x, y) && tileIn(ED.obst, x, y) < 0);
  ED.map = null; try { if (ED.paths.some(p => p.length >= 2)) ED.map = defToMap(ED, 1); } catch (e) { }
  $('#edName').textContent = '✎ ' + ED.name; $('#edWorld').textContent = WORLDS[ED.world].name; $('#edWaves').textContent = (ED.wl ? ED.wl.length : ED.waves) + ' vagues' + (ED.wl ? ' ✎' : '');
  const err = edCheck(ED);
  const nEx = ED.map ? new Set(ED.map.routes.map(r => r[r.length - 1] + '')).size : 0, nEn = ED.map ? ED.map.entries.length : 0, nBr = ED.map ? ED.map.branchAt.length : 0;
  const len = ED.map ? Math.round(ED.map.routes.reduce((a, r) => a + r.length, 0) / Math.max(1, ED.map.routes.length)) : 0;
  // estimation de difficulté : couloirs courts, beaucoup d'entrées, virus costauds = plus dur
  const diff = ED.map ? clamp(Math.round(1.5 + (nEn - 1) * .8 + (nEx - 1) * .3 + Math.max(0, (45 - len) / 15) + (ED.hp - 100) / 50 + (ED.spd - 100) / 25 + (ED.waves - 30) / 30 - ED.bonus.length * .1), 1, 5) : 0;
  $('#edStats').innerHTML = nEn + ' entrée' + (nEn > 1 ? 's' : '') + ' · ' + nBr + ' division' + (nBr > 1 ? 's' : '') + ' · ' + nEx + ' sortie' + (nEx > 1 ? 's' : '') +
    '<br>' + len + ' cases de trajet · ' + ED.obst.length + ' obstacle' + (ED.obst.length > 1 ? 's' : '') + ' · ' + ED.bonus.length + ' bonus' + (diff ? '<br>Difficulté estimée : ' + '★'.repeat(diff) + '☆'.repeat(5 - diff) : '');
  const tips = {
    path: ED.cur < 0 ? (ED.paths.length ? 'Touche un <b>bord</b> : nouvelle entrée. Touche un <b>couloir</b> : division (les virus choisissent leur voie).' : 'Touche une case du <b>bord</b> de la carte : ce sera l\'entrée des virus.')
      : 'Touche une case pour prolonger le couloir. Retouche le <b>dernier point</b> pour finir : un <b>processeur</b> y est placé, sauf si tu rejoins un autre couloir.',
    obst: 'Touche ou <b>glisse</b> sur le circuit pour poser des <b>obstacles</b> : on ne peut pas construire dessus.',
    bonus: 'Touche ou <b>glisse</b> pour poser des <b>cases bonus</b> : une tourelle posée dessus fait <b>+30 % de dégâts</b>.',
    erase: 'Touche un <b>couloir</b> pour le supprimer, ou <b>glisse</b> sur les obstacles et bonus pour les effacer.'
  };
  $('#edHint').innerHTML = (err ? '⚠ ' + err : '✔ Niveau jouable !') + '<br>' + tips[ED.tool || 'path'];
  document.querySelectorAll('#edTools [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === (ED.tool || 'path')));
  $('#edUndo').classList.toggle('off', !(ED.hist && ED.hist.length)); $('#edRedo').classList.toggle('off', !(ED.redo && ED.redo.length));
  $('#edTest').classList.toggle('off', !!err); $('#edShare').classList.toggle('off', !!err);
}
// poser / retirer un obstacle ou un bonus (mode = 'add' | 'del')
function edPaint(tx, ty, mode) {
  if (!ED || tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  const tool = ED.tool;
  if (tool === 'erase') {
    let k = tileIn(ED.obst, tx, ty); if (k >= 0) { ED.obst.splice(k, 1); return true; }
    k = tileIn(ED.bonus, tx, ty); if (k >= 0) { ED.bonus.splice(k, 1); return true; }
    return false;
  }
  const arr = tool === 'obst' ? ED.obst : ED.bonus, k = tileIn(arr, tx, ty);
  if (mode === 'del') { if (k >= 0) { arr.splice(k, 1); return true; } return false; }
  if (k >= 0 || onCorridor(tx, ty)) return false;
  if (arr.length >= (tool === 'obst' ? 80 : 30)) { toast(tool === 'obst' ? '80 obstacles au maximum' : '30 cases bonus au maximum'); return false; }
  const other = tool === 'obst' ? ED.bonus : ED.obst, ko = tileIn(other, tx, ty); if (ko >= 0) other.splice(ko, 1);
  arr.push([tx, ty]); return true;
}
function edTap(tx, ty) {
  if (!ED || tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return;
  const tool = ED.tool || 'path';
  if (tool === 'obst' || tool === 'bonus') {
    if (onCorridor(tx, ty)) { toast('Pas sur un couloir : pose-le sur le circuit'); sfx('err'); return; }
    const arr = tool === 'obst' ? ED.obst : ED.bonus; edSnap();
    edPaint(tx, ty, tileIn(arr, tx, ty) >= 0 ? 'del' : 'add'); sfx('build'); edUpdate(); return;
  }
  if (tool === 'erase') {
    edSnap();
    if (edPaint(tx, ty)) { sfx('sell'); edUpdate(); return; }
    let pi = -1; ED.paths.forEach((p, i) => { if ((p.length >= 2 ? pathTiles(p) : p).some(c => c[0] === tx && c[1] === ty)) pi = i; });
    if (pi < 0) { ED.hist.pop(); toast('Rien à effacer ici'); return; }
    ED.paths.splice(pi, 1); ED.cur = -1; sfx('sell'); toast('Couloir supprimé'); edUpdate(); return;
  }
  if (ED.cur < 0) {
    const onCorr = ED.paths.some(o => o.length >= 2 && pathTiles(o).some(c => c[0] === tx && c[1] === ty));
    if (!onEdge(tx, ty) && !onCorr) { toast('Touche un bord (nouvelle entrée) ou un couloir existant (division)'); sfx('err'); return; }
    if (ED.paths.filter(p => p.length >= 2).length >= 8) { toast('8 couloirs au maximum'); sfx('err'); return; }
    edSnap(); ED.paths.push([[tx, ty]]); ED.cur = ED.paths.length - 1; sfx('build');
    if (!onEdge(tx, ty)) toast('🔀 Division : trace la nouvelle branche'); edUpdate(); return;
  }
  const p = ED.paths[ED.cur], last = p[p.length - 1];
  if (tx === last[0] && ty === last[1]) { edSnap(); if (p.length < 2) ED.paths.splice(ED.cur, 1); ED.cur = -1; sfx('coin'); edUpdate(); return; }
  if (p.length >= 40) { toast('Chemin trop long'); return; }
  const add = []; if (tx !== last[0] && ty !== last[1]) add.push([tx, last[1]]); add.push([tx, ty]);
  const own = new Set((p.length >= 2 ? pathTiles(p) : [last]).map(q => q + ''));
  let prev = last;
  for (const q of add) { for (const c of pathTiles([prev, q]).slice(1)) { if (own.has(c + '')) { toast('Le couloir ne peut pas repasser sur lui-même'); sfx('err'); return; } own.add(c + ''); } prev = q; }
  edSnap(); p.push(...add); sfx('build');
  // arrivé sur un autre couloir : on s'y raccorde et on termine
  const other = ED.paths.some((o, i) => i !== ED.cur && o.length >= 2 && pathTiles(o).some((c, ci) => c[0] === tx && c[1] === ty));
  if (other) { ED.cur = -1; toast('🔗 Couloir raccordé'); }
  edUpdate();
}
function edCommit() {
  const err = edCheck(ED); if (err) { toast('⚠ ' + err); sfx('err'); return null; }
  const code = lvlEncode(ED); save.levels = save.levels || [];
  if (ED.idx >= 0 && save.levels[ED.idx]) save.levels[ED.idx] = { code }; else { save.levels.push({ code }); ED.idx = save.levels.length - 1; }
  persist(); return code;
}
function openEditor(idx) {
  const d = idx >= 0 ? lvlDecode(save.levels[idx].code) : null;
  ED = d ? Object.assign(d, { idx, cur: -1 }) : Object.assign(JSON.parse(JSON.stringify(ED_DEF)), { name: 'Mon niveau', world: 0, waves: 30, paths: [], cur: -1, idx: -1 });
  ED.tool = 'path'; ED.hist = []; ED.redo = [];
  L.zoom = 1; L.vx = COLS / 2; L.vy = ROWS / 2; setState('edit'); edUpdate();
}
// génère un niveau au hasard (couloirs, obstacles, bonus) en gardant les réglages
function edGenerate() {
  edSnap();
  const seed = Math.floor(Math.random() * 1e6), d = randomDef(seed), R2 = mulberry(seed + 9);
  ED.paths = d.paths; ED.cur = -1; ED.obst = []; ED.bonus = [];
  const free = []; for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (!onCorridor(x, y)) free.push([x, y]);
  for (let i = 0; i < 6 && free.length; i++) { const [x, y] = free.splice(Math.floor(R2() * free.length), 1)[0]; ED.obst.push([x, y]); if (R2() < .5 && x + 1 < COLS - 1 && !onCorridor(x + 1, y)) ED.obst.push([x + 1, y]); }
  const near = free.filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => onCorridor(x + a, y + b)) && tileIn(ED.obst, x, y) < 0);
  for (let i = 0; i < 3 && near.length; i++) ED.bonus.push(near.splice(Math.floor(R2() * near.length), 1)[0]);
  sfx('up'); edUpdate(); toast('🎲 Niveau généré : modifie-le à ta guise !');
}
function playLevel(code, fromEditor) {
  const d = lvlDecode(code); if (!d) { toast('Niveau invalide'); return; }
  MAPS[NCAMP] = defToMap(d, hashStr(code)); delete thumbs[NCAMP]; initAudio();
  startMap(NCAMP, { custom: true, fromEditor: !!fromEditor, lvKey: lvKeyOf(code) });
}
// partage : fenêtre avec le code, copie et partage natif (navigateur ou appli Android)
const APP = window.AndroidApp || null; // pont fourni par l'appli Android
const LVL_RE = /VD[1-4]~[^\s#&]+/;
const shareLink = code => location.protocol.startsWith('http') ? location.href.split('#')[0].split('?')[0] + '#lvl=' + code : '';
function copyText(t, okMsg) {
  const ok = () => { toast(okMsg); sfx('coin'); };
  if (APP && APP.copy) { APP.copy(t); ok(); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(ok, () => fallback()); return; }
  fallback();
  function fallback() { const ta = $('#shareCode'); ta.focus(); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Sélectionne le code et copie-le'); } }
}
function shareLevel(code) {
  const d = lvlDecode(code); if (!d) return;
  const link = shareLink(code), msg = 'Essaie mon niveau « ' + d.name + ' » sur Virus Défense ! Ouvre Créer des niveaux → Importer, et colle ce code :\n' + code + (link ? '\n' + link : '');
  $('#shareName').textContent = d.name; $('#shareCode').value = code; $('#shareLen').textContent = code.length + ' caractères';
  drawQR($('#shareQR'), link || code);
  $('#shareLink').classList.toggle('hidden', !link);
  $('#shareNative').classList.toggle('hidden', !(APP && APP.share) && !navigator.share);
  $('#shareNative').onclick = () => { if (APP && APP.share) APP.share(msg); else navigator.share({ title: 'Virus Défense · ' + d.name, text: msg }).catch(() => { }); };
  $('#shareCopy').onclick = () => copyText(msg, '📋 Code copié : colle-le dans un message à tes amis !');
  $('#shareLink').onclick = () => copyText(link, '🔗 Lien copié');
  $('#shareBox').classList.remove('hidden');
}
// QR code du niveau (bibliothèque qrcode-generator, licence MIT)
function drawQR(cv, text) {
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  try {
    const q = qrcode(0, text.length > 600 ? 'L' : 'M'); q.addData(text, 'Byte'); q.make();
    const n = q.getModuleCount(), cell = Math.floor(cv.width / (n + 6)), off = Math.floor((cv.width - cell * n) / 2);
    g.fillStyle = '#0b1410'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(off + c * cell, off + r * cell, cell, cell);
    cv.parentNode.classList.remove('hidden');
  } catch (e) { cv.parentNode.classList.add('hidden'); } // code trop long pour un QR code
}
// lecture d'un QR code : détecteur du navigateur, sinon jsQR (chargé seulement quand on scanne)
let jsQRp = null, scan = null;
const loadJsQR = () => jsQRp || (jsQRp = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'js/vendor/jsQR.js'; s.onload = () => ok(window.jsQR); s.onerror = ko; document.head.appendChild(s); }));
async function readQR(src, w, h) {
  if ('BarcodeDetector' in window) { try { const r = await new BarcodeDetector({ formats: ['qr_code'] }).detect(src); if (r[0]) return r[0].rawValue; return null; } catch (e) { } }
  const jq = await loadJsQR(), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0, w, h);
  const res = jq(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' }); return res ? res.data : null;
}
function gotQR(txt) {
  if (!txt || !LVL_RE.test(txt)) { toast('Ce QR code n\'est pas un niveau de Virus Défense'); sfx('err'); return false; }
  closeScan(); if (importLevel(txt)) { $('#importBox').classList.add('hidden'); vibe(30); if (state === 'levels') buildLevels(); else setState('levels'); } return true;
}
async function openScan() {
  const box = $('#scanBox'), v = $('#scanVid'); box.classList.remove('hidden'); $('#scanMsg').textContent = 'Vise le QR code du niveau…';
  try { const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); scan = { st, on: true }; v.srcObject = st; await v.play(); }
  catch (e) { box.classList.add('hidden'); toast('Caméra indisponible : choisis « Depuis une photo »'); sfx('err'); return; }
  const tick = async () => {
    if (!scan || !scan.on) return;
    if (v.videoWidth) { const k = Math.min(1, 640 / v.videoWidth); try { const t = await readQR(v, Math.round(v.videoWidth * k), Math.round(v.videoHeight * k)); if (t && LVL_RE.test(t)) { gotQR(t); return; } } catch (e) { } }
    setTimeout(tick, 250);
  };
  tick();
}
function closeScan() { if (scan) { scan.on = false; scan.st.getTracks().forEach(t => t.stop()); scan = null; } $('#scanVid').srcObject = null; $('#scanBox').classList.add('hidden'); }
$('#scanClose').onclick = closeScan;
$('#importScan').onclick = () => { if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Caméra indisponible : choisis « Depuis une photo »'); return; } openScan(); };
$('#importPhoto').onclick = () => { $('#importFile').value = ''; $('#importFile').click(); };
$('#importFile').onchange = async () => {
  const f = $('#importFile').files[0]; if (!f) return;
  try {
    const img = await createImageBitmap(f); let t = null;
    for (const mx of [1000, 1800, 600]) { const k = Math.min(1, mx / Math.max(img.width, img.height)); t = await readQR(img, Math.round(img.width * k), Math.round(img.height * k)); if (t) break; }
    if (!t) { toast('Aucun QR code trouvé sur cette photo'); sfx('err'); return; }
    gotQR(t);
  } catch (e) { toast('Impossible de lire cette image'); sfx('err'); }
};
function importLevel(txt) {
  const m = (txt || '').match(LVL_RE), d = m && lvlDecode(m[0]);
  if (!d) { toast('Code de niveau invalide'); sfx('err'); return false; }
  save.levels = save.levels || [];
  if (!save.levels.some(l => l.code === m[0])) save.levels.push({ code: m[0] });
  persist(); toast('📥 Niveau « ' + d.name + ' » ajouté à tes niveaux'); sfx('up'); return true;
}
function openImport() { $('#importTxt').value = ''; $('#importBox').classList.remove('hidden'); }
$('#importPaste').onclick = async () => {
  let t = '';
  try { if (APP && APP.paste) t = APP.paste(); else if (navigator.clipboard && navigator.clipboard.readText) t = await navigator.clipboard.readText(); } catch (e) { }
  if (t) $('#importTxt').value = t; else { toast('Appuie longuement dans la case pour coller'); $('#importTxt').focus(); }
};
$('#importGo').onclick = () => { if (importLevel($('#importTxt').value)) { $('#importBox').classList.add('hidden'); if (state === 'levels') buildLevels(); else setState('levels'); } };
document.querySelectorAll('.mclose').forEach(b => b.onclick = () => b.closest('.modal').classList.add('hidden'));
// niveau reçu depuis une autre appli (partage Android vers Virus Défense)
window.onSharedLevel = txt => { if (importLevel(txt)) setState('levels'); };
// croquis rapide d'un niveau (éditeur et miniatures)
function drawSketch(c, m, d, ed) {
  const b = MAPS[d.world * 3], g = c.createLinearGradient(0, 0, COLS, ROWS);
  g.addColorStop(0, shade(b.base, .1)); g.addColorStop(1, shade(b.base, -.4)); c.fillStyle = g; c.fillRect(0, 0, COLS, ROWS);
  if (ed) { c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = .03; c.beginPath(); for (let x = 0; x <= COLS; x++) { c.moveTo(x, 0); c.lineTo(x, ROWS); } for (let y = 0; y <= ROWS; y++) { c.moveTo(0, y); c.lineTo(COLS, y); } c.stroke(); }
  if (!m) return;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = m.g[y][x];
    if (ch === 'X') { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + .05, y + .05, .9, .9); }
    else if (ch !== '#') { c.fillStyle = '#120f0c'; c.fillRect(x, y, 1, 1); }
  }
  c.strokeStyle = b.acc; c.lineWidth = .06;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (m.g[y][x] !== '#' && m.g[y][x] !== 'X') {
    const open = (xx, yy) => xx >= 0 && yy >= 0 && xx < COLS && yy < ROWS && '.SE'.includes(m.g[yy][xx]);
    c.beginPath(); if (!open(x, y - 1)) { c.moveTo(x, y); c.lineTo(x + 1, y); } if (!open(x, y + 1)) { c.moveTo(x, y + 1); c.lineTo(x + 1, y + 1); } if (!open(x - 1, y)) { c.moveTo(x, y); c.lineTo(x, y + 1); } if (!open(x + 1, y)) { c.moveTo(x + 1, y); c.lineTo(x + 1, y + 1); } c.stroke();
  }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (m.g[y][x] === 'S') { c.fillStyle = '#ff1744'; c.beginPath(); c.arc(x + .5, y + .5, .32, 0, TAU); c.fill(); }
    if (m.g[y][x] === 'E') { c.fillStyle = '#40c4ff'; c.fillRect(x + .15, y + .15, .7, .7); c.fillStyle = '#012'; c.font = '900 .3px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CPU', x + .5, y + .52); }
  }
}
function renderEditor() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#070a08'; ctx.fillRect(0, 0, SW, SH);
  if (!ED) return;
  ctx.save(); ctx.beginPath(); ctx.rect(L.ax, L.ay, L.aw, L.ah); ctx.clip(); mapTransform();
  drawSketch(ctx, ED.map, ED, true);
  const t = performance.now() / 1000;
  if (ED.cur < 0) { // bords où l'on peut placer une entrée
    ctx.fillStyle = 'rgba(255,23,68,' + (.12 + .1 * Math.sin(t * 4)).toFixed(2) + ')';
    for (let x = 0; x < COLS; x++) { ctx.fillRect(x, 0, 1, 1); ctx.fillRect(x, ROWS - 1, 1, 1); } for (let y = 1; y < ROWS - 1; y++) { ctx.fillRect(0, y, 1, 1); ctx.fillRect(COLS - 1, y, 1, 1); }
  }
  ED.paths.forEach((p, i) => { // tracé des chemins
    const col = ['#ffd740', '#40c4ff', '#69f0ae', '#ff80ab', '#b388ff', '#ffab40', '#80deea', '#f48fb1'][i % 8], on = i === ED.cur;
    ctx.strokeStyle = col; ctx.lineWidth = on ? .14 : .09; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = on ? 1 : .7;
    ctx.beginPath(); p.forEach(([x, y], j) => j ? ctx.lineTo(x + .5, y + .5) : ctx.moveTo(x + .5, y + .5)); ctx.stroke();
    p.forEach(([x, y], j) => { ctx.fillStyle = j === p.length - 1 && on ? '#fff' : col; ctx.beginPath(); ctx.arc(x + .5, y + .5, j === p.length - 1 && on ? .22 + .05 * Math.sin(t * 6) : .14, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
  });
  if (ED.map) for (const [bx, by] of ED.map.branchAt) { // divisions
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = .04; ctx.beginPath(); ctx.moveTo(bx + .5, by + .15); ctx.lineTo(bx + .85, by + .5); ctx.lineTo(bx + .5, by + .85); ctx.lineTo(bx + .15, by + .5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.font = '900 .38px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⑂', bx + .5, by + .52);
  }
  for (const [x, y] of ED.obst || []) { // obstacles
    ctx.fillStyle = '#4a545c'; ctx.fillRect(x + .06, y + .06, .88, .88); ctx.strokeStyle = '#ffc400'; ctx.lineWidth = .07;
    ctx.beginPath(); ctx.moveTo(x + .25, y + .25); ctx.lineTo(x + .75, y + .75); ctx.moveTo(x + .75, y + .25); ctx.lineTo(x + .25, y + .75); ctx.stroke();
  }
  for (const [x, y] of ED.bonus || []) { // cases bonus
    ctx.fillStyle = 'rgba(255,215,64,' + (.2 + .1 * Math.sin(t * 3 + x)).toFixed(2) + ')'; ctx.fillRect(x + .05, y + .05, .9, .9);
    ctx.strokeStyle = '#ffd740'; ctx.lineWidth = .04; ctx.setLineDash([.15, .1]); ctx.strokeRect(x + .08, y + .08, .84, .84); ctx.setLineDash([]); star(ctx, x + .5, y + .5, .17);
  }
  if (ED.map && ED.cur < 0 && !edCheck(ED)) for (let ri = 0; ri < ED.map.routes.length; ri++) { // aperçu : des virus parcourent les couloirs
    const r = ED.map.routes[ri], u = ((t * 3 + ri * 2.3) % (r.length + 6));
    for (let k = 0; k < 3; k++) { const q = u - k * 2.2; if (q < 0 || q >= r.length - 1) continue; const i0 = Math.floor(q), f = q - i0, a = r[i0], b = r[i0 + 1];
      const vx = a[0] + (b[0] - a[0]) * f + .5, vy = a[1] + (b[1] - a[1]) * f + .5; ctx.fillStyle = '#76ff03'; ctx.strokeStyle = '#1b1230'; ctx.lineWidth = .04; ctx.beginPath(); ctx.arc(vx, vy, .2, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  if (ED.hover) { const [hx, hy] = ED.hover; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = .05; ctx.strokeRect(hx + .03, hy + .03, .94, .94); }
  ctx.restore();
}
function buildLevels() {
  const box = $('#lvList'); box.innerHTML = ''; save.levels = save.levels || [];
  if (!save.levels.length) box.innerHTML = '<p class="lvempty">Aucun niveau pour l\'instant. Crée le tien, ou importe le code d\'un ami !</p>';
  save.levels.forEach((l, i) => {
    const d = lvlDecode(l.code); if (!d) return;
    const c = document.createElement('div'); c.className = 'lvcard';
    const cv2 = document.createElement('canvas'); cv2.width = COLS * 10; cv2.height = ROWS * 10; const g = cv2.getContext('2d'); g.scale(10, 10);
    try { drawSketch(g, defToMap(d, 1), d, false); } catch (e) { }
    c.appendChild(cv2);
    const info = document.createElement('div'); info.className = 'lvinfo';
        let mm = null; try { mm = defToMap(d, 1); } catch (e) { }
    const nEx = mm ? new Set(mm.routes.map(r => r[r.length - 1] + '')).size : 1;
    const rec = (save.lvBest || {})[lvKeyOf(l.code)], esc = t => t.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    info.innerHTML = '<b>' + esc(d.name) + '</b><small>' + WORLDS[d.world].name + ' · ' + d.waves + ' vagues · ' + (mm ? mm.entries.length : 1) + ' entrée(s) · ' + nEx + ' sortie(s)' + (mm && mm.branchAt.length ? ' · ' + mm.branchAt.length + ' division(s)' : '') + ' · ' + d.vir.length + ' virus' +
      ((d.obst || []).length ? ' · ' + d.obst.length + ' obstacle(s)' : '') + ((d.bonus || []).length ? ' · ' + d.bonus.length + ' bonus' : '') + '</small>' +
      (d.desc ? '<small class="lvdesc">« ' + esc(d.desc) + ' »</small>' : '') +
      '<small class="lvrec">' + (rec ? '<span class="st">' + '★'.repeat(rec.st) + '☆'.repeat(3 - rec.st) + '</span> Record ' + rec.s + ' · ' + rec.n + ' partie' + (rec.n > 1 ? 's' : '') : 'Pas encore joué') + '</small>';
    const bts = document.createElement('div'); bts.className = 'lvbtns';
    for (const [lab, cls, fn] of [['▶ Jouer', 'go', () => playLevel(l.code)], ['✎', '', () => openEditor(i)], ['⧉', '', () => { const c2 = lvlDecode(l.code); c2.name = (c2.name + ' (copie)').slice(0, 30); save.levels.splice(i + 1, 0, { code: lvlEncode(c2) }); persist(); buildLevels(); toast('Niveau dupliqué'); }], ['⇪', '', () => shareLevel(l.code)], ['✕', 'del', () => { if (confirm('Supprimer « ' + d.name + ' » ?')) { save.levels.splice(i, 1); persist(); buildLevels(); } }]]) {
      const b = document.createElement('button'); b.textContent = lab; b.className = cls; b.onclick = fn; bts.appendChild(b);
    }
    info.appendChild(bts); c.appendChild(info); box.appendChild(c);
  });
}
$('#menuLevels').onclick = () => { initAudio(); setState('levels'); };
$('#lvNew').onclick = () => openEditor(-1);
$('#lvImport').onclick = () => openImport();
$('#edName').onclick = () => { const n = prompt('Nom du niveau :', ED.name); if (n && n.trim()) { ED.name = n.trim().slice(0, 30); edUpdate(); } };
$('#edWPrev').onclick = () => { ED.world = (ED.world + WORLDS.length - 1) % WORLDS.length; edUpdate(); };
$('#edWNext').onclick = () => { ED.world = (ED.world + 1) % WORLDS.length; edUpdate(); };
$('#edVMinus').onclick = () => { if (ED.wl) { if (ED.wl.length > 1) ED.wl.pop(); ED.waves = ED.wl.length; } else ED.waves = Math.max(5, ED.waves - 5); edUpdate(); };
$('#edVPlus').onclick = () => { if (ED.wl) { if (ED.wl.length < 99) ED.wl.push(JSON.parse(JSON.stringify(ED.wl[ED.wl.length - 1]))); ED.waves = ED.wl.length; } else ED.waves = Math.min(99, ED.waves + 5); edUpdate(); };
$('#edNewPath').onclick = () => { if (ED.cur >= 0 && ED.paths[ED.cur].length < 2) ED.paths.splice(ED.cur, 1); ED.cur = -1; edUpdate(); toast('Touche une case du bord pour la nouvelle entrée'); };
$('#edUndo').onclick = () => { if (!ED.hist || !ED.hist.length) return; ED.redo.push(JSON.stringify({ p: ED.paths, o: ED.obst, b: ED.bonus, c: ED.cur })); edRestore(ED.hist.pop()); };
$('#edRedo').onclick = () => { if (!ED.redo || !ED.redo.length) return; ED.hist.push(JSON.stringify({ p: ED.paths, o: ED.obst, b: ED.bonus, c: ED.cur })); edRestore(ED.redo.pop()); };
$('#edGen').onclick = () => { if (ED.paths.length && !confirm('Remplacer la carte par un niveau généré au hasard ?')) return; edGenerate(); };
document.querySelectorAll('#edTools [data-tool]').forEach(b => b.onclick = () => { ED.tool = b.dataset.tool; if (ED.tool !== 'path' && ED.cur >= 0) { if (ED.paths[ED.cur].length < 2) ED.paths.splice(ED.cur, 1); ED.cur = -1; } edUpdate(); });
// ---- vagues personnalisées ----
let edWSel = 0, edPick = -1; // vague sélectionnée, groupe dont on choisit le virus
function autoWaves() { // transforme les vagues automatiques en vagues modifiables
  const m = defToMap(Object.assign({}, ED, { wl: null }), 1), keep = G, wl = [];
  G = { m, total: ED.waves, mi: ED.world * 3, demo: false, endless: false, daily: false };
  try {
    for (let w = 1; w <= ED.waves; w++) {
      const wd = waveDef(w), g = [{ t: wd.type, n: wd.n, gap: Math.max(.1, Math.round(ETYPES[wd.type].int * 10) / 10), d: 0, e: 0 }];
      if (wd.type2) g.push({ t: wd.type2, n: wd.n2, gap: Math.round(ETYPES[wd.type2].int * 13) / 10, d: .4, e: 0 });
      if (wd.type === 'boss' || wd.wboss) g.push({ t: 'bug', n: 6, gap: .6, d: .5, e: 0 });
      wl.push({ g });
    }
  } finally { G = keep; }
  return wl;
}
const fmtS = v => (Math.round(v * 10) / 10).toString().replace('.', ',') + ' s';
function edWavesHTML() {
  edWSel = clamp(edWSel, 0, ED.wl.length - 1);
  const w = ED.wl[edWSel], tot = w.g.reduce((a, x) => a + x.n, 0), dur = Math.max(...w.g.map(x => x.d + x.gap * (x.n - 1)));
  const hpT = Math.round(w.g.reduce((a, x) => a + x.n * ETYPES[x.t].hp, 0) * hpScale(edWSel + 1) * (ED.hp / 100));
  let h = '<div class="eo-sec"><b>Vagues</b> <small>(' + ED.wl.length + ' · touche une vague pour la modifier)</small><div class="wl-bar">';
  ED.wl.forEach((x, i) => { const n = x.g.reduce((a, y) => a + y.n, 0), boss = x.g.some(y => ETYPES[y.t].boss); h += '<button data-ws="' + i + '" class="wl-chip' + (i === edWSel ? ' on' : '') + (boss ? ' boss' : '') + '"><b>' + (i + 1) + '</b><small>' + (boss ? '👑' : n) + '</small></button>'; });
  h += '</div><div class="eo-row"><button data-wa="add">＋ Vague</button><button data-wa="dup">⧉ Dupliquer</button><button data-wa="del">🗑 Supprimer</button><button data-wa="left">❮ Avant</button><button data-wa="right">Après ❯</button><button data-wa="fill">🎲 Recréer tout en auto</button></div></div>';
  h += '<div class="eo-sec wl-edit"><b>Vague ' + (edWSel + 1) + '</b> <small>' + tot + ' virus · arrivée en ' + fmtS(dur) + ' · ≈ ' + hpT + ' PV au total</small><div class="wg-list"></div>' +
    (w.g.length < 8 ? '<div class="eo-row"><button data-wa="gadd">＋ Ajouter un groupe de virus</button></div>' : '') + '</div>';
  return h;
}
function edWavesBind(box) {
  if (!ED.wl || edTab !== 'wav' || !box.querySelector('.wg-list')) return;
  const w = ED.wl[edWSel], nEnt = ED.map ? ED.map.entries.length : 1, re = () => { ED.waves = ED.wl.length; buildEdOpts(); edUpdate(); };
  const list = box.querySelector('.wg-list');
  w.g.forEach((g, gi) => {
    const row = document.createElement('div'); row.className = 'wg-row';
    const pick = document.createElement('button'); pick.className = 'wg-pick' + (edPick === gi ? ' on' : ''); pick.title = 'Changer de virus';
    pick.appendChild(enemyIcon(g.t, 40)); const nm = document.createElement('small'); nm.textContent = ETYPES[g.t].name; pick.appendChild(nm);
    pick.onclick = () => { edPick = edPick === gi ? -1 : gi; buildEdOpts(); }; row.appendChild(pick);
    const ctl = (lab, val, fm, fn) => { const c = document.createElement('div'); c.className = 'wg-ctl'; c.innerHTML = '<small>' + lab + '</small><span class="eo-pm"><button>−</button><b>' + fm(val) + '</b><button>+</button></span>'; const [m, p] = c.querySelectorAll('button'); m.onclick = () => { fn(-1); re(); }; p.onclick = () => { fn(1); re(); }; row.appendChild(c); };
    ctl('Nombre', g.n, v => v, d => { const st = g.n >= 20 ? 5 : 1; g.n = clamp(g.n + d * st, 1, 300); });
    ctl('Écart', g.gap, fmtS, d => { g.gap = clamp(Math.round((g.gap + d * (g.gap >= 1 ? .25 : .1)) * 100) / 100, .1, 5); });
    ctl('Départ', g.d, v => '+' + fmtS(v), d => { g.d = clamp(Math.round((g.d + d * .5) * 10) / 10, 0, 60); });
    ctl('Entrée', g.e || 0, v => v ? 'n° ' + v : 'toutes', d => { g.e = ((g.e || 0) + d + nEnt + 1) % (nEnt + 1); });
    const del = document.createElement('button'); del.className = 'wg-del'; del.textContent = '✕'; del.title = 'Retirer ce groupe';
    del.onclick = () => { if (w.g.length === 1) { toast('Une vague garde au moins un groupe'); return; } w.g.splice(gi, 1); edPick = -1; re(); }; row.appendChild(del);
    list.appendChild(row);
    if (edPick === gi) { // choix du virus du groupe
      const grid = document.createElement('div'); grid.className = 'eo-vir wg-grid';
      for (const k of ED_WT) { const b = document.createElement('button'); b.className = 'eo-v' + (k === g.t ? ' on' : ''); b.title = ETYPES[k].name + ' : ' + (EDESC[k] || ''); b.appendChild(enemyIcon(k, 40)); const n = document.createElement('small'); n.textContent = ETYPES[k].name; b.appendChild(n); b.onclick = () => { g.t = k; edPick = -1; re(); }; grid.appendChild(b); }
      list.appendChild(grid);
    }
  });
  box.querySelectorAll('[data-ws]').forEach(b => b.onclick = () => { edWSel = +b.dataset.ws; edPick = -1; buildEdOpts(); });
  box.querySelectorAll('[data-wa]').forEach(b => b.onclick = () => {
    const a = b.dataset.wa, cp = x => JSON.parse(JSON.stringify(x));
    if (a === 'add') { if (ED.wl.length >= 99) return toast('99 vagues au maximum'); ED.wl.splice(edWSel + 1, 0, { g: [{ t: (ED.vir || ['bug'])[0], n: 10, gap: .8, d: 0, e: 0 }] }); edWSel++; }
    if (a === 'dup') { if (ED.wl.length >= 99) return toast('99 vagues au maximum'); ED.wl.splice(edWSel + 1, 0, cp(w)); edWSel++; }
    if (a === 'del') { if (ED.wl.length === 1) return toast('Garde au moins une vague'); ED.wl.splice(edWSel, 1); edWSel = Math.max(0, edWSel - 1); }
    if (a === 'left' && edWSel > 0) { ED.wl.splice(edWSel - 1, 0, ED.wl.splice(edWSel, 1)[0]); edWSel--; }
    if (a === 'right' && edWSel < ED.wl.length - 1) { ED.wl.splice(edWSel + 1, 0, ED.wl.splice(edWSel, 1)[0]); edWSel++; }
    if (a === 'fill') { if (!confirm('Remplacer toutes les vagues par des vagues automatiques ?')) return; ED.wl = autoWaves(); }
    if (a === 'gadd') { const last = w.g[w.g.length - 1]; w.g.push({ t: last.t, n: 5, gap: last.gap, d: Math.round((last.d + last.gap * last.n) * 10) / 10, e: 0 }); }
    edPick = -1; re();
  });
}
// réglages du niveau, en onglets : virus, vagues, économie, tourelles, règles, infos
let edTab = 'vir';
function buildEdOpts() {
  const box = $('#edOptsBody'), V = new Set(ED.vir), W = WORLDS[ED.world], rule = RULES[W.style];
  const bossName = k => k === 'auto' ? 'Boss du monde' : k === '' ? 'Aucun' : k === 'boss' ? 'Méga-virus' : ETYPES[k].name;
  const pm = (k, lab, unit, cur, hint) => '<label><span>' + lab + (hint ? '<small>' + hint + '</small>' : '') + '</span><span class="eo-pm"><button data-n="' + k + '" data-d="-1">−</button><b>' + cur + unit + '</b><button data-n="' + k + '" data-d="1">+</button></span></label>';
  const tog = (k, lab, on, hint) => '<label><span>' + lab + (hint ? '<small>' + hint + '</small>' : '') + '</span><button data-t="' + k + '" class="' + (on ? 'on' : '') + '">' + (on ? 'OUI' : 'NON') + '</button></label>';
  const tabs = [['vir', '🦠 Virus'], ['wav', '🌊 Vagues'], ['eco', '💰 Économie'], ['tow', '🏰 Tourelles'], ['rul', '⚙ Règles'], ['inf', '✎ Infos']];
  let h = '<div class="eo-tabs">' + tabs.map(([k, l]) => '<button data-tab="' + k + '" class="' + (edTab === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div><div class="eo-page">';
  if (edTab === 'vir') h += '<div class="eo-sec"><b>Virus présents</b> <small>(' + V.size + ' choisis · ils arrivent dans cet ordre)</small><div class="eo-vir"></div><div class="eo-row"><button data-a="all">Tous</button><button data-a="base">Classiques</button><button data-a="world">Du monde</button></div></div>' +
    '<div class="eo-sec"><b>Boss de la dernière vague</b><div class="eo-row eo-boss">' + ['auto', '', 'boss'].concat(WBOSS).map(k => '<button data-b="' + k + '" class="' + (ED.boss === k ? 'on' : '') + '">' + bossName(k) + '</button>').join('') + '</div></div>';
  if (edTab === 'wav') {
    h += '<div class="eo-sec eo-nums"><label><span>Composition des vagues<small>' + (ED.wl ? 'Personnalisée : tu choisis les virus de chaque vague, leur nombre, leur rythme et leur entrée.' : 'Automatique : le jeu crée les vagues avec les virus de l\'onglet Virus.') + '</small></span><span class="eo-seg"><button data-wm="auto" class="' + (ED.wl ? '' : 'on') + '">Auto</button><button data-wm="custom" class="' + (ED.wl ? 'on' : '') + '">Personnalisée</button></span></label>' +
      (ED.wl ? '' : pm('waves', 'Nombre de vagues', '', ED.waves)) + pm('hp', 'Points de vie des virus', ' %', ED.hp, '100 % = normal') + pm('spd', 'Vitesse des virus', ' %', ED.spd) +
      (ED.wl ? '' : tog('megas', 'Méga-virus toutes les 10 vagues', ED.megas)) + '</div>';
    if (ED.wl) h += edWavesHTML();
  }
  if (edTab === 'eco') h += '<div class="eo-sec eo-nums">' + pm('cash', 'Crédits de départ', '', ED.cash || 'auto') + pm('lives', 'Vies', '', ED.lives || 'auto') + pm('rew', 'Crédits gagnés par virus', ' %', ED.rew) + '</div>';
  if (edTab === 'tow') h += '<div class="eo-sec"><b>Tourelles autorisées</b> <small>(' + (ED.allowed ? ED.allowed.length : TORDER.length) + ' / ' + TORDER.length + ' · le joueur doit quand même les avoir débloquées)</small><div class="eo-vir eo-tow"></div><div class="eo-row"><button data-a="tall">Toutes</button><button data-a="tcheap">Petit budget</button><button data-a="tnone">Aucune sauf le Pulseur</button></div></div>';
  if (edTab === 'rul') h += '<div class="eo-sec eo-nums">' + tog('noRule', 'Règle du monde : ' + rule.name, !ED.noRule, rule.desc) + tog('noPower', 'Pouvoirs du joueur', !ED.noPower, 'Frappe orbitale, gel, redémarrage') + '</div>';
  if (edTab === 'inf') h += '<div class="eo-sec eo-nums"><label><span>Nom</span></label><input id="eoName" class="eo-in noico" maxlength="30"><label><span>Message affiché au début<small>Raconte une histoire ou donne un indice (140 caractères)</small></span></label><textarea id="eoDesc" class="eo-in noico" maxlength="140" rows="3"></textarea>' +
    '<label><span>Monde</span><span class="eo-pm"><button data-w="-1">❮</button><b>' + W.name + '</b><button data-w="1">❯</button></span></label></div>';
  box.innerHTML = h + '</div>';
  box.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { edTab = b.dataset.tab; edPick = -1; buildEdOpts(); });
  box.querySelectorAll('[data-wm]').forEach(b => b.onclick = () => {
    if (b.dataset.wm === 'custom' && !ED.wl) { ED.wl = autoWaves(); edWSel = 0; toast('Les vagues automatiques sont copiées : modifie-les à ta guise'); }
    else if (b.dataset.wm === 'auto' && ED.wl) { if (!confirm('Revenir aux vagues automatiques ? Tes vagues personnalisées seront perdues.')) return; ED.wl = null; }
    ED.waves = ED.wl ? ED.wl.length : ED.waves; buildEdOpts(); edUpdate();
  });
  edWavesBind(box);
  const vb = box.querySelector('.eo-vir:not(.eo-tow)');
  if (vb) for (const k of ED_VIR) {
    const b = document.createElement('button'); b.className = 'eo-v' + (V.has(k) ? ' on' : ''); b.title = ETYPES[k].name + ' : ' + EDESC[k];
    b.appendChild(enemyIcon(k, 44)); const n = document.createElement('small'); n.textContent = ETYPES[k].name; b.appendChild(n);
    b.onclick = () => { if (V.has(k)) { if (V.size === 1) { toast('Garde au moins un virus'); return; } ED.vir = ED.vir.filter(x => x !== k); } else ED.vir = ED_VIR.filter(x => V.has(x) || x === k); buildEdOpts(); edUpdate(); };
    vb.appendChild(b);
  }
  const tb = box.querySelector('.eo-tow');
  if (tb) { const A = new Set(ED.allowed || TORDER); shopWorld = ED.world; for (const k of TORDER) {
    const b = document.createElement('button'); b.className = 'eo-v' + (A.has(k) ? ' on' : '');
    const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 64; const g = cv2.getContext('2d'); g.setTransform(64, 0, 0, 64, 32, 32); drawTower(g, k, 1, -Math.PI / 4, 0, 0); b.appendChild(cv2);
    const n = document.createElement('small'); n.textContent = tName(k, true); b.appendChild(n);
    b.onclick = () => { if (A.has(k)) { if (A.size === 1) { toast('Garde au moins une tourelle'); return; } A.delete(k); } else A.add(k); ED.allowed = A.size === TORDER.length ? null : TORDER.filter(x => A.has(x)); buildEdOpts(); };
    tb.appendChild(b);
  } shopWorld = null; }
  box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'all') ED.vir = ED_VIR.slice(); if (a === 'base') ED.vir = ED_DEF.vir.slice();
    if (a === 'world') ED.vir = ED_VIR.filter(k => ['bug', 'runner'].includes(k) || WVIR3[ED.world].includes(k));
    if (a === 'tall') ED.allowed = null; if (a === 'tcheap') ED.allowed = TORDER.filter(k => TOWERS[k].cost <= 40); if (a === 'tnone') ED.allowed = ['pulse'];
    buildEdOpts(); edUpdate();
  });
  box.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { ED.boss = b.dataset.b; buildEdOpts(); });
  box.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const k = b.dataset.t; ED[k] = !ED[k]; buildEdOpts(); edUpdate(); });
  box.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { ED.world = (ED.world + WORLDS.length + +b.dataset.w) % WORLDS.length; buildEdOpts(); edUpdate(); });
  const STEP = { waves: [5, 5, 99], hp: [25, 25, 400], spd: [10, 50, 200], rew: [25, 25, 300], cash: [10, 0, 2000], lives: [1, 0, 99] };
  box.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
    const k = b.dataset.n, d = +b.dataset.d, [st, lo, hi] = STEP[k];
    let v = ED[k] || 0; if (!v && (k === 'cash' || k === 'lives') && d > 0) v = k === 'cash' ? 20 : 0;
    ED[k] = clamp(v + d * st, lo, hi); buildEdOpts(); edUpdate();
  });
  const nm = $('#eoName'), ds = $('#eoDesc');
  if (nm) { nm.value = ED.name; nm.oninput = () => { ED.name = nm.value.replace(/~/g, '').slice(0, 30) || 'Niveau'; edUpdate(); }; }
  if (ds) { ds.value = ED.desc || ''; ds.oninput = () => { ED.desc = ds.value.replace(/~/g, '').slice(0, 140); }; }
}
$('#edOptsBtn').onclick = () => { buildEdOpts(); $('#edOpts').classList.remove('hidden'); };
$('#edOptsOk').onclick = () => { $('#edOpts').classList.add('hidden'); edUpdate(); };
$('#edClear').onclick = () => { if (confirm('Tout effacer (couloirs, obstacles, bonus) ?')) { edSnap(); ED.paths = []; ED.obst = []; ED.bonus = []; ED.cur = -1; edUpdate(); } };
$('#edSave').onclick = () => { if (edCommit()) { toast('💾 Niveau enregistré'); sfx('up'); } };
$('#edTest').onclick = () => { const c = edCommit(); if (c) playLevel(c, true); };
$('#edShare').onclick = () => { const c = edCommit(); if (c) shareLevel(c); };
$('#edBack').onclick = () => { if (!edCheck(ED)) edCommit(); setState('levels'); };
// zone aléatoire pour le mode infini
function randomDef(seed) {
  const R2 = mulberry(seed), world = Math.floor(R2() * WORLDS.length);
  let y = 1 + Math.floor(R2() * (ROWS - 2)), x = 0; const p = [[0, y]];
  while (x < COLS - 1) {
    const nx = Math.min(COLS - 1, x + 3 + Math.floor(R2() * 4)); p.push([nx, y]); x = nx; if (x >= COLS - 1) break;
    let ny; do { ny = 1 + Math.floor(R2() * (ROWS - 2)); } while (Math.abs(ny - y) < 4);
    p.push([x, ny]); y = ny;
  }
  const paths = [p], T = pathTiles(p), own = new Set(T.map(q => q + '')), cand = T.slice(3, -4).filter(([tx]) => tx >= 3 && tx <= COLS - 4);
  const free = (tx, ys) => ys.every(yy => !own.has(tx + ',' + yy) && !own.has((tx - 1) + ',' + yy) && !own.has((tx + 1) + ',' + yy));
  for (let k = 0; k < 2; k++) if (R2() < .7) for (let tries = 0; tries < 25 && cand.length; tries++) {
    const [tx, ty] = cand[Math.floor(R2() * cand.length)];
    const up = [...Array(ty).keys()], dn = []; for (let yy = ty + 1; yy < ROWS; yy++) dn.push(yy);
    if (ty >= 4 && free(tx, up)) { paths.push([[tx, 0], [tx, ty]]); up.forEach(yy => own.add(tx + ',' + yy)); break; }
    if (ty <= ROWS - 5 && free(tx, dn)) { paths.push([[tx, ROWS - 1], [tx, ty]]); dn.forEach(yy => own.add(tx + ',' + yy)); break; }
  }
  return { name: 'Zone aléatoire', world, waves: 50, paths };
}
$('#mapRandom').onclick = () => {
  const seed = Math.floor(Math.random() * 1e6), d = randomDef(seed);
  MAPS[NCAMP] = defToMap(d, seed); MAPS[NCAMP].custom = false; MAPS[NCAMP].vir = null; delete thumbs[NCAMP]; initAudio();
  startMap(NCAMP, { endless: true, random: true });
};
