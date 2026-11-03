'use strict';
/* ===================== VIRUS DÉFENSE — tower defense pour mobile ===================== */

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const $ = s => document.querySelector(s);
const COLS = 18, ROWS = 10, TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ---------------- cartes ----------------
   #  circuit (bloqué)   .  zone libre (on peut y construire, les virus y passent)
   S  entrée des virus   E  sortie (processeur)                                    */
const MAPS = [
  { name: 'Carte mère', base: '#1e6a2c', acc: '#e6ee5a', waves: 20, g: [
    '##################',
    'S.......##########',
    '#.......##.......#',
    '#.......##.......#',
    '#.......##.......#',
    '#................#',
    '#................#',
    '#######..........#',
    '#######..........E',
    '##################'] },
  { name: 'Bus d\'adresse', base: '#a85a16', acc: '#ffd166', waves: 25, g: [
    '######S###########',
    '##.........#######',
    '##.........#######',
    '##...####......###',
    '##...####......###',
    '##...####...##...#',
    '##..........##...#',
    '######......##...#',
    '######...........E',
    '##################'] },
  { name: 'Mémoire vive', base: '#12706d', acc: '#7df9ff', waves: 30, g: [
    'S.....############',
    '#.....############',
    '#.....##.........#',
    '###...##.........#',
    '###......####....#',
    '###......####....#',
    '#######..####....#',
    '#######..........#',
    '#######..........E',
    '##################'] },
  { name: 'Alimentation', base: '#8a1c1c', acc: '#ff8a80', waves: 30, g: [
    '##################',
    'S......###.......#',
    '#......###.......#',
    '#..##..###..###..#',
    '#..##.......###..#',
    '#..##.......###..#',
    '#..######..#####.#',
    '#........#.......#',
    '#........#.......E',
    '##################'] },
  { name: 'Carte graphique', base: '#5b2a86', acc: '#e0aaff', waves: 35, g: [
    'S........#########',
    '#........#########',
    '#...####.........#',
    '#...####.........#',
    '#..........###...E',
    '#..........###...#',
    '#...####.........#',
    '#...####.........#',
    'S........#########',
    '##################'] },
  { name: 'Processeur central', base: '#1d4e89', acc: '#90e0ef', waves: 40, g: [
    '#######S##########',
    '#...............##',
    '#..###....###...##',
    '#..###....###...##',
    '#.......##.......#',
    '#.......##.......E',
    '#..###....###...##',
    '#..###....###...##',
    '#...............##',
    '#######S##########'] }
];

const DIFFS = {
  easy: { name: 'Facile', hp: .7, lives: 30, cash: 35, col: '#4ade80', desc: 'Virus fragiles · 30 vies' },
  normal: { name: 'Normal', hp: 1, lives: 20, cash: 25, col: '#60a5fa', desc: 'L\'expérience équilibrée · 20 vies' },
  hard: { name: 'Difficile', hp: 1.4, lives: 15, cash: 22, col: '#f97316', desc: 'Virus coriaces · 15 vies' },
  nightmare: { name: 'Cauchemar', hp: 1.75, lives: 10, cash: 20, col: '#ef4444', desc: 'Pour les experts · 10 vies' }
};

const TOWERS = {
  pulse: { name: 'Pulseur', cost: 5, range: 2.2, rate: 1.1, dmg: 6, col: '#b388ff', proj: 'bullet', spd: 9, desc: 'Pas cher : parfait pour construire le labyrinthe.' },
  gatling: { name: 'Mitrailleuse', cost: 12, range: 2.3, rate: 4, dmg: 2.2, col: '#ff4fa3', proj: 'bullet', spd: 12, desc: 'Cadence de tir très rapide.' },
  cannon: { name: 'Canon', cost: 25, range: 2.8, rate: .65, dmg: 16, splash: 1, col: '#ffab40', proj: 'shell', spd: 6, ground: true, desc: 'Obus explosifs. Ne touche pas les volants.' },
  frost: { name: 'Cryo', cost: 35, range: 2.3, rate: 1, dmg: 2, slow: .5, slowT: 1.6, splash: .7, col: '#4fc3f7', proj: 'ice', spd: 8, desc: 'Gèle et ralentit les virus.' },
  laser: { name: 'Laser', cost: 100, range: 4.2, rate: .55, dmg: 75, col: '#ff3d3d', proj: 'beam', desc: 'Très longue portée, dégâts énormes.' },
  tesla: { name: 'Tesla', cost: 150, range: 2.8, rate: 1.1, dmg: 22, chain: 4, col: '#ffe600', proj: 'chain', desc: 'Éclair qui rebondit sur plusieurs virus.' }
};
const TORDER = ['pulse', 'gatling', 'cannon', 'frost', 'laser', 'tesla'];
const TMAX = 4, UPMULT = [.8, 1.4, 2.4];
function tStats(type, lvl) {
  const d = TOWERS[type], k = lvl - 1;
  return {
    dmg: d.dmg * Math.pow(1.55, k), range: d.range + .25 * k, rate: d.rate * Math.pow(1.12, k),
    splash: d.splash ? d.splash + .12 * k : 0, slow: d.slow ? Math.max(.25, d.slow - .07 * k) : 0, slowT: d.slowT ? d.slowT + .3 * k : 0,
    chain: d.chain ? d.chain + k : 0
  };
}
const upCost = t => Math.round(TOWERS[t.type].cost * UPMULT[t.lvl - 1]);

const ETYPES = {
  bug: { name: 'Virus', hp: 10, spd: 1.5, rew: 1, col: '#7ed957', r: .27, int: .8, n: 10 },
  runner: { name: 'Coureur', hp: 7, spd: 2.6, rew: 1, col: '#ffd23f', r: .23, int: .55, n: 10 },
  swarm: { name: 'Essaim', hp: 4, spd: 1.9, rew: 1, col: '#ff7ac6', r: .17, int: .28, n: 16 },
  armor: { name: 'Blindé', hp: 28, spd: .95, rew: 3, col: '#9aa5b1', r: .33, int: 1.2, n: 6, armor: 2 },
  flyer: { name: 'Volant', hp: 9, spd: 1.4, rew: 2, col: '#6ec6ff', r: .25, int: .9, n: 8, fly: true },
  regen: { name: 'Mutant', hp: 20, spd: 1.3, rew: 2, col: '#b388ff', r: .28, int: 1, n: 8, regen: .05 },
  boss: { name: 'MÉGA-VIRUS', hp: 260, spd: .7, rew: 25, col: '#ff3b3b', r: .45, int: 3, n: 1, lives: 5, armor: 3 }
};
function waveDef(w) {
  if (w % 10 === 0) return { type: 'boss', n: Math.ceil(w / 20) };
  const intro = { 1: 'bug', 3: 'runner', 5: 'swarm', 6: 'armor', 8: 'flyer', 12: 'regen' };
  const avail = ['bug']; if (w >= 3) avail.push('runner'); if (w >= 5) avail.push('swarm'); if (w >= 6) avail.push('armor'); if (w >= 8) avail.push('flyer'); if (w >= 12) avail.push('regen');
  const type = intro[w] || avail[(w * 7 + 3) % avail.length];
  return { type, n: Math.round(ETYPES[type].n * (1 + w * .025)) };
}
const hpScale = w => (1 + .13 * (w - 1) + .011 * (w - 1) * (w - 1));
const rewScale = w => 1 + (w - 1) * .04;

