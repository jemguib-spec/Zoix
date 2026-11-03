'use strict';
/* ================= VORTRIX — arène néon pour mobile ================= */

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let DPR = 1, SW = 0, SH = 0, SCALE = 1, W = 600, H = 600, SAFE_T = 0, SAFE_L = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  SW = innerWidth; SH = innerHeight;
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  cv.style.width = SW + 'px'; cv.style.height = SH + 'px';
  SCALE = Math.min(SW, SH) / 560;
  W = SW / SCALE; H = SH / SCALE;
  const cs = getComputedStyle(document.getElementById('safe'));
  SAFE_T = parseFloat(cs.paddingTop) || 0; SAFE_L = parseFloat(cs.paddingLeft) || 0;
  if (G) { G.player.x = clamp(G.player.x, 20, W - 20); G.player.y = clamp(G.player.y, 20, H - 20); initStars(); }
}
addEventListener('resize', resize);

/* ---------------- utilitaires ---------------- */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAU = Math.PI * 2;
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* ---------------- sauvegarde ---------------- */
const SAVE_KEY = 'vortrix_save_v1';
const DEFAULT_SAVE = {
  credits: 0, weapons: { blaster: 1 }, equipped: 'blaster',
  up: { hp: 0, speed: 0, rate: 0, dmg: 0, shield: 0, magnet: 0 },
  unlocked: { easy: 1, normal: 1, hard: 1, nightmare: 1 }, stars: {},
  autoFire: true, sound: true, vibe: true
};
function loadSave() {
  const d = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s) { Object.assign(d, s); d.up = Object.assign({}, DEFAULT_SAVE.up, s.up); d.unlocked = Object.assign({}, DEFAULT_SAVE.unlocked, s.unlocked); d.weapons = Object.assign({ blaster: 1 }, s.weapons); }
  } catch (e) { }
  return d;
}
let save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }

/* ---------------- données ---------------- */
const DIFFS = {
  easy: { name: 'Facile', hp: .7, dmg: .55, spd: .85, cnt: .8, rew: .8, col: '#4ade80', desc: 'Pour découvrir le jeu · gains ×0.8' },
  normal: { name: 'Normal', hp: 1, dmg: 1, spd: 1, cnt: 1, rew: 1, col: '#60a5fa', desc: 'L\'expérience équilibrée · gains ×1' },
  hard: { name: 'Difficile', hp: 1.45, dmg: 1.4, spd: 1.1, cnt: 1.25, rew: 1.5, col: '#f97316', desc: 'Ennemis coriaces · gains ×1.5' },
  nightmare: { name: 'Cauchemar', hp: 2.1, dmg: 2, spd: 1.22, cnt: 1.5, rew: 2.2, col: '#ef4444', desc: 'Seuls les meilleurs survivent · gains ×2.2' }
};
const WORLDS = [
  { name: 'Nébuleuse Azur', bg: '#040917', grid: 'rgba(80,140,255,.09)', acc: '#60a5fa' },
  { name: 'Ceinture Pourpre', bg: '#10041a', grid: 'rgba(200,90,255,.09)', acc: '#e879f9' },
  { name: 'Noyau Ardent', bg: '#170604', grid: 'rgba(255,120,60,.1)', acc: '#fb923c' }
];
const NLEVELS = 15;

const WEAPONS = {
  blaster: { name: 'Blaster', ic: '✦', col: '#5eead4', price: 0, upBase: 90, desc: 'Tir rapide et précis. Canons supplémentaires aux niv. 3 et 5.' },
  spread: { name: 'Dispersion', ic: '❋', col: '#fde047', price: 250, upBase: 140, desc: 'Gerbe de projectiles à courte portée.' },
  laser: { name: 'Rayon laser', ic: '═', col: '#f472b6', price: 650, upBase: 200, desc: 'Rayon continu qui transperce tout.' },
  missile: { name: 'Missiles', ic: '➤', col: '#fb923c', price: 950, upBase: 240, desc: 'Missiles à tête chercheuse explosifs.' },
  plasma: { name: 'Plasma', ic: '◉', col: '#a78bfa', price: 1500, upBase: 300, desc: 'Orbe lent et perforant qui explose.' }
};
const WORDER = ['blaster', 'spread', 'laser', 'missile', 'plasma'];
const WMAX = 5;
function weaponUpCost(k) { const l = save.weapons[k] || 0; return Math.round(WEAPONS[k].upBase * Math.pow(l, 1.5)); }

const UPS = {
  hp: { name: 'Coque renforcée', ic: '♥', desc: '+25 PV max', base: 60 },
  speed: { name: 'Propulseurs', ic: '»', desc: '+8% vitesse', base: 50 },
  rate: { name: 'Cadence', ic: '⚡', desc: '+7% cadence de tir', base: 80 },
  dmg: { name: 'Puissance', ic: '✹', desc: '+12% dégâts', base: 90 },
  shield: { name: 'Bouclier', ic: '⬡', desc: '+20 bouclier régénérant', base: 100 },
  magnet: { name: 'Aimant', ic: '∪', desc: 'Attire les crédits de plus loin', base: 40 }
};
const UMAX = 5;
function upCost(k) { return Math.round(UPS[k].base * Math.pow(save.up[k] + 1, 1.6)); }

const EN = {
  drone: { r: 11, hp: 18, spd: 95, dmg: 10, col: '#ff4d6d', rew: 4, ai: 'chase', shape: 'tri' },
  dasher: { r: 11, hp: 16, spd: 75, dmg: 15, col: '#ffd166', rew: 6, ai: 'dash', shape: 'dia' },
  shooter: { r: 14, hp: 32, spd: 65, dmg: 9, col: '#a78bfa', rew: 9, ai: 'shoot', shape: 'sq' },
  splitter: { r: 18, hp: 44, spd: 55, dmg: 12, col: '#22d3ee', rew: 8, ai: 'chase', shape: 'hex' },
  mini: { r: 8, hp: 9, spd: 135, dmg: 6, col: '#67e8f9', rew: 2, ai: 'chase', shape: 'tri' },
  orbiter: { r: 13, hp: 38, spd: 115, dmg: 9, col: '#f472b6', rew: 11, ai: 'orbit', shape: 'ring' },
  tank: { r: 24, hp: 170, spd: 38, dmg: 24, col: '#34d399', rew: 22, ai: 'chase', shape: 'oct' },
  boss: { r: 46, hp: 1500, spd: 55, dmg: 30, col: '#ffffff', rew: 250, ai: 'boss', shape: 'boss' }
};
const BOSS_NAMES = ['Gardien Azur', 'Hydre Pourpre', 'Cœur du Noyau'];
const BOSS_COLS = ['#60a5fa', '#e879f9', '#fb923c'];
const BOSS_PATTERNS = [['ring', 'aimed', 'charge', 'ring'], ['aimed', 'summon', 'ring', 'spiral'], ['spiral', 'ring', 'aimed', 'summon', 'charge']];

function levelPool(n) {
  const p = [['drone', 10]];
  if (n >= 2) p.push(['dasher', 5]);
  if (n >= 3) p.push(['shooter', 4]);
  if (n >= 4) p.push(['splitter', 3]);
  if (n >= 6) p.push(['orbiter', 3]);
  if (n >= 7) p.push(['tank', 2]);
  if (n >= 11) p.push(['tank', 1], ['orbiter', 2], ['shooter', 2]);
  return p;
}
function pickW(pool) { let t = 0; for (const [, w] of pool) t += w; let r = Math.random() * t; for (const [k, w] of pool) if ((r -= w) <= 0) return k; return pool[0][0]; }

