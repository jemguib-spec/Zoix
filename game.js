'use strict';
/* ===================== VIRUS DÉFENSE — tower defense pour mobile ===================== */

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const $ = s => document.querySelector(s);
const COLS = 26, ROWS = 15, TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

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
    paths: [[[0, 2], [17, 2], [17, 6], [6, 6], [6, 10], [25, 10]], [[0, 13], [3, 13], [3, 8], [13, 8], [13, 6]]] },
  { name: 'Carte graphique', base: '#62309a', acc: '#e0aaff', waves: 35,
    paths: [[[2, 0], [2, 12], [6, 12], [6, 2], [10, 2], [10, 12], [14, 12], [14, 2], [25, 2]], [[18, 14], [18, 4], [23, 4], [23, 8], [20, 8], [20, 12], [25, 12]]] },
  { name: 'Processeur central', base: '#1e5296', acc: '#90e0ef', waves: 40,
    paths: [[[4, 0], [4, 3], [22, 3], [22, 7], [13, 7]], [[21, 14], [21, 11], [3, 11], [3, 7], [13, 7]]] },
  { name: 'Disque dur', base: '#3a3f47', acc: '#ff9100', waves: 35,
    paths: [[[0, 7], [5, 7], [5, 2], [20, 2], [20, 12], [9, 12], [9, 5], [16, 5], [16, 9], [12, 9]], [[25, 13], [23, 13], [23, 7], [14, 7], [14, 9]]] },
  { name: 'Carte réseau', base: '#0e5c73', acc: '#4dd0e1', waves: 35,
    paths: [[[0, 1], [12, 1], [12, 5], [4, 5], [4, 9], [16, 9], [16, 13], [25, 13]], [[25, 7], [23, 7], [23, 1], [15, 1], [15, 7], [18, 7], [18, 9], [16, 9]]] },
  { name: 'Carte son', base: '#7a5a12', acc: '#ffe082', waves: 40,
    paths: [[[0, 13], [4, 13], [4, 10], [8, 10], [8, 7], [12, 7], [12, 4], [16, 4], [16, 1], [22, 1], [22, 13], [25, 13]], [[0, 1], [10, 1], [10, 10], [19, 10], [19, 4], [25, 4]]] },
  { name: 'Serveur', base: '#14532d', acc: '#69f0ae', waves: 40,
    paths: [[[0, 1], [10, 1], [10, 5], [3, 5], [3, 9], [12, 9], [12, 14]], [[25, 1], [15, 1], [15, 5], [22, 5], [22, 9], [12, 9]], [[13, 0], [13, 7], [19, 7], [19, 11], [16, 11], [16, 13], [25, 13]]] },
  { name: 'Pare-feu', base: '#a33a0c', acc: '#ffab40', waves: 45,
    paths: [[[12, 0], [12, 3], [2, 3], [2, 12], [23, 12], [23, 3], [16, 3], [16, 9], [7, 9], [7, 6], [12, 6]], [[20, 0], [20, 14]], [[5, 14], [5, 0]]] },
  { name: 'Noyau quantique', base: '#24123f', acc: '#ea80fc', waves: 50,
    paths: [[[0, 1], [10, 1], [10, 3], [2, 3], [2, 5], [11, 5], [11, 7], [13, 7]], [[25, 1], [15, 1], [15, 3], [23, 3], [23, 5], [15, 5], [15, 7], [13, 7]], [[6, 14], [6, 12], [22, 12], [22, 9], [13, 9], [13, 7]]] },
  { name: 'Clé USB', base: '#0d47a1', acc: '#82b1ff', waves: 45,
    paths: [[[0, 4], [8, 4], [8, 1], [17, 1], [17, 8], [3, 8], [3, 12], [25, 12]], [[25, 3], [21, 3], [21, 10], [12, 10], [12, 5]]] },
  { name: 'Ventirad', base: '#455a64', acc: '#80deea', waves: 45,
    paths: [[[0, 2], [23, 2], [23, 6], [2, 6], [2, 10], [25, 10]], [[9, 0], [9, 13], [16, 13], [16, 0]]] },
  { name: 'Satellite', base: '#263238', acc: '#ffd740', waves: 45,
    paths: [[[0, 3], [6, 3], [6, 11], [12, 11], [12, 3], [18, 3], [18, 11], [25, 11]], [[3, 14], [3, 7], [22, 7], [22, 0]], [[15, 0], [15, 13], [25, 13]]] },
  { name: 'Robot', base: '#4a148c', acc: '#b388ff', waves: 50,
    paths: [[[0, 1], [10, 1], [10, 4], [3, 4], [3, 7], [12, 7]], [[25, 1], [15, 1], [15, 4], [22, 4], [22, 7], [12, 7]], [[0, 9], [2, 9], [2, 13], [11, 13], [11, 9], [12, 9], [12, 7]], [[25, 9], [23, 9], [23, 13], [14, 13], [14, 9], [12, 9]]] },
  { name: 'Data center', base: '#1b5e20', acc: '#ccff90', waves: 50,
    paths: [[[0, 2], [24, 2], [24, 12], [1, 12], [1, 5], [21, 5], [21, 9], [4, 9]], [[12, 0], [12, 14]]] },
  { name: 'Cœur de l\'IA', base: '#3e0f0f', acc: '#ff5252', waves: 60,
    paths: [[[0, 1], [11, 1], [11, 4], [2, 4], [2, 7], [12, 7]], [[25, 1], [14, 1], [14, 4], [23, 4], [23, 7], [12, 7]], [[6, 14], [6, 10], [19, 10], [19, 14]]] }
];
// fabrique la grille à partir des chemins : '#' circuit, '.' couloir, 'S' entrée, 'E' sortie
for (const m of MAPS) {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill('#'));
  for (const p of m.paths) for (let i = 0; i < p.length - 1; i++) {
    let [x, y] = p[i]; const [x2, y2] = p[i + 1];
    while (true) { g[y][x] = '.'; if (x === x2 && y === y2) break; x += Math.sign(x2 - x); y += Math.sign(y2 - y); }
  }
  // liste des cases de chaque chemin
  const tilesOf = p => { const out = []; for (let i = 0; i < p.length - 1; i++) { let [x, y] = p[i]; const [x2, y2] = p[i + 1]; while (true) { if (!out.length || out[out.length - 1][0] !== x || out[out.length - 1][1] !== y) out.push([x, y]); if (x === x2 && y === y2) break; x += Math.sign(x2 - x); y += Math.sign(y2 - y); } } return out; };
  const T = m.paths.map(tilesOf);
  // un chemin qui finit sur un autre chemin le rejoint et continue avec lui ; sinon il a sa propre sortie
  const build = (i, depth) => {
    const r = T[i], last = r[r.length - 1];
    for (let j = 0; j < T.length && depth < 4; j++) {
      if (j === i) continue;
      const k = T[j].findIndex(([x, y]) => x === last[0] && y === last[1]);
      if (k >= 0 && k < T[j].length - 1) return r.concat(build(j, depth + 1).slice(k + 1));
    }
    return r.slice();
  };
  m.routes = T.map((_, i) => build(i, 0));
  for (const r of m.routes) { const e = r[r.length - 1]; g[e[1]][e[0]] = 'E'; }
  for (const p of m.paths) { const [sx, sy] = p[0]; g[sy][sx] = 'S'; }
  // gros composants décoratifs (2x2) posés loin des couloirs : on ne peut pas construire dessus
  const Rn = mulberry(MAPS.indexOf(m) * 131 + 7); m.obst = [];
  for (let k = 0, tries = 0; k < 3 && tries < 400; tries++) {
    const x = 1 + Math.floor(Rn() * (COLS - 3)), y = 1 + Math.floor(Rn() * (ROWS - 3));
    let ok = true;
    for (let yy = y - 1; yy <= y + 2 && ok; yy++) for (let xx = x - 1; xx <= x + 2; xx++) if (g[yy] && g[yy][xx] !== undefined && g[yy][xx] !== '#') { ok = false; break; }
    if (!ok) continue;
    for (let yy = y; yy <= y + 1; yy++) for (let xx = x; xx <= x + 1; xx++) g[yy][xx] = 'X';
    m.obst.push({ kind: ['fan', 'sink', 'fan'][k], x, y }); k++;
  }
  m.g = g.map(r => r.join(''));
}

const DIFFS = {
  easy: { name: 'Facile', hp: .7, lives: 30, cash: 35, col: '#4ade80', desc: 'Virus fragiles · 30 vies' },
  normal: { name: 'Normal', hp: 1, lives: 20, cash: 25, col: '#60a5fa', desc: 'L\'expérience équilibrée · 20 vies' },
  hard: { name: 'Difficile', hp: 1.4, lives: 15, cash: 22, col: '#f97316', desc: 'Virus coriaces · 15 vies' },
  nightmare: { name: 'Cauchemar', hp: 1.75, lives: 10, cash: 20, col: '#ef4444', desc: 'Pour les experts · 10 vies' },
  legend: { name: 'Légende', hp: 2.5, lives: 5, cash: 22, col: '#e040fb', desc: 'Impossible ? · 5 vies' }
};

const TOWERS = {
  pulse: { name: 'Pulseur', cost: 5, range: 2.2, rate: 1.1, dmg: 6, col: '#b388ff', proj: 'bullet', spd: 9, desc: 'Pas cher : idéal pour couvrir les couloirs.' },
  gatling: { name: 'Mitrailleuse', short: 'Mitraill.', cost: 12, range: 2.3, rate: 4, dmg: 2.2, col: '#ff4fa3', proj: 'bullet', spd: 12, desc: 'Cadence de tir très rapide.' },
  cannon: { name: 'Canon', cost: 25, range: 2.8, rate: .65, dmg: 16, splash: 1, col: '#ffab40', proj: 'shell', spd: 6, ground: true, desc: 'Obus explosifs. Ne touche pas les volants.' },
  frost: { name: 'Cryo', cost: 35, range: 2.3, rate: 1, dmg: 2, slow: .5, slowT: 1.6, splash: .7, col: '#4fc3f7', proj: 'ice', spd: 8, desc: 'Gèle et ralentit les virus.' },
  laser: { name: 'Laser', cost: 100, range: 4.2, rate: .55, dmg: 75, col: '#ff3d3d', proj: 'beam', desc: 'Très longue portée, dégâts énormes.' },
  tesla: { name: 'Tesla', cost: 150, range: 2.8, rate: 1.1, dmg: 22, chain: 4, col: '#ffe600', proj: 'chain', desc: 'Éclair qui rebondit sur plusieurs virus.' },
  flame: { name: 'Lance-flammes', short: 'Flammes', cost: 60, range: 1.9, rate: 8, dmg: 1.4, burn: 5, col: '#ff6d00', proj: 'flame', desc: 'Brûle tous les virus devant lui.' },
  missile: { name: 'Lance-missiles', short: 'Missiles', cost: 90, range: 4.5, rate: .45, dmg: 42, splash: .9, col: '#ff5252', proj: 'missile', spd: 3, desc: 'Missiles à tête chercheuse, longue portée.' },
  boost: { name: 'Amplificateur', short: 'Ampli', cost: 120, range: 1.6, rate: 0, dmg: 0, col: '#00e676', proj: 'none', desc: 'Augmente les dégâts des tourelles voisines.' },
  miner: { name: 'Mineur crypto', short: 'Mineur', cost: 70, range: 0, rate: 0, dmg: 0, col: '#ffd740', proj: 'none', desc: 'Rapporte des crédits à chaque vague.' }
};
// ---- mondes : chaque groupe de 6 zones a son propre style de tourelles ----
const WORLDS = [
  { name: 'Vieux PC', style: 'retro', ic: '🏰', col: '#ffb74d' },
  { name: 'PC moderne', style: 'modern', ic: '💻', col: '#7df9ff' },
  { name: 'Futur quantique', style: 'neo', ic: '🛸', col: '#ea80fc' }
];
const worldOf = mi => WORLDS[Math.min(WORLDS.length - 1, Math.floor(mi / 6))];
let shopStyle = null;
const curStyle = () => shopStyle || (G ? worldOf(G.mi).style : 'modern');
// [nom, nom court, description]
const TNAMES = {
  retro: {
    pulse: ['Arbalète', 0, 'Pas chère : des carreaux pour couvrir les couloirs.'], gatling: ['Baliste', 0, 'Tire des volées de flèches très rapides.'],
    cannon: ['Catapulte', 0, 'Lance de gros rochers. Ne touche pas les volants.'], frost: ['Chaudron givré', 'Givre', 'Potion glacée qui ralentit les virus.'],
    flame: ['Tête de dragon', 'Dragon', 'Crache du feu sur tous les virus devant lui.'], missile: ['Trébuchet', 0, 'Boules de feu guidées, très longue portée.'],
    laser: ['Tour du mage', 'Mage', 'Rayon magique : longue portée, dégâts énormes.'], tesla: ['Pilier runique', 'Runes', 'Foudre magique qui rebondit sur plusieurs virus.'],
    boost: ['Tambour de guerre', 'Tambour', 'Encourage les tourelles voisines : plus de dégâts.'], miner: ['Coffre au trésor', 'Trésor', 'Rapporte des pièces d\'or à chaque vague.']
  },
  neo: {
    pulse: ['Blaster ionique', 'Blaster'], gatling: ['Plasma-rafale', 'Rafale'], cannon: ['Canon gravitique', 'Gravité'], frost: ['Champ de stase', 'Stase'],
    flame: ['Lance-plasma', 'Plasma'], missile: ['Essaim de drones', 'Drones'], laser: ['Rayon photonique', 'Photon'], tesla: ['Arc quantique', 'Arc'],
    boost: ['Nexus', 0], miner: ['Mineur quantique', 'Q-Mineur']
  }
};
const tName = (k, short) => { const n = (TNAMES[curStyle()] || {})[k]; return n ? (short && n[1] || n[0]) : (short && TOWERS[k].short || TOWERS[k].name); };
const tDesc = k => { const n = (TNAMES[curStyle()] || {})[k]; return n && n[2] || TOWERS[k].desc; };
const TORDER = ['pulse', 'gatling', 'cannon', 'frost', 'flame', 'missile', 'laser', 'tesla', 'boost', 'miner'];
const TMAX = 5, UPMULT = [.8, 1.4, 2.4, 4];
const SPECIAL = {
  pulse: 'Double tir : vise 2 virus à la fois',
  gatling: 'Balles perforantes : ignorent le blindage',
  cannon: 'Méga-obus : explosion géante qui étourdit',
  frost: 'Gel total : peut congeler les virus sur place',
  laser: 'Rayon perforant : traverse tous les virus alignés',
  tesla: 'Surcharge : +3 rebonds et étourdit',
  flame: 'Napalm : brûlure deux fois plus forte',
  missile: 'Salve : tire 3 missiles à la fois',
  boost: 'Surpuissance : +60 % de dégâts aux voisines',
  miner: 'Ferme de minage : gains doublés'
};
const MODES = ['first', 'last', 'strong', 'close'], MODE_NAMES = { first: 'Premier', last: 'Dernier', strong: 'Plus fort', close: 'Plus proche' };
function tStats(type, lvl) {
  const d = TOWERS[type], k = lvl - 1;
  return {
    dmg: d.dmg * Math.pow(1.55, k) * (1 + .08 * resLvl(type)), range: (d.range + .25 * k) * (1 + .03 * resLvl(type)), rate: d.rate * Math.pow(1.12, k),
    splash: d.splash ? (d.splash + .12 * k) * (lvl >= 5 && type === 'cannon' ? 1.5 : 1) : 0, slow: d.slow ? Math.max(.25, d.slow - .07 * k) : 0, slowT: d.slowT ? d.slowT + .3 * k : 0,
    chain: d.chain ? d.chain + k + (lvl >= 5 ? 3 : 0) : 0, special: lvl >= 5,
    burn: d.burn ? d.burn * Math.pow(1.4, k) * (lvl >= 5 ? 2 : 1) : 0,
    boost: type === 'boost' ? (lvl >= 5 ? .6 : .2 + .08 * k) : 0, gain: type === 'miner' ? (3 + 2 * k) * (lvl >= 5 ? 2 : 1) : 0
  };
}
const upCost = t => Math.round(TOWERS[t.type].cost * UPMULT[t.lvl - 1]);
/* ---------------- boutique (puces ⬢ gagnées à chaque partie) ---------------- */
const UNLOCK = { pulse: 0, gatling: 0, cannon: 0, frost: 60, flame: 90, missile: 130, laser: 170, tesla: 220, boost: 260, miner: 200 };
const RES_COST = [25, 45, 75, 115, 170];   // prix des 5 niveaux de recherche d'une tourelle
const GUP = {
  cash: { name: 'Budget de départ', ic: '💰', desc: '+8 crédits au début de chaque partie', cost: [30, 55, 90, 140, 210] },
  lives: { name: 'Pare-feu renforcé', ic: '❤', desc: '+2 vies au début de chaque partie', cost: [40, 70, 110, 160, 230] },
  rew: { name: 'Prime de virus', ic: '◆', desc: '+6 % de crédits par virus détruit', cost: [45, 80, 125, 180, 250] },
  wave: { name: 'Bonus de vague', ic: '⏩', desc: '+1 crédit à chaque nouvelle vague', cost: [25, 45, 75, 115, 165] },
  sell: { name: 'Revente', ic: '♻', desc: '+5 % du prix récupéré à la revente', cost: [20, 40, 65, 100, 150] }
};
const CHIP_MULT = { easy: .8, normal: 1, hard: 1.4, nightmare: 1.8, legend: 2.5 };
const isDemo = () => G && G.demo;
const resLvl = k => isDemo() ? 3 : ((save.research || {})[k] || 0);
const gup = k => isDemo() ? 0 : ((save.gup || {})[k] || 0);
const unlockedT = k => isDemo() || UNLOCK[k] === 0 || !!(save.unlockT || {})[k];
const tCost = k => Math.round(TOWERS[k].cost * (resLvl(k) >= 5 ? .9 : 1));
const maxLvl = k => resLvl(k) >= 2 ? TMAX : TMAX - 1;
const sellRate = () => .7 + .05 * gup('sell');

const ETYPES = {
  bug: { name: 'Virus', hp: 10, spd: 1.5, rew: 1, col: '#7ed957', r: .27, int: .8, n: 10 },
  runner: { name: 'Coureur', hp: 7, spd: 2.6, rew: 1, col: '#ffd23f', r: .23, int: .55, n: 10 },
  swarm: { name: 'Essaim', hp: 4, spd: 1.9, rew: 1, col: '#ff7ac6', r: .17, int: .28, n: 16 },
  armor: { name: 'Blindé', hp: 28, spd: .95, rew: 3, col: '#9aa5b1', r: .33, int: 1.2, n: 6, armor: 2 },
  flyer: { name: 'Volant', hp: 9, spd: 1.4, rew: 2, col: '#6ec6ff', r: .25, int: .9, n: 8, fly: true },
  regen: { name: 'Mutant', hp: 20, spd: 1.3, rew: 2, col: '#b388ff', r: .28, int: 1, n: 8, regen: .05 },
  splitter: { name: 'Diviseur', hp: 22, spd: 1.2, rew: 2, col: '#ff9e40', r: .3, int: 1, n: 8, split: true },
  mini: { name: 'Mini-virus', hp: 6, spd: 2.1, rew: 1, col: '#ffcc80', r: .16, int: .3, n: 1 },
  shield: { name: 'Bouclier', hp: 18, spd: 1.25, rew: 3, col: '#40c4ff', r: .28, int: 1, n: 8, shield: .8 },
  ghost: { name: 'Fantôme', hp: 15, spd: 1.6, rew: 3, col: '#e1f5fe', r: .26, int: .8, n: 9, ghost: true },
  healer: { name: 'Soigneur', hp: 22, spd: 1.1, rew: 3, col: '#ff80ab', r: .29, int: 1.3, n: 5, heal: .1 },
  giant: { name: 'Géant', hp: 95, spd: .62, rew: 7, col: '#a1887f', r: .43, int: 2.2, n: 3, lives: 2, armor: 1.5 },
  jumper: { name: 'Sauteur', hp: 13, spd: 1.3, rew: 2, col: '#b2ff59', r: .25, int: .9, n: 9, jump: true },
  boss: { name: 'MÉGA-VIRUS', hp: 260, spd: .7, rew: 25, col: '#ff3b3b', r: .45, int: 3, n: 1, lives: 5, armor: 3 }
};
function waveDef(w) {
  if (w % 10 === 0) return { type: 'boss', n: Math.ceil(w / 20) };
  const intro = { 1: 'bug', 3: 'runner', 5: 'swarm', 6: 'armor', 8: 'flyer', 12: 'regen', 14: 'splitter', 16: 'shield', 18: 'ghost', 21: 'healer', 24: 'giant', 27: 'jumper' };
  const avail = []; for (const k in intro) if (w >= +k) avail.push(intro[k]);
  const type = intro[w] || avail[(w * 7 + 3) % avail.length];
  const res = { type, n: Math.round(ETYPES[type].n * (1 + w * .025)) };
  if (w >= 9 && !intro[w]) { // à partir de la vague 9 : deux sortes de virus mélangées
    const t2 = avail[(w * 5 + 1) % avail.length];
    if (t2 !== type) { res.type2 = t2; res.n2 = Math.round(ETYPES[t2].n * (.45 + w * .012)); }
  }
  return res;
}
const hpScale = w => (1 + .13 * (w - 1) + .011 * (w - 1) * (w - 1));
const rewScale = w => 1 + (w - 1) * .04;

