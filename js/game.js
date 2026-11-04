'use strict';
/* Virus Défense — logique de jeu : partie, construction, vagues, combat, mise à jour */
/* ---------------- état ---------------- */
let G = null, state = 'menu', curDiff = 'normal', uid = 1, curMode = 'campaign';

function newGame(mi, demo, opts) {
  opts = opts || {};
  const m = MAPS[mi], d = DIFFS[demo || opts.daily ? 'normal' : curDiff];
  const starts = [], exits = [];
  for (const r of m.routes) if (!starts.some(q => q[0] === r[0][0] && q[1] === r[0][1])) starts.push(r[0]);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (m.g[y][x] === 'E') exits.push([x, y]);
  const g = {
    mi, m, d, demo: !!demo, total: demo ? 9999 : opts.endless ? Infinity : opts.daily ? 30 : m.waves, wave: 0, lives: d.lives + (demo ? 0 : 2 * ((save.gup || {}).lives || 0)), cash: demo ? 1e9 : d.cash + (m.entries.length - 1) * 12 + 8 * ((save.gup || {}).cash || 0), score: 0, time: 0,
    starts, exits, towers: [], towerAt: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    enemies: [], projs: [], fx: [], parts: [], texts: [], queue: [], mines: [], spawnT: 0, nextStart: 0,
    tool: null, sel: null, hover: null, speed: 1, countdown: -1, over: false, kills: 0, shake: 0, banner: null, aiT: 0
  };
  g.endless = !!opts.endless; g.daily = !!opts.daily; g.mod = opts.mod || null; g.allowed = opts.allowed || null;
  if (!demo) g.cash += 5 * (save.prestige || 0);
  if (m.custom && m.cashC) g.cash = m.cashC;
  if (m.custom && m.livesC) g.lives = m.livesC;
  g.muts = !demo && !opts.daily && !opts.custom ? Object.assign({}, save.muts || {}) : {};
  if (g.muts.fragile) g.lives = Math.ceil(g.lives / 2);
  if (m.custom && m.noPower) g.muts.nopower = 1;
  if (m.custom && m.allowedC && !g.allowed) g.allowed = m.allowedC.slice();
  if (m.bonus) g.bonus = new Set(m.bonus.map(([x, y]) => x + y * COLS));
  if (g.mod === 'rich') g.cash *= 3;
  if (g.mod === 'fragile') g.lives = 5;
  g.typesUsed = new Set(); g.maxCost = 0; g.maxTowers = 0; g.maxLvl = 1; g.pw = { strike: 0, freeze: 0, reboot: 0 }; g.eco = !!save.eco;
  g.outT = rand(20, 28); g.hackT = rand(18, 26); g.stormT = rand(14, 20); g.streak = 0; g.punch = 0; g.hitstop = 0;
  const keep = G; G = g;
  g.dist = computeDist();
  { // règles du monde : cases brûlantes (Fournaise) et portails (Flux de données)
    const th = m.noRule ? '' : worldOf(mi).style, Rn = mulberry(mi * 71 + 5);
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
/* ---------------- histoire : messages de l'antivirus ---------------- */
const STORY = [
  'Alerte ! Des virus ont percé le pare-feu et foncent vers le processeur. Je suis AVA, l\'antivirus de cette machine. Pose des tourelles le long des pistes, je compte sur toi !',
  'Les virus ont atteint l\'alimentation. Ici tout chauffe : certaines cases brûlantes boostent tes tourelles, mais elles surchauffent. Attention au Titan de magma…',
  'Nous entrons dans le flux de données. Les paquets filent à toute vitesse et des portails les font sauter plus loin. Ne laisse rien passer !',
  'La salle des serveurs est attaquée par un botnet. Le courant saute par endroits : répartis bien tes défenses.',
  'Le système de refroidissement est infecté. Sur le verglas, les virus glissent plus vite… mais ton gel dure plus longtemps.',
  'Nous sommes au cœur du code. Une IA corrompue pirate nos tourelles : touche-les vite pour les réparer !',
  'Quelle surprise : l\'infection remonte jusqu\'au vieux PC 8 bits de la cave ! Sa mémoire est limitée, chaque tourelle compte.',
  'Dernière étape : le Nuage. Les virus veulent s\'échapper sur Internet. L\'orage gronde, la foudre peut t\'aider… ou griller tes tourelles.'
];
const STORY_END = 'Incroyable… La Tempête est tombée et le dernier virus est effacé. L\'ordinateur est sauvé, grâce à toi ! Mais les virus reviennent toujours : le mode infini, le défi du jour et le prestige t\'attendent. Merci, héros du système. — AVA';
function showStory(txt, title, done) {
  $('#storyTitle').textContent = title; $('#storyTxt').textContent = ''; $('#story').classList.remove('hidden');
  let i = 0; clearInterval(showStory.iv); showStory.iv = setInterval(() => { i += 2; $('#storyTxt').textContent = txt.slice(0, i); if (i >= txt.length) clearInterval(showStory.iv); if (i % 6 === 0) sfx('coin'); }, 22);
  $('#storyOk').onclick = () => { clearInterval(showStory.iv); if ($('#storyTxt').textContent.length < txt.length) { $('#storyTxt').textContent = txt; return; } $('#story').classList.add('hidden'); if (done) done(); };
}
function startMap(mi, opts) {
  opts = opts || (curMode === 'endless' ? { endless: true } : {});
  G = newGame(mi, false, opts); G.maxLives = G.lives; G.opts = opts; G.custom = !!opts.custom;
  L.zoom = 1; L.vx = COLS / 2; L.vy = ROWS / 2;
  buildTowerBar(); closePopup(); selectTool(unlockedT('pulse') ? 'pulse' : G.allowed ? G.allowed[0] : null, true);
  if (!save.tuto && mi === 0 && !opts.endless && !opts.daily) { G.tuto = 0; G.tool = null; document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('sel')); towerInfo(); G.tutoTile = bestTile(); }
  const W0 = worldOf(mi), pn = $('#panel');
  pn.style.setProperty('--pa', W0.panel[0]); pn.style.setProperty('--pb', W0.panel[1]); pn.style.setProperty('--pc', W0.panel[2]);
  setState('play');
  updatePanel(true);
  const rule = RULES[W0.style];
  G.banner = { t: opts.custom ? MAPS[mi].name.toUpperCase() : opts.daily ? 'DÉFI DU JOUR' : opts.endless ? 'MODE INFINI' : W0.name.toUpperCase(), sub: opts.daily ? (DMODS.find(x => x.id === G.mod) || {}).name + ' · ' + MAPS[mi].name : 'Monde ' + (WORLDS.indexOf(W0) + 1) + ' · ' + MAPS[mi].name, life: 2.6, max: 2.6 };
  toast(G.tuto !== undefined ? 'Bienvenue dans Virus Défense !' : opts.custom && MAPS[mi].desc ? '✎ ' + MAPS[mi].desc : '🌍 Règle du monde · ' + (opts.custom && MAPS[mi].noRule ? 'désactivée' : rule.name + ' : ' + rule.desc));
  updatePowers(); tutoTick();
  const wi = worldIdx(mi);
  if (!opts.endless && !opts.daily && !opts.custom && mi < NCAMP && mi % 3 === 0 && !(save.story || {})[wi]) {
    G.storyOpen = true; save.story = save.story || {}; save.story[wi] = 1; persist();
    showStory(STORY[wi] || '', '🛡 AVA · Monde ' + (wi + 1) + ' : ' + WORLDS[wi].name, () => { if (G) G.storyOpen = false; });
  }
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
  if (G.th === 'retro' && !G.m.noRule && G.towers.length >= 28) return 'Mémoire pleine : 28 tourelles au maximum dans ce monde';
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
  if (G.bonus && G.bonus.has(tx + ty * COLS)) t.bonus = true;
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
  G.mines = G.mines.filter(m => m.src !== t);
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
  const early = G.enemies.length > 0 || G.queue.length > 0, eb = earlyBonus();
  G.wave++;
  const wd = waveDef(G.wave), et = ETYPES[wd.type];
  // vague anticipée : elle arrive EN MÊME TEMPS que la fin de la précédente (sans décaler celle-ci)
  if (!G.queue.length) G.spawnT = 0;
  let t = G.queue.length ? G.spawnT + .6 : 0;
  const t0 = t;
  if (wd.groups) { // vague personnalisée : chaque groupe a son départ, son écart et son entrée
    for (const gr of wd.groups) { let tg = t0 + gr.d; for (let i = 0; i < gr.n; i++) { G.queue.push({ type: gr.t, t: tg, wave: G.wave, ent: gr.e || 0 }); tg += gr.gap; } }
  } else {
    for (let i = 0; i < wd.n; i++) { G.queue.push({ type: wd.type, t, wave: G.wave }); t += et.int; }
    if (wd.type2) { let t2 = t0 + .4; for (let i = 0; i < wd.n2; i++) { G.queue.push({ type: wd.type2, t: t2, wave: G.wave }); t2 += ETYPES[wd.type2].int * 1.3; } }
    if (wd.type === 'boss' || wd.wboss) for (let i = 0; i < 6; i++) G.queue.push({ type: 'bug', t: t0 + i * .6 + .5, wave: G.wave });
  }
  G.queue.sort((a, b) => a.t - b.t);
  const bonus = 2 + Math.floor(G.wave / 3) + eb + gup('wave');
  if (eb > 0 && !G.demo) { G.texts.push({ x: COLS / 2, y: 2, t: '⏩ ANTICIPÉE +' + eb + ' cr', col: '#ffd740', life: 1.3, big: true }); stat('early'); }
  G.cash += bonus; G.score += bonus * 10;
  for (const t of G.towers) if (t.type === 'miner') { const gn = t.st.gain + (t.st.bank ? Math.min(60, Math.floor(G.cash * .06)) : 0); G.cash += gn; G.texts.push({ x: t.x + .5, y: t.y + .2, t: '+' + gn, col: '#ffd740', life: 1.2, big: true }); coinFly(t.x + .5, t.y + .5, 2); }
  G.countdown = -1; fadeCraters(.12);
  if (!G.queue.some(q => q.wave < G.wave)) { G.wKills = 0; G.wEarn = 0; G.wLeak = 0; for (const t of G.towers) t.wdmg = 0; }
  const bw = wd.type === 'boss' || wd.wboss;
  if (bw) { G.alarm = wd.wboss ? 3.2 : 2.4; G.shake = wd.wboss ? 10 : 6; sfx('alarm'); }
  G.banner = { t: wd.wboss ? '☠ ' + et.name.toUpperCase() + ' ☠' : (wd.type === 'boss' ? '⚠ MÉGA-VIRUS ⚠' : 'VAGUE ' + G.wave), sub: wd.wboss ? 'Boss du monde · ' + EDESC[wd.type].replace(/^BOSS[^.]*\. /, '') : wd.label ? wd.label : wd.n + ' × ' + et.name + (wd.type2 ? ' + ' + wd.n2 + ' × ' + ETYPES[wd.type2].name : ''), life: wd.wboss ? 3.2 : 2.2, max: wd.wboss ? 3.2 : 2.2, boss: bw };
  toast((bw ? '⚠ ' : '') + 'Vague ' + G.wave + ' : ' + (wd.label || wd.n + ' × ' + et.name) + (eb > 0 ? ' · bonus anticipé +' + eb + ' (total +' + bonus + ')' : ' · +' + bonus + ' crédits'));
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
// prime pour une vague lancée en avance : plus il reste de virus (ou de temps), plus elle rapporte
function earlyBonus() {
  if (!G || G.wave === 0) return 0;
  const left = G.enemies.length + G.queue.length;
  if (left) return 3 + Math.min(40, Math.round(left * .5 + G.wave * .3));
  return G.countdown > 0 ? Math.ceil(G.countdown * .6) : 0;
}
function spawnEnemy(type, wave, quiet, entK) {
  const d = ETYPES[type], ei = entK ? (entK - 1) % G.m.entries.length : quiet ? 0 : G.nextStart++ % G.m.entries.length, ent = G.m.entries[ei], fc = G.forkC = G.forkC || {}, ri = ent[(fc[ei] = (fc[ei] || 0) + 1) % ent.length], route = G.m.routes[ri], s = route[0];
  const hp = d.hp * hpScale(wave) * G.d.hp;
  const e = {
    id: uid++, type, x: s[0] + .5, y: s[1] + .5, tx: s[0], ty: s[1], hp, max: hp, spd: d.spd, r: d.r, col: d.col,
    rew: Math.max(1, Math.round(d.rew * rewScale(wave) * (1 + .06 * gup('rew')) * (G.mod === 'rich' ? .7 : 1))), armor: (d.armor || 0) * (1 + wave * .03), fly: !!d.fly, regen: d.regen || 0,
    lives: d.lives || 1, wave, slowT: 0, slowF: 1, ang: 0, anim: Math.random() * 10, prog: 0, dead: false, route, ri: 0
  };
  e.hp = e.max = hp * (1 + G.mi * .025);
  if (G.th === 'ice' && !G.m.noRule) e.spd *= 1.2;
  if (G.m.hpC) e.hp = e.max = e.max * G.m.hpC;
  if (G.m.spdC) e.spd *= G.m.spdC;
  if (G.m.rewC) e.rew = Math.max(1, Math.round(e.rew * G.m.rewC));
  if (G.mod === 'fast') e.spd *= 1.25;
  if (G.muts && G.muts.swift) e.spd *= 1.2;
  if (G.muts && G.muts.giant) e.hp = e.max = e.max * 1.6;
  if (G.mod === 'armored') e.armor += 3;
  if (G.d.spd) e.spd *= G.d.spd;
  if (G.endless && wave > G.m.waves) { const k = wave - G.m.waves; e.hp = e.max = e.max * (1 + k * .06); e.spd *= 1 + Math.min(.5, k * .01); }
  e.spd0 = e.spd; if (d.boss === 2) e.abT = 4;
  if (!G.demo && !(save.seen || {})[type]) { save.seen = save.seen || {}; save.seen[type] = 1; persist(); if (d.world !== undefined || d.boss) toast('📖 Nouveau virus : ' + d.name + ' — ' + EDESC[type]); }
  if (G.fx.length < 300 && !quiet) G.fx.push({ kind: 'ring', x: s[0] + .5, y: s[1] + .5, r: .9, col: CBC().spawn, life: .35, max: .35 });
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
// débris de destruction, différents selon le monde
const DEBRIS = { retro: 'px', forge: 'ember', ice: 'shard', rack: 'spark', neon: 'glitch', cloud: 'feather', data: 'bit', pcb: 'chip' };
function debris(x, y, n, col, big) {
  const kind = DEBRIS[G.th] || 'chip', fl = kind === 'feather' ? 1.8 : 1;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rand(1, 3.2) * (big ? 1.7 : 1) * (kind === 'feather' ? .6 : 1), life = rand(.45, .85) * fl;
    G.parts.push({ deb: kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: rand(.045, .09) * (big ? 1.6 : 1), col: i % 3 ? col : '#ffffff', rot: Math.random() * TAU, vr: rand(-10, 10), ch: Math.random() < .5 ? '0' : '1' });
  }
}
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
  e.hp -= real; if (src) { src.dmg = (src.dmg || 0) + real; src.wdmg = (src.wdmg || 0) + real; }
  if (save.dmgNums && !G.demo) e.dmgAcc = (e.dmgAcc || 0) + real;
  e.hit = .08;
  const d0 = ETYPES[e.type];
  if (d0.clone && !e.cloned && e.hp > 0 && e.hp < e.max * .5) { e.cloned = true; const c = spawnFrom(e.type, e, 1); if (c) { c.hp = e.hp; c.max = e.max; c.cloned = true; c.ri = Math.max(0, e.ri - 2); const p = e.route[c.ri]; c.x = p[0] + .5; c.y = p[1] + .5; G.fx.push({ kind: 'ring', x: c.x, y: c.y, r: .6, col: '#ff2bd6', life: .3, max: .3 }); } }
  if (d0.trojan) { const k = e.hp / e.max; while ((e.troj || 0) < 3 && k < 1 - ((e.troj || 0) + 1) * .25) { e.troj = (e.troj || 0) + 1; for (let i = 0; i < 5; i++) spawnFrom('packet', e, .6); G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 1.2, col: '#18ffff', life: .4, max: .4 }); } }
  if (e.hp <= 0 && d0.revive && !e.revived) { e.revived = true; e.hp = e.max * .45; e.reviveT = 1.4; e.sh = 0; G.texts.push({ x: e.x, y: e.y - .3, t: '☠ se relève…', col: '#9ccc65', life: 1 }); return; }
  if (e.hp <= 0) {
    e.dead = true; G.kills++; if (G.shooter) { G.shooter.kills = (G.shooter.kills || 0) + 1; stat('tk_' + G.shooter.type); }
    G.wKills = (G.wKills || 0) + 1; G.wEarn = (G.wEarn || 0) + e.rew;
    G.cash += e.rew; G.score += e.rew * 10;
    floatText(e.x, e.y - .3, '+' + e.rew, '#e6ee5a');
    const n = isBoss(e) ? (G.eco ? 20 : 40) : (G.eco ? 4 : 8);
    for (let i = 0; i < n; i++) G.parts.push(part(e.x, e.y, i % 3 ? e.col : '#ffffff', isBoss(e) ? 4 : 2.5));
    G.fx.push({ kind: 'splat', x: e.x, y: e.y, r: e.r * 1.7, life: 10, max: 10, col: rgbaA(e.col), seed: Math.random() * .97 + .013 });
    if (!e.fly) crater(e.x, e.y, e.r * (isBoss(e) ? .9 : 1.15), e.col);
    G.fx.push({ kind: 'pop', x: e.x, y: e.y, r: e.r, col: e.col, life: .28, max: .28 });
    debris(e.x, e.y, isBoss(e) ? 26 : (G.eco ? 3 : 7), e.col, isBoss(e));
    G.fx.push({ kind: 'shock', x: e.x, y: e.y, r: e.r * (isBoss(e) ? 7 : 2.6), life: isBoss(e) ? .6 : .3, max: isBoss(e) ? .6 : .3 });
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
  if (d.onDeath) for (let i = 0; i < d.onDeath[1]; i++) spawnFrom(d.onDeath[0], e, 1);
  if (ETYPES[e.type].split3) for (let i = 0; i < 3; i++) { const b = spawnFrom('bit', e, 1); if (b) b.hp = b.max = Math.max(b.max, e.max * .22); }
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
  else if (d.protect) { e.abT = 5; let n = 0; for (const o of G.enemies) if (!o.dead && o !== e && !(o.sh > 0) && Math.hypot(o.x - e.x, o.y - e.y) < 2.6) { o.shMax = o.sh = o.max * .35; n++; } G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 2.6, col: 'rgba(64,196,255,.5)', life: .5, max: .5 }); }
  else if (d.storm) { e.abT = 3; e.abN = (e.abN || 0) + 1; for (let i = 0; i < 2; i++) spawnFrom('drone', e, 1.4); if (e.abN % 2 === 0 && G.towers.length) { const t = G.towers[Math.floor(Math.random() * G.towers.length)]; bolt(t.x + .5, t.y + .5, 0); } }
  else e.abT = 99;
}
// éclair : dégâts aux virus proches, coupe les tourelles touchées
function bolt(x, y, hurtsVirus) {
  const pts = [[x + rand(-1, 1), y - 6]]; for (let i = 1; i < 7; i++) pts.push([x + rand(-.4, .4) * (1 - i / 7), y - 6 + i * 6 / 7]); pts.push([x, y]);
  G.fx.push({ kind: 'chain', pts, col: '#fff59d', life: .35, max: .35 }, { kind: 'ring', x, y, r: 1.5, col: 'rgba(255,245,157,.8)', life: .4, max: .4 }, { kind: 'flash', col: '255,255,220', life: .25, max: .25 });
  if (hurtsVirus) { G.shooter = null; const dmg = 35 * hpScale(Math.max(1, G.wave)) * G.d.hp; for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 1.3) hurt(e, isBoss(e) ? dmg * .3 : dmg, true); }
  for (const t of G.towers) if (Math.hypot(t.x + .5 - x, t.y + .5 - y) < 1.1) { t.offT = Math.max(t.offT || 0, 3); smoke(t.x + .5, t.y + .5, 4, .2); }
  G.shake = Math.max(G.shake, 6); sfx('tesla'); sfx('boom');
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
      const m = t.mode || 'first', p = m === 'first' ? e.prog : m === 'last' ? -e.prog : m === 'strong' ? -e.hp : m === 'close' ? d2 :
        m === 'support' ? e.prog - (SUPPORT[e.type] ? 1e6 : 0) : e.prog - (BADGE[e.type] || isBoss(e) ? 1e6 : 0);
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
    t.boost = (1 + b) * (t.hot ? 1.35 : 1) * (t.bonus ? 1.3 : 1); t.rateB = rb;
  }
}
// combinaisons entre tourelles
const COMBOS = {
  thermal: { name: 'Choc thermique', desc: 'le feu sur un virus gelé ou ralenti fait ×2 dégâts', col: '#ff9e80' },
  surge: { name: 'Surtension', desc: 'l\'éclair Tesla sur un virus gelé ou ralenti : ×1,5 dégâts et l\'étourdit', col: '#fff176' },
  melt: { name: 'Fusion', desc: 'le laser sur un virus en feu fait ×1,6 dégâts', col: '#ff8a80' },
  shatter: { name: 'Éclatement', desc: 'obus, missiles et mines sur un virus congelé font ×2,5 dégâts', col: '#b3e5fc' },
  trap: { name: 'Piège', desc: 'une mine sur un virus repoussé par un Vortex fait ×2 dégâts', col: '#c5e1a5' },
  firestorm: { name: 'Tourbillon de feu', desc: 'le Vortex sur un virus en feu fait ×3 dégâts et attise la brûlure', col: '#ffab40' }
};
function combo(e, k) {
  if (G.demo) return;
  if ((!e.comboT || G.time - e.comboT > .8) && G.time - (G.comboTxt || 0) > .2) { e.comboT = G.comboTxt = G.time; G.texts.push({ x: e.x, y: e.y - .45, t: COMBOS[k].name + ' !', col: COMBOS[k].col, life: .9 }); }
  save.combos = save.combos || {};
  stat('combos');
  if (!save.combos[k]) { save.combos[k] = 1; persist(); toast('🧪 Combinaison découverte : ' + COMBOS[k].name + ' — ' + COMBOS[k].desc); unlockAch('combo1'); if (Object.keys(save.combos).length >= Object.keys(COMBOS).length) unlockAch('combo4'); }
}
const chilled = o => o.frozen > 0 || o.slowT > 0;
// mines : case de couloir libre à portée, de préférence sur un passage
function mineSpot(t) {
  const r = t.st.range, c = [];
  for (let y = Math.max(0, t.y - 3); y <= Math.min(ROWS - 1, t.y + 3); y++) for (let x = Math.max(0, t.x - 3); x <= Math.min(COLS - 1, t.x + 3); x++) {
    if (!walkable(x, y) || G.m.g[y][x] === 'E' || Math.hypot(x - t.x, y - t.y) > r) continue;
    if (G.mines.some(m => Math.abs(m.x - x - .5) < .6 && Math.abs(m.y - y - .5) < .6)) continue;
    c.push([x, y]);
  }
  return c.length ? c[Math.floor(Math.random() * c.length)] : null;
}
function layMine(t, x, y) {
  const s = t.boost > 1 ? t.st.dmg * t.boost : t.st.dmg;
  G.mines.push({ x: x + .5 + rand(-.15, .15), y: y + .5 + rand(-.15, .15), sx: t.x + .5, sy: t.y + .5, k: 0, arm: .6, dmg: s, splash: t.st.splash, stun: t.st.stun || 0, sticky: t.st.sticky, src: t, col: t.st.alt ? '#40c4ff' : t.st.special ? '#ffd740' : '#8bc34a' });
  t.nMines = (t.nMines || 0) + 1; sfx('build');
}
function updateMines(dt) {
  for (let i = G.mines.length - 1; i >= 0; i--) {
    const m = G.mines[i];
    if (m.k < 1) { m.k = Math.min(1, m.k + dt * 3); continue; } // vol de la mine vers sa case
    if (m.arm > 0) { m.arm -= dt; continue; }
    if (!G.towers.includes(m.src)) { G.mines.splice(i, 1); continue; } // tourelle vendue : ses mines disparaissent
    let hit = null; for (const e of G.enemies) if (!e.dead && !e.fly && !e.phased && Math.hypot(e.x - m.x, e.y - m.y) < .38 + e.r * .5) { hit = e; break; }
    if (!hit) continue;
    G.shooter = m.src;
    for (const e of G.enemies) {
      if (e.dead || e.fly || Math.hypot(e.x - m.x, e.y - m.y) > m.splash + e.r) continue;
      let dm = m.dmg; if (e.frozen > 0) { dm *= 2.5; combo(e, 'shatter'); } else if (e.pushT > G.time) { dm *= 2; combo(e, 'trap'); }
      hurt(e, dm);
      if (m.stun) e.stunT = Math.max(e.stunT || 0, m.stun);
      if (m.sticky && !ETYPES[e.type].noslow) { e.slowF = Math.min(e.slowT > 0 ? e.slowF : 1, .3); e.slowT = Math.max(e.slowT, 3); }
    }
    G.fx.push({ kind: 'ring', x: m.x, y: m.y, r: m.splash, col: m.col, life: .3, max: .3 });
    for (let k = 0; k < 8; k++) G.parts.push(part(m.x, m.y, k % 2 ? m.col : '#ffd740', 3));
    smoke(m.x, m.y, 3, .2); crater(m.x, m.y, .25, '#555555'); G.shake = Math.max(G.shake, 1.5); sfx('cannon');
    m.src.nMines = Math.max(0, (m.src.nMines || 1) - 1); G.mines.splice(i, 1);
  }
}
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
    case 'vortex': { // impulsion : repousse les virus à portée
      let n = 0;
      for (const o of G.enemies) {
        if (o.dead || o.reviveT > 0 || Math.hypot(o.x - cx, o.y - cy) > s.range + o.r) continue;
        if (o.burnT > 0) { hurt(o, s.dmg * 3); o.burnT = Math.max(o.burnT, 3); o.burnDps *= 1.25; combo(o, 'firestorm'); } else hurt(o, s.dmg);
        if (o.dead || o.pushT > G.time) continue;
        const back = isBoss(o) ? 1 : s.push; o.pushT = G.time + 2.5; // chaque virus ne peut être repoussé qu'une fois toutes les 2,5 s
        o.ri = Math.max(0, o.ri - back); const p = o.route[o.ri]; o.x = p[0] + .5; o.y = p[1] + .5; o.tx = p[0]; o.ty = p[1]; n++;
        if (s.warp && !ETYPES[o.type].noslow) { o.slowF = Math.min(o.slowT > 0 ? o.slowF : 1, .5); o.slowT = Math.max(o.slowT, 2); }
        G.fx.push({ kind: 'ring', x: o.x, y: o.y, r: .45, col: '#b388ff', life: .3, max: .3 });
      }
      G.fx.push({ kind: 'ring', x: cx, y: cy, r: s.range, col: s.special ? 'rgba(20,0,40,.7)' : 'rgba(124,77,255,.55)', life: .45, max: .45 });
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
        const ns = ETYPES[e.type].noslow, ik = G.th === 'ice' && !G.m.noRule ? 1.5 : 1;
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
  if (p.kind === 'shell' || p.kind === 'missile') { G.fx.push({ kind: 'shock', x: p.x, y: p.y, r: (p.splash || .6) * 1.5, life: .26, max: .26 }); debris(p.x, p.y, G.eco ? 2 : 4, p.col); }
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
    while (G.queue.length && G.queue[0].t <= G.spawnT) { const q = G.queue.shift(); spawnEnemy(q.type, q.wave, false, q.ent); }
  }
  // règles du monde
  if (!G.demo && !G.m.noRule && (G.enemies.length || G.queue.length)) {
    if (G.th === 'rack') {
      G.outT -= dt;
      if (G.outT <= 3 && !G.outZ) { const tw = G.towers[Math.floor(Math.random() * G.towers.length)]; G.outZ = { x: tw ? tw.x : rand(3, COLS - 3) | 0, y: tw ? tw.y : rand(3, ROWS - 3) | 0, on: 0 }; toast('⚡ Coupure de courant imminente !'); }
      if (G.outT <= 0) { G.outT = rand(26, 34); G.outZ.on = 5; for (const t of G.towers) if (Math.abs(t.x - G.outZ.x) <= 2 && Math.abs(t.y - G.outZ.y) <= 2) t.offT = Math.max(t.offT || 0, 5); sfx('err'); }
    }
    if (G.th === 'cloud') {
      G.stormT -= dt;
      if (G.stormT <= 1.2 && !G.boltW) { const e = G.enemies[Math.floor(Math.random() * G.enemies.length)], t = G.towers[Math.floor(Math.random() * G.towers.length)], tg = Math.random() < .65 && e ? [e.x, e.y] : t ? [t.x + .5, t.y + .5] : null; if (tg) G.boltW = { x: tg[0], y: tg[1] }; else G.stormT = 5; }
      if (G.stormT <= 0) { G.stormT = rand(17, 24); if (G.boltW) { bolt(G.boltW.x, G.boltW.y, 1); G.boltW = null; } }
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
    if (e.dmgAcc > 0 && G.time - (e.dmgT || 0) > .35) { e.dmgT = G.time; if (G.texts.length < 90) G.texts.push({ x: e.x + rand(-.2, .2), y: e.y - e.r - .1, t: fmtN(e.dmgAcc), col: '#ffffff', life: .55, small: true }); e.dmgAcc = 0; }
    if (e.reviveT > 0) { e.reviveT -= dt; continue; }
    if (ETYPES[e.type].worm) e.spd = e.spd0 * (1 + (1 - e.hp / e.max) * 1.3);
    if (e.abT !== undefined) bossAbility(e, dt);
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
    if (e.regen && e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max * e.regen * dt);
    e.noHit = (e.noHit || 0) + dt; e.shHit = Math.max(0, (e.shHit || 0) - dt);
    if (e.shMax && e.noHit > 2.5) e.sh = Math.min(e.shMax, e.sh + e.shMax * .35 * dt);
    if (e.phaseT !== undefined) { e.phaseT -= dt; if (e.phaseT <= 0) { e.phased = !e.phased; e.phaseT = e.phased ? 1.3 : rand(2.2, 3.2); } }
    if (ETYPES[e.type].heal) { e.healT = (e.healT || 0) - dt; if (e.healT <= 0) { e.healT = 1; for (const o of G.enemies) if (!o.dead && o !== e && o.hp < o.max && !(o.healedT > G.time) && Math.hypot(o.x - e.x, o.y - e.y) < 1.6) {
          // soin plafonné : au plus 10 % des PV du soigneur (un boss n'est plus soigné de 10 % de ses PV), une seule fois par seconde
          o.healedT = G.time + .95; o.hp = Math.min(o.max, o.hp + Math.min(o.max * .1, e.max * .1));
          if (G.texts.length < 60) G.texts.push({ x: o.x, y: o.y - .3, t: '+', col: '#76ff03', life: .6 });
        } G.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 1.6, col: 'rgba(120,255,140,.5)', life: .4, max: .4 }); } }
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
    if (t.type === 'mine') { // pose des mines sur les cases de couloir à portée
      t.ang += dt * .5;
      if (t.cd <= 0 && (t.nMines || 0) < t.st.maxMines) { const c = mineSpot(t); if (c) { layMine(t, c[0], c[1]); t.cd = 1 / (t.st.rate * (1 + (t.rateB || 0))); t.flash = .1; } else t.cd = .5; }
      continue;
    }
    const e = findTarget(t);
    if (e) {
      const ta = Math.atan2(e.y - (t.y + .5), e.x - (t.x + .5));
      t.ang += Math.atan2(Math.sin(ta - t.ang), Math.cos(ta - t.ang)) * Math.min(1, dt * 16);
      if (t.cd <= 0) { fire(t, e); t.cd = 1 / (t.st.rate * (1 + (t.rateB || 0))); t.flash = .07; }
    } else if (t.type !== 'tesla') t.ang += Math.sin(G.time * .8 + t.id) * dt * .9;
  }
  updateMines(dt);
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
  for (let i = G.parts.length - 1; i >= 0; i--) { const q = G.parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.deb) { q.rot += q.vr * dt; if (q.deb === 'ember') q.vy -= 2.5 * dt; else if (q.deb === 'feather') { q.vy += .4 * dt; q.vx += Math.sin(q.life * 9) * .04; } } if (q.smoke) { q.vx *= .96; q.vy *= .96; } else { q.vx *= .9; q.vy *= .9; } if (q.life <= 0) G.parts.splice(i, 1); }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y -= .6 * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  const pmax = G.eco ? 160 : 500; if (G.parts.length > pmax) G.parts.splice(0, G.parts.length - pmax);
  // fin de vague / victoire
  const clear = !G.queue.length && !G.enemies.length;
  if (clear && G.wave > 0 && G.recapW !== G.wave && !G.demo) { // bilan de la vague
    G.recapW = G.wave; let mvp = null; for (const t of G.towers) if ((t.wdmg || 0) > ((mvp && mvp.wdmg) || 0)) mvp = t;
    G.recap = { t: 'Vague ' + G.wave + ' ✔', parts: [(G.wKills || 0) + ' virus', '+' + (G.wEarn || 0) + ' cr', G.wLeak ? '−' + G.wLeak + ' ❤' : 'aucune vie perdue', mvp ? 'MVP : ' + tName(mvp.type) : ''].filter(Boolean), life: 3.5, max: 3.5, bad: !!G.wLeak };
  }
  if (G.recap) { G.recap.life -= dt; if (G.recap.life <= 0) G.recap = null; }
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
  G.lives = Math.max(0, G.lives - e.lives); G.wLeak = (G.wLeak || 0) + e.lives;
  G.fx.push({ kind: 'leak', life: .5, max: .5 });
  const ex = e.route[e.route.length - 1];
  G.fx.push({ kind: 'cpuhit', x: ex[0] + .5, y: ex[1] + .5, life: .6, max: .6 });
  for (let i = 0; i < 14; i++) G.parts.push(part(ex[0] + .5, ex[1] + .5, i % 2 ? '#ff5252' : '#ffd740', 4));
  G.texts.push({ x: ex[0] + .5, y: ex[1], t: '-' + e.lives + ' ❤', col: '#ff5252', life: 1.2, big: true });
  bump('#sLives');
  sfx('leak'); vibe(80); updatePanel();
  if (G.lives <= 0 && !G.over) endGame(false);
}
