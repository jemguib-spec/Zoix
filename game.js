'use strict';
/* ===================== VIRUS DÉFENSE — tower defense pour mobile ===================== */

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const $ = s => document.querySelector(s);
const COLS = 26, ROWS = 15, TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ---------------- cartes ----------------
   Chaque carte = des couloirs (chemins fixes des virus) creusés dans le circuit.
   Les tourelles se posent sur le circuit (zones colorées), pas dans les couloirs. */
const MAPS = [
  { name: 'Carte mère', base: '#1f7a32', acc: '#e6ee5a', waves: 20,
    paths: [[[0, 2], [22, 2], [22, 6], [3, 6], [3, 10], [22, 10], [22, 13], [25, 13]]] },
  { name: 'Bus d\'adresse', base: '#b3621a', acc: '#ffd166', waves: 25,
    paths: [[[3, 0], [3, 4], [10, 4], [10, 1], [17, 1], [17, 7], [6, 7], [6, 12], [14, 12], [14, 9], [22, 9], [22, 13], [25, 13]]] },
  { name: 'Mémoire vive', base: '#13807c', acc: '#7df9ff', waves: 30,
    paths: [[[0, 1], [24, 1], [24, 13], [2, 13], [2, 4], [21, 4], [21, 10], [6, 10], [6, 7], [16, 7]]] },
  { name: 'Alimentation', base: '#9c1f1f', acc: '#ff8a80', waves: 30,
    paths: [[[0, 3], [8, 3], [8, 8], [16, 8], [16, 2], [23, 2], [23, 12], [25, 12]], [[0, 12], [8, 12], [8, 8]]] },
  { name: 'Carte graphique', base: '#62309a', acc: '#e0aaff', waves: 35,
    paths: [[[2, 0], [2, 12], [6, 12], [6, 2], [10, 2], [10, 12], [14, 12], [14, 2], [18, 2], [18, 12], [22, 12], [22, 7], [25, 7]]] },
  { name: 'Processeur central', base: '#1e5296', acc: '#90e0ef', waves: 40,
    paths: [[[4, 0], [4, 3], [22, 3], [22, 7], [13, 7]], [[21, 14], [21, 11], [3, 11], [3, 7], [13, 7]]] }
];
// fabrique la grille à partir des chemins : '#' circuit, '.' couloir, 'S' entrée, 'E' sortie
for (const m of MAPS) {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill('#'));
  for (const p of m.paths) for (let i = 0; i < p.length - 1; i++) {
    let [x, y] = p[i]; const [x2, y2] = p[i + 1];
    while (true) { g[y][x] = '.'; if (x === x2 && y === y2) break; x += Math.sign(x2 - x); y += Math.sign(y2 - y); }
  }
  for (const p of m.paths) { const [sx, sy] = p[0]; g[sy][sx] = 'S'; }
  const e = m.paths[0][m.paths[0].length - 1]; g[e[1]][e[0]] = 'E';
  m.g = g.map(r => r.join(''));
}

const DIFFS = {
  easy: { name: 'Facile', hp: .7, lives: 30, cash: 35, col: '#4ade80', desc: 'Virus fragiles · 30 vies' },
  normal: { name: 'Normal', hp: 1, lives: 20, cash: 25, col: '#60a5fa', desc: 'L\'expérience équilibrée · 20 vies' },
  hard: { name: 'Difficile', hp: 1.4, lives: 15, cash: 22, col: '#f97316', desc: 'Virus coriaces · 15 vies' },
  nightmare: { name: 'Cauchemar', hp: 1.75, lives: 10, cash: 20, col: '#ef4444', desc: 'Pour les experts · 10 vies' }
};