/* ---------------- sauvegarde ---------------- */
const SAVE_KEY = 'virusdef_save_v1';
const DEFAULT_SAVE = { chips: 50, unlockT: {}, research: {}, gup: {}, unlocked: { easy: 1, normal: 1, hard: 1, nightmare: 1, legend: 1 }, side: 'right', music: true, stars: {}, best: {}, sound: true, vibe: true, autoWave: true };
function loadSave() {
  const d = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) { Object.assign(d, s); d.unlocked = Object.assign({}, DEFAULT_SAVE.unlocked, s.unlocked); } } catch (e) { }
  return d;
}
let save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }

/* ---------------- son : bruitages synthétisés + musique générée ---------------- */
let AC = null, NOISE = null, MASTER = null, SFXG = null, MUSG = null, ECHO = null; const lastS = {};
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    NOISE = AC.createBuffer(1, AC.sampleRate * .6, AC.sampleRate);
    const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    MASTER = AC.createGain(); MASTER.gain.value = .9; MASTER.connect(comp).connect(AC.destination);
    SFXG = AC.createGain(); SFXG.gain.value = 1; SFXG.connect(MASTER);
    MUSG = AC.createGain(); MUSG.gain.value = 0; MUSG.connect(MASTER);
    // petit écho pour donner de l'espace
    ECHO = AC.createDelay(1); ECHO.delayTime.value = .22;
    const fb = AC.createGain(); fb.gain.value = .28; const ef = AC.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 2200;
    ECHO.connect(ef).connect(fb).connect(ECHO); const ew = AC.createGain(); ew.gain.value = .35; ef.connect(ew).connect(MASTER);
    MUS.next = AC.currentTime + .1;
  } catch (e) { AC = null; }
}
// oscillateur avec enveloppe ; dest = SFXG par défaut, at = instant de départ
function tone(f, dur, type, vol, f2, at, dest, echo) {
  const t = at || AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(.01, dur / 4)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(dest || SFXG); if (echo) g.connect(ECHO); o.start(t); o.stop(t + dur + .03);
}
function noise(dur, vol, freq, at, dest, type, f2) {
  const t = at || AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE; s.playbackRate.value = .8 + Math.random() * .4;
  f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(f2 || 80, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(dest || SFXG); s.start(t, Math.random() * .3); s.stop(t + dur + .02);
}
function sfx(n) {
  if (!AC || !save.sound || (G && G.demo)) return;
  const now = performance.now(); if (lastS[n] && now - lastS[n] < 70) return; lastS[n] = now;
  const t = AC.currentTime;
  switch (n) {
    case 'pulse': tone(880, .07, 'square', .025, 330); noise(.03, .03, 3000); break;
    case 'gatling': noise(.04, .05, 2500, 0, 0, 'bandpass', 900); tone(160, .04, 'square', .02, 90); break;
    case 'cannon': tone(110, .25, 'sine', .22, 40); noise(.3, .12, 1200); break;
    case 'frost': tone(2200, .18, 'sine', .03, 3300, 0, 0, true); tone(1650, .2, 'triangle', .02, 2600, t + .03); break;
    case 'laser': tone(2400, .22, 'sawtooth', .03, 180, 0, 0, true); tone(1200, .22, 'square', .015, 90); break;
    case 'tesla': noise(.16, .1, 5000, 0, 0, 'highpass', 1200); tone(70, .14, 'square', .035, 140); break;
    case 'missile': noise(.45, .07, 400, 0, 0, 'bandpass', 2500); tone(300, .4, 'sawtooth', .015, 900); break;
    case 'flame': noise(.12, .05, 900, 0, 0, 'lowpass', 300); break;
    case 'pop': tone(320, .09, 'sine', .07, 900); tone(640, .06, 'triangle', .03, 1400, t + .02); break;
    case 'boom': noise(.8, .3, 2600); tone(90, .7, 'sine', .22, 28); break;
    case 'leak': tone(440, .12, 'square', .05, 220); tone(330, .25, 'sawtooth', .05, 110, t + .1); break;
    case 'build': tone(220, .06, 'square', .04, 440); tone(660, .12, 'triangle', .05, 990, t + .05, 0, true); break;
    case 'up': [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .06, 0, t + i * .06, 0, true)); break;
    case 'sell': tone(1046, .08, 'sine', .06); tone(1568, .14, 'sine', .05, 0, t + .07, 0, true); break;
    case 'coin': tone(1318, .06, 'square', .02); tone(1976, .12, 'square', .02, 0, t + .05); break;
    case 'err': tone(180, .12, 'square', .05); tone(140, .16, 'square', .05, 0, t + .1); break;
    case 'wave': [392, 523, 659].forEach((f, i) => tone(f, .18, 'sawtooth', .04, 0, t + i * .09, 0, true)); break;
    case 'alarm': for (let i = 0; i < 3; i++) { tone(660, .22, 'square', .05, 440, t + i * .45); tone(880, .2, 'square', .03, 587, t + i * .45 + .22); } break;
    case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, .3, 'triangle', .08, 0, t + i * .11, 0, true)); break;
    case 'lose': [440, 392, 349, 294, 220].forEach((f, i) => tone(f, .4, 'sawtooth', .05, f * .97, t + i * .18, 0, true)); noise(1, .15, 1500, t + .9); break;
  }
}
function vibe(ms) { if (G && G.demo) return; if (save.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }

// --- musique : séquenceur simple (basse, arpège, mélodie, batterie) composé par le jeu ---
const MUS = { next: 0, step: 0, mode: 'menu', vol: 0 };
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
// 3 ambiances : menu (calme), jeu, boss (plus rapide et plus sombre). Accords = notes MIDI de la fondamentale.
const SONGS = {
  menu: { bpm: 92, chords: [57, 53, 60, 55], minor: [1, 0, 0, 0], drums: 0, lead: [0, 3, 7, 10, 7, 3, 5, 3] },
  game: { bpm: 120, chords: [57, 57, 53, 55, 57, 60, 55, 52], minor: [1, 1, 0, 0, 1, 0, 0, 1], drums: 1, lead: [12, 10, 7, 10, 12, 15, 14, 10] },
  boss: { bpm: 138, chords: [52, 52, 53, 50], minor: [1, 1, 0, 1], drums: 2, lead: [12, 13, 12, 10, 7, 8, 7, 3] }
};
function musicTick() {
  if (!AC) return;
  const want = save.music ? (state === 'pause' ? .35 : 1) * .32 : 0;
  MUS.vol += (want - MUS.vol) * .05; MUSG.gain.value = MUS.vol;
  if (MUS.vol < .002) { MUS.next = AC.currentTime + .05; return; }
  const mode = (G && !G.demo && (state === 'play' || state === 'pause')) ? ((G.enemies.some(e => e.type === 'boss') || G.alarm > 0) ? 'boss' : 'game') : 'menu';
  if (mode !== MUS.mode) { MUS.mode = mode; MUS.step = 0; }
  const S = SONGS[MUS.mode], spb = 60 / S.bpm / 4; // durée d'une double-croche
  if (MUS.next < AC.currentTime - .2) MUS.next = AC.currentTime + .02;
  while (MUS.next < AC.currentTime + .18) {
    const st = MUS.step, t = MUS.next, bar = Math.floor(st / 16) % S.chords.length, b = st % 16;
    const root = S.chords[bar], minor = S.minor[bar], third = minor ? 3 : 4, tri = [0, third, 7, 12];
    // basse
    if (b % 4 === 0 || (S.drums && b % 4 === 3 && b !== 15)) tone(NOTE(root - 24 + (b === 8 ? 7 : 0)), spb * (b % 4 ? 1 : 2.5), 'triangle', .5, 0, t, MUSG);
    // arpège
    if (S.drums || b % 2 === 0) tone(NOTE(root + tri[(b + bar) % 4] + 12), spb * 1.6, 'square', .07, 0, t, MUSG, true);
    // nappe (menu)
    if (!S.drums && b === 0) for (const iv of [0, third, 7]) tone(NOTE(root + iv), spb * 15, 'sine', .09, 0, t, MUSG);
    // mélodie (une note par temps, une mesure sur deux)
    if (bar % 2 === 1 && b % 4 === 0) { const n = S.lead[(b / 4 + bar * 2) % S.lead.length]; tone(NOTE(root + 12 + n - (minor ? 0 : (n === 3 || n === 15 ? -1 : 0))), spb * 3, 'sawtooth', .05, 0, t, MUSG, true); }
    // batterie
    if (S.drums) {
      if (b === 0 || b === 8 || (S.drums > 1 && (b === 6 || b === 10))) tone(150, .18, 'sine', .7, 40, t, MUSG);
      if (b === 4 || b === 12) noise(.14, .3, 2500, t, MUSG, 'bandpass', 900);
      if (b % 2 === 0) noise(.035, .12, 9000, t, MUSG, 'highpass', 6000);
    }
    MUS.next += spb; MUS.step++;
  }
}

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
  const left = save.side === 'left'; panel.classList.toggle('left', left && !L.port);
  const PW = 176;
  if (!pan) { L.ax = 0; L.ay = 0; L.aw = SW; L.ah = SH; }
  else if (!L.port) { L.ax = left ? PW + sL + 4 : sL; L.ay = 0; L.aw = SW - PW - sR - sL - 4; L.ah = SH; }
  else { L.ax = 0; L.ay = 0; L.aw = SW; L.ah = SH - sB - 226; }
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
// fond complet : la carte jouable + du circuit tout autour (aucune bande noire à l'écran)
function buildBG(mi, P, M) {
  const inner = buildMapBG(mi, P);
  if (!M) return inner;
  const m = MAPS[mi], W = (COLS + 2 * M) * P, H = (ROWS + 2 * M) * P;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = mulberry(mi * 313 + 99);
  let gr = g.createRadialGradient(W / 2, H / 2, P * 4, W / 2, H / 2, W * .7);
  gr.addColorStop(0, shade(m.base, .05)); gr.addColorStop(1, shade(m.base, -.5));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 70; i++) { // pistes
    let x = R() * W, y = R() * H, dir = Math.floor(R() * 4) * Math.PI / 2; const n = 1 + Math.floor(R() * 5), w = P * .05;
    const pts = [[x, y]];
    for (let k = 0; k < 3; k++) { const len = P * (1 + R() * 5); x += Math.round(Math.cos(dir)) * len; y += Math.round(Math.sin(dir)) * len; pts.push([x, y]); dir += (R() < .5 ? -1 : 1) * Math.PI / 2; }
    for (let k = 0; k < n; k++) {
      const o = (k - (n - 1) / 2) * P * .13;
      g.beginPath(); pts.forEach(([px, py], j) => j ? g.lineTo(px + o, py + o) : g.moveTo(px + o, py + o));
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = w + P * .03; g.stroke();
      g.strokeStyle = shade(m.base, .22); g.lineWidth = w; g.stroke();
    }
    const [ex, ey] = pts[pts.length - 1]; g.fillStyle = '#d4a93c'; g.beginPath(); g.arc(ex, ey, P * .07, 0, TAU); g.fill();
  }
  for (let i = 0; i < 26; i++) { // puces
    const w = P * (1 + R() * 2.5), h = P * (.6 + R() * 1.2), x = R() * W, y = R() * H;
    g.fillStyle = '#c9c9c9'; for (let px = x + P * .12; px < x + w - P * .1; px += P * .15) { g.fillRect(px, y - P * .12, P * .06, P * .14); g.fillRect(px, y + h - 2, P * .06, P * .14); }
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = P * .2; g.shadowOffsetY = P * .08;
    gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#34343a'); gr.addColorStop(1, '#0c0c0e'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  }
  for (let i = 0; i < 90; i++) { const x = R() * W, y = R() * H; g.fillStyle = R() < .5 ? '#151515' : '#b88d5a'; g.fillRect(x, y, P * .3, P * .14); }
  // couloirs d'entrée / sortie prolongés jusqu'au bord de l'écran
  const ox = M * P, oy = M * P;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = m.g[y][x]; if (ch !== 'S' && ch !== 'E') continue;
    const dirs = []; if (x === 0) dirs.push([-1, 0]); if (x === COLS - 1) dirs.push([1, 0]); if (y === 0) dirs.push([0, -1]); if (y === ROWS - 1) dirs.push([0, 1]);
    for (const [dx, dy] of dirs) {
      const X = ox + x * P, Y = oy + y * P;
      const rx = dx < 0 ? 0 : dx > 0 ? X + P : X, ry = dy < 0 ? 0 : dy > 0 ? Y + P : Y;
      const rw = dx ? (dx < 0 ? X : W - rx) : P, rh = dy ? (dy < 0 ? Y : H - ry) : P;
      g.fillStyle = '#100d0a'; g.fillRect(rx, ry, rw, rh);
      g.strokeStyle = '#d8b25a'; g.lineWidth = P * .035; g.beginPath();
      if (dx) { g.moveTo(rx, ry); g.lineTo(rx + rw, ry); g.moveTo(rx, ry + rh); g.lineTo(rx + rw, ry + rh); }
      else { g.moveTo(rx, ry); g.lineTo(rx, ry + rh); g.moveTo(rx + rw, ry); g.lineTo(rx + rw, ry + rh); }
      g.stroke();
    }
  }
  // assombrir l'extérieur, puis poser la zone de jeu avec un cadre
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, W, H);
  g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = P * .6; g.fillStyle = '#000'; g.fillRect(ox, oy, COLS * P, ROWS * P);
  g.shadowColor = 'transparent'; g.shadowBlur = 0;
  g.drawImage(inner, ox, oy);
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = P * .04; g.setLineDash([P * .3, P * .2]); g.strokeRect(ox, oy, COLS * P, ROWS * P); g.setLineDash([]);
  return c;
}
function buildMapBG(mi, P) {
  const m = MAPS[mi], c = document.createElement('canvas'), W = COLS * P, H = ROWS * P;
  c.width = W; c.height = H;
  const g = c.getContext('2d'), R = mulberry(mi * 977 + 13), rec = P >= 48;
  if (rec) { m.traces = []; m.leds = []; }
  const isOpen = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && '.SE'.includes(m.g[y][x]);
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

  // gros composants (tuiles 'X') : dissipateur thermique et ventilateurs
  for (const o of (m.obst || [])) {
    const x = o.x * P, y = o.y * P, w = 2 * P;
    shadowOn(.35, .14);
    if (o.kind === 'sink') {
      gr = g.createLinearGradient(x, y, x + w, y + w); gr.addColorStop(0, '#eceff1'); gr.addColorStop(1, '#78909c');
      g.fillStyle = gr; rr(g, x + P * .08, y + P * .08, w - P * .16, w - P * .16, P * .08); g.fill(); shadowOff();
      for (let k = 0; k < 9; k++) {
        const fx = x + P * .2 + k * P * .18;
        gr = g.createLinearGradient(fx, 0, fx + P * .1, 0); gr.addColorStop(0, '#9aa7b0'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#607d8b');
        g.fillStyle = gr; g.fillRect(fx, y + P * .18, P * .1, w - P * .36);
      }
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = P * .03; rr(g, x + P * .08, y + P * .08, w - P * .16, w - P * .16, P * .08); g.stroke();
    } else {
      gr = g.createLinearGradient(x, y, x, y + w); gr.addColorStop(0, '#3a3f47'); gr.addColorStop(1, '#14171b');
      g.fillStyle = gr; rr(g, x + P * .06, y + P * .06, w - P * .12, w - P * .12, P * .18); g.fill(); shadowOff();
      g.fillStyle = '#07080a'; g.beginPath(); g.arc(x + P, y + P, P * .82, 0, TAU); g.fill();
      for (const [sx, sy] of [[.28, .28], [1.72, .28], [.28, 1.72], [1.72, 1.72]]) { via(x + sx * P, y + sy * P, P * .09); }
      label('FAN-12V', x + P * .3, y + w + P * .18, .12);
    }
  }
  // connecteurs à broches, pile bouton, bobines
  for (let i = 0; i < 3; i++) {
    const n = 4 + Math.floor(R() * 6), w = P * .18 * n, h = P * .36, pos = place(w, h); if (!pos) continue;
    const [x, y] = pos; shadowOn(.12, .06); g.fillStyle = '#151515'; g.fillRect(x, y, w, h); shadowOff();
    for (let k = 0; k < n; k++) for (let j2 = 0; j2 < 2; j2++) {
      const px = x + P * .09 + k * P * .18, py = y + P * .09 + j2 * P * .18;
      gr = g.createRadialGradient(px - P * .02, py - P * .02, 0, px, py, P * .06); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(1, '#b8860b');
      g.fillStyle = gr; g.fillRect(px - P * .045, py - P * .045, P * .09, P * .09);
    }
    label('J' + (i + 1), x, y - P * .06);
  }
  { const r = P * .5, pos = place(r * 2, r * 2); if (pos) {
    const cx = pos[0] + r, cy = pos[1] + r; shadowOn(.25, .1);
    gr = g.createRadialGradient(cx - r * .3, cy - r * .35, r * .1, cx, cy, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.6, '#b0bec5'); gr.addColorStop(1, '#546e7a');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); shadowOff();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = P * .02; g.beginPath(); g.arc(cx, cy, r * .85, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(40,50,60,.7)'; g.font = 'bold ' + (P * .16) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('CR2032', cx, cy - P * .06); g.fillText('3V  +', cx, cy + P * .14);
  } }
  for (let i = 0; i < 3; i++) {
    const s2 = P * .55, pos = place(s2, s2); if (!pos) continue;
    const [x, y] = pos; shadowOn(.15, .06); g.fillStyle = '#2b2b2b'; rr(g, x, y, s2, s2, P * .06); g.fill(); shadowOff();
    gr = g.createRadialGradient(x + s2 * .45, y + s2 * .45, s2 * .1, x + s2 / 2, y + s2 / 2, s2 * .42); gr.addColorStop(0, '#5d3a1a'); gr.addColorStop(.6, '#e08a3c'); gr.addColorStop(1, '#6b3a12');
    g.strokeStyle = gr; g.lineWidth = s2 * .16; g.beginPath(); g.arc(x + s2 / 2, y + s2 / 2, s2 * .3, 0, TAU); g.stroke();
    label('L' + (i + 1), x, y - P * .06);
  }

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
  for (const r of m.routes) starts.push(r[0]);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (m.g[y][x] === 'E') exits.push([x, y]);
  const g = {
    mi, m, d, demo: !!demo, total: demo ? 9999 : m.waves, wave: 0, lives: d.lives + (demo ? 0 : 2 * ((save.gup || {}).lives || 0)), cash: demo ? 1e9 : d.cash + (m.routes.length - 1) * 12 + 8 * ((save.gup || {}).cash || 0), score: 0, time: 0,
    starts, exits, towers: [], towerAt: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    enemies: [], projs: [], fx: [], parts: [], texts: [], queue: [], spawnT: 0, nextStart: 0,
    tool: null, sel: null, hover: null, speed: 1, countdown: -1, over: false, kills: 0, shake: 0, banner: null, aiT: 0
  };
  const keep = G; G = g;
  g.dist = computeDist();
  g.bg = buildBG(mi, 64, 6); g.bgM = 6;
  for (const tr of m.traces) { tr.pts = tr; tr.lens = []; tr.len = 0; for (let i = 0; i < tr.length - 1; i++) { const l = Math.hypot(tr[i + 1][0] - tr[i][0], tr[i + 1][1] - tr[i][1]) || .01; tr.lens.push(l); tr.len += l; } }
  g.pulses = [];
  for (let i = 0; i < 34; i++) g.pulses.push({ tr: Math.floor(Math.random() * m.traces.length), d: Math.random() * 6, spd: rand(1.5, 4), col: Math.random() < .7 ? m.acc : '#ffffff' });
  g.boardPath = new Path2D();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!'.SE'.includes(m.g[y][x])) g.boardPath.rect(x, y, 1, 1);
  g.bots = [];
  for (let k = 0, tries = 0; k < 7 && tries < 200; tries++) {
    const x = Math.floor(Math.random() * COLS), y = Math.floor(Math.random() * ROWS);
    if (m.g[y][x] !== '#') continue;
    g.bots.push({ x: x + .5, y: y + .5, tx: x, ty: y, a: 0, spd: rand(.5, .9), wait: rand(0, 2), ph: Math.random() * 9, col: ['#ffd740', '#80d8ff', '#ff80ab', '#b9f6ca'][k % 4] }); k++;
  }
  g.flow = []; const seen = new Set();
  for (const r of m.routes) for (let i = 0; i < r.length - 1; i++) {
    const [x, y] = r[i], [nx, ny] = r[i + 1], key = x + ',' + y + ',' + (nx - x) + ',' + (ny - y);
    if (seen.has(key)) continue; seen.add(key);
    g.flow.push({ x, y, a: Math.atan2(ny - y, nx - x), d: r.length - 1 - i });
  }
  G = keep;
  return g;
}
function startMap(mi) {
  G = newGame(mi, false); G.maxLives = G.lives;
  L.zoom = 1; L.vx = COLS / 2; L.vy = ROWS / 2;
  buildTowerBar(); closePopup(); selectTool('pulse', true);
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
  if (G.towers.length > 40) { const t = G.towers[Math.floor(Math.random() * G.towers.length)]; if (t.lvl < maxLvl(t.type)) upgradeTower(t); return; }
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
function walkable(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS && '.SE'.includes(G.m.g[y][x]); }
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
  if (G.m.g[ty][tx] === 'X') return 'Il y a déjà un composant ici';
  if (G.m.g[ty][tx] !== '#') return 'Pose les tourelles sur le circuit, pas dans le couloir !';
  if (G.towerAt[ty][tx]) return 'Case occupée';
  return null;
}
function tryPlace(type, tx, ty) {
  if (!unlockedT(type)) { toast('Débloque cette tourelle dans la Boutique 🛒'); sfx('err'); return; }
  const cost = tCost(type);
  const why = canPlace(tx, ty);
  if (why === 'out') return;
  if (why) { toast(why); sfx('err'); vibe(30); flashTile(tx, ty); return; }
  if (G.cash < cost) { toast('Pas assez de crédits'); sfx('err'); vibe(30); return; }
  G.cash -= cost;
  const t = { id: uid++, mode: 'first', type, x: tx, y: ty, lvl: 1, cd: 0, born: G.time, upT: -9, recoil: 0, ang: -Math.PI / 2 + rand(-1, 1), invested: cost, kills: 0, st: tStats(type, 1), boost: 1 };
  G.towers.push(t); G.towerAt[ty][tx] = t; recalcBoosts();
  for (const b of G.bots) if (b.tx === tx && b.ty === ty) { b.wait = 0; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = tx + ox, ny = ty + oy; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && G.m.g[ny][nx] === '#' && !G.towerAt[ny][nx]) { b.tx = nx; b.ty = ny; break; } } }
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; G.parts.push({ smoke: true, x: tx + .5 + Math.cos(a) * .35, y: ty + .5 + Math.sin(a) * .35, vx: Math.cos(a) * .9, vy: Math.sin(a) * .9, life: .5, max: .5, size: .12 }); }
  G.fx.push({ kind: 'ring', x: tx + .5, y: ty + .5, r: .9, col: 'rgba(255,255,255,.7)', life: .3, max: .3, delay: .25 });
  sfx('build'); vibe(10); updatePanel();
}
function upgradeTower(t) {
  if (t.lvl >= maxLvl(t.type)) { if (t.lvl < TMAX) { toast('Niveau 5 verrouillé : fais la recherche niv. 2 de cette tourelle dans la Boutique 🛒'); sfx('err'); } return; }
  const c = upCost(t);
  if (G.cash < c) { toast('Pas assez de crédits'); sfx('err'); return; }
  G.cash -= c; t.invested += c; t.lvl++; t.st = tStats(t.type, t.lvl); t.upT = G.time; recalcBoosts();
  for (let i = 0; i < 14; i++) { const q = part(t.x + .5, t.y + .5, i % 2 ? '#fff59d' : '#ffd740', 2.5); q.vy -= 2; q.life = q.max = .8; G.parts.push(q); }
  G.texts.push({ x: t.x + .5, y: t.y + .1, t: t.lvl >= TMAX ? '★ NIV. MAX !' : 'NIV. ' + t.lvl + ' !', col: '#ffd740', life: 1.2, big: true });
  sfx('up'); vibe(15); updatePanel(); fillPopup();
}
function sellTower(t) {
  const r = Math.floor(t.invested * sellRate());
  G.cash += r; G.towers.splice(G.towers.indexOf(t), 1); G.towerAt[t.y][t.x] = null; recalcBoosts();
  smoke(t.x + .5, t.y + .5, 5, .25);
  G.fx.push({ kind: 'sold', x: t.x + .5, y: t.y + .5, type: t.type, lvl: t.lvl, ang: t.ang, life: .45, max: .45 });
  floatText(t.x + .5, t.y + .5, '+' + r, '#e6ee5a');
  coinFly(t.x + .5, t.y + .5, 3);
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
  const t0 = t;
  for (let i = 0; i < wd.n; i++) { G.queue.push({ type: wd.type, t, wave: G.wave }); t += et.int; }
  if (wd.type2) { let t2 = t0 + .4; for (let i = 0; i < wd.n2; i++) { G.queue.push({ type: wd.type2, t: t2, wave: G.wave }); t2 += ETYPES[wd.type2].int * 1.3; } }
  if (wd.type === 'boss') for (let i = 0; i < 6; i++) G.queue.push({ type: 'bug', t: i * .6 + .5, wave: G.wave });
  G.queue.sort((a, b) => a.t - b.t);
  G.spawnT = 0;
  const bonus = 2 + Math.floor(G.wave / 3) + (early ? 3 : 0) + gup('wave');
  G.cash += bonus; G.score += bonus * 10;
  for (const t of G.towers) if (t.type === 'miner') { G.cash += t.st.gain; G.texts.push({ x: t.x + .5, y: t.y + .2, t: '+' + t.st.gain, col: '#ffd740', life: 1.2, big: true }); coinFly(t.x + .5, t.y + .5, 2); }
  G.countdown = -1;
  if (wd.type === 'boss') { G.alarm = 2.4; G.shake = 6; sfx('alarm'); }
  G.banner = { t: (wd.type === 'boss' ? '⚠ MÉGA-VIRUS ⚠' : 'VAGUE ' + G.wave), sub: wd.n + ' × ' + et.name + (wd.type2 ? ' + ' + wd.n2 + ' × ' + ETYPES[wd.type2].name : ''), life: 2.2, boss: wd.type === 'boss' };
  toast((wd.type === 'boss' ? '⚠ ' : '') + 'Vague ' + G.wave + ' : ' + wd.n + ' × ' + et.name + (early ? ' · bonus anticipé +' + bonus : ' · +' + bonus + ' crédits'));
  sfx('wave'); updatePanel();
}
function spawnEnemy(type, wave) {
  const d = ETYPES[type], ri = G.nextStart++ % G.m.routes.length, route = G.m.routes[ri], s = route[0];
  const hp = d.hp * hpScale(wave) * G.d.hp;
  const e = {
    id: uid++, type, x: s[0] + .5, y: s[1] + .5, tx: s[0], ty: s[1], hp, max: hp, spd: d.spd, r: d.r, col: d.col,
    rew: Math.max(1, Math.round(d.rew * rewScale(wave) * (1 + .06 * gup('rew')))), armor: (d.armor || 0) * (1 + wave * .03), fly: !!d.fly, regen: d.regen || 0,
    lives: d.lives || 1, wave, slowT: 0, slowF: 1, ang: 0, anim: Math.random() * 10, prog: 0, dead: false, route, ri: 0
  };
  e.hp = e.max = hp * (1 + G.mi * .025);
  if (G.fx.length < 300) G.fx.push({ kind: 'ring', x: s[0] + .5, y: s[1] + .5, r: .9, col: '#ff5252', life: .35, max: .35 });
  if (d.shield) e.sh = e.shMax = e.max * d.shield;
  if (d.ghost) e.phaseT = rand(1, 3);
  if (d.jump) e.jumpT = rand(2, 3.5);
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
// pièce qui s'envole jusqu'au compteur de crédits
function coinFly(x, y, n) {
  if (G.demo) return;
  G.coins = G.coins || [];
  for (let i = 0; i < n && G.coins.length < 30; i++) { const [sx, sy] = toScreen(x, y); G.coins.push({ sx: sx + rand(-8, 8), sy: sy + rand(-8, 8), t: -i * .06, dur: rand(.55, .75), bend: rand(-120, 120) }); }
}
function bump(sel) { const el = $(sel); if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function floatText(x, y, t, col) { G.texts.push({ x, y, t, col, life: 1 }); }
let toastT = 0;
function toast(msg) { if (G && G.demo) return; const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }

/* ---------------- combat ---------------- */
function hurt(e, dmg, pierce) {
  if (e.dead) return;
  e.noHit = 0;
  if (e.sh > 0) { const a = Math.min(e.sh, dmg); e.sh -= a; dmg -= a; e.shHit = .15; if (dmg <= 0) return; }
  e.hp -= pierce ? dmg : Math.max(dmg - e.armor, dmg * .25);
  e.hit = .08;
  if (e.hp <= 0) {
    e.dead = true; G.kills++; if (G.shooter) G.shooter.kills = (G.shooter.kills || 0) + 1;
    G.cash += e.rew; G.score += e.rew * 10;
    floatText(e.x, e.y - .3, '+' + e.rew, '#e6ee5a');
    const n = e.type === 'boss' ? 40 : 8;
    for (let i = 0; i < n; i++) G.parts.push(part(e.x, e.y, i % 3 ? e.col : '#ffffff', e.type === 'boss' ? 4 : 2.5));
    G.fx.push({ kind: 'splat', x: e.x, y: e.y, r: e.r * 1.7, life: 10, max: 10, col: rgbaA(e.col), seed: Math.random() * .97 + .013 });
    G.fx.push({ kind: 'pop', x: e.x, y: e.y, r: e.r, col: e.col, life: .28, max: .28 });
    for (let i = 0; i < 6; i++) { const q = part(e.x, e.y, e.col, 3.2); q.size = e.r * rand(.25, .45); q.goo = true; q.life = q.max = rand(.35, .55); G.parts.push(q); }
    coinFly(e.x, e.y, Math.min(4, e.rew));
    smoke(e.x, e.y, e.type === 'boss' ? 14 : 3, e.r * .7);
    sfx(e.type === 'boss' ? 'boom' : 'pop'); if (e.type === 'boss') { vibe(200); G.shake = 14; }
    if (ETYPES[e.type].split) for (let k = 0; k < 2; k++) { // le diviseur se sépare en deux mini-virus
      spawnEnemy('mini', e.wave || G.wave);
      const m2 = G.enemies[G.enemies.length - 1];
      Object.assign(m2, { route: e.route, ri: e.ri, tx: e.tx, ty: e.ty, x: e.x + rand(-.15, .15), y: e.y + rand(-.15, .15), age: .2 });
    }
  }
}
function enemyProgress(e) {
  return (e.route.length - 1 - e.ri) - 1 + Math.hypot(e.tx + .5 - e.x, e.ty + .5 - e.y);
}
function findTarget(t) {
  const cx = t.x + .5, cy = t.y + .5, r2 = t.st.range * t.st.range, ground = TOWERS[t.type].ground;
  let best = null, bp = Infinity;
  for (const e of G.enemies) {
    if (e.dead || (ground && e.fly) || e.phased) continue;
    const dx = e.x - cx, dy = e.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2) {
      const m = t.mode || 'first', p = m === 'first' ? e.prog : m === 'last' ? -e.prog : m === 'strong' ? -e.hp : d2;
      if (p < bp && e !== t.skip) { bp = p; best = e; }
    }
  }
  return best;
}
function recalcBoosts() {
  for (const t of G.towers) {
    let b = 0;
    for (const o of G.towers) if (o.type === 'boost' && o !== t && Math.hypot(o.x - t.x, o.y - t.y) <= o.st.range + .01) b = Math.max(b, o.st.boost);
    t.boost = 1 + b;
  }
}
function fire(t, e) {
  const d = TOWERS[t.type], s = t.boost > 1 ? Object.assign({}, t.st, { dmg: t.st.dmg * t.boost }) : t.st, cx = t.x + .5, cy = t.y + .5;
  const mx = cx + Math.cos(t.ang) * .4, my = cy + Math.sin(t.ang) * .4;
  G.shooter = t;
  switch (d.proj) {
    case 'bullet': case 'shell': case 'ice': {
      const mk = tg => G.projs.push({ kind: d.proj, x: mx, y: my, tgt: tg, lx: tg.x, ly: tg.y, spd: d.spd, dmg: s.dmg, splash: s.splash, slow: s.slow, slowT: s.slowT, ground: d.ground, src: t, col: s.special ? '#ffe066' : d.col,
        pierce: s.special && t.type === 'gatling', stun: s.special && t.type === 'cannon' ? .45 : 0, freeze: s.special && t.type === 'frost' ? .2 : 0 });
      mk(e);
      if (t.type === 'cannon') smoke(mx, my, 2, .12);
      if (s.special && t.type === 'pulse') { t.skip = e; const e2 = findTarget(t); t.skip = null; if (e2) mk(e2); }
      break;
    }
    case 'flame': { // cône de feu : touche tout ce qui est devant
      const a0 = Math.atan2(e.y - cy, e.x - cx);
      for (const o of G.enemies) {
        if (o.dead || o.phased) continue;
        const dd = Math.hypot(o.x - cx, o.y - cy), da = Math.abs(Math.atan2(Math.sin(Math.atan2(o.y - cy, o.x - cx) - a0), Math.cos(Math.atan2(o.y - cy, o.x - cx) - a0)));
        if (dd <= s.range + o.r && da < .42) { hurt(o, s.dmg); o.burnT = 2; o.burnDps = Math.max(o.burnDps || 0, s.burn); }
      }
      for (let k = 0; k < 3; k++) { const a = a0 + rand(-.35, .35), sp = rand(3, 5); G.parts.push({ fire: true, x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: s.range / sp, max: s.range / sp, size: rand(.12, .2), col: '#ff9100' }); }
      break;
    }
    case 'missile': {
      const n = s.special ? 3 : 1;
      for (let k = 0; k < n; k++) G.projs.push({ kind: 'missile', x: mx, y: my, a: t.ang + (k - (n - 1) / 2) * .6, tgt: e, lx: e.x, ly: e.y, spd: d.spd, dmg: s.dmg, splash: s.splash, col: d.col, src: t });
      smoke(mx, my, 3, .12);
      break;
    }
    case 'beam': {
      let x2 = e.x, y2 = e.y;
      if (s.special) { // traverse toute la ligne jusqu'au bout de la portée
        const a = Math.atan2(e.y - cy, e.x - cx); x2 = cx + Math.cos(a) * s.range; y2 = cy + Math.sin(a) * s.range;
        for (const o of G.enemies) if (!o.dead && segDist(o.x, o.y, mx, my, x2, y2) < o.r + .15) hurt(o, s.dmg);
      } else hurt(e, s.dmg);
      G.fx.push({ kind: 'beam', x1: mx, y1: my, x2, y2, col: s.special ? '#ffd740' : d.col, life: .15, max: .15, w: .08 + t.lvl * .02 });
      break;
    }
    case 'chain': {
      const hit = new Set([e]); let cur = e, dmg = s.dmg; const pts = [[cx, cy - .1], [e.x, e.y]];
      hurt(e, dmg); if (s.special) e.stunT = .3;
      for (let i = 1; i < s.chain; i++) {
        let nb = null, nd = 1.8;
        for (const o of G.enemies) { if (o.dead || hit.has(o)) continue; const dd = Math.hypot(o.x - cur.x, o.y - cur.y); if (dd < nd) { nd = dd; nb = o; } }
        if (!nb) break;
        dmg *= .85; hurt(nb, dmg); if (s.special) nb.stunT = .3; hit.add(nb); cur = nb; pts.push([nb.x, nb.y]);
      }
      G.fx.push({ kind: 'chain', pts, col: d.col, life: .18, max: .18 });
      break;
    }
  }
  sfx(t.type);
}
function impact(p) {
  G.shooter = p.src || null;
  if (p.splash) {
    for (const e of G.enemies) {
      if (e.dead || (p.ground && e.fly)) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < p.splash + e.r) {
        hurt(e, p.dmg, p.pierce);
        if (p.stun) e.stunT = Math.max(e.stunT || 0, p.stun);
        if (p.freeze && Math.random() < p.freeze) { e.stunT = Math.max(e.stunT || 0, 1.1); e.frozen = 1.1; }
        if (p.slow) { e.slowF = e.slowT > 0 ? Math.min(e.slowF, p.slow) : p.slow; e.slowT = Math.max(e.slowT, p.slowT); }
      }
    }
    G.fx.push({ kind: 'ring', x: p.x, y: p.y, r: p.splash, col: p.col, life: .25, max: .25 });
  } else if (p.tgt && !p.tgt.dead) hurt(p.tgt, p.dmg, p.pierce);
  for (let i = 0; i < 4; i++) G.parts.push(part(p.x, p.y, p.col, 2.5));
  if (p.kind === 'shell') { smoke(p.x, p.y, 4, .2); G.shake = Math.max(G.shake, 1.5); }
}