/* ---------------- sauvegarde ---------------- */
const SAVE_KEY = 'virusdef_save_v1';
const DEFAULT_SAVE = { unlocked: { easy: 1, normal: 1, hard: 1, nightmare: 1 }, stars: {}, best: {}, sound: true, vibe: true, autoWave: true };
function loadSave() {
  const d = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) { Object.assign(d, s); d.unlocked = Object.assign({}, DEFAULT_SAVE.unlocked, s.unlocked); } } catch (e) { }
  return d;
}
let save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }

/* ---------------- son ---------------- */
let AC = null, NOISE = null; const lastS = {};
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    NOISE = AC.createBuffer(1, AC.sampleRate * .5, AC.sampleRate);
    const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function tone(f, dur, type, vol, f2) {
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol, freq) {
  const t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(AC.destination); s.start(t); s.stop(t + dur);
}
function sfx(n) {
  if (!AC || !save.sound) return;
  const now = performance.now(); if (lastS[n] && now - lastS[n] < 70) return; lastS[n] = now;
  switch (n) {
    case 'pulse': tone(700, .06, 'square', .02, 400); break;
    case 'gatling': tone(1100, .03, 'square', .012, 700); break;
    case 'cannon': noise(.18, .1, 900); break;
    case 'frost': tone(1500, .1, 'sine', .025, 2500); break;
    case 'laser': tone(1800, .18, 'sawtooth', .03, 200); break;
    case 'tesla': noise(.12, .08, 4000); tone(90, .12, 'square', .03); break;
    case 'pop': tone(500, .07, 'triangle', .04, 120); break;
    case 'boom': noise(.6, .25, 2000); tone(80, .5, 'sine', .15, 30); break;
    case 'leak': tone(220, .25, 'sawtooth', .06, 90); break;
    case 'build': tone(300, .08, 'triangle', .06, 600); break;
    case 'up': [500, 750, 1000].forEach((f, i) => setTimeout(() => AC && tone(f, .1, 'triangle', .06), i * 60)); break;
    case 'sell': tone(900, .1, 'sine', .06, 400); break;
    case 'err': tone(150, .15, 'square', .04); break;
    case 'wave': tone(330, .15, 'triangle', .07, 660); setTimeout(() => AC && tone(660, .2, 'triangle', .07, 990), 120); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => AC && tone(f, .25, 'triangle', .1), i * 120)); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => AC && tone(f, .3, 'sawtooth', .06), i * 160)); break;
  }
}
function vibe(ms) { if (save.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }

/* ---------------- mise en page ---------------- */
let DPR = 1, SW = 0, SH = 0;
const L = { T: 30, ox: 0, oy: 0, port: false };
function layout() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  SW = innerWidth; SH = innerHeight;
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  cv.style.width = SW + 'px'; cv.style.height = SH + 'px';
  const cs = getComputedStyle($('#safe'));
  const sT = parseFloat(cs.paddingTop) || 0, sR = parseFloat(cs.paddingRight) || 0, sB = parseFloat(cs.paddingBottom) || 0, sL = parseFloat(cs.paddingLeft) || 0;
  L.port = SH > SW * 1.05;
  const panel = $('#panel');
  panel.classList.toggle('land', !L.port); panel.classList.toggle('port', L.port);
  if (!L.port) {
    const aw = SW - 150 - sR - sL - 8, ah = SH - sT - sB - 8;
    L.T = Math.min(aw / COLS, ah / ROWS);
    L.ox = sL + 4 + (aw - COLS * L.T) / 2; L.oy = sT + 4 + (ah - ROWS * L.T) / 2;
  } else {
    const aw = SW - sL - sR - 8, ah = SH - sT - sB - 150 - 8;
    L.T = Math.min(aw / ROWS, ah / COLS);
    L.ox = sL + 4 + (aw - ROWS * L.T) / 2; L.oy = sT + 4 + (ah - COLS * L.T) / 2;
  }
  if (G && G.sel) placePopup();
}
addEventListener('resize', layout);
function toScreen(x, y) { return L.port ? [L.ox + (ROWS - y) * L.T, L.oy + x * L.T] : [L.ox + x * L.T, L.oy + y * L.T]; }
function toMap(sx, sy) { return L.port ? [(sy - L.oy) / L.T, ROWS - (sx - L.ox) / L.T] : [(sx - L.ox) / L.T, (sy - L.oy) / L.T]; }
function mapTransform() {
  const T = L.T * DPR;
  if (L.port) ctx.setTransform(0, T, -T, 0, (L.ox + ROWS * L.T) * DPR, L.oy * DPR);
  else ctx.setTransform(T, 0, 0, T, L.ox * DPR, L.oy * DPR);
}

/* ---------------- fond de circuit imprimé ---------------- */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}
function buildBG(mi, P) {
  const m = MAPS[mi], c = document.createElement('canvas'); c.width = COLS * P; c.height = ROWS * P;
  const g = c.getContext('2d'), R = mulberry(mi * 977 + 13);
  g.fillStyle = m.base; g.fillRect(0, 0, c.width, c.height);
  // pistes
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 70; i++) {
    let x = R() * c.width, y = R() * c.height;
    g.strokeStyle = shade(m.base, R() < .5 ? .25 : -.25); g.lineWidth = P * (.04 + R() * .05);
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      const len = P * (.5 + R() * 3), dir = Math.floor(R() * 8) * Math.PI / 4;
      x += Math.cos(dir) * len; y += Math.sin(dir) * len; g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#d9c27a'; g.beginPath(); g.arc(x, y, P * .07, 0, TAU); g.fill();
  }
  // composants (puces)
  for (let i = 0; i < 14; i++) {
    const w = P * (.8 + R() * 2.5), h = P * (.5 + R() * 1.5), x = R() * (c.width - w), y = R() * (c.height - h);
    g.fillStyle = '#c9c9c9';
    for (let px = x + P * .1; px < x + w - P * .05; px += P * .18) { g.fillRect(px, y - P * .1, P * .07, P * .12); g.fillRect(px, y + h - P * .02, P * .07, P * .12); }
    g.fillStyle = '#16181c'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.font = 'bold ' + (P * .18) + 'px monospace';
    g.fillText(['U' + (i + 1), 'IC' + (i * 7 % 90), 'RAM', 'CPU-F', 'BIOS', 'VGA', 'LPT'][i % 7], x + P * .1, y + P * .3);
  }
  // zone libre (sombre) + quadrillage
  const open = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && m.g[y][x] !== '#';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (open(x, y)) {
    g.fillStyle = 'rgba(12,14,12,.82)'; g.fillRect(x * P, y * P, P, P);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; g.strokeRect(x * P + .5, y * P + .5, P - 1, P - 1);
  }
  // bordure lumineuse
  g.strokeStyle = m.acc; g.lineWidth = P * .06; g.shadowColor = m.acc; g.shadowBlur = P * .3;
  g.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (open(x, y)) {
    const X = x * P, Y = y * P;
    if (!open(x, y - 1) && y > 0) { g.moveTo(X, Y); g.lineTo(X + P, Y); }
    if (!open(x, y + 1) && y < ROWS - 1) { g.moveTo(X, Y + P); g.lineTo(X + P, Y + P); }
    if (!open(x - 1, y) && x > 0) { g.moveTo(X, Y); g.lineTo(X, Y + P); }
    if (!open(x + 1, y) && x < COLS - 1) { g.moveTo(X + P, Y); g.lineTo(X + P, Y + P); }
  }
  g.stroke(); g.shadowBlur = 0;
  // entrées / sortie
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = m.g[y][x]; if (ch !== 'S' && ch !== 'E') continue;
    const cx = (x + .5) * P, cy = (y + .5) * P;
    if (ch === 'S') {
      // flèche vers l'intérieur
      const dx = x === 0 ? 1 : x === COLS - 1 ? -1 : 0, dy = y === 0 ? 1 : y === ROWS - 1 ? -1 : 0, a = Math.atan2(dy, dx);
      g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = '#ff5252';
      g.beginPath(); g.moveTo(P * .32, 0); g.lineTo(-P * .2, -P * .28); g.lineTo(-P * .2, P * .28); g.closePath(); g.fill(); g.restore();
    } else {
      g.fillStyle = '#263238'; g.fillRect(cx - P * .4, cy - P * .4, P * .8, P * .8);
      g.strokeStyle = '#90caf9'; g.lineWidth = P * .06; g.strokeRect(cx - P * .4, cy - P * .4, P * .8, P * .8);
      g.fillStyle = '#90caf9'; g.font = 'bold ' + (P * .24) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CPU', cx, cy);
    }
  }
  return c;
}

