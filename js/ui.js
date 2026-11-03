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
    const nm = document.createElement('em'); nm.textContent = d.short || d.name; b.appendChild(nm);
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
  el.innerHTML = '<b style="color:' + d.col + '">' + d.name + ' <em>' + tCost(k) + ' cr</em></b><span class="tdesc">' + d.desc + '</span><span class="tnums">' + nums + (d.ground ? ' · sol' : '') + '</span>' +
    '<div class="tbars"><label>Dégâts</label><u>' + bar(st.dmg * st.rate * (st.chain || 1), 60) + '</u><label>Portée</label><u>' + bar(st.range, 4.5) + '</u><label>Cadence</label><u>' + bar(st.rate, 4) + '</u></div>';
}
function selectTool(k, quiet) {
  G.tool = k; closePopup(); towerInfo();
  document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('sel', b.dataset.t === k));
  if (k && !unlockedT(k)) { toast('🔒 ' + TOWERS[k].name + ' : débloque-la dans la Boutique avec ' + UNLOCK[k] + ' ⬢'); G.tool = null; document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('sel')); towerInfo(); return; }
  if (k && !quiet) toast(TOWERS[k].name + ' (' + tCost(k) + ' cr) : ' + TOWERS[k].desc + ' — touche le circuit ou glisse-la sur la carte');
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
  $('#tpName').textContent = d.name + ' · niv. ' + t.lvl + '/' + maxLvl(t.type);
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
const ED_VIR = ['bug', 'runner', 'swarm', 'armor', 'flyer', 'regen', 'splitter', 'shield', 'ghost', 'healer', 'giant', 'jumper', 'worm', 'ember', 'packet', 'zombie', 'cryo', 'glitch', 'pixel', 'drone'];
const ED_BOSS = ['', 'boss'].concat(WBOSS);
const ED_DEF = { vir: ['bug', 'runner', 'swarm', 'armor', 'flyer', 'regen', 'splitter', 'shield', 'ghost', 'healer', 'giant', 'jumper'], boss: 'auto', megas: true, cash: 0, lives: 0 };
const edBossIdx = d => d.boss === 'auto' ? 99 : Math.max(0, ED_BOSS.indexOf(d.boss));
function lvlEncode(d) {
  const mask = (d.vir || ED_DEF.vir).reduce((a, k) => a + (ED_VIR.indexOf(k) >= 0 ? Math.pow(2, ED_VIR.indexOf(k)) : 0), 0);
  return 'VD2~' + encodeURIComponent((d.name || 'Niveau').replace(/~/g, '').slice(0, 30)) + '~' + d.world + '~' + d.waves + '~' +
    d.paths.filter(p => p.length >= 2).map(p => p.map(([x, y]) => x.toString(36) + y.toString(36)).join('')).join('.') + '~' +
    mask.toString(36) + '~' + edBossIdx(d) + '~' + (d.megas === false ? 0 : 1) + '~' + (d.cash || 0) + '~' + (d.lives || 0);
}
function lvlDecode(code) {
  try {
    const a = code.trim().split('~'); if (!((a[0] === 'VD1' && a.length === 5) || (a[0] === 'VD2' && a.length === 10))) return null;
    const world = +a[2], waves = +a[3];
    if (!(world >= 0 && world < WORLDS.length) || !(waves >= 10 && waves <= 99)) return null;
    const paths = a[4].split('.').filter(Boolean).map(t => { const p = []; for (let i = 0; i + 1 < t.length; i += 2) p.push([parseInt(t[i], 36), parseInt(t[i + 1], 36)]); return p; });
    const d = Object.assign({ name: decodeURIComponent(a[1]) || 'Niveau', world, waves, paths }, JSON.parse(JSON.stringify(ED_DEF)));
    if (a[0] === 'VD2') {
      const mask = parseInt(a[5], 36), bi = +a[6];
      d.vir = ED_VIR.filter((k, i) => Math.floor(mask / Math.pow(2, i)) % 2); if (!d.vir.length) return null;
      d.boss = bi === 99 ? 'auto' : ED_BOSS[bi]; if (d.boss === undefined) return null;
      d.megas = a[7] !== '0'; d.cash = clamp(+a[8] || 0, 0, 2000); d.lives = clamp(+a[9] || 0, 0, 99);
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
  return null;
}
function defToMap(d, seed) {
  const b = MAPS[d.world * 3];
  return processMap({ name: d.name, base: b.base, acc: b.acc, waves: d.waves, world: d.world, custom: true, paths: d.paths.filter(p => p.length >= 2).map(p => p.map(q => q.slice())),
    vir: (d.vir || ED_DEF.vir).slice(), bossK: d.boss === undefined ? 'auto' : d.boss, megas: d.megas !== false, cashC: d.cash || 0, livesC: d.lives || 0 }, seed);
}
function edUpdate() {
  if (!ED) return;
  ED.map = null; try { if (ED.paths.some(p => p.length >= 2)) ED.map = defToMap(ED, 1); } catch (e) { }
  $('#edName').textContent = '✎ ' + ED.name; $('#edWorld').textContent = WORLDS[ED.world].name; $('#edWaves').textContent = ED.waves + ' vagues';
  const err = edCheck(ED);
  const nEx = ED.map ? new Set(ED.map.routes.map(r => r[r.length - 1] + '')).size : 0, nEn = ED.map ? ED.map.entries.length : 0, nBr = ED.map ? ED.map.branchAt.length : 0;
  $('#edStats').textContent = nEn + ' entrée' + (nEn > 1 ? 's' : '') + ' · ' + nBr + ' division' + (nBr > 1 ? 's' : '') + ' · ' + nEx + ' sortie' + (nEx > 1 ? 's' : '') + ' · ' + (ED.vir || ED_DEF.vir).length + ' virus';
  $('#edHint').innerHTML = ED.cur < 0 ? (ED.paths.length ? (err ? '⚠ ' + err + '<br>' : '✔ Niveau jouable !<br>') + 'Touche un <b>bord</b> : nouvelle entrée. Touche un <b>couloir</b> : division (les virus choisissent leur voie).' : 'Touche une case du <b>bord</b> de la carte : ce sera l\'entrée des virus.')
    : 'Touche une case pour prolonger le couloir. Le <b>dernier point</b> termine : un <b>processeur</b> (sortie) y est placé, sauf si tu rejoins un autre couloir.';
  $('#edTest').classList.toggle('off', !!err); $('#edShare').classList.toggle('off', !!err);

}
function edTap(tx, ty) {
  if (!ED || tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return;
  if (ED.cur < 0) {
    const onCorr = ED.paths.some(o => o.length >= 2 && pathTiles(o).some(c => c[0] === tx && c[1] === ty));
    if (!onEdge(tx, ty) && !onCorr) { toast('Touche un bord (nouvelle entrée) ou un couloir existant (division)'); sfx('err'); return; }
    if (ED.paths.filter(p => p.length >= 2).length >= 8) { toast('8 couloirs au maximum'); sfx('err'); return; }
    ED.paths.push([[tx, ty]]); ED.cur = ED.paths.length - 1; sfx('build');
    if (!onEdge(tx, ty)) toast('🔀 Division : trace la nouvelle branche'); edUpdate(); return;
  }
  const p = ED.paths[ED.cur], last = p[p.length - 1];
  if (tx === last[0] && ty === last[1]) { if (p.length < 2) ED.paths.splice(ED.cur, 1); ED.cur = -1; sfx('coin'); edUpdate(); return; }
  if (p.length >= 40) { toast('Chemin trop long'); return; }
  const add = []; if (tx !== last[0] && ty !== last[1]) add.push([tx, last[1]]); add.push([tx, ty]);
  const own = new Set((p.length >= 2 ? pathTiles(p) : [last]).map(q => q + ''));
  let prev = last;
  for (const q of add) { for (const c of pathTiles([prev, q]).slice(1)) { if (own.has(c + '')) { toast('Le couloir ne peut pas repasser sur lui-même'); sfx('err'); return; } own.add(c + ''); } prev = q; }
  p.push(...add); sfx('build');
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
  ED = d ? Object.assign(d, { idx, cur: -1 }) : Object.assign({ name: 'Mon niveau', world: 0, waves: 30, paths: [], cur: -1, idx: -1 }, JSON.parse(JSON.stringify(ED_DEF)));
  L.zoom = 1; L.vx = COLS / 2; L.vy = ROWS / 2; setState('edit'); edUpdate();
}
function playLevel(code, fromEditor) {
  const d = lvlDecode(code); if (!d) { toast('Niveau invalide'); return; }
  MAPS[NCAMP] = defToMap(d, hashStr(code)); delete thumbs[NCAMP]; initAudio();
  startMap(NCAMP, { custom: true, fromEditor: !!fromEditor });
}
function shareLevel(code) {
  const d = lvlDecode(code), link = location.protocol.startsWith('http') ? location.href.split('#')[0] + '#lvl=' + code : '';
  const text = 'Essaie mon niveau « ' + d.name + ' » sur Virus Défense ! Code : ' + code + (link ? '\n' + link : '');
  if (navigator.share) { navigator.share({ title: 'Virus Défense · ' + d.name, text }).catch(() => { }); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('📋 Code du niveau copié : envoie-le à tes amis !'), () => prompt('Copie ce code :', code));
  else prompt('Copie ce code :', code);
}
function importLevel(txt) {
  const m = (txt || '').match(/VD1~[^\s#&]+/), d = m && lvlDecode(m[0]);
  if (!d) { toast('Code de niveau invalide'); sfx('err'); return false; }
  save.levels = save.levels || [];
  if (!save.levels.some(l => l.code === m[0])) save.levels.push({ code: m[0] });
  persist(); toast('📥 Niveau « ' + d.name + ' » ajouté à tes niveaux'); sfx('up'); return true;
}
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
    info.innerHTML = '<b>' + d.name.replace(/</g, '&lt;') + '</b><small>' + WORLDS[d.world].name + ' · ' + d.waves + ' vagues · ' + (mm ? mm.entries.length : 1) + ' entrée(s) · ' + nEx + ' sortie(s)' + (mm && mm.branchAt.length ? ' · ' + mm.branchAt.length + ' division(s)' : '') + ' · ' + d.vir.length + ' virus</small>';
    const bts = document.createElement('div'); bts.className = 'lvbtns';
    for (const [lab, cls, fn] of [['▶ Jouer', 'go', () => playLevel(l.code)], ['✎', '', () => openEditor(i)], ['⇪', '', () => shareLevel(l.code)], ['✕', 'del', () => { if (confirm('Supprimer « ' + d.name + ' » ?')) { save.levels.splice(i, 1); persist(); buildLevels(); } }]]) {
      const b = document.createElement('button'); b.textContent = lab; b.className = cls; b.onclick = fn; bts.appendChild(b);
    }
    info.appendChild(bts); c.appendChild(info); box.appendChild(c);
  });
}
$('#menuLevels').onclick = () => { initAudio(); setState('levels'); };
$('#lvNew').onclick = () => openEditor(-1);
$('#lvImport').onclick = () => { const t = prompt('Colle le code (ou le lien) du niveau :'); if (t && importLevel(t)) buildLevels(); };
$('#edName').onclick = () => { const n = prompt('Nom du niveau :', ED.name); if (n && n.trim()) { ED.name = n.trim().slice(0, 30); edUpdate(); } };
$('#edWPrev').onclick = () => { ED.world = (ED.world + WORLDS.length - 1) % WORLDS.length; edUpdate(); };
$('#edWNext').onclick = () => { ED.world = (ED.world + 1) % WORLDS.length; edUpdate(); };
$('#edVMinus').onclick = () => { ED.waves = Math.max(10, ED.waves - 5); edUpdate(); };
$('#edVPlus').onclick = () => { ED.waves = Math.min(95, ED.waves + 5); edUpdate(); };
$('#edNewPath').onclick = () => { if (ED.cur >= 0 && ED.paths[ED.cur].length < 2) ED.paths.splice(ED.cur, 1); ED.cur = -1; edUpdate(); toast('Touche une case du bord pour la nouvelle entrée'); };
$('#edUndo').onclick = () => {
  if (ED.cur < 0) { if (!ED.paths.length) return; ED.cur = ED.paths.length - 1; }
  const p = ED.paths[ED.cur]; p.pop(); if (!p.length) { ED.paths.splice(ED.cur, 1); ED.cur = -1; } edUpdate();
};
// réglages du niveau : virus, boss, méga-virus, crédits, vies
function buildEdOpts() {
  const box = $('#edOptsBody'), V = new Set(ED.vir);
  const bossName = k => k === 'auto' ? 'Boss du monde' : k === '' ? 'Aucun' : k === 'boss' ? 'Méga-virus' : ETYPES[k].name;
  box.innerHTML = '<div class="eo-sec"><b>🦠 Virus présents</b> <small>(' + V.size + ' choisis · ils arrivent dans cet ordre)</small><div class="eo-vir"></div><div class="eo-row"><button data-a="all">Tous</button><button data-a="base">Classiques</button><button data-a="world">Du monde</button></div></div>' +
    '<div class="eo-sec"><b>👑 Boss de la dernière vague</b><div class="eo-row eo-boss">' + ['auto', '', 'boss'].concat(WBOSS).map(k => '<button data-b="' + k + '" class="' + (ED.boss === k ? 'on' : '') + '">' + bossName(k) + '</button>').join('') + '</div></div>' +
    '<div class="eo-sec eo-nums"><label><span>Méga-virus toutes les 10 vagues</span><button data-a="megas" class="' + (ED.megas ? 'on' : '') + '">' + (ED.megas ? 'OUI' : 'NON') + '</button></label>' +
    '<label><span>Crédits de départ</span><span class="eo-pm"><button data-n="cash" data-d="-10">−</button><b>' + (ED.cash || 'auto') + '</b><button data-n="cash" data-d="10">+</button></span></label>' +
    '<label><span>Vies</span><span class="eo-pm"><button data-n="lives" data-d="-1">−</button><b>' + (ED.lives || 'auto') + '</b><button data-n="lives" data-d="1">+</button></span></label></div>';
  const vb = box.querySelector('.eo-vir');
  for (const k of ED_VIR) {
    const b = document.createElement('button'); b.className = 'eo-v' + (V.has(k) ? ' on' : ''); b.title = ETYPES[k].name + ' : ' + EDESC[k];
    b.appendChild(enemyIcon(k, 44)); const n = document.createElement('small'); n.textContent = ETYPES[k].name; b.appendChild(n);
    b.onclick = () => { if (V.has(k)) { if (V.size === 1) { toast('Garde au moins un virus'); return; } ED.vir = ED.vir.filter(x => x !== k); } else ED.vir = ED_VIR.filter(x => V.has(x) || x === k); buildEdOpts(); edUpdate(); };
    vb.appendChild(b);
  }
  box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'all') ED.vir = ED_VIR.slice(); if (a === 'base') ED.vir = ED_DEF.vir.slice();
    if (a === 'world') ED.vir = ['bug', 'runner', WVIRUS[ED.world]].concat(ED.world === 7 ? ['flyer'] : ['armor']);
    if (a === 'megas') ED.megas = !ED.megas;
    buildEdOpts(); edUpdate();
  });
  box.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { ED.boss = b.dataset.b; buildEdOpts(); });
  box.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
    const k = b.dataset.n, d = +b.dataset.d, lim = k === 'cash' ? [0, 2000] : [0, 99];
    ED[k] = clamp((ED[k] || (d > 0 ? (k === 'cash' ? 20 : 0) : 0)) + d, lim[0], lim[1]); buildEdOpts();
  });
}
$('#edOptsBtn').onclick = () => { buildEdOpts(); $('#edOpts').classList.remove('hidden'); };
$('#edOptsOk').onclick = () => { $('#edOpts').classList.add('hidden'); edUpdate(); };
$('#edClear').onclick = () => { if (confirm('Effacer tous les chemins ?')) { ED.paths = []; ED.cur = -1; edUpdate(); } };
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
