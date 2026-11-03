'use strict';
/* ===================== VIRUS DÉFENSE — tower defense pour mobile ===================== */

const cv = document.getElementById('c');
let ctx = cv.getContext('2d'); // « let » : on le remplace le temps de dessiner une vignette (encyclopédie)
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
// 6 mondes de 3 zones, chacun avec son propre décor, ses obstacles et son ambiance
const WORLDS = [
  { name: 'Circuit imprimé', style: 'pcb', desc: 'Là où tout commence : pistes de cuivre, puces et robots de maintenance.', panel: ['#c62828', '#9a1313', '#6d0a0a'], obst: ['fan', 'sink', 'fan'], leds: ['#76ff03', '#ff1744', '#ffab00', '#00e5ff'] },
  { name: 'La Fournaise', style: 'forge', desc: 'Alimentation en surchauffe : le métal rougeoie et les braises volent.', panel: ['#ef6c00', '#a63f00', '#4e1a00'], obst: ['coil', 'sink', 'coil'], leds: ['#ff3d00', '#ffab00', '#ff6d00', '#ffd740'] },
  { name: 'Flux de données', style: 'data', desc: 'Fibres optiques et disques : les paquets filent à la vitesse de la lumière.', panel: ['#1976d2', '#0d47a1', '#051e44'], obst: ['disk', 'disk', 'disk'], leds: ['#40c4ff', '#64ffda', '#18ffff', '#b388ff'] },
  { name: 'Salle des serveurs', style: 'rack', desc: 'Baies métalliques, câbles et ventilation : le réseau est attaqué.', panel: ['#7b8a95', '#4e5b64', '#262d33'], obst: ['fan', 'fan', 'fan'], leds: ['#76ff03', '#76ff03', '#00e5ff', '#ffab00'] },
  { name: 'Zone cryogénique', style: 'ice', desc: 'Refroidissement extrême : le circuit est couvert de givre.', panel: ['#4fb3e8', '#1f78b4', '#0b3a63'], obst: ['tank', 'fan', 'tank'], leds: ['#b3e5fc', '#80deea', '#ffffff', '#40c4ff'] },
  { name: 'Cyberespace', style: 'neon', desc: 'Au cœur du code : néons, hologrammes et IA corrompue.', panel: ['#9c27b0', '#5e1272', '#23062e'], obst: ['holo', 'holo', 'holo'], leds: ['#ff2bd6', '#00e5ff', '#ffea00', '#ff1744'] }
];
const worldOf = mi => WORLDS[Math.min(WORLDS.length - 1, Math.floor(mi / 3))];
const MAPS = [
  { name: 'Carte mère', base: '#1f7a32', acc: '#e6ee5a', waves: 20,
    paths: [[[0, 2], [22, 2], [22, 6], [3, 6], [3, 10], [22, 10], [22, 13], [25, 13]]] },
  { name: 'Bus d\'adresse', base: '#b3621a', acc: '#ffd166', waves: 25,
    paths: [[[3, 0], [3, 4], [10, 4], [10, 1], [17, 1], [17, 7], [6, 7], [6, 12], [14, 12], [14, 9], [22, 9], [22, 13], [25, 13]]] },
  { name: 'Mémoire vive', base: '#13807c', acc: '#7df9ff', waves: 30,
    paths: [[[0, 1], [24, 1], [24, 13], [2, 13], [2, 4], [21, 4], [21, 10], [6, 10], [6, 7], [16, 7]]] },
  { name: 'Alimentation', base: '#4a2a1c', acc: '#ff6d00', waves: 30,
    paths: [[[0, 2], [17, 2], [17, 6], [6, 6], [6, 10], [25, 10]], [[0, 13], [3, 13], [3, 8], [13, 8], [13, 6]]] },
  { name: 'Carte graphique', base: '#3a2b2a', acc: '#ffab40', waves: 35,
    paths: [[[2, 0], [2, 12], [6, 12], [6, 2], [10, 2], [10, 12], [14, 12], [14, 2], [25, 2]], [[18, 14], [18, 4], [23, 4], [23, 8], [20, 8], [20, 12], [25, 12]]] },
  { name: 'Processeur central', base: '#4d1f14', acc: '#ff3d00', waves: 40,
    paths: [[[4, 0], [4, 3], [22, 3], [22, 7], [13, 7]], [[21, 14], [21, 11], [3, 11], [3, 7], [13, 7]]] },
  { name: 'Disque dur', base: '#0d1d3a', acc: '#40c4ff', waves: 35,
    paths: [[[0, 7], [5, 7], [5, 2], [20, 2], [20, 12], [9, 12], [9, 5], [16, 5], [16, 9], [12, 9]], [[25, 13], [23, 13], [23, 7], [14, 7], [14, 9]]] },
  { name: 'Carte réseau', base: '#08283a', acc: '#64ffda', waves: 35,
    paths: [[[0, 1], [12, 1], [12, 5], [4, 5], [4, 9], [16, 9], [16, 13], [25, 13]], [[25, 7], [23, 7], [23, 1], [15, 1], [15, 7], [18, 7], [18, 9], [16, 9]]] },
  { name: 'Carte son', base: '#1a1640', acc: '#b388ff', waves: 40,
    paths: [[[0, 13], [4, 13], [4, 10], [8, 10], [8, 7], [12, 7], [12, 4], [16, 4], [16, 1], [22, 1], [22, 13], [25, 13]], [[0, 1], [10, 1], [10, 10], [19, 10], [19, 4], [25, 4]]] },
  { name: 'Serveur', base: '#6a747c', acc: '#69f0ae', waves: 40,
    paths: [[[0, 1], [10, 1], [10, 5], [3, 5], [3, 9], [12, 9], [12, 14]], [[25, 1], [15, 1], [15, 5], [22, 5], [22, 9], [12, 9]], [[13, 0], [13, 7], [19, 7], [19, 11], [16, 11], [16, 13], [25, 13]]] },
  { name: 'Pare-feu', base: '#5b5f66', acc: '#ff5252', waves: 45,
    paths: [[[12, 0], [12, 3], [2, 3], [2, 12], [23, 12], [23, 3], [16, 3], [16, 9], [7, 9], [7, 6], [12, 6]], [[20, 0], [20, 14]], [[5, 14], [5, 0]]] },
  { name: 'Noyau quantique', base: '#4a4f5c', acc: '#ea80fc', waves: 50,
    paths: [[[0, 1], [10, 1], [10, 3], [2, 3], [2, 5], [11, 5], [11, 7], [13, 7]], [[25, 1], [15, 1], [15, 3], [23, 3], [23, 5], [15, 5], [15, 7], [13, 7]], [[6, 14], [6, 12], [22, 12], [22, 9], [13, 9], [13, 7]]] },
  { name: 'Clé USB', base: '#3c7fae', acc: '#e1f5fe', waves: 45,
    paths: [[[0, 4], [8, 4], [8, 1], [17, 1], [17, 8], [3, 8], [3, 12], [25, 12]], [[25, 3], [21, 3], [21, 10], [12, 10], [12, 5]]] },
  { name: 'Ventirad', base: '#2f6a8c', acc: '#84ffff', waves: 45,
    paths: [[[0, 2], [23, 2], [23, 6], [2, 6], [2, 10], [25, 10]], [[9, 0], [9, 13], [16, 13], [16, 0]]] },
  { name: 'Satellite', base: '#1f3f66', acc: '#ffd740', waves: 45,
    paths: [[[0, 3], [6, 3], [6, 11], [12, 11], [12, 3], [18, 3], [18, 11], [25, 11]], [[3, 14], [3, 7], [22, 7], [22, 0]], [[15, 0], [15, 13], [25, 13]]] },
  { name: 'Robot', base: '#12061f', acc: '#ff2bd6', waves: 50,
    paths: [[[0, 1], [10, 1], [10, 4], [3, 4], [3, 7], [12, 7]], [[25, 1], [15, 1], [15, 4], [22, 4], [22, 7], [12, 7]], [[0, 9], [2, 9], [2, 13], [11, 13], [11, 9], [12, 9], [12, 7]], [[25, 9], [23, 9], [23, 13], [14, 13], [14, 9], [12, 9]]] },
  { name: 'Data center', base: '#03121a', acc: '#00e5ff', waves: 50,
    paths: [[[0, 2], [24, 2], [24, 12], [1, 12], [1, 5], [21, 5], [21, 9], [4, 9]], [[12, 0], [12, 14]]] },
  { name: 'Cœur de l\'IA', base: '#1a0308', acc: '#ff1744', waves: 60,
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
    m.obst.push({ kind: worldOf(MAPS.indexOf(m)).obst[k], x, y }); k++;
  }
  m.g = g.map(r => r.join(''));
}

const DIFFS = {
  easy: { name: 'Facile', hp: .75, lives: 30, cash: 35, col: '#4ade80', desc: 'Virus fragiles · 30 vies' },
  normal: { name: 'Normal', hp: 1.15, lives: 20, cash: 25, col: '#60a5fa', desc: 'L\'expérience équilibrée · 20 vies' },
  hard: { name: 'Difficile', hp: 1.65, lives: 15, cash: 22, col: '#f97316', desc: 'Virus coriaces · 15 vies' },
  nightmare: { name: 'Cauchemar', hp: 2.3, lives: 10, cash: 20, col: '#ef4444', desc: 'Pour les experts · 10 vies' },
  legend: { name: 'Légende', hp: 3, lives: 5, cash: 22, col: '#e040fb', desc: 'Impossible ? · 5 vies', spd: 1.05 },
  apocalypse: { name: 'Apocalypse', hp: 4.2, lives: 3, cash: 20, col: '#ff1744', desc: 'Virus 15 % plus rapides · 3 vies', spd: 1.15 }
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
const TORDER = ['pulse', 'gatling', 'cannon', 'frost', 'flame', 'missile', 'laser', 'tesla', 'boost', 'miner'];
const TMAX = 5, UPMULT = [.8, 1.4, 2.4, 4];
// au niveau 5, chaque tourelle choisit une voie : A (pouvoir historique) ou B
const PATHS = {
  pulse: [['Double tir', 'vise 2 virus à la fois'], ['Pulseur lourd', 'dégâts ×2,2 et portée +0,5']],
  gatling: [['Balles perforantes', 'ignorent le blindage'], ['Balles incendiaires', 'enflamment les virus touchés']],
  cannon: [['Méga-obus', 'explosion géante qui étourdit'], ['Mortier', 'portée +2, dégâts ×1,4, plus lent']],
  frost: [['Gel total', 'peut congeler les virus sur place'], ['Blizzard', 'zone de gel ×2 et ralentit encore plus']],
  flame: [['Napalm', 'brûlure deux fois plus forte'], ['Plasma bleu', 'portée +1 et ignore le blindage']],
  missile: [['Salve', 'tire 3 missiles à la fois'], ['Ogive lourde', 'un énorme missile : dégâts ×3, zone ×1,8']],
  laser: [['Rayon perforant', 'traverse tous les virus alignés'], ['Surchauffe', 'dégâts qui montent jusqu\'à ×3 sur la même cible']],
  tesla: [['Surcharge', '+3 rebonds et étourdit'], ['Tempête', 'frappe TOUS les virus à portée']],
  boost: [['Surpuissance', '+60 % de dégâts aux voisines'], ['Accélérateur', '+40 % de cadence aux voisines']],
  miner: [['Ferme de minage', 'gains doublés'], ['Banque', '+6 % de tes crédits à chaque vague (max 60)']]
};
const PATHCOL = ['#ffd740', '#40c4ff'];
const SPECIAL = {}, SPECIALB = {};
for (const k in PATHS) { SPECIAL[k] = PATHS[k][0][0] + ' : ' + PATHS[k][0][1]; SPECIALB[k] = PATHS[k][1][0] + ' : ' + PATHS[k][1][1]; }
const MODES = ['first', 'last', 'strong', 'close'], MODE_NAMES = { first: 'Premier', last: 'Dernier', strong: 'Plus fort', close: 'Plus proche' };
function tStats(type, lvl, path) {
  const d = TOWERS[type], k = lvl - 1, A = lvl >= 5 && path !== 1, B = lvl >= 5 && path === 1;
  const s = {
    dmg: d.dmg * Math.pow(1.55, k) * (1 + .08 * resLvl(type)), range: (d.range + .25 * k) * (1 + .03 * resLvl(type)), rate: d.rate * Math.pow(1.12, k),
    splash: d.splash ? (d.splash + .12 * k) * (A && type === 'cannon' ? 1.5 : 1) : 0, slow: d.slow ? Math.max(.25, d.slow - .07 * k) : 0, slowT: d.slowT ? d.slowT + .3 * k : 0,
    chain: d.chain ? d.chain + k + (A ? 3 : 0) : 0, special: A, alt: B,
    burn: d.burn ? d.burn * Math.pow(1.4, k) * (A ? 2 : 1) : 0,
    boost: type === 'boost' ? (A ? .6 : .2 + .08 * Math.min(k, 3)) : 0, gain: type === 'miner' ? (3 + 2 * k) * (A ? 2 : 1) : 0
  };
  if (B) switch (type) {
    case 'pulse': s.dmg *= 2.2; s.range += .5; break;
    case 'gatling': s.incend = true; break;
    case 'cannon': s.range += 2; s.dmg *= 1.4; s.rate *= .75; break;
    case 'frost': s.splash *= 2; s.slow = Math.max(.15, s.slow - .15); break;
    case 'flame': s.range += 1; s.pierce = true; break;
    case 'missile': s.dmg *= 3; s.splash *= 1.8; s.rate *= .8; break;
    case 'laser': s.ramp = true; break;
    case 'tesla': s.storm = true; break;
    case 'boost': s.boost = .2; s.rateB = .4; break;
    case 'miner': s.bank = true; break;
  }
  return s;
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
const CHIP_MULT = { easy: .8, normal: 1, hard: 1.4, nightmare: 1.9, legend: 2.6, apocalypse: 3.5 };
const isDemo = () => G && G.demo;
const resLvl = k => isDemo() ? 3 : ((save.research || {})[k] || 0);
const gup = k => isDemo() ? 0 : ((save.gup || {})[k] || 0);
const unlockedT = k => isDemo() || (G && G.allowed ? G.allowed.includes(k) : (G && G.daily) || UNLOCK[k] === 0 || !!(save.unlockT || {})[k]);
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
  boss: { name: 'MÉGA-VIRUS', hp: 260, spd: .7, rew: 25, col: '#ff3b3b', r: .45, int: 3, n: 1, lives: 5, armor: 3, boss: 1 },
  // virus exclusifs à chaque monde (world = index du monde)
  worm: { name: 'Ver', hp: 16, spd: 1.3, rew: 2, col: '#c6ff00', r: .26, int: .8, n: 9, worm: true, world: 0 },
  ember: { name: 'Braise', hp: 18, spd: 1.5, rew: 2, col: '#ff6e40', r: .26, int: .8, n: 9, fireproof: true, world: 1 },
  packet: { name: 'Paquet', hp: 8, spd: 3, rew: 2, col: '#18ffff', r: .21, int: .35, n: 14, noslow: true, world: 2 },
  zombie: { name: 'Zombie', hp: 18, spd: 1.2, rew: 2, col: '#9ccc65', r: .28, int: .9, n: 9, revive: true, world: 3 },
  cryo: { name: 'Cryovirus', hp: 24, spd: 1.15, rew: 3, col: '#b3e5fc', r: .29, int: 1, n: 8, noslow: true, chill: true, world: 4 },
  glitch: { name: 'Glitch', hp: 16, spd: 1.5, rew: 3, col: '#ff2bd6', r: .26, int: .85, n: 9, clone: true, world: 5 },
  // boss de fin de monde (dernière vague de chaque zone)
  kernel: { name: 'Ver Kernel', hp: 900, spd: .55, rew: 90, col: '#76ff03', r: .55, int: 3, n: 1, lives: 10, armor: 3, boss: 2, world: 0 },
  magma: { name: 'Titan de magma', hp: 1100, spd: .5, rew: 100, col: '#ff3d00', r: .58, int: 3, n: 1, lives: 10, armor: 4, boss: 2, fireproof: true, heatwave: true, world: 1 },
  trojan: { name: 'Cheval de Troie', hp: 1000, spd: .6, rew: 100, col: '#8d6e63', r: .56, int: 3, n: 1, lives: 10, armor: 4, boss: 2, trojan: true, world: 2 },
  ddos: { name: 'Botnet DDoS', hp: 1000, spd: .5, rew: 110, col: '#ffab00', r: .55, int: 3, n: 1, lives: 10, armor: 3, boss: 2, summon: true, world: 3 },
  glacier: { name: 'Glacier', hp: 1300, spd: .45, rew: 120, col: '#80d8ff', r: .6, int: 3, n: 1, lives: 10, armor: 6, boss: 2, noslow: true, chill: true, shield: .4, world: 4 },
  aicore: { name: 'IA corrompue', hp: 1300, spd: .55, rew: 140, col: '#ea80fc', r: .56, int: 3, n: 1, lives: 10, armor: 4, boss: 2, ghost: true, hack: true, world: 5 }
};
const EDESC = {
  bug: 'Le virus de base. Pas bien malin.', runner: 'Très rapide mais fragile.', swarm: 'Arrive en essaim de petits virus.',
  armor: 'Blindé : les petits dégâts rebondissent. Utilise de gros calibres ou des balles perforantes.', flyer: 'Survole les couloirs : le canon ne peut pas le toucher.',
  regen: 'Se régénère s\'il n\'est pas abattu vite.', splitter: 'Se coupe en deux mini-virus quand il meurt.', mini: 'Morceau d\'un diviseur.',
  shield: 'Bulle d\'énergie qui absorbe les dégâts et se recharge.', ghost: 'Devient intouchable par moments.', healer: 'Soigne les virus autour de lui.',
  giant: 'Énorme et lent, coûte 2 vies.', jumper: 'Se téléporte plus loin dans le couloir.', boss: 'Le méga-virus, toutes les 10 vagues. Coûte 5 vies.',
  worm: 'Circuit imprimé : accélère quand il est blessé.', ember: 'La Fournaise : insensible au feu.', packet: 'Flux de données : ultra-rapide, ne peut pas être ralenti.',
  zombie: 'Salle des serveurs : se relève une fois après sa mort.', cryo: 'Zone cryogénique : insensible au gel, gèle une tourelle en mourant.', glitch: 'Cyberespace : se duplique quand il est blessé.',
  kernel: 'BOSS du Circuit imprimé. Libère 4 vers en mourant.', magma: 'BOSS de la Fournaise. Insensible au feu, ses vagues de chaleur coupent les tourelles proches.',
  trojan: 'BOSS du Flux de données. Libère des paquets quand il perd des PV.', ddos: 'BOSS de la Salle des serveurs. Appelle sans cesse des renforts.',
  glacier: 'BOSS de la Zone cryogénique. Bouclier, ne peut pas être ralenti et gèle les tourelles.', aicore: 'BOSS du Cyberespace. Devient intouchable, se soigne et pirate tes tourelles.'
};
const isBoss = e => !!ETYPES[e.type].boss;
const WBOSS = ['kernel', 'magma', 'trojan', 'ddos', 'glacier', 'aicore'], WVIRUS = ['worm', 'ember', 'packet', 'zombie', 'cryo', 'glitch'];
// règles propres à chaque monde
const RULES = {
  pcb: { name: 'Apprentissage', desc: 'Pas de règle spéciale : le monde idéal pour apprendre.' },
  forge: { name: 'Surchauffe', desc: 'Cases brûlantes : +35 % de dégâts pour la tourelle posée dessus, mais elle s\'arrête 2 s toutes les 15 s.' },
  data: { name: 'Portails', desc: 'Des portails font sauter les virus plus loin dans leur couloir.' },
  rack: { name: 'Coupures de courant', desc: 'Régulièrement, une zone perd le courant : ses tourelles s\'éteignent 5 s.' },
  ice: { name: 'Verglas', desc: 'Les virus glissent 20 % plus vite, mais le gel dure 50 % plus longtemps.' },
  neon: { name: 'Piratage', desc: 'Des tourelles se font pirater : touche-les vite pour les réparer !' }
};
function waveDef(w) {
  const g = G && !G.demo ? G : null, wi = g ? Math.floor(g.mi / 3) : 0;
  if (g && !g.endless && w === g.total && !g.daily) return { type: WBOSS[Math.min(5, wi)], n: 1, wboss: true };
  if (g && g.endless && w % 25 === 0) return { type: WBOSS[(w / 25 - 1 + wi) % 6], n: 1 + Math.floor(w / 75), wboss: true };
  if (w % (g && g.mod === 'bosses' ? 5 : 10) === 0) return { type: 'boss', n: Math.ceil(w / 20) };
  if (g && w >= 7 && (w === 7 || w % 4 === 3)) { const t = WVIRUS[Math.min(5, wi)]; return { type: t, n: Math.round(ETYPES[t].n * (1 + w * .025)) }; }
  const intro = { 1: 'bug', 3: 'runner', 5: 'swarm', 6: 'armor', 8: 'flyer', 12: 'regen', 14: 'splitter', 16: 'shield', 18: 'ghost', 21: 'healer', 24: 'giant', 27: 'jumper' };
  const avail = []; for (const k in intro) if (w >= +k) avail.push(intro[k]);
  const type = intro[w] || avail[(w * 7 + 3) % avail.length];
  const res = { type, n: Math.round(ETYPES[type].n * (1 + w * .035)) };
  if (w >= 9 && !intro[w]) { // à partir de la vague 9 : deux sortes de virus mélangées
    const t2 = avail[(w * 5 + 1) % avail.length];
    if (t2 !== type) { res.type2 = t2; res.n2 = Math.round(ETYPES[t2].n * (.45 + w * .012)); }
  }
  return res;
}
const hpScale = w => (1 + .15 * (w - 1) + .015 * (w - 1) * (w - 1));
const rewScale = w => 1 + (w - 1) * .032;

/* ---------------- sauvegarde ---------------- */
const SAVE_KEY = 'virusdef_save_v1';
const DEFAULT_SAVE = { chips: 50, unlockT: {}, research: {}, gup: {}, unlocked: { easy: 1, normal: 1, hard: 1, nightmare: 1, legend: 1, apocalypse: 1 }, side: 'right', music: true, stars: {}, best: {}, sound: true, vibe: true, autoWave: true, stats: {}, ach: {}, seen: {}, combos: {}, chal: {}, endless: {}, daily: {}, tuto: 0, eco: false };
function loadSave() {
  const d = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) { Object.assign(d, s); d.unlocked = Object.assign({}, DEFAULT_SAVE.unlocked, s.unlocked); } } catch (e) { }
  return d;
}
let save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }
if (!save.tuto && Object.keys(save.stars || {}).length) save.tuto = 1; // anciens joueurs : pas de tutoriel
function stat(k, n) { if (G && G.demo) return; save.stats = save.stats || {}; save.stats[k] = (save.stats[k] || 0) + (n || 1); }