/* ---------------- mise à jour ---------------- */
function moveBots(dt) {
  for (const b of G.bots) {
    if (b.wait > 0) { b.wait -= dt; continue; }
    const cx = b.tx + .5, cy = b.ty + .5, dx = cx - b.x, dy = cy - b.y, d = Math.hypot(dx, dy);
    if (d < .02) {
      if (Math.random() < .15) { b.wait = rand(.8, 2.2); continue; } // il s'arrête pour « réparer »
      const opts = [];
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = b.tx + ox, ny = b.ty + oy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || G.m.g[ny][nx] !== '#' || G.towerAt[ny][nx]) continue;
        opts.push([nx, ny, (ox === b.dx && oy === b.dy) ? 3 : 1]);
      }
      if (!opts.length) { b.wait = 1; continue; }
      let tot = opts.reduce((a, o) => a + o[2], 0), r2 = Math.random() * tot, pick = opts[0];
      for (const o of opts) { if ((r2 -= o[2]) <= 0) { pick = o; break; } }
      b.dx = pick[0] - b.tx; b.dy = pick[1] - b.ty; b.tx = pick[0]; b.ty = pick[1];
    } else {
      const mv = Math.min(d, b.spd * dt); b.x += dx / d * mv; b.y += dy / d * mv;
      const ta = Math.atan2(dy, dx); b.a += Math.atan2(Math.sin(ta - b.a), Math.cos(ta - b.a)) * Math.min(1, dt * 10);
    }
  }
}
function update(dt) {
  G.time += dt; moveBots(dt);
  if (G.demo) demoAI(dt);
  G.shake = Math.max(0, G.shake - dt * 30);
  if (G.alarm > 0) G.alarm -= dt;
  if (G.coins) for (let i = G.coins.length - 1; i >= 0; i--) { const c = G.coins[i]; c.t += dt / c.dur; if (c.t >= 1) { G.coins.splice(i, 1); bump('#sCash'); sfx('coin'); } }
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
    e.noHit = (e.noHit || 0) + dt; e.shHit = Math.max(0, (e.shHit || 0) - dt);
    if (e.shMax && e.noHit > 2.5) e.sh = Math.min(e.shMax, e.sh + e.shMax * .35 * dt);
    if (e.phaseT !== undefined) { e.phaseT -= dt; if (e.phaseT <= 0) { e.phased = !e.phased; e.phaseT = e.phased ? 1.3 : rand(2.2, 3.2); } }
    if (ETYPES[e.type].heal) { e.healT = (e.healT || 0) - dt; if (e.healT <= 0) { e.healT = 1; for (const o of G.enemies) if (!o.dead && o !== e && o.hp < o.max && Math.hypot(o.x - e.x, o.y - e.y) < 1.6) { o.hp = Math.min(o.max, o.hp + o.max * .1); G.texts.push({ x: o.x, y: o.y - .3, t: '+', col: '#76ff03', life: .6 }); } G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 1.6, col: 'rgba(120,255,140,.5)', life: .4, max: .4 }); } }
    if (e.type === 'giant' && Math.random() < dt * 4) G.parts.push({ smoke: true, x: e.x + rand(-.2, .2), y: e.y + rand(-.2, .2), vx: 0, vy: 0, life: .6, max: .6, size: .12 });
    if (e.jumpT !== undefined && !(e.stunT > 0)) { e.jumpT -= dt; if (e.jumpT <= 0) { e.jumpT = rand(2.5, 3.5); const to = Math.min(e.route.length - 2, e.ri + 4); if (to > e.ri) { G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: .5, col: '#b2ff59', life: .3, max: .3 }); e.ri = to; const p2 = e.route[to]; e.x = p2[0] + .5; e.y = p2[1] + .5; G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: .5, col: '#b2ff59', life: .3, max: .3 }); } } }
    if (e.frozen > 0) e.frozen -= dt;
    if (e.burnT > 0) { e.burnT -= dt; G.shooter = null; hurt(e, e.burnDps * dt, true); e.hit = 0; if (Math.random() < dt * 12) G.parts.push({ fire: true, x: e.x + rand(-e.r, e.r) * .6, y: e.y + rand(-e.r, e.r) * .6, vx: rand(-.2, .2), vy: rand(-.6, -.2), life: .35, max: .35, size: rand(.06, .11), col: '#ff9100' }); if (e.dead) continue; }
    let mv = e.spd * e.slowF * dt;
    if (e.stunT > 0) { e.stunT -= dt; mv = 0; }
    {
      let guard = 0;
      while (mv > 0 && guard++ < 6) {
        const nxt = e.route[e.ri + 1];
        if (!nxt) { leak(e); break; }
        const cx = nxt[0] + .5, cy = nxt[1] + .5, dx = cx - e.x, dy = cy - e.y, d = Math.hypot(dx, dy);
        e.tx = nxt[0]; e.ty = nxt[1];
        if (d <= mv) {
          e.x = cx; e.y = cy; mv -= d; e.ri++;
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
    if (t.type === 'boost' || t.type === 'miner') { t.ang += dt * (t.type === 'miner' ? 3 : 1); continue; }
    const e = findTarget(t);
    if (e) {
      const ta = Math.atan2(e.y - (t.y + .5), e.x - (t.x + .5));
      t.ang += Math.atan2(Math.sin(ta - t.ang), Math.cos(ta - t.ang)) * Math.min(1, dt * 16);
      if (t.cd <= 0) { fire(t, e); t.cd = 1 / t.st.rate; t.flash = .07; }
    } else if (t.type !== 'tesla') t.ang += Math.sin(G.time * .8 + t.id) * dt * .9;
  }
  // projectiles
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const p = G.projs[i];
    if (p.tgt && !p.tgt.dead) { p.lx = p.tgt.x; p.ly = p.tgt.y; }
    if (p.kind === 'missile') { // tourne vers la cible et accélère
      if (!p.tgt || p.tgt.dead) { p.tgt = null; let bd = 3; for (const o of G.enemies) { if (o.dead || o.phased) continue; const dd = Math.hypot(o.x - p.x, o.y - p.y); if (dd < bd) { bd = dd; p.tgt = o; } } if (p.tgt) { p.lx = p.tgt.x; p.ly = p.tgt.y; } }
      const ta = Math.atan2(p.ly - p.y, p.lx - p.x); p.a = p.a === undefined ? ta : p.a + clamp(Math.atan2(Math.sin(ta - p.a), Math.cos(ta - p.a)), -7 * dt, 7 * dt);
      p.spd = Math.min(9, p.spd + 10 * dt);
      if (Math.random() < .7) G.parts.push({ smoke: true, x: p.x, y: p.y, vx: rand(-.2, .2), vy: rand(-.2, .2), life: .5, max: .5, size: .07 });
      const mv2 = p.spd * dt, dd2 = Math.hypot(p.lx - p.x, p.ly - p.y);
      p.life = (p.life || 4) - dt;
      if (dd2 <= mv2 + .1 || p.life <= 0) { impact(p); G.projs.splice(i, 1); continue; }
      p.x += Math.cos(p.a) * mv2; p.y += Math.sin(p.a) * mv2; continue;
    }
    const dx = p.lx - p.x, dy = p.ly - p.y, d = Math.hypot(dx, dy), mv = p.spd * dt;
    if (p.d0 === undefined) p.d0 = Math.max(.5, d);
    p.h = Math.sin(clamp(1 - d / p.d0, 0, 1) * Math.PI);
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
  const ex = e.route[e.route.length - 1];
  G.fx.push({ kind: 'cpuhit', x: ex[0] + .5, y: ex[1] + .5, life: .6, max: .6 });
  for (let i = 0; i < 14; i++) G.parts.push(part(ex[0] + .5, ex[1] + .5, i % 2 ? '#ff5252' : '#ffd740', 4));
  G.texts.push({ x: ex[0] + .5, y: ex[1], t: '-' + e.lives + ' ❤', col: '#ff5252', life: 1.2, big: true });
  bump('#sLives');
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
  const px = Math.max(16, Math.round(L.s * DPR / 4) * 4), key = curStyle() + type + lvl + ':' + px;
  let c = baseCache[key];
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(px * 1.2); const g = c.getContext('2d'); g.setTransform(px, 0, 0, px, px * .55, px * .55); const st = curStyle(); if (st === 'retro') drawRetroBase(g, type, lvl); else if (st === 'neo') drawNeoBase(g, type, lvl); else drawTowerBase(g, type, lvl); baseCache[key] = c; }
  return c;
}
function drawTower(c, type, lvl, ang, time, flash, cached) {
  GD = c === ctx ? null : c; try { drawTower2(c, type, lvl, ang, time, flash, cached); } finally { GD = null; NEO = null; }
}
function drawTower2(c, type, lvl, ang, time, flash, cached) {
  const st = curStyle();
  if (cached) c.drawImage(towerBase(type, lvl), -.55, -.55, 1.2, 1.2);
  else if (st === 'retro') drawRetroBase(c, type, lvl); else if (st === 'neo') drawNeoBase(c, type, lvl); else drawTowerBase(c, type, lvl);
  if (st === 'retro') { drawRetroTurret(c, type, lvl, ang, time, flash); return; }
  NEO = st === 'neo' ? TOWERS[type].col : null;
  if (NEO) { // la tourelle flotte au-dessus de son socle
    c.save(); c.translate(0, Math.sin(time * 2.5 + type.length) * .02);
    c.globalCompositeOperation = 'lighter'; glowDot(0, 0, .42, rgbaA(NEO).replace('A', '.28')); c.globalCompositeOperation = 'source-over';
    drawTurret(c, type, lvl, ang, time, flash); c.restore();
  } else drawTurret(c, type, lvl, ang, time, flash);
  NEO = null;
}
let NEO = null;
// ---- style « jouet brillant » : contours épais, couleurs vives, reflets ----
const OUT = '#1b1230';
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  c.closePath(); c.fillStyle = '#ffd600'; c.fill(); c.lineWidth = r * .25; c.strokeStyle = OUT; c.stroke();
}
// boule brillante avec contour et reflet
function gball(c, x, y, r, col, lx, ly) {
  if (NEO) { // sphère sombre cerclée de néon
    const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .1, x, y, r);
    g.addColorStop(0, '#3a4566'); g.addColorStop(.6, '#141a2c'); g.addColorStop(1, '#05070d');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.lineWidth = r * .14; c.strokeStyle = col; c.stroke();
    c.globalCompositeOperation = 'lighter'; glowDot(x, y, r * .55, rgbaA(col).replace('A', '.55')); c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x + lx * r * .45, y + ly * r * .45, r * .14, 0, TAU); c.fill();
    return;
  }
  const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .1, x, y, r);
  g.addColorStop(0, shade(col, .55)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, -.45));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.lineWidth = r * .16; c.strokeStyle = OUT; c.stroke();
  c.save(); c.translate(x + lx * r * .42, y + ly * r * .42); c.rotate(Math.atan2(ly, lx) + Math.PI / 2);
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(0, 0, r * .42, r * .2, 0, 0, TAU); c.fill(); c.restore();
}
// canon arrondi brillant (axe x)
function gbar(c, x, y, w, h, col) {
  if (NEO) { // tube en métal noir avec une ligne lumineuse
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#46506e'); g.addColorStop(.45, '#1c2236'); g.addColorStop(1, '#070910');
    c.fillStyle = g; rr(c, x, y, w, h, Math.min(h, w) * .45); c.fill();
    c.lineWidth = .02; c.strokeStyle = NEO; c.stroke();
    c.fillStyle = NEO; c.globalAlpha = .9; rr(c, x + w * .12, y + h * .42, w * .76, Math.max(.012, h * .16), h * .08); c.fill(); c.globalAlpha = 1;
    return;
  }
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(col, .45)); g.addColorStop(.4, col); g.addColorStop(1, shade(col, -.5));
  c.fillStyle = g; rr(c, x, y, w, h, Math.min(h, w) * .35); c.fill();
  c.lineWidth = .035; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; rr(c, x + w * .1, y + h * .16, w * .8, h * .2, h * .1); c.fill();
}

