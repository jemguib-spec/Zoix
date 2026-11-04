'use strict';
/* Virus Défense — données : mondes, cartes, tourelles, virus, sauvegarde, succès, missions */
/* ===================== VIRUS DÉFENSE — tower defense pour mobile ===================== */

const cv = document.getElementById('c');
let ctx = cv.getContext('2d'); // « let » : on le remplace le temps de dessiner une vignette (encyclopédie)
const $ = s => document.querySelector(s);
const COLS = 26, ROWS = 15, TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* ---------------- cartes ----------------
   Chaque carte = des couloirs (chemins fixes des virus) creusés dans le circuit.
   Les tourelles se posent sur le circuit (zones colorées), pas dans les couloirs. */
// 8 mondes de 5 zones, chacun avec son propre décor, ses obstacles et son ambiance
const WORLDS = [
  { name: 'Circuit imprimé', style: 'pcb', ic: '🔌', desc: 'Là où tout commence : pistes de cuivre, puces et robots de maintenance.', panel: ['#c62828', '#9a1313', '#6d0a0a'], obst: ['fan', 'sink', 'fan'], leds: ['#76ff03', '#ff1744', '#ffab00', '#00e5ff'] },
  { name: 'La Fournaise', style: 'forge', ic: '🔥', desc: 'Alimentation en surchauffe : le métal rougeoie et les braises volent.', panel: ['#ef6c00', '#a63f00', '#4e1a00'], obst: ['coil', 'sink', 'coil'], leds: ['#ff3d00', '#ffab00', '#ff6d00', '#ffd740'] },
  { name: 'Flux de données', style: 'data', ic: '💾', desc: 'Fibres optiques et disques : les paquets filent à la vitesse de la lumière.', panel: ['#1976d2', '#0d47a1', '#051e44'], obst: ['disk', 'disk', 'disk'], leds: ['#40c4ff', '#64ffda', '#18ffff', '#b388ff'] },
  { name: 'Salle des serveurs', style: 'rack', ic: '🗄', desc: 'Baies métalliques, câbles et ventilation : le réseau est attaqué.', panel: ['#7b8a95', '#4e5b64', '#262d33'], obst: ['fan', 'fan', 'fan'], leds: ['#76ff03', '#76ff03', '#00e5ff', '#ffab00'] },
  { name: 'Zone cryogénique', style: 'ice', ic: '❄', desc: 'Refroidissement extrême : le circuit est couvert de givre.', panel: ['#4fb3e8', '#1f78b4', '#0b3a63'], obst: ['tank', 'fan', 'tank'], leds: ['#b3e5fc', '#80deea', '#ffffff', '#40c4ff'] },
  { name: 'Cyberespace', style: 'neon', ic: '🌐', desc: 'Au cœur du code : néons, hologrammes et IA corrompue.', panel: ['#9c27b0', '#5e1272', '#23062e'], obst: ['holo', 'holo', 'holo'], leds: ['#ff2bd6', '#00e5ff', '#ffea00', '#ff1744'] },
  { name: 'Ordinateur rétro', style: 'retro', ic: '🕹', desc: 'Un vieux PC 8 bits : disquettes, câbles en nappe et écrans cathodiques.', panel: ['#c49a5a', '#8a6232', '#3f2a12'], obst: ['crt', 'floppy', 'crt'], leds: ['#ff3d00', '#76ff03', '#ffab00', '#ff3d00'] },
  { name: 'Le Nuage', style: 'cloud', ic: '☁', desc: 'Les serveurs du cloud flottent dans le ciel… et l\'orage gronde.', panel: ['#5c9ce6', '#2f6bb8', '#16365f'], obst: ['antenna', 'cumulus', 'antenna'], leds: ['#40c4ff', '#ffffff', '#b388ff', '#40c4ff'] }
];
const worldIdx = mi => (MAPS[mi] && MAPS[mi].world !== undefined) ? MAPS[mi].world : Math.min(WORLDS.length - 1, Math.floor(mi / 3));
const worldOf = mi => WORLDS[worldIdx(mi)];
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
    paths: [[[0, 1], [11, 1], [11, 4], [2, 4], [2, 7], [12, 7]], [[25, 1], [14, 1], [14, 4], [23, 4], [23, 7], [12, 7]], [[6, 14], [6, 10], [19, 10], [19, 14]]] },
  // monde 7 : ordinateur rétro
  { name: 'Disquette', base: '#cdb68a', acc: '#ff6d00', waves: 50,
    paths: [[[0, 2], [20, 2], [20, 6], [5, 6], [5, 10], [22, 10], [22, 13], [25, 13]], [[13, 14], [13, 10]]] },
  { name: 'Console 8 bits', base: '#bfa577', acc: '#76ff03', waves: 55,
    paths: [[[0, 7], [4, 7], [4, 2], [12, 2], [12, 12], [20, 12], [20, 4], [25, 4]], [[8, 14], [8, 9], [12, 9]], [[25, 10], [23, 10], [23, 13], [20, 13], [20, 12]]] },
  { name: 'Ordinateur central', base: '#a88f63', acc: '#ffab00', waves: 60,
    paths: [[[0, 1], [9, 1], [9, 5], [3, 5], [3, 10], [11, 10], [11, 7], [13, 7]], [[25, 1], [16, 1], [16, 5], [22, 5], [22, 10], [15, 10], [15, 7], [13, 7]], [[13, 14], [13, 7]]] },
  // monde 8 : le Nuage
  { name: 'Nuage public', base: '#6fa8dc', acc: '#ffffff', waves: 55,
    paths: [[[0, 3], [8, 3], [8, 1], [17, 1], [17, 6], [3, 6], [3, 11], [24, 11], [24, 8], [21, 8], [21, 13], [25, 13]], [[12, 14], [12, 11]]] },
  { name: 'Antenne relais', base: '#5b8fc9', acc: '#b388ff', waves: 60,
    paths: [[[0, 1], [24, 1], [24, 5], [2, 5], [2, 9], [24, 9], [24, 13], [0, 13]], [[12, 14], [12, 13]], [[25, 7], [20, 7], [20, 9]]] },
  { name: 'Orage numérique', base: '#3d5f8f', acc: '#ffea00', waves: 65,
    paths: [[[0, 2], [6, 2], [6, 12], [12, 12], [12, 2], [18, 2], [18, 12], [25, 12]], [[25, 2], [22, 2], [22, 7], [18, 7]], [[9, 0], [9, 7], [12, 7]]] },
  // 2 zones de plus par monde (ajoutées à la fin pour garder les numéros des sauvegardes ; leur place dans la campagne est donnée par CORDER)
  { name: 'Port PCI', world: 0, base: '#2a6b3a', acc: '#c6ff00', waves: 26,
    paths: [[[0, 3], [5, 3], [5, 8], [11, 8], [11, 12], [14, 12], [14, 6], [20, 6], [20, 10], [24, 10], [24, 1], [25, 1]]] },
  { name: 'Pile BIOS', world: 0, base: '#1d5c4a', acc: '#ffd740', waves: 28,
    paths: [[[0, 10], [4, 10], [4, 4], [9, 4], [9, 9], [15, 9], [15, 5], [18, 5], [18, 1], [24, 1], [24, 9], [25, 9]], [[12, 0], [12, 9]]] },
  { name: 'Fusible', world: 1, base: '#40231a', acc: '#ff9100', waves: 36,
    paths: [[[0, 10], [6, 10], [6, 5], [11, 5], [11, 12], [17, 12], [17, 7], [21, 7], [21, 1], [25, 1]]] },
  { name: 'Transformateur', world: 1, base: '#3b1a12', acc: '#ff5722', waves: 38,
    paths: [[[0, 13], [4, 13], [4, 4], [7, 4], [7, 8], [12, 8], [12, 3], [15, 3], [15, 10], [19, 10], [19, 5], [22, 5], [22, 13], [25, 13]], [[7, 14], [7, 8]]] },
  { name: 'Fibre optique', world: 2, base: '#0a2440', acc: '#18ffff', waves: 36,
    paths: [[[0, 12], [6, 12], [6, 3], [12, 3], [12, 13], [18, 13], [18, 5], [23, 5], [23, 9], [25, 9]]] },
  { name: 'Cache L3', world: 2, base: '#101a44', acc: '#7c4dff', waves: 38,
    paths: [[[0, 12], [4, 12], [4, 3], [8, 3], [8, 11], [13, 11], [13, 1], [16, 1], [16, 6], [19, 6], [19, 2], [22, 2], [22, 7], [25, 7]], [[11, 0], [11, 11]]] },
  { name: 'Routeur', world: 3, base: '#59636b', acc: '#76ff03', waves: 42,
    paths: [[[0, 5], [6, 5], [6, 10], [9, 10], [9, 5], [15, 5], [15, 10], [18, 10], [18, 1], [24, 1], [24, 11], [25, 11]], [[6, 14], [6, 10]]] },
  { name: 'Baie de stockage', world: 3, base: '#4b5157', acc: '#ffab00', waves: 48,
    paths: [[[0, 5], [3, 5], [3, 12], [8, 12], [8, 3], [14, 3], [14, 7], [17, 7], [17, 13], [22, 13], [22, 5], [25, 5]], [[15, 14], [15, 7]], [[12, 14], [12, 3]]] },
  { name: 'Watercooling', world: 4, base: '#2e6f95', acc: '#b3e5fc', waves: 45,
    paths: [[[0, 8], [5, 8], [5, 13], [10, 13], [10, 2], [13, 2], [13, 13], [18, 13], [18, 8], [24, 8], [24, 2], [25, 2]]] },
  { name: 'Chambre froide', world: 4, base: '#26587c', acc: '#80d8ff', waves: 47,
    paths: [[[0, 7], [4, 7], [4, 2], [10, 2], [10, 8], [14, 8], [14, 2], [19, 2], [19, 10], [23, 10], [23, 1], [25, 1]], [[4, 14], [4, 7]]] },
  { name: 'Réseau neuronal', world: 5, base: '#1a0a2e', acc: '#00e5ff', waves: 52,
    paths: [[[0, 1], [3, 1], [3, 9], [7, 9], [7, 1], [13, 1], [13, 8], [17, 8], [17, 3], [21, 3], [21, 9], [24, 9], [24, 1], [25, 1]], [[3, 14], [3, 9]]] },
  { name: 'Faille du code', world: 5, base: '#14031f', acc: '#ff4081', waves: 56,
    paths: [[[0, 11], [4, 11], [4, 4], [7, 4], [7, 8], [10, 8], [10, 13], [16, 13], [16, 5], [21, 5], [21, 12], [25, 12]], [[13, 0], [13, 13]], [[6, 0], [6, 4]]] },
  { name: 'Cartouche', world: 6, base: '#c4a978', acc: '#ff3d00', waves: 56,
    paths: [[[0, 9], [4, 9], [4, 3], [8, 3], [8, 8], [13, 8], [13, 1], [16, 1], [16, 10], [19, 10], [19, 3], [22, 3], [22, 10], [25, 10]]] },
  { name: 'Clavier mécanique', world: 6, base: '#b89d6c', acc: '#ffd600', waves: 58,
    paths: [[[0, 4], [3, 4], [3, 13], [7, 13], [7, 3], [11, 3], [11, 7], [17, 7], [17, 13], [23, 13], [23, 3], [25, 3]], [[17, 0], [17, 7]], [[3, 0], [3, 4]]] },
  { name: 'Serveur miroir', world: 7, base: '#6b9fd6', acc: '#e1f5fe', waves: 58,
    paths: [[[0, 8], [4, 8], [4, 2], [7, 2], [7, 7], [11, 7], [11, 2], [15, 2], [15, 9], [20, 9], [20, 4], [25, 4]], [[4, 14], [4, 8]], [[11, 14], [11, 7]]] },
  { name: 'Tempête de données', world: 7, base: '#4a73a8', acc: '#ff80ab', waves: 62,
    paths: [[[0, 5], [6, 5], [6, 1], [11, 1], [11, 8], [16, 8], [16, 1], [19, 1], [19, 13], [25, 13]], [[13, 0], [13, 8]], [[5, 14], [5, 5]]] }
];
const NCAMP = MAPS.length; // zones de la campagne ; l'emplacement MAPS[NCAMP] sert aux niveaux créés et aléatoires
// ordre de la campagne : 5 zones par monde (zone 1, zone 2, les 2 nouvelles, puis la zone 3, la plus dure)
const ZPW = 5, CORDER = [], CPOS = [];
for (let w = 0; w < 8; w++) CORDER.push(w * 3, w * 3 + 1, 24 + w * 2, 25 + w * 2, w * 3 + 2);
CORDER.forEach((mi, p) => { CPOS[mi] = p; });
const zoneOpen = mi => CPOS[mi] < save.unlocked[curDiff];       // zone débloquée dans la difficulté choisie
const nextZone = mi => CORDER[CPOS[mi] + 1];                     // zone suivante de la campagne (undefined à la fin)
const lastZone = () => CORDER[NCAMP - 1];
const zoneHpK = mi => 1 + (mi < NCAMP ? CPOS[mi] * .015 : .6);    // les virus se renforcent au fil de la campagne
// cases traversées par un chemin (liste de points alignés)
function pathTiles(p) { const out = []; for (let i = 0; i < p.length - 1; i++) { let [x, y] = p[i]; const [x2, y2] = p[i + 1]; while (true) { if (!out.length || out[out.length - 1][0] !== x || out[out.length - 1][1] !== y) out.push([x, y]); if (x === x2 && y === y2) break; x += Math.sign(x2 - x); y += Math.sign(y2 - y); } } return out; }
// fabrique la grille à partir des chemins : '#' circuit, '.' couloir, 'S' entrée, 'E' sortie
function processMap(m, seed) {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill('#'));
  for (const p of m.paths) for (let i = 0; i < p.length - 1; i++) {
    let [x, y] = p[i]; const [x2, y2] = p[i + 1];
    while (true) { g[y][x] = '.'; if (x === x2 && y === y2) break; x += Math.sign(x2 - x); y += Math.sign(y2 - y); }
  }
  // liste des cases de chaque chemin
  const tilesOf = p => { const out = []; for (let i = 0; i < p.length - 1; i++) { let [x, y] = p[i]; const [x2, y2] = p[i + 1]; while (true) { if (!out.length || out[out.length - 1][0] !== x || out[out.length - 1][1] !== y) out.push([x, y]); if (x === x2 && y === y2) break; x += Math.sign(x2 - x); y += Math.sign(y2 - y); } } return out; };
  const T = m.paths.map(tilesOf);
  // un chemin qui part du bord est une entrée ; un chemin qui part du milieu d'un autre couloir est une division (embranchement)
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const isBranch = T.map((t, i) => t.length && !(t[0][0] === 0 || t[0][1] === 0 || t[0][0] === COLS - 1 || t[0][1] === ROWS - 1) && T.some((o, j) => j !== i && o.some(q => same(q, t[0]))));
  // tous les trajets possibles depuis la case s du chemin i (division = plusieurs trajets)
  const routesFrom = (i, s, depth) => {
    const Ti = T[i], out = [], endT = Ti[Ti.length - 1];
    if (depth > 6) return [Ti.slice(s)];
    let splitAtEnd = false;
    for (let t = s; t < Ti.length; t++) for (let j = 0; j < T.length; j++) if (j !== i && isBranch[j] && same(T[j][0], Ti[t])) {
      if (t === Ti.length - 1) splitAtEnd = true;
      for (const r of routesFrom(j, 0, depth + 1)) out.push(Ti.slice(s, t).concat(r));
    }
    if (!splitAtEnd) {
      let merged = false;
      for (let j = 0; j < T.length && !merged; j++) {
        if (j === i) continue;
        const k = T[j].findIndex(q => same(q, endT));
        if (k >= 0 && k < T[j].length - 1 && !(k === 0 && isBranch[j])) { for (const r of routesFrom(j, k, depth + 1)) out.push(Ti.slice(s, Ti.length - 1).concat(r)); merged = true; }
      }
      if (!merged) out.push(Ti.slice(s));
    }
    return out.slice(0, 16);
  };
  m.routes = []; m.entries = [];
  T.forEach((t, i) => { if (isBranch[i] || !t.length) return; const rs = routesFrom(i, 0, 0), idx = []; for (const r of rs) { idx.push(m.routes.length); m.routes.push(r); } m.entries.push(idx); });
  for (const r of m.routes) { const e = r[r.length - 1]; g[e[1]][e[0]] = 'E'; }
  m.branchAt = T.filter((t, i) => isBranch[i]).map(t => t[0]);
  for (const r of m.routes) { const [sx, sy] = r[0]; g[sy][sx] = 'S'; }
  // gros composants décoratifs (2x2) posés loin des couloirs : on ne peut pas construire dessus
  const Rn = mulberry(seed * 131 + 7), wk = m.world !== undefined ? m.world : Math.min(WORLDS.length - 1, Math.floor(seed / 3)); m.obst = [];
  if (m.obstC) { for (const [x, y] of m.obstC) if (g[y] && g[y][x] === '#') { g[y][x] = 'X'; m.obst.push({ kind: 'block', x, y }); } }
  if (m.bonusC) m.bonus = m.bonusC.filter(([x, y]) => g[y] && g[y][x] === '#');
  for (let k = 0, tries = 0; k < (m.obstC ? 0 : 3) && tries < 400; tries++) {
    const x = 1 + Math.floor(Rn() * (COLS - 3)), y = 1 + Math.floor(Rn() * (ROWS - 3));
    let ok = true;
    for (let yy = y - 1; yy <= y + 2 && ok; yy++) for (let xx = x - 1; xx <= x + 2; xx++) if (g[yy] && g[yy][xx] !== undefined && g[yy][xx] !== '#') { ok = false; break; }
    if (!ok) continue;
    for (let yy = y; yy <= y + 1; yy++) for (let xx = x; xx <= x + 1; xx++) g[yy][xx] = 'X';
    m.obst.push({ kind: WORLDS[wk].obst[k], x, y }); k++;
  }
  m.g = g.map(r => r.join(''));
  return m;
}
MAPS.forEach((m, i) => processMap(m, i));

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
  cannon: { name: 'Canon', cost: 30, range: 2.7, rate: .6, dmg: 11, splash: .8, col: '#ffab40', proj: 'shell', spd: 6, ground: true, desc: 'Obus explosifs. Ne touche pas les volants.' },
  frost: { name: 'Cryo', cost: 35, range: 2.3, rate: 1, dmg: 2, slow: .5, slowT: 1.6, splash: .7, col: '#4fc3f7', proj: 'ice', spd: 8, desc: 'Gèle et ralentit les virus.' },
  laser: { name: 'Laser', cost: 100, range: 4.2, rate: .55, dmg: 75, col: '#ff3d3d', proj: 'beam', desc: 'Très longue portée, dégâts énormes.' },
  tesla: { name: 'Tesla', cost: 150, range: 2.8, rate: 1.1, dmg: 22, chain: 4, col: '#ffe600', proj: 'chain', desc: 'Éclair qui rebondit sur plusieurs virus.' },
  flame: { name: 'Lance-flammes', short: 'Flammes', cost: 60, range: 1.9, rate: 8, dmg: 1.4, burn: 5, col: '#ff6d00', proj: 'flame', desc: 'Brûle tous les virus devant lui.' },
  missile: { name: 'Lance-missiles', short: 'Missiles', cost: 90, range: 4.5, rate: .45, dmg: 42, splash: .9, col: '#ff5252', proj: 'missile', spd: 3, desc: 'Missiles à tête chercheuse, longue portée.' },
  boost: { name: 'Amplificateur', short: 'Ampli', cost: 120, range: 1.6, rate: 0, dmg: 0, col: '#00e676', proj: 'none', desc: 'Augmente les dégâts des tourelles voisines.' },
  miner: { name: 'Mineur crypto', short: 'Mineur', cost: 70, range: 0, rate: 0, dmg: 0, col: '#ffd740', proj: 'none', desc: 'Rapporte des crédits à chaque vague.' },
  mine: { name: 'Poseur de mines', short: 'Mines', cost: 75, range: 2.4, rate: .7, dmg: 30, splash: .9, col: '#8bc34a', proj: 'mine', ground: true, desc: 'Sème des mines dans le couloir, qui explosent au passage des virus.' },
  vortex: { name: 'Vortex', cost: 140, range: 2.2, rate: .3, dmg: 8, col: '#7c4dff', proj: 'vortex', desc: 'Impulsion gravitationnelle qui renvoie les virus en arrière.' }
};
// ---- chaque monde donne son style aux tourelles : [famille de dessin, variante] ----
// moderne = tourelles high-tech, retro = bois/pierre/fer (catapultes…), neo = néon futuriste, ice = glace, mil = militaire
const WTSTYLE = { pcb: ['modern', 'classic'], forge: ['retro', 'forge'], data: ['glass', 'data'], rack: ['mil', 'mil'], ice: ['ice', 'ice'], neon: ['neo', 'neon'], retro: ['retro', 'wood'], cloud: ['sky', 'cloud'] };
let shopWorld = null; // monde choisi dans la boutique pour l'aperçu
const curWorld = () => shopWorld !== null ? shopWorld : (G ? worldIdx(G.mi) : 0);
const curTS = () => WTSTYLE[WORLDS[curWorld()].style] || WTSTYLE.pcb;
const curStyle = () => curTS()[0];
// [nom, nom court, description]
const TNAMES = {
  retro: {
    pulse: ['Arbalète', 0, 'Pas chère : des carreaux pour couvrir les couloirs.'], gatling: ['Baliste', 0, 'Tire des volées de flèches très rapides.'],
    cannon: ['Catapulte', 0, 'Lance de gros rochers. Ne touche pas les volants.'], frost: ['Chaudron givré', 'Givre', 'Potion glacée qui ralentit les virus.'],
    flame: ['Tête de dragon', 'Dragon', 'Crache du feu sur tous les virus devant lui.'], missile: ['Trébuchet', 0, 'Boules de feu guidées, très longue portée.'],
    laser: ['Tour du mage', 'Mage', 'Rayon magique : longue portée, dégâts énormes.'], tesla: ['Pilier runique', 'Runes', 'Foudre magique qui rebondit sur plusieurs virus.'],
    mine: ['Poudrière', 0, 'Sème des tonneaux de poudre qui explosent au passage des virus.'], vortex: ['Moulin à vent', 'Moulin', 'Ses ailes soufflent les virus en arrière.'],
    boost: ['Tambour de guerre', 'Tambour', 'Encourage les tourelles voisines : plus de dégâts.'], miner: ['Coffre au trésor', 'Trésor', 'Rapporte des pièces d\'or à chaque vague.']
  },
  ice: {
    pulse: ['Lance-glaçons', 'Glaçons'], gatling: ['Mitraille de grêle', 'Grêle'], cannon: ['Canon à neige', 'Neige', 'Boules de neige explosives. Ne touche pas les volants.'],
    frost: ['Blizzard', 0], flame: ['Chalumeau', 0], missile: ['Avalanche', 0, 'Blocs de glace guidés, très longue portée.'], laser: ['Rayon aurore', 'Aurore'],
    tesla: ['Cristal d\'orage', 'Cristal'], mine: ['Mines de glace', 'Mines'], vortex: ['Tourbillon de neige', 'Tourbillon'], boost: ['Totem polaire', 'Totem'], miner: ['Pêche sur glace', 'Pêche']
  },
  mil: {
    pulse: ['Fusil d\'assaut', 'Fusil'], gatling: ['Minigun', 0], cannon: ['Mortier', 0], frost: ['Canon à azote', 'Azote'], flame: ['Lance-feu', 0],
    missile: ['Lance-roquettes', 'Roquettes'], laser: ['Sniper', 0, 'Tir de précision : très longue portée, dégâts énormes.'], tesla: ['Brouilleur EMP', 'EMP'],
    mine: ['Champ de mines', 'Mines'], vortex: ['Canon sonique', 'Sonique'], boost: ['Radar de commandement', 'Radar'], miner: ['Caisse de ravitaillement', 'Ravitaill.']
  },
  glass: {
    pulse: ['Paquet laser', 'Paquet'], gatling: ['Flux rafale', 'Flux'], cannon: ['Compresseur', 'Compress.', 'Écrase les virus sous des archives compressées. Ne touche pas les volants.'],
    frost: ['Pare-feu glacé', 'Pare-feu'], flame: ['Surchauffe', 0], missile: ['Requêtes guidées', 'Requêtes'], laser: ['Fibre optique', 'Fibre'], tesla: ['Routeur éclair', 'Routeur'],
    mine: ['Paquets piégés', 'Pièges'], vortex: ['Boucle infinie', 'Boucle'], boost: ['Serveur proxy', 'Proxy'], miner: ['Data-mineur', 'Data-min.']
  },
  sky: {
    pulse: ['Grêlon', 0], gatling: ['Averse', 0], cannon: ['Coup de tonnerre', 'Tonnerre'], frost: ['Nuage de givre', 'Givre'], flame: ['Soleil ardent', 'Soleil'],
    missile: ['Comètes', 0, 'Comètes guidées, très longue portée.'], laser: ['Rayon de soleil', 'Rayon'], tesla: ['Orage', 0], mine: ['Nuages piégés', 'Pièges'],
    vortex: ['Tornade', 0], boost: ['Arc-en-ciel', 0, 'Ses couleurs encouragent les tourelles voisines : plus de dégâts.'], miner: ['Pluie d\'or', 0]
  },
  neo: {
    pulse: ['Blaster ionique', 'Blaster'], gatling: ['Plasma-rafale', 'Rafale'], cannon: ['Canon gravitique', 'Gravité'], frost: ['Champ de stase', 'Stase'],
    flame: ['Lance-plasma', 'Plasma'], missile: ['Essaim de drones', 'Drones'], laser: ['Rayon photonique', 'Photon'], tesla: ['Arc quantique', 'Arc'],
    mine: ['Mines plasma', 'Mines'], vortex: ['Trou noir', 0], boost: ['Nexus', 0], miner: ['Mineur quantique', 'Q-Mineur']
  }
};
const tName = (k, short) => { const n = (TNAMES[curStyle()] || {})[k]; return n ? (short && n[1] || n[0]) : (short && TOWERS[k].short || TOWERS[k].name); };
const tDesc = k => { const n = (TNAMES[curStyle()] || {})[k]; return n && n[2] || TOWERS[k].desc; };
const TORDER = ['pulse', 'gatling', 'cannon', 'frost', 'flame', 'missile', 'laser', 'tesla', 'mine', 'vortex', 'boost', 'miner'];
const TMAX = 5, UPMULT = [.8, 1.4, 2.4, 4];
// au niveau 5, chaque tourelle choisit une voie : A (pouvoir historique) ou B
const PATHS = {
  pulse: [['Double tir', 'vise 2 virus à la fois'], ['Pulseur lourd', 'dégâts ×2,2 et portée +0,5']],
  gatling: [['Balles perforantes', 'ignorent le blindage'], ['Balles incendiaires', 'enflamment les virus touchés']],
  cannon: [['Méga-obus', 'explosion géante qui étourdit'], ['Mortier', 'portée +1,5, dégâts ×1,2, plus lent']],
  frost: [['Gel total', 'peut congeler les virus sur place'], ['Blizzard', 'zone de gel ×2 et ralentit encore plus']],
  flame: [['Napalm', 'brûlure deux fois plus forte'], ['Plasma bleu', 'portée +1 et ignore le blindage']],
  missile: [['Salve', 'tire 3 missiles à la fois'], ['Ogive lourde', 'un énorme missile : dégâts ×3, zone ×1,8']],
  laser: [['Rayon perforant', 'traverse tous les virus alignés'], ['Surchauffe', 'dégâts qui montent jusqu\'à ×3 sur la même cible']],
  tesla: [['Surcharge', '+3 rebonds et étourdit'], ['Tempête', 'frappe TOUS les virus à portée']],
  boost: [['Surpuissance', '+60 % de dégâts aux voisines'], ['Accélérateur', '+40 % de cadence aux voisines']],
  miner: [['Ferme de minage', 'gains doublés'], ['Banque', '+6 % de tes crédits à chaque vague (max 60)']],
  mine: [['Fragmentation', 'explosions 50 % plus larges qui étourdissent'], ['Mines collantes', 'engluent les virus (très ralentis 3 s)']],
  vortex: [['Trou noir', 'renvoie 3 cases en arrière, dégâts ×2'], ['Distorsion', 'portée +1 et ralentit les virus repoussés']]
};
const PATHCOL = ['#ffd740', '#40c4ff'];
const SPECIAL = {}, SPECIALB = {};
for (const k in PATHS) { SPECIAL[k] = PATHS[k][0][0] + ' : ' + PATHS[k][0][1]; SPECIALB[k] = PATHS[k][1][0] + ' : ' + PATHS[k][1][1]; }
const MODES = ['first', 'last', 'strong', 'close', 'support', 'special'], MODE_NAMES = { first: 'Premier', last: 'Dernier', strong: 'Plus fort', close: 'Plus proche', support: 'Soigneurs d\'abord', special: 'Spéciaux d\'abord' };
function tStats(type, lvl, path) {
  const d = TOWERS[type], k = lvl - 1, A = lvl >= 5 && path !== 1, B = lvl >= 5 && path === 1;
  const s = {
    dmg: d.dmg * Math.pow(1.55, k) * (1 + .08 * resLvl(type)) * (1 + .1 * prestige()), range: (d.range + .25 * k) * (1 + .03 * resLvl(type)), rate: d.rate * Math.pow(1.12, k),
    splash: d.splash ? (d.splash + (type === 'cannon' ? .08 : .12) * k) * (A && type === 'cannon' ? 1.4 : 1) : 0, slow: d.slow ? Math.max(.25, d.slow - .07 * k) : 0, slowT: d.slowT ? d.slowT + .3 * k : 0,
    chain: d.chain ? d.chain + k + (A ? 3 : 0) : 0, special: A, alt: B,
    burn: d.burn ? d.burn * Math.pow(1.4, k) * (A ? 2 : 1) : 0,
    boost: type === 'boost' ? (A ? .6 : .2 + .08 * Math.min(k, 3)) : 0, gain: type === 'miner' ? (3 + 2 * k) * (A ? 2 : 1) : 0
  };
  if (B) switch (type) {
    case 'pulse': s.dmg *= 2.2; s.range += .5; break;
    case 'gatling': s.incend = true; break;
    case 'cannon': s.range += 1.5; s.dmg *= 1.2; s.rate *= .75; break;
    case 'frost': s.splash *= 2; s.slow = Math.max(.15, s.slow - .15); break;
    case 'flame': s.range += 1; s.pierce = true; break;
    case 'missile': s.dmg *= 3; s.splash *= 1.8; s.rate *= .8; break;
    case 'laser': s.ramp = true; break;
    case 'tesla': s.storm = true; break;
    case 'boost': s.boost = .2; s.rateB = .4; break;
    case 'miner': s.bank = true; break;
    case 'mine': s.sticky = true; break;
    case 'vortex': s.range += 1; s.warp = true; break;
  }
  if (type === 'mine') { s.maxMines = 3 + k + (A ? 2 : 0); if (A) { s.splash *= 1.5; s.stun = .6; } }
  if (type === 'vortex') { s.push = 1 + (k >= 2 ? 1 : 0) + (A ? 1 : 0); if (A) s.dmg *= 2; }
  return s;
}
const upCost = t => Math.round(TOWERS[t.type].cost * UPMULT[t.lvl - 1]);
/* ---------------- boutique (puces ⬢ gagnées à chaque partie) ---------------- */
const UNLOCK = { pulse: 0, gatling: 0, cannon: 0, frost: 60, flame: 90, missile: 130, laser: 170, tesla: 220, boost: 260, miner: 200, mine: 150, vortex: 240 };
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
const prestige = () => isDemo() ? 0 : (save.prestige || 0);
const prestigeReady = () => Object.keys(save.stars || {}).some(k => k.endsWith(lastZone() + 'won'));
const resLvl = k => isDemo() ? 3 : ((save.research || {})[k] || 0);
const gup = k => isDemo() ? 0 : ((save.gup || {})[k] || 0);
const unlockedT = k => isDemo() || (G && G.allowed ? G.allowed.includes(k) : (G && G.daily) || UNLOCK[k] === 0 || !!(save.unlockT || {})[k]);
const tCost = k => Math.round(TOWERS[k].cost * (resLvl(k) >= 5 ? .9 : 1) * (G && G.muts && G.muts.pricey ? 1.3 : 1));
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
  // 2 virus de plus par monde
  capa: { name: 'Condensateur', hp: 26, spd: 1.1, rew: 3, col: '#ffb300', r: .29, int: 1, n: 8, armor: 1, shield: .5, world: 0 },
  chipset: { name: 'Puce mère', hp: 40, spd: .9, rew: 4, col: '#43a047', r: .33, int: 1.3, n: 6, armor: 1.5, onDeath: ['bug', 3], world: 0 },
  slag: { name: 'Scorie', hp: 45, spd: .8, rew: 4, col: '#6d4c41', r: .33, int: 1.3, n: 6, armor: 3.5, fireproof: true, world: 1 },
  phoenix: { name: 'Phénix', hp: 16, spd: 1.7, rew: 3, col: '#ff9100', r: .27, int: .9, n: 8, fly: true, fireproof: true, revive: true, world: 1 },
  byte: { name: 'Octet', hp: 22, spd: 1.4, rew: 3, col: '#00e5ff', r: .28, int: .9, n: 8, split3: true, world: 2 },
  stream: { name: 'Flux', hp: 12, spd: 2.4, rew: 2, col: '#7c4dff', r: .23, int: .5, n: 12, jump: true, noslow: true, world: 2 },
  firewall: { name: 'Pare-feu', hp: 30, spd: .95, rew: 4, col: '#ff7043', r: .31, int: 1.2, n: 6, armor: 2, shield: .9, world: 3 },
  spam: { name: 'Spam', hp: 3, spd: 2.2, rew: 1, col: '#cddc39', r: .17, int: .18, n: 26, world: 3 },
  yeti: { name: 'Yéti', hp: 90, spd: .7, rew: 7, col: '#eceff1', r: .42, int: 2, n: 3, lives: 2, armor: 2, noslow: true, world: 4 },
  flake: { name: 'Flocon', hp: 10, spd: 1.8, rew: 2, col: '#b3e5fc', r: .22, int: .5, n: 12, fly: true, noslow: true, world: 4 },
  spectre: { name: 'Spectre', hp: 14, spd: 2.1, rew: 3, col: '#18ffff', r: .25, int: .7, n: 9, ghost: true, world: 5 },
  replicant: { name: 'Réplicant', hp: 24, spd: 1.2, rew: 3, col: '#d500f9', r: .28, int: 1.1, n: 7, heal: .1, clone: true, world: 5 },
  knight: { name: 'Chevalier', hp: 40, spd: .95, rew: 4, col: '#b0bec5', r: .31, int: 1.2, n: 6, armor: 3, shield: .4, world: 6 },
  invader: { name: 'Envahisseur', hp: 18, spd: 1.4, rew: 2, col: '#76ff03', r: .26, int: .8, n: 10, jump: true, world: 6 },
  droplet: { name: 'Goutte', hp: 5, spd: 2, rew: 1, col: '#4fc3f7', r: .18, int: .25, n: 18, fly: true, world: 7 },
  thunder: { name: 'Cumulonimbus', hp: 35, spd: 1, rew: 4, col: '#78909c', r: .33, int: 1.2, n: 6, fly: true, regen: .05, onDeath: ['droplet', 3], world: 7 },
  // boss de fin de monde (dernière vague de chaque zone)
  kernel: { name: 'Ver Kernel', hp: 900, spd: .55, rew: 90, col: '#76ff03', r: .55, int: 3, n: 1, lives: 10, armor: 3, boss: 2, world: 0 },
  magma: { name: 'Titan de magma', hp: 1100, spd: .5, rew: 100, col: '#ff3d00', r: .58, int: 3, n: 1, lives: 10, armor: 4, boss: 2, fireproof: true, heatwave: true, world: 1 },
  trojan: { name: 'Cheval de Troie', hp: 1000, spd: .6, rew: 100, col: '#8d6e63', r: .56, int: 3, n: 1, lives: 10, armor: 4, boss: 2, trojan: true, world: 2 },
  ddos: { name: 'Botnet DDoS', hp: 1000, spd: .5, rew: 110, col: '#ffab00', r: .55, int: 3, n: 1, lives: 10, armor: 3, boss: 2, summon: true, world: 3 },
  glacier: { name: 'Glacier', hp: 1300, spd: .45, rew: 120, col: '#80d8ff', r: .6, int: 3, n: 1, lives: 10, armor: 6, boss: 2, noslow: true, chill: true, shield: .4, world: 4 },
  pixel: { name: 'Pixel', hp: 20, spd: 1.35, rew: 2, col: '#ff6d00', r: .27, int: .8, n: 9, split3: true, world: 6 },
  bit: { name: 'Bit', hp: 5, spd: 2.2, rew: 1, col: '#ffab00', r: .15, int: .3, n: 1 },
  drone: { name: 'Drone', hp: 14, spd: 2.2, rew: 2, col: '#e3f2fd', r: .24, int: .55, n: 12, fly: true, world: 7 },
  mainframe: { name: 'Ordinateur central', hp: 1400, spd: .45, rew: 150, col: '#d7b67a', r: .6, int: 3, n: 1, lives: 10, armor: 7, boss: 2, protect: true, world: 6 },
  tempest: { name: 'Tempête', hp: 1250, spd: .55, rew: 160, col: '#90caf9', r: .58, int: 3, n: 1, lives: 10, armor: 4, boss: 2, fly: true, storm: true, world: 7 },
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
  pixel: 'Ordinateur rétro : se brise en 3 bits quand il meurt.', bit: 'Morceau d\'un pixel, petit et rapide.', drone: 'Le Nuage : drone volant très rapide.',
  mainframe: 'BOSS de l\'Ordinateur rétro. Très blindé, il donne un bouclier aux virus autour de lui.', tempest: 'BOSS du Nuage. Il vole, appelle des drones et foudroie tes tourelles.',
  capa: 'Circuit imprimé : chargé, il se protège derrière une bulle d\'énergie.', chipset: 'Circuit imprimé : blindé, libère 3 virus en mourant.',
  slag: 'La Fournaise : bloc de lave très blindé, insensible au feu.', phoenix: 'La Fournaise : vole, insensible au feu, renaît une fois de ses cendres.',
  byte: 'Flux de données : se brise en 3 bits quand il meurt.', stream: 'Flux de données : ultra-rapide, saute plus loin, ne peut pas être ralenti.',
  firewall: 'Salle des serveurs : blindé et protégé par une grosse bulle d\'énergie.', spam: 'Salle des serveurs : arrive par dizaines, très fragile.',
  yeti: 'Zone cryogénique : énorme, insensible au gel, coûte 2 vies.', flake: 'Zone cryogénique : flocon volant, insensible au gel.',
  spectre: 'Cyberespace : rapide et intouchable par moments.', replicant: 'Cyberespace : soigne ses voisins et se duplique quand il est blessé.',
  knight: 'Ordinateur rétro : armure lourde et bouclier.', invader: 'Ordinateur rétro : envahisseur 8 bits qui saute plus loin.',
  droplet: 'Le Nuage : petite goutte volante qui arrive en averse.', thunder: 'Le Nuage : nuage d\'orage volant qui se régénère et lâche 3 gouttes en mourant.',
  glacier: 'BOSS de la Zone cryogénique. Bouclier, ne peut pas être ralenti et gèle les tourelles.', aicore: 'BOSS du Cyberespace. Devient intouchable, se soigne et pirate tes tourelles.'
};
const isBoss = e => !!ETYPES[e.type].boss;
// couleurs (mode daltonien : bleu / orange au lieu de vert / rouge)
const CBC = () => save.cb ? { ok: 'rgba(64,160,255,.35)', bad: 'rgba(255,150,0,.4)', cov: 'rgba(64,160,255,', nocov: 'rgba(255,150,0,.35)', hp: ['#42a5f5', '#ff9800'], rgb: '255,150,0', spawn: '#ff9800' }
  : { ok: 'rgba(100,255,120,.25)', bad: 'rgba(255,60,60,.3)', cov: 'rgba(105,240,174,', nocov: 'rgba(255,60,60,.28)', hp: ['#66bb6a', '#ef5350'], rgb: '255,40,40', spawn: '#ff5252' };