/* ---------------- succès ---------------- */
const ACH = [
  { id: 'first', ic: '🎉', name: 'Premier pas', desc: 'Gagne ta première zone', chips: 10, test: S => S.wins >= 1 },
  { id: 'k100', ic: '🦠', name: 'Antivirus', desc: 'Détruis 100 virus', chips: 10, test: S => S.kills >= 100 },
  { id: 'k1000', ic: '🧯', name: 'Pare-feu humain', desc: 'Détruis 1 000 virus', chips: 25, test: S => S.kills >= 1000 },
  { id: 'k10000', ic: '☢', name: 'Exterminateur', desc: 'Détruis 10 000 virus', chips: 60, test: S => S.kills >= 10000 },
  { id: 'build100', ic: '🏗', name: 'Bâtisseur', desc: 'Pose 100 tourelles', chips: 15, test: S => S.built >= 100 },
  { id: 'max5', ic: '⭐', name: 'Ultime', desc: 'Monte une tourelle au niveau 5', chips: 15, test: S => S.lvl5 >= 1 },
  { id: 'paths', ic: '🔀', name: 'Les deux voies', desc: 'Essaie les 2 voies du niveau 5 d\'une même tourelle', chips: 20 },
  { id: 'combo1', ic: '🧪', name: 'Chimiste', desc: 'Déclenche une combinaison de tourelles', chips: 10 },
  { id: 'combo4', ic: '⚗', name: 'Alchimiste', desc: 'Découvre les 4 combinaisons', chips: 40 },
  { id: 'power', ic: '☄', name: 'Puissance de feu', desc: 'Utilise 25 pouvoirs actifs', chips: 15, test: S => S.powers >= 25 },
  { id: 'streak50', ic: '🔥', name: 'Carnage', desc: 'Fais une série de 50 virus détruits', chips: 20 },
  { id: 'perfect', ic: '🛡', name: 'Sans faute', desc: 'Gagne une zone sans perdre de vie', chips: 15 },
  { id: 'boss1', ic: '👑', name: 'Tueur de géants', desc: 'Détruis un boss de monde', chips: 20, test: S => S.bossKills >= 1 },
  { id: 'boss6', ic: '🏆', name: 'Maître des mondes', desc: 'Détruis les 6 boss de monde', chips: 80, test: S => Object.keys(S.bossSet || {}).length >= 6 },
  { id: 'worlds', ic: '🌍', name: 'Tour du monde', desc: 'Termine une zone dans chacun des 6 mondes', chips: 40, test: S => Object.keys(S.worldWin || {}).length >= 6 },
  { id: 'chal10', ic: '🏅', name: 'Défis relevés', desc: 'Réussis 10 défis de zone', chips: 30, test: () => Object.keys(save.chal || {}).length >= 10 },
  { id: 'endless30', ic: '♾', name: 'Infini', desc: 'Atteins la vague 30 en mode infini', chips: 25, test: S => S.endlessBest >= 30 },
  { id: 'endless60', ic: '🌌', name: 'Au-delà', desc: 'Atteins la vague 60 en mode infini', chips: 60, test: S => S.endlessBest >= 60 },
  { id: 'daily', ic: '📅', name: 'Assidu', desc: 'Termine un défi du jour', chips: 20, test: S => S.dailyWins >= 1 },
  { id: 'daily7', ic: '🗓', name: 'Fidèle', desc: 'Termine 7 défis du jour', chips: 50, test: S => S.dailyWins >= 7 },
  { id: 'legend', ic: '💀', name: 'Légende', desc: 'Gagne une zone en difficulté Légende', chips: 50, test: S => S.legendWins >= 1 },
  { id: 'hacker', ic: '🔧', name: 'Technicien', desc: 'Répare 20 tourelles piratées', chips: 15, test: S => S.repairs >= 20 },
  { id: 'rich', ic: '💰', name: 'Crésus', desc: 'Aie 1 000 crédits en même temps', chips: 15 },
  { id: 'ency', ic: '📖', name: 'Encyclopédiste', desc: 'Rencontre tous les virus', chips: 40, test: () => Object.keys(ETYPES).every(k => (save.seen || {})[k]) }
];
function unlockAch(id) {
  if (G && G.demo) return;
  save.ach = save.ach || {}; if (save.ach[id]) return;
  const a = ACH.find(x => x.id === id); if (!a) return;
  save.ach[id] = Date.now(); save.chips = (save.chips || 0) + a.chips; persist();
  if (G) (G.newAch = G.newAch || []).push(a);
  toast('🏆 Succès : ' + a.ic + ' ' + a.name + ' (+' + a.chips + ' ⬢)'); sfx('win');
}
function checkAch() { const S = save.stats || {}; for (const a of ACH) if (a.test && !(save.ach || {})[a.id] && a.test(S)) unlockAch(a.id); }

/* ---------------- défis de zone ---------------- */
const CHALS = {
  nolife: { name: 'Aucune vie perdue', ok: g => g.lives >= g.maxLives },
  nosell: { name: 'Sans revendre de tourelle', ok: g => !g.sold },
  three: { name: '3 types de tourelles au maximum', ok: g => g.typesUsed.size <= 3 },
  nopower: { name: 'Sans utiliser de pouvoir', ok: g => !g.powerUsed },
  cheap: { name: 'Aucune tourelle à plus de 60 cr', ok: g => g.maxCost <= 60 },
  few: { name: '15 tourelles au maximum', ok: g => g.maxTowers <= 15 },
  nolvl5: { name: 'Aucune tourelle au niveau 5', ok: g => g.maxLvl < 5 }
};
const CHAL_KEYS = Object.keys(CHALS);
const zoneChals = mi => [CHAL_KEYS[(mi * 3) % 7], CHAL_KEYS[(mi * 3 + 2) % 7]];