function drawTowerBase(c, type, lvl) {
  const d = TOWERS[type];
  // ombre
  c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, -.41, -.37, .92, .92, .22); c.fill();
  // tuile blanche bombée
  let g = c.createLinearGradient(0, -.46, 0, .46);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#e6eaf2'); g.addColorStop(1, '#a3adc0');
  c.fillStyle = g; rr(c, -.46, -.46, .92, .92, .22); c.fill();
  c.lineWidth = .055; c.strokeStyle = lvl >= TMAX ? '#7a5200' : OUT; c.stroke();
  if (lvl >= TMAX) { c.lineWidth = .03; c.strokeStyle = '#ffca28'; rr(c, -.42, -.42, .84, .84, .19); c.stroke(); }
  // liseré de couleur de la tourelle
  c.lineWidth = .035; c.strokeStyle = shade(d.col, .1); rr(c, -.38, -.38, .76, .76, .16); c.stroke();
  // cuvette sombre
  g = c.createRadialGradient(0, .06, .04, 0, 0, .33);
  g.addColorStop(0, shade(d.col, -.75)); g.addColorStop(1, shade(d.col, -.35));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, .31, 0, TAU); c.fill();
  c.lineWidth = .04; c.strokeStyle = OUT; c.stroke();
  // reflet sur la tuile
  c.save(); rr(c, -.46, -.46, .92, .92, .22); c.clip();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-.18, -.47, .42, .14, -.15, 0, TAU); c.fill();
  c.restore();
  // étoiles de niveau
  for (let i = 0; i < lvl - 1; i++) star(c, (i - (lvl - 2) / 2) * .2, .37, .075);
}