/* ---------------- état ---------------- */
let G = null, state = 'menu', curDiff = 'normal', uid = 1, BG = null;

function startMap(mi) {
  const m = MAPS[mi], d = DIFFS[curDiff];
  const starts = [], exits = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const ch = m.g[y][x]; if (ch === 'S') starts.push([x, y]); if (ch === 'E') exits.push([x, y]); }
  G = {
    mi, m, d, total: m.waves, wave: 0, lives: d.lives, cash: d.cash, score: 0, time: 0,
    starts, exits, towers: [], towerAt: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    enemies: [], projs: [], fx: [], parts: [], texts: [], queue: [], spawnT: 0, nextStart: 0,
    tool: null, sel: null, hover: null, speed: 1, countdown: -1, over: false, kills: 0
  };
  G.dist = computeDist();
  BG = buildBG(mi, 48);
  G.tool = 'pulse';
  buildTowerBar(); closePopup();
  setState('play');
  updatePanel(true);
  toast('Pose des tourelles, puis lance la vague !');
}

/* ---------------- chemin (champ de distance) ---------------- */
function walkable(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS && G.m.g[y][x] !== '#' && !G.towerAt[y][x]; }
function computeDist() {
  const D = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity)), q = [];
  for (const [x, y] of G.exits) { D[y][x] = 0; q.push([x, y]); }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i], v = D[y][x] + 1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (walkable(nx, ny) && D[ny][nx] > v) { D[ny][nx] = v; q.push([nx, ny]); }
    }
  }
  return D;
}

/* ---------------- construction ---------------- */
function canPlace(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return 'out';
  if (G.m.g[ty][tx] !== '.') return 'Impossible de construire ici';
  if (G.towerAt[ty][tx]) return 'Case occupée';
  for (const e of G.enemies) if (!e.fly && ((Math.floor(e.x) === tx && Math.floor(e.y) === ty) || (e.tx === tx && e.ty === ty))) return 'Un virus est sur cette case';
  G.towerAt[ty][tx] = true;
  const D = computeDist();
  G.towerAt[ty][tx] = null;
  for (const [x, y] of G.starts) if (D[y][x] === Infinity) return 'Tu ne peux pas bloquer le chemin !';
  for (const e of G.enemies) if (!e.fly && D[e.ty][e.tx] === Infinity) return 'Tu ne peux pas bloquer le chemin !';
  return null;
}
function tryPlace(type, tx, ty) {
  const cost = TOWERS[type].cost;
  const why = canPlace(tx, ty);
  if (why === 'out') return;
  if (why) { toast(why); sfx('err'); vibe(30); flashTile(tx, ty); return; }
  if (G.cash < cost) { toast('Pas assez de crédits'); sfx('err'); vibe(30); return; }
  G.cash -= cost;
  const t = { id: uid++, type, x: tx, y: ty, lvl: 1, cd: 0, ang: -Math.PI / 2, invested: cost, kills: 0, st: tStats(type, 1) };
  G.towers.push(t); G.towerAt[ty][tx] = t;
  G.dist = computeDist();
  for (let i = 0; i < 8; i++) G.parts.push(part(tx + .5, ty + .5, TOWERS[type].col, 2));
  sfx('build'); vibe(10); updatePanel();
}
function upgradeTower(t) {
  if (t.lvl >= TMAX) return;
  const c = upCost(t);
  if (G.cash < c) { toast('Pas assez de crédits'); sfx('err'); return; }
  G.cash -= c; t.invested += c; t.lvl++; t.st = tStats(t.type, t.lvl);
  for (let i = 0; i < 14; i++) G.parts.push(part(t.x + .5, t.y + .5, '#fff59d', 3));
  sfx('up'); vibe(15); updatePanel(); fillPopup();
}
function sellTower(t) {
  const r = Math.floor(t.invested * .7);
  G.cash += r; G.towers.splice(G.towers.indexOf(t), 1); G.towerAt[t.y][t.x] = null;
  G.dist = computeDist();
  floatText(t.x + .5, t.y + .5, '+' + r, '#e6ee5a');
  sfx('sell'); closePopup(); updatePanel();
}
function flashTile(tx, ty) { if (tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS) G.fx.push({ kind: 'bad', x: tx, y: ty, life: .4, max: .4 }); }

/* ---------------- vagues ---------------- */
function startWave() {
  if (!G || G.over || G.wave >= G.total) return;
  const early = G.enemies.length > 0 || G.queue.length > 0;
  G.wave++;
  const wd = waveDef(G.wave), et = ETYPES[wd.type];
  let t = G.queue.length ? G.queue[G.queue.length - 1].t + 1 : 0;
  for (let i = 0; i < wd.n; i++) { G.queue.push({ type: wd.type, t, wave: G.wave }); t += et.int; }
  if (wd.type === 'boss') for (let i = 0; i < 6; i++) G.queue.push({ type: 'bug', t: i * .6 + .5, wave: G.wave });
  G.queue.sort((a, b) => a.t - b.t);
  G.spawnT = 0;
  const bonus = 2 + Math.floor(G.wave / 3) + (early ? 3 : 0);
  G.cash += bonus; G.score += bonus * 10;
  G.countdown = -1;
  toast((wd.type === 'boss' ? '⚠ ' : '') + 'Vague ' + G.wave + ' : ' + wd.n + ' × ' + et.name + (early ? ' · bonus anticipé +' + bonus : ' · +' + bonus + ' crédits'));
  sfx('wave'); updatePanel();
}
function spawnEnemy(type, wave) {
  const d = ETYPES[type], s = G.starts[G.nextStart++ % G.starts.length];
  const hp = d.hp * hpScale(wave) * G.d.hp;
  const e = {
    id: uid++, type, x: s[0] + .5, y: s[1] + .5, tx: s[0], ty: s[1], hp, max: hp, spd: d.spd, r: d.r, col: d.col,
    rew: Math.max(1, Math.round(d.rew * rewScale(wave))), armor: (d.armor || 0) * (1 + wave * .03), fly: !!d.fly, regen: d.regen || 0,
    lives: d.lives || 1, slowT: 0, slowF: 1, ang: 0, anim: Math.random() * 10, prog: 0, dead: false
  };
  if (!e.fly) nextTile(e);
  G.enemies.push(e);
}
function nextTile(e) {
  const D = G.dist; let best = null, bd = D[e.ty][e.tx];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of dirs) {
    const nx = e.tx + dx, ny = e.ty + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    if (D[ny][nx] < bd) { bd = D[ny][nx]; best = [nx, ny]; }
  }
  if (best) { e.tx = best[0]; e.ty = best[1]; }
}

