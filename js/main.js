'use strict';
/* Virus Défense — boucle principale et démarrage */
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
  if (G.endT > 2.8 && state === 'play') { showResult(G.win); if (G.showEnd) { G.showEnd = false; save.story = save.story || {}; save.story.end = 1; persist(); showStory(STORY_END, '🏆 AVA · Fin de l\'infection', null); } }
}
function frame(now) {
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state === 'play' && G && !G.over) {
    if (G.storyOpen) { } // le jeu attend que le message soit lu
    else if (G.hitstop > 0) G.hitstop -= dt; // petite pause sur les gros impacts
    else for (let i = 0; i < G.speed; i++) update(dt);
    panelT -= dt; if (panelT <= 0) { panelT = .1; updatePanel(); }
  } else if (G && G.over && (state === 'play' || state === 'result')) updateEnd(dt);
  musicTick();
  if (G && (state === 'play' || state === 'pause' || state === 'result')) render();
  else if (state === 'edit') renderEditor();
  else {
    // menus : une partie de démonstration tourne en fond
    if (!DEMO || DEMO.time > 150) DEMO = newGame(Math.floor(Math.random() * NCAMP), true);
    G = DEMO; update(dt); render(); G = null;
  }
  requestAnimationFrame(frame);
}
layout();
setState('menu');
{ // niveau partagé par lien (#lvl=…)
  const hm = location.hash.match(/lvl=(VD1~[^&#\s]+)/);
  if (hm) { history.replaceState(null, '', location.pathname + location.search); if (importLevel(hm[1])) setState('levels'); }
}
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