function drawTurret(c, type, lvl, ang, time, flash) {
  const d = TOWERS[type], col = d.col;
  const a = (type === 'tesla' || type === 'boost' || type === 'miner') ? 0 : ang, [lx, ly] = lightFor(a);
  softShadow(c, .05, .07, .3, .3, .5);
  c.save(); c.rotate(a);
  if (flash > 0 && type !== 'tesla') c.translate(-flash / .07 * .08, 0);
  let muzzle = .46;
  const fins = () => { // ailerons (niveau 2+)
    if (lvl < 2) return;
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(-.12, s * .14); c.lineTo(-.3, s * .3); c.lineTo(-.02, s * .2); c.closePath();
      c.fillStyle = shade(col, -.2); c.fill(); c.lineWidth = .03; c.strokeStyle = OUT; c.stroke();
    }
  };
  switch (type) {
    case 'pulse': {
      fins();
      if (lvl >= 3) { gbar(c, 0, -.15, .4, .11, '#4a4f63'); gbar(c, 0, .04, .4, .11, '#4a4f63'); }
      else gbar(c, 0, -.075, .42, .15, '#4a4f63');
      gbar(c, .34, lvl >= 3 ? -.18 : -.1, .1, lvl >= 3 ? .36 : .2, col);
      gball(c, 0, 0, .22, col, lx, ly);
      muzzle = .48; break;
    }
    case 'gatling': {
      fins();
      const spin = time * 25, n = lvl >= 3 ? 4 : 3;
      for (let i = 0; i < n; i++) { const o = Math.sin(spin + i * TAU / n) * .09; gbar(c, .04, o - .035, .42, .07, '#3d4254'); }
      gbar(c, .26, -.16, .07, .32, '#c7ccd8'); gbar(c, .12, -.16, .06, .32, '#c7ccd8');
      const g = c.createLinearGradient(0, -.2, 0, .2); g.addColorStop(0, shade(col, .5)); g.addColorStop(.5, col); g.addColorStop(1, shade(col, -.5));
      c.fillStyle = g; rr(c, -.24, -.2, .36, .4, .1); c.fill(); c.lineWidth = .04; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.6)'; rr(c, -.2, -.17, .26, .07, .035); c.fill();
      gball(c, -.06, 0, .07, '#e0e4ec', lx, ly);
      muzzle = .48; break;
    }
    case 'cannon': {
      fins();
      gbar(c, -.02, -.13, .42, .26, '#3b3f52');
      gbar(c, .32, -.16, .12, .32, col);
      if (lvl >= 3) gbar(c, .16, -.15, .06, .3, '#ffd54f');
      c.fillStyle = '#050505'; c.beginPath(); c.ellipse(.44, 0, .03, .1, 0, 0, TAU); c.fill();
      gball(c, 0, 0, .25, col, lx, ly);
      for (let i = 0; i < 6; i++) { const q = i * TAU / 6; c.fillStyle = OUT; c.beginPath(); c.arc(Math.cos(q) * .17, Math.sin(q) * .17, .022, 0, TAU); c.fill(); }
      muzzle = .47; break;
    }
    case 'frost': {
      fins();
      gbar(c, 0, -.055, .38, .11, '#5c7d99');
      c.fillStyle = 'rgba(150,230,255,.3)'; c.beginPath(); c.arc(0, 0, .3, 0, TAU); c.fill();
      const g = c.createRadialGradient(lx * .1, ly * .1, .02, 0, 0, .25);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.45, '#8fe3ff'); g.addColorStop(1, '#0288d1');
      c.fillStyle = g; c.beginPath(); for (let i = 0; i < 6; i++) { const q = i * TAU / 6 + time * .5; c.lineTo(Math.cos(q) * .25, Math.sin(q) * .25); } c.closePath(); c.fill();
      c.lineWidth = .04; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = .02; c.beginPath();
      for (let i = 0; i < 3; i++) { const q = i * Math.PI / 3 + time * .5; c.moveTo(Math.cos(q) * .16, Math.sin(q) * .16); c.lineTo(-Math.cos(q) * .16, -Math.sin(q) * .16); } c.stroke();
      if (lvl >= 3) { c.globalCompositeOperation = 'lighter'; glowDot(0, 0, .4, 'rgba(120,220,255,.35)'); c.globalCompositeOperation = 'source-over'; }
      muzzle = .4; break;
    }
    case 'laser': {
      fins();
      gbar(c, 0, -.05, .52, .1, '#40444f');
      gbar(c, .15, -.085, .06, .17, col); gbar(c, .3, -.08, .05, .16, col);
      if (lvl >= 3) gbar(c, .42, -.07, .05, .14, '#ffd54f');
      const g = c.createLinearGradient(0, -.2, 0, .2); g.addColorStop(0, '#6a7186'); g.addColorStop(.5, '#2f3442'); g.addColorStop(1, '#151821');
      c.fillStyle = g; rr(c, -.26, -.19, .38, .38, .1); c.fill(); c.lineWidth = .04; c.strokeStyle = OUT; c.stroke();
      c.globalCompositeOperation = 'lighter'; glowDot(-.07, 0, .22 + Math.sin(time * 6) * .03, 'rgba(255,40,40,.6)'); c.globalCompositeOperation = 'source-over';
      gball(c, -.07, 0, .1, col, lx, ly);
      muzzle = .53; break;
    }
    case 'flame': {
      fins();
      // réservoir + buse avec veilleuse
      const g = c.createLinearGradient(-.28, 0, .1, 0); g.addColorStop(0, '#bf360c'); g.addColorStop(.5, '#ff8a50'); g.addColorStop(1, '#8d2a00');
      c.fillStyle = g; rr(c, -.28, -.17, .3, .34, .12); c.fill(); c.lineWidth = .04; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.55)'; rr(c, -.24, -.14, .22, .06, .03); c.fill();
      gbar(c, .02, -.06, .34, .12, '#5d6470'); gbar(c, .3, -.09, .1, .18, '#ffab40');
      if (lvl >= 3) gbar(c, .14, -.08, .05, .16, '#ffd54f');
      const fl = .05 + Math.abs(Math.sin(time * 23)) * .035;
      c.globalCompositeOperation = 'lighter'; glowDot(.44, 0, fl * 2.2, 'rgba(255,145,0,.8)', 'rgba(255,240,180,.9)'); c.globalCompositeOperation = 'source-over';
      muzzle = 0; break;
    }
    case 'missile': {
      // caisson à deux tubes
      const g = c.createLinearGradient(0, -.22, 0, .22); g.addColorStop(0, '#78909c'); g.addColorStop(.5, '#455a64'); g.addColorStop(1, '#263238');
      c.fillStyle = g; rr(c, -.24, -.22, .44, .44, .08); c.fill(); c.lineWidth = .04; c.strokeStyle = OUT; c.stroke();
      const tubes = lvl >= 3 ? [-.13, 0, .13] : [-.09, .09];
      for (const o of tubes) {
        c.fillStyle = '#1b1f24'; c.beginPath(); c.arc(.2, o, .055, 0, TAU); c.fill(); c.stroke();
        if (flash <= 0) { c.fillStyle = '#ff5252'; c.beginPath(); c.moveTo(.2, o - .04); c.lineTo(.3, o); c.lineTo(.2, o + .04); c.closePath(); c.fill(); c.lineWidth = .02; c.stroke(); c.lineWidth = .04; }
      }
      c.fillStyle = '#ffd740'; c.fillRect(-.2, -.2, .07, .4); // bande jaune
      c.fillStyle = 'rgba(255,255,255,.5)'; rr(c, -.2, -.19, .36, .06, .03); c.fill();
      muzzle = .32; break;
    }
    case 'boost': {
      // pylône à cristal vert + anneaux qui tournent
      const p = 1 + Math.sin(time * 4) * .06;
      for (let k = 0; k < 2; k++) { c.save(); c.rotate(time * (k ? -1.5 : 1)); c.strokeStyle = k ? '#69f0ae' : '#00c853'; c.lineWidth = .035; c.setLineDash([.12, .08]); c.beginPath(); c.arc(0, 0, .24 + k * .06, 0, TAU); c.stroke(); c.setLineDash([]); c.restore(); }
      c.globalCompositeOperation = 'lighter'; glowDot(0, 0, .35 * p, 'rgba(0,230,118,.5)'); c.globalCompositeOperation = 'source-over';
      const g = c.createLinearGradient(0, -.2, 0, .2); g.addColorStop(0, '#ccff90'); g.addColorStop(.5, '#00e676'); g.addColorStop(1, '#00692f');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -.2 * p); c.lineTo(.12, 0); c.lineTo(0, .2 * p); c.lineTo(-.12, 0); c.closePath(); c.fill();
      c.lineWidth = .035; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(-.02, -.15); c.lineTo(.05, -.03); c.lineTo(-.04, -.03); c.closePath(); c.fill();
      muzzle = 0; break;
    }
    case 'miner': {
      // pièce dorée qui tourne sur un socle de carte graphique
      c.fillStyle = '#263238'; rr(c, -.25, .05, .5, .16, .04); c.fill(); c.lineWidth = .03; c.strokeStyle = OUT; c.stroke();
      for (let k = 0; k < 5; k++) { c.fillStyle = '#ffd740'; c.fillRect(-.2 + k * .09, .17, .04, .04); }
      const w = Math.abs(Math.cos(time * 3)) * .17 + .02;
      const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, '#b8860b'); g.addColorStop(.5, '#fff59d'); g.addColorStop(1, '#b8860b');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, -.1, w, .17, 0, 0, TAU); c.fill(); c.lineWidth = .035; c.strokeStyle = OUT; c.stroke();
      if (w > .1) { c.fillStyle = '#8d6e00'; c.font = 'bold .2px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('¢', 0, -.09); }
      if (lvl >= 3) { c.globalCompositeOperation = 'lighter'; glowDot(0, -.1, .3, 'rgba(255,215,64,.35)'); c.globalCompositeOperation = 'source-over'; }
      muzzle = 0; break;
    }
    case 'tesla': {
      for (let i = 0; i < 4 + (lvl >= 3 ? 1 : 0); i++) {
        const y = .17 - i * .075, w = .2 - i * .018;
        const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, '#7a3d12'); g.addColorStop(.35, '#ffb26b'); g.addColorStop(1, '#7a3d12');
        c.fillStyle = g; c.beginPath(); c.ellipse(0, y, w, .05, 0, 0, TAU); c.fill(); c.lineWidth = .025; c.strokeStyle = OUT; c.stroke();
      }
      const p = .14 + Math.sin(time * 8) * .015, oy = lvl >= 3 ? -.25 : -.2;
      c.globalCompositeOperation = 'lighter'; glowDot(0, oy, p * 3, 'rgba(255,235,59,.55)'); c.globalCompositeOperation = 'source-over';
      gball(c, 0, oy, p, '#fff59d', -.7, -.7);
      if (Math.sin(time * 13) > .5) {
        c.strokeStyle = 'rgba(255,255,180,.95)'; c.lineWidth = .02; c.beginPath();
        for (let k = 0; k < 2; k++) { c.moveTo(0, oy); for (let j = 1; j < 4; j++) c.lineTo(rand(-.3, .3), oy + rand(-.2, .25)); }
        c.stroke();
      }
      muzzle = 0; break;
    }
  }
  if (flash > 0 && muzzle) {
    c.globalCompositeOperation = 'lighter';
    const f = flash / .07, g2 = c.createRadialGradient(muzzle, 0, 0, muzzle, 0, .28 * f + .05);
    g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(.35, col); g2.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g2; c.beginPath(); c.arc(muzzle, 0, .28 * f + .05, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
}


// ======== style « Vieux PC » : bois, pierre et fer (catapultes, arbalètes…) ========
const RO = '#2a1a0e';
function wood(c, x, y, w, h, dark) {
  const b = dark ? '#6d4524' : '#a86e34', g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(b, .35)); g.addColorStop(.5, b); g.addColorStop(1, shade(b, -.45));
  c.fillStyle = g; rr(c, x, y, w, h, Math.min(w, h) * .3); c.fill();
  c.lineWidth = .022; c.strokeStyle = RO; c.stroke();
  c.strokeStyle = 'rgba(60,30,10,.5)'; c.lineWidth = .009; c.beginPath();
  if (w >= h) { c.moveTo(x + w * .08, y + h * .38); c.lineTo(x + w * .9, y + h * .38); c.moveTo(x + w * .2, y + h * .68); c.lineTo(x + w * .7, y + h * .68); }
  else { c.moveTo(x + w * .38, y + h * .08); c.lineTo(x + w * .38, y + h * .9); }
  c.stroke();
}
function iron(c, x, y, w, h) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#9ea3a8'); g.addColorStop(.5, '#585d63'); g.addColorStop(1, '#2b2e32');
  c.fillStyle = g; c.fillRect(x, y, w, h); c.lineWidth = .012; c.strokeStyle = RO; c.strokeRect(x, y, w, h);
}
function rock(c, x, y, r, lx, ly, seed) {
  c.beginPath();
  for (let i = 0; i < 9; i++) { const q = i * TAU / 9, k = .8 + ((Math.sin((seed || 1) * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1 * .3; c.lineTo(x + Math.cos(q) * r * k, y + Math.sin(q) * r * k); }
  c.closePath();
  const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .1, x, y, r * 1.1); g.addColorStop(0, '#c8bfae'); g.addColorStop(.55, '#80766a'); g.addColorStop(1, '#3d3731');
  c.fillStyle = g; c.fill(); c.lineWidth = r * .14; c.strokeStyle = RO; c.stroke();
}
function drawRetroBase(c, type, lvl) {
  const d = TOWERS[type];
  c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, -.41, -.37, .92, .92, .1); c.fill();
  let g = c.createLinearGradient(0, -.46, 0, .46);
  g.addColorStop(0, '#cfc8b8'); g.addColorStop(.5, '#a09886'); g.addColorStop(1, '#666052');
  c.fillStyle = g; rr(c, -.46, -.46, .92, .92, .1); c.fill();
  // pavés de pierre
  c.save(); rr(c, -.46, -.46, .92, .92, .1); c.clip();
  for (let r = 0; r < 4; r++) for (let k = -1; k < 4; k++) {
    const x = -.46 + k * .31 + (r % 2) * .155, y = -.46 + r * .23, sh = ((r * 7 + k * 13) % 5) / 5;
    c.fillStyle = 'rgba(' + (sh > .5 ? '255,255,255,.07' : '0,0,0,.08') + ')'; c.fillRect(x + .01, y + .01, .29, .21);
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x + .02, y + .015, .26, .02);
    c.strokeStyle = 'rgba(45,35,25,.6)'; c.lineWidth = .016; c.strokeRect(x, y, .31, .23);
  }
  c.restore();
  c.lineWidth = .05; c.strokeStyle = lvl >= TMAX ? '#7a5200' : RO; rr(c, -.46, -.46, .92, .92, .1); c.stroke();
  if (lvl >= TMAX) { c.lineWidth = .03; c.strokeStyle = '#ffca28'; rr(c, -.42, -.42, .84, .84, .08); c.stroke(); }
  // plateforme ronde en planches
  c.save(); c.beginPath(); c.arc(0, 0, .33, 0, TAU); c.clip();
  g = c.createRadialGradient(-.1, -.1, .02, 0, 0, .35); g.addColorStop(0, '#b77a3e'); g.addColorStop(1, '#5a3618');
  c.fillStyle = g; c.fillRect(-.35, -.35, .7, .7);
  c.strokeStyle = 'rgba(40,20,5,.6)'; c.lineWidth = .014; c.beginPath();
  for (let i = -2; i <= 2; i++) { c.moveTo(-.35, i * .13); c.lineTo(.35, i * .13); }
  c.stroke(); c.restore();
  c.lineWidth = .05; c.strokeStyle = '#3d4044'; c.beginPath(); c.arc(0, 0, .33, 0, TAU); c.stroke();
  c.lineWidth = .02; c.strokeStyle = d.col; c.beginPath(); c.arc(0, 0, .33, 0, TAU); c.stroke();
  for (let i = 0; i < 8; i++) { const q = i * TAU / 8; c.fillStyle = '#c9ccd0'; c.beginPath(); c.arc(Math.cos(q) * .33, Math.sin(q) * .33, .018, 0, TAU); c.fill(); }
  for (let i = 0; i < lvl - 1; i++) star(c, (i - (lvl - 2) / 2) * .2, .39, .075);
}
function bowArc(c, bx, half, bend, lw) {
  c.lineCap = 'round';
  for (const [w, col] of [[lw + .03, RO], [lw, '#7b4a20'], [lw * .35, '#c68a4c']]) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(bx - .1, -half); c.quadraticCurveTo(bx + bend, 0, bx - .1, half); c.stroke();
  }
  c.lineCap = 'butt';
}
function bolt(c, x1, x2, y) {
  c.strokeStyle = '#e8dcc8'; c.lineWidth = .025; c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke();
  c.fillStyle = '#9ea3a8'; c.beginPath(); c.moveTo(x2 + .07, y); c.lineTo(x2, y - .035); c.lineTo(x2, y + .035); c.closePath(); c.fill(); c.lineWidth = .01; c.strokeStyle = RO; c.stroke();
  c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(x1, y); c.lineTo(x1 - .05, y - .04); c.lineTo(x1 + .03, y); c.lineTo(x1 - .05, y + .04); c.closePath(); c.fill();
}
function drawRetroTurret(c, type, lvl, ang, time, flash) {
  const d = TOWERS[type], col = d.col, fixed = type === 'tesla' || type === 'boost' || type === 'miner';
  const a = fixed ? 0 : ang, [lx, ly] = lightFor(a), k = flash > 0 ? flash / .07 : 0;
  softShadow(c, .05, .07, .3, .3, .5);
  c.save(); c.rotate(a);
  let muzzle = 0;
  switch (type) {
    case 'pulse': { // arbalète
      wood(c, -.24, -.05, .6, .1);
      if (lvl >= 2) { iron(c, -.12, -.06, .03, .12); iron(c, .05, -.06, .03, .12); }
      const bows = lvl >= 3 ? [.3, .16] : [.28];
      for (const bx of bows) {
        bowArc(c, bx, .3, .14, .045);
        const pull = k > 0 ? bx - .06 : -.08;
        c.strokeStyle = '#f5f0e6'; c.lineWidth = .012; c.beginPath(); c.moveTo(bx - .1, -.3); c.lineTo(pull, 0); c.lineTo(bx - .1, .3); c.stroke();
      }
      if (k <= 0) bolt(c, -.06, .36, 0);
      ball(c, -.15, 0, .09, '#8d5a2b', lx, ly); c.lineWidth = .02; c.strokeStyle = RO; c.stroke();
      muzzle = .44; break;
    }
    case 'gatling': { // baliste à répétition
      wood(c, -.28, -.08, .66, .16, true);
      bowArc(c, .3, .36, .16, .07);
      c.strokeStyle = '#f5f0e6'; c.lineWidth = .014; c.beginPath(); c.moveTo(.2, -.36); c.lineTo(k > 0 ? .2 : -.04, 0); c.lineTo(.2, .36); c.stroke();
      // chargeur de flèches qui défile
      wood(c, -.2, -.15, .26, .3);
      iron(c, -.2, -.15, .26, .035); iron(c, -.2, .115, .26, .035);
      const n = lvl >= 3 ? 4 : 3, off = (time * 6) % 1;
      for (let i = 0; i < n; i++) { const y = -.1 + ((i + off) / n) * .2; c.fillStyle = '#9ea3a8'; c.beginPath(); c.moveTo(.08, y); c.lineTo(.02, y - .025); c.lineTo(.02, y + .025); c.closePath(); c.fill(); }
      if (k <= 0) bolt(c, .02, .4, 0);
      muzzle = .46; break;
    }
    case 'cannon': { // catapulte
      for (const y of [-.2, .2]) wood(c, -.34, y - .045, .68, .09, true);
      wood(c, -.3, -.2, .07, .4); wood(c, .18, -.2, .07, .4);
      for (const [x, y] of [[-.28, -.24], [.24, -.24], [-.28, .24], [.24, .24]]) { ball(c, x, y, .055, '#4e342e', lx, ly); c.lineWidth = .015; c.strokeStyle = RO; c.stroke(); }
      // bras : armé vers l'arrière, projeté vers l'avant au moment du tir
      const ax = .05 - .37 * (1 - 2 * k), big = lvl >= 3 ? 1.2 : 1;
      c.strokeStyle = RO; c.lineWidth = .1; c.beginPath(); c.moveTo(.05, 0); c.lineTo(ax, 0); c.stroke();
      c.strokeStyle = '#a86e34'; c.lineWidth = .07; c.stroke();
      iron(c, .01, -.13, .08, .26);
      c.fillStyle = '#5d3a1a'; c.beginPath(); c.arc(ax, 0, .1 * big, 0, TAU); c.fill(); c.lineWidth = .025; c.strokeStyle = RO; c.stroke();
      if (k < .5) rock(c, ax, 0, .075 * big, lx, ly, 3);
      muzzle = 0; break;
    }
    case 'frost': { // chaudron de potion glacée
      for (let i = 0; i < 3; i++) { const q = i * TAU / 3 + .5; iron(c, Math.cos(q) * .24 - .03, Math.sin(q) * .24 - .03, .06, .06); }
      gbarIron(c, .12, -.045, .3, .09);
      ball(c, 0, 0, .26, '#3b3f45', lx, ly, '#8a9099'); c.lineWidth = .03; c.strokeStyle = RO; c.stroke();
      c.lineWidth = .04; c.strokeStyle = '#6b7079'; c.beginPath(); c.arc(0, 0, .22, 0, TAU); c.stroke();
      const g = c.createRadialGradient(0, 0, .02, 0, 0, .2); g.addColorStop(0, '#e1f9ff'); g.addColorStop(.5, '#4fc3f7'); g.addColorStop(1, '#01579b');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, .19, 0, TAU); c.fill();
      for (let i = 0; i < 4; i++) { const q = time * 1.5 + i * 1.7, r = .04 + ((time * .7 + i * .3) % 1) * .1; c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .012; c.beginPath(); c.arc(Math.cos(q) * .08, Math.sin(q) * .08, r * .3, 0, TAU); c.stroke(); }
      if (lvl >= 3) for (let i = 0; i < 5; i++) { const q = i * TAU / 5 - time * .8; c.save(); c.translate(Math.cos(q) * .3, Math.sin(q) * .3); c.rotate(q); c.fillStyle = 'rgba(200,245,255,.9)'; c.beginPath(); c.moveTo(.05, 0); c.lineTo(0, -.025); c.lineTo(-.05, 0); c.lineTo(0, .025); c.closePath(); c.fill(); c.restore(); }
      c.globalCompositeOperation = 'lighter'; glowDot(0, 0, .3, 'rgba(120,220,255,.35)'); c.globalCompositeOperation = 'source-over';
      muzzle = .42; break;
    }
    case 'flame': { // tête de dragon en bronze
      const g = c.createRadialGradient(-.05 + lx * .1, ly * .1, .03, 0, 0, .34); g.addColorStop(0, '#9ccc65'); g.addColorStop(.6, '#43a047'); g.addColorStop(1, '#1b5e20');
      for (const s of [-1, 1]) { c.fillStyle = '#e0c068'; c.beginPath(); c.moveTo(-.16, s * .12); c.lineTo(-.42, s * .24); c.lineTo(-.22, s * .04); c.closePath(); c.fill(); c.lineWidth = .02; c.strokeStyle = RO; c.stroke(); }
      c.fillStyle = g; c.beginPath();
      c.moveTo(.42, -.05); c.quadraticCurveTo(.46, 0, .42, .05); c.lineTo(.2, .12); c.quadraticCurveTo(.05, .22, -.18, .18); c.quadraticCurveTo(-.32, 0, -.18, -.18); c.quadraticCurveTo(.05, -.22, .2, -.12); c.closePath();
      c.fill(); c.lineWidth = .03; c.strokeStyle = RO; c.stroke();
      if (lvl >= 2) for (let i = 0; i < 4; i++) { const x = -.18 + i * .09; c.fillStyle = '#e0c068'; c.beginPath(); c.moveTo(x, -.03); c.lineTo(x - .06, 0); c.lineTo(x, .03); c.closePath(); c.fill(); }
      for (const s of [-1, 1]) {
        c.fillStyle = '#ffeb3b'; c.beginPath(); c.ellipse(.12, s * .1, .045, .03, s * .3, 0, TAU); c.fill(); c.lineWidth = .012; c.strokeStyle = RO; c.stroke();
        c.fillStyle = '#111'; c.fillRect(.115, s * .1 - .022, .012, .044);
        c.fillStyle = RO; c.beginPath(); c.arc(.38, s * .028, .012, 0, TAU); c.fill();
      }
      const fl = .05 + Math.abs(Math.sin(time * 23)) * .035;
      c.globalCompositeOperation = 'lighter'; glowDot(.46, 0, fl * 2.2, 'rgba(255,145,0,.8)', 'rgba(255,240,180,.9)'); c.globalCompositeOperation = 'source-over';
      muzzle = 0; break;
    }
    case 'missile': { // trébuchet
      for (const y of [-.22, .22]) wood(c, -.36, y - .04, .7, .08, true);
      for (const y of [-.22, .22]) { c.fillStyle = '#7b4a20'; c.beginPath(); c.moveTo(-.18, y); c.lineTo(0, y * .35); c.lineTo(.18, y); c.closePath(); c.fill(); c.lineWidth = .02; c.strokeStyle = RO; c.stroke(); }
      const sw = k > 0 ? .35 : 0;
      c.save(); c.rotate(sw);
      wood(c, -.28, -.035, .66, .07);
      c.fillStyle = '#5d5a56'; rr(c, -.36, -.12, .14, .24, .03); c.fill(); c.lineWidth = .02; c.strokeStyle = RO; c.stroke();
      iron(c, -.36, -.02, .14, .04);
      if (k <= 0) { c.globalCompositeOperation = 'lighter'; glowDot(.38, 0, .13 + Math.sin(time * 15) * .015, 'rgba(255,120,0,.8)', 'rgba(255,230,150,.9)'); c.globalCompositeOperation = 'source-over'; rock(c, .38, 0, .05, lx, ly, 5); }
      c.restore();
      iron(c, -.02, -.22, .04, .44);
      if (lvl >= 3) { c.fillStyle = col; c.fillRect(-.33, -.27, .1, .04); c.fillRect(-.33, .23, .1, .04); }
      muzzle = .4; break;
    }
    case 'laser': { // tour du mage avec bâton de cristal
      const g = c.createRadialGradient(lx * .1, ly * .1, .03, 0, 0, .3); g.addColorStop(0, '#d7d0c2'); g.addColorStop(1, '#6e675b');
      for (let i = 0; i < 8; i++) { const q = i * TAU / 8; c.save(); c.rotate(q); c.fillStyle = '#9b9384'; c.fillRect(.22, -.055, .1, .11); c.lineWidth = .016; c.strokeStyle = RO; c.strokeRect(.22, -.055, .1, .11); c.restore(); }
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, .25, 0, TAU); c.fill(); c.lineWidth = .025; c.strokeStyle = RO; c.stroke();
      c.strokeStyle = 'rgba(45,35,25,.5)'; c.lineWidth = .012; c.beginPath(); c.arc(0, 0, .15, 0, TAU); c.stroke();
      wood(c, -.08, -.025, .44, .05, true);
      c.fillStyle = col; c.beginPath(); c.moveTo(.48, 0); c.lineTo(.4, -.06); c.lineTo(.33, 0); c.lineTo(.4, .06); c.closePath(); c.fill(); c.lineWidth = .016; c.strokeStyle = RO; c.stroke();
      c.globalCompositeOperation = 'lighter'; glowDot(.4, 0, .16 + Math.sin(time * 6) * .03, 'rgba(255,60,90,.6)'); c.globalCompositeOperation = 'source-over';
      if (lvl >= 3) for (let i = 0; i < 3; i++) { const q = time * 2 + i * TAU / 3; c.fillStyle = 'rgba(255,215,64,.9)'; c.font = 'bold .1px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ᚱᛟᚾ'[i], Math.cos(q) * .14, Math.sin(q) * .14); }
      muzzle = .48; break;
    }
    case 'tesla': { // pilier de pierre gravé de runes et orbe magique
      c.fillStyle = '#857d6f'; c.beginPath(); for (let i = 0; i < 8; i++) { const q = i * TAU / 8 + Math.PI / 8; c.lineTo(Math.cos(q) * .26, Math.sin(q) * .26); } c.closePath(); c.fill(); c.lineWidth = .03; c.strokeStyle = RO; c.stroke();
      c.fillStyle = '#b5ad9c'; c.beginPath(); for (let i = 0; i < 8; i++) { const q = i * TAU / 8 + Math.PI / 8; c.lineTo(Math.cos(q) * .18, Math.sin(q) * .18 - .03); } c.closePath(); c.fill(); c.lineWidth = .02; c.stroke();
      const on = .6 + Math.sin(time * 5) * .4;
      c.fillStyle = 'rgba(255,230,80,' + on + ')'; c.font = 'bold .09px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 6; i++) { const q = i * TAU / 6; c.fillText('ᚠᚢᚦᚨᚱᚲ'[i], Math.cos(q) * .22, Math.sin(q) * .22); }
      const p = .1 + Math.sin(time * 8) * .012, oy = lvl >= 3 ? -.12 : -.08;
      c.globalCompositeOperation = 'lighter'; glowDot(0, oy, p * 3.4, 'rgba(160,120,255,.55)'); c.globalCompositeOperation = 'source-over';
      ball(c, 0, oy, p, '#b39ddb', -.7, -.7, '#ffffff');
      if (Math.sin(time * 13) > .5) {
        c.strokeStyle = 'rgba(220,200,255,.95)'; c.lineWidth = .02; c.beginPath();
        for (let q = 0; q < 2; q++) { c.moveTo(0, oy); for (let j = 1; j < 4; j++) c.lineTo(rand(-.3, .3), oy + rand(-.2, .25)); }
        c.stroke();
      }
      muzzle = 0; break;
    }
    case 'boost': { // tambour de guerre et bannières
      const beat = Math.max(0, Math.sin(time * 6)) * .02;
      for (const s of [-1, 1]) {
        iron(c, s * .24 - .012, -.3, .024, .3);
        const wv = Math.sin(time * 4 + s) * .03;
        c.fillStyle = '#00c853'; c.beginPath(); c.moveTo(s * .24, -.3); c.lineTo(s * .24 + s * .16, -.27 + wv); c.lineTo(s * .24 + s * .12, -.2); c.lineTo(s * .24 + s * .16, -.13 + wv); c.lineTo(s * .24, -.16); c.closePath(); c.fill(); c.lineWidth = .015; c.strokeStyle = RO; c.stroke();
      }
      c.fillStyle = '#b71c1c'; c.beginPath(); c.arc(0, .04, .22, 0, TAU); c.fill(); c.lineWidth = .03; c.strokeStyle = RO; c.stroke();
      c.strokeStyle = '#ffd54f'; c.lineWidth = .014; c.beginPath(); for (let i = 0; i <= 12; i++) { const q = i * TAU / 12; c.lineTo(Math.cos(q) * (i % 2 ? .16 : .21), .04 + Math.sin(q) * (i % 2 ? .16 : .21)); } c.stroke();
      const g = c.createRadialGradient(-.04, 0, .01, 0, .04, .16 + beat); g.addColorStop(0, '#fff8e1'); g.addColorStop(1, '#d7b98a');
      c.fillStyle = g; c.beginPath(); c.arc(0, .04, .14 + beat, 0, TAU); c.fill(); c.lineWidth = .015; c.strokeStyle = RO; c.stroke();
      c.globalCompositeOperation = 'lighter'; glowDot(0, .04, .32 + beat * 4, 'rgba(0,230,118,.35)'); c.globalCompositeOperation = 'source-over';
      muzzle = 0; break;
    }
    case 'miner': { // coffre au trésor ouvert
      wood(c, -.27, -.22, .54, .14, true);
      iron(c, -.27, -.22, .54, .025);
      wood(c, -.27, -.07, .54, .3);
      iron(c, -.2, -.07, .04, .3); iron(c, .16, -.07, .04, .3);
      c.fillStyle = '#ffca28'; c.fillRect(-.04, .02, .08, .08); c.lineWidth = .012; c.strokeStyle = RO; c.strokeRect(-.04, .02, .08, .08);
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#ffd740' : '#ffb300'; c.beginPath(); c.ellipse(-.18 + i * .07, -.08, .045, .03, 0, 0, TAU); c.fill(); c.lineWidth = .01; c.strokeStyle = '#8d6e00'; c.stroke(); }
      const w = Math.abs(Math.cos(time * 3)) * .12 + .015, y = -.22 + Math.sin(time * 2) * .02;
      const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, '#b8860b'); g.addColorStop(.5, '#fff59d'); g.addColorStop(1, '#b8860b');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, y, w, .12, 0, 0, TAU); c.fill(); c.lineWidth = .025; c.strokeStyle = RO; c.stroke();
      if (lvl >= 3) { c.globalCompositeOperation = 'lighter'; glowDot(0, -.1, .32, 'rgba(255,215,64,.4)'); c.globalCompositeOperation = 'source-over'; }
      muzzle = 0; break;
    }
  }
  if (k > 0 && muzzle) { // petit nuage de poussière / étincelles au tir
    c.globalAlpha = k * .8; c.fillStyle = '#e8dcc8';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(muzzle + i * .04, (i - 1) * .05, .04 * (1 + (1 - k) * 2), 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  }
  c.restore();
}
function gbarIron(c, x, y, w, h) { iron(c, x, y, w, h); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, y + h * .15, w, h * .15); }