/* ---------------- son (WebAudio) ---------------- */
let AC = null, NOISE = null; const lastS = {};
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    NOISE = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
    const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function tone(f, dur, type, vol, f2) {
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq) {
  const t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(AC.destination); s.start(t); s.stop(t + dur);
}
function sfx(n) {
  if (!AC || !save.sound) return;
  const now = performance.now(); if (lastS[n] && now - lastS[n] < 55) return; lastS[n] = now;
  switch (n) {
    case 'blaster': tone(880, .07, 'square', .03, 440); break;
    case 'spread': tone(420, .1, 'sawtooth', .03, 180); break;
    case 'missile': tone(200, .2, 'triangle', .05, 600); break;
    case 'plasma': tone(150, .35, 'sine', .08, 60); break;
    case 'hit': tone(300, .04, 'square', .02, 200); break;
    case 'boom': noise(.35, .2, 1800); break;
    case 'bigboom': noise(.9, .35, 2500); tone(90, .8, 'sine', .2, 30); break;
    case 'coin': tone(1200, .06, 'sine', .04, 1800); break;
    case 'hurt': noise(.2, .25, 900); tone(140, .2, 'sawtooth', .06, 60); break;
    case 'power': tone(500, .25, 'triangle', .08, 1500); break;
    case 'wave': tone(330, .15, 'triangle', .08, 660); setTimeout(() => AC && tone(660, .2, 'triangle', .08, 990), 120); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .25, 'triangle', .1), i * 120)); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, .3, 'sawtooth', .06), i * 160)); break;
    case 'buy': tone(700, .1, 'triangle', .08, 1400); break;
  }
}
function vibe(ms) { if (save.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }

/* ---------------- état du jeu ---------------- */
let G = null;           // partie en cours
let state = 'menu';     // menu | play | pause | result
let curDiff = 'normal';
let stars = [];
let uid = 1;

function playerStats() {
  const u = save.up;
  return {
    maxHp: 100 + 25 * u.hp, speed: 210 * (1 + .08 * u.speed), rate: 1 / (1 + .07 * u.rate),
    dmg: 1 + .12 * u.dmg, maxShield: 20 * u.shield, shieldRegen: 3 + 1.5 * u.shield, magnet: 70 + 35 * u.magnet
  };
}

function initStars() {
  stars = [];
  for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: rand(.2, 1) });
}

function startLevel(n) {
  const diff = DIFFS[curDiff], st = playerStats();
  const boss = n % 5 === 0;
  const waves = [];
  const nw = boss ? 2 : 3 + Math.floor(n / 4);
  const pool = levelPool(n);
  for (let i = 0; i < nw; i++) {
    if (boss && i === nw - 1) { waves.push(['boss']); break; }
    const cnt = Math.round((6 + n * 1.6 + i * 3) * diff.cnt);
    const w = []; for (let j = 0; j < cnt; j++) w.push(pickW(pool));
    waves.push(w);
  }
  G = {
    n, world: Math.floor((n - 1) / 5), diff, boss, waves, wave: -1, queue: [], spawnT: 0, waveDelay: 1.2,
    enemies: [], bullets: [], ebullets: [], pickups: [], parts: [], warns: [], texts: [],
    coins: 0, kills: 0, time: 0, shake: 0, banner: null, done: false, endT: 0, bossRef: null, dmgTaken: 0,
    player: {
      x: W / 2, y: H / 2, r: 13, hp: st.maxHp, shield: st.maxShield, inv: 1, angle: -Math.PI / 2, cd: 0,
      weapon: save.weapons[save.equipped] ? save.equipped : 'blaster', laserOn: false, laserA: 0, noHit: 0,
      pw: { rapid: 0, dmg: 0, shield: 0 }, st, trail: 0
    }
  };
  initStars();
  setState('play');
}

/* ---------------- entrées ---------------- */
const JR = 58; // rayon joystick (px écran)
const input = {
  move: { id: null, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0 },
  aim: { id: null, ox: 0, oy: 0, x: 0, y: 0, ang: 0, mag: 0 },
  keys: {}, mouse: { x: 0, y: 0, down: false, used: false }
};
function stick(s, x, y) {
  let dx = x - s.ox, dy = y - s.oy; const d = Math.hypot(dx, dy);
  if (d > JR) { s.ox = x - dx / d * JR; s.oy = y - dy / d * JR; dx = x - s.ox; dy = y - s.oy; } // la base suit le doigt
  s.x = x; s.y = y; return [dx / JR, dy / JR];
}
cv.addEventListener('pointerdown', e => {
  initAudio();
  if (state !== 'play') return;
  if (e.pointerType === 'mouse') { input.mouse.down = true; input.mouse.used = true; input.mouse.x = e.clientX; input.mouse.y = e.clientY; return; }
  const m = input.move, a = input.aim;
  if (e.clientX < SW / 2 && m.id === null) { m.id = e.pointerId; m.ox = m.x = e.clientX; m.oy = m.y = e.clientY; m.vx = m.vy = 0; }
  else if (a.id === null) { a.id = e.pointerId; a.ox = a.x = e.clientX; a.oy = a.y = e.clientY; a.mag = 0; }
  else if (m.id === null) { m.id = e.pointerId; m.ox = m.x = e.clientX; m.oy = m.y = e.clientY; m.vx = m.vy = 0; }
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { input.mouse.x = e.clientX; input.mouse.y = e.clientY; input.mouse.used = true; return; }
  const m = input.move, a = input.aim;
  if (e.pointerId === m.id) { const [vx, vy] = stick(m, e.clientX, e.clientY); m.vx = vx; m.vy = vy; }
  else if (e.pointerId === a.id) { const [vx, vy] = stick(a, e.clientX, e.clientY); a.mag = Math.hypot(vx, vy); if (a.mag > .2) a.ang = Math.atan2(vy, vx); }
});
function pUp(e) {
  if (e.pointerType === 'mouse') { input.mouse.down = false; return; }
  if (e.pointerId === input.move.id) { input.move.id = null; input.move.vx = input.move.vy = 0; }
  if (e.pointerId === input.aim.id) { input.aim.id = null; input.aim.mag = 0; }
}
cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', pUp);
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => {
  input.keys[e.code] = true; initAudio();
  if (state === 'play') {
    if (e.code === 'KeyQ' || e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); swapWeapon(); }
    if (e.code === 'Escape' || e.code === 'KeyP') pauseGame();
    const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code);
    if (i >= 0 && save.weapons[WORDER[i]]) { G.player.weapon = WORDER[i]; save.equipped = WORDER[i]; persist(); }
  } else if (state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) resumeGame();
});
addEventListener('keyup', e => { input.keys[e.code] = false; });
function resetInput() { input.move.id = input.aim.id = null; input.move.vx = input.move.vy = 0; input.aim.mag = 0; input.mouse.down = false; input.keys = {}; }

function swapWeapon() {
  if (!G) return;
  const owned = WORDER.filter(k => save.weapons[k]);
  if (owned.length < 2) { floatText(G.player.x, G.player.y - 30, 'Achète d\'autres armes !', '#fff'); return; }
  const i = owned.indexOf(G.player.weapon);
  G.player.weapon = owned[(i + 1) % owned.length]; save.equipped = G.player.weapon; persist();
  floatText(G.player.x, G.player.y - 30, WEAPONS[G.player.weapon].name, WEAPONS[G.player.weapon].col);
  G.player.cd = 0.15;
}