/* ---------------- effets ---------------- */
function part(x, y, col, spd) { const a = Math.random() * TAU, s = rand(.3, 1) * spd; return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .6), max: .6, col, size: rand(.05, .1) }; }
function floatText(x, y, t, col) { G.texts.push({ x, y, t, col, life: 1 }); }
let toastT = 0;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }

/* ---------------- combat ---------------- */
function hurt(e, dmg) {
  if (e.dead) return;
  e.hp -= Math.max(dmg - e.armor, dmg * .25);
  e.hit = .08;
  if (e.hp <= 0) {
    e.dead = true; G.kills++;
    G.cash += e.rew; G.score += e.rew * 10;
    floatText(e.x, e.y - .3, '+' + e.rew, '#e6ee5a');
    const n = e.type === 'boss' ? 40 : 8;
    for (let i = 0; i < n; i++) G.parts.push(part(e.x, e.y, i % 3 ? e.col : '#ffffff', e.type === 'boss' ? 4 : 2.5));
    G.fx.push({ kind: 'splat', x: e.x, y: e.y, r: e.r * 1.6, life: 8, max: 8 });
    sfx(e.type === 'boss' ? 'boom' : 'pop'); if (e.type === 'boss') vibe(200);
  }
}
function enemyProgress(e) {
  if (e.fly) { const ex = G.exits[0]; return Math.hypot(ex[0] + .5 - e.x, ex[1] + .5 - e.y); }
  return G.dist[e.ty][e.tx] + Math.hypot(e.tx + .5 - e.x, e.ty + .5 - e.y);
}
function findTarget(t) {
  const cx = t.x + .5, cy = t.y + .5, r2 = t.st.range * t.st.range, ground = TOWERS[t.type].ground;
  let best = null, bp = Infinity;
  for (const e of G.enemies) {
    if (e.dead || (ground && e.fly)) continue;
    const dx = e.x - cx, dy = e.y - cy;
    if (dx * dx + dy * dy <= r2) { const p = e.prog; if (p < bp) { bp = p; best = e; } }
  }
  return best;
}
function fire(t, e) {
  const d = TOWERS[t.type], s = t.st, cx = t.x + .5, cy = t.y + .5;
  const mx = cx + Math.cos(t.ang) * .4, my = cy + Math.sin(t.ang) * .4;
  switch (d.proj) {
    case 'bullet': case 'shell': case 'ice':
      G.projs.push({ kind: d.proj, x: mx, y: my, tgt: e, lx: e.x, ly: e.y, spd: d.spd, dmg: s.dmg, splash: s.splash, slow: s.slow, slowT: s.slowT, ground: d.ground, col: d.col });
      break;
    case 'beam':
      hurt(e, s.dmg);
      G.fx.push({ kind: 'beam', x1: mx, y1: my, x2: e.x, y2: e.y, col: d.col, life: .15, max: .15, w: .08 + t.lvl * .02 });
      break;
    case 'chain': {
      const hit = new Set([e]); let cur = e, dmg = s.dmg; const pts = [[cx, cy - .1], [e.x, e.y]];
      hurt(e, dmg);
      for (let i = 1; i < s.chain; i++) {
        let nb = null, nd = 1.8;
        for (const o of G.enemies) { if (o.dead || hit.has(o)) continue; const dd = Math.hypot(o.x - cur.x, o.y - cur.y); if (dd < nd) { nd = dd; nb = o; } }
        if (!nb) break;
        dmg *= .85; hurt(nb, dmg); hit.add(nb); cur = nb; pts.push([nb.x, nb.y]);
      }
      G.fx.push({ kind: 'chain', pts, col: d.col, life: .18, max: .18 });
      break;
    }
  }
  sfx(t.type);
}
function impact(p) {
  if (p.splash) {
    for (const e of G.enemies) {
      if (e.dead || (p.ground && e.fly)) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < p.splash + e.r) {
        hurt(e, p.dmg);
        if (p.slow) { e.slowF = e.slowT > 0 ? Math.min(e.slowF, p.slow) : p.slow; e.slowT = Math.max(e.slowT, p.slowT); }
      }
    }
    G.fx.push({ kind: 'ring', x: p.x, y: p.y, r: p.splash, col: p.col, life: .25, max: .25 });
  } else if (p.tgt && !p.tgt.dead) hurt(p.tgt, p.dmg);
  for (let i = 0; i < 4; i++) G.parts.push(part(p.x, p.y, p.col, 1.5));
}