const TOWERS = {
  pulse: { name: 'Pulseur', cost: 5, range: 2.2, rate: 1.1, dmg: 6, col: '#b388ff', proj: 'bullet', spd: 9, desc: 'Pas cher : idéal pour couvrir les couloirs.' },
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
  if (!AC || !save.sound || (G && G.demo)) return;
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
function vibe(ms) { if (G && G.demo) return; if (save.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }

/* ---------------- mise en page + caméra (zoom / déplacement) ---------------- */
let DPR = 1, SW = 0, SH = 0;
const L = { T: 30, port: false, zoom: 1, vx: COLS / 2, vy: ROWS / 2, ax: 0, ay: 0, aw: 100, ah: 100, s: 30 };
function hasPanel() { return state === 'play' || state === 'pause' || state === 'result'; }
function layout() {
  for (const k in baseCache) delete baseCache[k];
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  SW = innerWidth; SH = innerHeight;
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  cv.style.width = SW + 'px'; cv.style.height = SH + 'px';
  const cs = getComputedStyle($('#safe'));
  const sT = parseFloat(cs.paddingTop) || 0, sR = parseFloat(cs.paddingRight) || 0, sB = parseFloat(cs.paddingBottom) || 0, sL = parseFloat(cs.paddingLeft) || 0;
  L.port = SH > SW * 1.05;
  const panel = $('#panel'), pan = hasPanel();
  panel.classList.toggle('land', !L.port); panel.classList.toggle('port', L.port);
  if (!pan) { L.ax = 0; L.ay = 0; L.aw = SW; L.ah = SH; }
  else if (!L.port) { L.ax = sL + 4; L.ay = sT + 4; L.aw = SW - 150 - sR - sL - 8; L.ah = SH - sT - sB - 8; }
  else { L.ax = sL + 4; L.ay = sT + 4; L.aw = SW - sL - sR - 8; L.ah = SH - sT - sB - 150 - 8; }
  // T = taille d'une case quand toute la carte est visible
  L.T = L.port ? Math.min(L.aw / ROWS, L.ah / COLS) : Math.min(L.aw / COLS, L.ah / ROWS);
  if (!pan) L.T = L.port ? Math.max(L.aw / ROWS, L.ah / COLS) : Math.max(L.aw / COLS, L.ah / ROWS); // menu : la carte remplit l'écran
  setZoom(L.zoom);
  if (G && G.sel) placePopup();
}
addEventListener('resize', layout);
function setZoom(z, fx, fy) {
  const old = L.s;
  L.zoom = clamp(z, 1, 3.2); L.s = L.T * L.zoom;
  if (fx !== undefined && old) { // garder le point (fx, fy) de l'écran sous le doigt
    const [mx, my] = toMapWith(fx, fy, old);
    const [mx2, my2] = toMapWith(fx, fy, L.s);
    L.vx += mx - mx2; L.vy += my - my2;
  }
  clampView();
}
function clampView() {
  const hx = (L.port ? L.ah : L.aw) / (2 * L.s), hy = (L.port ? L.aw : L.ah) / (2 * L.s);
  L.vx = hx * 2 >= COLS ? COLS / 2 : clamp(L.vx, hx, COLS - hx);
  L.vy = hy * 2 >= ROWS ? ROWS / 2 : clamp(L.vy, hy, ROWS - hy);
}
function toMapWith(sx, sy, s) {
  const cx = L.ax + L.aw / 2, cy = L.ay + L.ah / 2;
  return L.port ? [L.vx + (sy - cy) / s, L.vy - (sx - cx) / s] : [L.vx + (sx - cx) / s, L.vy + (sy - cy) / s];
}
function toMap(sx, sy) { return toMapWith(sx, sy, L.s); }
function toScreen(x, y) {
  const cx = L.ax + L.aw / 2, cy = L.ay + L.ah / 2, s = L.s;
  return L.port ? [cx - (y - L.vy) * s, cy + (x - L.vx) * s] : [cx + (x - L.vx) * s, cy + (y - L.vy) * s];
}
function mapTransform(shx, shy) {
  const cx = L.ax + L.aw / 2 + (shx || 0), cy = L.ay + L.ah / 2 + (shy || 0), s = L.s, D = DPR;
  if (L.port) ctx.setTransform(0, s * D, -s * D, 0, (cx + L.vy * s) * D, (cy - L.vx * s) * D);
  else ctx.setTransform(s * D, 0, 0, s * D, (cx - L.vx * s) * D, (cy - L.vy * s) * D);
}

/* ---------------- fond de circuit imprimé ---------------- */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}
function addNoise(g, W, H, R, amt) {
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
}
function buildBG(mi, P) {
  const m = MAPS[mi], c = document.createElement('canvas'), W = COLS * P, H = ROWS * P;
  c.width = W; c.height = H;
  const g = c.getContext('2d'), R = mulberry(mi * 977 + 13), rec = P >= 48;
  if (rec) { m.traces = []; m.leds = []; }
  const isOpen = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && m.g[y][x] !== '#';
  const rectFree = (x, y, w, h) => {
    for (let ty = Math.floor(y / P); ty <= Math.floor((y + h) / P); ty++) for (let tx = Math.floor(x / P); tx <= Math.floor((x + w) / P); tx++) if (isOpen(tx, ty)) return false;
    return x >= 0 && y >= 0 && x + w <= W && y + h <= H;
  };
  const used = [], m2 = P * .16;
  const overlaps = (x, y, w, h) => used.some(u => x < u[0] + u[2] + m2 && x + w + m2 > u[0] && y < u[1] + u[3] + m2 && y + h + m2 > u[1]);
  const place = (w, h, tries) => { for (let i = 0; i < (tries || 60); i++) { const x = R() * (W - w), y = R() * (H - h); if (rectFree(x - P * .1, y - P * .1, w + P * .2, h + P * .2) && !overlaps(x - P * .2, y - P * .25, w + P * .4, h + P * .5)) { used.push([x - P * .2, y - P * .25, w + P * .4, h + P * .5]); return [x, y]; } } return null; };
  const silk = 'rgba(238,238,225,.78)';
  const label = (t, x, y, s) => { g.fillStyle = silk; g.font = 'bold ' + (P * (s || .13)) + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(t, x, y); };
  const via = (x, y, r) => {
    const gr = g.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
    gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.5, '#d4a93c'); gr.addColorStop(1, '#7a5a17');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = '#0d0d0d'; g.beginPath(); g.arc(x, y, r * .42, 0, TAU); g.fill();
  };
  const metal = (x, y, w, h, vertical) => {
    const gr = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#7d7d7d'); gr.addColorStop(.45, '#f4f4f4'); gr.addColorStop(1, '#6a6a6a');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  };
  const shadowOn = (b, o) => { g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = P * b; g.shadowOffsetX = P * o * .7; g.shadowOffsetY = P * o; };
  const shadowOff = () => { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0; };

  // 1. vernis épargne (solder mask)
  let gr = g.createRadialGradient(W * .4, H * .3, P, W * .5, H * .5, W * .8);
  gr.addColorStop(0, shade(m.base, .12)); gr.addColorStop(1, shade(m.base, -.38));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);

  // 2. pistes de cuivre sous le vernis
  g.lineCap = 'round'; g.lineJoin = 'round';
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const offPts = (pts, o) => pts.map((p, j) => {
    const n1 = j > 0 ? nrm(pts[j - 1], p) : null, n2 = j < pts.length - 1 ? nrm(p, pts[j + 1]) : null;
    const nx = n1 && n2 ? n1[0] + n2[0] : (n1 || n2)[0], ny = n1 && n2 ? n1[1] + n2[1] : (n1 || n2)[1];
    return [p[0] + nx * o, p[1] + ny * o];
  });
  for (let i = 0; i < 24; i++) {
    const n = 1 + Math.floor(R() * 7), sp = P * .13, w = P * (.04 + R() * .025);
    let x = R() * W, y = R() * H, dir = Math.floor(R() * 4) * Math.PI / 2;
    const pts = [[x, y]];
    for (let s = 0; s < 4; s++) { const len = P * (1 + R() * 4); x += Math.round(Math.cos(dir)) * len; y += Math.round(Math.sin(dir)) * len; pts.push([x, y]); dir += (R() < .5 ? -1 : 1) * Math.PI / 2; }
    for (let k = 0; k < n; k++) {
      const op = offPts(pts, (k - (n - 1) / 2) * sp);
      if (rec) m.traces.push(op.map(([px, py]) => [px / P, py / P]));
      const path = () => { g.beginPath(); op.forEach(([px, py], j) => j ? g.lineTo(px, py) : g.moveTo(px, py)); };
      path(); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = w + P * .03; g.stroke();
      path(); g.strokeStyle = shade(m.base, .24); g.lineWidth = w; g.stroke();
      path(); g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = w * .3; g.stroke();
      via(op[0][0], op[0][1], P * .065); via(op[op.length - 1][0], op[op.length - 1][1], P * .065);
    }
  }
  // vias isolés
  for (let i = 0; i < 40; i++) via(R() * W, R() * H, P * .05);

  // 3. composants (uniquement sur le circuit, pas dans les couloirs)
  const names = ['VX-7124', 'NM2048', 'SR-4410', 'KD-88', 'Q-PROC', 'MX29', 'LT-560', 'ZR-31', 'BIOS-2', 'RAM-8G'];
  for (let i = 0; i < 9; i++) { // puces
    const w = P * (1 + R() * 2.2), h = P * (.7 + R() * 1.1), pos = place(w, h); if (!pos) continue;
    const [x, y] = pos, quad = R() < .35, pitch = P * .15, pw = P * .065, pl = P * .13;
    for (let px = x + P * .12; px < x + w - P * .1; px += pitch) { metal(px, y - pl, pw, pl + 2, true); metal(px, y + h - 2, pw, pl + 2, true); }
    if (quad) for (let py = y + P * .12; py < y + h - P * .1; py += pitch) { metal(x - pl, py, pl + 2, pw, false); metal(x + w - 2, py, pl + 2, pw, false); }
    shadowOn(.2, .08);
    gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#36363b'); gr.addColorStop(.12, '#1e1e22'); gr.addColorStop(1, '#0c0c0e');
    g.fillStyle = gr; rr(g, x, y, w, h, P * .03); g.fill(); shadowOff();
    g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 1.5; rr(g, x + 2, y + 2, w - 4, h - 4, P * .03); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.arc(x + P * .14, y + h - P * .14, P * .055, 0, TAU); g.fill();
    g.fillStyle = 'rgba(205,205,205,.55)'; g.font = 'bold ' + (P * .15) + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(names[(i + mi * 3) % names.length], x + P * .12, y + P * .27);
    g.font = (P * .1) + 'px monospace'; g.fillText((1000 + Math.floor(R() * 8999)) + '-' + (10 + Math.floor(R() * 89)), x + P * .12, y + P * .42);
    label('U' + (i + 1), x, y - P * .2);
  }
  for (let i = 0; i < 6; i++) { // condensateurs chimiques
    const r = P * (.24 + R() * .18), pos = place(r * 2, r * 2); if (!pos) continue;
    const cx = pos[0] + r, cy = pos[1] + r, sleeve = ['#1b2a6b', '#151515', '#4a1a5c', '#0f4a3a'][Math.floor(R() * 4)];
    g.strokeStyle = silk; g.lineWidth = P * .02; g.beginPath(); g.arc(cx, cy, r * 1.12, 0, TAU); g.stroke();
    shadowOn(.25, .12);
    gr = g.createRadialGradient(cx - r * .3, cy - r * .3, r * .2, cx, cy, r);
    gr.addColorStop(0, shade(sleeve, .45)); gr.addColorStop(1, shade(sleeve, -.4));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); shadowOff();
    g.strokeStyle = 'rgba(230,230,230,.55)'; g.lineWidth = r * .18; g.beginPath(); g.arc(cx, cy, r * .9, Math.PI * .8, Math.PI * 1.25); g.stroke();
    gr = g.createRadialGradient(cx - r * .25, cy - r * .3, r * .05, cx, cy, r * .8);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(.5, '#c4c4c4'); gr.addColorStop(1, '#6e6e6e');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * .78, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(60,60,60,.7)'; g.lineWidth = r * .06; g.beginPath();
    g.moveTo(cx - r * .5, cy); g.lineTo(cx + r * .5, cy); g.moveTo(cx, cy - r * .5); g.lineTo(cx, cy + r * .5); g.stroke();
    label('+', cx - r * 1.35, cy - r * .7, .16); label('C' + (10 + i), cx + r * .9, cy + r * 1.3);
  }
  for (let i = 0; i < 2; i++) { // quartz
    const w = P * .8, h = P * .32, pos = place(w, h); if (!pos) continue;
    const [x, y] = pos; shadowOn(.15, .06);
    gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f6f6f6'); gr.addColorStop(.5, '#b5b5b5'); gr.addColorStop(1, '#7c7c7c');
    g.fillStyle = gr; rr(g, x, y, w, h, h / 2); g.fill(); shadowOff();
    g.fillStyle = 'rgba(40,40,40,.6)'; g.font = 'bold ' + (P * .12) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('16.000', x + w / 2, y + h / 2);
    label('Y' + (i + 1), x, y - P * .08);
  }
  for (let i = 0; i < 55; i++) { // CMS : résistances et condensateurs
    const vert = R() < .4, w = P * (vert ? .15 : .32), h = P * (vert ? .32 : .15), pos = place(w, h, 12); if (!pos) continue;
    const [x, y] = pos, res = R() < .6, e = P * .07;
    shadowOn(.06, .03);
    g.fillStyle = res ? '#151515' : '#b88d5a'; g.fillRect(x, y, w, h); shadowOff();
    if (vert) { metal(x, y, w, e, false); metal(x, y + h - e, w, e, false); } else { metal(x, y, e, h, true); metal(x + w - e, y, e, h, true); }
    if (res && !vert) { g.fillStyle = 'rgba(255,255,255,.75)'; g.font = (P * .08) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(['103', '472', '220', '1K0', '4R7'][i % 5], x + w / 2, y + h / 2 + 1); }
    if (R() < .35) label((res ? 'R' : 'C') + (i + 20), x + w + P * .04, y + h);
  }
  for (let i = 0; i < 2; i++) { // trous de fixation
    const r = P * .26, pos = place(r * 2, r * 2); if (!pos) continue;
    const cx = pos[0] + r, cy = pos[1] + r;
    gr = g.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r);
    gr.addColorStop(0, '#fff1a8'); gr.addColorStop(.6, '#c79a2f'); gr.addColorStop(1, '#6d5114');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * .6); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#1d1d1d');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * .58, 0, TAU); g.fill();
  }
  { const pos = place(P * 2.6, P * .3, 80); if (pos) label('VD-' + (mi + 1) + '  REV 2.' + mi, pos[0], pos[1] + P * .25, .2); }

  // 4. couloirs creusés (zone libre)
  g.save(); g.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isOpen(x, y)) g.rect(x * P, y * P, P, P);
  g.clip();
  gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#1c1814'); gr.addColorStop(1, '#0c0a08');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.lineWidth = 1; // tissage de fibre de verre
  for (let k = 0; k < W + H; k += P * .12) {
    g.strokeStyle = 'rgba(255,240,200,.025)'; g.beginPath(); g.moveTo(k, 0); g.lineTo(k - H, H); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(k - W, 0); g.lineTo(k, H); g.stroke();
  }
  for (let i = 0; i < 14; i++) { // traces de brûlure
    const x = R() * W, y = R() * H, r = P * (.3 + R() * .8);
    gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.035)';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isOpen(x, y)) g.strokeRect(x * P + .5, y * P + .5, P - 1, P - 1);
  g.restore();
  // ombres internes (relief)
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isOpen(x, y)) {
    const X = x * P, Y = y * P, s = P * .3;
    if (!isOpen(x, y - 1) && y > 0) { gr = g.createLinearGradient(0, Y, 0, Y + s); gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X, Y, P, s); }
    if (!isOpen(x - 1, y) && x > 0) { gr = g.createLinearGradient(X, 0, X + s, 0); gr.addColorStop(0, 'rgba(0,0,0,.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X, Y, s, P); }
    if (!isOpen(x, y + 1) && y < ROWS - 1) { gr = g.createLinearGradient(0, Y + P, 0, Y + P - s * .4); gr.addColorStop(0, 'rgba(255,230,180,.09)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = gr; g.fillRect(X, Y + P - s * .4, P, s * .4); }
    if (!isOpen(x + 1, y) && x < COLS - 1) { gr = g.createLinearGradient(X + P, 0, X + P - s * .4, 0); gr.addColorStop(0, 'rgba(255,230,180,.07)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = gr; g.fillRect(X + P - s * .4, Y, s * .4, P); }
  }
  // bord cuivré + lueur
  const edges = () => {
    g.beginPath();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isOpen(x, y)) {
      const X = x * P, Y = y * P;
      if (!isOpen(x, y - 1) && y > 0) { g.moveTo(X, Y); g.lineTo(X + P, Y); }
      if (!isOpen(x, y + 1) && y < ROWS - 1) { g.moveTo(X, Y + P); g.lineTo(X + P, Y + P); }
      if (!isOpen(x - 1, y) && x > 0) { g.moveTo(X, Y); g.lineTo(X, Y + P); }
      if (!isOpen(x + 1, y) && x < COLS - 1) { g.moveTo(X + P, Y); g.lineTo(X + P, Y + P); }
    }
  };
  edges(); g.globalAlpha = .55; g.strokeStyle = m.acc; g.lineWidth = P * .05; g.shadowColor = m.acc; g.shadowBlur = P * .35; g.stroke(); shadowOff(); g.globalAlpha = 1;
  edges(); g.strokeStyle = '#d8b25a'; g.lineWidth = P * .035; g.stroke();
  edges(); g.strokeStyle = 'rgba(255,248,210,.55)'; g.lineWidth = P * .01; g.stroke();

  // 5. entrées / sortie
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = m.g[y][x]; if (ch !== 'S' && ch !== 'E') continue;
    const cx = (x + .5) * P, cy = (y + .5) * P;
    if (ch === 'S') {
      const dx = x === 0 ? 1 : x === COLS - 1 ? -1 : 0, dy = y === 0 ? 1 : y === ROWS - 1 ? -1 : 0;
      g.save(); g.translate(cx, cy); g.rotate(Math.atan2(dy, dx));
      g.shadowColor = '#ff1744'; g.shadowBlur = P * .4;
      gr = g.createLinearGradient(-P * .2, 0, P * .32, 0); gr.addColorStop(0, '#8b0000'); gr.addColorStop(1, '#ff5252');
      g.fillStyle = gr; g.beginPath(); g.moveTo(P * .34, 0); g.lineTo(-P * .2, -P * .3); g.lineTo(-P * .08, 0); g.lineTo(-P * .2, P * .3); g.closePath(); g.fill();
      g.restore(); shadowOff();
    } else {
      const s = P * .84, x0 = cx - s / 2, y0 = cy - s / 2;
      for (let k = 0; k < 6; k++) { const o = x0 + P * .1 + k * P * .12; metal(o, y0 - P * .06, P * .05, P * .08, true); metal(o, y0 + s - P * .02, P * .05, P * .08, true); metal(x0 - P * .06, o - x0 + y0, P * .08, P * .05, false); metal(x0 + s - P * .02, o - x0 + y0, P * .08, P * .05, false); }
      shadowOn(.25, .08); g.fillStyle = '#121418'; rr(g, x0, y0, s, s, P * .05); g.fill(); shadowOff();
      gr = g.createLinearGradient(x0, y0, x0 + s, y0 + s); gr.addColorStop(0, '#f2f4f6'); gr.addColorStop(.5, '#a9b0b6'); gr.addColorStop(1, '#6b737a');
      g.fillStyle = gr; rr(g, x0 + s * .16, y0 + s * .16, s * .68, s * .68, P * .04); g.fill();
      g.fillStyle = 'rgba(30,40,60,.75)'; g.font = 'bold ' + (P * .17) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CPU', cx, cy);
      g.shadowColor = '#40c4ff'; g.shadowBlur = P * .3; g.strokeStyle = 'rgba(64,196,255,.8)'; g.lineWidth = P * .03; rr(g, x0, y0, s, s, P * .05); g.stroke(); shadowOff();
    }
  }
  if (rec) for (let i = 0; i < 14; i++) { const pos = place(P * .16, P * .1, 30); if (pos) { m.leds.push([(pos[0] + P * .08) / P, (pos[1] + P * .05) / P, ['#76ff03', '#ff1744', '#ffab00', '#00e5ff'][i % 4], R() * 6]); g.fillStyle = '#222'; g.fillRect(pos[0] - 2, pos[1] - 2, P * .16 + 4, P * .1 + 4); label('D' + (i + 1), pos[0], pos[1] - P * .06, .1); } }
  if (P >= 32) addNoise(g, W, H, R, 10);
  return c;
}

/* ---------------- état ---------------- */
let G = null, state = 'menu', curDiff = 'normal', uid = 1;

function newGame(mi, demo) {
  const m = MAPS[mi], d = DIFFS[demo ? 'normal' : curDiff];
  const starts = [], exits = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const ch = m.g[y][x]; if (ch === 'S') starts.push([x, y]); if (ch === 'E') exits.push([x, y]); }
  const g = {
    mi, m, d, demo: !!demo, total: demo ? 9999 : m.waves, wave: 0, lives: d.lives, cash: demo ? 1e9 : d.cash, score: 0, time: 0,
    starts, exits, towers: [], towerAt: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    enemies: [], projs: [], fx: [], parts: [], texts: [], queue: [], spawnT: 0, nextStart: 0,
    tool: null, sel: null, hover: null, speed: 1, countdown: -1, over: false, kills: 0, shake: 0, banner: null, aiT: 0
  };
  const keep = G; G = g;
  g.dist = computeDist();
  g.bg = buildBG(mi, 64);
  for (const tr of m.traces) { tr.pts = tr; tr.lens = []; tr.len = 0; for (let i = 0; i < tr.length - 1; i++) { const l = Math.hypot(tr[i + 1][0] - tr[i][0], tr[i + 1][1] - tr[i][1]) || .01; tr.lens.push(l); tr.len += l; } }
  g.pulses = [];
  for (let i = 0; i < 34; i++) g.pulses.push({ tr: Math.floor(Math.random() * m.traces.length), d: Math.random() * 6, spd: rand(1.5, 4), col: Math.random() < .7 ? m.acc : '#ffffff' });
  g.flow = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (m.g[y][x] === '#' || m.g[y][x] === 'E') continue;
    let best = null, bd = g.dist[y][x];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && g.dist[ny][nx] < bd) { bd = g.dist[ny][nx]; best = [dx, dy]; } }
    if (best) g.flow.push({ x, y, a: Math.atan2(best[1], best[0]), d: g.dist[y][x] });
  }
  G = keep;
  return g;
}
function startMap(mi) {
  G = newGame(mi, false);
  L.zoom = 1; L.vx = COLS / 2; L.vy = ROWS / 2;
  G.tool = 'pulse';
  buildTowerBar(); closePopup();
  setState('play');
  updatePanel(true);
  toast('Pose des tourelles sur le circuit, le long des couloirs !' + ('ontouchstart' in window ? ' Pince pour zoomer.' : ''));
}
// partie de démonstration qui tourne derrière les menus
let DEMO = null;
function demoAI(dt) {
  G.aiT -= dt;
  if (G.wave === 0 || (!G.queue.length && !G.enemies.length)) startWave();
  if (G.aiT > 0) return;
  G.aiT = G.towers.length < 8 ? .4 : 2.5;
  if (G.towers.length > 40) { const t = G.towers[Math.floor(Math.random() * G.towers.length)]; if (t.lvl < TMAX) upgradeTower(t); return; }
  let best = null, bv = 0;
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(Math.random() * COLS), y = Math.floor(Math.random() * ROWS);
    if (canPlace(x, y) !== null) continue;
    let v = 0; for (const f of G.flow) if (Math.hypot(f.x - x, f.y - y) < 2.3) v++;
    if (v > bv) { bv = v; best = [x, y]; }
  }
  const types = G.towers.length < 6 ? ['pulse', 'gatling'] : TORDER;
  if (best) tryPlace(types[Math.floor(Math.random() * types.length)], best[0], best[1]);
}