/* ---------------- création d'entités ---------------- */
function floatText(x, y, t, col, size) { G.texts.push({ x, y, t, col, life: 1.1, size: size || 14 }); }
function burst(x, y, col, n, spd, size) {
  for (let i = 0; i < n; i++) {
    if (G.parts.length > 450) G.parts.shift();
    const a = Math.random() * TAU, s = rand(.2, 1) * spd;
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .7), max: .7, col, size: size || rand(1.5, 3.5) });
  }
}
function pBullet(x, y, a, spd, dmg, r, col, o) {
  const b = { x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, a, spd, dmg, r, col, life: 1.4, hits: null };
  if (o) Object.assign(b, o);
  G.bullets.push(b); return b;
}
function eBullet(x, y, a, spd, dmg, r, col) {
  G.ebullets.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, r: r || 5, col: col || '#ff6b6b', life: 6 });
}
function makeEnemy(type, x, y) {
  const d = EN[type], n = G.n, df = G.diff;
  const e = {
    id: uid++, type, x, y, vx: 0, vy: 0, r: d.r, ai: d.ai, shape: d.shape, col: d.col,
    hp: d.hp * (1 + (n - 1) * .13) * df.hp, spd: d.spd * (1 + (n - 1) * .02) * df.spd,
    dmg: d.dmg * df.dmg * (1 + (n - 1) * .04), rew: d.rew, t: Math.random() * 2, st: rand(1, 2.5), state: 0, cd: rand(.5, 1.5),
    side: Math.random() < .5 ? -1 : 1, oa: Math.random() * TAU, rot: Math.random() * TAU, flash: 0
  };
  if (type === 'boss') {
    e.hp = d.hp * (1 + G.world * .95) * df.hp; e.col = BOSS_COLS[G.world]; e.name = BOSS_NAMES[G.world];
    e.patterns = BOSS_PATTERNS[G.world]; e.pi = 0; e.pt = 2; e.tx = W / 2; e.ty = H * .3; e.spiral = 0; e.charge = 0;
    G.bossRef = e;
  }
  e.maxHp = e.hp;
  G.enemies.push(e); return e;
}
function spawnFromEdge(type) {
  const m = 30; let x, y;
  // évite d'apparaître trop près du joueur
  for (let k = 0; k < 8; k++) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { x = rand(m, W - m); y = m; } else if (side === 1) { x = W - m; y = rand(m, H - m); }
    else if (side === 2) { x = rand(m, W - m); y = H - m; } else { x = m; y = rand(m, H - m); }
    if (Math.hypot(x - G.player.x, y - G.player.y) > 160) break;
  }
  if (type === 'boss') { x = W / 2; y = Math.min(H * .25, 140); }
  G.warns.push({ x, y, type, t: type === 'boss' ? 1.6 : .8, max: type === 'boss' ? 1.6 : .8 });
}

/* ---------------- tir du joueur ---------------- */
function fireWeapon(p, a) {
  const w = p.weapon, l = save.weapons[w] || 1;
  const dm = p.st.dmg * (p.pw.dmg > 0 ? 2 : 1);
  const rate = p.st.rate * (p.pw.rapid > 0 ? .5 : 1);
  const nx = p.x + Math.cos(a) * 14, ny = p.y + Math.sin(a) * 14;
  switch (w) {
    case 'blaster': {
      const n = l >= 5 ? 3 : l >= 3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 9;
        pBullet(nx + Math.cos(a + Math.PI / 2) * off, ny + Math.sin(a + Math.PI / 2) * off, a + rand(-.03, .03), 640, (9 + l * 3) * dm, 4, '#5eead4');
      }
      p.cd = (.19 - l * .014) * rate; sfx('blaster'); break;
    }
    case 'spread': {
      const n = 3 + l, arc = .45 + .05 * l;
      for (let i = 0; i < n; i++) pBullet(nx, ny, a - arc / 2 + arc * i / (n - 1) + rand(-.04, .04), rand(480, 560), (6 + 2 * l) * dm, 4, '#fde047', { life: .5 + l * .03 });
      p.cd = (.52 - l * .03) * rate; sfx('spread'); break;
    }
    case 'missile': {
      const n = 1 + Math.floor(l / 2);
      for (let i = 0; i < n; i++) pBullet(nx, ny, a + (i - (n - 1) / 2) * .5 + rand(-.1, .1), 330, (24 + 8 * l) * dm, 5, '#fb923c', { homing: true, explode: 48 + 5 * l, life: 2.6, tgt: null, rt: 0 });
      p.cd = (.8 - l * .06) * rate; sfx('missile'); break;
    }
    case 'plasma': {
      pBullet(nx, ny, a, 250, (28 + 10 * l) * dm, 12 + 2 * l, '#a78bfa', { pierce: true, hits: new Set(), explode: 65 + 6 * l, life: 1.7, plasma: true });
      p.cd = (1.05 - l * .07) * rate; sfx('plasma'); break;
    }
  }
}
function explode(x, y, rad, dmg, col) {
  for (const e of G.enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < rad + e.r) hurtEnemy(e, dmg * (d < rad * .5 ? 1 : .6));
  }
  burst(x, y, col, 18, 220); burst(x, y, '#fff', 6, 120);
  G.parts.push({ ring: true, x, y, r: 4, R: rad, life: .3, max: .3, col });
  G.shake = Math.max(G.shake, 4); sfx('boom');
}

/* ---------------- dégâts ---------------- */
function hurtEnemy(e, d) {
  if (e.hp <= 0) return;
  e.hp -= d; e.flash = .07;
  if (e.hp <= 0) killEnemy(e); else sfx('hit');
}
function killEnemy(e) {
  G.kills++;
  const big = e.type === 'boss';
  burst(e.x, e.y, e.col, big ? 90 : 16 + e.r, big ? 380 : 200); burst(e.x, e.y, '#fff', big ? 30 : 5, 140);
  G.parts.push({ ring: true, x: e.x, y: e.y, r: e.r, R: e.r * (big ? 6 : 2.6), life: big ? .8 : .35, max: big ? .8 : .35, col: e.col });
  G.shake = Math.max(G.shake, big ? 18 : 3);
  sfx(big ? 'bigboom' : 'boom'); if (big) vibe(300);
  let v = Math.max(1, Math.round(e.rew * G.diff.rew));
  while (v > 0) {
    const c = v >= 25 ? 10 : v >= 8 ? 5 : v >= 3 ? 2 : 1; v -= c;
    const a = Math.random() * TAU, s = rand(40, big ? 260 : 120);
    G.pickups.push({ type: 'coin', v: c, x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 14, r: c >= 10 ? 7 : c >= 5 ? 6 : c >= 2 ? 5 : 4 });
  }
  const r = Math.random();
  if (r < .035) G.pickups.push({ type: 'heal', x: e.x, y: e.y, vx: 0, vy: 0, life: 12, r: 9 });
  else if (r < .06) G.pickups.push({ type: ['rapid', 'dmg', 'shield'][Math.floor(Math.random() * 3)], x: e.x, y: e.y, vx: 0, vy: 0, life: 12, r: 10 });
  if (e.type === 'splitter') for (let i = 0; i < 3; i++) { const m = makeEnemy('mini', e.x + rand(-10, 10), e.y + rand(-10, 10)); const a = Math.random() * TAU; m.vx = Math.cos(a) * 200; m.vy = Math.sin(a) * 200; }
  if (big) { G.bossRef = null; for (const o of G.enemies) if (o !== e && o.hp > 0) { o.hp = 0; killEnemy(o); } G.ebullets.length = 0; G.warns.length = 0; G.queue.length = 0; }
}
function hurtPlayer(d) {
  const p = G.player;
  if (p.inv > 0 || p.pw.shield > 0 || G.done) return;
  p.noHit = 0;
  if (p.shield > 0) { const a = Math.min(p.shield, d); p.shield -= a; d -= a; }
  p.hp -= d; G.dmgTaken += d; p.inv = .55;
  G.shake = Math.max(G.shake, 9); burst(p.x, p.y, '#ff6b6b', 14, 180); sfx('hurt'); vibe(60);
  if (p.hp <= 0) { p.hp = 0; gameOver(); }
}