/* ---------------- défi du jour ---------------- */
const DMODS = [
  { id: 'fast', name: 'Virus pressés', desc: 'Les virus vont 25 % plus vite.' },
  { id: 'rich', name: 'Gros budget', desc: 'Crédits de départ ×3, mais primes −30 %.' },
  { id: 'fragile', name: 'Pare-feu fragile', desc: 'Seulement 5 vies.' },
  { id: 'bosses', name: 'Invasion', desc: 'Un méga-virus toutes les 5 vagues.' },
  { id: 'random', name: 'Arsenal imposé', desc: 'Seulement 4 tourelles tirées au sort.' },
  { id: 'nosell', name: 'Pas de retour', desc: 'Impossible de revendre les tourelles.' },
  { id: 'armored', name: 'Blindage', desc: 'Tous les virus ont +3 de blindage.' }
];
function dailyInfo() {
  const d = new Date(), key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  let h = 7; for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0;
  const Rn = mulberry(h), mi = Math.floor(Rn() * MAPS.length), mod = DMODS[Math.floor(Rn() * DMODS.length)];
  let allowed = null;
  if (mod.id === 'random') { const p = TORDER.slice(); allowed = []; while (allowed.length < 4) allowed.push(p.splice(Math.floor(Rn() * p.length), 1)[0]); }
  return { key, mi, mod, allowed };
}

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
function sfx(n, p) {
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
    case 'pop': { const k = Math.pow(1.06, Math.min(24, p || 0)); tone(320 * k, .09, 'sine', .07, 900 * k); tone(640 * k, .06, 'triangle', .03, 1400 * k, t + .02); break; }
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
// une musique de jeu par monde (tempo, accords, timbres)
const WSONGS = {
  forge: { bpm: 128, chords: [52, 52, 55, 50, 52, 48, 50, 47], minor: [1, 1, 0, 0, 1, 0, 0, 0], drums: 2, lead: [12, 15, 12, 10, 7, 10, 12, 15], arp: 'sawtooth', bass: 'sawtooth' },
  data: { bpm: 136, chords: [60, 57, 53, 55], minor: [0, 1, 0, 0], drums: 1, lead: [7, 12, 14, 19, 14, 12, 7, 5], arp: 'square' },
  rack: { bpm: 112, chords: [50, 50, 53, 48], minor: [1, 1, 0, 0], drums: 1, lead: [0, 3, 5, 7, 5, 3, 0, 3], arp: 'triangle' },
  ice: { bpm: 96, chords: [62, 59, 55, 57], minor: [0, 1, 0, 0], drums: 1, lead: [12, 14, 16, 19, 16, 14, 12, 7], arp: 'sine', pad: true },
  neon: { bpm: 124, chords: [57, 53, 48, 55], minor: [1, 0, 0, 0], drums: 1, lead: [12, 10, 12, 15, 17, 15, 12, 10], arp: 'sawtooth', bass: 'square' }
};
function musicTick() {
  if (!AC) return;
  const want = save.music ? (state === 'pause' ? .35 : 1) * .32 : 0;
  MUS.vol += (want - MUS.vol) * .05; MUSG.gain.value = MUS.vol;
  if (MUS.vol < .002) { MUS.next = AC.currentTime + .05; return; }
  const mode = (G && !G.demo && (state === 'play' || state === 'pause')) ? ((G.enemies.some(isBoss) || G.alarm > 0) ? 'boss' : 'game') : 'menu';
  const mkey = mode + (G ? G.th : '');
  if (mkey !== MUS.key) { MUS.key = mkey; MUS.mode = mode; MUS.step = 0; }
  const S = MUS.mode === 'game' && G && WSONGS[G.th] ? WSONGS[G.th] : SONGS[MUS.mode], spb = 60 / S.bpm / 4; // durée d'une double-croche
  if (MUS.next < AC.currentTime - .2) MUS.next = AC.currentTime + .02;
  while (MUS.next < AC.currentTime + .18) {
    const st = MUS.step, t = MUS.next, bar = Math.floor(st / 16) % S.chords.length, b = st % 16;
    const root = S.chords[bar], minor = S.minor[bar], third = minor ? 3 : 4, tri = [0, third, 7, 12];
    // basse
    if (b % 4 === 0 || (S.drums && b % 4 === 3 && b !== 15)) tone(NOTE(root - 24 + (b === 8 ? 7 : 0)), spb * (b % 4 ? 1 : 2.5), S.bass || 'triangle', S.bass ? .18 : .5, 0, t, MUSG);
    // arpège
    if (S.drums || b % 2 === 0) tone(NOTE(root + tri[(b + bar) % 4] + 12), spb * 1.6, S.arp || 'square', S.arp === 'sine' ? .12 : .07, 0, t, MUSG, true);
    // nappe (menu, monde glacé)
    if ((!S.drums || S.pad) && b === 0) for (const iv of [0, third, 7]) tone(NOTE(root + iv), spb * 15, 'sine', .09, 0, t, MUSG);
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
  DPR = Math.min(window.devicePixelRatio || 1, save.eco ? 1 : 2);
  SW = innerWidth; SH = innerHeight;
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  cv.style.width = SW + 'px'; cv.style.height = SH + 'px';
  const cs = getComputedStyle($('#safe'));
  const sT = parseFloat(cs.paddingTop) || 0, sR = parseFloat(cs.paddingRight) || 0, sB = parseFloat(cs.paddingBottom) || 0, sL = parseFloat(cs.paddingLeft) || 0;
  L.port = SH > SW * 1.05; L.sT = sT;
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
  if (G && G.sel) { dockPopup(); placePopup(); }
  const pw = $('#powers');
  if (pw) { pw.style.left = (L.ax + 8) + 'px'; pw.style.top = 'auto'; pw.style.bottom = (L.port ? SH - (L.ay + L.ah) + 8 : 8 + sB) + 'px'; }
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
// ---- matières de fond propres à chaque monde ----
function nrmV(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }
function offPts(pts, o) {
  return pts.map((p, j) => {
    const n1 = j > 0 ? nrmV(pts[j - 1], p) : null, n2 = j < pts.length - 1 ? nrmV(p, pts[j + 1]) : null;
    const nx = n1 && n2 ? n1[0] + n2[0] : (n1 || n2)[0], ny = n1 && n2 ? n1[1] + n2[1] : (n1 || n2)[1];
    return [p[0] + nx * o, p[1] + ny * o];
  });
}
function paintSubstrate(g, W, H, P, R, m, th) {
  let gr;
  const fillAll = (a, b, x0, y0) => { gr = g.createRadialGradient(W * (x0 || .4), H * (y0 || .3), P, W * .5, H * .5, Math.max(W, H) * .8); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
  const blob = (x, y, r, col) => { gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  if (th === 'forge') {
    fillAll(shade(m.base, .12), shade(m.base, -.65));
    // tôle striée
    g.lineCap = 'round';
    for (let y = 0, row = 0; y < H + P; y += P * .42, row++) for (let x = (row % 2) * P * .21; x < W + P; x += P * .42) {
      const a = (row + Math.round(x / (P * .42))) % 2 ? .78 : -.78, dx = Math.cos(a) * P * .1, dy = Math.sin(a) * P * .1;
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = P * .06; g.beginPath(); g.moveTo(x - dx + 1, y - dy + 2); g.lineTo(x + dx + 1, y + dy + 2); g.stroke();
      g.strokeStyle = 'rgba(255,220,190,.09)'; g.lineWidth = P * .05; g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x + dx, y + dy); g.stroke();
    }
    for (let i = 0; i < 9; i++) blob(R() * W, R() * H, P * (1.5 + R() * 3), 'rgba(255,90,0,.16)');
    for (let i = 0; i < 160; i++) { g.fillStyle = R() < .5 ? 'rgba(140,60,20,.3)' : 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(R() * W, R() * H, P * (.02 + R() * .06), 0, TAU); g.fill(); }
  } else if (th === 'data') {
    fillAll(shade(m.base, .1), shade(m.base, -.7));
    const s = P * .5, hx = s * Math.sqrt(3);
    g.strokeStyle = rgbaA(m.acc).replace('A', .08); g.lineWidth = Math.max(1, P * .015);
    g.beginPath();
    for (let row = 0, y = 0; y < H + s * 2; y += s * 1.5, row++) for (let x = (row % 2) * hx / 2; x < W + hx; x += hx) {
      for (let k = 0; k <= 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3, px = x + Math.cos(a) * s, py = y + Math.sin(a) * s; k ? g.lineTo(px, py) : g.moveTo(px, py); }
    }
    g.stroke();
    for (let i = 0; i < 6; i++) blob(R() * W, R() * H, P * (2 + R() * 3), rgbaA(m.acc).replace('A', .1));
  } else if (th === 'rack') {
    gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, shade(m.base, .25)); gr.addColorStop(.5, shade(m.base, 0)); gr.addColorStop(1, shade(m.base, -.35));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / (P * 6); i++) { // métal brossé
      const y = R() * H, x = R() * W, l = P * (.5 + R() * 3);
      g.fillStyle = R() < .5 ? 'rgba(255,255,255,' + (.03 + R() * .06) + ')' : 'rgba(0,0,0,' + (.03 + R() * .06) + ')'; g.fillRect(x, y, l, 1);
    }
    for (let x = P * 6.5; x < W; x += P * 6.5) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, 0, P * .04, H); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + P * .04, 0, P * .02, H); }
    for (let y = P * 5; y < H; y += P * 5) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, y, W, P * .04); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y + P * .04, W, P * .02); }
  } else if (th === 'ice') {
    fillAll(shade(m.base, .3), shade(m.base, -.5));
    for (let i = 0; i < 28; i++) blob(R() * W, R() * H, P * (.8 + R() * 2.5), 'rgba(235,250,255,' + (.1 + R() * .15) + ')');
    g.lineCap = 'round';
    for (let i = 0; i < 26; i++) { // fissures de givre
      let x = R() * W, y = R() * H, a = R() * TAU; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { a += (R() - .5) * 1.4; x += Math.cos(a) * P * .5; y += Math.sin(a) * P * .5; g.lineTo(x, y); }
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = P * .018; g.stroke();
    }
  } else if (th === 'neon') {
    g.fillStyle = shade(m.base, -.2); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) blob(R() * W, R() * H, P * (3 + R() * 4), rgbaA(m.acc).replace('A', .12));
    for (let x = 0, k = 0; x <= W; x += P * .5, k++) { g.fillStyle = rgbaA(m.acc).replace('A', k % 4 ? .07 : .2); g.fillRect(x, 0, k % 4 ? 1 : 2, H); }
    for (let y = 0, k = 0; y <= H; y += P * .5, k++) { g.fillStyle = rgbaA(m.acc).replace('A', k % 4 ? .07 : .2); g.fillRect(0, y, W, k % 4 ? 1 : 2); }
  } else {
    fillAll(shade(m.base, .12), shade(m.base, -.38));
  }
}
// pistes / tuyaux / fibres / câbles / néons : chacun enregistré pour les impulsions animées
function paintLines(g, W, H, P, R, m, th, rec, mult, via) {
  const cfg = { pcb: [24, 7, .13], forge: [10, 2, .24], data: [22, 4, .1], rack: [12, 5, .11], ice: [11, 2, .22], neon: [16, 3, .13] }[th];
  const CAB = ['#1565c0', '#f9a825', '#c62828', '#2e7d32', '#eceff1', '#ff6f00', '#6a1b9a'];
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < cfg[0] * mult; i++) {
    const n = 1 + Math.floor(R() * cfg[1]), sp = P * cfg[2];
    let x = R() * W, y = R() * H, dir = Math.floor(R() * 4) * Math.PI / 2;
    const pts = [[x, y]];
    for (let s = 0; s < 4; s++) { const len = P * (1 + R() * 4); x += Math.round(Math.cos(dir)) * len; y += Math.round(Math.sin(dir)) * len; pts.push([x, y]); dir += (R() < .5 ? -1 : 1) * Math.PI / 2; }
    const col2 = R() < .6 ? m.acc : (th === 'neon' ? '#00e5ff' : '#ffffff');
    for (let k = 0; k < n; k++) {
      const op = offPts(pts, (k - (n - 1) / 2) * sp);
      if (rec) rec.push(op.map(([px, py]) => [px / P, py / P]));
      const path = () => { g.beginPath(); op.forEach(([px, py], j) => j ? g.lineTo(px, py) : g.moveTo(px, py)); };
      const e0 = op[0], e1 = op[op.length - 1];
      if (th === 'forge') { // caloducs en cuivre
        const w = P * .15;
        path(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = w + P * .06; g.stroke();
        path(); g.strokeStyle = '#7a4520'; g.lineWidth = w; g.stroke();
        path(); g.strokeStyle = '#c8783a'; g.lineWidth = w * .6; g.stroke();
        path(); g.strokeStyle = 'rgba(255,225,180,.65)'; g.lineWidth = w * .16; g.stroke();
        for (const [px, py] of [e0, e1]) { g.fillStyle = '#4e2c14'; g.beginPath(); g.arc(px, py, P * .13, 0, TAU); g.fill(); g.fillStyle = '#d08a4a'; g.beginPath(); g.arc(px, py, P * .07, 0, TAU); g.fill(); }
      } else if (th === 'data') { // fibres optiques
        path(); g.shadowColor = col2; g.shadowBlur = P * .25; g.strokeStyle = rgbaA(col2).replace('A', .55); g.lineWidth = P * .028; g.stroke();
        g.shadowColor = 'transparent'; g.shadowBlur = 0;
        path(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = P * .01; g.stroke();
        for (const [px, py] of [e0, e1]) { g.fillStyle = '#0a1426'; g.fillRect(px - P * .07, py - P * .07, P * .14, P * .14); g.strokeStyle = col2; g.lineWidth = P * .02; g.strokeRect(px - P * .07, py - P * .07, P * .14, P * .14); }
      } else if (th === 'rack') { // câbles réseau
        const w = P * .085, col = CAB[Math.floor(R() * CAB.length)];
        path(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = w + P * .05; g.stroke();
        path(); g.strokeStyle = col; g.lineWidth = w; g.stroke();
        path(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = w * .28; g.stroke();
        for (const [px, py] of [e0, e1]) { g.fillStyle = '#cfd8dc'; g.fillRect(px - P * .08, py - P * .08, P * .16, P * .16); g.fillStyle = '#37474f'; g.fillRect(px - P * .05, py - P * .03, P * .1, P * .06); }
      } else if (th === 'ice') { // tuyaux de liquide de refroidissement givrés
        const w = P * .13;
        path(); g.strokeStyle = 'rgba(0,30,60,.4)'; g.lineWidth = w + P * .05; g.stroke();
        path(); g.strokeStyle = '#5f9cc0'; g.lineWidth = w; g.stroke();
        path(); g.strokeStyle = '#b3e5fc'; g.lineWidth = w * .55; g.stroke();
        g.setLineDash([P * .05, P * .17]); path(); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = w * .9; g.stroke(); g.setLineDash([]);
        for (const [px, py] of [e0, e1]) { g.fillStyle = '#90a4ae'; g.beginPath(); g.arc(px, py, P * .12, 0, TAU); g.fill(); g.fillStyle = '#eceff1'; g.beginPath(); g.arc(px, py, P * .06, 0, TAU); g.fill(); }
      } else if (th === 'neon') { // tubes néon
        path(); g.shadowColor = col2; g.shadowBlur = P * .35; g.strokeStyle = col2; g.lineWidth = P * .035; g.stroke();
        g.shadowColor = 'transparent'; g.shadowBlur = 0;
        path(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = P * .012; g.stroke();
        for (const [px, py] of [e0, e1]) { g.strokeStyle = col2; g.lineWidth = P * .025; g.beginPath(); g.arc(px, py, P * .07, 0, TAU); g.stroke(); }
      } else { // pistes de cuivre
        const w = P * (.04 + R() * .025);
        path(); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = w + P * .03; g.stroke();
        path(); g.strokeStyle = shade(m.base, .24); g.lineWidth = w; g.stroke();
        path(); g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = w * .3; g.stroke();
        if (via) { via(e0[0], e0[1], P * .065); via(e1[0], e1[1], P * .065); }
      }
    }
  }
}
// sol et bords des couloirs selon le monde
const FLOOR = { pcb: ['#1c1814', '#0c0a08'], forge: ['#24100a', '#080302'], data: ['#071226', '#01050c'], rack: ['#202226', '#0d0e10'], ice: ['#163a58', '#061626'], neon: ['#0a0316', '#010006'] };
const RIM = { pcb: ['#d8b25a', 'rgba(255,248,210,.55)'], forge: ['#5d4037', 'rgba(255,170,90,.7)'], data: ['#4f83cc', 'rgba(200,240,255,.6)'], rack: ['#ffc400', null], ice: ['#e1f5fe', 'rgba(255,255,255,.8)'], neon: [null, 'rgba(255,255,255,.85)'] };

// fond complet : la carte jouable + du décor tout autour (aucune bande noire à l'écran)
function buildBG(mi, P, M) {
  const inner = buildMapBG(mi, P);
  if (!M) return inner;
  const m = MAPS[mi], th = worldOf(mi).style, W = (COLS + 2 * M) * P, H = (ROWS + 2 * M) * P;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = mulberry(mi * 313 + 99);
  paintSubstrate(g, W, H, P, R, m, th);
  paintLines(g, W, H, P, R, m, th, null, 2.5, (x, y, r) => { g.fillStyle = '#d4a93c'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
  for (let i = 0; i < 26; i++) { // blocs (puces, baies, cristaux… selon le monde)
    const w = P * (1 + R() * 2.5), h = P * (.6 + R() * 1.2), x = R() * W, y = R() * H;
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = P * .2; g.shadowOffsetY = P * .08;
    const gr = g.createLinearGradient(x, y, x, y + h);
    if (th === 'ice') { gr.addColorStop(0, '#e3f2fd'); gr.addColorStop(1, '#7fa9c4'); }
    else if (th === 'rack') { gr.addColorStop(0, '#3a4046'); gr.addColorStop(1, '#16191c'); }
    else if (th === 'neon') { gr.addColorStop(0, 'rgba(10,4,20,.9)'); gr.addColorStop(1, 'rgba(0,0,0,.9)'); }
    else { gr.addColorStop(0, '#34343a'); gr.addColorStop(1, '#0c0c0e'); }
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    if (th === 'neon' || th === 'data') { g.strokeStyle = m.acc; g.lineWidth = P * .03; g.strokeRect(x, y, w, h); }
  }
  // couloirs d'entrée / sortie prolongés jusqu'au bord de l'écran
  const ox = M * P, oy = M * P;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = m.g[y][x]; if (ch !== 'S' && ch !== 'E') continue;
    const dirs = []; if (x === 0) dirs.push([-1, 0]); if (x === COLS - 1) dirs.push([1, 0]); if (y === 0) dirs.push([0, -1]); if (y === ROWS - 1) dirs.push([0, 1]);
    for (const [dx, dy] of dirs) {
      const X = ox + x * P, Y = oy + y * P;
      const rx = dx < 0 ? 0 : dx > 0 ? X + P : X, ry = dy < 0 ? 0 : dy > 0 ? Y + P : Y;
      const rw = dx ? (dx < 0 ? X : W - rx) : P, rh = dy ? (dy < 0 ? Y : H - ry) : P;
      g.fillStyle = FLOOR[th][1]; g.fillRect(rx, ry, rw, rh);
      g.strokeStyle = RIM[th][0] || m.acc; g.lineWidth = P * .035; g.beginPath();
      if (dx) { g.moveTo(rx, ry); g.lineTo(rx + rw, ry); g.moveTo(rx, ry + rh); g.lineTo(rx + rw, ry + rh); }
      else { g.moveTo(rx, ry); g.lineTo(rx, ry + rh); g.moveTo(rx + rw, ry); g.lineTo(rx + rw, ry + rh); }
      g.stroke();
    }
  }
  // assombrir l'extérieur, puis poser la zone de jeu avec un cadre
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, W, H);
  g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = P * .6; g.fillStyle = '#000'; g.fillRect(ox, oy, COLS * P, ROWS * P);
  g.shadowColor = 'transparent'; g.shadowBlur = 0;
  g.drawImage(inner, ox, oy);
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = P * .04; g.setLineDash([P * .3, P * .2]); g.strokeRect(ox, oy, COLS * P, ROWS * P); g.setLineDash([]);
  return c;
}
function buildMapBG(mi, P) {
  const m = MAPS[mi], th = worldOf(mi).style, c = document.createElement('canvas'), W = COLS * P, H = ROWS * P;
  c.width = W; c.height = H;
  const g = c.getContext('2d'), R = mulberry(mi * 977 + 13), rec = P >= 48;
  if (rec) { m.traces = []; m.leds = []; }
  const LEDC = worldOf(mi).leds;
  const isOpen = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && '.SE'.includes(m.g[y][x]);
  const rectFree = (x, y, w, h) => {
    for (let ty = Math.floor(y / P); ty <= Math.floor((y + h) / P); ty++) for (let tx = Math.floor(x / P); tx <= Math.floor((x + w) / P); tx++) if (isOpen(tx, ty)) return false;
    return x >= 0 && y >= 0 && x + w <= W && y + h <= H;
  };
  const used = [], m2 = P * .16;
  const overlaps = (x, y, w, h) => used.some(u => x < u[0] + u[2] + m2 && x + w + m2 > u[0] && y < u[1] + u[3] + m2 && y + h + m2 > u[1]);
  const place = (w, h, tries) => { for (let i = 0; i < (tries || 60); i++) { const x = R() * (W - w), y = R() * (H - h); if (rectFree(x - P * .1, y - P * .1, w + P * .2, h + P * .2) && !overlaps(x - P * .2, y - P * .25, w + P * .4, h + P * .5)) { used.push([x - P * .2, y - P * .25, w + P * .4, h + P * .5]); return [x, y]; } } return null; };
  const silk = th === 'rack' ? 'rgba(20,24,28,.75)' : th === 'neon' ? rgbaA(m.acc).replace('A', .85) : th === 'data' ? 'rgba(160,220,255,.75)' : th === 'ice' ? 'rgba(10,40,70,.7)' : 'rgba(238,238,225,.78)';
  const label = (t, x, y, s) => { g.fillStyle = silk; g.font = 'bold ' + (P * (s || .13)) + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(t, x, y); };
  const via = (x, y, r) => {
    const gr = g.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
    gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.5, '#d4a93c'); gr.addColorStop(1, '#7a5a17');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = '#0d0d0d'; g.beginPath(); g.arc(x, y, r * .42, 0, TAU); g.fill();
  };
  const screw = (x, y, r) => {
    const gr = g.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(.6, '#9aa5ad'); gr.addColorStop(1, '#4a535a');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(30,30,30,.7)'; g.lineWidth = r * .25; g.beginPath(); g.moveTo(x - r * .55, y); g.lineTo(x + r * .55, y); g.moveTo(x, y - r * .55); g.lineTo(x, y + r * .55); g.stroke();
  };
  const metal = (x, y, w, h, vertical) => {
    const gr = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#7d7d7d'); gr.addColorStop(.45, '#f4f4f4'); gr.addColorStop(1, '#6a6a6a');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  };
  const shadowOn = (b, o) => { g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = P * b; g.shadowOffsetX = P * o * .7; g.shadowOffsetY = P * o; };
  const shadowOff = () => { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0; };
  const glowOn = (col, b) => { g.shadowColor = col; g.shadowBlur = P * b; g.shadowOffsetX = g.shadowOffsetY = 0; };
  const led = (x, y, i) => { if (rec) m.leds.push([x / P, y / P, LEDC[i % LEDC.length], R() * 6]); g.fillStyle = '#111'; g.fillRect(x - P * .1, y - P * .07, P * .2, P * .14); };
  let gr;

  // 1. fond + 2. lignes (pistes, caloducs, fibres, câbles, néons…)
  paintSubstrate(g, W, H, P, R, m, th);
  paintLines(g, W, H, P, R, m, th, rec ? m.traces : null, 1, via);
  if (th === 'pcb') for (let i = 0; i < 40; i++) via(R() * W, R() * H, P * .05);

  // 3. composants (uniquement sur le circuit, pas dans les couloirs)
  const names = ['VX-7124', 'NM2048', 'SR-4410', 'KD-88', 'Q-PROC', 'MX29', 'LT-560', 'ZR-31', 'BIOS-2', 'RAM-8G'];
  const chip = (i, look) => {
    const w = P * (1 + R() * 2.2), h = P * (.7 + R() * 1.1), pos = place(w, h); if (!pos) return null;
    const [x, y] = pos, quad = R() < .35, pitch = P * .15, pw = P * .065, pl = P * .13;
    for (let px = x + P * .12; px < x + w - P * .1; px += pitch) { metal(px, y - pl, pw, pl + 2, true); metal(px, y + h - 2, pw, pl + 2, true); }
    if (quad) for (let py = y + P * .12; py < y + h - P * .1; py += pitch) { metal(x - pl, py, pl + 2, pw, false); metal(x + w - 2, py, pl + 2, pw, false); }
    shadowOn(.2, .08);
    gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#36363b'); gr.addColorStop(.12, '#1e1e22'); gr.addColorStop(1, '#0c0c0e');
    g.fillStyle = gr; rr(g, x, y, w, h, P * .03); g.fill(); shadowOff();
    g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 1.5; rr(g, x + 2, y + 2, w - 4, h - 4, P * .03); g.stroke();
    if (look === 'hot') { gr = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * .6); gr.addColorStop(0, 'rgba(255,110,20,.55)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    if (look === 'frost') { gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.4, 'rgba(225,245,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,.4)'); g.fillStyle = gr; rr(g, x, y, w, h, P * .03); g.fill(); }
    if (look === 'neon') { glowOn(m.acc, .3); g.strokeStyle = m.acc; g.lineWidth = P * .03; rr(g, x, y, w, h, P * .03); g.stroke(); shadowOff(); }
    g.fillStyle = look === 'neon' || look === 'data' ? m.acc : 'rgba(255,255,255,.07)'; g.beginPath(); g.arc(x + P * .14, y + h - P * .14, P * .055, 0, TAU); g.fill();
    g.fillStyle = look === 'frost' ? 'rgba(30,60,90,.7)' : 'rgba(205,205,205,.55)'; g.font = 'bold ' + (P * .15) + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(names[(i + mi * 3) % names.length], x + P * .12, y + P * .27);
    g.font = (P * .1) + 'px monospace'; g.fillText((1000 + Math.floor(R() * 8999)) + '-' + (10 + Math.floor(R() * 89)), x + P * .12, y + P * .42);
    label('U' + (i + 1), x, y - P * .2);
    return [x, y, w, h];
  };
  const cap = (i, sleeves, frost) => {
    const r = P * (.24 + R() * .18), pos = place(r * 2, r * 2); if (!pos) return;
    const cx = pos[0] + r, cy = pos[1] + r, sleeve = sleeves[Math.floor(R() * sleeves.length)];
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
    if (frost) { gr = g.createRadialGradient(cx, cy - r * .3, 0, cx, cy, r * 1.1); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 1.1, 0, TAU); g.fill(); }
    label('+', cx - r * 1.35, cy - r * .7, .16); label('C' + (10 + i), cx + r * .9, cy + r * 1.3);
  };
  const smd = (n, cols) => { for (let i = 0; i < n; i++) {
    const vert = R() < .4, w = P * (vert ? .15 : .32), h = P * (vert ? .32 : .15), pos = place(w, h, 12); if (!pos) continue;
    const [x, y] = pos, res = R() < .6, e = P * .07;
    shadowOn(.06, .03);
    g.fillStyle = res ? cols[0] : cols[1]; g.fillRect(x, y, w, h); shadowOff();
    if (vert) { metal(x, y, w, e, false); metal(x, y + h - e, w, e, false); } else { metal(x, y, e, h, true); metal(x + w - e, y, e, h, true); }
    if (res && !vert) { g.fillStyle = 'rgba(255,255,255,.75)'; g.font = (P * .08) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(['103', '472', '220', '1K0', '4R7'][i % 5], x + w / 2, y + h / 2 + 1); }
    if (R() < .35) label((res ? 'R' : 'C') + (i + 20), x + w + P * .04, y + h);
  } };
  const hazard = (x, y, w, h) => {
    g.save(); rr(g, x, y, w, h, P * .04); g.clip();
    g.fillStyle = '#ffc400'; g.fillRect(x, y, w, h); g.fillStyle = '#1a1a1a';
    for (let k = -h; k < w + h; k += P * .24) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k + P * .12, y); g.lineTo(x + k + P * .12 - h, y + h); g.lineTo(x + k - h, y + h); g.closePath(); g.fill(); }
    g.restore();
  };

  if (th === 'pcb') {
    for (let i = 0; i < 9; i++) chip(i);
    for (let i = 0; i < 6; i++) cap(i, ['#1b2a6b', '#151515', '#4a1a5c', '#0f4a3a']);
    for (let i = 0; i < 2; i++) { // quartz
      const w = P * .8, h = P * .32, pos = place(w, h); if (!pos) continue;
      const [x, y] = pos; shadowOn(.15, .06);
      gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f6f6f6'); gr.addColorStop(.5, '#b5b5b5'); gr.addColorStop(1, '#7c7c7c');
      g.fillStyle = gr; rr(g, x, y, w, h, h / 2); g.fill(); shadowOff();
      g.fillStyle = 'rgba(40,40,40,.6)'; g.font = 'bold ' + (P * .12) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('16.000', x + w / 2, y + h / 2);
      label('Y' + (i + 1), x, y - P * .08);
    }
    smd(55, ['#151515', '#b88d5a']);
    for (let i = 0; i < 2; i++) { // trous de fixation
      const r = P * .26, pos = place(r * 2, r * 2); if (!pos) continue;
      const cx = pos[0] + r, cy = pos[1] + r;
      gr = g.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r);
      gr.addColorStop(0, '#fff1a8'); gr.addColorStop(.6, '#c79a2f'); gr.addColorStop(1, '#6d5114');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
      gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * .6); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#1d1d1d');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * .58, 0, TAU); g.fill();
    }
    for (let i = 0; i < 3; i++) { // connecteurs à broches
      const n = 4 + Math.floor(R() * 6), w = P * .18 * n, h = P * .36, pos = place(w, h); if (!pos) continue;
      const [x, y] = pos; shadowOn(.12, .06); g.fillStyle = '#151515'; g.fillRect(x, y, w, h); shadowOff();
      for (let k = 0; k < n; k++) for (let j2 = 0; j2 < 2; j2++) {
        const px = x + P * .09 + k * P * .18, py = y + P * .09 + j2 * P * .18;
        gr = g.createRadialGradient(px - P * .02, py - P * .02, 0, px, py, P * .06); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(1, '#b8860b');
        g.fillStyle = gr; g.fillRect(px - P * .045, py - P * .045, P * .09, P * .09);
      }
      label('J' + (i + 1), x, y - P * .06);
    }
    { const r = P * .5, pos = place(r * 2, r * 2); if (pos) { // pile bouton
      const cx = pos[0] + r, cy = pos[1] + r; shadowOn(.25, .1);
      gr = g.createRadialGradient(cx - r * .3, cy - r * .35, r * .1, cx, cy, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.6, '#b0bec5'); gr.addColorStop(1, '#546e7a');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); shadowOff();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = P * .02; g.beginPath(); g.arc(cx, cy, r * .85, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(40,50,60,.7)'; g.font = 'bold ' + (P * .16) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('CR2032', cx, cy - P * .06); g.fillText('3V  +', cx, cy + P * .14);
    } }
    for (let i = 0; i < 3; i++) { // bobines
      const s2 = P * .55, pos = place(s2, s2); if (!pos) continue;
      const [x, y] = pos; shadowOn(.15, .06); g.fillStyle = '#2b2b2b'; rr(g, x, y, s2, s2, P * .06); g.fill(); shadowOff();
      gr = g.createRadialGradient(x + s2 * .45, y + s2 * .45, s2 * .1, x + s2 / 2, y + s2 / 2, s2 * .42); gr.addColorStop(0, '#5d3a1a'); gr.addColorStop(.6, '#e08a3c'); gr.addColorStop(1, '#6b3a12');
      g.strokeStyle = gr; g.lineWidth = s2 * .16; g.beginPath(); g.arc(x + s2 / 2, y + s2 / 2, s2 * .3, 0, TAU); g.stroke();
      label('L' + (i + 1), x, y - P * .06);
    }
    { const pos = place(P * 2.6, P * .3, 80); if (pos) label('VD-' + (mi + 1) + '  REV 2.' + mi, pos[0], pos[1] + P * .25, .2); }
    if (rec) for (let i = 0; i < 14; i++) { const pos = place(P * .16, P * .1, 30); if (pos) { led(pos[0] + P * .08, pos[1] + P * .05, i); label('D' + (i + 1), pos[0], pos[1] - P * .06, .1); } }
  } else if (th === 'forge') {
    for (let i = 0; i < 4; i++) { // radiateurs à ailettes
      const w = P * (1.3 + R() * 1.1), h = P * (.9 + R() * .7), pos = place(w, h); if (!pos) continue;
      const [x, y] = pos; shadowOn(.3, .12);
      gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#5a5f63'); gr.addColorStop(1, '#25282b');
      g.fillStyle = gr; rr(g, x, y, w, h, P * .05); g.fill(); shadowOff();
      for (let fx = x + P * .1; fx < x + w - P * .1; fx += P * .16) { gr = g.createLinearGradient(fx, 0, fx + P * .08, 0); gr.addColorStop(0, '#6f7478'); gr.addColorStop(.5, '#d9dde0'); gr.addColorStop(1, '#4a4f53'); g.fillStyle = gr; g.fillRect(fx, y + P * .08, P * .08, h - P * .16); }
      gr = g.createLinearGradient(0, y + h, 0, y); gr.addColorStop(0, 'rgba(255,90,0,.55)'); gr.addColorStop(.6, 'rgba(255,60,0,0)'); g.fillStyle = gr; rr(g, x, y, w, h, P * .05); g.fill();
      label('HS' + (i + 1), x, y - P * .08);
    }
    for (let i = 0; i < 3; i++) { // transformateurs toriques
      const r = P * (.42 + R() * .15), pos = place(r * 2, r * 2); if (!pos) continue;
      const cx = pos[0] + r, cy = pos[1] + r; shadowOn(.3, .12);
      g.strokeStyle = '#8a4a1c'; g.lineWidth = r * .55; g.beginPath(); g.arc(cx, cy, r * .68, 0, TAU); g.stroke(); shadowOff();
      for (let k = 0; k < 28; k++) { const a = k / 28 * TAU; g.strokeStyle = k % 2 ? '#e0904a' : '#b0602a'; g.lineWidth = P * .035; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * .42, cy + Math.sin(a) * r * .42); g.lineTo(cx + Math.cos(a) * r * .95, cy + Math.sin(a) * r * .95); g.stroke(); }
      g.fillStyle = '#1a0e08'; g.beginPath(); g.arc(cx, cy, r * .36, 0, TAU); g.fill();
      label('T' + (i + 1), cx + r, cy + r);
    }
    for (let i = 0; i < 4; i++) cap(i, ['#1a1a1a', '#3e2723', '#bf360c']);
    for (let i = 0; i < 4; i++) chip(i, 'hot');
    for (let i = 0; i < 7; i++) { // transistors de puissance
      const w = P * .36, h = P * .5, pos = place(w, h, 20); if (!pos) continue;
      const [x, y] = pos; metal(x, y, w, h * .35, false); g.fillStyle = '#222'; g.beginPath(); g.arc(x + w / 2, y + h * .17, P * .05, 0, TAU); g.fill();
      shadowOn(.08, .04); g.fillStyle = '#151515'; g.fillRect(x, y + h * .35, w, h * .65); shadowOff();
    }
    for (let i = 0; i < 3; i++) { const w = P * (1.2 + R()), h = P * .3, pos = place(w, h); if (!pos) continue; shadowOn(.1, .05); hazard(pos[0], pos[1], w, h); shadowOff(); label('⚠ 400V', pos[0], pos[1] - P * .06, .14); }
    smd(25, ['#151515', '#5d4037']);
    if (rec) for (let i = 0; i < 10; i++) { const pos = place(P * .2, P * .14, 30); if (pos) led(pos[0] + P * .1, pos[1] + P * .07, i); }
    { const pos = place(P * 2.6, P * .3, 80); if (pos) label('PSU-' + (mi + 1) + ' 850W', pos[0], pos[1] + P * .25, .2); }
  } else if (th === 'data') {
    for (let i = 0; i < 2; i++) { // plateaux de disque (statiques)
      const r = P * .6, pos = place(r * 2, r * 2); if (!pos) continue;
      const cx = pos[0] + r, cy = pos[1] + r; shadowOn(.3, .1);
      g.fillStyle = '#1c2533'; rr(g, pos[0], pos[1], r * 2, r * 2, P * .1); g.fill(); shadowOff();
      gr = g.createRadialGradient(cx - r * .3, cy - r * .3, 0, cx, cy, r * .85); gr.addColorStop(0, '#f5f7fa'); gr.addColorStop(.6, '#9aa7b8'); gr.addColorStop(1, '#5a6578');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * .85, 0, TAU); g.fill();
      for (let k = 1; k < 6; k++) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r * .14 * k, 0, TAU); g.stroke(); }
      g.fillStyle = '#cfd8dc'; g.beginPath(); g.arc(cx, cy, r * .15, 0, TAU); g.fill();
    }
    for (let i = 0; i < 8; i++) { // nœuds de données hexagonaux
      const r = P * (.28 + R() * .15), pos = place(r * 2, r * 2); if (!pos) continue;
      const cx = pos[0] + r, cy = pos[1] + r, col = R() < .7 ? m.acc : '#ffffff';
      const hex = (rad) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; k ? g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad) : g.moveTo(cx + rad, cy); } g.closePath(); };
      hex(r); g.fillStyle = 'rgba(4,12,26,.9)'; g.fill(); glowOn(col, .3); g.strokeStyle = col; g.lineWidth = P * .03; g.stroke(); shadowOff();
      hex(r * .55); g.fillStyle = rgbaA(col).replace('A', .35); g.fill();
      label('0x' + (16 + Math.floor(R() * 239)).toString(16).toUpperCase(), cx - r * .6, cy + r * 1.45, .11);
    }
    for (let i = 0; i < 3; i++) { // ports RJ45
      const w = P * .6, h = P * .5, pos = place(w, h); if (!pos) continue;
      const [x, y] = pos; shadowOn(.15, .06); metal(x, y, w, h, false); shadowOff();
      g.fillStyle = '#05080c'; g.fillRect(x + w * .18, y + h * .3, w * .64, h * .55); g.fillRect(x + w * .38, y + h * .18, w * .24, h * .15);
      if (rec) { led(x + w * .15, y + h * .12, 0); led(x + w * .85, y + h * .12, 1); }
    }
    for (let i = 0; i < 5; i++) chip(i, 'data');
    for (let i = 0; i < 9; i++) { const s = Array.from({ length: 8 }, () => R() < .5 ? '0' : '1').join(''), pos = place(P * 1, P * .18, 20); if (pos) { g.fillStyle = rgbaA(m.acc).replace('A', .45); g.font = (P * .14) + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(s, pos[0], pos[1]); } }
    smd(20, ['#0c1b30', '#3a5a80']);
    if (rec) for (let i = 0; i < 8; i++) { const pos = place(P * .2, P * .14, 30); if (pos) led(pos[0] + P * .1, pos[1] + P * .07, i); }
  } else if (th === 'rack') {
    for (let i = 0; i < 5; i++) { // serveurs en baie (1U)
      const w = P * (2.2 + R() * 1.2), h = P * .62, pos = place(w, h); if (!pos) continue;
      const [x, y] = pos; shadowOn(.3, .12);
      gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#3d444b'); gr.addColorStop(1, '#1a1e22');
      g.fillStyle = gr; rr(g, x, y, w, h, P * .04); g.fill(); shadowOff();
      for (let k = 0; k < 4; k++) { g.fillStyle = '#0b0d0f'; rr(g, x + P * .15 + k * P * .14, y + h * .2, P * .08, h * .6, P * .03); g.fill(); }
      g.fillStyle = '#e0e0e0'; g.fillRect(x + w - P * 1.1, y + h * .25, P * .5, h * .5);
      g.fillStyle = '#212121'; for (let k = 0; k < 9; k++) g.fillRect(x + w - P * 1.07 + k * P * .05, y + h * .3, P * (k % 3 ? .02 : .03), h * .4);
      screw(x + P * .07, y + h / 2, P * .045); screw(x + w - P * .07, y + h / 2, P * .045);
      if (rec) for (let k = 0; k < 4; k++) led(x + P * .8 + k * P * .22, y + h * .5, i + k);
      label('SRV-' + (10 + i + mi), x, y - P * .06, .12);
    }
    for (let i = 0; i < 4; i++) { // grilles d'aération
      const w = P * (1 + R() * .8), h = P * (.7 + R() * .5), pos = place(w, h); if (!pos) continue;
      const [x, y] = pos; shadowOn(.15, .06); g.fillStyle = '#2c3237'; rr(g, x, y, w, h, P * .06); g.fill(); shadowOff();
      for (let yy = y + P * .1; yy < y + h - P * .08; yy += P * .12) for (let xx = x + P * .1; xx < x + w - P * .08; xx += P * .12) { g.fillStyle = '#060708'; g.beginPath(); g.arc(xx + P * .04, yy + P * .04, P * .035, 0, TAU); g.fill(); }
    }
    for (let i = 0; i < 4; i++) { // étiquettes code-barres
      const w = P * .9, h = P * .35, pos = place(w, h, 20); if (!pos) continue;
      const [x, y] = pos; g.fillStyle = '#f5f5f5'; g.fillRect(x, y, w, h);
      g.fillStyle = '#111'; for (let k = 0, xx = x + P * .05; xx < x + w - P * .05; k++) { const bw = P * (.01 + R() * .03); g.fillRect(xx, y + P * .04, bw, h * .6); xx += bw + P * (.01 + R() * .02); }
      g.font = (P * .07) + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('ID ' + Math.floor(R() * 99999), x + P * .05, y + h - P * .03);
    }
    for (let i = 0; i < 22; i++) { const pos = place(P * .14, P * .14, 15); if (pos) screw(pos[0] + P * .07, pos[1] + P * .07, P * .07); }
    for (let i = 0; i < 3; i++) cap(i, ['#1565c0', '#263238']);
  } else if (th === 'ice') {
    for (let i = 0; i < 3; i++) { // réservoirs de liquide cryogénique
      const w = P * .7, h = P * (1.2 + R() * .5), pos = place(w, h); if (!pos) continue;
      const [x, y] = pos; shadowOn(.3, .12);
      gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#78909c'); gr.addColorStop(.4, '#eceff1'); gr.addColorStop(1, '#607d8b');
      g.fillStyle = gr; rr(g, x, y, w, h, w / 2); g.fill(); shadowOff();
      gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#0277bd'); gr.addColorStop(.4, '#81d4fa'); gr.addColorStop(1, '#01579b');
      g.fillStyle = gr; rr(g, x + w * .2, y + h * .35, w * .6, h * .5, w * .25); g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x + w * .3, y + h * .38, w * .08, h * .42);
      label('N₂', x + w * .25, y + h * .25, .15);
    }
    for (let i = 0; i < 12; i++) { // cristaux de glace
      const r = P * (.15 + R() * .22), pos = place(r * 2, r * 2, 20); if (!pos) continue;
      const cx = pos[0] + r, cy = pos[1] + r, a0 = R() * TAU;
      glowOn('rgba(200,240,255,.9)', .2); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = P * .025; g.lineCap = 'round'; g.beginPath();
      for (let k = 0; k < 6; k++) { const a = a0 + k * Math.PI / 3, ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r; g.moveTo(cx, cy); g.lineTo(ex, ey);
        const bx = cx + Math.cos(a) * r * .55, by = cy + Math.sin(a) * r * .55; for (const s of [-1, 1]) { g.moveTo(bx, by); g.lineTo(bx + Math.cos(a + s * .7) * r * .3, by + Math.sin(a + s * .7) * r * .3); } }
      g.stroke(); shadowOff();
    }
    for (let i = 0; i < 5; i++) chip(i, 'frost');
    for (let i = 0; i < 4; i++) cap(i, ['#0d47a1', '#e3f2fd', '#455a64'], true);
    smd(25, ['#263238', '#90a4ae']);
    for (let i = 0; i < 16; i++) { const r = P * (.2 + R() * .4), pos = place(r * 2, r * 2, 10); if (!pos) continue; gr = g.createRadialGradient(pos[0] + r, pos[1] + r, 0, pos[0] + r, pos[1] + r, r); gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(pos[0] + r, pos[1] + r, r, 0, TAU); g.fill(); }
    if (rec) for (let i = 0; i < 8; i++) { const pos = place(P * .2, P * .14, 30); if (pos) led(pos[0] + P * .1, pos[1] + P * .07, i); }
  } else if (th === 'neon') {
    for (let i = 0; i < 4; i++) { // panneaux holographiques
      const w = P * (1.4 + R() * 1.2), h = P * (.8 + R() * .6), pos = place(w, h); if (!pos) continue;
      const [x, y] = pos, col = i % 2 ? '#00e5ff' : m.acc;
      g.fillStyle = rgbaA(col).replace('A', .1); g.fillRect(x, y, w, h);
      glowOn(col, .35); g.strokeStyle = col; g.lineWidth = P * .03; g.strokeRect(x, y, w, h); shadowOff();
      for (let k = 0; k < 4; k++) { g.fillStyle = rgbaA(col).replace('A', .5); g.fillRect(x + P * .12, y + P * .25 + k * P * .14, (w - P * .3) * (.3 + R() * .7), P * .05); }
      g.fillStyle = col; g.font = 'bold ' + (P * .12) + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(['SYS://', 'CORE.AI', 'ROOT#', 'NET>'][i % 4], x + P * .1, y + P * .17);
    }
    for (let i = 0; i < 9; i++) { // formes filaires lumineuses
      const r = P * (.25 + R() * .3), pos = place(r * 2, r * 2, 20); if (!pos) continue;
      const cx = pos[0] + r, cy = pos[1] + r, col = R() < .5 ? m.acc : '#00e5ff', sides = [3, 4, 6, 0][Math.floor(R() * 4)], a0 = R() * TAU;
      glowOn(col, .3); g.strokeStyle = col; g.lineWidth = P * .025; g.beginPath();
      if (!sides) g.arc(cx, cy, r, 0, TAU); else for (let k = 0; k <= sides; k++) { const a = a0 + k * TAU / sides; k ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.stroke(); shadowOff();
    }
    for (let i = 0; i < 4; i++) chip(i, 'neon');
    for (let i = 0; i < 7; i++) { const t = ['<AI/>', '0xDEAD', 'NULL', 'sudo', '404', 'exec()', '#!/bin'][i], pos = place(P * .8, P * .2, 20); if (pos) { glowOn(m.acc, .2); label(t, pos[0], pos[1] + P * .16, .14); shadowOff(); } }
    if (rec) for (let i = 0; i < 10; i++) { const pos = place(P * .2, P * .14, 30); if (pos) led(pos[0] + P * .1, pos[1] + P * .07, i); }
  }

  // gros composants (tuiles 'X')
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
    } else if (o.kind === 'coil') { // gros transformateur
      gr = g.createLinearGradient(x, y, x, y + w); gr.addColorStop(0, '#3e2723'); gr.addColorStop(1, '#120a08');
      g.fillStyle = gr; rr(g, x + P * .06, y + P * .06, w - P * .12, w - P * .12, P * .16); g.fill(); shadowOff();
      for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; g.strokeStyle = k % 2 ? '#e0904a' : '#9a5222'; g.lineWidth = P * .06; g.beginPath(); g.moveTo(x + P + Math.cos(a) * P * .35, y + P + Math.sin(a) * P * .35); g.lineTo(x + P + Math.cos(a) * P * .8, y + P + Math.sin(a) * P * .8); g.stroke(); }
      g.fillStyle = '#0a0503'; g.beginPath(); g.arc(x + P, y + P, P * .33, 0, TAU); g.fill();
      label('HV-' + (mi + 1), x + P * .3, y + w + P * .18, .12);
    } else if (o.kind === 'disk' || o.kind === 'tank' || o.kind === 'holo') {
      const dark = o.kind === 'tank' ? ['#b0bec5', '#546e7a'] : o.kind === 'holo' ? ['#14081f', '#050208'] : ['#2a3442', '#0d1118'];
      gr = g.createLinearGradient(x, y, x, y + w); gr.addColorStop(0, dark[0]); gr.addColorStop(1, dark[1]);
      g.fillStyle = gr; rr(g, x + P * .06, y + P * .06, w - P * .12, w - P * .12, P * .2); g.fill(); shadowOff();
      if (o.kind === 'holo') { glowOn(m.acc, .4); g.strokeStyle = m.acc; g.lineWidth = P * .04; g.beginPath(); g.arc(x + P, y + P, P * .8, 0, TAU); g.stroke(); g.beginPath(); g.arc(x + P, y + P, P * .5, 0, TAU); g.stroke(); shadowOff(); }
      if (o.kind === 'tank') { g.fillStyle = '#0a2236'; g.beginPath(); g.arc(x + P, y + P, P * .8, 0, TAU); g.fill(); }
      for (const [sx, sy] of [[.28, .28], [1.72, .28], [.28, 1.72], [1.72, 1.72]]) screw(x + sx * P, y + sy * P, P * .08);
      label(o.kind === 'disk' ? 'HDD 7200' : o.kind === 'tank' ? 'CRYO-1' : 'HOLO.CORE', x + P * .25, y + w + P * .18, .12);
    } else {
      gr = g.createLinearGradient(x, y, x, y + w); gr.addColorStop(0, '#3a3f47'); gr.addColorStop(1, '#14171b');
      g.fillStyle = gr; rr(g, x + P * .06, y + P * .06, w - P * .12, w - P * .12, P * .18); g.fill(); shadowOff();
      g.fillStyle = '#07080a'; g.beginPath(); g.arc(x + P, y + P, P * .82, 0, TAU); g.fill();
      for (const [sx, sy] of [[.28, .28], [1.72, .28], [.28, 1.72], [1.72, 1.72]]) { th === 'pcb' ? via(x + sx * P, y + sy * P, P * .09) : screw(x + sx * P, y + sy * P, P * .08); }
      label('FAN-12V', x + P * .3, y + w + P * .18, .12);
    }
  }

  // 4. couloirs creusés (zone libre)
  g.save(); g.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isOpen(x, y)) g.rect(x * P, y * P, P, P);
  g.clip();
  gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, FLOOR[th][0]); gr.addColorStop(1, FLOOR[th][1]);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.lineWidth = 1;
  if (th === 'pcb') { // tissage de fibre de verre
    for (let k = 0; k < W + H; k += P * .12) {
      g.strokeStyle = 'rgba(255,240,200,.025)'; g.beginPath(); g.moveTo(k, 0); g.lineTo(k - H, H); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(k - W, 0); g.lineTo(k, H); g.stroke();
    }
  } else if (th === 'forge') { // fissures de lave
    g.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      let x = R() * W, y = R() * H, a = R() * TAU; const pts = [[x, y]];
      for (let k = 0; k < 5; k++) { a += (R() - .5) * 1.6; x += Math.cos(a) * P * .3; y += Math.sin(a) * P * .3; pts.push([x, y]); }
      g.beginPath(); pts.forEach(([px, py], j) => j ? g.lineTo(px, py) : g.moveTo(px, py));
      glowOn('#ff3d00', .25); g.strokeStyle = 'rgba(255,90,0,.55)'; g.lineWidth = P * .035; g.stroke(); shadowOff();
      g.strokeStyle = 'rgba(255,220,120,.5)'; g.lineWidth = P * .01; g.stroke();
    }
  } else if (th === 'data') { // colonnes binaires
    g.font = (P * .16) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    for (let x = P * .15; x < W; x += P * .25) for (let y = R() * P; y < H; y += P * .2) if (R() < .45) { g.fillStyle = rgbaA(m.acc).replace('A', .04 + R() * .08); g.fillText(R() < .5 ? '0' : '1', x, y); }
  } else if (th === 'rack') { // plancher en tôle larmée
    for (let y = 0, row = 0; y < H; y += P * .25, row++) for (let x = (row % 2) * P * .125; x < W; x += P * .25) {
      g.save(); g.translate(x, y); g.rotate(row % 2 ? .7 : -.7); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(-P * .07, -P * .018, P * .14, P * .036); g.restore();
    }
  } else if (th === 'ice') { // reflets de glace
    for (let i = 0; i < 120; i++) { const x = R() * W, y = R() * H, l = P * (.1 + R() * .5); g.strokeStyle = 'rgba(220,245,255,' + (.06 + R() * .12) + ')'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y - l * .6); g.stroke(); }
  } else if (th === 'neon') { // grille du vide
    for (let x = 0; x <= W; x += P * .25) { g.fillStyle = rgbaA(m.acc).replace('A', .08); g.fillRect(x, 0, 1, H); }
    for (let y = 0; y <= H; y += P * .25) { g.fillStyle = rgbaA(m.acc).replace('A', .08); g.fillRect(0, y, W, 1); }
  }
  if (th === 'pcb' || th === 'forge') for (let i = 0; i < 14; i++) { // traces de brûlure
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
  // bords des couloirs (style du monde) + lueur
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
  const neon = th === 'neon';
  edges(); g.globalAlpha = neon ? 1 : .55; g.strokeStyle = m.acc; g.lineWidth = P * (neon ? .07 : .05); g.shadowColor = m.acc; g.shadowBlur = P * (neon ? .5 : .35); g.stroke(); shadowOff(); g.globalAlpha = 1;
  if (th === 'rack') { // bande de sécurité jaune et noire
    edges(); g.strokeStyle = '#151515'; g.lineWidth = P * .08; g.stroke();
    g.setLineDash([P * .1, P * .1]); edges(); g.strokeStyle = '#ffc400'; g.lineWidth = P * .08; g.stroke(); g.setLineDash([]);
  } else if (RIM[th][0]) { edges(); g.strokeStyle = RIM[th][0]; g.lineWidth = P * .035; g.stroke(); }
  if (RIM[th][1]) { edges(); g.strokeStyle = RIM[th][1]; g.lineWidth = P * .01; g.stroke(); }

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
  if (P >= 32) addNoise(g, W, H, R, th === 'neon' || th === 'data' ? 5 : 10);
  return c;
}