/* ---------------- chemin (champ de distance) ---------------- */
function walkable(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS && G.m.g[y][x] !== '#'; }
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
  if (G.m.g[ty][tx] !== '#') return 'Pose les tourelles sur le circuit, pas dans le couloir !';
  if (G.towerAt[ty][tx]) return 'Case occupée';
  return null;
}
function tryPlace(type, tx, ty) {
  const cost = TOWERS[type].cost;
  const why = canPlace(tx, ty);
  if (why === 'out') return;
  if (why) { toast(why); sfx('err'); vibe(30); flashTile(tx, ty); return; }
  if (G.cash < cost) { toast('Pas assez de crédits'); sfx('err'); vibe(30); return; }
  G.cash -= cost;
  const t = { id: uid++, type, x: tx, y: ty, lvl: 1, cd: 0, born: G.time, upT: -9, recoil: 0, ang: -Math.PI / 2 + rand(-1, 1), invested: cost, kills: 0, st: tStats(type, 1) };
  G.towers.push(t); G.towerAt[ty][tx] = t;
  for (let i = 0; i < 8; i++) G.parts.push(part(tx + .5, ty + .5, TOWERS[type].col, 2));
  sfx('build'); vibe(10); updatePanel();
}
function upgradeTower(t) {
  if (t.lvl >= TMAX) return;
  const c = upCost(t);
  if (G.cash < c) { toast('Pas assez de crédits'); sfx('err'); return; }
  G.cash -= c; t.invested += c; t.lvl++; t.st = tStats(t.type, t.lvl); t.upT = G.time;
  for (let i = 0; i < 14; i++) G.parts.push(part(t.x + .5, t.y + .5, '#fff59d', 3));
  sfx('up'); vibe(15); updatePanel(); fillPopup();
}
function sellTower(t) {
  const r = Math.floor(t.invested * .7);
  G.cash += r; G.towers.splice(G.towers.indexOf(t), 1); G.towerAt[t.y][t.x] = null;
  smoke(t.x + .5, t.y + .5, 5, .25);
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
  G.banner = { t: (wd.type === 'boss' ? '⚠ MÉGA-VIRUS ⚠' : 'VAGUE ' + G.wave), sub: wd.n + ' × ' + et.name, life: 2.2, boss: wd.type === 'boss' };
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
function part(x, y, col, spd) { const a = Math.random() * TAU, s = rand(.3, 1) * spd; return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.25, .55), max: .55, col, size: rand(.03, .06) }; }
function smoke(x, y, n, sz) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = rand(.1, .5); G.parts.push({ smoke: true, x: x + rand(-.1, .1), y: y + rand(-.1, .1), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.6, 1.2), max: 1.2, size: (sz || .15) * rand(.7, 1.3) }); } }
function rgbaA(hex) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',A)'; }
function floatText(x, y, t, col) { G.texts.push({ x, y, t, col, life: 1 }); }
let toastT = 0;
function toast(msg) { if (G && G.demo) return; const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }

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
    G.fx.push({ kind: 'splat', x: e.x, y: e.y, r: e.r * 1.7, life: 10, max: 10, col: rgbaA(e.col), seed: Math.random() * .97 + .013 });
    smoke(e.x, e.y, e.type === 'boss' ? 14 : 3, e.r * .7);
    sfx(e.type === 'boss' ? 'boom' : 'pop'); if (e.type === 'boss') { vibe(200); G.shake = 14; }
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
  for (let i = 0; i < 4; i++) G.parts.push(part(p.x, p.y, p.col, 2.5));
  if (p.kind === 'shell') { smoke(p.x, p.y, 4, .2); G.shake = Math.max(G.shake, 1.5); }
}