/* ---------------- mise à jour ---------------- */
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD || 1e9;
  for (const e of G.enemies) { if (e.hp <= 0) continue; const d = Math.hypot(e.x - x, e.y - y) - e.r; if (d < bd) { bd = d; best = e; } }
  return best;
}

function update(dt) {
  G.time += dt;
  const p = G.player;

  // --- vagues ---
  if (!G.done) {
    if (G.queue.length === 0 && G.warns.length === 0 && G.enemies.length === 0) {
      G.waveDelay -= dt;
      if (G.waveDelay <= 0) {
        G.wave++;
        if (G.wave >= G.waves.length) { winLevel(); }
        else {
          G.queue = G.waves[G.wave].slice(); G.spawnT = 0;
          const isBoss = G.queue[0] === 'boss';
          G.banner = { t: isBoss ? '⚠ ' + BOSS_NAMES[G.world].toUpperCase() + ' ⚠' : 'VAGUE ' + (G.wave + 1) + ' / ' + G.waves.length, life: 2, col: isBoss ? '#f43f5e' : WORLDS[G.world].acc };
          sfx('wave'); G.waveDelay = 1.5;
        }
      }
    }
    if (G.queue.length) {
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        const burstN = Math.min(G.queue.length, 1 + Math.floor(Math.random() * (1 + G.n / 5)));
        for (let i = 0; i < burstN; i++) spawnFromEdge(G.queue.shift());
        G.spawnT = rand(.5, 1.1) / Math.sqrt(G.diff.cnt);
      }
    }
  } else {
    G.endT -= dt;
    if (G.win && G.endT <= 0 && state === 'play') showResult(true);
  }
  for (let i = G.warns.length - 1; i >= 0; i--) { const w = G.warns[i]; w.t -= dt; if (w.t <= 0) { makeEnemy(w.type, w.x, w.y); burst(w.x, w.y, EN[w.type].col, 10, 150); G.warns.splice(i, 1); } }

  // --- joueur ---
  let mx = input.move.vx, my = input.move.vy;
  const k = input.keys;
  if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1;
  if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  p.x = clamp(p.x + mx * p.st.speed * dt, p.r + 4, W - p.r - 4);
  p.y = clamp(p.y + my * p.st.speed * dt, p.r + 4, H - p.r - 4);
  p.inv = Math.max(0, p.inv - dt); p.noHit += dt;
  for (const kk in p.pw) p.pw[kk] = Math.max(0, p.pw[kk] - dt);
  if (p.st.maxShield > 0 && p.noHit > 2) p.shield = Math.min(p.st.maxShield, p.shield + p.st.shieldRegen * dt);
  p.trail -= dt; if (p.trail <= 0 && ml > .1) { p.trail = .03; G.parts.push({ x: p.x - Math.cos(p.angle) * 10, y: p.y - Math.sin(p.angle) * 10, vx: -mx * 60 + rand(-20, 20), vy: -my * 60 + rand(-20, 20), life: .35, max: .35, col: '#38bdf8', size: 2.5 }); }

  // --- visée ---
  let aim = null, firing = false;
  if (input.aim.id !== null && input.aim.mag > .2) { aim = input.aim.ang; firing = true; }
  else if (input.mouse.down) { aim = Math.atan2(input.mouse.y / SCALE - p.y, input.mouse.x / SCALE - p.x); firing = true; }
  else if (save.autoFire || k.Space) {
    const t = nearestEnemy(p.x, p.y, save.autoFire ? 520 : 1e9);
    if (t) { aim = Math.atan2(t.y - p.y, t.x - p.x); firing = true; }
    else if (input.mouse.used) aim = Math.atan2(input.mouse.y / SCALE - p.y, input.mouse.x / SCALE - p.x);
  } else if (input.mouse.used) aim = Math.atan2(input.mouse.y / SCALE - p.y, input.mouse.x / SCALE - p.x);
  if (aim === null && ml > .1) aim = Math.atan2(my, mx);
  if (aim !== null) p.angle += angDiff(p.angle, aim) * Math.min(1, dt * 20);
  if (G.done) firing = false;

  p.cd -= dt;
  p.laserOn = false;
  if (p.weapon === 'laser') {
    if (firing) {
      p.laserOn = true;
      const l = save.weapons.laser || 1, dps = (42 + 18 * l) * p.st.dmg * (p.pw.dmg > 0 ? 2 : 1) * (p.pw.rapid > 0 ? 1.5 : 1);
      const len = 700, wdt = 4 + l * 1.5;
      const x2 = p.x + Math.cos(p.angle) * len, y2 = p.y + Math.sin(p.angle) * len;
      p.lw = wdt;
      for (const e of G.enemies) {
        if (e.hp > 0 && segDist(e.x, e.y, p.x, p.y, x2, y2) < e.r + wdt) {
          hurtEnemy(e, dps * dt);
          if (Math.random() < .3) G.parts.push({ x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r), vx: rand(-80, 80), vy: rand(-80, 80), life: .25, max: .25, col: '#f472b6', size: 2 });
        }
      }
      if (AC && save.sound && Math.random() < dt * 8) tone(rand(600, 700), .08, 'sawtooth', .015);
    }
  } else if (firing && p.cd <= 0) fireWeapon(p, p.angle);

  // --- balles joueur ---
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    if (b.homing) {
      b.rt -= dt;
      if (b.rt <= 0 || !b.tgt || b.tgt.hp <= 0) { b.tgt = nearestEnemy(b.x, b.y, 600); b.rt = .15; }
      if (b.tgt) { const ta = Math.atan2(b.tgt.y - b.y, b.tgt.x - b.x); b.a += clamp(angDiff(b.a, ta), -6 * dt, 6 * dt); }
      b.spd = Math.min(b.spd + 400 * dt, 560); b.vx = Math.cos(b.a) * b.spd; b.vy = Math.sin(b.a) * b.spd;
      if (Math.random() < .6) G.parts.push({ x: b.x, y: b.y, vx: rand(-20, 20), vy: rand(-20, 20), life: .3, max: .3, col: '#fdba74', size: 2 });
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    let dead = b.life <= 0 || b.x < -20 || b.y < -20 || b.x > W + 20 || b.y > H + 20;
    if (!dead) {
      for (const e of G.enemies) {
        if (e.hp <= 0) continue;
        if (b.hits && b.hits.has(e.id)) continue;
        const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
        if (dx * dx + dy * dy < rr * rr) {
          if (b.explode && !b.pierce) { explode(b.x, b.y, b.explode, b.dmg, b.col); dead = true; break; }
          hurtEnemy(e, b.dmg);
          burst(b.x, b.y, b.col, 3, 90, 2);
          if (b.pierce) { b.hits.add(e.id); } else { dead = true; break; }
        }
      }
    }
    if (dead) {
      if (b.plasma) explode(b.x, b.y, b.explode, b.dmg * .8, b.col);
      else if (b.explode && b.life <= 0) explode(b.x, b.y, b.explode * .7, b.dmg * .5, b.col);
      G.bullets.splice(i, 1);
    }
  }

  // --- ennemis ---
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    e.t += dt; e.flash = Math.max(0, e.flash - dt); e.rot += dt * (e.type === 'boss' ? .6 : 2);
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    let tvx = 0, tvy = 0, steer = 4;
    switch (e.ai) {
      case 'chase': tvx = ux * e.spd; tvy = uy * e.spd; steer = e.type === 'mini' ? 3 : 4; break;
      case 'dash':
        e.cd -= dt;
        if (e.state === 0) { tvx = ux * e.spd; tvy = uy * e.spd; if (d < 230 && e.cd <= 0) { e.state = 1; e.st = .55; e.da = Math.atan2(dy, dx); } }
        else if (e.state === 1) { e.st -= dt; tvx = tvy = 0; steer = 10; if (e.st <= 0) { e.state = 2; e.st = .38; } }
        else { e.st -= dt; tvx = Math.cos(e.da) * e.spd * 6.5; tvy = Math.sin(e.da) * e.spd * 6.5; steer = 20; if (e.st <= 0) { e.state = 0; e.cd = rand(1.2, 2); } }
        break;
      case 'shoot': {
        const want = 230, mv = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
        tvx = (ux * mv - uy * .6 * e.side) * e.spd; tvy = (uy * mv + ux * .6 * e.side) * e.spd;
        if (Math.random() < dt * .3) e.side *= -1;
        e.st -= dt;
        if (e.st <= 0) { e.st = rand(1.4, 2.4) / Math.sqrt(G.diff.spd); eBullet(e.x, e.y, Math.atan2(dy, dx), 210 * G.diff.spd, e.dmg, 5, '#c4b5fd'); }
        break;
      }
      case 'orbit': {
        e.oa += dt * .9 * e.side;
        const tx = p.x + Math.cos(e.oa) * 175, ty = p.y + Math.sin(e.oa) * 175;
        const ex = tx - e.x, ey = ty - e.y, el = Math.hypot(ex, ey) || 1;
        tvx = ex / el * e.spd; tvy = ey / el * e.spd;
        e.st -= dt;
        if (e.st <= 0) { e.st = rand(2, 3); e.burst = 3; e.bt = 0; }
        if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = .14; e.burst--; eBullet(e.x, e.y, Math.atan2(dy, dx), 240 * G.diff.spd, e.dmg, 4, '#f9a8d4'); } }
        break;
      }
      case 'boss': bossAI(e, dt, d, ux, uy); tvx = e.tvx; tvy = e.tvy; steer = e.steer; break;
    }
    e.vx += (tvx - e.vx) * Math.min(1, steer * dt); e.vy += (tvy - e.vy) * Math.min(1, steer * dt);
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.x = clamp(e.x, e.r, W - e.r); e.y = clamp(e.y, e.r, H - e.r);
    if (d < e.r + p.r) { hurtPlayer(e.dmg); if (e.type !== 'boss') { e.vx = -ux * 300; e.vy = -uy * 300; } }
  }
  // séparation
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j], dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 < rr * rr && d2 > 0.01) {
      const d = Math.sqrt(d2), o = (rr - d) / 2, nx = dx / d, ny = dy / d;
      const wa = a.type === 'boss' ? 0 : 1, wb = b.type === 'boss' ? 0 : 1;
      a.x -= nx * o * wa * (wb ? 1 : 2); a.y -= ny * o * wa * (wb ? 1 : 2);
      b.x += nx * o * wb * (wa ? 1 : 2); b.y += ny * o * wb * (wa ? 1 : 2);
    }
  }
  G.enemies = G.enemies.filter(e => e.hp > 0);

  // --- balles ennemies ---
  for (let i = G.ebullets.length - 1; i >= 0; i--) {
    const b = G.ebullets[i];
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -20 || b.y < -20 || b.x > W + 20 || b.y > H + 20) { G.ebullets.splice(i, 1); continue; }
    const rr = b.r + p.r - 3;
    if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < rr * rr) {
      if (p.pw.shield > 0) { burst(b.x, b.y, '#93c5fd', 4, 80); G.ebullets.splice(i, 1); continue; }
      if (p.inv <= 0) { hurtPlayer(b.dmg); G.ebullets.splice(i, 1); }
    }
  }

  // --- bonus ---
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const c = G.pickups[i];
    c.life -= dt; c.vx *= Math.pow(.05, dt); c.vy *= Math.pow(.05, dt);
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1;
    const mag = G.done ? 2000 : (c.type === 'coin' ? p.st.magnet : 40);
    if (d < mag) { const f = (1 - d / (mag + 1)) * 1400 + 300; c.vx += dx / d * f * dt; c.vy += dy / d * f * dt; }
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.x = clamp(c.x, 6, W - 6); c.y = clamp(c.y, 6, H - 6);
    if (d < p.r + c.r + 4) {
      if (c.type === 'coin') { G.coins += c.v; sfx('coin'); }
      else if (c.type === 'heal') { const h = p.st.maxHp * .3; p.hp = Math.min(p.st.maxHp, p.hp + h); floatText(p.x, p.y - 26, '+' + Math.round(h) + ' PV', '#4ade80'); sfx('power'); }
      else { p.pw[c.type] = 8; floatText(p.x, p.y - 26, { rapid: 'TIR RAPIDE', dmg: 'DÉGÂTS ×2', shield: 'INVINCIBLE' }[c.type], PW_COL[c.type], 16); sfx('power'); vibe(30); }
      G.pickups.splice(i, 1); continue;
    }
    if (c.life <= 0) G.pickups.splice(i, 1);
  }

  // --- particules / textes ---
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i]; q.life -= dt;
    if (q.life <= 0) { G.parts.splice(i, 1); continue; }
    if (!q.ring) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(.1, dt); q.vy *= Math.pow(.1, dt); }
  }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y -= 30 * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
  G.shake = Math.max(0, G.shake - dt * 30);
}
const PW_COL = { rapid: '#fde047', dmg: '#f43f5e', shield: '#60a5fa' };