// pastille au-dessus des virus à surveiller : [symbole, couleur]
const BADGE = { healer: ['✚', '#2e7d32'], shield: ['◈', '#0277bd'], regen: ['♻', '#558b2f'], ghost: ['◌', '#5c6bc0'], zombie: ['☠', '#33691e'], glitch: ['⧉', '#ad1457'], splitter: ['÷', '#e65100'], pixel: ['÷', '#e65100'], giant: ['▲', '#6d4c41'], armor: ['■', '#455a64'], jumper: ['↟', '#689f38'], ember: ['🔥', '#bf360c'], cryo: ['❄', '#0288d1'], packet: ['»', '#00838f'] };
const SUPPORT = { healer: 1, shield: 1, regen: 1 };
const WBOSS = ['kernel', 'magma', 'trojan', 'ddos', 'glacier', 'aicore', 'mainframe', 'tempest'], WVIRUS = ['worm', 'ember', 'packet', 'zombie', 'cryo', 'glitch', 'pixel', 'drone'];
// les 3 virus exclusifs de chaque monde
const WVIR3 = [['worm', 'capa', 'chipset'], ['ember', 'slag', 'phoenix'], ['packet', 'byte', 'stream'], ['zombie', 'firewall', 'spam'], ['cryo', 'yeti', 'flake'], ['glitch', 'spectre', 'replicant'], ['pixel', 'knight', 'invader'], ['drone', 'droplet', 'thunder']];
// règles propres à chaque monde
const RULES = {
  pcb: { name: 'Apprentissage', desc: 'Pas de règle spéciale : le monde idéal pour apprendre.' },
  forge: { name: 'Surchauffe', desc: 'Cases brûlantes : +35 % de dégâts pour la tourelle posée dessus, mais elle s\'arrête 2 s toutes les 15 s.' },
  data: { name: 'Portails', desc: 'Des portails font sauter les virus plus loin dans leur couloir.' },
  rack: { name: 'Coupures de courant', desc: 'Régulièrement, une zone perd le courant : ses tourelles s\'éteignent 5 s.' },
  ice: { name: 'Verglas', desc: 'Les virus glissent 20 % plus vite, mais le gel dure 50 % plus longtemps.' },
  neon: { name: 'Piratage', desc: 'Des tourelles se font pirater : touche-les vite pour les réparer !' },
  retro: { name: 'Mémoire limitée', desc: '28 tourelles au maximum sur la carte : choisis-les bien !' },
  cloud: { name: 'Orages', desc: 'La foudre tombe régulièrement : elle grille les virus… et coupe les tourelles touchées.' }
};
function waveDef(w) {
  const g = G && !G.demo ? G : null, wi = g ? worldIdx(g.mi) : 0;
  if (g && g.m.wl && g.m.wl[w - 1]) { // vague composée à la main dans l'éditeur
    const gr = g.m.wl[w - 1].g, n = gr.reduce((a, x) => a + x.n, 0);
    const bg = gr.find(x => ETYPES[x.t].boss === 2) || gr.find(x => x.t === 'boss'), main = bg || gr[0], other = gr.find(x => x !== main && x.t !== main.t);
    return { groups: gr, type: main.t, n: main.n, type2: other ? other.t : undefined, n2: other ? other.n : 0, total: n, wboss: !!(bg && bg.t !== 'boss'), label: gr.map(x => x.n + ' × ' + ETYPES[x.t].name).join(' + ') };
  }
  if (g && g.m.vir) { // niveau créé : seulement les virus choisis, introduits un par un
    const V = g.m.vir, bk = g.m.bossK;
    if (w === g.total && bk !== '') return bk === 'auto' ? { type: WBOSS[Math.min(WBOSS.length - 1, wi)], n: 1, wboss: true } : { type: bk, n: bk === 'boss' ? 2 : 1, wboss: bk !== 'boss' };
    if (g.m.megas && w % 10 === 0) return { type: 'boss', n: Math.ceil(w / 20) };
    const avail = V.slice(0, Math.min(V.length, 1 + Math.floor((w - 1) / 2)));
    const type = (w - 1) % 2 === 0 && (w - 1) / 2 < V.length ? V[(w - 1) / 2] : avail[(w * 7 + 3) % avail.length];
    const res = { type, n: Math.round(ETYPES[type].n * (1 + w * .035)) };
    if (w >= 6 && avail.length > 1) { const t2 = avail[(w * 5 + 1) % avail.length]; if (t2 !== type) { res.type2 = t2; res.n2 = Math.round(ETYPES[t2].n * (.45 + w * .012)); } }
    return res;
  }
  if (g && !g.endless && w === g.total && !g.daily) return { type: WBOSS[Math.min(WBOSS.length - 1, wi)], n: 1, wboss: true };
  if (g && g.endless && w % 25 === 0) return { type: WBOSS[(w / 25 - 1 + wi) % WBOSS.length], n: 1 + Math.floor(w / 75), wboss: true };
  if (w % (g && g.mod === 'bosses' ? 5 : 10) === 0) return { type: 'boss', n: Math.ceil(w / 20) };
  const WL = WVIR3[Math.min(WVIR3.length - 1, wi)], wn = w >= 15 ? 3 : w >= 11 ? 2 : 1;
  if (g && w >= 7 && (w === 7 || w % 4 === 3)) { const t = w === 7 ? WL[0] : w === 11 ? WL[1] : w === 15 ? WL[2] : WL[(w >> 2) % wn]; return { type: t, n: Math.round(ETYPES[t].n * (1 + w * .025)) }; }
  const intro = { 1: 'bug', 3: 'runner', 5: 'swarm', 6: 'armor', 8: 'flyer', 12: 'regen', 14: 'splitter', 16: 'shield', 18: 'ghost', 21: 'healer', 24: 'giant', 27: 'jumper' };
  const avail = []; for (const k in intro) if (w >= +k) avail.push(intro[k]);
  const type = intro[w] || avail[(w * 7 + 3) % avail.length];
  const res = { type, n: Math.round(ETYPES[type].n * (1 + w * .035)) };
  if (w >= 9 && !intro[w]) { // à partir de la vague 9 : deux sortes de virus mélangées
    const t2 = avail[(w * 5 + 1) % avail.length];
    if (t2 !== type) { res.type2 = t2; res.n2 = Math.round(ETYPES[t2].n * (.45 + w * .012)); }
    if (g && w >= 12 && w % 3 === 0) { const t3 = WL[(w >> 1) % wn]; res.type2 = t3; res.n2 = Math.round(ETYPES[t3].n * (.4 + w * .01)); } // un virus du monde se mêle à la vague
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
for (const k in save.unlocked) if (save.unlocked[k] === 18 && (save.stars || {})[k + '17won']) save.unlocked[k] = 19; // nouveaux mondes : on ouvre la zone 19
if ((save.ordV || 0) < 2) { // 5 zones par monde : la progression (un nombre de zones dans l'ancien ordre) est convertie une fois
  for (const k in save.unlocked) { const u = clamp(save.unlocked[k] | 0, 1, 24); save.unlocked[k] = CPOS[u - 1] + 1; }
  save.ordV = 2; persist();
}
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
  { id: 'combo4', ic: '⚗', name: 'Alchimiste', desc: 'Découvre les 6 combinaisons', chips: 40 },
  { id: 'power', ic: '☄', name: 'Puissance de feu', desc: 'Utilise 25 pouvoirs actifs', chips: 15, test: S => S.powers >= 25 },
  { id: 'streak50', ic: '🔥', name: 'Carnage', desc: 'Fais une série de 50 virus détruits', chips: 20 },
  { id: 'perfect', ic: '🛡', name: 'Sans faute', desc: 'Gagne une zone sans perdre de vie', chips: 15 },
  { id: 'boss1', ic: '👑', name: 'Tueur de géants', desc: 'Détruis un boss de monde', chips: 20, test: S => S.bossKills >= 1 },
  { id: 'boss6', ic: '🏆', name: 'Maître des mondes', desc: 'Détruis les 6 boss de monde', chips: 80, test: S => Object.keys(S.bossSet || {}).length >= 6 },
  { id: 'boss8', ic: '🌩', name: 'Exorciste', desc: 'Détruis les 8 boss de monde', chips: 120, test: S => Object.keys(S.bossSet || {}).length >= WBOSS.length },
  { id: 'prestige', ic: '♛', name: 'Renaissance', desc: 'Passe un niveau de prestige', chips: 50, test: () => (save.prestige || 0) >= 1 },
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
function checkAch() { checkMissions(); const S = save.stats || {}; for (const a of ACH) if (a.test && !(save.ach || {})[a.id] && a.test(S)) unlockAch(a.id); }

/* ---------------- mutateurs (choisis avant une partie, rapportent plus de puces) ---------------- */
const MUTS = {
  giant: { name: 'Virus géants', ic: '🦠', desc: 'PV des virus +60 %', bonus: .3 },
  swift: { name: 'Virus rapides', ic: '💨', desc: 'Vitesse des virus +20 %', bonus: .2 },
  pricey: { name: 'Tourelles chères', ic: '💸', desc: 'Prix des tourelles +30 %', bonus: .2 },
  fragile: { name: 'Pare-feu fragile', ic: '💔', desc: 'Moitié moins de vies', bonus: .25 },
  nopower: { name: 'Sans pouvoirs', ic: '🚫', desc: 'Pouvoirs désactivés', bonus: .15 }
};
const mutBonus = muts => Object.keys(muts || {}).reduce((a, k) => a + (MUTS[k] ? MUTS[k].bonus : 0), 0);
function buildMuts() {
  const box = $('#mutBox'); if (!box) return; save.muts = save.muts || {};
  box.innerHTML = '<span class="mlab">Mutateurs <b>+' + Math.round(mutBonus(save.muts) * 100) + ' % ⬢</b></span>' + Object.keys(MUTS).map(k => '<button class="mut' + (save.muts[k] ? ' on' : '') + '" data-m="' + k + '" title="' + MUTS[k].desc + '">' + MUTS[k].ic + ' ' + MUTS[k].name + '</button>').join('');
  box.querySelectorAll('.mut').forEach(b => b.onclick = () => { const k = b.dataset.m; if (save.muts[k]) delete save.muts[k]; else save.muts[k] = 1; persist(); buildMuts(); toast(MUTS[k].ic + ' ' + MUTS[k].name + ' : ' + MUTS[k].desc + (save.muts[k] ? ' (+' + Math.round(MUTS[k].bonus * 100) + ' % de puces)' : ' — retiré')); });
}

/* ---------------- missions de la semaine ---------------- */
const MISSION_POOL = [
  { k: 'kills', n: 800, t: 'Détruis 800 virus' }, { k: 'wins', n: 3, t: 'Gagne 3 zones' }, { k: 'powers', n: 6, t: 'Utilise 6 pouvoirs' },
  { k: 'bossKills', n: 2, t: 'Détruis 2 boss de monde' }, { k: 'built', n: 60, t: 'Pose 60 tourelles' }, { k: 'early', n: 10, t: 'Lance 10 vagues en avance' },
  { k: 'combos', n: 40, t: 'Déclenche 40 combinaisons' }, { k: 'upgrades', n: 40, t: 'Fais 40 améliorations' }, { k: 'lvl5', n: 4, t: 'Monte 4 tourelles au niveau 5' },
  { k: 'tk_mine', n: 150, t: 'Détruis 150 virus avec des mines' }, { k: 'tk_vortex', n: 60, t: 'Détruis 60 virus avec le Vortex' }, { k: 'tk_frost', n: 120, t: 'Détruis 120 virus avec la Cryo' },
  { k: 'tk_tesla', n: 200, t: 'Détruis 200 virus avec la Tesla' }, { k: 'tk_laser', n: 150, t: 'Détruis 150 virus avec le Laser' }, { k: 'tk_flame', n: 200, t: 'Détruis 200 virus au Lance-flammes' },
  { k: 'tk_gatling', n: 250, t: 'Détruis 250 virus à la Mitrailleuse' }, { k: 'tk_missile', n: 150, t: 'Détruis 150 virus avec des missiles' }, { k: 'tk_pulse', n: 300, t: 'Détruis 300 virus avec le Pulseur' }
];
const MISSION_REWARD = 60;
function weekKey() { return Math.floor((Date.now() / 864e5 + 3) / 7); }
function missions() {
  const wk = weekKey(), S = save.stats = save.stats || {};
  if (!save.week || save.week.key !== wk) {
    const R2 = mulberry(wk * 7919), pool = MISSION_POOL.slice(), list = [];
    while (list.length < 3) list.push(pool.splice(Math.floor(R2() * pool.length), 1)[0]);
    save.week = { key: wk, list: list.map(m => ({ k: m.k, n: m.n, t: m.t, base: S[m.k] || 0, done: 0 })) }; persist();
  }
  return save.week.list.map(m => Object.assign({}, m, { p: Math.min(m.n, (S[m.k] || 0) - m.base) }));
}
function checkMissions() {
  if (G && G.demo) return; const L3 = missions();
  L3.forEach((m, i) => { if (!m.done && m.p >= m.n) { save.week.list[i].done = 1; save.chips = (save.chips || 0) + MISSION_REWARD; persist(); toast('🎯 Mission accomplie : ' + m.t + ' (+' + MISSION_REWARD + ' ⬢)'); sfx('win'); } });
}

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
  const Rn = mulberry(h), mi = Math.floor(Rn() * NCAMP), mod = DMODS[Math.floor(Rn() * DMODS.length)];
  let allowed = null;
  if (mod.id === 'random') { const p = TORDER.slice(); allowed = []; while (allowed.length < 4) allowed.push(p.splice(Math.floor(Rn() * p.length), 1)[0]); }
  return { key, mi, mod, allowed };
}