// ======== style « Futur quantique » : socle hexagonal et néons ========
function drawNeoBase(c, type, lvl) {
  const d = TOWERS[type], hex = (r) => { c.beginPath(); for (let i = 0; i < 6; i++) { const q = i * TAU / 6 + Math.PI / 6; c.lineTo(Math.cos(q) * r, Math.sin(q) * r); } c.closePath(); };
  c.save(); c.translate(.04, .06); hex(.5); c.fillStyle = 'rgba(0,0,0,.5)'; c.fill(); c.restore();
  let g = c.createLinearGradient(0, -.5, 0, .5); g.addColorStop(0, '#2c3450'); g.addColorStop(.5, '#151a2b'); g.addColorStop(1, '#090b14');
  hex(.5); c.fillStyle = g; c.fill(); c.lineWidth = .035; c.strokeStyle = lvl >= TMAX ? '#ffd740' : '#05060b'; c.stroke();
  // lignes de circuit lumineuses
  c.save(); hex(.47); c.clip();
  c.strokeStyle = rgbaA(d.col).replace('A', '.22'); c.lineWidth = .012; c.beginPath();
  for (let i = -3; i <= 3; i++) { c.moveTo(-.5, i * .14); c.lineTo(.5, i * .14 + .2); }
  c.stroke(); c.restore();
  // anneau néon
  c.globalCompositeOperation = 'lighter';
  c.lineWidth = .07; c.strokeStyle = rgbaA(d.col).replace('A', '.25'); hex(.4); c.stroke();
  c.lineWidth = .022; c.strokeStyle = d.col; hex(.4); c.stroke();
  c.globalCompositeOperation = 'source-over';
  g = c.createRadialGradient(0, 0, .02, 0, 0, .3); g.addColorStop(0, rgbaA(d.col).replace('A', '.35')); g.addColorStop(1, 'rgba(0,0,0,.6)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, .29, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = .012; c.beginPath(); c.arc(0, 0, .2, 0, TAU); c.stroke();
  // niveaux : petits losanges lumineux
  for (let i = 0; i < lvl - 1; i++) {
    const x = (i - (lvl - 2) / 2) * .16, y = .4;
    c.fillStyle = lvl >= TMAX ? '#ffd740' : '#7df9ff'; c.beginPath(); c.moveTo(x, y - .05); c.lineTo(x + .04, y); c.lineTo(x, y + .05); c.lineTo(x - .04, y); c.closePath(); c.fill();
  }
}

// ---- virus en style cartoon brillant (contours épais, gros yeux, reflets) ----
function eyeC(x, y, r, look, angry, pupil) {
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.08, 0, 0, TAU); ctx.fill();
  ctx.lineWidth = r * .26; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = pupil || '#111'; ctx.beginPath(); ctx.arc(x + r * .32 + look[0] * r * .1, y + look[1] * r * .1, r * .5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + r * .15, y - r * .22, r * .18, 0, TAU); ctx.fill();
}
// ---- virus : chaque sorte a sa propre silhouette (style cartoon brillant) ----
function glossBody(r, col, lx, ly, lw, path) {
  const g = ctx.createRadialGradient(lx * r * .4, ly * r * .4, r * .08, 0, 0, r * 1.15);
  g.addColorStop(0, shade(col, .6)); g.addColorStop(.5, col); g.addColorStop(1, shade(col, -.5));
  ctx.fillStyle = g; path(); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
}
function shine(r, lx, ly, k) {
  ctx.save(); ctx.translate(lx * r * .45, ly * r * .45); ctx.rotate(Math.atan2(ly, lx) + Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(0, 0, r * .36 * (k || 1), r * .15 * (k || 1), 0, 0, TAU); ctx.fill(); ctx.restore();
}
function blobPath(r, n, amp, ph) { return () => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr2 = r * (1 + amp * Math.sin(a * n + ph)); i ? ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : ctx.moveTo(rr2, 0); } ctx.closePath(); }; }
function legs(e, r, lw, n, len, col) {
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
    const k = e.stunT > 0 ? 0 : Math.sin(e.anim * 14 + i * 2.1 + (s > 0 ? Math.PI : 0)) * r * .28;
    const bx = (i - (n - 1) / 2) * r * .55, fx = bx + k, fy = s * r * len;
    ctx.strokeStyle = OUT; ctx.lineWidth = lw * 1.5; ctx.beginPath(); ctx.moveTo(bx, s * r * .5); ctx.quadraticCurveTo(bx + k * .3, s * r * (len - .1), fx, fy); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(fx, fy, r * .19, r * .12, 0, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .7; ctx.stroke();
  }
}
function face(e, r, lw, o) {
  o = o || {};
  const look = [.1, 0], ex = r * (o.x || .38), sp = r * (o.sp || .33), er = r * (o.er || .27);
  if (e.stunT > 0 && !e.frozen) {
    ctx.strokeStyle = OUT; ctx.lineWidth = lw * .8;
    for (const s of [-1, 1]) { const q = er * .5; ctx.beginPath(); ctx.moveTo(ex - q, s * sp - q); ctx.lineTo(ex + q, s * sp + q); ctx.moveTo(ex + q, s * sp - q); ctx.lineTo(ex - q, s * sp + q); ctx.stroke(); }
  } else if (o.one) eyeC(ex, 0, er * 1.5, look, null, o.pupil);
  else {
    for (const s of [-1, 1]) eyeC(ex, s * sp, er, look, null, o.pupil);
    if (o.three) eyeC(ex + r * .12, 0, er * .8, look, null, o.pupil);
    if (!o.nice) { ctx.strokeStyle = OUT; ctx.lineWidth = lw * 1.1; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex - er * 1.1, s * (sp + er * 1.2)); ctx.lineTo(ex + er * 1.1, s * (sp - er * .5)); ctx.stroke(); } }
  }
  if (o.mouth !== false) {
    const mx = r * (o.mx || .8), mw = r * (o.mw || .3);
    if (o.nice) { ctx.strokeStyle = OUT; ctx.lineWidth = lw * .9; ctx.beginPath(); ctx.arc(mx - r * .18, 0, mw, -.9, .9); ctx.stroke(); return; }
    ctx.fillStyle = '#3b0a0a'; ctx.beginPath(); ctx.ellipse(mx, 0, r * .13, mw, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.lineWidth = lw * .8; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = '#fff'; const nt = o.teeth || 2;
    for (let i = 0; i < nt; i++) { const y0 = -mw + (i + .5) * (2 * mw / nt); ctx.beginPath(); ctx.moveTo(mx, y0 - mw / nt * .6); ctx.lineTo(mx + r * .1, y0); ctx.lineTo(mx, y0 + mw / nt * .6); ctx.fill(); }
  }
}
function drawEnemy(e) {
  const d = ETYPES[e.type], r = e.r, [lx, ly] = lightFor(e.ang), col = e.hit > 0 ? '#ffffff' : d.col;
  const lw = Math.max(.025, r * .14), t = e.anim;
  ctx.save(); ctx.translate(e.x, e.y);
  softShadow(ctx, e.fly ? .16 : .05, e.fly ? .24 : .08, r * 1.3, r * 1.05, e.fly ? .35 : .6);
  if (e.fly) ctx.translate(0, -.06 + Math.sin(t * 4) * .03);
  const grow = Math.min(1, (e.age || 0) / .35); if (grow < 1) { ctx.scale(grow, grow); ctx.globalAlpha = grow; }
  if (e.type === 'ghost') ctx.globalAlpha *= e.phased ? .22 : .88;
  ctx.rotate(e.ang + (1 - grow) * 6);
  const stunned = e.stunT > 0;
  if (!e.fly && !stunned && e.type !== 'ghost') { const b = Math.sin(t * (e.type === 'runner' ? 22 : 14)) * .07; ctx.scale(1 + b, 1 - b); }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const circle = rad => () => { ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); };
  switch (e.type) {
    case 'bug': case 'mini': case 'boss': { // virus classique à pics
      legs(e, r, lw, e.type === 'mini' ? 2 : 3, 1.2, shade(d.col, -.35));
      const sp = e.type === 'boss' ? 14 : 8;
      for (let i = 0; i < sp; i++) {
        const q = i * TAU / sp + t * .5, cq = Math.cos(q), sq = Math.sin(q);
        ctx.strokeStyle = OUT; ctx.lineWidth = lw * 1.3; ctx.beginPath(); ctx.moveTo(cq * r * .8, sq * r * .8); ctx.lineTo(cq * r * 1.16, sq * r * 1.16); ctx.stroke();
        ctx.fillStyle = e.type === 'boss' ? '#ffca28' : d.col; ctx.beginPath(); ctx.arc(cq * r * 1.2, sq * r * 1.2, r * .15, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .7; ctx.stroke();
      }
      glossBody(r, col, lx, ly, lw, circle(r));
      ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 3; i++) { const q = (e.id * 2.3 + i * 2.1) % TAU; ctx.beginPath(); ctx.arc(Math.cos(q) * r * .55 - r * .2, Math.sin(q) * r * .55, r * .12, 0, TAU); ctx.fill(); }
      if (e.type === 'boss') { // couronne + cornes + aura qui bat
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(0, 0, r * (1.3 + .1 * Math.sin(t * 6)), 'rgba(255,40,40,.25)'); ctx.restore();
        for (const s of [-1, 1]) { ctx.save(); ctx.translate(-r * .15, s * r * .8); ctx.rotate(s * .5 + Math.PI); const g = ctx.createLinearGradient(0, -r * .15, 0, r * .15); g.addColorStop(0, '#fff8e1'); g.addColorStop(1, '#ffb300'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -r * .17); ctx.quadraticCurveTo(r * .5, -r * .1, r * .62, r * .05); ctx.quadraticCurveTo(r * .35, r * .05, 0, r * .17); ctx.closePath(); ctx.fill(); ctx.lineWidth = lw * .8; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore(); }
        ctx.save(); ctx.translate(-r * .62, 0); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#ffd600'; ctx.beginPath(); ctx.moveTo(-r * .38, r * .12); ctx.lineTo(-r * .38, -r * .12); ctx.lineTo(-r * .2, r * .02); ctx.lineTo(0, -r * .22); ctx.lineTo(r * .2, r * .02); ctx.lineTo(r * .38, -r * .12); ctx.lineTo(r * .38, r * .12); ctx.closePath(); ctx.fill(); ctx.lineWidth = lw * .6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore();
      }
      shine(r, lx, ly);
      face(e, r, lw, e.type === 'boss' ? { three: true, pupil: '#d50000', mw: .48, teeth: 4, er: .22 } : e.type === 'mini' ? { er: .3, mw: .22 } : {});
      break;
    }
    case 'runner': { // bactérie allongée à flagelles
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 1.1;
      for (const o of [-.35, 0, .35]) { ctx.beginPath(); ctx.moveTo(-r * 1.05, o * r); for (let k = 1; k <= 6; k++) ctx.lineTo(-r * (1.05 + k * .16), o * r + Math.sin(t * 25 + k + o * 5) * r * .18); ctx.stroke(); }
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * .78, 0, 0, TAU); });
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = lw * .6; for (const o of [-.45, 0, .45]) { ctx.beginPath(); ctx.moveTo(o * r - r * .1, -r * .6); ctx.quadraticCurveTo(o * r + r * .15, 0, o * r - r * .1, r * .6); ctx.stroke(); }
      shine(r, lx, ly);
      face(e, r, lw, { x: .62, sp: .28, er: .24, mx: 1.08, mw: .22 });
      break;
    }
    case 'swarm': { // petite spore étoilée à un œil
      ctx.fillStyle = col; ctx.beginPath();
      for (let i = 0; i < 16; i++) { const q = i * TAU / 16 + t * 2, rr2 = i % 2 ? r * .8 : r * 1.25; ctx.lineTo(Math.cos(q) * rr2, Math.sin(q) * rr2); }
      ctx.closePath(); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
      glossBody(r * .78, col, lx, ly, lw * .8, circle(r * .78));
      face(e, r, lw, { one: true, x: .15, er: .26, mouth: false });
      break;
    }
    case 'armor': { // tatou blindé à plaques
      legs(e, r, lw, 3, 1.15, '#37474f');
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r, 0, 0, TAU); });
      for (let k = 0; k < 3; k++) { // bandes de métal
        const x0 = -r * .7 + k * r * .38, g = ctx.createLinearGradient(x0, 0, x0 + r * .3, 0);
        g.addColorStop(0, '#455a64'); g.addColorStop(.5, '#eceff1'); g.addColorStop(1, '#546e7a');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x0 + r * .15, 0, r * .17, r * .92, 0, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .7; ctx.strokeStyle = OUT; ctx.stroke();
        for (const s of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0 + r * .15, s * r * .55, r * .05, 0, TAU); ctx.fill(); }
      }
      shine(r, lx, ly, .8);
      face(e, r, lw, { x: .62, sp: .3, er: .22, mx: 1.0, mw: .26 });
      break;
    }
    case 'flyer': { // coccinelle volante
      const f = Math.sin(t * 34);
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(-r * .1, s * r * .35); ctx.rotate(s * (.5 + f * .5)); const g = ctx.createLinearGradient(0, 0, 0, s * r * 1.4); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(170,220,255,.4)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-r * .3, s * r * .6, r * .55, r * .8, 0, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore(); }
      glossBody(r, col, lx, ly, lw, circle(r));
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * .8; ctx.beginPath(); ctx.moveTo(r * .2, 0); ctx.lineTo(-r, 0); ctx.stroke(); // séparation des élytres
      ctx.fillStyle = '#0d47a1'; for (const [px, py] of [[-.45, -.45], [-.45, .45], [-.05, -.55], [-.05, .55], [-.7, 0]]) { ctx.beginPath(); ctx.arc(px * r, py * r, r * .12, 0, TAU); ctx.fill(); }
      shine(r, lx, ly);
      face(e, r, lw, { x: .5, er: .24, mw: .2 });
      break;
    }
    case 'regen': { // amibe qui bouillonne
      glossBody(r, col, lx, ly, lw, blobPath(r, 5, .12, t * 3));
      for (let i = 0; i < 5; i++) { const q = (e.id + i * 1.3) % TAU, dd = r * (.3 + .15 * Math.sin(t * 2 + i)), s2 = r * (.08 + .05 * Math.sin(t * 6 + i)); ctx.fillStyle = 'rgba(118,255,3,.85)'; ctx.beginPath(); ctx.arc(Math.cos(q) * dd - r * .2, Math.sin(q) * dd, s2, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(Math.cos(q) * dd - r * .22, Math.sin(q) * dd - s2 * .3, s2 * .35, 0, TAU); ctx.fill(); }
      shine(r, lx, ly);
      face(e, r, lw, { er: .25 });
      break;
    }
    case 'splitter': { // cellule en train de se diviser (deux lobes)
      legs(e, r, lw, 2, 1.15, shade(d.col, -.35));
      const pinch = .12 + .06 * Math.sin(t * 4);
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); ctx.arc(-r * .45, 0, r * .72, Math.PI * .28, Math.PI * 1.72); ctx.quadraticCurveTo(0, -r * pinch * 2, r * .45 - r * .72 * Math.cos(Math.PI * .28), -r * .72 * Math.sin(Math.PI * .28)); ctx.arc(r * .45, 0, r * .72, -Math.PI * .72, Math.PI * .72); ctx.quadraticCurveTo(0, r * pinch * 2, -r * .45 + r * .72 * Math.cos(Math.PI * .28), r * .72 * Math.sin(Math.PI * .28)); ctx.closePath(); });
      shine(r * .8, lx, ly);
      face(e, r, lw, { x: .55, sp: .28, er: .22, mx: 1.0, mw: .22 });
      eyeC(-r * .45, 0, r * .24, [.1, 0]); // deuxième visage qui va se détacher
      break;
    }
    case 'shield': { // cellule hexagonale
      legs(e, r, lw, 3, 1.15, '#01579b');
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i * TAU / 6 + Math.PI / 6; ctx.lineTo(Math.cos(q) * r * 1.08, Math.sin(q) * r * 1.08); } ctx.closePath(); });
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = lw * .5; ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i * TAU / 6 + Math.PI / 6; ctx.lineTo(Math.cos(q) * r * .62, Math.sin(q) * r * .62); } ctx.closePath(); ctx.stroke();
      shine(r, lx, ly);
      face(e, r, lw, { er: .25 });
      break;
    }
    case 'ghost': { // fantôme en drap
      glossBody(r, col, lx, ly, lw, () => {
        ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
        for (let i = 0; i <= 8; i++) { const yy = r - i * r / 4; ctx.lineTo(-r * (1.1 + .25 * Math.sin(t * 9 + i * 1.3)) - (i % 2 ? r * .25 : 0), yy); }
        ctx.closePath();
      });
      shine(r, lx, ly);
      face(e, r, lw, { x: .3, er: .28, pupil: '#1a237e', mx: .78, mw: .2, teeth: 1 });
      break;
    }
    case 'healer': { // soigneur avec auréole
      legs(e, r, lw, 3, 1.15, shade(d.col, -.35));
      glossBody(r, col, lx, ly, lw, circle(r));
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = OUT; ctx.lineWidth = lw * .6;
      ctx.beginPath(); ctx.rect(-r * .62, -r * .13, r * .44, r * .26); ctx.rect(-r * .53, -r * .22, r * .26, r * .44); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff1744'; ctx.fillRect(-r * .58, -r * .07, r * .36, r * .14); ctx.fillRect(-r * .47, -r * .18, r * .14, r * .36);
      ctx.strokeStyle = '#fff59d'; ctx.lineWidth = lw * .9; ctx.beginPath(); ctx.ellipse(-r * .1, 0, r * .25, r * .95, 0, 0, TAU); ctx.globalAlpha *= .9; ctx.stroke();
      shine(r, lx, ly);
      face(e, r, lw, { x: .45, er: .24, nice: true, mw: .22 });
      break;
    }
    case 'giant': { // géant cabossé
      legs(e, r, lw, 3, 1.1, '#4e342e');
      glossBody(r, col, lx, ly, lw, blobPath(r, 7, .06, e.id));
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * .6;
      ctx.beginPath(); ctx.moveTo(-r * .7, -r * .45); ctx.lineTo(-r * .15, -r * .05); for (let i = 0; i < 4; i++) { const u = i / 3, x0 = -r * .7 + u * r * .55, y0 = -r * .45 + u * r * .4; ctx.moveTo(x0 - r * .08, y0 + r * .08); ctx.lineTo(x0 + r * .08, y0 - r * .08); } ctx.stroke();
      for (const s2 of [-1, 1]) { ctx.fillStyle = '#efebe9'; ctx.beginPath(); ctx.moveTo(r * .25, s2 * r * .72); ctx.lineTo(r * .1, s2 * r * 1.2); ctx.lineTo(-r * .08, s2 * r * .68); ctx.closePath(); ctx.fill(); ctx.lineWidth = lw * .6; ctx.stroke(); }
      shine(r, lx, ly, .8);
      face(e, r, lw, { x: .45, sp: .28, er: .17, mw: .42, teeth: 4 });
      break;
    }
    case 'jumper': { // sauteur façon grenouille
      const crouch = e.jumpT !== undefined ? clamp(1 - e.jumpT / .5, 0, 1) : 0; // il se ramasse juste avant de sauter
      for (const s2 of [-1, 1]) { // grosses pattes arrière
        ctx.fillStyle = shade(d.col, -.2); ctx.beginPath(); ctx.ellipse(-r * .55, s2 * r * (.75 - crouch * .1), r * .45, r * .25, s2 * .5, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .8; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-r * .15, s2 * r * 1.05, r * .22, r * .12, 0, 0, TAU); ctx.fill(); ctx.stroke();
      }
      ctx.save(); ctx.scale(1 - crouch * .15, 1 + crouch * .1);
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * .9, 0, 0, TAU); });
      ctx.restore();
      ctx.fillStyle = 'rgba(0,80,0,.25)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-r * .4 + (i % 2) * r * .3, (i < 2 ? -1 : 1) * r * .35, r * .1, 0, TAU); ctx.fill(); }
      shine(r, lx, ly);
      face(e, r, lw, { x: .4, sp: .4, er: .3, nice: true, mx: .9, mw: .4 });
      break;
    }
    default: glossBody(r, col, lx, ly, lw, circle(r)); face(e, r, lw);
  }
  ctx.restore(); ctx.globalAlpha = 1;

  // --- auras (sans rotation) ---
  if (e.type === 'regen' || e.slowT > 0 || e.frozen > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const c = e.frozen > 0 ? 'rgba(180,240,255,.75)' : e.slowT > 0 ? 'rgba(130,210,255,.5)' : 'rgba(120,255,140,.4)';
    glowDot(e.x, e.y, r * 1.8, c, 'rgba(255,255,255,.2)'); ctx.restore();
  }
  if (e.sh > 0) { // bulle d'énergie
    const k = e.sh / e.shMax;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(64,196,255,' + (.35 + .5 * k + (e.shHit > 0 ? .3 : 0)) + ')'; ctx.lineWidth = .05;
    ctx.beginPath(); ctx.arc(e.x, e.y, r * 1.55, 0, TAU); ctx.stroke();
    glowDot(e.x, e.y, r * 1.7, 'rgba(64,196,255,' + (.12 + .15 * k).toFixed(2) + ')', 'rgba(255,255,255,0)');
    ctx.restore();
  }
  if (e.type === 'healer') { ctx.strokeStyle = 'rgba(120,255,140,' + (.25 + .2 * Math.sin(e.anim * 5)) + ')'; ctx.lineWidth = .03; ctx.setLineDash([.1, .1]); ctx.beginPath(); ctx.arc(e.x, e.y, 1.6, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  if (e.frozen > 0) { // bloc de glace
    ctx.fillStyle = 'rgba(200,240,255,.45)'; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = .03;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i * TAU / 6 + .3; ctx.lineTo(e.x + Math.cos(q) * r * 1.35, e.y + Math.sin(q) * r * 1.35); } ctx.closePath(); ctx.fill(); ctx.stroke();
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
  (GD || ctx).drawImage(c, x - r, y - r, r * 2, r * 2);
}
let GD = null; // contexte cible des lueurs pendant le dessin d'une tourelle

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
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || '.SE'.includes(m.g[ty][tx])) continue;
    const dx = (b[0] - a[0]) / seg[i], dy = (b[1] - a[1]) / seg[i];
    glowDot(x - dx * .12, y - dy * .12, .12, p.col); glowDot(x, y, .16, p.col);
  }
  // reflet de lumière qui balaie le circuit (pas les couloirs)
  const sw = (t % 9) / 9 * (COLS + ROWS + 8) - 4;
  if (sw > -2 && sw < COLS + ROWS + 2) {
    ctx.save(); ctx.clip(G.boardPath);
    const g = ctx.createLinearGradient(sw - 2, 0, sw + 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([1, 0, -.6, 1, 0, 0])));
    ctx.fillStyle = g; ctx.fillRect(sw - 2, -2, 4, ROWS + 4);
    ctx.restore(); ctx.globalCompositeOperation = 'lighter';
  }
  // petits robots de maintenance qui se promènent sur le circuit
  ctx.globalCompositeOperation = 'source-over';
  for (const b of G.bots) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
    softShadow(ctx, .03, .04, .16, .13, .5);
    const st = b.wait > 0 ? 0 : Math.sin(t * 20 + b.ph) * .03;
    ctx.strokeStyle = OUT; ctx.lineWidth = .025;
    for (const s2 of [-1, 1]) for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * .05, s2 * .06); ctx.lineTo(k * .08 + (s2 * k > 0 ? st : -st), s2 * .13); ctx.stroke(); }
    const g = ctx.createRadialGradient(-.03, -.03, .01, 0, 0, .1); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, b.col); g.addColorStop(1, shade(b.col, -.5));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, .095, 0, TAU); ctx.fill(); ctx.lineWidth = .02; ctx.stroke();
    ctx.fillStyle = '#1b1230'; ctx.fillRect(.02, -.045, .05, .09);
    ctx.fillStyle = '#69f0ae'; ctx.fillRect(.035, -.03, .02, .02); ctx.fillRect(.035, .01, .02, .02);
    ctx.restore();
    if (b.wait > 0 && Math.sin(t * 30 + b.ph) > .7) { ctx.globalCompositeOperation = 'lighter'; glowDot(b.x + Math.cos(b.a) * .14, b.y + Math.sin(b.a) * .14, .1, 'rgba(255,230,120,.9)'); ctx.globalCompositeOperation = 'source-over'; }
    else { const on = Math.sin(t * 6 + b.ph) > 0; ctx.globalCompositeOperation = 'lighter'; glowDot(b.x, b.y, .07, on ? 'rgba(255,82,82,.8)' : 'rgba(255,82,82,.2)'); ctx.globalCompositeOperation = 'source-over'; }
  }
  ctx.globalCompositeOperation = 'lighter';
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
  // ventilateurs qui tournent
  ctx.globalCompositeOperation = 'source-over';
  for (const o of (m.obst || [])) if (o.kind === 'fan') {
    const cx = o.x + 1, cy = o.y + 1, a0 = t * 9 + o.x;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(70,80,90,.35)'; ctx.beginPath(); ctx.arc(0, 0, .78, 0, TAU); ctx.fill(); // flou de mouvement
    for (let k = 0; k < 7; k++) {
      ctx.save(); ctx.rotate(a0 + k * TAU / 7);
      const g = ctx.createLinearGradient(0, 0, .75, 0); g.addColorStop(0, '#5f6b76'); g.addColorStop(1, '#2a3036');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(.12, -.05); ctx.quadraticCurveTo(.5, -.32, .76, -.12); ctx.quadraticCurveTo(.5, .02, .12, .08); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ball(ctx, 0, 0, .2, '#90a4ae', -.7, -.7, '#ffffff');
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'lighter';
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
    const hurtK = clamp(1 - G.lives / (G.maxLives || G.d.lives), 0, 1), beat = .5 + .5 * Math.sin(t * (3 + hurtK * 6));
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
  const BM = G.bgM || 0; ctx.drawImage(G.bg, -BM, -BM, COLS + 2 * BM, ROWS + 2 * BM);
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
  // case visée (souris ou glisser-déposer)
  if (G.tool && G.hover) {
    const [hx, hy] = G.hover;
    if (hx >= 0 && hy >= 0 && hx < COLS && hy < ROWS) {
      const ok = canPlace(hx, hy) === null && G.cash >= tCost(G.tool);
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
    if (t.lvl >= TMAX) {
      ctx.globalCompositeOperation = 'lighter'; glowDot(0, 0, .75 + Math.sin(G.time * 4) * .05, 'rgba(255,215,64,.35)'); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255,215,64,.8)'; ctx.lineWidth = .035; ctx.setLineDash([.12, .09]); ctx.lineDashOffset = -G.time * .6;
      ctx.beginPath(); ctx.arc(0, 0, .58, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    drawTower(ctx, t.type, t.lvl, t.ang, G.time, t.flash || 0, true);
    if (age < 1.4) { ctx.globalAlpha = 1 - age / 1.4; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .04; ctx.setLineDash([.15, .1]); ctx.beginPath(); ctx.arc(0, 0, t.st.range * Math.min(1, age * 4), 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    ctx.globalAlpha = 1;
    const ua = G.time - t.upT;
    if (ua < .6) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - ua / .6; ctx.strokeStyle = '#fff59d'; ctx.lineWidth = .06; ctx.beginPath(); ctx.arc(0, 0, .3 + ua * 1.2, 0, TAU); ctx.stroke(); glowDot(0, 0, .6, 'rgba(255,240,150,.5)'); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  for (const f of G.fx) if (f.kind === 'sold') {
    const k = f.life / f.max; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate((1 - k) * 5); ctx.scale(k, k); ctx.globalAlpha = k;
    drawTower(ctx, f.type, f.lvl, f.ang, G.time, 0); ctx.restore(); ctx.globalAlpha = 1;
  }
  for (const t of G.towers) if (t.type === 'boost') { // faisceaux verts vers les tourelles boostées
    ctx.strokeStyle = 'rgba(0,230,118,' + (.3 + .2 * Math.sin(G.time * 5)) + ')'; ctx.lineWidth = .04; ctx.setLineDash([.08, .1]); ctx.lineDashOffset = -G.time;
    ctx.beginPath(); for (const o of G.towers) if (o !== t && o.type !== 'boost' && Math.hypot(o.x - t.x, o.y - t.y) <= t.st.range + .01) { ctx.moveTo(t.x + .5, t.y + .5); ctx.lineTo(o.x + .5, o.y + .5); } ctx.stroke(); ctx.setLineDash([]);
  }
  if (G.sel) {
    const t = G.sel;
    ctx.fillStyle = 'rgba(230,238,90,.08)'; ctx.beginPath(); ctx.arc(t.x + .5, t.y + .5, t.st.range, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,238,90,.75)'; ctx.lineWidth = .04; ctx.setLineDash([.15, .1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#e6ee5a'; ctx.lineWidth = .05; rr(ctx, t.x + .02, t.y + .02, .96, .96, .15); ctx.stroke();
  }
  // projectiles (ombre puis objet)
  for (const p of G.projs) if (p.kind === 'shell') softShadow(ctx, p.x + .06, p.y + .1, .1, .08, .5);
  const PST = curStyle();
  for (const p of G.projs) if (p.kind === 'shell') {
    const sc = 1 + (p.h || 0) * .9;
    if (PST === 'retro') rock(ctx, p.x, p.y, .1 * sc, -.7, -.7, 2);
    else if (PST === 'neo') { ctx.globalCompositeOperation = 'lighter'; glowDot(p.x, p.y, .22 * sc, 'rgba(200,120,255,.7)'); ctx.globalCompositeOperation = 'source-over'; ball(ctx, p.x, p.y, .07 * sc, '#2a0f4a', -.7, -.7, '#ea80fc'); }
    else { ball(ctx, p.x, p.y, .085 * sc, '#3a3f44', -.7, -.7, '#9aa4aa'); glowDot(p.x - .06, p.y - .06, .07, 'rgba(255,170,0,.8)'); }
  }
  if (PST === 'retro') for (const p of G.projs) if (p.kind === 'bullet') { // carreaux d'arbalète
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.ly - p.y, p.lx - p.x)); bolt(ctx, -.16, .08, 0); ctx.restore();
  }
  for (const p of G.projs) if (p.kind === 'missile' && PST === 'retro') { // boule de feu du trébuchet
    ctx.globalCompositeOperation = 'lighter'; glowDot(p.x, p.y, .22, 'rgba(255,110,0,.8)', 'rgba(255,235,160,.95)'); ctx.globalCompositeOperation = 'source-over';
    rock(ctx, p.x, p.y, .06, -.7, -.7, 4);
  } else if (p.kind === 'missile' && PST === 'neo') { // mini-drone
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a || 0);
    ctx.globalCompositeOperation = 'lighter'; glowDot(-.1, 0, .14, 'rgba(120,200,255,.8)'); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#141a2c'; ctx.beginPath(); ctx.moveTo(.13, 0); ctx.lineTo(-.08, -.09); ctx.lineTo(-.04, 0); ctx.lineTo(-.08, .09); ctx.closePath(); ctx.fill();
    ctx.lineWidth = .02; ctx.strokeStyle = p.col; ctx.stroke(); ctx.restore();
  } else if (p.kind === 'missile') { // petite fusée
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a || 0);
    ctx.globalCompositeOperation = 'lighter'; glowDot(-.16, 0, .16, 'rgba(255,145,0,.8)'); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#eceff1'; rr(ctx, -.12, -.035, .2, .07, .03); ctx.fill(); ctx.lineWidth = .02; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(.08, -.035); ctx.lineTo(.15, 0); ctx.lineTo(.08, .035); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(-.12, -.035); ctx.lineTo(-.16, -.07); ctx.lineTo(-.08, -.035); ctx.moveTo(-.12, .035); ctx.lineTo(-.16, .07); ctx.lineTo(-.08, .035); ctx.fill();
    ctx.restore();
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
  for (const q of G.parts) if (q.fire) { // flammes
    const k = q.life / q.max, col = k > .66 ? 'rgba(255,240,160,.9)' : k > .33 ? 'rgba(255,145,0,.8)' : 'rgba(220,40,0,.6)';
    glowDot(q.x, q.y, q.size * (1.6 - k * .6), col);
  }
  for (const p of G.projs) {
    if (p.kind === 'shell' || p.kind === 'missile' || (PST === 'retro' && p.kind === 'bullet')) continue;
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
    } else if (f.kind === 'pop') { // le virus gonfle et éclate
      const u = 1 - k;
      ctx.globalAlpha = k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .06 * k + .01;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + u * 2.2), 0, TAU); ctx.stroke();
      glowDot(f.x, f.y, f.r * (1.2 + u * 1.5), f.col);
      ctx.globalAlpha = 1;
    } else if (f.kind === 'cpuhit') {
      glowDot(f.x, f.y, 1.6 * (1.2 - k * .2), 'rgba(255,40,40,' + (.7 * k).toFixed(2) + ')', 'rgba(255,255,255,' + (.6 * k).toFixed(2) + ')');
    } else if (f.kind === 'ring') {
      if (f.delay && f.max - f.life < f.delay) continue;
      const R = f.r * (1.15 - k * .65);
      const g = ctx.createRadialGradient(f.x, f.y, R * .2, f.x, f.y, R);
      g.addColorStop(0, 'rgba(255,255,220,' + .55 * k + ')'); g.addColorStop(.6, f.col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = k; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  for (const q of G.parts) if (!q.smoke && !q.goo && !q.fire) {
    const k = q.life / q.max; ctx.globalAlpha = k; ctx.strokeStyle = q.col; ctx.lineWidth = q.size;
    ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * .035, q.y - q.vy * .035); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const q of G.parts) if (q.goo) { // gouttes de virus
    const k = q.life / q.max; ctx.globalAlpha = Math.min(1, k * 2);
    ctx.fillStyle = q.col; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * (1 + (1 - k) * .4), q.size * .8, Math.atan2(q.vy, q.vx), 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(q.x - q.size * .3, q.y - q.size * .3, q.size * .3, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // vignettage
  const vg = ctx.createRadialGradient(COLS / 2, ROWS / 2, ROWS * .35, COLS / 2, ROWS / 2, COLS * .62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = vg; ctx.fillRect(-BM, -BM, COLS + 2 * BM, ROWS + 2 * BM);
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
  const baseFont = ctx.font;
  for (const t of G.texts) {
    const [sx, sy] = toScreen(t.x, t.y); ctx.globalAlpha = Math.min(1, t.life * 2);
    if (t.big) { const age = 1.2 - t.life, sc = age < .2 ? .5 + age / .2 * .8 : 1.3 - Math.min(.3, (age - .2) * 1.5); ctx.save(); ctx.translate(sx, sy); ctx.scale(sc, sc); ctx.font = '900 ' + Math.max(13, T * .42) + 'px system-ui'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(t.t, 0, 0); ctx.fillStyle = t.col; ctx.fillText(t.t, 0, 0); ctx.restore(); continue; }
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(t.t, sx, sy); ctx.fillStyle = t.col; ctx.fillText(t.t, sx, sy);
  }
  ctx.font = baseFont;
  // pièces qui volent vers le compteur de crédits
  if (G.coins && G.coins.length) {
    const tg = $('#sCash').getBoundingClientRect(), tx = tg.left + tg.width / 2, ty = tg.top + tg.height / 2;
    for (const c of G.coins) {
      if (c.t < 0) continue;
      const u = c.t * c.t * (3 - 2 * c.t), mx = (c.sx + tx) / 2 + c.bend, my = Math.min(c.sy, ty) - 80;
      const x = (1 - u) * (1 - u) * c.sx + 2 * (1 - u) * u * mx + u * u * tx, y = (1 - u) * (1 - u) * c.sy + 2 * (1 - u) * u * my + u * u * ty;
      const r = 6 * (1 - u * .4), sq = Math.abs(Math.cos(c.t * 14));
      ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.ellipse(x, y + 1, r * sq + 1, r, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd740'; ctx.beginPath(); ctx.ellipse(x, y, r * sq, r, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - r * .3 * sq, y - r * .3, r * .28, 0, TAU); ctx.fill();
    }
  }
  // alerte méga-virus : bandes jaunes et noires qui clignotent
  if (G.alarm > 0 && !G.demo) {
    const a = Math.min(1, G.alarm) * (.55 + .45 * Math.sin(G.time * 18));
    ctx.save(); ctx.globalAlpha = a * .85;
    for (const yy of [L.ay, L.ay + L.ah - 14]) {
      ctx.save(); ctx.beginPath(); ctx.rect(L.ax, yy, L.aw, 14); ctx.clip();
      ctx.fillStyle = '#ffd600'; ctx.fillRect(L.ax, yy, L.aw, 14); ctx.fillStyle = '#111';
      for (let x = L.ax - 40 + (G.time * 60) % 28; x < L.ax + L.aw + 20; x += 28) { ctx.beginPath(); ctx.moveTo(x, yy + 14); ctx.lineTo(x + 14, yy); ctx.lineTo(x + 24, yy); ctx.lineTo(x + 10, yy + 14); ctx.fill(); }
      ctx.restore();
    }
    const g2 = ctx.createRadialGradient(L.ax + L.aw / 2, L.ay + L.ah / 2, Math.min(L.aw, L.ah) * .35, L.ax + L.aw / 2, L.ay + L.ah / 2, Math.max(L.aw, L.ah) * .7);
    g2.addColorStop(0, 'rgba(255,0,0,0)'); g2.addColorStop(1, 'rgba(255,0,0,' + (.25 * a).toFixed(2) + ')'); ctx.fillStyle = g2; ctx.fillRect(L.ax, L.ay, L.aw, L.ah);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const f of G.fx) if (f.kind === 'leak') {
    const g = ctx.createRadialGradient(SW / 2, SH / 2, Math.min(SW, SH) * .3, SW / 2, SH / 2, Math.max(SW, SH) * .7);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,0,0,' + (f.life / f.max * .5) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  }
  if (G.banner && !G.demo) {
    const b = G.banner, age = (b.max || 2.2) - b.life, k = Math.min(1, age / .25), out = Math.min(1, b.life / .4);
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
  el.innerHTML = '<b style="color:' + d.col + '">' + tName(k) + '</b><span class="tdesc">' + tDesc(k) + '</span>' +
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
  if (G.wave < G.total) { const w = waveDef(G.wave + 1); setTxt('#nextInfo', 'Suivante : ' + w.n + ' × ' + ETYPES[w.type].name + (w.type2 ? ' + ' + w.n2 + ' × ' + ETYPES[w.type2].name : '')); }
  else setTxt('#nextInfo', 'Élimine les derniers virus !');
  const key = TORDER.map(k => G.cash >= tCost(k) ? 1 : 0).join('');
  if (lastP.poor !== key) { lastP.poor = key; document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('poor', G.cash < tCost(b.dataset.t))); }
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
  if (t.lvl < TMAX && t.type !== 'boost' && t.type !== 'miner') { const n = tStats(t.type, t.lvl + 1); html += '<br><small style="color:#a5d6a7">Niv. suivant : dégâts ' + n.dmg.toFixed(1) + ', portée ' + n.range.toFixed(1) + '</small>'; }
  if (t.lvl === TMAX - 1) html += '<br><small style="color:#ffd740">Niv. 5 : ' + SPECIAL[t.type] + (maxLvl(t.type) < TMAX ? ' (🔒 recherche 2 en Boutique)' : '') + '</small>';
  html += '<br><small>Virus éliminés : ' + (t.kills || 0) + '</small>';
  $('#tpMode').textContent = '🎯 Cible : ' + MODE_NAMES[t.mode || 'first'];
  $('#tpMode').classList.toggle('hidden', t.type === 'boost' || t.type === 'miner');
  $('#tpStats').innerHTML = html;
  const up = $('#tpUp');
  if (t.lvl < maxLvl(t.type)) { const c = upCost(t); up.textContent = '⬆ ' + c + ' cr'; up.className = 'buy' + (G.cash >= c ? '' : ' off'); }
  else if (t.lvl < TMAX) { up.textContent = '🔒 Niv. 5'; up.className = 'buy off'; }
  else { up.textContent = 'MAX'; up.className = 'buy off'; }
  $('#tpSell').textContent = 'Vendre +' + Math.floor(t.invested * sellRate());
}
function placePopup() {
  const t = G.sel; if (!t) return;
  const p = $('#tpop'), [sx, sy] = toScreen(t.x + .5, t.y + .5), w = 190, h = p.offsetHeight || 150;
  let x = sx + L.s * .7, y = sy - h / 2;
  if (x + w > L.ax + L.aw - 6) x = sx - L.s * .7 - w;
  x = clamp(x, L.ax + 6, L.ax + L.aw - w - 6); y = clamp(y, 6, SH - h - (L.port ? 235 : 6));
  p.style.left = x + 'px'; p.style.top = y + 'px';
}
$('#tpClose').onclick = closePopup;
$('#tpUp').onclick = () => G.sel && upgradeTower(G.sel);
$('#tpSell').onclick = () => G.sel && sellTower(G.sel);
$('#tpMode').onclick = () => { const t = G.sel; if (!t) return; t.mode = MODES[(MODES.indexOf(t.mode || 'first') + 1) % MODES.length]; fillPopup(); sfx('build'); };

/* ---------------- fin de partie ---------------- */
function endGame(win) {
  G.over = true; G.win = win; G.endT = 0; G.fwT = 0;
  closePopup();
  // on arrête net les tirs : pas de rayon figé à l'écran
  G.projs.length = 0; G.fx = G.fx.filter(f => f.kind === 'splat');
  G.banner = { t: win ? 'ZONE NETTOYÉE !' : 'SYSTÈME INFECTÉ !', sub: win ? G.m.name + ' sauvée' : 'Les virus ont atteint le processeur', life: 3.2, max: 3.2, boss: !win, big: true };
  if (!win) { for (const [x, y] of G.exits) { for (let i = 0; i < 30; i++) G.parts.push(part(x + .5, y + .5, i % 2 ? '#ff5252' : '#ffd740', 5)); smoke(x + .5, y + .5, 12, .5); } G.shake = 16; }
  if (win) {
    const k = G.lives / (G.maxLives || G.d.lives), st = k >= 1 ? 3 : k >= .5 ? 2 : 1, key = curDiff + G.mi;
    G.score += G.lives * 100;
    save.stars[key] = Math.max(save.stars[key] || 0, st);
    save.best[key] = Math.max(save.best[key] || 0, G.score);
    const first = !(save.stars[key + 'won']); save.stars[key + 'won'] = 1;
    if (G.mi + 2 > save.unlocked[curDiff]) save.unlocked[curDiff] = Math.min(MAPS.length, G.mi + 2);
    G.chipsWon = Math.round((20 + 8 * st + 3 * G.mi) * CHIP_MULT[curDiff]) + (first ? 15 : 0);
    save.chips = (save.chips || 0) + G.chipsWon;
    persist(); sfx('win'); G.stars = st;
  } else {
    const key = curDiff + G.mi; save.best[key] = Math.max(save.best[key] || 0, G.score);
    G.chipsWon = Math.floor(Math.max(0, G.wave - 1) * .8 * CHIP_MULT[curDiff]); save.chips = (save.chips || 0) + G.chipsWon; persist();
    sfx('lose'); vibe(300);
  }
}
function showResult(win) {
  setState('result');
  const last = G.mi === MAPS.length - 1;
  $('#resTitle').textContent = win ? (last ? '🏆 Ordinateur sauvé !' : 'Zone nettoyée !') : 'L\'ordinateur est infecté…';
  $('#resTitle').style.color = win ? '#a5d6a7' : '#ff8a80';
  $('#resStars').innerHTML = win ? [0, 1, 2].map(i => '<span class="st' + (i < G.stars ? ' on' : '') + '" style="animation-delay:' + (.25 + i * .25) + 's">★</span>').join('') : '<span class="skull">☠</span>';
  $('#resChips').innerHTML = '+' + (G.chipsWon || 0) + ' ⬢ <small>puces</small>';
  $('#resBody').innerHTML = '<div><small>Zone</small><b>' + G.m.name + '</b></div><div><small>Difficulté</small><b>' + G.d.name + '</b></div><div><small>Vagues</small><b>' + (win ? G.total : Math.max(0, G.wave - 1)) + ' / ' + G.total + '</b></div><div><small>Virus détruits</small><b>' + G.kills + '</b></div><div><small>Score</small><b style="color:#e6ee5a">' + G.score + '</b></div><div><small>Record</small><b>' + (save.best[curDiff + G.mi] || 0) + '</b></div>';
  const nb = $('#resNext');
  if (win && !last) { nb.classList.remove('hidden'); nb.textContent = '▶ Zone suivante'; nb.onclick = () => startMap(G.mi + 1); }
  else nb.classList.add('hidden');
}

/* ---------------- écran Boutique ---------------- */
let shopTab = 'towers', shopFrom = 'menu', shopSel = null;
function buyChips(cost, fn) {
  if ((save.chips || 0) < cost) { toast('Pas assez de puces ⬢ : termine des zones pour en gagner !'); sfx('err'); return; }
  save.chips -= cost; fn(); persist(); sfx('up'); vibe(20); buildShop();
}
function buildShop() {
  $('#chips').textContent = save.chips || 0;
  document.querySelectorAll('#shop .tab[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === shopTab));
  buildShopWorlds();
  const list = $('#shopList'); list.innerHTML = ''; list.className = shopTab;
  const pips = (l, m) => '<div class="pips">' + Array.from({ length: m }, (_, i) => '<i class="' + (i < l ? 'on' : '') + '"></i>').join('') + '</div>';
  if (shopTab === 'towers') {
    for (const k of TORDER) {
      const d = TOWERS[k], un = unlockedT(k), r = resLvl(k), c = document.createElement('div');
      c.className = 'scard' + (un ? '' : ' locked') + (shopSel === k ? ' sel' : '');
      const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 72; const g = cv2.getContext('2d'); g.setTransform(72, 0, 0, 72, 36, 36); drawTower(g, k, un ? Math.min(TMAX, 1 + r) : 1, -Math.PI / 4, 0, 0);
      c.appendChild(cv2);
      const info = document.createElement('div'); info.className = 'sinfo';
      info.innerHTML = '<b style="color:' + d.col + '">' + tName(k, true) + '</b>' + (un ? pips(r, 5) : '<small>🔒 verrouillée</small>');
      c.appendChild(info);
      const bt = document.createElement('button'); bt.className = 'sbuy';
      if (!un) { bt.textContent = UNLOCK[k] + ' ⬢'; bt.classList.toggle('off', save.chips < UNLOCK[k]); bt.onclick = ev => { ev.stopPropagation(); buyChips(UNLOCK[k], () => { save.unlockT = save.unlockT || {}; save.unlockT[k] = 1; shopSel = k; toast('🔓 ' + tName(k) + ' débloquée !'); }); }; }
      else if (r < 5) { bt.textContent = '⬆ ' + RES_COST[r] + ' ⬢'; bt.classList.toggle('off', save.chips < RES_COST[r]); bt.onclick = ev => { ev.stopPropagation(); buyChips(RES_COST[r], () => { save.research = save.research || {}; save.research[k] = r + 1; shopSel = k; }); }; }
      else { bt.textContent = 'MAX'; bt.className = 'sbuy off'; }
      c.appendChild(bt);
      c.onclick = () => { shopSel = k; buildShop(); };
      list.appendChild(c);
    }
    const k = shopSel || 'pulse', d = TOWERS[k], r = resLvl(k);
    $('#shopInfo').innerHTML = '<b style="color:' + d.col + '">' + tName(k) + '</b> — ' + tDesc(k) + '<br><small>Recherche ' + r + '/5 : +' + (8 * r) + ' % dégâts, +' + (3 * r) + ' % portée' + (r >= 2 ? ' · niveau 5 débloqué (' + SPECIAL[k] + ')' : ' · le niveau 5 (' + SPECIAL[k] + ') se débloque à la recherche 2') + (r >= 5 ? ' · −10 % sur le prix' : ' · recherche 5 : −10 % sur le prix') + '</small>';
  } else {
    for (const k in GUP) {
      const u = GUP[k], l = (save.gup || {})[k] || 0, c = document.createElement('div'); c.className = 'scard';
      c.innerHTML = '<div class="sic">' + u.ic + '</div><div class="sinfo"><b>' + u.name + '</b>' + pips(l, 5) + '<small>' + u.desc + '</small></div>';
      const bt = document.createElement('button'); bt.className = 'sbuy';
      if (l < 5) { const cost = u.cost[l]; bt.textContent = '⬆ ' + cost + ' ⬢'; bt.classList.toggle('off', save.chips < cost); bt.onclick = () => buyChips(cost, () => { save.gup = save.gup || {}; save.gup[k] = l + 1; }); }
      else { bt.textContent = 'MAX'; bt.className = 'sbuy off'; }
      c.appendChild(bt); list.appendChild(c);
    }
    $('#shopInfo').innerHTML = '<small>Les améliorations sont permanentes et s\'appliquent à toutes les zones et toutes les difficultés.</small>';
  }
}
function openShop(from) { const w = worldOf(G ? G.mi : (mapPage || 0) * 6).style; shopFrom = from; setState('shop'); shopStyle = w; buildShop(); }
function buildShopWorlds() {
  const box = $('#shopWorlds'); if (!box) return; box.innerHTML = '';
  box.classList.toggle('hidden', shopTab !== 'towers');
  for (const w of WORLDS) {
    const b = document.createElement('button'); b.className = 'tab' + (shopStyle === w.style ? ' on' : ''); b.textContent = w.ic + ' ' + w.name.replace('Futur quantique', 'Futur');
    b.onclick = () => { shopStyle = w.style; buildShop(); }; box.appendChild(b);
  }
}
document.querySelectorAll('#shop .tab').forEach(b => b.addEventListener('click', () => { shopTab = b.dataset.tab; buildShop(); }));
$('#shopBack').onclick = () => setState(shopFrom === 'result' ? 'maps' : shopFrom);

/* ---------------- écrans ---------------- */
const screens = ['menu', 'diff', 'maps', 'help', 'options', 'pause', 'result', 'shop'];
function show(id) {
  for (const s of screens) $('#' + s).classList.toggle('hidden', s !== id);
  if (id === 'diff') buildDiff();
  if (id === 'maps') buildMaps();
  if (id === 'options') buildOptions();
  if (id === 'shop') buildShop();
  if (id === 'menu') $('#menuChips').textContent = save.chips || 0;
}
function setState(s) {
  state = s;
  if (s !== 'shop') shopStyle = null;
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
    b.onclick = () => { curDiff = k; mapPage = null; setState('maps'); };
    box.appendChild(b);
  }
}
const thumbs = {}; let mapPage = null;
$('#mapPrev').onclick = () => { if (mapPage > 0) { mapPage--; buildMaps(); } };
$('#mapNext').onclick = () => { if (mapPage < Math.ceil(MAPS.length / 6) - 1) { mapPage++; buildMaps(); } };
function buildMaps() {
  const d = DIFFS[curDiff];
  $('#mapsTitle').innerHTML = 'Zones de combat · <span style="color:' + d.col + '">' + d.name + '</span>';
  const g = $('#mapGrid'); g.innerHTML = '';
  const pages = Math.ceil(MAPS.length / 6);
  if (mapPage === null) mapPage = Math.min(pages - 1, Math.floor((save.unlocked[curDiff] - 1) / 6));
  $('#mapPage').innerHTML = WORLDS[mapPage].ic + ' Monde ' + (mapPage + 1) + ' · <span style="color:' + WORLDS[mapPage].col + '">' + WORLDS[mapPage].name + '</span> · <span style="color:' + d.col + '">' + d.name + '</span>';
  $('#mapPrev').classList.toggle('off', mapPage === 0); $('#mapNext').classList.toggle('off', mapPage === pages - 1);
  MAPS.forEach((m, i) => {
    if (Math.floor(i / 6) !== mapPage) return;
    const locked = i >= save.unlocked[curDiff], st = save.stars[curDiff + i] || 0, best = save.best[curDiff + i] || 0;
    const b = document.createElement('button'); b.className = 'mapcard' + (locked ? ' locked' : ''); b.style.setProperty('--c', m.acc);
    if (!thumbs[i]) thumbs[i] = buildBG(i, 16);
    const c = document.createElement('canvas'); c.width = COLS * 16; c.height = ROWS * 16; c.style.aspectRatio = COLS + '/' + ROWS; c.getContext('2d').drawImage(thumbs[i], 0, 0);
    b.appendChild(c);
    const info = document.createElement('div');
    const ent = m.routes.length, ex = new Set(m.routes.map(r => r[r.length - 1].join(','))).size;
    info.innerHTML = '<b>' + (locked ? '🔒 ' : '') + (i + 1) + '. ' + m.name + '</b><small>' + m.waves + ' vagues · ' + ent + ' entrée' + (ent > 1 ? 's' : '') + ' · ' + ex + ' sortie' + (ex > 1 ? 's' : '') + '</small><span class="st">' + '★'.repeat(st) + '☆'.repeat(3 - st) + (best ? ' <i>' + best + '</i>' : '') + '</span>';
    b.appendChild(info);
    b.onclick = () => { if (locked) { toast('Termine la zone précédente pour débloquer celle-ci'); return; } initAudio(); startMap(i); };
    g.appendChild(b);
  });
}
function buildOptions() {
  $('#optAuto').textContent = 'Vague suivante automatique : ' + (save.autoWave ? 'OUI' : 'NON');
  $('#optSound').textContent = 'Bruitages : ' + (save.sound ? 'OUI' : 'NON');
  $('#optMusic').textContent = 'Musique : ' + (save.music ? 'OUI' : 'NON');
  $('#optVibe').textContent = 'Vibrations : ' + (save.vibe ? 'OUI' : 'NON');
  $('#optSide').textContent = 'Panneau des armes : ' + (save.side === 'left' ? 'À GAUCHE' : 'À DROITE');
}
$('#optAuto').onclick = () => { save.autoWave = !save.autoWave; persist(); buildOptions(); };
$('#optSound').onclick = () => { save.sound = !save.sound; persist(); buildOptions(); };
$('#optMusic').onclick = () => { initAudio(); save.music = !save.music; persist(); buildOptions(); };
$('#optSide').onclick = () => { save.side = save.side === 'left' ? 'right' : 'left'; persist(); buildOptions(); };
$('#optVibe').onclick = () => { save.vibe = !save.vibe; persist(); buildOptions(); };
$('#optReset').onclick = () => { if (confirm('Effacer toute la progression ?')) { const keep = { side: save.side, music: save.music, sound: save.sound, vibe: save.vibe, autoWave: save.autoWave }; save = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SAVE)), keep); persist(); buildOptions(); } };

function pauseGame() { if (state === 'play' && G && !G.over) setState('pause'); }
function resumeGame() { if (state === 'pause') setState('play'); }
$('#btnResume').onclick = resumeGame;
$('#btnRestart').onclick = () => startMap(G.mi);
$('#btnQuit').onclick = () => setState('maps');
$('#resRetry').onclick = () => startMap(G.mi);
$('#resMaps').onclick = () => setState('maps');
$('#resShop').onclick = () => openShop('result');
$('#mapsShop').onclick = () => openShop('maps');
$('#menuShop').onclick = () => { initAudio(); openShop('menu'); };
// bouton retour d'Android (appli) : pause, reprise, retour au menu ; sinon l'appli se ferme
window.onAndroidBack = () => {
  if (state === 'play') { if (G && G.sel) { closePopup(); return true; } pauseGame(); return true; }
  if (state === 'pause') { resumeGame(); return true; }
  if (state === 'menu') return false;
  setState(state === 'maps' ? 'diff' : 'menu'); return true;
};
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

/* ---------------- boucle ---------------- */
let last = performance.now(), panelT = 0;
// animation de fin : feu d'artifice (victoire) ou processeur qui explose (défaite)
function updateEnd(dt) {
  G.time += dt; G.endT += dt; moveBots(dt);
  G.shake = Math.max(0, G.shake - dt * 25);
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
  for (const p of G.pulses) { p.d += p.spd * dt * (G.win ? 2 : .4); const tr = G.m.traces[p.tr]; if (p.d > tr.len) { p.tr = Math.floor(Math.random() * G.m.traces.length); p.d = 0; } }
  for (const e of G.enemies) { e.anim += dt; }
  G.fwT -= dt;
  if (G.fwT <= 0) {
    G.fwT = G.win ? rand(.12, .3) : rand(.35, .6);
    if (G.win) {
      const x = rand(1, COLS - 1), y = rand(1, ROWS - 1), cols = ['#ffd740', '#69f0ae', '#40c4ff', '#ff4081', '#e040fb', '#ffffff'], c = cols[Math.floor(Math.random() * cols.length)];
      for (let i = 0; i < 26; i++) { const q = part(x, y, i % 4 ? c : '#ffffff', rand(3, 6)); q.life = q.max = rand(.6, 1.1); G.parts.push(q); }
      G.fx.push({ kind: 'ring', x, y, r: 1.4, col: c, life: .45, max: .45 });
      if (Math.random() < .5) sfx('pop');
    } else {
      const [x, y] = G.exits[Math.floor(Math.random() * G.exits.length)];
      G.fx.push({ kind: 'ring', x: x + .5 + rand(-.5, .5), y: y + .5 + rand(-.5, .5), r: 1.2, col: '#ff5252', life: .4, max: .4 });
      smoke(x + .5, y + .5, 3, .4); G.shake = Math.max(G.shake, 4);
    }
  }
  if (G.win) for (const t of G.towers) t.ang += dt * 5; // les tourelles font la fête
  for (let i = G.fx.length - 1; i >= 0; i--) { G.fx[i].life -= dt; if (G.fx[i].life <= 0) G.fx.splice(i, 1); }
  for (let i = G.parts.length - 1; i >= 0; i--) { const q = G.parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .93; q.vy *= .93; if (!q.smoke) q.vy += 1.5 * dt; if (q.life <= 0) G.parts.splice(i, 1); }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y -= .6 * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  if (G.endT > 2.8 && state === 'play') showResult(G.win);
}
function frame(now) {
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state === 'play' && G && !G.over) {
    for (let i = 0; i < G.speed; i++) update(dt);
    panelT -= dt; if (panelT <= 0) { panelT = .1; updatePanel(); }
  } else if (G && G.over && (state === 'play' || state === 'result')) updateEnd(dt);
  musicTick();
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