function bossAI(e, dt, d, ux, uy) {
  const p = G.player, ph2 = e.hp < e.maxHp * .5, df = G.diff;
  e.steer = 2;
  if (e.charge > 0) {
    e.charge -= dt;
    if (e.charge > .9) { e.tvx = 0; e.tvy = 0; e.steer = 8; e.ca = Math.atan2(p.y - e.y, p.x - e.x); }
    else { e.tvx = Math.cos(e.ca) * 520 * df.spd; e.tvy = Math.sin(e.ca) * 520 * df.spd; e.steer = 6; }
    return;
  }
  // déplacement : erre autour de la zone haute / suit le joueur de loin
  if (Math.hypot(e.tx - e.x, e.ty - e.y) < 30 || Math.random() < dt * .3) { e.tx = rand(80, W - 80); e.ty = rand(80, H * .6); }
  const ex = e.tx - e.x, ey = e.ty - e.y, el = Math.hypot(ex, ey) || 1;
  e.tvx = ex / el * e.spd; e.tvy = ey / el * e.spd;
  if (e.spiral > 0) {
    e.spiral -= dt; e.sct = (e.sct || 0) - dt;
    if (e.sct <= 0) {
      e.sct = ph2 ? .06 : .09; e.sa = (e.sa || 0) + .33;
      const arms = ph2 ? 3 : 2;
      for (let i = 0; i < arms; i++) eBullet(e.x, e.y, e.sa + i * TAU / arms, 150 * df.spd, e.dmg * .45, 6, e.col);
    }
  }
  e.pt -= dt;
  if (e.pt <= 0) {
    const pat = e.patterns[e.pi++ % e.patterns.length];
    e.pt = (ph2 ? 1.5 : 2.3) / Math.sqrt(df.spd);
    const pa = Math.atan2(p.y - e.y, p.x - e.x);
    switch (pat) {
      case 'ring': { const n = (ph2 ? 22 : 16) + G.world * 2, o = Math.random(); for (let i = 0; i < n; i++) eBullet(e.x, e.y, o + i * TAU / n, 150 * df.spd, e.dmg * .5, 7, e.col); break; }
      case 'aimed': { const n = ph2 ? 7 : 5; for (let i = 0; i < n; i++) eBullet(e.x, e.y, pa + (i - (n - 1) / 2) * .16, 240 * df.spd, e.dmg * .5, 6, '#fff'); break; }
      case 'spiral': e.spiral = 2.2; e.pt += 1.4; break;
      case 'summon': { const n = ph2 ? 4 : 3; for (let i = 0; i < n; i++) { const a = i * TAU / n; G.warns.push({ x: clamp(e.x + Math.cos(a) * 80, 30, W - 30), y: clamp(e.y + Math.sin(a) * 80, 30, H - 30), type: G.world >= 2 && i % 2 ? 'dasher' : 'drone', t: .7, max: .7 }); } break; }
      case 'charge': e.charge = 1.6; e.pt += .8; break;
    }
  }
}

