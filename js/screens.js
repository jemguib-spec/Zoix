'use strict';
/* Virus Défense — fin de partie, boutique, menus */
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
  if (G.custom) { // niveau créé : petite récompense + record de ce niveau
    G.chipsWon = Math.min(15, Math.floor(waves * .3));
    const lk = G.lives / (G.maxLives || G.d.lives); G.stars = win ? (lk >= 1 ? 3 : lk >= .5 ? 2 : 1) : 0;
    if (G.opts && G.opts.lvKey) { save.lvBest = save.lvBest || {}; const r = save.lvBest[G.opts.lvKey] || { s: 0, st: 0, w: 0, n: 0 }; r.n++; if (G.score > r.s) { r.s = G.score; G.record = r.n > 1; } r.st = Math.max(r.st, G.stars); r.w = Math.max(r.w, waves); save.lvBest[G.opts.lvKey] = r; }
    if (win) sfx('win'); else { sfx('lose'); vibe(300); }
  } else if (endless) {
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
    if (CPOS[G.mi] + 2 > save.unlocked[curDiff]) save.unlocked[curDiff] = Math.min(NCAMP, CPOS[G.mi] + 2);
    G.chipsWon = Math.round((20 + 8 * st + 1.8 * CPOS[G.mi]) * CHIP_MULT[curDiff]) + (first ? 15 : 0);
    // défis de la zone
    save.chal = save.chal || {}; G.chalRes = [];
    for (const c of zoneChals(G.mi)) { const ok = CHALS[c].ok(G), was = save.chal[G.mi + ':' + c]; if (ok && !was) { save.chal[G.mi + ':' + c] = 1; G.chipsWon += 12; } G.chalRes.push({ c, ok, isNew: ok && !was }); }
    S.wins = (S.wins || 0) + 1; S.worldWin = S.worldWin || {}; S.worldWin[worldIdx(G.mi)] = 1;
    if (curDiff === 'legend') S.legendWins = (S.legendWins || 0) + 1;
    if (G.lives >= G.maxLives) unlockAch('perfect');
    sfx('win'); G.stars = st;
  } else {
    const key = curDiff + G.mi; save.best[key] = Math.max(save.best[key] || 0, G.score);
    G.chipsWon = Math.floor(Math.max(0, G.wave - 1) * .8 * CHIP_MULT[curDiff]);
    S.losses = (S.losses || 0) + 1;
    sfx('lose'); vibe(300);
  }
  if (save.prestige) G.chipsWon = Math.round(G.chipsWon * (1 + .15 * save.prestige));
  if (mutBonus(G.muts)) G.chipsWon = Math.round(G.chipsWon * (1 + mutBonus(G.muts)));
  save.chips = (save.chips || 0) + G.chipsWon;
  checkAch(); persist();
  if (win && !G.endless && !G.daily && G.mi === lastZone() && !(save.story || {}).end) G.showEnd = true;
}
function showResult(win) {
  setState('result');
  const last = G.mi === lastZone(), endless = G.endless, daily = G.daily, waves = win ? G.total : Math.max(0, G.wave - 1);
  $('#resTitle').textContent = G.custom ? (win ? '🛠 Niveau réussi !' : '🛠 Niveau perdu…') : endless ? '♾ Fin du mode infini' : daily ? (win ? '📅 Défi du jour réussi !' : '📅 Défi du jour raté') : win ? (last ? '🏆 Ordinateur sauvé !' : 'Zone nettoyée !') : 'L\'ordinateur est infecté…';
  $('#resTitle').style.color = win || (endless && waves >= 10) ? '#a5d6a7' : '#ff8a80';
  $('#resStars').innerHTML = endless ? '<span class="bigwave">' + waves + '</span>' : win && !daily ? [0, 1, 2].map(i => '<span class="st' + (i < G.stars ? ' on' : '') + '" style="animation-delay:' + (.25 + i * .25) + 's">★</span>').join('') : win ? '<span class="bigwave">✔</span>' : '<span class="skull">☠</span>';
  $('#resChips').innerHTML = '+' + (G.chipsWon || 0) + ' ⬢ <small>puces</small>' + (G.record ? '<em class="rec">NOUVEAU RECORD !</em>' : '');
  // tourelle la plus utile
  let mvp = null, tot = 0; for (const t of G.towers) { tot += t.dmg || 0; if (!mvp || (t.dmg || 0) > (mvp.dmg || 0)) mvp = t; }
  const recKey = curDiff + G.mi;
  let html = '<div><small>' + (daily ? 'Défi' : 'Zone') + '</small><b>' + G.m.name + '</b></div><div><small>Difficulté</small><b>' + G.d.name + '</b></div><div><small>Vagues</small><b>' + waves + (endless ? '' : ' / ' + G.total) + '</b></div><div><small>Virus détruits</small><b>' + G.kills + '</b></div><div><small>Score</small><b style="color:#e6ee5a">' + G.score + '</b></div>' +
    '<div><small>Record</small><b>' + (endless ? 'vague ' + ((save.endless || {})[recKey] || 0) : daily ? (save.daily.best || 0) : (save.best[recKey] || 0)) + '</b></div>';
  if (mvp && tot > 0) html += '<div class="wide"><small>Tourelle MVP</small><b style="color:' + TOWERS[mvp.type].col + '">' + tName(mvp.type) + ' niv. ' + mvp.lvl + ' · ' + Math.round(100 * mvp.dmg / tot) + ' % des dégâts</b></div>';
  if (G.chalRes) html += '<div class="wide chal"><small>Défis de la zone</small>' + G.chalRes.map(r => '<b class="' + (r.ok ? 'ok' : 'ko') + '">' + (r.ok ? '🏅 ' : '✘ ') + CHALS[r.c].name + (r.isNew ? ' <i>+12 ⬢</i>' : '') + '</b>').join('') + '</div>';
  if (G.newAch && G.newAch.length) html += '<div class="wide"><small>Succès débloqués</small><b>' + G.newAch.map(a => a.ic + ' ' + a.name).join(' · ') + '</b></div>';
  $('#resBody').innerHTML = html;
  const nb = $('#resNext');
  if (win && !last && !endless && !daily && !G.custom) { nb.classList.remove('hidden'); nb.textContent = '▶ Suivante'; nb.onclick = () => startMap(nextZone(G.mi)); }
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
    $('#shopInfo').innerHTML = '<b style="color:' + d.col + '">' + tName(k) + '</b> — ' + tDesc(k) + '<br><small>Recherche ' + r + '/5 : +' + (8 * r) + ' % dégâts, +' + (3 * r) + ' % portée' + (r >= 2 ? ' · niveau 5 débloqué' : ' · le niveau 5 se débloque à la recherche 2') + '<br>Voie A · ' + SPECIAL[k] + '<br>Voie B · ' + SPECIALB[k] + (r >= 5 ? ' · −10 % sur le prix' : ' · recherche 5 : −10 % sur le prix') + '</small>';
  } else if (shopTab === 'skins') {
    save.skins = save.skins || { classic: 1 };
    for (const k in SKINS) {
      const S = SKINS[k], own = k === 'classic' || save.skins[k], on = (save.skin || 'classic') === k, c = document.createElement('div'); c.className = 'scard' + (on ? ' sel' : '');
      const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 72; const g = cv2.getContext('2d'); g.setTransform(72, 0, 0, 72, 36, 36);
      const keep = save.skin; save.skin = k; drawTower(g, 'cannon', 3, -Math.PI / 4, 0, 0); save.skin = keep; c.appendChild(cv2);
      const info = document.createElement('div'); info.className = 'sinfo'; info.innerHTML = '<b>' + S.name + '</b><small>' + (on ? 'équipée' : own ? 'achetée' : S.cost + ' ⬢') + '</small>'; c.appendChild(info);
      const bt = document.createElement('button'); bt.className = 'sbuy';
      if (on) { bt.textContent = '✔'; bt.classList.add('off'); }
      else if (own) { bt.textContent = 'Équiper'; bt.onclick = () => { save.skin = k; persist(); sfx('build'); buildShop(); }; }
      else { bt.textContent = S.cost + ' ⬢'; bt.classList.toggle('off', save.chips < S.cost); bt.onclick = () => buyChips(S.cost, () => { save.skins[k] = 1; save.skin = k; }); }
      c.appendChild(bt); list.appendChild(c);
    }
    $('#shopInfo').innerHTML = '<small>Les apparences changent le socle de toutes tes tourelles. Purement esthétique.</small>';
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
    { // prestige
      const P = save.prestige || 0, c = document.createElement('div'); c.className = 'scard prestige';
      c.innerHTML = '<div class="sic">♛</div><div class="sinfo"><b>Prestige ' + (P ? P : '') + '</b><small>' + (P ? 'Bonus actuel : +' + 10 * P + ' % dégâts, +' + 5 * P + ' cr de départ, +' + 15 * P + ' % de puces.<br>' : '') + 'Recommence tout (zones, recherches, améliorations, puces) contre un bonus permanent de +10 % de dégâts, +5 crédits de départ et +15 % de puces.</small></div>';
      const bt = document.createElement('button'); bt.className = 'sbuy'; const ok = prestigeReady();
      bt.textContent = ok ? '♛ Prestige ' + (P + 1) : '🔒 Finis la dernière zone'; bt.classList.toggle('off', !ok);
      bt.onclick = () => { if (!prestigeReady()) { toast('Termine la dernière zone (' + MAPS[lastZone()].name + ') pour débloquer le prestige'); sfx('err'); return; }
        if (!confirm('Prestige ' + (P + 1) + ' : tes zones, recherches, améliorations et puces repartent à zéro. Tes succès, statistiques, apparences et charges de pouvoirs sont conservés. Continuer ?')) return;
        Object.assign(save, { prestige: P + 1, chips: 50, unlockT: {}, research: {}, gup: {}, stars: {}, best: {}, unlocked: JSON.parse(JSON.stringify(DEFAULT_SAVE.unlocked)) });
        persist(); sfx('win'); toast('♛ Prestige ' + (P + 1) + ' ! Tes tourelles sont plus fortes pour toujours.'); buildShop(); };
      c.appendChild(bt); list.appendChild(c);
    }
    $('#shopInfo').innerHTML = '<small>Les améliorations sont permanentes et s\'appliquent à toutes les zones et toutes les difficultés.</small>';
  }
}
function openShop(from) { const w = G ? worldIdx(G.mi) : (mapPage || 0); shopFrom = from; setState('shop'); shopWorld = w; buildShop(); }
// aperçu du style des tourelles dans chaque monde
function buildShopWorlds() {
  const box = $('#shopWorlds'); if (!box) return; box.innerHTML = '';
  box.classList.toggle('hidden', shopTab !== 'towers');
  WORLDS.forEach((w, i) => {
    const b = document.createElement('button'), on = curWorld() === i; b.className = 'tab' + (on ? ' on' : ''); b.title = w.name;
    b.innerHTML = w.ic + (on ? ' <span>' + w.name + '</span>' : '');
    b.onclick = () => { shopWorld = i; buildShop(); }; box.appendChild(b);
  });
}
document.querySelectorAll('#shop .tab').forEach(b => b.addEventListener('click', () => { shopTab = b.dataset.tab; buildShop(); }));
$('#shopBack').onclick = () => setState(shopFrom === 'result' ? 'maps' : shopFrom);