/* ---------------- mise à jour ---------------- */
function update(dt) {
  G.time += dt;
  // apparitions
  if (G.queue.length) {
    G.spawnT += dt;
    while (G.queue.length && G.queue[0].t <= G.spawnT) { const q = G.queue.shift(); spawnEnemy(q.type, q.wave); }
  }
  // virus
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.anim += dt; e.hit = Math.max(0, (e.hit || 0) - dt);
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
    if (e.regen && e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max * e.regen * dt);
    let mv = e.spd * e.slowF * dt;
    if (e.fly) {
      const ex = G.exits[0], dx = ex[0] + .5 - e.x, dy = ex[1] + .5 - e.y, d = Math.hypot(dx, dy);
      e.ang = Math.atan2(dy, dx);
      if (d <= mv) { leak(e); continue; }
      e.x += dx / d * mv; e.y += dy / d * mv;
    } else {
      let guard = 0;
      while (mv > 0 && guard++ < 5) {
        const cx = e.tx + .5, cy = e.ty + .5, dx = cx - e.x, dy = cy - e.y, d = Math.hypot(dx, dy);
        if (d <= mv) {
          e.x = cx; e.y = cy; mv -= d;
          if (G.m.g[e.ty][e.tx] === 'E') { leak(e); break; }
          const ox = e.tx, oy = e.ty; nextTile(e);
          if (e.tx === ox && e.ty === oy) break;
        } else {
          e.x += dx / d * mv; e.y += dy / d * mv; mv = 0;
          const ta = Math.atan2(dy, dx); e.ang += Math.atan2(Math.sin(ta - e.ang), Math.cos(ta - e.ang)) * Math.min(1, dt * 14);
        }
      }
    }
    e.prog = enemyProgress(e);
  }
  // tourelles
  for (const t of G.towers) {
    t.cd -= dt;
    const e = findTarget(t);
    if (e) {
      const ta = Math.atan2(e.y - (t.y + .5), e.x - (t.x + .5));
      t.ang += Math.atan2(Math.sin(ta - t.ang), Math.cos(ta - t.ang)) * Math.min(1, dt * 16);
      if (t.cd <= 0) { fire(t, e); t.cd = 1 / t.st.rate; }
    }
  }
  // projectiles
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const p = G.projs[i];
    if (p.tgt && !p.tgt.dead) { p.lx = p.tgt.x; p.ly = p.tgt.y; }
    const dx = p.lx - p.x, dy = p.ly - p.y, d = Math.hypot(dx, dy), mv = p.spd * dt;
    if (d <= mv + .05) { p.x = p.lx; p.y = p.ly; impact(p); G.projs.splice(i, 1); continue; }
    p.x += dx / d * mv; p.y += dy / d * mv;
  }
  G.enemies = G.enemies.filter(e => !e.dead);
  // effets
  for (let i = G.fx.length - 1; i >= 0; i--) { G.fx[i].life -= dt; if (G.fx[i].life <= 0) G.fx.splice(i, 1); }
  for (let i = G.parts.length - 1; i >= 0; i--) { const q = G.parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .92; q.vy *= .92; if (q.life <= 0) G.parts.splice(i, 1); }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y -= .6 * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  if (G.parts.length > 500) G.parts.splice(0, G.parts.length - 500);
  // fin de vague / victoire
  const clear = !G.queue.length && !G.enemies.length;
  if (clear && G.wave >= G.total && !G.over) { endGame(true); return; }
  if (clear && G.wave > 0 && G.wave < G.total && save.autoWave) {
    if (G.countdown < 0) G.countdown = 8;
    G.countdown -= dt;
    if (G.countdown <= 0) startWave();
  }
}
function leak(e) {
  e.dead = true;
  G.lives = Math.max(0, G.lives - e.lives);
  G.fx.push({ kind: 'leak', life: .5, max: .5 });
  sfx('leak'); vibe(80); updatePanel();
  if (G.lives <= 0 && !G.over) endGame(false);
}