/* ---------------- rendu ---------------- */
function drawShape(shape, r) {
  ctx.beginPath();
  const poly = (n, rr, off) => { for (let i = 0; i < n; i++) { const a = off + i * TAU / n; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); };
  switch (shape) {
    case 'tri': poly(3, r, 0); break;
    case 'dia': ctx.moveTo(r * 1.3, 0); ctx.lineTo(0, r * .7); ctx.lineTo(-r, 0); ctx.lineTo(0, -r * .7); ctx.closePath(); break;
    case 'sq': poly(4, r * 1.1, Math.PI / 4); break;
    case 'hex': poly(6, r, 0); break;
    case 'oct': poly(8, r, Math.PI / 8); break;
    case 'ring': ctx.arc(0, 0, r, 0, TAU); ctx.moveTo(r * .45, 0); ctx.arc(0, 0, r * .45, 0, TAU); break;
    case 'boss': for (let i = 0; i < 16; i++) { const a = i * TAU / 16, rr = i % 2 ? r * .72 : r; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(rr, 0); } ctx.closePath(); break;
    default: ctx.arc(0, 0, r, 0, TAU);
  }
}
function glow(x, y, r, col, a) { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }

function render() {
  const wd = G ? WORLDS[G.world] : WORLDS[0];
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = wd.bg; ctx.fillRect(0, 0, SW, SH);
  if (!G) return;
  const p = G.player;
  const sx = G.shake ? rand(-G.shake, G.shake) : 0, sy = G.shake ? rand(-G.shake, G.shake) : 0;
  ctx.setTransform(DPR * SCALE, 0, 0, DPR * SCALE, DPR * sx, DPR * sy);

  // étoiles + grille
  for (const s of stars) {
    const x = (s.x - (p.x - W / 2) * s.z * .15 + W) % W, y = (s.y - (p.y - H / 2) * s.z * .15 + H) % H;
    ctx.globalAlpha = .25 + s.z * .5; ctx.fillStyle = '#cbd5e1'; ctx.fillRect(x, y, s.z * 2, s.z * 2);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = wd.grid; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x <= W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.strokeStyle = wd.acc; ctx.globalAlpha = .5; ctx.lineWidth = 3; ctx.strokeRect(2, 2, W - 4, H - 4); ctx.globalAlpha = 1;

  // avertissements d'apparition
  for (const w of G.warns) {
    const k = 1 - w.t / w.max, r = EN[w.type].r * (w.type === 'boss' ? 1.4 : 1.8);
    ctx.strokeStyle = w.type === 'boss' ? '#f43f5e' : EN[w.type].col; ctx.lineWidth = 2; ctx.globalAlpha = .4 + .5 * Math.sin(k * 20) ** 2;
    ctx.beginPath(); ctx.arc(w.x, w.y, r * (1.6 - k * .6), 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(w.x, w.y, r * (1.6 - k * .6), -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.lineWidth = 4; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // bonus
  for (const c of G.pickups) {
    if (c.life < 3 && Math.floor(c.life * 8) % 2) continue;
    if (c.type === 'coin') {
      glow(c.x, c.y, c.r * 2, '#fde047', .18);
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(c.x, c.y - c.r); ctx.lineTo(c.x + c.r * .8, c.y); ctx.lineTo(c.x, c.y + c.r); ctx.lineTo(c.x - c.r * .8, c.y); ctx.closePath(); ctx.fill();
    } else {
      const col = c.type === 'heal' ? '#4ade80' : PW_COL[c.type], pulse = 1 + Math.sin(G.time * 6) * .12;
      glow(c.x, c.y, c.r * 2.2 * pulse, col, .2);
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * pulse, 0, TAU); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText({ heal: '+', rapid: '⚡', dmg: '×2', shield: '⬡' }[c.type], c.x, c.y + 1);
    }
  }

  // ennemis
  for (const e of G.enemies) {
    ctx.save(); ctx.translate(e.x, e.y);
    glow(0, 0, e.r * 1.9, e.col, e.type === 'boss' ? .14 : .12);
    if (e.ai === 'dash' && e.state === 1) glow(0, 0, e.r * 2.4, '#fff', .25);
    const faceA = e.ai === 'dash' && e.state ? e.da : Math.atan2(p.y - e.y, p.x - e.x);
    ctx.rotate(e.shape === 'tri' || e.shape === 'dia' ? faceA : e.rot);
    drawShape(e.shape, e.r);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : 'rgba(10,12,25,.85)'; ctx.fill('evenodd');
    ctx.strokeStyle = e.col; ctx.lineWidth = e.type === 'boss' ? 4 : 2.5; ctx.stroke();
    if (e.type === 'boss') {
      ctx.rotate(-e.rot * 2.5); drawShape('hex', e.r * .45); ctx.stroke();
      ctx.fillStyle = e.col; ctx.globalAlpha = .5 + .5 * Math.sin(G.time * 5); ctx.beginPath(); ctx.arc(0, 0, e.r * .2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      if (e.charge > .9) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, e.r * (1.3 + (1.6 - e.charge) * .6), 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
    if (e.type !== 'boss' && e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2, 3);
      ctx.fillStyle = e.col; ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2 * e.hp / e.maxHp, 3);
    }
  }

  ctx.globalCompositeOperation = 'lighter';
  // laser
  if (p.laserOn) {
    const len = 700, x2 = p.x + Math.cos(p.angle) * len, y2 = p.y + Math.sin(p.angle) * len, f = 1 + Math.sin(G.time * 60) * .2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(244,114,182,.35)'; ctx.lineWidth = p.lw * 3 * f; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#f9a8d4'; ctx.lineWidth = p.lw * f; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = p.lw * .35; ctx.stroke();
  }
  // balles joueur
  for (const b of G.bullets) {
    if (b.plasma) { glow(b.x, b.y, b.r * 1.8, b.col, .3); glow(b.x, b.y, b.r, b.col, .7); glow(b.x, b.y, b.r * .5, '#fff', .8); continue; }
    ctx.strokeStyle = b.col; ctx.lineWidth = b.r * 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .022, b.y - b.vy * .022); ctx.stroke();
    glow(b.x, b.y, b.r * 2.2, b.col, .25);
  }
  // balles ennemies
  for (const b of G.ebullets) { glow(b.x, b.y, b.r * 2, b.col, .3); glow(b.x, b.y, b.r, '#fff', .9); }
  // particules
  for (const q of G.parts) {
    const k = q.life / q.max;
    if (q.ring) { ctx.strokeStyle = q.col; ctx.globalAlpha = k; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, q.r + (q.R - q.r) * (1 - k), 0, TAU); ctx.stroke(); }
    else { ctx.globalAlpha = k; ctx.fillStyle = q.col; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // joueur
  if (!(p.inv > 0 && Math.floor(p.inv * 20) % 2) && p.hp > 0) {
    ctx.save(); ctx.translate(p.x, p.y);
    glow(0, 0, p.r * 2.4, '#38bdf8', .15);
    if (p.shield > 0.5) { ctx.strokeStyle = 'rgba(96,165,250,' + (.25 + .5 * p.shield / p.st.maxShield) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, p.r + 7, 0, TAU); ctx.stroke(); }
    if (p.pw.shield > 0) { glow(0, 0, p.r + 12, '#60a5fa', .25 + .1 * Math.sin(G.time * 10)); }
    ctx.rotate(p.angle);
    ctx.beginPath(); ctx.moveTo(p.r * 1.35, 0); ctx.lineTo(-p.r * .9, p.r * .95); ctx.lineTo(-p.r * .45, 0); ctx.lineTo(-p.r * .9, -p.r * .95); ctx.closePath();
    ctx.fillStyle = '#0b1324'; ctx.fill(); ctx.strokeStyle = WEAPONS[p.weapon].col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(p.r * .2, 0, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // textes flottants
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of G.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.fillStyle = t.col; ctx.font = 'bold ' + t.size + 'px system-ui'; ctx.fillText(t.t, t.x, t.y); }
  ctx.globalAlpha = 1;

  drawHUD();
}

function bar(x, y, w, h, k, col, bg) {
  ctx.fillStyle = bg || 'rgba(255,255,255,.12)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
}
function drawHUD() {
  const p = G.player;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const top = SAFE_T + 10, left = SAFE_L + 12;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  // PV
  bar(left, top, 150, 12, p.hp / p.st.maxHp, p.hp / p.st.maxHp < .3 ? '#ef4444' : '#22c55e');
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.fillText(Math.ceil(p.hp) + ' / ' + p.st.maxHp, left + 4, top + 6.5);
  let y = top + 16;
  if (p.st.maxShield > 0) { bar(left, y, 150, 5, p.shield / p.st.maxShield, '#60a5fa'); y += 9; }
  ctx.font = 'bold 15px system-ui'; ctx.fillStyle = '#fde047'; ctx.fillText('◆ ' + G.coins, left, y + 10);
  // arme
  const w = WEAPONS[p.weapon];
  ctx.fillStyle = w.col; ctx.font = 'bold 12px system-ui'; ctx.fillText(w.ic + ' ' + w.name + ' niv.' + (save.weapons[p.weapon] || 1), left, y + 30);
  // bonus actifs
  let bx = left;
  for (const k in p.pw) if (p.pw[k] > 0) {
    bar(bx, y + 44, 44, 5, p.pw[k] / 8, PW_COL[k]);
    ctx.fillStyle = PW_COL[k]; ctx.font = 'bold 10px system-ui'; ctx.fillText({ rapid: 'RAPIDE', dmg: 'DÉG×2', shield: 'INVUL' }[k], bx, y + 56); bx += 50;
  }
  // niveau / vague
  const wide = SW >= 620, ly = wide ? top + 4 : SH - 34;
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,' + (wide ? .85 : .5) + ')'; ctx.font = 'bold 13px system-ui';
  ctx.fillText('NIV. ' + G.n + ' · ' + G.diff.name.toUpperCase(), SW / 2, ly);
  ctx.font = '11px system-ui'; ctx.fillStyle = 'rgba(255,255,255,' + (wide ? .6 : .4) + ')';
  ctx.fillText('Vague ' + Math.max(1, Math.min(G.wave + 1, G.waves.length)) + '/' + G.waves.length + ' · ' + WORLDS[G.world].name, SW / 2, ly + 16);
  // boss
  const b = G.bossRef;
  if (b && b.hp > 0) {
    const bw = Math.min(SW - 40, 420), bxx = (SW - bw) / 2, by = wide ? top + 34 : top + 92;
    ctx.fillStyle = b.col; ctx.font = 'bold 12px system-ui'; ctx.fillText(b.name.toUpperCase(), SW / 2, by + 2);
    bar(bxx, by + 11, bw, 8, b.hp / b.maxHp, b.col, 'rgba(0,0,0,.5)');
  }
  // bannière
  if (G.banner) {
    const k = G.banner.life, a = Math.min(1, k * 2, (2 - k) * 4);
    ctx.globalAlpha = a; ctx.fillStyle = G.banner.col; ctx.font = '900 ' + Math.min(38, SW / 12) + 'px system-ui';
    ctx.fillText(G.banner.t, SW / 2, SH * .4); ctx.globalAlpha = 1;
  }
  // joysticks
  for (const s of [input.move, input.aim]) {
    if (s.id === null) continue;
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.ox, s.oy, JR, 0, TAU); ctx.stroke();
    ctx.fillStyle = s === input.aim ? 'rgba(244,114,182,.4)' : 'rgba(94,234,212,.4)'; ctx.beginPath(); ctx.arc(s.x, s.y, 24, 0, TAU); ctx.fill();
  }
  // aide au premier niveau
  if (G.n === 1 && G.time < 6 && 'ontouchstart' in window) {
    ctx.globalAlpha = Math.min(1, 6 - G.time); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '13px system-ui';
    ctx.fillText('◀ glisse ici pour bouger', SW * .25, SH - 60); ctx.fillText('glisse ici pour viser ▶', SW * .75, SH - 60); ctx.globalAlpha = 1;
  }
}

/* ---------------- fin de niveau ---------------- */
function winLevel() {
  if (G.done) return;
  G.done = true; G.endT = 1.6; G.win = true;
  G.banner = { t: 'NIVEAU TERMINÉ !', life: 2, col: '#4ade80' };
  sfx('win');
}
function gameOver() {
  if (G.done) return;
  G.done = true; G.win = false;
  burst(G.player.x, G.player.y, '#38bdf8', 60, 300); G.shake = 15; sfx('lose'); vibe(250);
  setTimeout(() => { if (G && state === 'play') showResult(false); }, 1300);
}
function showResult(win) {
  const p = G.player, n = G.n;
  let bonus = 0, st = 0;
  if (win) {
    bonus = Math.round((50 + 22 * n) * G.diff.rew);
    const k = p.hp / p.st.maxHp; st = k > .7 ? 3 : k > .35 ? 2 : 1;
    const key = curDiff + n; save.stars[key] = Math.max(save.stars[key] || 0, st);
    if (n < NLEVELS) save.unlocked[curDiff] = Math.max(save.unlocked[curDiff], n + 1);
  }
  const total = G.coins + bonus;
  save.credits += total; persist();
  setState('result');
  $('#resTitle').textContent = win ? (n === NLEVELS ? '🏆 VICTOIRE TOTALE !' : 'Niveau ' + n + ' terminé !') : 'Vaisseau détruit';
  $('#resTitle').style.color = win ? '#4ade80' : '#f87171';
  $('#resStars').textContent = win ? '★'.repeat(st) + '☆'.repeat(3 - st) : '';
  $('#resBody').innerHTML = 'Ennemis détruits : <b>' + G.kills + '</b><br>Crédits ramassés : <b>' + G.coins + ' ¢</b>' +
    (win ? '<br>Bonus de niveau : <b>+' + bonus + ' ¢</b>' : '<br><small>Tes crédits ramassés sont conservés.</small>') +
    '<br>Total : <b style="color:#fde047">' + save.credits + ' ¢</b>';
  const next = $('#resNext');
  if (win && n < NLEVELS) { next.textContent = '▶ Niveau suivant'; next.onclick = () => startLevel(n + 1); }
  else if (win) { next.textContent = '↻ Rejouer'; next.onclick = () => startLevel(n); }
  else { next.textContent = '↻ Réessayer'; next.onclick = () => startLevel(n); }
}

/* ---------------- interface ---------------- */
const $ = s => document.querySelector(s);
const screens = ['menu', 'diff', 'levels', 'shop', 'options', 'pause', 'result'];
let shopReturn = 'menu';
function show(id) {
  for (const s of screens) $('#' + s).classList.toggle('hidden', s !== id);
  document.querySelectorAll('.credits').forEach(el => el.textContent = save.credits);
  if (id === 'diff') buildDiff();
  if (id === 'levels') buildLevels();
  if (id === 'shop') buildShop();
  if (id === 'options') buildOptions();
}
function setState(s) {
  state = s;
  $('#hudBtns').classList.toggle('hidden', s !== 'play');
  if (s === 'play') { for (const id of screens) $('#' + id).classList.add('hidden'); resetInput(); }
  else if (s === 'menu') { G = null; show('menu'); }
  else show(s);
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
  initAudio();
  const go = b.dataset.go;
  if (go === 'shop') shopReturn = $('#levels').classList.contains('hidden') ? 'menu' : 'levels';
  if (go === 'menu') setState('menu'); else { state = go; show(go); }
}));

