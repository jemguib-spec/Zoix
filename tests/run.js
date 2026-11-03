// Tests automatiques de Virus Défense : lance le jeu dans un navigateur sans écran et vérifie les mécaniques.
// Utilisation : npm install puis npm test   (ou : node tests/run.js)
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const results = [];
async function test(name, page, fn) {
  const t0 = Date.now();
  try { const r = await page.evaluate(fn); if (r !== true) throw new Error(typeof r === 'string' ? r : JSON.stringify(r)); results.push([true, name, Date.now() - t0]); }
  catch (e) { results.push([false, name + ' — ' + e.message.split('\n')[0]]); }
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = 'http://localhost:' + server.address().port + '/index.html';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 870, height: 400 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.clear(); save = loadSave(); save.tuto = 1; save.story = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 }; for (const k of TORDER) save.unlockT[k] = 1; });

  await test('le jeu démarre sur le menu', page, () => state === 'menu' && !!DEMO || 'état : ' + state);
  await test('les 24 zones de campagne sont valides', page, () => { for (let i = 0; i < NCAMP; i++) { const m = MAPS[i]; if (!m.routes.length || m.routes.some(r => r.length < 8)) return 'zone ' + i; } return NCAMP === 24; });

  // simulation rapide de chaque monde avec une IA simple
  await test('chaque monde se joue 12 vagues sans erreur', page, () => {
    for (let w = 0; w < WORLDS.length; w++) {
      startMap(w * 3); G.cash = 3000;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (canPlace(x, y) === null && G.towers.length < 25) { let v = 0; for (const f of G.flow) if (Math.hypot(f.x - x, f.y - y) < 2) v++; if (v > 3) tryPlace(TORDER[G.towers.length % TORDER.length], x, y); }
      for (let wv = 0; wv < 12 && !G.over; wv++) { startWave(); for (let i = 0; i < 30 * 30 && (G.queue.length || G.enemies.length) && !G.over; i++) { update(1 / 30); G.hitstop = 0; } }
      if (G.wave < 1) return 'monde ' + w + ' : aucune vague';
    }
    return true;
  });
  await test('chaque boss de monde peut être détruit', page, () => {
    for (const k of WBOSS) { startMap(1); spawnEnemy(k, 30); const e = G.enemies[0]; G.shooter = null; hurt(e, 1e9, true); if (!e.dead && !(e.reviveT > 0)) return k + ' immortel'; }
    return true;
  });
  await test('les soigneurs ne rendent pas un boss immortel', page, () => {
    startMap(2); spawnEnemy('kernel', 30); const k = G.enemies[0]; k.spd = 0; k.hp = k.max / 2;
    for (let i = 0; i < 5; i++) { spawnEnemy('healer', 30); Object.assign(G.enemies[G.enemies.length - 1], { x: k.x, y: k.y, ri: k.ri, spd: 0 }); }
    const h0 = k.hp; for (let i = 0; i < 300; i++) update(1 / 30);
    return k.hp - h0 < k.max * .1 || 'soin de ' + Math.round(k.hp - h0) + ' PV en 10 s';
  });
  await test('une vague anticipée ne retarde pas la précédente', page, () => {
    startMap(2); startWave(); for (let i = 0; i < 90; i++) update(1 / 30);
    const next = G.queue[0] ? G.queue[0].t - G.spawnT : 0; startWave();
    return Math.abs((G.queue[0].t - G.spawnT) - next) < .01 || 'la vague en cours a été décalée';
  });
  await test('le mode infini continue après la vague 40', page, () => {
    startMap(9, { endless: true }); G.cash = 1e7;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (canPlace(x, y) === null) { tryPlace('tesla', x, y); const t = G.towers[G.towers.length - 1]; if (t) for (let k = 0; k < 5; k++) upgradeTower(t, 0); }
    G.wave = 39;
    for (let s = 0; s < 30 * 400 && G.wave < 43 && !G.over; s++) { if (!G.queue.length && !G.enemies.length) startWave(); update(1 / 30); G.hitstop = 0; }
    return G.wave >= 43 || 'bloqué à la vague ' + G.wave;
  });
  await test('Vortex : renvoie un virus en arrière', page, () => {
    startMap(0); G.cash = 999; const r = G.m.routes[0], q = r[10];
    let ok = false; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (!ok && canPlace(q[0] + dx, q[1] + dy) === null) { tryPlace('vortex', q[0] + dx, q[1] + dy); ok = true; }
    spawnEnemy('bug', 1); const e = G.enemies[0]; e.ri = 10; e.x = q[0] + .5; e.y = q[1] + .5; fire(G.towers[0], e);
    return e.ri < 10 || 'pas de recul';
  });
  await test('Poseur de mines : pose des mines qui explosent', page, () => {
    startMap(0); G.cash = 999; const q = G.m.routes[0][6];
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (!G.towers.length && canPlace(q[0] + dx, q[1] + dy) === null) tryPlace('mine', q[0] + dx, q[1] + dy);
    for (let i = 0; i < 300; i++) update(1 / 30);
    if (!G.mines.length) return 'aucune mine';
    startWave(); for (let i = 0; i < 30 * 25; i++) update(1 / 30);
    return G.towers[0].dmg > 0 || 'aucune explosion';
  });
  await test('éditeur : un niveau se code et se décode à l\'identique', page, () => {
    const d = { name: 'Essai', world: 3, waves: 40, paths: [[[0, 2], [20, 2], [20, 9], [4, 9], [4, 12]], [[25, 13], [12, 13], [12, 9]]] };
    if (edCheck(d)) return edCheck(d);
    const c = lvlEncode(d), d2 = lvlDecode(c);
    return !!d2 && JSON.stringify(d2.paths) === JSON.stringify(d.paths) && d2.name === 'Essai' && d2.world === 3 || 'décodage différent';
  });
  await test('éditeur : divisions et sorties multiples', page, () => {
    // une entrée, une division au milieu : 2 trajets et 2 sorties
    const d = Object.assign({ name: 'Div', world: 0, waves: 20, paths: [[[0, 3], [12, 3], [12, 12]], [[12, 6], [22, 6]]] }, ED_DEF);
    if (edCheck(d)) return edCheck(d);
    const m = defToMap(d, 1), exits = new Set(m.routes.map(r => r[r.length - 1] + ''));
    if (m.entries.length !== 1 || m.routes.length !== 2 || exits.size !== 2) return 'entrées ' + m.entries.length + ', trajets ' + m.routes.length + ', sorties ' + exits.size;
    // les virus se répartissent sur les deux branches
    const c = lvlEncode(d); playLevel(c); for (let i = 0; i < 6; i++) spawnEnemy('bug', 1);
    return new Set(G.enemies.map(e => G.m.routes.indexOf(e.route))).size === 2 || 'tous les virus prennent la même branche';
  });
  await test('éditeur : virus, boss et réglages choisis sont respectés', page, () => {
    const d = { name: 'Choix', world: 2, waves: 20, paths: [[[0, 3], [22, 3], [22, 11]]], vir: ['ghost', 'drone'], boss: 'tempest', megas: false, cash: 250, lives: 7 };
    const d2 = lvlDecode(lvlEncode(d)); if (!d2) return 'décodage';
    if (d2.vir.join() !== 'ghost,drone' || d2.boss !== 'tempest' || d2.megas || d2.cash !== 250 || d2.lives !== 7) return JSON.stringify(d2);
    playLevel(lvlEncode(d)); if (G.cash !== 250 || G.lives !== 7) return 'crédits ' + G.cash + ' vies ' + G.lives;
    for (let w = 1; w < 20; w++) { const wd = waveDef(w); if (!['ghost', 'drone'].includes(wd.type) || (wd.type2 && !['ghost', 'drone'].includes(wd.type2))) return 'vague ' + w + ' : ' + wd.type; }
    return waveDef(20).type === 'tempest' || 'boss : ' + waveDef(20).type;
  });
  await test('éditeur : les anciens codes VD1 restent valides', page, () => !!lvlDecode('VD1~Test%20ami~6~30~03k3k8484bcb.pdgdgb'));
  await test('éditeur : un code invalide est refusé', page, () => lvlDecode('VD1~x~99~5~zz') === null && lvlDecode('n\'importe quoi') === null);
  await test('zones aléatoires toujours valides', page, () => { for (let s = 1; s <= 200; s++) { const d = randomDef(s * 7919), e = edCheck(d); if (e) return 'graine ' + s + ' : ' + e; if (!defToMap(d, s).routes.length) return 'graine ' + s; } return true; });
  await test('un niveau créé se joue', page, () => {
    const c = lvlEncode({ name: 'Jeu', world: 7, waves: 20, paths: [[[0, 3], [22, 3], [22, 11], [8, 11]]] }); playLevel(c);
    for (let w = 0; w < 3; w++) { startWave(); for (let i = 0; i < 30 * 30 && (G.queue.length || G.enemies.length); i++) update(1 / 30); }
    return G.custom && G.wave === 3 || 'partie non lancée';
  });
  await test('mutateurs : les virus géants ont plus de PV', page, () => {
    save.muts = {}; startMap(0); spawnEnemy('bug', 5); const a = G.enemies[0].max;
    save.muts = { giant: 1 }; startMap(0); spawnEnemy('bug', 5); const b = G.enemies[0].max; save.muts = {};
    return Math.abs(b / a - 1.6) < .01 || 'rapport ' + (b / a);
  });
  await test('missions de la semaine : 3 missions qui progressent', page, () => { const m = missions(); stat('kills', 5); const m2 = missions(); return m.length === 3 && (m2.find(x => x.k === 'kills') ? m2.find(x => x.k === 'kills').p >= 5 : true); });

  results.push([errors.length === 0, 'aucune erreur JavaScript' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : '')]);
  await browser.close(); server.close();
  let fail = 0;
  for (const [ok, name, ms] of results) { console.log((ok ? '  ✔ ' : '  ✘ ') + name + (ms !== undefined ? '  (' + ms + ' ms)' : '')); if (!ok) fail++; }
  console.log(fail ? '\n' + fail + ' test(s) en échec' : '\nTous les tests passent (' + results.length + ')');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