/* ---------------- mise à jour ---------------- */
function update(dt) {
  G.time += dt;
  if (G.demo) demoAI(dt);
  G.shake = Math.max(0, G.shake - dt * 30);
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
  for (const p of G.pulses) { p.d += p.spd * dt; const tr = G.m.traces[p.tr]; if (p.d > tr.len) { p.tr = Math.floor(Math.random() * G.m.traces.length); p.d = 0; } }
  // apparitions
  if (G.queue.length) {
    G.spawnT += dt;
    while (G.queue.length && G.queue[0].t <= G.spawnT) { const q = G.queue.shift(); spawnEnemy(q.type, q.wave); }
  }
  // virus
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.anim += dt; e.age = (e.age || 0) + dt; e.hit = Math.max(0, (e.hit || 0) - dt);
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
    t.cd -= dt; t.flash = Math.max(0, (t.flash || 0) - dt);
    const e = findTarget(t);
    if (e) {
      const ta = Math.atan2(e.y - (t.y + .5), e.x - (t.x + .5));
      t.ang += Math.atan2(Math.sin(ta - t.ang), Math.cos(ta - t.ang)) * Math.min(1, dt * 16);
      if (t.cd <= 0) { fire(t, e); t.cd = 1 / t.st.rate; t.flash = .07; }
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
  for (let i = G.parts.length - 1; i >= 0; i--) { const q = G.parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.smoke) { q.vx *= .96; q.vy *= .96; } else { q.vx *= .9; q.vy *= .9; } if (q.life <= 0) G.parts.splice(i, 1); }
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
  e.dead = true; G.shake = Math.max(G.shake, e.type === 'boss' ? 10 : 4);
  if (G.demo) return;
  G.lives = Math.max(0, G.lives - e.lives);
  G.fx.push({ kind: 'leak', life: .5, max: .5 });
  sfx('leak'); vibe(80); updatePanel();
  if (G.lives <= 0 && !G.over) endGame(false);
}