function buildDiff() {
  const box = $('#diffList'); box.innerHTML = '';
  for (const k in DIFFS) {
    const d = DIFFS[k], b = document.createElement('button');
    b.className = 'big alt diffbtn'; b.style.boxShadow = 'inset 0 0 0 2px ' + d.col;
    b.innerHTML = '<span style="color:' + d.col + '">' + d.name + '</span><small>' + d.desc + ' · niv. ' + save.unlocked[k] + '/' + NLEVELS + '</small>';
    b.onclick = () => { curDiff = k; state = 'levels'; show('levels'); };
    box.appendChild(b);
  }
}
function buildLevels() {
  const d = DIFFS[curDiff];
  $('#levelsTitle').innerHTML = 'Niveaux · <span style="color:' + d.col + '">' + d.name + '</span>';
  const g = $('#levelGrid'); g.innerHTML = '';
  for (let w = 0; w < 3; w++) {
    const sec = document.createElement('div'); sec.className = 'world';
    sec.innerHTML = '<h3 style="color:' + WORLDS[w].acc + '">Monde ' + (w + 1) + ' · ' + WORLDS[w].name + '</h3>';
    const grid = document.createElement('div'); grid.className = 'grid';
    for (let i = 1; i <= 5; i++) {
      const n = w * 5 + i, locked = n > save.unlocked[curDiff], st = save.stars[curDiff + n] || 0;
      const b = document.createElement('button');
      b.className = 'lvl' + (n % 5 === 0 ? ' boss' : '') + (locked ? ' locked' : '');
      b.innerHTML = (locked ? '🔒' : (n % 5 === 0 ? '☠' : n)) + '<small>' + (locked ? '' : '★'.repeat(st) + '☆'.repeat(3 - st)) + '</small>';
      if (!locked) b.onclick = () => { initAudio(); startLevel(n); };
      grid.appendChild(b);
    }
    sec.appendChild(grid); g.appendChild(sec);
  }
}
let shopTab = 'weapons';
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { shopTab = t.dataset.tab; buildShop(); }));
$('#shopBack').onclick = () => { state = shopReturn; show(shopReturn); if (shopReturn === 'menu') setState('menu'); };
$('#resShop').onclick = () => { shopReturn = 'levels'; state = 'shop'; G = null; show('shop'); };
$('#resLevels').onclick = () => { state = 'levels'; G = null; show('levels'); };
function pips(l, max) { let s = '<div class="pips">'; for (let i = 0; i < max; i++) s += '<i class="' + (i < l ? 'on' : '') + '"></i>'; return s + '</div>'; }
function buildShop() {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === shopTab));
  document.querySelectorAll('.credits').forEach(el => el.textContent = save.credits);
  const list = $('#shopList'); list.innerHTML = '';
  if (shopTab === 'weapons') {
    for (const k of WORDER) {
      const w = WEAPONS[k], l = save.weapons[k] || 0, c = document.createElement('div'); c.className = 'card';
      c.innerHTML = '<div class="ic" style="color:' + w.col + '">' + w.ic + '</div><div class="info"><b style="color:' + w.col + '">' + w.name + '</b><small>' + w.desc + '</small>' + (l ? pips(l, WMAX) : '') + '</div><div class="acts"></div>';
      const acts = c.querySelector('.acts');
      if (!l) {
        acts.appendChild(btn('Acheter ' + w.price + ' ¢', save.credits >= w.price ? '' : 'off', () => buy(w.price, () => { save.weapons[k] = 1; save.equipped = k; })));
      } else {
        acts.appendChild(btn(save.equipped === k ? '✓ Équipée' : 'Équiper', 'eq', () => { save.equipped = k; persist(); buildShop(); }));
        if (l < WMAX) { const cost = weaponUpCost(k); acts.appendChild(btn('Niv.' + (l + 1) + ' · ' + cost + ' ¢', save.credits >= cost ? '' : 'off', () => buy(cost, () => { save.weapons[k] = l + 1; }))); }
        else acts.appendChild(btn('MAX', 'off', null));
      }
      list.appendChild(c);
    }
  } else {
    for (const k in UPS) {
      const u = UPS[k], l = save.up[k], c = document.createElement('div'); c.className = 'card';
      c.innerHTML = '<div class="ic">' + u.ic + '</div><div class="info"><b>' + u.name + '</b><small>' + u.desc + '</small>' + pips(l, UMAX) + '</div><div class="acts"></div>';
      const acts = c.querySelector('.acts');
      if (l < UMAX) { const cost = upCost(k); acts.appendChild(btn(cost + ' ¢', save.credits >= cost ? '' : 'off', () => buy(cost, () => { save.up[k]++; }))); }
      else acts.appendChild(btn('MAX', 'off', null));
      list.appendChild(c);
    }
  }
}
function btn(txt, cls, fn) { const b = document.createElement('button'); b.className = 'buy ' + cls; b.textContent = txt; if (fn) b.onclick = fn; return b; }
function buy(cost, fn) {
  if (save.credits < cost) { vibe(40); return; }
  save.credits -= cost; fn(); persist(); sfx('buy'); vibe(20); buildShop();
}
function buildOptions() {
  $('#optAuto').textContent = 'Tir automatique : ' + (save.autoFire ? 'OUI' : 'NON');
  $('#optSound').textContent = 'Son : ' + (save.sound ? 'OUI' : 'NON');
  $('#optVibe').textContent = 'Vibrations : ' + (save.vibe ? 'OUI' : 'NON');
}
$('#optAuto').onclick = () => { save.autoFire = !save.autoFire; persist(); buildOptions(); };
$('#optSound').onclick = () => { save.sound = !save.sound; persist(); buildOptions(); };
$('#optVibe').onclick = () => { save.vibe = !save.vibe; persist(); buildOptions(); };
$('#optReset').onclick = () => { if (confirm('Effacer toute la progression ?')) { save = JSON.parse(JSON.stringify(DEFAULT_SAVE)); persist(); buildOptions(); } };

function pauseGame() { if (state === 'play' && G && !G.done) setState('pause'); }
function resumeGame() { if (state === 'pause') setState('play'); }
$('#btnPause').onclick = pauseGame;
$('#btnSwap').onclick = swapWeapon;
$('#btnResume').onclick = resumeGame;
$('#btnRestart').onclick = () => startLevel(G.n);
$('#btnQuit').onclick = () => { if (G && G.coins) { save.credits += G.coins; persist(); } G = null; state = 'levels'; show('levels'); $('#hudBtns').classList.add('hidden'); };
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

/* ---------------- boucle ---------------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state === 'play' && G) update(dt);
  if (G) render(); else { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, SW, SH); }
  requestAnimationFrame(frame);
}
resize();
setState('menu');
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