/* ---------------- écrans ---------------- */
const screens = ['menu', 'diff', 'maps', 'help', 'options', 'pause', 'result', 'shop', 'daily', 'trophy', 'levels'];
function show(id) {
  for (const s of screens) $('#' + s).classList.toggle('hidden', s !== id);
  if (id === 'diff') buildDiff();
  if (id === 'maps') buildMaps();
  if (id === 'options') buildOptions();
  if (id === 'shop') buildShop();
  if (id === 'daily') buildDaily();
  if (id === 'levels') buildLevels();
  if (id === 'trophy') buildTrophy();
  if (id === 'pause') buildPause();
  if (id === 'menu') $('#menuChips').textContent = save.chips || 0;
}
function setState(s) {
  state = s;
  if (s !== 'shop') shopWorld = null;
  $('#panel').classList.toggle('hidden', s !== 'play' && s !== 'pause');
  $('#edPanel').classList.toggle('hidden', s !== 'edit');
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
    b.innerHTML = '<span style="color:' + d.col + '">' + d.name + '</span><small>' + d.desc + ' · zones ' + save.unlocked[k] + '/' + NCAMP + '</small>';
    b.onclick = () => { curDiff = k; mapPage = null; setState('maps'); };
    if (curMode === 'endless') b.querySelector('small').textContent = d.desc + ' · meilleur : vague ' + Math.max(0, ...MAPS.map((_, i) => (save.endless || {})[k + i] || 0));
    box.appendChild(b);
  }
}
const thumbs = {}; let mapPage = null;
// carte des mondes et chemin des zones : voir js/worldmap.js
function buildOptions() {
  $('#optAuto').textContent = 'Vague suivante automatique : ' + (save.autoWave ? 'OUI' : 'NON');
  $('#optSound').textContent = 'Bruitages : ' + (save.sound ? 'OUI' : 'NON');
  $('#optMusic').textContent = 'Musique : ' + (save.music ? 'OUI' : 'NON');
  $('#optVibe').textContent = 'Vibrations : ' + (save.vibe ? 'OUI' : 'NON');
  $('#optSide').textContent = 'Panneau des armes : ' + (save.side === 'left' ? 'À GAUCHE' : 'À DROITE');
  $('#optCb').textContent = '🎨 Mode daltonien : ' + (save.cb ? 'OUI' : 'NON');
  $('#volMus').value = Math.round((save.musVol ?? .8) * 100); $('#volSfx').value = Math.round((save.sfxVol ?? 1) * 100);
  $('#optDmg').textContent = '🔢 Chiffres de dégâts : ' + (save.dmgNums ? 'OUI' : 'NON');
  $('#optEco').textContent = '🔋 Économie de batterie : ' + (save.eco ? 'OUI' : 'NON');
}
$('#optAuto').onclick = () => { save.autoWave = !save.autoWave; persist(); buildOptions(); };
$('#optSound').onclick = () => { save.sound = !save.sound; persist(); buildOptions(); };
$('#optMusic').onclick = () => { initAudio(); save.music = !save.music; persist(); buildOptions(); };
$('#optSide').onclick = () => { save.side = save.side === 'left' ? 'right' : 'left'; persist(); buildOptions(); };
$('#optVibe').onclick = () => { save.vibe = !save.vibe; persist(); buildOptions(); };
$('#optCb').onclick = () => { save.cb = !save.cb; persist(); document.body.classList.toggle('cb', !!save.cb); buildOptions(); toast(save.cb ? 'Mode daltonien : le rouge et le vert sont remplacés par l\'orange et le bleu' : 'Mode daltonien désactivé'); };
$('#volMus').oninput = e => { save.musVol = e.target.value / 100; persist(); };
$('#volSfx').oninput = e => { save.sfxVol = e.target.value / 100; persist(); };
$('#volSfx').onchange = () => { initAudio(); sfx('coin'); };
$('#optDmg').onclick = () => { save.dmgNums = !save.dmgNums; persist(); buildOptions(); };
$('#optEco').onclick = () => { save.eco = !save.eco; persist(); if (G) G.eco = save.eco; if (DEMO) DEMO.eco = save.eco; for (const k in baseCache) delete baseCache[k]; buildOptions(); layout(); toast(save.eco ? '🔋 Économie : 30 images/s, moins d\'effets et de particules, résolution réduite' : 'Économie de batterie désactivée'); };
 // codes développeur