/* ---------------- dessin ---------------- */
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
// sphère éclairée (lx, ly = direction de la lumière dans le repère local)
function ball(c, x, y, r, col, lx, ly, hi) {
  const g = c.createRadialGradient(x + lx * r * .45, y + ly * r * .45, r * .05, x, y, r);
  g.addColorStop(0, hi || shade(col, .65)); g.addColorStop(.45, col); g.addColorStop(1, shade(col, -.62));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
// cylindre (canon) orienté selon x
function cyl(c, x, y, w, h, col) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(col, -.55)); g.addColorStop(.28, shade(col, .5)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, -.72));
  c.fillStyle = g; c.fillRect(x, y, w, h);
}
function softShadow(c, x, y, rx, ry, a) {
  c.save(); c.translate(x, y); c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(.6, 'rgba(0,0,0,' + a * .6 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
}
const lightFor = a => { const ca = Math.cos(a), sa = Math.sin(a); return [-.7 * ca - .7 * sa, .7 * sa - .7 * ca]; };

const baseCache = {};
function towerBase(type, lvl) {
  const px = Math.max(16, Math.round(L.s * DPR / 4) * 4), key = type + lvl + ':' + px;
  let c = baseCache[key];
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(px * 1.2); const g = c.getContext('2d'); g.setTransform(px, 0, 0, px, px * .55, px * .55); drawTowerBase(g, type, lvl); baseCache[key] = c; }
  return c;
}
function drawTower(c, type, lvl, ang, time, flash, cached) {
  if (cached) c.drawImage(towerBase(type, lvl), -.55, -.55, 1.2, 1.2); else drawTowerBase(c, type, lvl);
  drawTurret(c, type, lvl, ang, time, flash);
}
function drawTowerBase(c, type, lvl) {
  const d = TOWERS[type];
  // ombre portée du socle
  c.fillStyle = 'rgba(0,0,0,.55)'; rr(c, -.4, -.37, .93, .93, .16); c.fill();
  // socle en acier biseauté
  let g = c.createLinearGradient(-.46, -.46, .46, .46);
  g.addColorStop(0, '#f6f8f9'); g.addColorStop(.5, '#a9b3b9'); g.addColorStop(1, '#58646c');
  c.fillStyle = g; rr(c, -.46, -.46, .92, .92, .15); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = .022; c.stroke();
  g = c.createLinearGradient(-.38, -.38, .38, .38); g.addColorStop(0, '#c9d1d6'); g.addColorStop(1, '#7f8b93');
  c.fillStyle = g; rr(c, -.39, -.39, .78, .78, .11); c.fill();
  // stries brossées
  c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = .008; c.beginPath();
  for (let k = -.36; k < .37; k += .05) { c.moveTo(-.37, k); c.lineTo(.37, k); } c.stroke();
  // vis
  for (const [sx, sy] of [[-.32, -.32], [.32, -.32], [-.32, .32], [.32, .32]]) {
    ball(c, sx, sy, .045, '#9aa3a8', -.7, -.7, '#ffffff');
    c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = .013; c.beginPath(); c.moveTo(sx - .028, sy + .028); c.lineTo(sx + .028, sy - .028); c.stroke();
  }
  // tourelle : alvéole + bague de couleur
  c.fillStyle = '#161b1f'; c.beginPath(); c.arc(0, 0, .3, 0, TAU); c.fill();
  g = c.createLinearGradient(0, -.3, 0, .3); g.addColorStop(0, shade(d.col, .45)); g.addColorStop(1, shade(d.col, -.55));
  c.strokeStyle = g; c.lineWidth = .045; c.stroke();
  // LED de niveau
  for (let i = 0; i < TMAX - 1; i++) {
    const on = i < lvl - 1, x = -.12 + i * .12, y = .405;
    if (on) { c.fillStyle = 'rgba(120,255,60,.35)'; c.beginPath(); c.arc(x, y, .065, 0, TAU); c.fill(); }
    ball(c, x, y, .03, on ? '#76ff03' : '#203020', -.7, -.7, on ? '#f4ffe0' : '#3a4a3a');
  }
}
function drawTurret(c, type, lvl, ang, time, flash) {
  const d = TOWERS[type];
  let g;
  const a = type === 'tesla' ? 0 : ang, [lx, ly] = lightFor(a);
  softShadow(c, .06, .08, .3, .3, .55);
  c.save(); c.rotate(a);
  if (flash > 0 && type !== 'tesla') c.translate(-flash / .07 * .07, 0);
  let muzzle = .46;
  switch (type) {
    case 'pulse':
      cyl(c, 0, -.065, .4, .13, '#454b52'); cyl(c, .34, -.085, .08, .17, '#2a2e33');
      ball(c, 0, 0, .2, d.col, lx, ly); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = .02; c.stroke();
      ball(c, 0, 0, .075, '#d7dde1', lx, ly, '#fff'); muzzle = .44; break;
    case 'gatling': {
      const spin = time * 25;
      for (let i = 0; i < 3; i++) { const o = Math.sin(spin + i * 2.1) * .085; cyl(c, .05, o - .03, .4, .06, '#3c4248'); }
      cyl(c, .3, -.15, .06, .3, '#9aa4aa'); cyl(c, .12, -.15, .05, .3, '#9aa4aa');
      g = c.createLinearGradient(0, -.19, 0, .19); g.addColorStop(0, shade(d.col, .45)); g.addColorStop(.5, d.col); g.addColorStop(1, shade(d.col, -.6));
      c.fillStyle = g; rr(c, -.22, -.19, .34, .38, .08); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = .02; c.stroke();
      ball(c, -.05, 0, .07, '#cfd6da', lx, ly, '#fff'); muzzle = .47; break;
    }
    case 'cannon':
      cyl(c, -.02, -.12, .42, .24, '#33383e'); cyl(c, .33, -.14, .1, .28, shade(d.col, -.15));
      c.fillStyle = '#050505'; c.beginPath(); c.ellipse(.43, 0, .025, .09, 0, 0, TAU); c.fill();
      ball(c, 0, 0, .25, '#6e7d87', lx, ly); ball(c, 0, 0, .12, d.col, lx, ly);
      c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = .02; c.beginPath(); c.arc(0, 0, .19, 0, TAU); c.stroke(); muzzle = .46; break;
    case 'frost': {
      cyl(c, 0, -.05, .38, .1, '#617482');
      c.fillStyle = 'rgba(79,195,247,.25)'; c.beginPath(); c.arc(0, 0, .28, 0, TAU); c.fill();
      g = c.createRadialGradient(lx * .1, ly * .1, .02, 0, 0, .23); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#81d4fa'); g.addColorStop(1, '#0277bd');
      c.fillStyle = g; c.beginPath(); for (let i = 0; i < 6; i++) { const q = i * TAU / 6; c.lineTo(Math.cos(q) * .23, Math.sin(q) * .23); } c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .015; c.stroke();
      c.beginPath(); for (let i = 0; i < 6; i++) { const q = i * TAU / 6; c.moveTo(0, 0); c.lineTo(Math.cos(q) * .23, Math.sin(q) * .23); } c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke();
      muzzle = .4; break;
    }
    case 'laser':
      cyl(c, 0, -.045, .48, .09, '#2f3439'); cyl(c, .14, -.075, .05, .15, '#c2cbd0'); cyl(c, .27, -.07, .04, .14, '#c2cbd0');
      g = c.createLinearGradient(0, -.17, 0, .17); g.addColorStop(0, '#5b656d'); g.addColorStop(.5, '#2b3137'); g.addColorStop(1, '#111518');
      c.fillStyle = g; rr(c, -.25, -.17, .37, .34, .08); c.fill();
      c.fillStyle = 'rgba(255,40,40,' + (.35 + .25 * Math.sin(time * 6)) + ')'; c.beginPath(); c.arc(-.06, 0, .15, 0, TAU); c.fill();
      ball(c, -.06, 0, .095, d.col, lx, ly, '#fff'); muzzle = .5; break;
    case 'tesla': {
      for (let i = 0; i < 5; i++) {
        g = c.createLinearGradient(-.2, 0, .2, 0); g.addColorStop(0, '#5a2d0c'); g.addColorStop(.35, '#f0a060'); g.addColorStop(1, '#6b3510');
        c.strokeStyle = g; c.lineWidth = .045; c.beginPath(); c.ellipse(0, .16 - i * .07, .19 - i * .018, .045, 0, 0, TAU); c.stroke();
      }
      const p = .13 + Math.sin(time * 8) * .015;
      c.globalCompositeOperation = 'lighter';
      g = c.createRadialGradient(0, -.2, 0, 0, -.2, p * 2.6); g.addColorStop(0, 'rgba(255,240,120,.7)'); g.addColorStop(1, 'rgba(255,230,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, -.2, p * 2.6, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over';
      ball(c, 0, -.2, p, '#d9dde0', -.7, -.7, '#ffffff');
      if (Math.sin(time * 13) > .6) { c.strokeStyle = 'rgba(255,255,200,.9)'; c.lineWidth = .015; c.beginPath(); c.moveTo(0, -.2); for (let k = 1; k < 4; k++) c.lineTo(rand(-.25, .25), -.2 + rand(-.2, .2)); c.stroke(); }
      muzzle = 0; break;
    }
  }
  if (flash > 0 && muzzle) {
    c.globalCompositeOperation = 'lighter';
    const f = flash / .07, g2 = c.createRadialGradient(muzzle, 0, 0, muzzle, 0, .26 * f + .05);
    g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(.35, d.col); g2.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g2; c.beginPath(); c.arc(muzzle, 0, .26 * f + .05, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
}

function drawEnemy(e) {
  const d = ETYPES[e.type], r = e.r, [lx, ly] = lightFor(e.ang);
  ctx.save(); ctx.translate(e.x, e.y);
  softShadow(ctx, e.fly ? .16 : .05, e.fly ? .24 : .08, r * 1.3, r * 1.05, e.fly ? .35 : .6);
  if (e.fly) ctx.translate(0, -.05 + Math.sin(e.anim * 4) * .025);
  const grow = Math.min(1, (e.age || 0) / .35); if (grow < 1) { ctx.scale(grow, grow); ctx.globalAlpha = grow; }
  ctx.rotate(e.ang);
  if (!e.fly) { const b = Math.sin(e.anim * 14) * .06; ctx.scale(1 + b, 1 - b); }
  if (e.fly) { // ailes translucides
    const f = Math.sin(e.anim * 32);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(-r * .15, s * r * .55); ctx.rotate(s * (.35 + f * .35));
      const g = ctx.createLinearGradient(0, 0, 0, s * r * 1.3); g.addColorStop(0, 'rgba(220,240,255,.75)'); g.addColorStop(1, 'rgba(160,200,255,.2)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-r * .1, s * r * .6, r * .55, r * .75, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = r * .04; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * .3, s * r * 1.1); ctx.moveTo(0, 0); ctx.lineTo(r * .25, s * r * 1.05); ctx.stroke();
      ctx.restore();
    }
  } else { // pattes articulées
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) {
      const k = Math.sin(e.anim * 14 + i * 2 + (s > 0 ? Math.PI : 0)) * r * .28;
      const bx = i * r * .45, by = s * r * .55, kx = bx + k * .5 + i * r * .1, ky = s * r * 1.05, fx = bx + k + i * r * .3, fy = s * r * 1.35;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy);
      ctx.strokeStyle = '#140c08'; ctx.lineWidth = r * .16; ctx.stroke();
      ctx.strokeStyle = 'rgba(160,130,110,.55)'; ctx.lineWidth = r * .05; ctx.stroke();
    }
  }
  // protubérances (spicules du virus)
  const sp = e.type === 'boss' ? 12 : 9, dk = shade(d.col, -.35);
  for (let i = 0; i < sp; i++) {
    const q = i * TAU / sp + e.anim * .4, cq = Math.cos(q), sq = Math.sin(q);
    ctx.strokeStyle = dk; ctx.lineWidth = r * .09; ctx.beginPath(); ctx.moveTo(cq * r * .8, sq * r * .8); ctx.lineTo(cq * r * 1.12, sq * r * 1.12); ctx.stroke();
    ball(ctx, cq * r * 1.16, sq * r * 1.16, r * .13, shade(d.col, .05), lx, ly);
  }
  // corps
  ball(ctx, 0, 0, r, e.hit > 0 ? '#ffffff' : d.col, lx, ly);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; // taches organiques
  for (let i = 0; i < 4; i++) { const q = (e.id * 2.3 + i * 1.7) % TAU, dd = r * (.3 + (i * .17) % .4); ctx.beginPath(); ctx.arc(Math.cos(q) * dd - r * .1, Math.sin(q) * dd, r * (.09 + i * .02), 0, TAU); ctx.fill(); }
  if (e.type === 'armor') {
    for (const s of [-1, 1]) {
      const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#f5f5f5'); g.addColorStop(.5, '#9e9e9e'); g.addColorStop(1, '#424242');
      ctx.strokeStyle = g; ctx.lineWidth = r * .22; ctx.beginPath(); ctx.arc(-r * .05, 0, r * .72, s > 0 ? Math.PI * .58 : Math.PI * 1.12, s > 0 ? Math.PI * .88 : Math.PI * 1.42); ctx.stroke();
    }
    for (let i = 0; i < 5; i++) { const q = Math.PI * (.65 + i * .18); ball(ctx, Math.cos(q) * r * .72, Math.sin(q) * r * .72, r * .06, '#bdbdbd', lx, ly, '#fff'); }
  }
  if (e.type === 'boss') {
    for (let i = -1; i <= 1; i++) { ctx.save(); ctx.translate(-r * .62, i * r * .32); ctx.rotate(Math.PI + i * .3); const g = ctx.createLinearGradient(0, -r * .1, 0, r * .1); g.addColorStop(0, '#fff59d'); g.addColorStop(.5, '#ffb300'); g.addColorStop(1, '#8d5a00'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -r * .11); ctx.lineTo(r * .42, 0); ctx.lineTo(0, r * .11); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = 'rgba(60,0,0,.6)'; ctx.lineWidth = r * .05; ctx.beginPath(); ctx.moveTo(-r * .2, -r * .7); ctx.lineTo(r * .05, -r * .45); ctx.lineTo(-r * .1, -r * .3); ctx.stroke();
  }
  // reflet spéculaire
  ctx.save(); ctx.translate(lx * r * .45, ly * r * .45); ctx.rotate(Math.atan2(ly, lx) + Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(0, 0, r * .25, r * .12, 0, 0, TAU); ctx.fill(); ctx.restore();
  // yeux
  for (const s of [-1, 1]) {
    const ex = r * .42, ey = s * r * .32;
    ball(ctx, ex, ey, r * .25, '#e8e8e8', lx, ly, '#ffffff');
    ctx.fillStyle = e.type === 'boss' ? '#ffd600' : '#d50000'; ctx.beginPath(); ctx.arc(ex + r * .09, ey - s * r * .02, r * .13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + r * .12, ey - s * r * .02, r * .065, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + r * .06 + lx * r * .05, ey - s * r * .06 + ly * r * .05, r * .035, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1a0d0d'; ctx.lineWidth = r * .11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r * .14, s * r * .6); ctx.lineTo(r * .66, s * r * .14); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
  // effets lumineux (sans rotation)
  if (e.type === 'regen' || e.slowT > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const col = e.slowT > 0 ? '130,210,255' : '120,255,140', a = e.slowT > 0 ? .45 : .25 + .2 * Math.sin(e.anim * 6);
    const g = ctx.createRadialGradient(e.x, e.y, r * .5, e.x, e.y, r * 1.6); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, r * 1.6, 0, TAU); ctx.fill(); ctx.restore();
  }
}
const glowCache = new Map();
function glowDot(x, y, r, col, core) {
  const key = col + '|' + (core || '');
  let c = glowCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 64;
    const g2 = c.getContext('2d'), g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, core || '#ffffff'); g.addColorStop(.3, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = g; g2.fillRect(0, 0, 64, 64);
    if (glowCache.size > 200) glowCache.clear();
    glowCache.set(key, c);
  }
  ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
}

// couche animée : électricité dans les pistes, LED, sens du courant, portails, processeur
function drawLive() {
  const m = G.m, t = G.time;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  // impulsions électriques le long des pistes
  for (const p of G.pulses) {
    const tr = m.traces[p.tr], seg = tr.lens;
    let d = p.d, i = 0; while (i < seg.length && d > seg[i]) { d -= seg[i]; i++; }
    if (i >= seg.length) continue;
    const a = tr.pts[i], b = tr.pts[i + 1], u = d / seg[i], x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
    const dx = (b[0] - a[0]) / seg[i], dy = (b[1] - a[1]) / seg[i];
    glowDot(x - dx * .12, y - dy * .12, .12, p.col); glowDot(x, y, .16, p.col);
  }
  // LED qui clignotent
  ctx.globalCompositeOperation = 'source-over';
  const lit = [];
  for (const L2 of m.leds) { const on = Math.sin(t * (2 + L2[3] % 3) + L2[3]) > .2; ctx.fillStyle = on ? L2[2] : '#282828'; ctx.fillRect(L2[0] - .08, L2[1] - .05, .16, .1); if (on) lit.push(L2); }
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, col] of lit) glowDot(x, y, .3, col + '88');
  // flèches lumineuses qui avancent dans les couloirs (sens des virus), dessinées par paquets
  ctx.strokeStyle = m.acc; ctx.lineWidth = .045;
  const buckets = [[], [], [], []];
  for (const f of G.flow) { const ph = ((t * 1.6 + f.d * .35) % 4) / 4; if (ph < .44) buckets[Math.min(3, Math.floor(ph / .11))].push(f); }
  buckets.forEach((bk, bi) => {
    if (!bk.length) return;
    ctx.globalAlpha = .22 - bi * .055; ctx.beginPath();
    for (const f of bk) {
      const c = Math.cos(f.a), sn = Math.sin(f.a), X = f.x + .5, Y = f.y + .5;
      const P = (u, v) => [X + u * c - v * sn, Y + u * sn + v * c];
      const p1 = P(-.1, -.16), p2 = P(.08, 0), p3 = P(-.1, .16);
      ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]);
    }
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  // portails d'entrée
  for (const [x, y] of G.starts) {
    const cx = x + .5, cy = y + .5;
    glowDot(cx, cy, .9 + Math.sin(t * 4) * .08, 'rgba(255,30,60,.45)', 'rgba(255,120,120,.6)');
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k % 2 ? '#ff1744' : '#ff8a80'; ctx.globalAlpha = .7; ctx.lineWidth = .05;
      ctx.beginPath(); ctx.arc(cx, cy, .2 + k * .13, t * (3 + k) * (k % 2 ? -1 : 1), t * (3 + k) * (k % 2 ? -1 : 1) + 4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // processeur à protéger : il pulse, rougit quand on perd des vies
  for (const [x, y] of G.exits) {
    const hurtK = 1 - G.lives / G.d.lives, beat = .5 + .5 * Math.sin(t * (3 + hurtK * 6));
    const col = 'rgba(' + Math.round(64 + 191 * Math.round(hurtK * 5) / 5) + ',' + Math.round(196 - 150 * Math.round(hurtK * 5) / 5) + ',255,' + (Math.round((.35 + beat * .3) * 10) / 10) + ')';
    glowDot(x + .5, y + .5, 1.1 + beat * .2, col, 'rgba(255,255,255,.35)');
  }
  ctx.restore();
}
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#070a08'; ctx.fillRect(0, 0, SW, SH);
  if (!G) return;
  ctx.save(); ctx.beginPath(); ctx.rect(L.ax, L.ay, L.aw, L.ah); ctx.clip();
  const sh = G.shake || 0;
  mapTransform(sh ? rand(-sh, sh) : 0, sh ? rand(-sh, sh) : 0);
  ctx.drawImage(G.bg, 0, 0, COLS, ROWS);
  drawLive();
  // taches laissées par les virus détruits
  for (const f of G.fx) if (f.kind === 'splat') {
    const a = Math.min(1, f.life / 2);
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    g.addColorStop(0, 'rgba(0,0,0,' + .7 * a + ')'); g.addColorStop(.6, f.col.replace('A', .35 * a)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const q = i * TAU / 12, r2 = f.r * (.65 + ((f.seed * (i + 3)) % 1) * .45); ctx.lineTo(f.x + Math.cos(q) * r2, f.y + Math.sin(q) * r2); }
    ctx.fill();
  }
  // case visée (souris)
  if (G.tool && G.hover) {
    const [hx, hy] = G.hover;
    if (hx >= 0 && hy >= 0 && hx < COLS && hy < ROWS) {
      const ok = canPlace(hx, hy) === null && G.cash >= TOWERS[G.tool].cost;
      ctx.fillStyle = ok ? 'rgba(100,255,120,.25)' : 'rgba(255,60,60,.3)'; ctx.fillRect(hx, hy, 1, 1);
      if (ok) {
        ctx.globalAlpha = .5; ctx.save(); ctx.translate(hx + .5, hy + .5); drawTower(ctx, G.tool, 1, -Math.PI / 2, G.time, 0); ctx.restore(); ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .04; ctx.setLineDash([.15, .1]); ctx.beginPath(); ctx.arc(hx + .5, hy + .5, TOWERS[G.tool].range, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }
  for (const f of G.fx) if (f.kind === 'bad') { ctx.fillStyle = 'rgba(255,40,40,' + (f.life / f.max * .6) + ')'; ctx.fillRect(f.x, f.y, 1, 1); }
  // virus au sol (sous les tourelles qui débordent un peu)
  for (const e of G.enemies) if (!e.fly) drawEnemy(e);
  // tourelles
  for (const t of G.towers) {
    const age = G.time - t.born; ctx.save(); ctx.translate(t.x + .5, t.y + .5);
    if (age < .45) { const k = age / .45, sc = 1 + Math.sin(k * Math.PI) * .25 * (1 - k) + (1 - k) * .6 * (1 - k); ctx.globalAlpha = Math.min(1, k * 3); ctx.scale(sc, sc); }
    drawTower(ctx, t.type, t.lvl, t.ang, G.time, t.flash || 0, true);
    ctx.globalAlpha = 1;
    const ua = G.time - t.upT;
    if (ua < .6) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - ua / .6; ctx.strokeStyle = '#fff59d'; ctx.lineWidth = .06; ctx.beginPath(); ctx.arc(0, 0, .3 + ua * 1.2, 0, TAU); ctx.stroke(); glowDot(0, 0, .6, 'rgba(255,240,150,.5)'); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  if (G.sel) {
    const t = G.sel;
    ctx.fillStyle = 'rgba(230,238,90,.08)'; ctx.beginPath(); ctx.arc(t.x + .5, t.y + .5, t.st.range, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,238,90,.75)'; ctx.lineWidth = .04; ctx.setLineDash([.15, .1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#e6ee5a'; ctx.lineWidth = .05; rr(ctx, t.x + .02, t.y + .02, .96, .96, .15); ctx.stroke();
  }
  // projectiles (ombre puis objet)
  for (const p of G.projs) if (p.kind === 'shell') softShadow(ctx, p.x + .06, p.y + .1, .1, .08, .5);
  for (const p of G.projs) if (p.kind === 'shell') {
    ball(ctx, p.x, p.y, .085, '#3a3f44', -.7, -.7, '#9aa4aa');
    glowDot(p.x - .06, p.y - .06, .07, 'rgba(255,170,0,.8)');
  }
  for (const e of G.enemies) if (e.fly) drawEnemy(e);
  // particules de fumée
  for (const q of G.parts) if (q.smoke) {
    const k = q.life / q.max, r = q.size * (1 + (1 - k) * 2.5);
    const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r); g.addColorStop(0, 'rgba(70,70,70,' + .45 * k + ')'); g.addColorStop(1, 'rgba(40,40,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fill();
  }
  // tout ce qui brille
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const p of G.projs) {
    if (p.kind === 'shell') continue;
    const tl = Math.hypot(p.lx - p.x, p.ly - p.y) || 1, tx = (p.x - p.lx) / tl, ty = (p.y - p.ly) / tl;
    ctx.strokeStyle = p.col; ctx.globalAlpha = .45; ctx.lineWidth = p.kind === 'ice' ? .12 : .08;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + tx * .3, p.y + ty * .3); ctx.stroke(); ctx.globalAlpha = 1;
    glowDot(p.x, p.y, p.kind === 'ice' ? .2 : .15, p.col);
  }
  for (const f of G.fx) {
    const k = f.life / f.max;
    if (f.kind === 'beam') {
      ctx.globalAlpha = k;
      ctx.strokeStyle = f.col; ctx.lineWidth = f.w * 4; ctx.globalAlpha = k * .35; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.globalAlpha = k; ctx.lineWidth = f.w * 1.6; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = f.w * .6; ctx.stroke();
      glowDot(f.x2, f.y2, .35 * k + .1, f.col); ctx.globalAlpha = 1;
    } else if (f.kind === 'chain') {
      const segs = [];
      for (let i = 0; i < f.pts.length - 1; i++) {
        const [ax, ay] = f.pts[i], [bx, by] = f.pts[i + 1]; segs.push([ax, ay]);
        for (let s = 1; s < 6; s++) { const u = s / 6; segs.push([ax + (bx - ax) * u + rand(-.13, .13), ay + (by - ay) * u + rand(-.13, .13)]); }
      }
      segs.push(f.pts[f.pts.length - 1]);
      const path = () => { ctx.beginPath(); segs.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
      ctx.globalAlpha = k * .4; ctx.strokeStyle = f.col; ctx.lineWidth = .22; path(); ctx.stroke();
      ctx.globalAlpha = k; ctx.lineWidth = .06; path(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = .025; ctx.stroke();
      for (const [x, y] of f.pts.slice(1)) glowDot(x, y, .3 * k, f.col);
      ctx.globalAlpha = 1;
    } else if (f.kind === 'ring') {
      const R = f.r * (1.15 - k * .65);
      const g = ctx.createRadialGradient(f.x, f.y, R * .2, f.x, f.y, R);
      g.addColorStop(0, 'rgba(255,255,220,' + .55 * k + ')'); g.addColorStop(.6, f.col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = k; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  for (const q of G.parts) if (!q.smoke) {
    const k = q.life / q.max; ctx.globalAlpha = k; ctx.strokeStyle = q.col; ctx.lineWidth = q.size;
    ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * .035, q.y - q.vy * .035); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // vignettage
  const vg = ctx.createRadialGradient(COLS / 2, ROWS / 2, ROWS * .35, COLS / 2, ROWS / 2, COLS * .62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, COLS, ROWS);
  ctx.restore();

  // ----- écran (texte et barres toujours droits) -----
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const T = L.s;
  for (const e of G.enemies) {
    if (e.hp >= e.max) continue;
    const [sx, sy] = toScreen(e.x, e.y), w = T * (e.type === 'boss' ? 1 : .6), y = sy - T * e.r - 10, k = e.hp / e.max;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(ctx, sx - w / 2 - 1.5, y - 1.5, w + 3, 6, 2); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + 3); const col = k > .5 ? '#66bb6a' : k > .25 ? '#ffca28' : '#ef5350';
    g.addColorStop(0, shade(col, .4)); g.addColorStop(1, shade(col, -.3)); ctx.fillStyle = g; ctx.fillRect(sx - w / 2, y, w * k, 3);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 ' + Math.max(11, T * .36) + 'px system-ui';
  for (const t of G.texts) {
    const [sx, sy] = toScreen(t.x, t.y); ctx.globalAlpha = Math.min(1, t.life * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(t.t, sx, sy); ctx.fillStyle = t.col; ctx.fillText(t.t, sx, sy);
  }
  ctx.globalAlpha = 1;
  for (const f of G.fx) if (f.kind === 'leak') {
    const g = ctx.createRadialGradient(SW / 2, SH / 2, Math.min(SW, SH) * .3, SW / 2, SH / 2, Math.max(SW, SH) * .7);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,0,0,' + (f.life / f.max * .5) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  }
  if (G.banner) {
    const b = G.banner, age = 2.2 - b.life, k = Math.min(1, age / .25), out = Math.min(1, b.life / .4);
    const cx = L.ax + L.aw / 2, cy = L.ay + L.ah * .38, sc = (1.6 - .6 * k) ;
    ctx.save(); ctx.globalAlpha = out; ctx.translate(cx, cy); ctx.scale(sc, sc);
    const fs = Math.min(46, L.aw / 10);
    ctx.font = '900 ' + fs + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = fs * .22; ctx.strokeStyle = '#2a0000'; ctx.strokeText(b.t, 0, 0);
    const g = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2); g.addColorStop(0, b.boss ? '#ffeb3b' : '#ffffff'); g.addColorStop(1, b.boss ? '#ff3d00' : G.m.acc);
    ctx.fillStyle = g; ctx.fillText(b.t, 0, 0);
    ctx.font = '800 ' + fs * .38 + 'px system-ui'; ctx.lineWidth = 4; ctx.strokeText(b.sub, 0, fs * .75); ctx.fillStyle = '#fff'; ctx.fillText(b.sub, 0, fs * .75);
    ctx.restore();
  }
  if (G.countdown > 0 && !G.over) {
    const [sx, sy] = toScreen(COLS / 2, .9);
    ctx.font = 'bold 15px system-ui';
    const txt = 'Vague ' + (G.wave + 1) + ' dans ' + Math.ceil(G.countdown) + ' s', w = ctx.measureText(txt).width + 24;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(ctx, sx - w / 2, sy - 14, w, 28, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(230,238,90,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#e6ee5a'; ctx.fillText(txt, sx, sy);
  }
}

/* ---------------- entrées : toucher, glisser, pincer ---------------- */
const ptrs = new Map(); let gesture = null;
cv.addEventListener('pointerdown', e => {
  initAudio();
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gesture = { pinch: true, d: Math.hypot(a.x - b.x, a.y - b.y), z: L.zoom }; }
  else if (ptrs.size === 1) gesture = { pinch: false, moved: false };
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && G && state === 'play') { const [mx, my] = toMap(e.clientX, e.clientY); G.hover = [Math.floor(mx), Math.floor(my)]; }
  const p = ptrs.get(e.pointerId); if (!p || state !== 'play') return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (!gesture) return;
  if (gesture.pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    setZoom(gesture.z * d / gesture.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
    gesture.moved = true;
  } else if (!gesture.pinch) {
    if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 12) gesture.moved = true;
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
  if (ptrs.size === 0) gesture = null; else if (g && g.pinch) g.moved = true;
  if (!g || g.moved || g.pinch || e.type === 'pointercancel' || !G || state !== 'play') return;
  const [mx, my] = toMap(e.clientX, e.clientY), tx = Math.floor(mx), ty = Math.floor(my);
  const inMap = tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS;
  const tw = inMap ? G.towerAt[ty][tx] : null;
  if (tw) { openPopup(tw); return; }
  if (G.sel) { closePopup(); return; }
  if (G.tool && inMap) tryPlace(G.tool, tx, ty);
}
cv.addEventListener('pointerup', pEnd); cv.addEventListener('pointercancel', pEnd);
cv.addEventListener('wheel', e => { if (state !== 'play') return; e.preventDefault(); setZoom(L.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); if (G && G.sel) placePopup(); }, { passive: false });
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
  if (!G || G.demo) return;
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
  let x = sx + L.s * .7, y = sy - h / 2;
  if (x + w > SW - (L.port ? 6 : 160)) x = sx - L.s * .7 - w;
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
  if (s === 'play') { for (const id of screens) $('#' + id).classList.add('hidden'); }
  else { if (s !== 'pause' && s !== 'result') { G = null; L.zoom = 1; } $('#tpop').classList.add('hidden'); show(s); }
  layout();
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
  else {
    // menus : une partie de démonstration tourne en fond
    if (!DEMO || DEMO.time > 150) DEMO = newGame(Math.floor(Math.random() * MAPS.length), true);
    G = DEMO; update(dt); render(); G = null;
  }
  requestAnimationFrame(frame);
}
layout();
setState('menu');
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