/* ---------------- état ---------------- */
let G = null, state = 'menu', curDiff = 'normal', uid = 1, curMode = 'campaign';

function newGame(mi, demo, opts) {
  opts = opts || {};
  const m = MAPS[mi], d = DIFFS[demo || opts.daily ? 'normal' : curDiff];
  const starts = [], exits = [];
  for (const r of m.routes) starts.push(r[0]);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (m.g[y][x] === 'E') exits.push([x, y]);
  const g = {
    mi, m, d, demo: !!demo, total: demo ? 9999 : opts.endless ? Infinity : opts.daily ? 30 : m.waves, wave: 0, lives: d.lives + (demo ? 0 : 2 * ((save.gup || {}).lives || 0)), cash: demo ? 1e9 : d.cash + (m.routes.length - 1) * 12 + 8 * ((save.gup || {}).cash || 0), score: 0, time: 0,
    starts, exits, towers: [], towerAt: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    enemies: [], projs: [], fx: [], parts: [], texts: [], queue: [], spawnT: 0, nextStart: 0,
    tool: null, sel: null, hover: null, speed: 1, countdown: -1, over: false, kills: 0, shake: 0, banner: null, aiT: 0
  };
  g.endless = !!opts.endless; g.daily = !!opts.daily; g.mod = opts.mod || null; g.allowed = opts.allowed || null;
  if (g.mod === 'rich') g.cash *= 3;
  if (g.mod === 'fragile') g.lives = 5;
  g.typesUsed = new Set(); g.maxCost = 0; g.maxTowers = 0; g.maxLvl = 1; g.pw = { strike: 0, freeze: 0, reboot: 0 }; g.eco = !!save.eco;
  g.outT = rand(20, 28); g.hackT = rand(18, 26); g.streak = 0; g.punch = 0; g.hitstop = 0;
  const keep = G; G = g;
  g.dist = computeDist();
  { // règles du monde : cases brûlantes (Fournaise) et portails (Flux de données)
    const th = worldOf(mi).style, Rn = mulberry(mi * 71 + 5);
    if (th === 'forge') {
      const cand = [];
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (m.g[y][x] === '#' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => '.SE'.includes((m.g[y + dy] || '')[x + dx] || '#'))) cand.push(x + y * COLS);
      g.hot = new Set(); for (let i = 0; i < 9 && cand.length; i++) g.hot.add(cand.splice(Math.floor(Rn() * cand.length), 1)[0]);
    }
    if (th === 'data') {
      g.portals = []; g.portalOf = new Map();
      for (const r of m.routes) if (r.length >= 18 && !g.portalOf.has(r)) { const i = Math.floor(r.length * .35), p = { route: r, i, j: Math.min(r.length - 5, i + 7) }; g.portals.push(p); g.portalOf.set(r, p); }
    }
  }
  g.bg = buildBG(mi, 64, 6); g.bgM = 6;
  for (const tr of m.traces) { tr.pts = tr; tr.lens = []; tr.len = 0; for (let i = 0; i < tr.length - 1; i++) { const l = Math.hypot(tr[i + 1][0] - tr[i][0], tr[i + 1][1] - tr[i][1]) || .01; tr.lens.push(l); tr.len += l; } }
  g.pulses = [];
  for (let i = 0; i < 34; i++) g.pulses.push({ tr: Math.floor(Math.random() * m.traces.length), d: Math.random() * 6, spd: rand(1.5, 4), col: Math.random() < .7 ? m.acc : '#ffffff' });
  g.boardPath = new Path2D();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!'.SE'.includes(m.g[y][x])) g.boardPath.rect(x, y, 1, 1);
  g.th = worldOf(mi).style;
  g.bots = [];
  for (let k = 0, tries = 0; k < (['pcb', 'rack', 'data'].includes(g.th) ? 7 : 0) && tries < 200; tries++) {
    const x = Math.floor(Math.random() * COLS), y = Math.floor(Math.random() * ROWS);
    if (m.g[y][x] !== '#') continue;
    g.bots.push({ x: x + .5, y: y + .5, tx: x, ty: y, a: 0, spd: rand(.5, .9), wait: rand(0, 2), ph: Math.random() * 9, col: ['#ffd740', '#80d8ff', '#ff80ab', '#b9f6ca'][k % 4] }); k++;
  }
  g.amb = [];
  for (let i = 0; i < 45; i++) g.amb.push({ x: Math.random() * COLS, y: Math.random() * ROWS, ph: Math.random() * 9, spd: rand(.3, 1), s: rand(.5, 1), c: Math.random() < .5 ? '0' : '1' });
  // calque des cratères laissés par les virus détruits (permanent, s'estompe lentement)
  g.scar = document.createElement('canvas'); g.scar.width = COLS * 32; g.scar.height = ROWS * 32;
  g.scarG = g.scar.getContext('2d'); g.scarG.setTransform(32, 0, 0, 32, 0, 0);
  g.flow = []; const seen = new Set();
  for (const r of m.routes) for (let i = 0; i < r.length - 1; i++) {
    const [x, y] = r[i], [nx, ny] = r[i + 1], key = x + ',' + y + ',' + (nx - x) + ',' + (ny - y);
    if (seen.has(key)) continue; seen.add(key);
    g.flow.push({ x, y, a: Math.atan2(ny - y, nx - x), d: r.length - 1 - i });
  }
  G = keep;
  return g;
}
function startMap(mi, opts) {
  opts = opts || (curMode === 'endless' ? { endless: true } : {});
  G = newGame(mi, false, opts); G.maxLives = G.lives;
  L.zoom = 1; L.vx = COLS / 2; L.vy = ROWS / 2;
  buildTowerBar(); closePopup(); selectTool(unlockedT('pulse') ? 'pulse' : G.allowed ? G.allowed[0] : null, true);
  if (!save.tuto && mi === 0 && !opts.endless && !opts.daily) { G.tuto = 0; G.tool = null; document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('sel')); towerInfo(); G.tutoTile = bestTile(); }
  const W0 = worldOf(mi), pn = $('#panel');
  pn.style.setProperty('--pa', W0.panel[0]); pn.style.setProperty('--pb', W0.panel[1]); pn.style.setProperty('--pc', W0.panel[2]);
  setState('play');
  updatePanel(true);
  const rule = RULES[W0.style];
  G.banner = { t: opts.daily ? 'DÉFI DU JOUR' : opts.endless ? 'MODE INFINI' : W0.name.toUpperCase(), sub: opts.daily ? (DMODS.find(x => x.id === G.mod) || {}).name + ' · ' + MAPS[mi].name : 'Monde ' + (WORLDS.indexOf(W0) + 1) + ' · ' + MAPS[mi].name, life: 2.6, max: 2.6 };
  toast(G.tuto !== undefined ? 'Bienvenue dans Virus Défense !' : '🌍 Règle du monde · ' + rule.name + ' : ' + rule.desc);
  updatePowers(); tutoTick();
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
  const t = { id: uid++, mode: 'first', type, x: tx, y: ty, lvl: 1, cd: 0, born: G.time, upT: -9, recoil: 0, ang: -Math.PI / 2 + rand(-1, 1), invested: cost, kills: 0, dmg: 0, st: tStats(type, 1), boost: 1, rateB: 0 };
  if (G.hot && G.hot.has(tx + ty * COLS)) { t.hot = true; t.heatT = rand(8, 15); }
  G.towers.push(t); G.towerAt[ty][tx] = t; recalcBoosts(); G.covDirty = true;
  if (!G.demo) {
    G.typesUsed.add(type); G.maxCost = Math.max(G.maxCost, cost); G.maxTowers = Math.max(G.maxTowers, G.towers.length);
    G.undo = { t, until: G.time + 6 }; stat('built'); stat('built_' + type);
  }
  for (const b of G.bots) if (b.tx === tx && b.ty === ty) { b.wait = 0; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = tx + ox, ny = ty + oy; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && G.m.g[ny][nx] === '#' && !G.towerAt[ny][nx]) { b.tx = nx; b.ty = ny; break; } } }
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; G.parts.push({ smoke: true, x: tx + .5 + Math.cos(a) * .35, y: ty + .5 + Math.sin(a) * .35, vx: Math.cos(a) * .9, vy: Math.sin(a) * .9, life: .5, max: .5, size: .12 }); }
  G.fx.push({ kind: 'ring', x: tx + .5, y: ty + .5, r: .9, col: 'rgba(255,255,255,.7)', life: .3, max: .3, delay: .25 });
  sfx('build'); vibe(10); updatePanel();
}
function upgradeTower(t, path) {
  if (t.lvl >= maxLvl(t.type)) { if (t.lvl < TMAX) { toast('Niveau 5 verrouillé : fais la recherche niv. 2 de cette tourelle dans la Boutique 🛒'); sfx('err'); } return; }
  const c = upCost(t);
  if (G.cash < c) { toast('Pas assez de crédits'); sfx('err'); return; }
  if (t.lvl === TMAX - 1) { t.path = path === 1 ? 1 : path === 0 ? 0 : (G.demo ? Math.floor(Math.random() * 2) : 0); }
  G.cash -= c; t.invested += c; t.lvl++; t.st = tStats(t.type, t.lvl, t.path); t.upT = G.time; recalcBoosts(); G.covDirty = true;
  if (G.undo && G.undo.t === t) G.undo = null;
  if (!G.demo) {
    G.maxLvl = Math.max(G.maxLvl, t.lvl); stat('upgrades');
    if (t.lvl >= TMAX) { stat('lvl5'); const pk = 'path_' + t.type + t.path; if (!save.stats[pk]) { save.stats[pk] = 1; } if (save.stats['path_' + t.type + '0'] && save.stats['path_' + t.type + '1']) unlockAch('paths'); }
  }
  for (let i = 0; i < 14; i++) { const q = part(t.x + .5, t.y + .5, i % 2 ? '#fff59d' : '#ffd740', 2.5); q.vy -= 2; q.life = q.max = .8; G.parts.push(q); }
  G.texts.push({ x: t.x + .5, y: t.y + .1, t: t.lvl >= TMAX ? '★ ' + PATHS[t.type][t.path || 0][0].toUpperCase() + ' !' : 'NIV. ' + t.lvl + ' !', col: t.lvl >= TMAX ? PATHCOL[t.path || 0] : '#ffd740', life: 1.2, big: true });
  sfx('up'); vibe(15); updatePanel(); fillPopup();
}
function sellTower(t, refund) {
  if (G.mod === 'nosell' && !refund) { toast('Défi du jour : la revente est interdite !'); sfx('err'); return; }
  const r = refund ? t.invested : Math.floor(t.invested * sellRate());
  if (!refund) G.sold = true;
  if (G.undo && G.undo.t === t) G.undo = null;
  G.covDirty = true;
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
  if (wd.type === 'boss' || wd.wboss) for (let i = 0; i < 6; i++) G.queue.push({ type: 'bug', t: i * .6 + .5, wave: G.wave });
  G.queue.sort((a, b) => a.t - b.t);
  G.spawnT = 0;
  const bonus = 2 + Math.floor(G.wave / 3) + (early ? 3 : 0) + gup('wave');
  G.cash += bonus; G.score += bonus * 10;
  for (const t of G.towers) if (t.type === 'miner') { const gn = t.st.gain + (t.st.bank ? Math.min(60, Math.floor(G.cash * .06)) : 0); G.cash += gn; G.texts.push({ x: t.x + .5, y: t.y + .2, t: '+' + gn, col: '#ffd740', life: 1.2, big: true }); coinFly(t.x + .5, t.y + .5, 2); }
  G.countdown = -1; fadeCraters(.12);
  const bw = wd.type === 'boss' || wd.wboss;
  if (bw) { G.alarm = wd.wboss ? 3.2 : 2.4; G.shake = wd.wboss ? 10 : 6; sfx('alarm'); }
  G.banner = { t: wd.wboss ? '☠ ' + et.name.toUpperCase() + ' ☠' : (wd.type === 'boss' ? '⚠ MÉGA-VIRUS ⚠' : 'VAGUE ' + G.wave), sub: wd.wboss ? 'Boss du monde · ' + EDESC[wd.type].replace(/^BOSS[^.]*\. /, '') : wd.n + ' × ' + et.name + (wd.type2 ? ' + ' + wd.n2 + ' × ' + ETYPES[wd.type2].name : ''), life: wd.wboss ? 3.2 : 2.2, max: wd.wboss ? 3.2 : 2.2, boss: bw };
  toast((bw ? '⚠ ' : '') + 'Vague ' + G.wave + ' : ' + wd.n + ' × ' + et.name + (early ? ' · bonus anticipé +' + bonus : ' · +' + bonus + ' crédits'));
  sfx('wave'); updatePanel();
}
// fait apparaître un virus à l'endroit d'un autre (division, renforts, clone…)
function spawnFrom(type, e, hpMul) {
  if (G.enemies.length > 400) return null;
  spawnEnemy(type, e.wave || G.wave, true);
  const c = G.enemies[G.enemies.length - 1];
  Object.assign(c, { route: e.route, ri: e.ri, tx: e.tx, ty: e.ty, x: e.x + rand(-.2, .2), y: e.y + rand(-.2, .2), age: .2 });
  c.hp = c.max = c.max * (hpMul || 1);
  return c;
}
function spawnEnemy(type, wave, quiet) {
  const d = ETYPES[type], ri = quiet ? 0 : G.nextStart++ % G.m.routes.length, route = G.m.routes[ri], s = route[0];
  const hp = d.hp * hpScale(wave) * G.d.hp;
  const e = {
    id: uid++, type, x: s[0] + .5, y: s[1] + .5, tx: s[0], ty: s[1], hp, max: hp, spd: d.spd, r: d.r, col: d.col,
    rew: Math.max(1, Math.round(d.rew * rewScale(wave) * (1 + .06 * gup('rew')) * (G.mod === 'rich' ? .7 : 1))), armor: (d.armor || 0) * (1 + wave * .03), fly: !!d.fly, regen: d.regen || 0,
    lives: d.lives || 1, wave, slowT: 0, slowF: 1, ang: 0, anim: Math.random() * 10, prog: 0, dead: false, route, ri: 0
  };
  e.hp = e.max = hp * (1 + G.mi * .025);
  if (G.th === 'ice') e.spd *= 1.2;
  if (G.mod === 'fast') e.spd *= 1.25;
  if (G.mod === 'armored') e.armor += 3;
  if (G.d.spd) e.spd *= G.d.spd;
  if (G.endless && wave > G.m.waves) { const k = wave - G.m.waves; e.hp = e.max = e.max * (1 + k * .06); e.spd *= 1 + Math.min(.5, k * .01); }
  e.spd0 = e.spd; if (d.boss === 2) e.abT = 4;
  if (!G.demo && !(save.seen || {})[type]) { save.seen = save.seen || {}; save.seen[type] = 1; persist(); if (d.world !== undefined || d.boss) toast('📖 Nouveau virus : ' + d.name + ' — ' + EDESC[type]); }
  if (G.fx.length < 300 && !quiet) G.fx.push({ kind: 'ring', x: s[0] + .5, y: s[1] + .5, r: .9, col: '#ff5252', life: .35, max: .35 });
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
// cratère : trou noirci au bord irrégulier, rebord éclairé, résidus du virus et petits débris
function crater(x, y, r, col) {
  const g = G && G.scarG; if (!g) return;
  const s = Math.max(.12, r) * rand(.9, 1.25), n = 16, ph = Math.random() * 9, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = .82 + .14 * Math.sin(a * 3 + ph) + .1 * Math.random(); pts.push([x + Math.cos(a) * s * k, y + Math.sin(a) * s * k]); }
  const path = (dx, dy) => { g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy)); g.closePath(); };
  let gr = g.createRadialGradient(x, y, s * .5, x, y, s * 2.1); gr.addColorStop(0, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, s * 2.1, 0, TAU); g.fill();
  for (let i = 0; i < 7; i++) { // éclaboussures noires en étoile
    const a = Math.random() * TAU, l = s * rand(1.2, 1.9);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = s * rand(.08, .16); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x + Math.cos(a) * s * .7, y + Math.sin(a) * s * .7); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  path(-s * .07, -s * .07); g.fillStyle = 'rgba(255,235,200,.16)'; g.fill(); // rebord éclairé
  gr = g.createRadialGradient(x + s * .12, y + s * .12, 0, x, y, s); gr.addColorStop(0, 'rgba(0,0,0,.82)'); gr.addColorStop(.7, 'rgba(15,10,8,.7)'); gr.addColorStop(1, 'rgba(40,28,20,.55)');
  path(0, 0); g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = s * .08; g.stroke();
  const rc = rgbaA(col);
  for (let i = 0; i < 4; i++) { const a = Math.random() * TAU, d = s * rand(.2, 1.3); g.fillStyle = rc.replace('A', .28); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s * rand(.08, .2), 0, TAU); g.fill(); }
  for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, d = s * rand(1.1, 2); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, s * .09, s * .09); }
}
function fadeCraters(k) {
  const g = G && G.scarG; if (!g) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,' + k + ')'; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
}
function hurt(e, dmg, pierce) {
  if (e.dead || e.reviveT > 0) return;
  e.noHit = 0;
  const src = G.shooter;
  if (e.sh > 0) { const a = Math.min(e.sh, dmg); e.sh -= a; dmg -= a; e.shHit = .15; if (src) src.dmg = (src.dmg || 0) + a; if (dmg <= 0) return; }
  const real = Math.min(Math.max(0, e.hp), pierce ? dmg : Math.max(dmg - e.armor, dmg * .25));
  e.hp -= real; if (src) src.dmg = (src.dmg || 0) + real;
  e.hit = .08;
  const d0 = ETYPES[e.type];
  if (d0.clone && !e.cloned && e.hp > 0 && e.hp < e.max * .5) { e.cloned = true; const c = spawnFrom(e.type, e, 1); if (c) { c.hp = e.hp; c.max = e.max; c.cloned = true; c.ri = Math.max(0, e.ri - 2); const p = e.route[c.ri]; c.x = p[0] + .5; c.y = p[1] + .5; G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: .6, col: '#ff2bd6', life: .3, max: .3 }); } }
  if (d0.trojan) { const k = e.hp / e.max; while ((e.troj || 0) < 3 && k < 1 - ((e.troj || 0) + 1) * .25) { e.troj = (e.troj || 0) + 1; for (let i = 0; i < 5; i++) spawnFrom('packet', e, .6); G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 1.2, col: '#18ffff', life: .4, max: .4 }); } }
  if (e.hp <= 0 && d0.revive && !e.revived) { e.revived = true; e.hp = e.max * .45; e.reviveT = 1.4; e.sh = 0; G.texts.push({ x: e.x, y: e.y - .3, t: '☠ se relève…', col: '#9ccc65', life: 1 }); return; }
  if (e.hp <= 0) {
    e.dead = true; G.kills++; if (G.shooter) G.shooter.kills = (G.shooter.kills || 0) + 1;
    G.cash += e.rew; G.score += e.rew * 10;
    floatText(e.x, e.y - .3, '+' + e.rew, '#e6ee5a');
    const n = isBoss(e) ? (G.eco ? 20 : 40) : (G.eco ? 4 : 8);
    for (let i = 0; i < n; i++) G.parts.push(part(e.x, e.y, i % 3 ? e.col : '#ffffff', isBoss(e) ? 4 : 2.5));
    G.fx.push({ kind: 'splat', x: e.x, y: e.y, r: e.r * 1.7, life: 10, max: 10, col: rgbaA(e.col), seed: Math.random() * .97 + .013 });
    if (!e.fly) crater(e.x, e.y, e.r * (isBoss(e) ? .9 : 1.15), e.col);
    G.fx.push({ kind: 'pop', x: e.x, y: e.y, r: e.r, col: e.col, life: .28, max: .28 });
    for (let i = 0; i < 6; i++) { const q = part(e.x, e.y, e.col, 3.2); q.size = e.r * rand(.25, .45); q.goo = true; q.life = q.max = rand(.35, .55); G.parts.push(q); }
    coinFly(e.x, e.y, Math.min(4, e.rew));
    smoke(e.x, e.y, isBoss(e) ? 14 : 3, e.r * .7);
    if (isBoss(e)) { sfx('boom'); vibe(200); G.shake = 14; G.hitstop = .14; G.punch = .06; } else sfx('pop', G.streak);
    onKill(e);
    if (ETYPES[e.type].split) for (let k = 0; k < 2; k++) { // le diviseur se sépare en deux mini-virus
      spawnEnemy('mini', e.wave || G.wave);
      const m2 = G.enemies[G.enemies.length - 1];
      Object.assign(m2, { route: e.route, ri: e.ri, tx: e.tx, ty: e.ty, x: e.x + rand(-.15, .15), y: e.y + rand(-.15, .15), age: .2 });
    }
  }
}
function onKill(e) {
  const d = ETYPES[e.type];
  if (d.chill && !d.boss) { // le cryovirus gèle la tourelle la plus proche en mourant
    let best = null, bd = 2.2; for (const t of G.towers) { const dd = Math.hypot(t.x + .5 - e.x, t.y + .5 - e.y); if (dd < bd) { bd = dd; best = t; } }
    if (best) { best.offT = Math.max(best.offT || 0, 2); best.iced = 2; G.fx.push({ kind: 'ring', x: best.x + .5, y: best.y + .5, r: .8, col: '#b3e5fc', life: .4, max: .4 }); }
  }
  if (e.type === 'kernel') for (let i = 0; i < 4; i++) { const w = spawnFrom('worm', e, 1); if (w) { w.hp = w.max = e.max * .07; w.r = .3; } }
  if (G.demo) return;
  G.streak = (G.streak || 0) + 1; G.streakT = .9;
  if ([10, 25, 50, 100, 200].includes(G.streak)) {
    const b = Math.floor(G.streak / 5); G.cash += b;
    G.texts.push({ x: e.x, y: e.y - .6, t: 'SÉRIE ×' + G.streak + ' ! +' + b, col: '#ff4081', life: 1.4, big: true }); sfx('up');
    if (G.streak >= 50) unlockAch('streak50');
  }
  stat('kills'); stat('k_' + e.type);
  if (d.boss === 2) { stat('bossKills'); save.stats.bossSet = save.stats.bossSet || {}; save.stats.bossSet[e.type] = 1; }
}
// capacités spéciales des boss de monde
function bossAbility(e, dt) {
  const d = ETYPES[e.type];
  if (d.hack) e.hp = Math.min(e.max, e.hp + e.max * .012 * dt);
  e.abT -= dt; if (e.abT > 0) return;
  if (d.heatwave) { e.abT = 6; for (const t of G.towers) if (Math.hypot(t.x + .5 - e.x, t.y + .5 - e.y) < 2.4) { t.offT = Math.max(t.offT || 0, 1.6); smoke(t.x + .5, t.y + .5, 2, .2); } G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 2.4, col: 'rgba(255,90,0,.6)', life: .5, max: .5 }); G.shake = Math.max(G.shake, 3); }
  else if (d.summon) { e.abT = 2.6; for (let i = 0; i < 2; i++) spawnFrom('swarm', e, 1.5); G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 1, col: '#ffab00', life: .3, max: .3 }); }
  else if (d.chill) { e.abT = 4.5; for (const t of G.towers) if (Math.hypot(t.x + .5 - e.x, t.y + .5 - e.y) < 1.9) { t.offT = Math.max(t.offT || 0, 1.8); t.iced = 1.8; } G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 1.9, col: 'rgba(180,240,255,.6)', life: .5, max: .5 }); }
  else if (d.hack) { e.abT = 7; hackTowers(2); }
  else e.abT = 99;
}
function hackTowers(n) {
  if (G.demo) return;
  const c = G.towers.filter(t => !(t.hacked > 0));
  for (let i = 0; i < n && c.length; i++) {
    const t = c.splice(Math.floor(Math.random() * c.length), 1)[0]; t.hacked = 8;
    G.fx.push({ kind: 'ring', x: t.x + .5, y: t.y + .5, r: .9, col: '#ff2bd6', life: .5, max: .5 });
  }
  if (!G.hackTold) { G.hackTold = true; toast('🔓 Tourelle piratée ! Touche-la pour la réparer.'); }
  sfx('err');
}
function enemyProgress(e) {
  return (e.route.length - 1 - e.ri) - 1 + Math.hypot(e.tx + .5 - e.x, e.ty + .5 - e.y);
}
function findTarget(t) {
  const cx = t.x + .5, cy = t.y + .5, r2 = t.st.range * t.st.range, ground = TOWERS[t.type].ground;
  let best = null, bp = Infinity;
  for (const e of G.enemies) {
    if (e.dead || (ground && e.fly) || e.phased || e.reviveT > 0) continue;
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
    let rb = 0;
    for (const o of G.towers) if (o.type === 'boost' && o !== t && Math.hypot(o.x - t.x, o.y - t.y) <= o.st.range + .01) { b = Math.max(b, o.st.boost); rb = Math.max(rb, o.st.rateB || 0); }
    t.boost = (1 + b) * (t.hot ? 1.35 : 1); t.rateB = rb;
  }
}
// combinaisons entre tourelles
const COMBOS = {
  thermal: { name: 'Choc thermique', desc: 'le feu sur un virus gelé ou ralenti fait ×2 dégâts', col: '#ff9e80' },
  surge: { name: 'Surtension', desc: 'l\'éclair Tesla sur un virus gelé ou ralenti : ×1,5 dégâts et l\'étourdit', col: '#fff176' },
  melt: { name: 'Fusion', desc: 'le laser sur un virus en feu fait ×1,6 dégâts', col: '#ff8a80' },
  shatter: { name: 'Éclatement', desc: 'obus et missiles sur un virus congelé font ×2,5 dégâts', col: '#b3e5fc' }
};
function combo(e, k) {
  if (G.demo) return;
  if ((!e.comboT || G.time - e.comboT > .8) && G.time - (G.comboTxt || 0) > .2) { e.comboT = G.comboTxt = G.time; G.texts.push({ x: e.x, y: e.y - .45, t: COMBOS[k].name + ' !', col: COMBOS[k].col, life: .9 }); }
  save.combos = save.combos || {};
  if (!save.combos[k]) { save.combos[k] = 1; persist(); toast('🧪 Combinaison découverte : ' + COMBOS[k].name + ' — ' + COMBOS[k].desc); unlockAch('combo1'); if (Object.keys(save.combos).length >= 4) unlockAch('combo4'); }
}
const chilled = o => o.frozen > 0 || o.slowT > 0;
function fire(t, e) {
  const d = TOWERS[t.type], s = t.boost > 1 ? Object.assign({}, t.st, { dmg: t.st.dmg * t.boost }) : t.st, cx = t.x + .5, cy = t.y + .5;
  const mx = cx + Math.cos(t.ang) * .4, my = cy + Math.sin(t.ang) * .4;
  G.shooter = t;
  switch (d.proj) {
    case 'bullet': case 'shell': case 'ice': {
      const mk = tg => G.projs.push({ kind: d.proj, x: mx, y: my, tgt: tg, lx: tg.x, ly: tg.y, spd: d.spd, dmg: s.dmg, splash: s.splash, slow: s.slow, slowT: s.slowT, ground: d.ground, src: t, col: s.special ? '#ffe066' : d.col,
        pierce: s.special && t.type === 'gatling', stun: s.special && t.type === 'cannon' ? .45 : 0, freeze: s.special && t.type === 'frost' ? .2 : 0, incend: s.incend });
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
        if (dd <= s.range + o.r && da < .42) {
          if (ETYPES[o.type].fireproof) { hurt(o, s.dmg * .3, s.pierce); continue; }
          let dm = s.dmg; if (chilled(o)) { dm *= 2; combo(o, 'thermal'); }
          hurt(o, dm, s.pierce); o.burnT = 2; o.burnDps = Math.max(o.burnDps || 0, s.burn); o.burnSrc = t;
        }
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
      let x2 = e.x, y2 = e.y, bd = s.dmg;
      if (s.ramp) { t.rampK = t.lastTgt === e ? Math.min(3, (t.rampK || 1) + .35) : 1; t.lastTgt = e; bd *= t.rampK; }
      const zap = o => { let dm = bd; if (o.burnT > 0) { dm *= 1.6; combo(o, 'melt'); } hurt(o, dm); };
      if (s.special) { // traverse toute la ligne jusqu'au bout de la portée
        const a = Math.atan2(e.y - cy, e.x - cx); x2 = cx + Math.cos(a) * s.range; y2 = cy + Math.sin(a) * s.range;
        for (const o of G.enemies) if (!o.dead && segDist(o.x, o.y, mx, my, x2, y2) < o.r + .15) zap(o);
      } else zap(e);
      G.fx.push({ kind: 'beam', x1: mx, y1: my, x2, y2, col: s.special ? '#ffd740' : s.ramp ? (t.rampK > 2 ? '#ffffff' : '#ff9100') : d.col, life: .15, max: .15, w: .08 + t.lvl * .02 + (s.ramp ? (t.rampK - 1) * .05 : 0) });
      break;
    }
    case 'chain': {
      const surge = (o, dm) => { if (chilled(o)) { dm *= 1.5; o.stunT = Math.max(o.stunT || 0, .4); combo(o, 'surge'); } hurt(o, dm); };
      if (s.storm) { // tempête : frappe tous les virus à portée
        let n = 0;
        for (const o of G.enemies) { if (o.dead || o.phased || Math.hypot(o.x - cx, o.y - cy) > s.range) continue; surge(o, s.dmg * .75); if (n++ < 8) G.fx.push({ kind: 'chain', pts: [[cx, cy - .1], [o.x, o.y]], col: '#80d8ff', life: .18, max: .18 }); }
        break;
      }
      const hit = new Set([e]); let cur = e, dmg = s.dmg; const pts = [[cx, cy - .1], [e.x, e.y]];
      surge(e, dmg); if (s.special) e.stunT = .3;
      for (let i = 1; i < s.chain; i++) {
        let nb = null, nd = 1.8;
        for (const o of G.enemies) { if (o.dead || hit.has(o)) continue; const dd = Math.hypot(o.x - cur.x, o.y - cur.y); if (dd < nd) { nd = dd; nb = o; } }
        if (!nb) break;
        dmg *= .85; surge(nb, dmg); if (s.special) nb.stunT = .3; hit.add(nb); cur = nb; pts.push([nb.x, nb.y]);
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
        let dm = p.dmg;
        if (e.frozen > 0 && (p.kind === 'shell' || p.kind === 'missile')) { dm *= 2.5; combo(e, 'shatter'); }
        hurt(e, dm, p.pierce);
        if (p.stun) e.stunT = Math.max(e.stunT || 0, p.stun);
        const ns = ETYPES[e.type].noslow, ik = G.th === 'ice' ? 1.5 : 1;
        if (p.freeze && !ns && Math.random() < p.freeze) { e.stunT = Math.max(e.stunT || 0, 1.1 * ik); e.frozen = 1.1 * ik; }
        if (p.slow && !ns) { e.slowF = e.slowT > 0 ? Math.min(e.slowF, p.slow) : p.slow; e.slowT = Math.max(e.slowT, p.slowT * ik); }
      }
    }
    G.fx.push({ kind: 'ring', x: p.x, y: p.y, r: p.splash, col: p.col, life: .25, max: .25 });
  } else if (p.tgt && !p.tgt.dead) {
    hurt(p.tgt, p.dmg, p.pierce);
    if (p.incend && !p.tgt.dead && !ETYPES[p.tgt.type].fireproof) { p.tgt.burnT = 1.5; p.tgt.burnDps = Math.max(p.tgt.burnDps || 0, p.dmg * 2); p.tgt.burnSrc = p.src; }
  }
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
  // règles du monde
  if (!G.demo && (G.enemies.length || G.queue.length)) {
    if (G.th === 'rack') {
      G.outT -= dt;
      if (G.outT <= 3 && !G.outZ) { const tw = G.towers[Math.floor(Math.random() * G.towers.length)]; G.outZ = { x: tw ? tw.x : rand(3, COLS - 3) | 0, y: tw ? tw.y : rand(3, ROWS - 3) | 0, on: 0 }; toast('⚡ Coupure de courant imminente !'); }
      if (G.outT <= 0) { G.outT = rand(26, 34); G.outZ.on = 5; for (const t of G.towers) if (Math.abs(t.x - G.outZ.x) <= 2 && Math.abs(t.y - G.outZ.y) <= 2) t.offT = Math.max(t.offT || 0, 5); sfx('err'); }
    }
    if (G.th === 'neon') { G.hackT -= dt; if (G.hackT <= 0) { G.hackT = rand(22, 30); if (G.towers.length) hackTowers(G.wave > 15 ? 2 : 1); } }
  }
  if (G.outZ && G.outZ.on > 0) { G.outZ.on -= dt; if (G.outZ.on <= 0) G.outZ = null; }
  if (G.pw) for (const k in G.pw) if (G.pw[k] > 0) G.pw[k] -= dt;
  if (G.streakT > 0) { G.streakT -= dt; if (G.streakT <= 0) G.streak = 0; }
  if (G.punch) G.punch *= Math.exp(-dt * 8);
  if (G.undo && G.time > G.undo.until) G.undo = null;
  // virus
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.anim += dt; e.age = (e.age || 0) + dt; e.hit = Math.max(0, (e.hit || 0) - dt);
    if (e.reviveT > 0) { e.reviveT -= dt; continue; }
    if (ETYPES[e.type].worm) e.spd = e.spd0 * (1 + (1 - e.hp / e.max) * 1.3);
    if (e.abT !== undefined) bossAbility(e, dt);
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
    if (e.regen && e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max * e.regen * dt);
    e.noHit = (e.noHit || 0) + dt; e.shHit = Math.max(0, (e.shHit || 0) - dt);
    if (e.shMax && e.noHit > 2.5) e.sh = Math.min(e.shMax, e.sh + e.shMax * .35 * dt);
    if (e.phaseT !== undefined) { e.phaseT -= dt; if (e.phaseT <= 0) { e.phased = !e.phased; e.phaseT = e.phased ? 1.3 : rand(2.2, 3.2); } }
    if (ETYPES[e.type].heal) { e.healT = (e.healT || 0) - dt; if (e.healT <= 0) { e.healT = 1; for (const o of G.enemies) if (!o.dead && o !== e && o.hp < o.max && Math.hypot(o.x - e.x, o.y - e.y) < 1.6) { o.hp = Math.min(o.max, o.hp + o.max * .1); G.texts.push({ x: o.x, y: o.y - .3, t: '+', col: '#76ff03', life: .6 }); } G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 1.6, col: 'rgba(120,255,140,.5)', life: .4, max: .4 }); } }
    if (e.type === 'giant' && Math.random() < dt * 4) G.parts.push({ smoke: true, x: e.x + rand(-.2, .2), y: e.y + rand(-.2, .2), vx: 0, vy: 0, life: .6, max: .6, size: .12 });
    if (e.jumpT !== undefined && !(e.stunT > 0)) { e.jumpT -= dt; if (e.jumpT <= 0) { e.jumpT = rand(2.5, 3.5); const to = Math.min(e.route.length - 2, e.ri + 4); if (to > e.ri) { G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: .5, col: '#b2ff59', life: .3, max: .3 }); e.ri = to; const p2 = e.route[to]; e.x = p2[0] + .5; e.y = p2[1] + .5; G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: .5, col: '#b2ff59', life: .3, max: .3 }); } } }
    if (e.frozen > 0) e.frozen -= dt;
    if (e.burnT > 0) { e.burnT -= dt; G.shooter = e.burnSrc || null; hurt(e, e.burnDps * dt, true); e.hit = 0; if (Math.random() < dt * 12) G.parts.push({ fire: true, x: e.x + rand(-e.r, e.r) * .6, y: e.y + rand(-e.r, e.r) * .6, vx: rand(-.2, .2), vy: rand(-.6, -.2), life: .35, max: .35, size: rand(.06, .11), col: '#ff9100' }); if (e.dead) continue; }
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
          const pt = G.portalOf && !e.ported && G.portalOf.get(e.route);
          if (pt && e.ri === pt.i) { // portail : saut plus loin dans le couloir
            e.ported = true; G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: .7, col: '#40c4ff', life: .3, max: .3 });
            e.ri = pt.j; const p2 = e.route[pt.j]; e.x = p2[0] + .5; e.y = p2[1] + .5; e.tx = p2[0]; e.ty = p2[1];
            G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: .7, col: '#ff9100', life: .3, max: .3 });
          }
        } else {
          e.x += dx / d * mv; e.y += dy / d * mv; mv = 0;
          const ta = Math.atan2(dy, dx); e.ang += Math.atan2(Math.sin(ta - e.ang), Math.cos(ta - e.ang)) * Math.min(1, dt * 14);
        }
      }
    }
    e.prog = enemyProgress(e);
    // sécurité : un virus bloqué au même endroit trop longtemps est retiré (sinon la vague suivante ne partirait jamais)
    if (e.ri !== e.lastRi) { e.lastRi = e.ri; e.stuckT = 0; } else if (!(e.stunT > 0) && !(e.reviveT > 0)) { e.stuckT = (e.stuckT || 0) + dt; if (e.stuckT > 25 || !isFinite(e.x + e.y + e.hp)) { e.dead = true; } }
  }
  // tourelles
  for (const t of G.towers) {
    t.cd -= dt; t.flash = Math.max(0, (t.flash || 0) - dt);
    if (t.hot && (G.enemies.length || G.queue.length)) { t.heatT -= dt; if (t.heatT <= 0) { t.heatT = 15; t.offT = Math.max(t.offT || 0, 2); smoke(t.x + .5, t.y + .5, 4, .2); } }
    if (t.iced > 0) t.iced -= dt;
    if (t.offT > 0) { t.offT -= dt; continue; }
    if (t.hacked > 0) { t.hacked -= dt; continue; }
    if (t.type === 'boost' || t.type === 'miner') { t.ang += dt * (t.type === 'miner' ? 3 : 1); continue; }
    const e = findTarget(t);
    if (e) {
      const ta = Math.atan2(e.y - (t.y + .5), e.x - (t.x + .5));
      t.ang += Math.atan2(Math.sin(ta - t.ang), Math.cos(ta - t.ang)) * Math.min(1, dt * 16);
      if (t.cd <= 0) { fire(t, e); t.cd = 1 / (t.st.rate * (1 + (t.rateB || 0))); t.flash = .07; }
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
  const pmax = G.eco ? 160 : 500; if (G.parts.length > pmax) G.parts.splice(0, G.parts.length - pmax);
  // fin de vague / victoire
  const clear = !G.queue.length && !G.enemies.length;
  if (clear && G.wave >= G.total && !G.over) { endGame(true); return; }
  if (clear && G.wave > 0 && G.wave < G.total && save.autoWave && !(G.tuto !== undefined && G.tuto < 5)) {
    if (G.countdown < 0) G.countdown = 8;
    G.countdown -= dt;
    if (G.countdown <= 0) startWave();
  }
}
function leak(e) {
  e.dead = true; G.shake = Math.max(G.shake, isBoss(e) ? 10 : 4);
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
  const px = Math.max(16, Math.round(L.s * DPR / 4) * 4), key = type + lvl + ':' + px;
  let c = baseCache[key];
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(px * 1.2); const g = c.getContext('2d'); g.setTransform(px, 0, 0, px, px * .55, px * .55); drawTowerBase(g, type, lvl); baseCache[key] = c; }
  return c;
}
function drawTower(c, type, lvl, ang, time, flash, cached) {
  if (cached) c.drawImage(towerBase(type, lvl), -.55, -.55, 1.2, 1.2); else drawTowerBase(c, type, lvl);
  drawTurret(c, type, lvl, ang, time, flash);
}
// ---- style « jouet brillant » : contours épais, couleurs vives, reflets ----
const OUT = '#1b1230';
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  c.closePath(); c.fillStyle = '#ffd600'; c.fill(); c.lineWidth = r * .25; c.strokeStyle = OUT; c.stroke();
}
// boule brillante avec contour et reflet
function gball(c, x, y, r, col, lx, ly) {
  const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .1, x, y, r);
  g.addColorStop(0, shade(col, .55)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, -.45));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.lineWidth = r * .16; c.strokeStyle = OUT; c.stroke();
  c.save(); c.translate(x + lx * r * .42, y + ly * r * .42); c.rotate(Math.atan2(ly, lx) + Math.PI / 2);
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(0, 0, r * .42, r * .2, 0, 0, TAU); c.fill(); c.restore();
}
// canon arrondi brillant (axe x)
function gbar(c, x, y, w, h, col) {
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
  if (e.type === 'ghost' || e.type === 'aicore') ctx.globalAlpha *= e.phased ? .22 : .88;
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
    case 'worm': case 'kernel': { // ver segmenté
      const big = e.type === 'kernel', segs = big ? 5 : 3;
      for (let i = segs; i >= 1; i--) {
        const sx = -r * (.75 * i), sy = Math.sin(t * 8 - i * 1.1) * r * .25, rs = r * (1 - i * (big ? .1 : .16));
        ctx.save(); ctx.translate(sx, sy); glossBody(rs, i % 2 ? shade(d.col, -.15) : col, lx, ly, lw * .8, circle(rs)); ctx.restore();
      }
      if (big) for (let i = 0; i < 8; i++) { const q = i * TAU / 8 + t; ctx.fillStyle = '#ffd600'; ctx.beginPath(); ctx.arc(Math.cos(q) * r * 1.12, Math.sin(q) * r * 1.12, r * .12, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .6; ctx.strokeStyle = OUT; ctx.stroke(); }
      glossBody(r, col, lx, ly, lw, circle(r));
      shine(r, lx, ly);
      face(e, r, lw, big ? { three: true, pupil: '#1b5e20', mw: .45, teeth: 4, er: .22 } : { x: .4, er: .26, mw: .3, teeth: 2 });
      break;
    }
    case 'ember': case 'magma': { // boule de feu / titan de lave
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(0, 0, r * 1.9, 'rgba(255,100,0,.45)'); ctx.restore();
      for (let i = 0; i < 7; i++) { const q = i * TAU / 7 + t * 3, fl = 1.25 + .2 * Math.sin(t * 15 + i * 2); ctx.fillStyle = i % 2 ? '#ffab00' : '#ff3d00'; ctx.beginPath(); ctx.moveTo(Math.cos(q - .35) * r * .8, Math.sin(q - .35) * r * .8); ctx.quadraticCurveTo(Math.cos(q) * r * fl * 1.2, Math.sin(q) * r * fl * 1.2, Math.cos(q + .35) * r * .8, Math.sin(q + .35) * r * .8); ctx.fill(); }
      glossBody(r, e.type === 'magma' ? '#4e1a0a' : col, lx, ly, lw, blobPath(r, 6, .07, t * 2));
      ctx.strokeStyle = '#ffab00'; ctx.lineWidth = lw * .7; ctx.beginPath();
      for (let i = 0; i < 5; i++) { const q = (e.id * 1.7 + i * 1.3) % TAU; ctx.moveTo(Math.cos(q) * r * .2, Math.sin(q) * r * .2); ctx.lineTo(Math.cos(q + .3) * r * .55, Math.sin(q + .3) * r * .55); ctx.lineTo(Math.cos(q) * r * .85, Math.sin(q) * r * .85); }
      ctx.stroke();
      face(e, r, lw, e.type === 'magma' ? { three: true, pupil: '#ff3d00', mw: .5, teeth: 5, er: .2 } : { er: .26, pupil: '#bf360c' });
      break;
    }
    case 'packet': { // paquet de données (cube avec flèches)
      ctx.strokeStyle = rgbaA(d.col).replace('A', .5); ctx.lineWidth = lw; for (const o of [-.4, 0, .4]) { ctx.beginPath(); ctx.moveTo(-r * 1.2, o * r); ctx.lineTo(-r * (2 + Math.abs(o)), o * r); ctx.stroke(); }
      glossBody(r, col, lx, ly, lw, () => { rr(ctx, -r, -r * .85, r * 2, r * 1.7, r * .3); });
      ctx.fillStyle = OUT; ctx.font = '900 ' + (r * .9) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('»', -r * .35, r * .05);
      face(e, r, lw, { x: .5, sp: .3, er: .2, mw: .18, mouth: false });
      break;
    }
    case 'zombie': { // zombie recousu
      if (e.reviveT > 0) { ctx.globalAlpha *= .45 + .3 * Math.sin(t * 20); }
      legs(e, r, lw, 2, 1.1, '#558b2f');
      glossBody(r, col, lx, ly, lw, blobPath(r, 4, .08, e.id));
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * .5; ctx.beginPath(); ctx.moveTo(-r * .6, -r * .5); ctx.lineTo(r * .1, r * .3); for (let i = 0; i < 4; i++) { const u = i / 3, x0 = -r * .6 + u * r * .7, y0 = -r * .5 + u * r * .8; ctx.moveTo(x0 - r * .1, y0 + r * .08); ctx.lineTo(x0 + r * .1, y0 - r * .08); } ctx.stroke();
      ctx.fillStyle = '#eeeeee'; ctx.save(); ctx.rotate(.6); ctx.fillRect(-r * .7, r * .15, r * .9, r * .22); ctx.restore();
      face(e, r, lw, { er: .24, pupil: '#c62828', mw: .3, teeth: 2 });
      break;
    }
    case 'cryo': case 'glacier': { // cristal de glace
      const big = e.type === 'glacier';
      for (let i = 0; i < 6; i++) { const q = i * TAU / 6 + (big ? t * .3 : 0); ctx.save(); ctx.rotate(q); ctx.fillStyle = '#e1f5fe'; ctx.beginPath(); ctx.moveTo(r * .7, -r * .14); ctx.lineTo(r * (big ? 1.45 : 1.3), 0); ctx.lineTo(r * .7, r * .14); ctx.closePath(); ctx.fill(); ctx.lineWidth = lw * .6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore(); }
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i * TAU / 6; ctx.lineTo(Math.cos(q) * r, Math.sin(q) * r); } ctx.closePath(); });
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = lw * .5; ctx.beginPath(); for (let i = 0; i < 3; i++) { const q = i * Math.PI / 3; ctx.moveTo(Math.cos(q) * r * .8, Math.sin(q) * r * .8); ctx.lineTo(-Math.cos(q) * r * .8, -Math.sin(q) * r * .8); } ctx.stroke();
      shine(r, lx, ly);
      face(e, r, lw, big ? { three: true, pupil: '#01579b', mw: .45, teeth: 4, er: .2 } : { er: .25, pupil: '#0277bd' });
      break;
    }
    case 'glitch': { // glitch : copies décalées rouge / cyan
      const j = Math.sin(t * 37) > .6 ? r * .25 : r * .08;
      for (const [o, c] of [[-j, 'rgba(0,229,255,.55)'], [j, 'rgba(255,23,68,.55)']]) { ctx.fillStyle = c; ctx.fillRect(-r + o, -r * .9, r * 2, r * 1.8); }
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); ctx.rect(-r, -r * .9, r * 2, r * 1.8); });
      ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 4; i++) ctx.fillRect(-r, -r * .9 + ((i * 7 + Math.floor(t * 12)) % 9) / 9 * r * 1.8, r * 2, r * .1);
      face(e, r, lw, { er: .24, pupil: '#00e5ff', mw: .3 });
      break;
    }
    case 'trojan': { // cheval de Troie : caisse en bois sur roues
      for (const sx of [-.6, .6]) for (const sy of [-1, 1]) { ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(sx * r, sy * r * .95, r * .26, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.save(); ctx.translate(sx * r, sy * r * .95); ctx.rotate(t * 4); ctx.strokeStyle = '#a1887f'; ctx.beginPath(); ctx.moveTo(-r * .2, 0); ctx.lineTo(r * .2, 0); ctx.moveTo(0, -r * .2); ctx.lineTo(0, r * .2); ctx.stroke(); ctx.restore(); }
      glossBody(r, '#8d6e63', lx, ly, lw, () => rr(ctx, -r * 1.05, -r * .8, r * 2.1, r * 1.6, r * .15));
      ctx.strokeStyle = 'rgba(40,20,10,.6)'; ctx.lineWidth = lw * .5; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(-r, i * r * .3); ctx.lineTo(r, i * r * .3); } ctx.stroke();
      ctx.save(); ctx.translate(r * .9, 0); glossBody(r * .45, '#a1887f', lx, ly, lw, circle(r * .45)); ctx.restore();
      ctx.fillStyle = '#18ffff'; ctx.font = '900 ' + (r * .8) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', -r * .3, 0);
      face(e, r, lw, { x: 1, sp: .2, er: .14, mx: 1.15, mw: .2, pupil: '#d50000' });
      break;
    }
    case 'ddos': { // botnet : noyau + bots en orbite
      for (let i = 0; i < 6; i++) { const q = i * TAU / 6 + t * 2.5, ox = Math.cos(q) * r * 1.35, oy = Math.sin(q) * r * 1.35; ctx.strokeStyle = 'rgba(255,171,0,.4)'; ctx.lineWidth = lw * .4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ox, oy); ctx.stroke(); ctx.save(); ctx.translate(ox, oy); glossBody(r * .22, '#ffd54f', lx, ly, lw * .5, circle(r * .22)); ctx.restore(); }
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const q = i * TAU / 8 + Math.PI / 8; ctx.lineTo(Math.cos(q) * r, Math.sin(q) * r); } ctx.closePath(); });
      shine(r, lx, ly);
      face(e, r, lw, { three: true, pupil: '#e65100', mw: .45, teeth: 4, er: .2 });
      break;
    }
    case 'aicore': { // IA corrompue : sphère filaire néon
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(0, 0, r * 1.8, 'rgba(234,128,252,.35)'); ctx.restore();
      glossBody(r, '#1a0626', lx, ly, lw, circle(r));
      ctx.strokeStyle = col; ctx.lineWidth = lw * .5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, r * .95, r * (.25 + i * .3) * Math.abs(Math.cos(t + i)), 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, r * (.25 + i * .3) * Math.abs(Math.sin(t * .8 + i)), r * .95, 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#ff1744'; ctx.beginPath(); ctx.arc(r * .3, 0, r * .28, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * .38, -r * .06, r * .09, 0, TAU); ctx.fill();
      break;
    }
    default: glossBody(r, col, lx, ly, lw, circle(r)); face(e, r, lw);
  }
  ctx.restore(); ctx.globalAlpha = 1;

  // --- auras (sans rotation) ---
  if (d.boss === 2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgbaA(d.col).replace('A', (.35 + .25 * Math.sin(e.anim * 5)).toFixed(2)); ctx.lineWidth = .05; ctx.setLineDash([.2, .12]); ctx.lineDashOffset = -e.anim; ctx.beginPath(); ctx.arc(e.x, e.y, r * 1.75, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
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
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || '.SE'.includes(m.g[ty][tx])) continue;
    const dx = (b[0] - a[0]) / seg[i], dy = (b[1] - a[1]) / seg[i];
    glowDot(x - dx * .12, y - dy * .12, .12, p.col); glowDot(x, y, .16, p.col);
  }
  // reflet de lumière qui balaie le circuit (pas les couloirs)
  const sw = G.eco ? -99 : (t % 9) / 9 * (COLS + ROWS + 8) - 4;
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
  drawWorldLive(t);
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
// animations propres à chaque monde : obstacles vivants et particules d'ambiance
function drawWorldLive(t) {
  const m = G.m, th = G.th;
  ctx.globalCompositeOperation = 'source-over';
  for (const o of (m.obst || [])) {
    const cx = o.x + 1, cy = o.y + 1;
    if (o.kind === 'disk') { // plateau de disque dur qui tourne + tête de lecture
      ctx.save(); ctx.translate(cx, cy);
      const g = ctx.createRadialGradient(-.25, -.25, .05, 0, 0, .8); g.addColorStop(0, '#f5f7fa'); g.addColorStop(.6, '#9aa7b8'); g.addColorStop(1, '#4a5568');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, .8, 0, TAU); ctx.fill();
      ctx.rotate(t * 6 + o.x);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, .78, 0, .5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, .78, Math.PI, Math.PI + .5); ctx.closePath(); ctx.fill();
      ctx.rotate(-(t * 6 + o.x));
      ctx.fillStyle = '#cfd8dc'; ctx.beginPath(); ctx.arc(0, 0, .14, 0, TAU); ctx.fill();
      const arm = -.9 + Math.sin(t * 1.3 + o.y) * .35;
      ctx.translate(.7, .7); ctx.rotate(Math.PI + arm);
      ctx.fillStyle = '#b0bec5'; ctx.fillRect(0, -.04, .75, .08); ctx.fillStyle = '#37474f'; ctx.fillRect(.7, -.06, .1, .12);
      ctx.beginPath(); ctx.arc(0, 0, .1, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (o.kind === 'coil') { // transformateur qui chauffe
      ctx.globalCompositeOperation = 'lighter';
      const k = .5 + .5 * Math.sin(t * 2.5 + o.x);
      glowDot(cx, cy, .7 + k * .2, 'rgba(255,90,0,' + (.25 + k * .25).toFixed(2) + ')', 'rgba(255,200,80,.4)');
      ctx.globalCompositeOperation = 'source-over';
    } else if (o.kind === 'tank') { // bulles dans le liquide cryogénique
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, .78, 0, TAU); ctx.clip();
      const g = ctx.createLinearGradient(cx - .8, 0, cx + .8, 0); g.addColorStop(0, '#01579b'); g.addColorStop(.4, '#4fc3f7'); g.addColorStop(1, '#01579b');
      ctx.fillStyle = g; ctx.fillRect(cx - .8, cy - .3 + Math.sin(t * 2) * .05, 1.6, 1.2);
      for (let k = 0; k < 6; k++) { const u = ((t * .5 + k * .37) % 1); ctx.fillStyle = 'rgba(255,255,255,' + (.7 * (1 - u)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(cx - .4 + ((k * .29) % .8), cy + .7 - u * 1.1, .04 + (k % 3) * .015, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .04; ctx.beginPath(); ctx.arc(cx, cy, .78, -2.6, -1.6); ctx.stroke();
    } else if (o.kind === 'holo') { // cube holographique en rotation
      ctx.globalCompositeOperation = 'lighter';
      const a = t * .9 + o.x, b = t * .6, V = [];
      for (const X of [-1, 1]) for (const Y of [-1, 1]) for (const Z of [-1, 1]) {
        let x = X, y = Y, z = Z; const x1 = x * Math.cos(a) - z * Math.sin(a), z1 = x * Math.sin(a) + z * Math.cos(a);
        const y1 = y * Math.cos(b) - z1 * Math.sin(b), z2 = y * Math.sin(b) + z1 * Math.cos(b), p = .38 / (1 + z2 * .15);
        V.push([cx + x1 * p, cy - .1 + y1 * p + Math.sin(t * 2) * .05]);
      }
      ctx.strokeStyle = m.acc; ctx.lineWidth = .035; ctx.globalAlpha = .85; ctx.beginPath();
      for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) { const j = i ^ bit; if (j > i) { ctx.moveTo(V[i][0], V[i][1]); ctx.lineTo(V[j][0], V[j][1]); } }
      ctx.stroke(); ctx.globalAlpha = 1;
      glowDot(cx, cy, .9, rgbaA(m.acc).replace('A', .2));
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  // particules d'ambiance (positions calculées à partir du temps : rien à mettre à jour)
  const A = G.amb; if (!A || G.eco) return;
  if (th === 'forge') { // braises qui montent
    ctx.globalCompositeOperation = 'lighter';
    for (const p of A) {
      const y = ((p.y - t * p.spd * .6) % (ROWS + 1) + ROWS + 1) % (ROWS + 1) - .5, x = p.x + Math.sin(t * 1.3 + p.ph) * .3, fl = .5 + .5 * Math.sin(t * 9 + p.ph);
      glowDot(x, y, .1 * p.s + fl * .04, 'rgba(255,' + (90 + Math.round(fl * 100)) + ',20,.85)');
    }
  } else if (th === 'ice') { // flocons qui tombent
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (const p of A) {
      const y = ((p.y + t * p.spd * .45) % (ROWS + 1) + ROWS + 1) % (ROWS + 1) - .5, x = p.x + Math.sin(t * .8 + p.ph) * .5;
      ctx.beginPath(); ctx.arc(x, y, .025 + p.s * .035, 0, TAU); ctx.fill();
    }
  } else if (th === 'data') { // bits qui défilent
    ctx.globalCompositeOperation = 'lighter'; ctx.font = 'bold .22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of A) {
      const x = ((p.x + t * p.spd * 1.2) % (COLS + 1) + COLS + 1) % (COLS + 1) - .5, y = p.y;
      ctx.fillStyle = rgbaA(m.acc).replace('A', (.25 + .25 * Math.sin(t * 3 + p.ph)).toFixed(2)); ctx.fillText((Math.floor(t * 2 + p.ph) % 2) ? p.c : (p.c === '0' ? '1' : '0'), x, y);
    }
  } else if (th === 'neon') { // ligne de balayage et parasites
    ctx.globalCompositeOperation = 'lighter';
    const sy = (t * 2.2) % (ROWS + 4) - 2, g = ctx.createLinearGradient(0, sy - .6, 0, sy + .6);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, rgbaA(m.acc).replace('A', .12)); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, sy - .6, COLS, 1.2);
    const k = Math.floor(t * 6);
    for (let i = 0; i < 3; i++) {
      const r = mulberry(k * 7 + i)(); if (r > .55) continue;
      const R2 = mulberry(k * 13 + i * 5), x = R2() * COLS, y = R2() * ROWS;
      ctx.fillStyle = (i % 2 ? 'rgba(0,229,255,' : rgbaA(m.acc).replace(',A)', ',')) + '.25)'; ctx.fillRect(x, y, .4 + R2() * 1.6, .05 + R2() * .15);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
// règles du monde visibles sur la carte
function drawRules() {
  const t = G.time;
  if (G.hot) for (const k of G.hot) { // cases brûlantes
    const x = k % COLS, y = (k / COLS) | 0, a = .18 + .1 * Math.sin(t * 3 + k);
    ctx.fillStyle = 'rgba(255,90,0,' + a.toFixed(2) + ')'; ctx.fillRect(x + .06, y + .06, .88, .88);
    ctx.strokeStyle = 'rgba(255,170,60,.7)'; ctx.lineWidth = .03; ctx.setLineDash([.12, .08]); ctx.strokeRect(x + .08, y + .08, .84, .84); ctx.setLineDash([]);
    if (!G.towerAt[y][x]) { ctx.fillStyle = 'rgba(255,200,120,.75)'; ctx.font = '900 .38px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♨', x + .5, y + .52); }
  }
  if (G.portals) for (const p of G.portals) for (const [k, col] of [[p.i, '64,196,255'], [p.j, '255,145,0']]) { // portails
    const [x, y] = p.route[k], cx = x + .5, cy = y + .5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(cx, cy, .7, 'rgba(' + col + ',.35)');
    ctx.strokeStyle = 'rgba(' + col + ',.9)'; ctx.lineWidth = .05;
    for (let i = 0; i < 3; i++) { const a = t * (k === p.i ? 4 : -4) + i * TAU / 3; ctx.beginPath(); ctx.arc(cx, cy, .32, a, a + 1.4); ctx.stroke(); }
    ctx.restore();
  }
  if (G.outZ) { // coupure de courant
    const z = G.outZ, x0 = Math.max(0, z.x - 2), y0 = Math.max(0, z.y - 2), x1 = Math.min(COLS, z.x + 3), y1 = Math.min(ROWS, z.y + 3);
    if (z.on > 0) { ctx.fillStyle = 'rgba(0,0,10,.45)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
    ctx.strokeStyle = z.on > 0 ? 'rgba(255,215,0,.6)' : 'rgba(255,60,60,' + (.4 + .5 * Math.abs(Math.sin(t * 8))).toFixed(2) + ')'; ctx.lineWidth = .08; ctx.setLineDash([.3, .2]); ctx.strokeRect(x0 + .05, y0 + .05, x1 - x0 - .1, y1 - y0 - .1); ctx.setLineDash([]);
    ctx.font = '900 .7px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = z.on > 0 ? 'rgba(255,215,0,.5)' : 'rgba(255,80,80,.8)'; ctx.fillText('⚡', (x0 + x1) / 2, (y0 + y1) / 2);
  }
}
// couverture des couloirs : rouge = aucune tourelle n'y tire
function drawCoverage() {
  const cand = G.tool && G.hover && !G.aim && canPlace(G.hover[0], G.hover[1]) === null;
  if (!G.showCov && !cand) return;
  if (!G.cov || G.covDirty) {
    G.covDirty = false; G.cov = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (walkable(x, y)) {
      let n = 0; for (const t of G.towers) if (t.type !== 'boost' && t.type !== 'miner' && Math.hypot(t.x - x, t.y - y) <= t.st.range) n++;
      G.cov.push([x, y, n]);
    }
  }
  const cr = cand ? tStats(G.tool, 1).range : 0;
  for (const [x, y, n] of G.cov) {
    const inC = cand && Math.hypot(G.hover[0] - x, G.hover[1] - y) <= cr;
    ctx.fillStyle = inC ? 'rgba(255,235,59,.32)' : n ? 'rgba(105,240,174,' + Math.min(.32, .08 + n * .06).toFixed(2) + ')' : 'rgba(255,60,60,.28)';
    ctx.fillRect(x + .04, y + .04, .92, .92);
  }
}
// aperçu de la vague suivante : chemins animés et icônes à chaque entrée
function nextWaveDef() { if (!G.prevW || G.prevW.w !== G.wave + 1) G.prevW = { w: G.wave + 1, d: waveDef(G.wave + 1) }; return G.prevW.d; }
function previewOn() { return !G.demo && !G.over && !G.enemies.length && !G.queue.length && G.wave < G.total; }
function drawPreview() {
  if (!previewOn()) return;
  ctx.save(); ctx.strokeStyle = rgbaA(G.m.acc).replace('A', .55); ctx.lineWidth = .07; ctx.setLineDash([.18, .22]); ctx.lineDashOffset = -G.time * 1.5; ctx.lineJoin = 'round';
  for (const r of G.m.routes) { ctx.beginPath(); r.forEach(([x, y], i) => i ? ctx.lineTo(x + .5, y + .5) : ctx.moveTo(x + .5, y + .5)); ctx.stroke(); }
  ctx.restore();
}
function drawPreviewIcons() {
  if (!previewOn()) return;
  const wd = nextWaveDef(), types = [[wd.type, wd.n]]; if (wd.type2) types.push([wd.type2, wd.n2]);
  const sz = clamp(L.s * .75, 22, 34), pad = 7, gap = 6;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.font = '900 ' + Math.round(sz * .5) + 'px system-ui';
  const items = types.map(([tp, n]) => ({ tp, n, tw: ctx.measureText('×' + n).width }));
  const w = pad * 2 + items.reduce((a, it) => a + sz + 3 + it.tw, 0) + gap * (items.length - 1), h = sz + pad * 2;
  // zone à éviter : barre des pouvoirs
  const pw = $('#powers'), pr = pw && !pw.classList.contains('hidden') ? pw.getBoundingClientRect() : null;
  const boss = !!ETYPES[wd.type].boss, placed = [], seen = new Set();
  for (const r of G.m.routes) {
    const k = r[0].join(','); if (seen.has(k)) continue; seen.add(k);
    // direction du couloir à l'écran, puis on pose la bulle juste après l'entrée, dans l'axe du couloir
    const [ax, ay] = toScreen(r[0][0] + .5, r[0][1] + .5), [bx, by] = toScreen(r[1][0] + .5, r[1][1] + .5);
    const ux = Math.sign(Math.round(bx - ax)), uy = Math.sign(Math.round(by - ay));
    let cx = ax + ux * (L.s * .7 + w / 2 + 4), cy = ay + uy * (L.s * .7 + h / 2 + 4);
    cx = clamp(cx, L.ax + w / 2 + 6, L.ax + L.aw - w / 2 - 6); cy = clamp(cy, L.ay + h / 2 + 6, L.ay + L.ah - h / 2 - 6);
    if (pr && cx + w / 2 > pr.left - 4 && cx - w / 2 < pr.right + 4 && cy + h / 2 > pr.top - 4) cy = pr.top - h / 2 - 8;
    for (const q of placed) if (Math.abs(q[0] - cx) < w && Math.abs(q[1] - cy) < h + 4) cy = q[1] - h - 6;
    placed.push([cx, cy]);
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
    ctx.fillStyle = 'rgba(0,0,0,.72)'; rr(ctx, x0, y0, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = boss ? '#ff5252' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    let x = x0 + pad;
    for (const it of items) {
      const d = ETYPES[it.tp], sc = sz / (d.r * 3.2), ix = x + sz / 2, iy = y0 + h / 2;
      ctx.setTransform(sc * DPR, 0, 0, sc * DPR, ix * DPR, iy * DPR);
      drawEnemy({ type: it.tp, x: 0, y: 0, r: d.r, col: d.col, ang: 0, anim: G.time, age: 1, hp: 1, max: 1, id: 7, fly: false });
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.font = '900 ' + Math.round(sz * .5) + 'px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText('×' + it.n, x + sz + 3, iy + 1);
      x += sz + 3 + it.tw + gap;
    }
  }
  ctx.textAlign = 'center';
}
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#070a08'; ctx.fillRect(0, 0, SW, SH);
  if (!G) return;
  ctx.save(); ctx.beginPath(); ctx.rect(L.ax, L.ay, L.aw, L.ah); ctx.clip();
  const sh = G.shake || 0, s0 = L.s;
  if (G.punch > .002) L.s *= 1 + G.punch;
  mapTransform(sh ? rand(-sh, sh) : 0, sh ? rand(-sh, sh) : 0);
  L.s = s0;
  const BM = G.bgM || 0; ctx.drawImage(G.bg, -BM, -BM, COLS + 2 * BM, ROWS + 2 * BM);
  if (G.scar) ctx.drawImage(G.scar, 0, 0, COLS, ROWS);
  drawLive();
  drawRules();
  drawCoverage();
  drawPreview();
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
  if (G.tool && G.hover && !G.aim) {
    const [hx, hy] = G.hover;
    if (hx >= 0 && hy >= 0 && hx < COLS && hy < ROWS) {
      const ok = canPlace(hx, hy) === null && G.cash >= tCost(G.tool);
      ctx.fillStyle = ok ? 'rgba(100,255,120,.25)' : 'rgba(255,60,60,.3)'; ctx.fillRect(hx, hy, 1, 1);
      if (ok) {
        ctx.globalAlpha = .5; ctx.save(); ctx.translate(hx + .5, hy + .5); drawTower(ctx, G.tool, 1, -Math.PI / 2, G.time, 0); ctx.restore(); ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .04; ctx.setLineDash([.15, .1]); ctx.beginPath(); ctx.arc(hx + .5, hy + .5, tStats(G.tool, 1).range, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
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
      const pb = t.path === 1;
      ctx.globalCompositeOperation = 'lighter'; glowDot(0, 0, .75 + Math.sin(G.time * 4) * .05, pb ? 'rgba(64,196,255,.35)' : 'rgba(255,215,64,.35)'); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = pb ? 'rgba(64,196,255,.85)' : 'rgba(255,215,64,.8)'; ctx.lineWidth = .035; ctx.setLineDash([.12, .09]); ctx.lineDashOffset = -G.time * .6;
      ctx.beginPath(); ctx.arc(0, 0, .58, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    drawTower(ctx, t.type, t.lvl, t.ang, G.time, t.flash || 0, true);
    if (t.lvl >= TMAX && t.path === 1) { ctx.fillStyle = '#40c4ff'; ctx.strokeStyle = OUT; ctx.lineWidth = .03; ctx.beginPath(); ctx.arc(.33, -.33, .12, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#012'; ctx.font = '900 .16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('B', .33, -.32); }
    if (t.hot) { ctx.globalCompositeOperation = 'lighter'; glowDot(0, .3, .25, 'rgba(255,110,0,' + (.35 + .2 * Math.sin(G.time * 5 + t.id)).toFixed(2) + ')'); ctx.globalCompositeOperation = 'source-over'; }
    if (t.offT > 0 || t.hacked > 0) { // tourelle éteinte, gelée ou piratée
      const hk = t.hacked > 0;
      ctx.fillStyle = hk ? 'rgba(255,0,200,' + (.25 + .15 * Math.sin(G.time * 12)).toFixed(2) + ')' : t.iced > 0 ? 'rgba(170,230,255,.55)' : 'rgba(0,0,0,.55)'; rr(ctx, -.46, -.46, .92, .92, .22); ctx.fill();
      ctx.font = '900 .42px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = .06; ctx.strokeStyle = '#000';
      const ic = hk ? '⚠' : t.iced > 0 ? '❄' : t.hot && !(G.outZ && G.outZ.on > 0) ? '♨' : '⏻';
      ctx.strokeText(ic, 0, 0); ctx.fillStyle = hk ? '#ff4bd8' : t.iced > 0 ? '#e1f5fe' : '#ffd740'; ctx.fillText(ic, 0, 0);
    }
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
  for (const p of G.projs) if (p.kind === 'shell') {
    const sc = 1 + (p.h || 0) * .9; ball(ctx, p.x, p.y, .085 * sc, '#3a3f44', -.7, -.7, '#9aa4aa');
    glowDot(p.x - .06, p.y - .06, .07, 'rgba(255,170,0,.8)');
  }
  for (const p of G.projs) if (p.kind === 'missile') { // petite fusée
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
    if (p.kind === 'shell' || p.kind === 'missile') continue;
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
  if (!G.eco) {
    const vg = ctx.createRadialGradient(COLS / 2, ROWS / 2, ROWS * .35, COLS / 2, ROWS / 2, COLS * .62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = vg; ctx.fillRect(-BM, -BM, COLS + 2 * BM, ROWS + 2 * BM);
  }
  ctx.restore();

  // ----- écran (texte et barres toujours droits) -----
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const T = L.s;
  for (const e of G.enemies) {
    if (e.hp >= e.max) continue;
    const [sx, sy] = toScreen(e.x, e.y), w = T * (isBoss(e) ? 1.2 : .6), y = sy - T * e.r - 10, k = e.hp / e.max;
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
  for (const f of G.fx) if (f.kind === 'flash') { ctx.fillStyle = 'rgba(' + f.col + ',' + (f.life / f.max * .35).toFixed(2) + ')'; ctx.fillRect(L.ax, L.ay, L.aw, L.ah); }
  if (G.aim) { // visée de la frappe orbitale
    ctx.strokeStyle = 'rgba(255,145,0,' + (.5 + .4 * Math.sin(G.time * 10)).toFixed(2) + ')'; ctx.lineWidth = 6; ctx.strokeRect(L.ax + 3, L.ay + 3, L.aw - 6, L.ah - 6);
    if (G.hover) { const [sx, sy] = toScreen(G.hover[0] + .5, G.hover[1] + .5); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, L.s * 1.8, 0, TAU); ctx.stroke(); }
  }
  drawPreviewIcons();
  for (const f of G.fx) if (f.kind === 'leak') {
    const g = ctx.createRadialGradient(SW / 2, SH / 2, Math.min(SW, SH) * .3, SW / 2, SH / 2, Math.max(SW, SH) * .7);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,0,0,' + (f.life / f.max * .5) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  }
  if (G.banner && !G.demo) {
    const b = G.banner, age = (b.max || 2.2) - b.life, k = Math.min(1, age / .25), out = Math.min(1, b.life / .4);
    const cx = L.ax + L.aw / 2, cy = L.ay + L.ah * .38, sc = (1.6 - .6 * k) ;
    ctx.save(); ctx.globalAlpha = out; ctx.translate(cx, cy); ctx.scale(sc, sc);
    let fs = Math.min(46, L.aw / 10);
    ctx.font = '900 ' + fs + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(b.t).width * 1.1; if (tw * sc > L.aw * .92) { fs *= L.aw * .92 / (tw * sc); ctx.font = '900 ' + fs + 'px system-ui'; }
    ctx.lineJoin = 'round'; ctx.lineWidth = fs * .22; ctx.strokeStyle = '#2a0000'; ctx.strokeText(b.t, 0, 0);
    const g = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2); g.addColorStop(0, b.boss ? '#ffeb3b' : '#ffffff'); g.addColorStop(1, b.boss ? '#ff3d00' : G.m.acc);
    ctx.fillStyle = g; ctx.fillText(b.t, 0, 0);
    let sfs = Math.max(11, fs * .38); ctx.font = '800 ' + sfs + 'px system-ui';
    const sw2 = ctx.measureText(b.sub).width; if (sw2 * sc > L.aw * .94) { sfs *= L.aw * .94 / (sw2 * sc); ctx.font = '800 ' + sfs + 'px system-ui'; }
    ctx.lineWidth = 4; ctx.strokeText(b.sub, 0, fs * .75); ctx.fillStyle = '#fff'; ctx.fillText(b.sub, 0, fs * .75);
    ctx.restore();
  }
  if (G.countdown > 0 && !G.over) {
    const sx = L.ax + L.aw / 2, sy = L.ay + 24 + (L.sT || 0);
    ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
  if (G.aim === 'strike') { if (inMap) doPower('strike', mx, my); return; }
  const tw = inMap ? G.towerAt[ty][tx] : null;
  if (tw && tw.hacked > 0) { tw.hacked = 0; stat('repairs'); G.fx.push({ kind: 'ring', x: tw.x + .5, y: tw.y + .5, r: .8, col: '#69f0ae', life: .35, max: .35 }); floatText(tw.x + .5, tw.y, 'Réparée !', '#69f0ae'); sfx('build'); return; }
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
  if (G.wave >= G.total) label = 'Dernière vague';
  else if (G.wave === 0) label = '▶ Vague 1';
  else if (G.queue.length || G.enemies.length) label = '⏩ Vague ' + (G.wave + 1);
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
$('#bSpeed').onclick = () => { G.speed = G.speed >= 3 ? 1 : G.speed + 1; $('#bSpeed').textContent = '×' + G.speed; };
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
  $('#tpMode').textContent = '🎯 Cible : ' + MODE_NAMES[t.mode || 'first'];
  $('#tpMode').classList.toggle('hidden', t.type === 'boost' || t.type === 'miner');
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

/* ---------------- fin de partie ---------------- */
function endGame(win) {
  G.over = true; G.win = win; G.endT = 0; G.fwT = 0;
  closePopup(); G.aim = null; updatePowers();
  // on arrête net les tirs : pas de rayon figé à l'écran
  G.projs.length = 0; G.fx = G.fx.filter(f => f.kind === 'splat');
  const endless = G.endless, daily = G.daily, waves = win ? G.total : Math.max(0, G.wave - 1);
  G.banner = endless ? { t: 'FIN DE LA RÉSISTANCE', sub: waves + ' vagues tenues', life: 3.2, max: 3.2, boss: true, big: true } :
    { t: win ? 'ZONE NETTOYÉE !' : 'SYSTÈME INFECTÉ !', sub: win ? G.m.name + ' sauvée' : 'Les virus ont atteint le processeur', life: 3.2, max: 3.2, boss: !win, big: true };
  if (!win) { for (const [x, y] of G.exits) { for (let i = 0; i < 30; i++) G.parts.push(part(x + .5, y + .5, i % 2 ? '#ff5252' : '#ffd740', 5)); smoke(x + .5, y + .5, 12, .5); } G.shake = 16; }
  const S = save.stats; G.chalRes = null; G.record = false;
  S.waves = (S.waves || 0) + waves; S.playTime = (S.playTime || 0) + G.time;
  if (endless) {
    const key = curDiff + G.mi; save.endless = save.endless || {};
    if (waves > (save.endless[key] || 0)) { save.endless[key] = waves; G.record = waves > 0; }
    S.endlessBest = Math.max(S.endlessBest || 0, waves);
    G.chipsWon = Math.floor(waves * 1.1 * CHIP_MULT[curDiff]);
    save.best['inf' + key] = Math.max(save.best['inf' + key] || 0, G.score);
    sfx(waves >= 20 ? 'win' : 'lose');
  } else if (daily) {
    const di = dailyInfo(), D = save.daily = save.daily || {};
    if (D.key !== di.key) { save.daily = { key: di.key, best: 0, top: [], won: false, wins: D.wins || 0 }; }
    const DD = save.daily, sc = G.score + (win ? G.lives * 100 : 0); G.score = sc;
    G.record = sc > (DD.best || 0); DD.best = Math.max(DD.best || 0, sc);
    DD.top = (DD.top || []).concat([sc]).sort((x, y) => y - x).slice(0, 5);
    G.chipsWon = Math.floor(waves * .8);
    if (win && !DD.won) { DD.won = true; DD.wins = (DD.wins || 0) + 1; S.dailyWins = (S.dailyWins || 0) + 1; G.chipsWon += 40; save.pwStock = save.pwStock || {}; for (const k in POWERS) save.pwStock[k] = pwStock(k) + 1; }
    if (win) sfx('win'); else { sfx('lose'); vibe(300); }
    G.stars = win ? 3 : 0;
  } else if (win) {
    const k = G.lives / (G.maxLives || G.d.lives), st = k >= 1 ? 3 : k >= .5 ? 2 : 1, key = curDiff + G.mi;
    G.score += G.lives * 100;
    save.stars[key] = Math.max(save.stars[key] || 0, st);
    G.record = G.score > (save.best[key] || 0);
    save.best[key] = Math.max(save.best[key] || 0, G.score);
    const first = !(save.stars[key + 'won']); save.stars[key + 'won'] = 1;
    if (G.mi + 2 > save.unlocked[curDiff]) save.unlocked[curDiff] = Math.min(MAPS.length, G.mi + 2);
    G.chipsWon = Math.round((20 + 8 * st + 3 * G.mi) * CHIP_MULT[curDiff]) + (first ? 15 : 0);
    // défis de la zone
    save.chal = save.chal || {}; G.chalRes = [];
    for (const c of zoneChals(G.mi)) { const ok = CHALS[c].ok(G), was = save.chal[G.mi + ':' + c]; if (ok && !was) { save.chal[G.mi + ':' + c] = 1; G.chipsWon += 12; } G.chalRes.push({ c, ok, isNew: ok && !was }); }
    S.wins = (S.wins || 0) + 1; S.worldWin = S.worldWin || {}; S.worldWin[Math.floor(G.mi / 3)] = 1;
    if (curDiff === 'legend') S.legendWins = (S.legendWins || 0) + 1;
    if (G.lives >= G.maxLives) unlockAch('perfect');
    sfx('win'); G.stars = st;
  } else {
    const key = curDiff + G.mi; save.best[key] = Math.max(save.best[key] || 0, G.score);
    G.chipsWon = Math.floor(Math.max(0, G.wave - 1) * .8 * CHIP_MULT[curDiff]);
    S.losses = (S.losses || 0) + 1;
    sfx('lose'); vibe(300);
  }
  save.chips = (save.chips || 0) + G.chipsWon;
  checkAch(); persist();
}
function showResult(win) {
  setState('result');
  const last = G.mi === MAPS.length - 1, endless = G.endless, daily = G.daily, waves = win ? G.total : Math.max(0, G.wave - 1);
  $('#resTitle').textContent = endless ? '♾ Fin du mode infini' : daily ? (win ? '📅 Défi du jour réussi !' : '📅 Défi du jour raté') : win ? (last ? '🏆 Ordinateur sauvé !' : 'Zone nettoyée !') : 'L\'ordinateur est infecté…';
  $('#resTitle').style.color = win || (endless && waves >= 10) ? '#a5d6a7' : '#ff8a80';
  $('#resStars').innerHTML = endless ? '<span class="bigwave">' + waves + '</span>' : win && !daily ? [0, 1, 2].map(i => '<span class="st' + (i < G.stars ? ' on' : '') + '" style="animation-delay:' + (.25 + i * .25) + 's">★</span>').join('') : win ? '<span class="bigwave">✔</span>' : '<span class="skull">☠</span>';
  $('#resChips').innerHTML = '+' + (G.chipsWon || 0) + ' ⬢ <small>puces</small>' + (G.record ? '<em class="rec">NOUVEAU RECORD !</em>' : '');
  // tourelle la plus utile
  let mvp = null, tot = 0; for (const t of G.towers) { tot += t.dmg || 0; if (!mvp || (t.dmg || 0) > (mvp.dmg || 0)) mvp = t; }
  const recKey = curDiff + G.mi;
  let html = '<div><small>' + (daily ? 'Défi' : 'Zone') + '</small><b>' + G.m.name + '</b></div><div><small>Difficulté</small><b>' + G.d.name + '</b></div><div><small>Vagues</small><b>' + waves + (endless ? '' : ' / ' + G.total) + '</b></div><div><small>Virus détruits</small><b>' + G.kills + '</b></div><div><small>Score</small><b style="color:#e6ee5a">' + G.score + '</b></div>' +
    '<div><small>Record</small><b>' + (endless ? 'vague ' + ((save.endless || {})[recKey] || 0) : daily ? (save.daily.best || 0) : (save.best[recKey] || 0)) + '</b></div>';
  if (mvp && tot > 0) html += '<div class="wide"><small>Tourelle MVP</small><b style="color:' + TOWERS[mvp.type].col + '">' + TOWERS[mvp.type].name + ' niv. ' + mvp.lvl + ' · ' + Math.round(100 * mvp.dmg / tot) + ' % des dégâts</b></div>';
  if (G.chalRes) html += '<div class="wide chal"><small>Défis de la zone</small>' + G.chalRes.map(r => '<b class="' + (r.ok ? 'ok' : 'ko') + '">' + (r.ok ? '🏅 ' : '✘ ') + CHALS[r.c].name + (r.isNew ? ' <i>+12 ⬢</i>' : '') + '</b>').join('') + '</div>';
  if (G.newAch && G.newAch.length) html += '<div class="wide"><small>Succès débloqués</small><b>' + G.newAch.map(a => a.ic + ' ' + a.name).join(' · ') + '</b></div>';
  $('#resBody').innerHTML = html;
  const nb = $('#resNext');
  if (win && !last && !endless && !daily) { nb.classList.remove('hidden'); nb.textContent = '▶ Suivante'; nb.onclick = () => startMap(G.mi + 1); }
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
  document.querySelectorAll('#shop .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === shopTab));
  const list = $('#shopList'); list.innerHTML = ''; list.className = shopTab;
  const pips = (l, m) => '<div class="pips">' + Array.from({ length: m }, (_, i) => '<i class="' + (i < l ? 'on' : '') + '"></i>').join('') + '</div>';
  if (shopTab === 'towers') {
    for (const k of TORDER) {
      const d = TOWERS[k], un = unlockedT(k), r = resLvl(k), c = document.createElement('div');
      c.className = 'scard' + (un ? '' : ' locked') + (shopSel === k ? ' sel' : '');
      const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 72; const g = cv2.getContext('2d'); g.setTransform(72, 0, 0, 72, 36, 36); drawTower(g, k, un ? Math.min(TMAX, 1 + r) : 1, -Math.PI / 4, 0, 0);
      c.appendChild(cv2);
      const info = document.createElement('div'); info.className = 'sinfo';
      info.innerHTML = '<b style="color:' + d.col + '">' + (d.short || d.name) + '</b>' + (un ? pips(r, 5) : '<small>🔒 verrouillée</small>');
      c.appendChild(info);
      const bt = document.createElement('button'); bt.className = 'sbuy';
      if (!un) { bt.textContent = UNLOCK[k] + ' ⬢'; bt.classList.toggle('off', save.chips < UNLOCK[k]); bt.onclick = ev => { ev.stopPropagation(); buyChips(UNLOCK[k], () => { save.unlockT = save.unlockT || {}; save.unlockT[k] = 1; shopSel = k; toast('🔓 ' + d.name + ' débloquée !'); }); }; }
      else if (r < 5) { bt.textContent = '⬆ ' + RES_COST[r] + ' ⬢'; bt.classList.toggle('off', save.chips < RES_COST[r]); bt.onclick = ev => { ev.stopPropagation(); buyChips(RES_COST[r], () => { save.research = save.research || {}; save.research[k] = r + 1; shopSel = k; }); }; }
      else { bt.textContent = 'MAX'; bt.className = 'sbuy off'; }
      c.appendChild(bt);
      c.onclick = () => { shopSel = k; buildShop(); };
      list.appendChild(c);
    }
    const k = shopSel || 'pulse', d = TOWERS[k], r = resLvl(k);
    $('#shopInfo').innerHTML = '<b style="color:' + d.col + '">' + d.name + '</b> — ' + d.desc + '<br><small>Recherche ' + r + '/5 : +' + (8 * r) + ' % dégâts, +' + (3 * r) + ' % portée' + (r >= 2 ? ' · niveau 5 débloqué' : ' · le niveau 5 se débloque à la recherche 2') + '<br>Voie A · ' + SPECIAL[k] + '<br>Voie B · ' + SPECIALB[k] + (r >= 5 ? ' · −10 % sur le prix' : ' · recherche 5 : −10 % sur le prix') + '</small>';
  } else if (shopTab === 'powers') {
    for (const k in POWERS) {
      const P = POWERS[k], [n, cost] = PW_PACK[k], c = document.createElement('div'); c.className = 'scard';
      c.innerHTML = '<div class="sic pwic">' + PWSVG[k] + '</div><div class="sinfo"><b>' + P.name + '</b><small>' + P.desc + '</small><small class="stock">Charges : <b>' + pwStock(k) + '</b> · recharge ' + P.cd + ' s</small></div>';
      const bt = document.createElement('button'); bt.className = 'sbuy'; bt.textContent = '+' + n + ' · ' + cost + ' ⬢'; bt.classList.toggle('off', save.chips < cost);
      bt.onclick = () => buyChips(cost, () => { save.pwStock = save.pwStock || {}; save.pwStock[k] = pwStock(k) + n; });
      c.appendChild(bt); list.appendChild(c);
    }
    $('#shopInfo').innerHTML = '<small>Chaque utilisation d\'un pouvoir consomme 1 charge. Tu commences avec 5 charges de chaque. Gagner le défi du jour rapporte +1 charge de chaque pouvoir.</small>';
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
function openShop(from) { shopFrom = from; setState('shop'); }
document.querySelectorAll('#shop .tab').forEach(b => b.addEventListener('click', () => { shopTab = b.dataset.tab; buildShop(); }));
$('#shopBack').onclick = () => setState(shopFrom === 'result' ? 'maps' : shopFrom);

/* ---------------- écrans ---------------- */
const screens = ['menu', 'diff', 'maps', 'help', 'options', 'pause', 'result', 'shop', 'daily', 'trophy'];
function show(id) {
  for (const s of screens) $('#' + s).classList.toggle('hidden', s !== id);
  if (id === 'diff') buildDiff();
  if (id === 'maps') buildMaps();
  if (id === 'options') buildOptions();
  if (id === 'shop') buildShop();
  if (id === 'daily') buildDaily();
  if (id === 'trophy') buildTrophy();
  if (id === 'pause') buildPause();
  if (id === 'menu') $('#menuChips').textContent = save.chips || 0;
}
function setState(s) {
  state = s;
  $('#panel').classList.toggle('hidden', s !== 'play' && s !== 'pause');
  if (s === 'play') { for (const id of screens) $('#' + id).classList.add('hidden'); }
  else { if (s !== 'pause' && s !== 'result') { G = null; L.zoom = 1; } $('#tpop').classList.add('hidden'); show(s); }
  layout(); updatePowers(); tutoTick();
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { initAudio(); setState(b.dataset.go); }));
function buildDiff() {
  const box = $('#diffList'); box.innerHTML = '';
  for (const k in DIFFS) {
    const d = DIFFS[k], b = document.createElement('button');
    b.className = 'big alt diffbtn'; b.style.boxShadow = 'inset 0 0 0 2px ' + d.col;
    b.innerHTML = '<span style="color:' + d.col + '">' + d.name + '</span><small>' + d.desc + ' · zones ' + save.unlocked[k] + '/' + MAPS.length + '</small>';
    b.onclick = () => { curDiff = k; mapPage = null; setState('maps'); };
    if (curMode === 'endless') b.querySelector('small').textContent = d.desc + ' · meilleur : vague ' + Math.max(0, ...MAPS.map((_, i) => (save.endless || {})[k + i] || 0));
    box.appendChild(b);
  }
}
const thumbs = {}; let mapPage = null;
$('#mapPrev').onclick = () => { if (mapPage > 0) { mapPage--; buildMaps(); } };
$('#mapNext').onclick = () => { if (mapPage < WORLDS.length - 1) { mapPage++; buildMaps(); } };
function buildMaps() {
  const d = DIFFS[curDiff];
  $('#mapsTitle').innerHTML = (curMode === 'endless' ? '♾ Mode infini' : 'Zones de combat') + ' · <span style="color:' + d.col + '">' + d.name + '</span>';
  const g = $('#mapGrid'); g.innerHTML = '';
  const pages = WORLDS.length;
  if (mapPage === null) mapPage = Math.min(pages - 1, Math.floor((save.unlocked[curDiff] - 1) / 3));
  const WD = WORLDS[mapPage];
  $('#mapPage').innerHTML = (curMode === 'endless' ? '♾ ' : '') + 'Monde ' + (mapPage + 1) + ' / ' + pages + ' · <span style="color:' + MAPS[mapPage * 3].acc + '">' + WD.name + '</span>';
  $('#worldDesc').innerHTML = WD.desc + '<br><b>Règle · ' + RULES[WD.style].name + '</b> : ' + RULES[WD.style].desc + ' · <b>Boss :</b> ' + ETYPES[WBOSS[mapPage]].name;
  $('#maps').style.setProperty('--wa', WD.panel[0]); $('#maps').style.setProperty('--wc', WD.panel[2]);
  $('#mapPrev').classList.toggle('off', mapPage === 0); $('#mapNext').classList.toggle('off', mapPage === pages - 1);
  MAPS.forEach((m, i) => {
    if (Math.floor(i / 3) !== mapPage) return;
    const locked = i >= save.unlocked[curDiff], st = save.stars[curDiff + i] || 0, best = save.best[curDiff + i] || 0;
    const b = document.createElement('button'); b.className = 'mapcard' + (locked ? ' locked' : ''); b.style.setProperty('--c', m.acc);
    if (!thumbs[i]) thumbs[i] = buildBG(i, 16);
    const c = document.createElement('canvas'); c.width = COLS * 16; c.height = ROWS * 16; c.style.aspectRatio = COLS + '/' + ROWS; c.getContext('2d').drawImage(thumbs[i], 0, 0);
    b.appendChild(c);
    const info = document.createElement('div');
    const ent = m.routes.length, ex = new Set(m.routes.map(r => r[r.length - 1].join(','))).size;
    const ch = zoneChals(i), nch = ch.filter(c => (save.chal || {})[i + ':' + c]).length, rec = (save.endless || {})[curDiff + i] || 0;
    info.innerHTML = '<b>' + (locked ? '🔒 ' : '') + (i + 1) + '. ' + m.name + '</b><small>' + (curMode === 'endless' ? '∞ vagues · record : vague ' + rec : m.waves + ' vagues · ' + ent + ' entrée' + (ent > 1 ? 's' : '') + ' · ' + ex + ' sortie' + (ex > 1 ? 's' : '')) + '</small>' +
      (curMode === 'endless' ? '' : '<span class="st">' + '★'.repeat(st) + '☆'.repeat(3 - st) + (best ? ' <i>' + best + '</i>' : '') + '</span>' + ch.map(c => '<small class="chl' + ((save.chal || {})[i + ':' + c] ? ' done' : '') + '">' + ((save.chal || {})[i + ':' + c] ? '🏅 ' : '◻ ') + CHALS[c].name + '</small>').join(''));
    b.appendChild(info);
    b.onclick = () => { if (locked) { toast('Termine la zone précédente pour débloquer celle-ci'); return; } initAudio(); startMap(i, curMode === 'endless' ? { endless: true } : {}); };
    g.appendChild(b);
  });
}
function buildOptions() {
  $('#optAuto').textContent = 'Vague suivante automatique : ' + (save.autoWave ? 'OUI' : 'NON');
  $('#optSound').textContent = 'Bruitages : ' + (save.sound ? 'OUI' : 'NON');
  $('#optMusic').textContent = 'Musique : ' + (save.music ? 'OUI' : 'NON');
  $('#optVibe').textContent = 'Vibrations : ' + (save.vibe ? 'OUI' : 'NON');
  $('#optSide').textContent = 'Panneau des armes : ' + (save.side === 'left' ? 'À GAUCHE' : 'À DROITE');
  $('#optEco').textContent = '🔋 Économie de batterie : ' + (save.eco ? 'OUI' : 'NON');
}
$('#optAuto').onclick = () => { save.autoWave = !save.autoWave; persist(); buildOptions(); };
$('#optSound').onclick = () => { save.sound = !save.sound; persist(); buildOptions(); };
$('#optMusic').onclick = () => { initAudio(); save.music = !save.music; persist(); buildOptions(); };
$('#optSide').onclick = () => { save.side = save.side === 'left' ? 'right' : 'left'; persist(); buildOptions(); };
$('#optVibe').onclick = () => { save.vibe = !save.vibe; persist(); buildOptions(); };
$('#optEco').onclick = () => { save.eco = !save.eco; persist(); buildOptions(); layout(); };
$('#optTuto').onclick = () => { save.tuto = 0; persist(); curMode = 'campaign'; initAudio(); startMap(0); };
$('#optExport').onclick = () => {
  const code = 'VD1:' + btoa(unescape(encodeURIComponent(JSON.stringify(save))));
  const done = () => toast('📤 Code de sauvegarde copié ! Garde-le précieusement.');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => prompt('Copie ce code de sauvegarde :', code));
  else prompt('Copie ce code de sauvegarde :', code);
};
$('#optImport').onclick = () => {
  const code = (prompt('Colle ton code de sauvegarde :') || '').trim(); if (!code) return;
  try { const d = JSON.parse(decodeURIComponent(escape(atob(code.replace(/^VD1:/, ''))))); if (typeof d !== 'object' || d.chips === undefined) throw 0; save = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SAVE)), d); persist(); toast('📥 Sauvegarde importée !'); buildOptions(); }
  catch (e) { toast('Code invalide'); sfx('err'); }
};
$('#optReset').onclick = () => { if (confirm('Effacer toute la progression ?')) { const keep = { side: save.side, music: save.music, sound: save.sound, vibe: save.vibe, autoWave: save.autoWave }; save = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SAVE)), keep); persist(); buildOptions(); } };

function pauseGame() { if (state === 'play' && G && !G.over) setState('pause'); }
function resumeGame() { if (state === 'pause') setState('play'); }
$('#btnResume').onclick = resumeGame;
$('#btnRestart').onclick = () => G.daily ? startDaily() : startMap(G.mi, G.endless ? { endless: true } : {});
$('#btnQuit').onclick = () => { const d = G && G.daily; if (G && !G.over) { save.stats.playTime = (save.stats.playTime || 0) + G.time; persist(); } setState(d ? 'menu' : 'maps'); };
$('#resRetry').onclick = () => G.daily ? startDaily() : startMap(G.mi, G.endless ? { endless: true } : {});
$('#resMaps').onclick = () => setState(G && G.daily ? 'menu' : 'maps');
$('#resShop').onclick = () => openShop('result');
$('#mapsShop').onclick = () => openShop('maps');
$('#menuShop').onclick = () => { initAudio(); openShop('menu'); };
$('#menuPlay').onclick = () => { initAudio(); curMode = 'campaign'; setState('diff'); };
$('#menuEndless').onclick = () => { initAudio(); curMode = 'endless'; setState('diff'); };
$('#menuDaily').onclick = () => { initAudio(); setState('daily'); };
$('#menuTrophy').onclick = () => { initAudio(); setState('trophy'); };
$('#dailyGo').onclick = () => startDaily();
function startDaily() { const di = dailyInfo(); curMode = 'campaign'; initAudio(); startMap(di.mi, { daily: true, mod: di.mod.id, allowed: di.allowed }); }
function buildDaily() {
  const di = dailyInfo(), D = save.daily && save.daily.key === di.key ? save.daily : { best: 0, top: [] }, m = MAPS[di.mi];
  if (!thumbs[di.mi]) thumbs[di.mi] = buildBG(di.mi, 16);
  $('#dailyBox').innerHTML = '<div class="dthumb"></div><div class="dinfo"><b style="color:' + m.acc + '">' + m.name + '</b><small>' + worldOf(di.mi).name + ' · 30 vagues · difficulté Normale</small>' +
    '<p>🎲 <b>' + di.mod.name + '</b> : ' + di.mod.desc + (di.allowed ? '<br>Tourelles : ' + di.allowed.map(k => TOWERS[k].name).join(', ') : '') + '</p>' +
    '<p>' + (di.allowed ? '' : 'Toutes les tourelles sont disponibles pour ce défi. ') + 'Gagne-le pour <b>+40 ⬢</b> (une fois par jour).</p>' +
    '<p>🏆 Ton meilleur score du jour : <b>' + (D.best || 0) + '</b>' + (D.won ? ' · ✔ réussi' : '') + '</p>' +
    ((D.top || []).length ? '<ol class="top">' + D.top.map(x => '<li>' + x + '</li>').join('') + '</ol>' : '') +
    '<small>Défis réussis au total : ' + ((save.stats || {}).dailyWins || 0) + ' · Nouveau défi chaque jour à minuit</small></div>';
  const c = document.createElement('canvas'); c.width = COLS * 16; c.height = ROWS * 16; c.getContext('2d').drawImage(thumbs[di.mi], 0, 0); $('#dailyBox .dthumb').appendChild(c);
}
let trophyTab = 'ach';
document.querySelectorAll('#trophy .tab').forEach(b => b.onclick = () => { trophyTab = b.dataset.tt; buildTrophy(); });
function enemyIcon(type, px) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'), keep = ctx, d = ETYPES[type], sc = px / (d.r * 3.4);
  g.setTransform(sc, 0, 0, sc, px / 2, px / 2);
  ctx = g; try { drawEnemy({ type, x: 0, y: 0, r: d.r, col: d.col, ang: 0, anim: 1, age: 1, hp: 1, max: 1, id: 3, fly: !!d.fly }); } catch (e) { } ctx = keep;
  return c;
}
function buildTrophy() {
  document.querySelectorAll('#trophy .tab').forEach(b => b.classList.toggle('on', b.dataset.tt === trophyTab));
  const L2 = $('#trophyList'); L2.innerHTML = ''; L2.className = 'tl-' + trophyTab;
  const S = save.stats || {};
  if (trophyTab === 'ach') {
    const n = ACH.filter(a => (save.ach || {})[a.id]).length;
    L2.innerHTML = '<p class="tsum">' + n + ' / ' + ACH.length + ' succès débloqués</p>' + ACH.map(a => { const on = (save.ach || {})[a.id]; return '<div class="ach' + (on ? ' on' : '') + '"><i>' + (on ? a.ic : '🔒') + '</i><div><b>' + a.name + '</b><small>' + a.desc + '</small></div><em>+' + a.chips + ' ⬢</em></div>'; }).join('');
  } else if (trophyTab === 'virus') {
    for (const k in ETYPES) {
      const d = ETYPES[k], seen = (save.seen || {})[k], c = document.createElement('div'); c.className = 'vcard' + (seen ? '' : ' unseen') + (d.boss === 2 ? ' wb' : '');
      const ic = enemyIcon(k, 64); c.appendChild(ic);
      const tg = d.boss === 2 ? 'BOSS · ' + WORLDS[d.world].name : d.world !== undefined ? WORLDS[d.world].name : d.boss ? 'Boss' : 'Commun';
      const info = document.createElement('div');
      info.innerHTML = seen ? '<b style="color:' + d.col + '">' + d.name + '</b><small class="tag">' + tg + '</small><small>' + EDESC[k] + '</small><small class="vst">PV ' + d.hp + ' · vitesse ' + d.spd + (d.armor ? ' · blindage ' + d.armor : '') + (d.fly ? ' · volant' : '') + ' · détruits : ' + (S['k_' + k] || 0) + '</small>' : '<b>???</b><small class="tag">' + tg + '</small><small>Pas encore rencontré.</small>';
      c.appendChild(info); L2.appendChild(c);
    }
    const cb = document.createElement('div'); cb.className = 'combos';
    cb.innerHTML = '<b>🧪 Combinaisons</b>' + Object.keys(COMBOS).map(k => (save.combos || {})[k] ? '<small style="color:' + COMBOS[k].col + '">✔ ' + COMBOS[k].name + ' : ' + COMBOS[k].desc + '</small>' : '<small>❔ Combinaison inconnue</small>').join('');
    L2.appendChild(cb);
  } else {
    const best = Object.keys(TOWERS).sort((a, b) => (S['built_' + b] || 0) - (S['built_' + a] || 0))[0];
    const rows = [['Virus détruits', S.kills || 0], ['Boss de monde détruits', S.bossKills || 0], ['Tourelles posées', S.built || 0], ['Améliorations', S.upgrades || 0], ['Tourelles niveau 5', S.lvl5 || 0], ['Pouvoirs utilisés', S.powers || 0],
      ['Zones gagnées', S.wins || 0], ['Défaites', S.losses || 0], ['Vagues tenues', S.waves || 0], ['Record mode infini', 'vague ' + (S.endlessBest || 0)], ['Défis du jour réussis', S.dailyWins || 0], ['Défis de zone', Object.keys(save.chal || {}).length + ' / ' + MAPS.length * 2],
      ['Tourelles réparées', S.repairs || 0], ['Tourelle préférée', S['built_' + best] ? TOWERS[best].name : '—'], ['Temps de jeu', Math.floor((S.playTime || 0) / 60) + ' min']];
    L2.innerHTML = rows.map(r => '<div class="srow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('');
  }
}
function buildPause() {
  if (!G) return;
  const W0 = worldOf(G.mi), r = RULES[W0.style];
  let h = '<b>' + (G.daily ? '📅 Défi du jour' : G.endless ? '♾ Mode infini' : W0.name) + ' · ' + G.m.name + '</b><small>Règle · ' + r.name + ' : ' + r.desc + '</small>';
  if (G.daily) { const md = DMODS.find(x => x.id === G.mod); h += '<small>🎲 ' + md.name + ' : ' + md.desc + '</small>'; }
  else if (!G.endless) h += zoneChals(G.mi).map(c => { const ok = CHALS[c].ok(G), was = (save.chal || {})[G.mi + ':' + c]; return '<small class="' + (ok ? 'ok' : 'ko') + '">' + (was ? '🏅' : ok ? '◻' : '✘') + ' ' + CHALS[c].name + (ok ? '' : ' (raté)') + '</small>'; }).join('');
  $('#pauseInfo').innerHTML = h;
}
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
    if (G.hitstop > 0) G.hitstop -= dt; // petite pause sur les gros impacts
    else for (let i = 0; i < G.speed; i++) update(dt);
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