const CODES = {
  PUCES5000: () => { save.chips = (save.chips || 0) + 5000; return '+5000 ⬢ puces'; },
  TOUTDEBLOQUER: () => { for (const k in DIFFS) save.unlocked[k] = NCAMP; for (const k of TORDER) (save.unlockT = save.unlockT || {})[k] = 1; return 'Toutes les zones et tourelles débloquées'; },
  RECHERCHEMAX: () => { save.research = save.research || {}; for (const k of TORDER) save.research[k] = 5; return 'Toutes les recherches au maximum'; },
  POUVOIRS: () => { save.pwStock = save.pwStock || {}; for (const k in POWERS) save.pwStock[k] = pwStock(k) + 50; return '+50 charges de chaque pouvoir'; }
};
$('#codeGo').onclick = () => {
  const inp = $('#codeIn'), c = (inp.value || '').trim().toUpperCase().replace(/\s+/g, '');
  const f = CODES[c]; inp.value = '';
  if (!f) { toast('Code inconnu'); sfx('err'); return; }
  const msg = f(); persist(); toast('🔓 Code accepté : ' + msg); sfx('up'); initAudio();
};
$('#codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('#codeGo').click(); });
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
$('#btnRestart').onclick = () => G.daily ? startDaily() : startMap(G.mi, G.opts);
$('#btnQuit').onclick = () => { const d = G && G.daily; if (G && !G.over) { save.stats.playTime = (save.stats.playTime || 0) + G.time; persist(); } setState(backFromGame()); };
$('#resRetry').onclick = () => G.daily ? startDaily() : startMap(G.mi, G.opts);
const backFromGame = () => G && G.daily ? 'menu' : G && G.custom ? (G.opts.fromEditor ? 'edit' : 'levels') : 'maps';
$('#resMaps').onclick = () => setState(backFromGame());
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
function buildTrophy() { checkMissions();
  document.querySelectorAll('#trophy .tab').forEach(b => b.classList.toggle('on', b.dataset.tt === trophyTab));
  const L2 = $('#trophyList'); L2.innerHTML = ''; L2.className = 'tl-' + trophyTab;
  const S = save.stats || {};
  if (trophyTab === 'missions') {
    const ms = missions(), left = 7 - Math.floor((Date.now() / 864e5 + 3) % 7);
    L2.innerHTML = '<p class="tsum">Missions de la semaine · nouvelles dans ' + left + ' jour' + (left > 1 ? 's' : '') + ' · ' + MISSION_REWARD + ' ⬢ chacune</p>' + ms.map(m => '<div class="ach mis' + (m.done ? ' on' : '') + '"><i>' + (m.done ? '✅' : '🎯') + '</i><div><b>' + m.t + '</b><u><s style="width:' + Math.round(100 * Math.max(0, m.p) / m.n) + '%"></s></u><small>' + Math.max(0, m.p) + ' / ' + m.n + '</small></div><em>+' + MISSION_REWARD + ' ⬢</em></div>').join('');
    return;
  }
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
      ['Zones gagnées', S.wins || 0], ['Défaites', S.losses || 0], ['Vagues tenues', S.waves || 0], ['Record mode infini', 'vague ' + (S.endlessBest || 0)], ['Défis du jour réussis', S.dailyWins || 0], ['Défis de zone', Object.keys(save.chal || {}).length + ' / ' + NCAMP * 2],
      ['Tourelles réparées', S.repairs || 0], ['Tourelle préférée', S['built_' + best] ? TOWERS[best].name : '—'], ['Temps de jeu', Math.floor((S.playTime || 0) / 60) + ' min']];
    L2.innerHTML = rows.map(r => '<div class="srow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('');
  }
}
function buildPause() {
  if (!G) return;
  const W0 = worldOf(G.mi), r = RULES[W0.style];
  let h = '<b>' + (G.daily ? '📅 Défi du jour' : G.endless ? '♾ Mode infini' : W0.name) + ' · ' + G.m.name + '</b><small>Règle · ' + r.name + ' : ' + r.desc + '</small>';
  if (G.daily) { const md = DMODS.find(x => x.id === G.mod); h += '<small>🎲 ' + md.name + ' : ' + md.desc + '</small>'; }
  if (G.mi < NCAMP && mutBonus(G.muts)) h += '<small>Mutateurs : ' + Object.keys(G.muts).map(k => MUTS[k].ic + ' ' + MUTS[k].name).join(', ') + ' (+' + Math.round(mutBonus(G.muts) * 100) + ' % ⬢)</small>';
  else if (!G.endless && G.mi < NCAMP) h += zoneChals(G.mi).map(c => { const ok = CHALS[c].ok(G), was = (save.chal || {})[G.mi + ':' + c]; return '<small class="' + (ok ? 'ok' : 'ko') + '">' + (was ? '🏅' : ok ? '◻' : '✘') + ' ' + CHALS[c].name + (ok ? '' : ' (raté)') + '</small>'; }).join('');
  $('#pauseInfo').innerHTML = h;
}
// bouton retour d'Android (appli) : pause, reprise, retour au menu ; sinon l'appli se ferme
window.onAndroidBack = () => {
  if (state === 'play') { if (G && G.sel) { closePopup(); return true; } pauseGame(); return true; }
  if (state === 'pause') { resumeGame(); return true; }
  if (state === 'menu') return false;
  if (state === 'maps' && wmBack()) return true;
  setState(state === 'maps' ? 'diff' : 'menu'); return true;
};
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