/* ---------------- dessin ---------------- */
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function drawTower(c, type, lvl, ang, time) {
  const d = TOWERS[type];
  // socle métallique
  const gr = c.createLinearGradient(0, -.45, 0, .45); gr.addColorStop(0, '#eceff1'); gr.addColorStop(1, '#78909c');
  c.fillStyle = gr; rr(c, -.45, -.45, .9, .9, .14); c.fill();
  c.strokeStyle = '#263238'; c.lineWidth = .04; c.stroke();
  c.fillStyle = '#37474f'; rr(c, -.36, -.36, .72, .72, .1); c.fill();
  c.fillStyle = d.col; c.globalAlpha = .35; rr(c, -.36, -.36, .72, .72, .1); c.fill(); c.globalAlpha = 1;
  // niveau
  for (let i = 1; i < lvl; i++) { c.fillStyle = '#ffe066'; c.beginPath(); c.arc(-.33 + i * .13, .34, .05, 0, TAU); c.fill(); }
  c.save(); c.rotate(type === 'tesla' ? 0 : ang);
  c.lineJoin = 'round';
  const dark = '#1b1f24';
  switch (type) {
    case 'pulse':
      c.fillStyle = dark; c.fillRect(0, -.07, .4, .14);
      c.fillStyle = d.col; c.beginPath(); c.arc(0, 0, .2, 0, TAU); c.fill(); c.strokeStyle = dark; c.lineWidth = .04; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-.05, -.06, .05, 0, TAU); c.fill(); break;
    case 'gatling':
      c.fillStyle = dark; for (const o of [-.1, 0, .1]) c.fillRect(0, o - .035, .42, .07);
      c.fillStyle = '#90a4ae'; c.fillRect(.3, -.15, .06, .3);
      c.fillStyle = d.col; rr(c, -.2, -.18, .3, .36, .08); c.fill(); c.strokeStyle = dark; c.lineWidth = .04; c.stroke(); break;
    case 'cannon':
      c.fillStyle = dark; rr(c, -.02, -.12, .44, .24, .05); c.fill();
      c.fillStyle = d.col; c.fillRect(.32, -.13, .08, .26);
      c.fillStyle = '#546e7a'; c.beginPath(); c.arc(0, 0, .24, 0, TAU); c.fill(); c.strokeStyle = dark; c.lineWidth = .04; c.stroke();
      c.fillStyle = d.col; c.beginPath(); c.arc(0, 0, .1, 0, TAU); c.fill(); break;
    case 'frost':
      c.fillStyle = dark; c.fillRect(0, -.05, .36, .1);
      c.fillStyle = d.col; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.lineTo(Math.cos(a) * .22, Math.sin(a) * .22); } c.closePath(); c.fill();
      c.strokeStyle = '#e1f5fe'; c.lineWidth = .035; c.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.moveTo(Math.cos(a) * .15, Math.sin(a) * .15); c.lineTo(-Math.cos(a) * .15, -Math.sin(a) * .15); } c.stroke(); break;
    case 'laser':
      c.fillStyle = dark; c.fillRect(0, -.045, .47, .09);
      c.fillStyle = '#b0bec5'; c.fillRect(.12, -.08, .08, .16);
      c.fillStyle = '#263238'; rr(c, -.22, -.17, .34, .34, .08); c.fill();
      c.fillStyle = d.col; c.beginPath(); c.arc(-.05, 0, .1, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-.08, -.03, .035, 0, TAU); c.fill(); break;
    case 'tesla': {
      c.strokeStyle = '#b87333'; c.lineWidth = .05;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(0, .12 - i * .08, .2 - i * .02, .05, 0, 0, TAU); c.stroke(); }
      const pulse = .13 + Math.sin(time * 8) * .02;
      c.fillStyle = d.col; c.globalAlpha = .35; c.beginPath(); c.arc(0, -.18, pulse * 1.8, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.fillStyle = '#fffde7'; c.beginPath(); c.arc(0, -.18, pulse, 0, TAU); c.fill(); c.strokeStyle = d.col; c.lineWidth = .035; c.stroke();
      break;
    }
  }
  c.restore();
}
function drawEnemy(e) {
  const d = ETYPES[e.type], r = e.r;
  ctx.save(); ctx.translate(e.x, e.y);
  // ombre
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(e.fly ? .12 : .04, e.fly ? .18 : .06, r, r * .8, 0, 0, TAU); ctx.fill();
  ctx.rotate(e.ang);
  const outline = '#1a0d0d';
  if (e.fly) {
    const f = Math.sin(e.anim * 30) * .5 + .5;
    ctx.fillStyle = 'rgba(220,240,255,.6)'; ctx.strokeStyle = outline; ctx.lineWidth = .025;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-r * .2, s * r * (.8 + f * .3), r * .7, r * .35, s * .4, 0, TAU); ctx.fill(); ctx.stroke(); }
  } else {
    ctx.strokeStyle = outline; ctx.lineWidth = r * .16; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) {
      const k = Math.sin(e.anim * 14 + i * 2 + (s > 0 ? Math.PI : 0)) * r * .3;
      ctx.beginPath(); ctx.moveTo(i * r * .5, s * r * .5); ctx.lineTo(i * r * .5 + k, s * r * 1.15); ctx.stroke();
    }
  }
  // pointes de virus
  ctx.fillStyle = shade(d.col, -.35);
  const sp = e.type === 'boss' ? 12 : 8;
  for (let i = 0; i < sp; i++) { const a = i * TAU / sp + e.anim * .5; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, r * .17, 0, TAU); ctx.fill(); }
  // corps
  const gr = ctx.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r);
  gr.addColorStop(0, e.hit > 0 ? '#ffffff' : shade(d.col, .45)); gr.addColorStop(1, e.hit > 0 ? '#ffffff' : d.col);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = r * .1; ctx.stroke();
  if (e.type === 'armor') { ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = r * .14; ctx.beginPath(); ctx.arc(0, 0, r * .72, Math.PI * .6, Math.PI * 1.4); ctx.stroke(); }
  if (e.type === 'regen') { ctx.strokeStyle = 'rgba(120,255,140,' + (.4 + .4 * Math.sin(e.anim * 6)) + ')'; ctx.lineWidth = r * .12; ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, TAU); ctx.stroke(); }
  if (e.type === 'boss') { ctx.fillStyle = '#ffd600'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r * .55, i * r * .28 - r * .1); ctx.lineTo(-r * .95, i * r * .28); ctx.lineTo(-r * .55, i * r * .28 + r * .1); ctx.fill(); } }
  // yeux méchants
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(r * .4, s * r * .33, r * .26, r * .22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * .5, s * r * .3, r * .11, 0, TAU); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = r * .11; ctx.beginPath(); ctx.moveTo(r * .15, s * r * .58); ctx.lineTo(r * .62, s * r * .15); ctx.stroke();
  }
  if (e.slowT > 0) { ctx.fillStyle = 'rgba(130,210,255,.4)'; ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0b1410'; ctx.fillRect(0, 0, SW, SH);
  if (!G) return;
  mapTransform();
  ctx.drawImage(BG, 0, 0, COLS, ROWS);
  // taches de virus éliminés
  for (const f of G.fx) if (f.kind === 'splat') {
    ctx.globalAlpha = Math.min(1, f.life / 2) * .55; ctx.fillStyle = '#050505';
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * TAU / 10, rr2 = f.r * (i % 2 ? .45 : 1); ctx.lineTo(f.x + Math.cos(a) * rr2, f.y + Math.sin(a) * rr2); } ctx.fill();
    ctx.globalAlpha = 1;
  }
  // case visée (souris)
  if (G.tool && G.hover) {
    const [hx, hy] = G.hover, ok = canPlace(hx, hy) === null && G.cash >= TOWERS[G.tool].cost;
    if (hx >= 0 && hy >= 0 && hx < COLS && hy < ROWS) {
      ctx.fillStyle = ok ? 'rgba(100,255,120,.3)' : 'rgba(255,60,60,.3)'; ctx.fillRect(hx, hy, 1, 1);
      if (ok) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .04; ctx.beginPath(); ctx.arc(hx + .5, hy + .5, TOWERS[G.tool].range, 0, TAU); ctx.stroke(); }
    }
  }
  for (const f of G.fx) if (f.kind === 'bad') { ctx.fillStyle = 'rgba(255,40,40,' + (f.life / f.max * .6) + ')'; ctx.fillRect(f.x, f.y, 1, 1); }
  // tourelles
  for (const t of G.towers) { ctx.save(); ctx.translate(t.x + .5, t.y + .5); drawTower(ctx, t.type, t.lvl, t.ang, G.time); ctx.restore(); }
  if (G.sel) {
    const t = G.sel; ctx.strokeStyle = '#e6ee5a'; ctx.lineWidth = .06; ctx.strokeRect(t.x + .03, t.y + .03, .94, .94);
    ctx.fillStyle = 'rgba(230,238,90,.08)'; ctx.beginPath(); ctx.arc(t.x + .5, t.y + .5, t.st.range, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,238,90,.6)'; ctx.lineWidth = .04; ctx.stroke();
  }
  // virus (au sol puis volants)
  for (const e of G.enemies) if (!e.fly) drawEnemy(e);
  for (const e of G.enemies) if (e.fly) drawEnemy(e);
  // projectiles
  for (const p of G.projs) {
    ctx.fillStyle = p.col;
    if (p.kind === 'shell') { ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(p.x, p.y, .1, 0, TAU); ctx.fill(); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, .05, 0, TAU); ctx.fill(); }
    else if (p.kind === 'ice') { ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(p.x, p.y, .14, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, .06, 0, TAU); ctx.fill(); }
    else { ctx.globalAlpha = .4; ctx.beginPath(); ctx.arc(p.x, p.y, .12, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, .05, 0, TAU); ctx.fill(); }
  }
  // rayons / éclairs / explosions
  ctx.lineCap = 'round';
  for (const f of G.fx) {
    const k = f.life / f.max;
    if (f.kind === 'beam') {
      ctx.globalAlpha = k; ctx.strokeStyle = f.col; ctx.lineWidth = f.w * 2.5; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = f.w; ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.kind === 'chain') {
      ctx.globalAlpha = k; ctx.strokeStyle = f.col; ctx.lineWidth = .07; ctx.beginPath();
      for (let i = 0; i < f.pts.length - 1; i++) {
        const [ax, ay] = f.pts[i], [bx, by] = f.pts[i + 1]; ctx.moveTo(ax, ay);
        for (let s = 1; s <= 4; s++) { const u = s / 4; ctx.lineTo(ax + (bx - ax) * u + (s < 4 ? rand(-.15, .15) : 0), ay + (by - ay) * u + (s < 4 ? rand(-.15, .15) : 0)); }
      }
      ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = .025; ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.kind === 'ring') {
      ctx.globalAlpha = k; ctx.strokeStyle = f.col; ctx.lineWidth = .08; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.1 - k * .6), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  for (const q of G.parts) { ctx.globalAlpha = q.life / q.max; ctx.fillStyle = q.col; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
  ctx.globalAlpha = 1;

  // ----- écran (texte et barres toujours droits) -----
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const T = L.T;
  for (const e of G.enemies) {
    if (e.hp >= e.max) continue;
    const [sx, sy] = toScreen(e.x, e.y), w = T * (e.type === 'boss' ? 1 : .6), y = sy - T * e.r - 9;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(sx - w / 2 - 1, y - 1, w + 2, 5);
    ctx.fillStyle = e.hp / e.max > .5 ? '#4caf50' : e.hp / e.max > .25 ? '#ffc107' : '#f44336'; ctx.fillRect(sx - w / 2, y, w * e.hp / e.max, 3);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + Math.max(11, T * .38) + 'px system-ui';
  for (const t of G.texts) { const [sx, sy] = toScreen(t.x, t.y); ctx.globalAlpha = Math.min(1, t.life * 2); ctx.fillStyle = '#000'; ctx.fillText(t.t, sx + 1, sy + 1); ctx.fillStyle = t.col; ctx.fillText(t.t, sx, sy); }
  ctx.globalAlpha = 1;
  for (const f of G.fx) if (f.kind === 'leak') { ctx.fillStyle = 'rgba(255,0,0,' + (f.life / f.max * .3) + ')'; ctx.fillRect(0, 0, SW, SH); }
  if (G.countdown > 0 && !G.over) {
    const [sx, sy] = toScreen(COLS / 2, .9);
    ctx.font = 'bold 15px system-ui'; ctx.fillStyle = 'rgba(0,0,0,.6)';
    const txt = 'Vague ' + (G.wave + 1) + ' dans ' + Math.ceil(G.countdown) + ' s';
    const w = ctx.measureText(txt).width + 20; ctx.fillRect(sx - w / 2, sy - 13, w, 26);
    ctx.fillStyle = '#e6ee5a'; ctx.fillText(txt, sx, sy);
  }
}

/* ---------------- entrées ---------------- */
let downP = null;
cv.addEventListener('pointerdown', e => { initAudio(); downP = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
cv.addEventListener('pointermove', e => {
  if (!G || state !== 'play') return;
  if (e.pointerType === 'mouse') { const [mx, my] = toMap(e.clientX, e.clientY); G.hover = [Math.floor(mx), Math.floor(my)]; }
});
cv.addEventListener('pointerleave', () => { if (G) G.hover = null; });
cv.addEventListener('pointerup', e => {
  if (!downP || downP.id !== e.pointerId) return;
  const moved = Math.hypot(e.clientX - downP.x, e.clientY - downP.y); downP = null;
  if (moved > 25 || !G || state !== 'play') return;
  const [mx, my] = toMap(e.clientX, e.clientY), tx = Math.floor(mx), ty = Math.floor(my);
  const inMap = tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS;
  const tw = inMap ? G.towerAt[ty][tx] : null;
  if (tw) { openPopup(tw); return; }
  if (G.sel) { closePopup(); return; }
  if (G.tool && inMap) tryPlace(G.tool, tx, ty);
});
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

/* ---------------- panneau ---------------- */
function buildTowerBar() {
  const bar = $('#towerBar'); bar.innerHTML = '';
  for (const k of TORDER) {
    const d = TOWERS[k], b = document.createElement('button'); b.className = 'tbtn'; b.dataset.t = k;
    const c = document.createElement('canvas'); c.width = c.height = 68;
    const g = c.getContext('2d'); g.setTransform(68, 0, 0, 68, 34, 34); drawTower(g, k, 1, -Math.PI / 4, 0);
    b.appendChild(c); const s = document.createElement('span'); s.textContent = d.cost + 'cr'; b.appendChild(s);
    b.onclick = () => { initAudio(); selectTool(G.tool === k ? null : k); };
    bar.appendChild(b);
  }
}
function selectTool(k) {
  G.tool = k; closePopup();
  document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('sel', b.dataset.t === k));
  if (k) toast(TOWERS[k].name + ' (' + TOWERS[k].cost + ' cr) : ' + TOWERS[k].desc);
}
const lastP = {};
function setTxt(id, v) { if (lastP[id] !== v) { lastP[id] = v; $(id).textContent = v; } }
function updatePanel(force) {
  if (!G) return;
  if (force) for (const k in lastP) delete lastP[k];
  setTxt('#sLives', String(G.lives).padStart(2, '0'));
  setTxt('#sCash', String(G.cash));
  setTxt('#sWave', String(G.wave).padStart(2, '0') + '/' + G.total);
  setTxt('#sScore', String(G.score).padStart(6, '0'));
  const bw = $('#bWave');
  let label;
  if (G.wave >= G.total) label = 'Dernière vague';
  else if (G.wave === 0) label = '▶ Vague 1';
  else if (G.queue.length || G.enemies.length) label = '⏩ Vague ' + (G.wave + 1);
  else label = '▶ Vague ' + (G.wave + 1) + (G.countdown > 0 ? ' (' + Math.ceil(G.countdown) + ')' : '');
  setTxt('#bWave', label);
  bw.classList.toggle('off', G.wave >= G.total);
  if (G.wave < G.total) { const w = waveDef(G.wave + 1); setTxt('#nextInfo', 'Suivante : ' + w.n + ' × ' + ETYPES[w.type].name + (ETYPES[w.type].fly ? ' (vol)' : '')); }
  else setTxt('#nextInfo', 'Élimine les derniers virus !');
  const key = TORDER.map(k => G.cash >= TOWERS[k].cost ? 1 : 0).join('');
  if (lastP.poor !== key) { lastP.poor = key; document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('poor', G.cash < TOWERS[b.dataset.t].cost)); }
  if (G.sel) { const k2 = G.cash + ':' + G.sel.lvl; if (lastP.pop !== k2) { lastP.pop = k2; fillPopup(); } }
}
$('#bWave').onclick = () => { initAudio(); startWave(); };
$('#bSpeed').onclick = () => { G.speed = G.speed >= 3 ? 1 : G.speed + 1; $('#bSpeed').textContent = '×' + G.speed; };
$('#bPause').onclick = () => pauseGame();

/* ---------------- fenêtre tourelle ---------------- */
function openPopup(t) { G.sel = t; $('#tpop').classList.remove('hidden'); fillPopup(); placePopup(); }
function closePopup() { if (G) G.sel = null; $('#tpop').classList.add('hidden'); }
function fillPopup() {
  const t = G.sel; if (!t) return;
  const d = TOWERS[t.type], s = t.st;
  $('#tpName').textContent = d.name + ' · niv. ' + t.lvl + '/' + TMAX;
  let html = 'Dégâts : <b>' + s.dmg.toFixed(1) + '</b> · Portée : <b>' + s.range.toFixed(1) + '</b><br>Cadence : <b>' + s.rate.toFixed(1) + '/s</b>';
  if (s.splash) html += ' · Zone : <b>' + s.splash.toFixed(1) + '</b>';
  if (s.slow) html += '<br>Ralentit à <b>' + Math.round(s.slow * 100) + '%</b> pendant ' + s.slowT.toFixed(1) + ' s';
  if (s.chain) html += '<br>Touche <b>' + s.chain + '</b> virus';
  if (d.ground) html += '<br><small>Ne touche pas les volants</small>';
  if (t.lvl < TMAX) { const n = tStats(t.type, t.lvl + 1); html += '<br><small style="color:#a5d6a7">Niv. suivant : dégâts ' + n.dmg.toFixed(1) + ', portée ' + n.range.toFixed(1) + '</small>'; }
  $('#tpStats').innerHTML = html;
  const up = $('#tpUp');
  if (t.lvl < TMAX) { const c = upCost(t); up.textContent = '⬆ ' + c + ' cr'; up.className = 'buy' + (G.cash >= c ? '' : ' off'); }
  else { up.textContent = 'MAX'; up.className = 'buy off'; }
  $('#tpSell').textContent = 'Vendre +' + Math.floor(t.invested * .7);
}
function placePopup() {
  const t = G.sel; if (!t) return;
  const p = $('#tpop'), [sx, sy] = toScreen(t.x + .5, t.y + .5), w = 190, h = p.offsetHeight || 150;
  let x = sx + L.T * .7, y = sy - h / 2;
  if (x + w > SW - (L.port ? 6 : 160)) x = sx - L.T * .7 - w;
  x = clamp(x, 6, SW - w - 6); y = clamp(y, 6, SH - h - (L.port ? 160 : 6));
  p.style.left = x + 'px'; p.style.top = y + 'px';
}
$('#tpClose').onclick = closePopup;
$('#tpUp').onclick = () => G.sel && upgradeTower(G.sel);
$('#tpSell').onclick = () => G.sel && sellTower(G.sel);

/* ---------------- fin de partie ---------------- */
function endGame(win) {
  G.over = true;
  closePopup();
  if (win) {
    const k = G.lives / G.d.lives, st = k >= 1 ? 3 : k >= .5 ? 2 : 1, key = curDiff + G.mi;
    G.score += G.lives * 100;
    save.stars[key] = Math.max(save.stars[key] || 0, st);
    save.best[key] = Math.max(save.best[key] || 0, G.score);
    if (G.mi + 2 > save.unlocked[curDiff]) save.unlocked[curDiff] = Math.min(MAPS.length, G.mi + 2);
    persist(); sfx('win'); G.stars = st;
  } else {
    const key = curDiff + G.mi; save.best[key] = Math.max(save.best[key] || 0, G.score); persist();
    sfx('lose'); vibe(300);
  }
  const g = G; setTimeout(() => { if (G === g && G.over) showResult(win); }, 900);
}
function showResult(win) {
  setState('result');
  const last = G.mi === MAPS.length - 1;
  $('#resTitle').textContent = win ? (last ? '🏆 Ordinateur sauvé !' : 'Zone nettoyée !') : 'L\'ordinateur est infecté…';
  $('#resTitle').style.color = win ? '#a5d6a7' : '#ff8a80';
  $('#resStars').textContent = win ? '★'.repeat(G.stars) + '☆'.repeat(3 - G.stars) : '';
  $('#resBody').innerHTML = G.m.name + ' · ' + G.d.name + '<br>Vagues : <b>' + (win ? G.total : Math.max(0, G.wave - 1)) + ' / ' + G.total + '</b><br>Virus détruits : <b>' + G.kills + '</b><br>Score : <b style="color:#e6ee5a">' + G.score + '</b><br>Record : <b>' + (save.best[curDiff + G.mi] || 0) + '</b>';
  const nb = $('#resNext');
  if (win && !last) { nb.classList.remove('hidden'); nb.textContent = '▶ Zone suivante'; nb.onclick = () => startMap(G.mi + 1); }
  else nb.classList.add('hidden');
}

/* ---------------- écrans ---------------- */
const screens = ['menu', 'diff', 'maps', 'help', 'options', 'pause', 'result'];
function show(id) {
  for (const s of screens) $('#' + s).classList.toggle('hidden', s !== id);
  if (id === 'diff') buildDiff();
  if (id === 'maps') buildMaps();
  if (id === 'options') buildOptions();
}
function setState(s) {
  state = s;
  $('#panel').classList.toggle('hidden', s !== 'play' && s !== 'pause');
  if (s === 'play') { for (const id of screens) $('#' + id).classList.add('hidden'); layout(); }
  else { if (s !== 'pause' && s !== 'result') G = null; $('#tpop').classList.add('hidden'); show(s); }
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { initAudio(); setState(b.dataset.go); }));
function buildDiff() {
  const box = $('#diffList'); box.innerHTML = '';
  for (const k in DIFFS) {
    const d = DIFFS[k], b = document.createElement('button');
    b.className = 'big alt diffbtn'; b.style.boxShadow = 'inset 0 0 0 2px ' + d.col;
    b.innerHTML = '<span style="color:' + d.col + '">' + d.name + '</span><small>' + d.desc + ' · zones ' + save.unlocked[k] + '/' + MAPS.length + '</small>';
    b.onclick = () => { curDiff = k; setState('maps'); };
    box.appendChild(b);
  }
}
const thumbs = {};
function buildMaps() {
  const d = DIFFS[curDiff];
  $('#mapsTitle').innerHTML = 'Zones de combat · <span style="color:' + d.col + '">' + d.name + '</span>';
  const g = $('#mapGrid'); g.innerHTML = '';
  MAPS.forEach((m, i) => {
    const locked = i >= save.unlocked[curDiff], st = save.stars[curDiff + i] || 0, best = save.best[curDiff + i] || 0;
    const b = document.createElement('button'); b.className = 'mapcard' + (locked ? ' locked' : ''); b.style.setProperty('--c', m.acc);
    if (!thumbs[i]) thumbs[i] = buildBG(i, 16);
    const c = document.createElement('canvas'); c.width = COLS * 16; c.height = ROWS * 16; c.getContext('2d').drawImage(thumbs[i], 0, 0);
    b.appendChild(c);
    const info = document.createElement('div');
    info.innerHTML = '<b>' + (locked ? '🔒 ' : '') + 'Zone ' + (i + 1) + ' · ' + m.name + '</b><small>' + m.waves + ' vagues' + (best ? ' · record ' + best : '') + '</small><span class="st">' + '★'.repeat(st) + '☆'.repeat(3 - st) + '</span>';
    b.appendChild(info);
    b.onclick = () => { if (locked) { toast('Termine la zone précédente pour débloquer celle-ci'); return; } initAudio(); startMap(i); };
    g.appendChild(b);
  });
}
function buildOptions() {
  $('#optAuto').textContent = 'Vague suivante automatique : ' + (save.autoWave ? 'OUI' : 'NON');
  $('#optSound').textContent = 'Son : ' + (save.sound ? 'OUI' : 'NON');
  $('#optVibe').textContent = 'Vibrations : ' + (save.vibe ? 'OUI' : 'NON');
}
$('#optAuto').onclick = () => { save.autoWave = !save.autoWave; persist(); buildOptions(); };
$('#optSound').onclick = () => { save.sound = !save.sound; persist(); buildOptions(); };
$('#optVibe').onclick = () => { save.vibe = !save.vibe; persist(); buildOptions(); };
$('#optReset').onclick = () => { if (confirm('Effacer toute la progression ?')) { const keep = { sound: save.sound, vibe: save.vibe, autoWave: save.autoWave }; save = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SAVE)), keep); persist(); buildOptions(); } };

function pauseGame() { if (state === 'play' && G && !G.over) setState('pause'); }
function resumeGame() { if (state === 'pause') setState('play'); }
$('#btnResume').onclick = resumeGame;
$('#btnRestart').onclick = () => startMap(G.mi);
$('#btnQuit').onclick = () => setState('maps');
$('#resRetry').onclick = () => startMap(G.mi);
$('#resMaps').onclick = () => setState('maps');
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

/* ---------------- boucle ---------------- */
let last = performance.now(), panelT = 0;
function frame(now) {
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state === 'play' && G && !G.over) {
    for (let i = 0; i < G.speed; i++) update(dt);
    panelT -= dt; if (panelT <= 0) { panelT = .1; updatePanel(); }
  } else if (state === 'play' && G) {
    // animation de fin
    for (const q of G.parts) { q.life -= dt; }
  }
  if (G && (state === 'play' || state === 'pause' || state === 'result')) render();
  else { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, SW, SH); }
  requestAnimationFrame(frame);
}
layout();
setState('menu');
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
