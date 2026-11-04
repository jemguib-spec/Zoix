'use strict';
/* Virus Défense — carte des mondes : îles flottantes à faire défiler, puis chemin des zones de chaque monde.
   Tout est dessiné par le jeu, dans l'univers de l'ordinateur (puces, forge, disques, serveurs, glace, néon, vieux PC, nuage). */
const WM = { view: 'worlds', pos: 0, target: 0, drag: null, sel: -1, t: 0, run: false, hit: [], cache: {}, stars: null };
const wmCv = $('#wmCv'), wmG = wmCv.getContext('2d');
const wmUnlocked = wi => save.unlocked[curDiff] > wi * 3; // un monde est ouvert dès que sa première zone l'est
const wmStars = wi => [0, 1, 2].reduce((a, k) => a + (save.stars[curDiff + (wi * 3 + k)] || 0), 0);
const wmDone = wi => [0, 1, 2].filter(k => save.unlocked[curDiff] > wi * 3 + k + 1 || (save.stars[curDiff + (wi * 3 + k)] || 0) > 0).length;
// couleurs des îles : dessus, roche claire, roche sombre, lueur
const ISLE = [
  ['#2e7d32', '#8d6e63', '#3e2723', '#76ff03'], ['#3e2723', '#6d4c41', '#1b0f0b', '#ff6d00'], ['#1565c0', '#546e7a', '#1c2a33', '#40c4ff'], ['#78909c', '#546e7a', '#263238', '#76ff03'],
  ['#e3f2fd', '#81d4fa', '#1f5f8b', '#b3e5fc'], ['#24123f', '#4a1f73', '#12061f', '#ff2bd6'], ['#d7ccc8', '#a1887f', '#4e342e', '#ffab00'], ['#ffffff', '#bbdefb', '#5c7fa8', '#90caf9']
];

/* ---------- dessin d'une île ---------- */
function wmRock(g, s, c1, c2, seed) { // dessous rocheux en pointe, en strates
  const R = mulberry(seed);
  g.beginPath(); g.moveTo(-s, 0);
  const n = 9; for (let i = 0; i <= n; i++) { const u = i / n, x = -s + u * 2 * s, depth = Math.sin(u * Math.PI) * s * (1 + R() * .25) + (i % 2 ? s * .12 : 0); g.lineTo(x * (1 - u * u * .1), depth); }
  g.lineTo(s * .05, s * 1.55); g.closePath();
  const gr = g.createLinearGradient(0, 0, 0, s * 1.5); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = s * .03; g.stroke();
  g.save(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = s * .05;
  for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(-s, k * s * .22); for (let x = -s; x <= s; x += s * .25) g.lineTo(x, k * s * .22 + (R() - .5) * s * .08); g.stroke(); }
  g.restore();
}
function wmTop(g, s, col) { // dessus de l'île
  const gr = g.createLinearGradient(0, -s * .35, 0, s * .35); gr.addColorStop(0, shade(col, .25)); gr.addColorStop(1, shade(col, -.25));
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, s, s * .36, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = s * .025; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(-s * .2, -s * .1, s * .6, s * .14, 0, 0, TAU); g.fill();
}
function wmGlow(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgbaA(col).replace('A', a)); gr.addColorStop(1, rgbaA(col).replace('A', 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function wmBox(g, x, y, w, h, c1, c2, r) { const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; rr(g, x, y, w, h, r || 0); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = Math.max(1, w * .03); g.stroke(); }
function drawIsland(g, wi, s, t) {
  const P = ISLE[wi], sd = wi * 977 + 13;
  g.save();
  wmGlow(g, 0, s * .6, s * 1.6, P[3], .22);
  if (wi === 7) { // le Nuage : île faite de nuages
    for (const [x, y, r] of [[-.7, .15, .45], [-.25, .3, .55], [.3, .28, .5], [.75, .12, .42], [0, .55, .45], [-.45, .55, .35], [.45, .55, .35]]) { const gr = g.createRadialGradient(x * s - r * s * .3, y * s - r * s * .3, 0, x * s, y * s, r * s); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#a9c4e8'); g.fillStyle = gr; g.beginPath(); g.arc(x * s, y * s, r * s, 0, TAU); g.fill(); }
  } else wmRock(g, s, P[1], P[2], sd);
  // petits rochers qui flottent autour
  const R = mulberry(sd + 5);
  for (let k = 0; k < 3; k++) { const a = R() * TAU, d = s * (1.25 + R() * .3), y0 = Math.sin(t * 1.3 + k * 2) * s * .05; g.save(); g.translate(Math.cos(a) * d, s * .3 + Math.sin(a) * s * .35 + y0); g.scale(s * .1, s * .1); if (wi === 7) { g.fillStyle = '#eef5ff'; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); } else { g.fillStyle = P[1]; g.beginPath(); g.moveTo(-1, 0); g.lineTo(1, -.2); g.lineTo(.3, 1.4); g.closePath(); g.fill(); g.fillStyle = P[0]; g.beginPath(); g.ellipse(0, 0, 1.05, .35, 0, 0, TAU); g.fill(); } g.restore(); }
  if (wi !== 7) wmTop(g, s, P[0]); else { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, s * .95, s * .32, 0, 0, TAU); g.fill(); }
  const u = s / 100; // unité de dessin
  switch (wi) {
    case 0: { // Circuit imprimé : processeur, pistes dorées, condensateurs
      g.strokeStyle = '#ffd54f'; g.lineWidth = 2 * u; g.beginPath(); for (const [a, b] of [[-80, -5], [-50, 18], [55, 10], [80, -8]]) { g.moveTo(a * u, b * u); g.lineTo(a * .3 * u, b * .3 * u); } g.stroke();
      wmBox(g, -30 * u, -42 * u, 60 * u, 40 * u, '#424242', '#111', 4 * u);
      g.fillStyle = '#bdbdbd'; for (let i = 0; i < 6; i++) { g.fillRect((-26 + i * 10) * u, -46 * u, 4 * u, 4 * u); g.fillRect((-26 + i * 10) * u, -2 * u, 4 * u, 4 * u); }
      g.fillStyle = '#76ff03'; g.font = '900 ' + (13 * u) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CPU', 0, -22 * u);
      for (const [x, h] of [[-62, 30], [-48, 22], [52, 26]]) { wmBox(g, (x - 7) * u, (-h - 2) * u, 14 * u, h * u, '#1e88e5', '#0d47a1', 5 * u); g.fillStyle = '#cfd8dc'; g.beginPath(); g.ellipse(x * u, (-h - 2) * u, 7 * u, 3 * u, 0, 0, TAU); g.fill(); }
      wmGlow(g, 0, -22 * u, 40 * u, '#76ff03', .25 + .1 * Math.sin(t * 3)); break;
    }
    case 1: { // La Fournaise : volcan de lave
      g.fillStyle = '#3e2723'; g.beginPath(); g.moveTo(-60 * u, 5 * u); g.lineTo(-18 * u, -70 * u); g.lineTo(18 * u, -70 * u); g.lineTo(60 * u, 5 * u); g.closePath(); g.fill();
      g.fillStyle = '#ff6d00'; g.beginPath(); g.moveTo(-18 * u, -70 * u); g.lineTo(18 * u, -70 * u); g.lineTo(8 * u, -40 * u); g.lineTo(0, -55 * u); g.lineTo(-10 * u, -35 * u); g.closePath(); g.fill();
      wmGlow(g, 0, -72 * u, 45 * u, '#ff6d00', .5 + .15 * Math.sin(t * 4));
      for (let k = 0; k < 5; k++) { const q = (t * .4 + k / 5) % 1; g.fillStyle = 'rgba(120,110,100,' + (.4 * (1 - q)) + ')'; g.beginPath(); g.arc(Math.sin(k * 3 + q * 4) * 12 * u, (-80 - q * 60) * u, (6 + q * 14) * u, 0, TAU); g.fill(); }
      for (let k = 0; k < 6; k++) { const q = (t * .7 + k / 6) % 1; g.fillStyle = 'rgba(255,170,60,' + (1 - q) + ')'; g.fillRect((Math.sin(k * 7) * 30) * u, (-70 - q * 70) * u, 3 * u, 3 * u); }
      break;
    }
    case 2: { // Flux de données : disque dur et fibres lumineuses
      for (let k = 0; k < 4; k++) { const x = (-60 + k * 40) * u, h = (60 + (k % 2) * 30) * u; const gr = g.createLinearGradient(0, 0, 0, -h); gr.addColorStop(0, 'rgba(64,196,255,.7)'); gr.addColorStop(1, 'rgba(64,196,255,0)'); g.fillStyle = gr; g.fillRect(x - 2 * u, -h, 4 * u, h); const q = (t * .8 + k * .3) % 1; wmGlow(g, x, -q * h, 8 * u, '#18ffff', .9); }
      wmBox(g, -42 * u, -36 * u, 84 * u, 30 * u, '#90a4ae', '#455a64', 6 * u);
      const gr = g.createRadialGradient(-10 * u, -26 * u, 2 * u, 0, -22 * u, 30 * u); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#78909c'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, -22 * u, 32 * u, 10 * u, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5 * u; g.beginPath(); g.ellipse(0, -22 * u, 20 * u, 6 * u, t * 2, 0, Math.PI); g.stroke();
      g.strokeStyle = '#263238'; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(34 * u, -30 * u); g.lineTo(8 * u, -22 * u); g.stroke(); break;
    }
    case 3: { // Salle des serveurs : baie de serveurs aux voyants qui clignotent
      wmBox(g, -28 * u, -96 * u, 56 * u, 94 * u, '#455a64', '#1c262b', 4 * u);
      for (let k = 0; k < 7; k++) { const y = (-90 + k * 12.5) * u; g.fillStyle = '#263238'; g.fillRect(-23 * u, y, 46 * u, 10 * u); for (let j = 0; j < 4; j++) { g.fillStyle = Math.sin(t * 6 + k * 1.7 + j * 2.3) > .2 ? (j === 3 ? '#ffab00' : '#76ff03') : '#1b3a1b'; g.fillRect((-19 + j * 6) * u, y + 3.5 * u, 3 * u, 3 * u); } g.fillStyle = '#37474f'; g.fillRect(5 * u, y + 2 * u, 14 * u, 6 * u); }
      for (const x of [-60, 52]) { wmBox(g, (x - 9) * u, -40 * u, 18 * u, 38 * u, '#546e7a', '#263238', 3 * u); g.fillStyle = '#76ff03'; g.fillRect((x - 4) * u, -34 * u, 3 * u, 3 * u); }
      wmGlow(g, 0, -50 * u, 60 * u, '#76ff03', .12); break;
    }
    case 4: { // Zone cryogénique : cristaux de glace et réservoir
      for (const [x, h, w, a] of [[-38, 70, 16, -.2], [-12, 95, 20, 0], [16, 75, 16, .15], [40, 50, 13, .3]]) {
        g.save(); g.translate(x * u, -2 * u); g.rotate(a); const gr = g.createLinearGradient(-w * u, 0, w * u, 0); gr.addColorStop(0, '#e1f5fe'); gr.addColorStop(.5, '#81d4fa'); gr.addColorStop(1, '#0288d1');
        g.fillStyle = gr; g.beginPath(); g.moveTo(-w * u, 0); g.lineTo(-w * .6 * u, -h * .75 * u); g.lineTo(0, -h * u); g.lineTo(w * .6 * u, -h * .75 * u); g.lineTo(w * u, 0); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5 * u; g.stroke(); g.restore();
      }
      wmGlow(g, -12 * u, -60 * u, 55 * u, '#b3e5fc', .3 + .1 * Math.sin(t * 2));
      for (let k = 0; k < 6; k++) { const q = (t * .25 + k / 6) % 1; g.fillStyle = 'rgba(255,255,255,' + (1 - q) + ')'; g.beginPath(); g.arc((Math.sin(k * 5 + t) * 70) * u, (-110 + q * 110) * u, 2 * u, 0, TAU); g.fill(); }
      break;
    }
    case 5: { // Cyberespace : pyramide holographique qui tourne
      g.strokeStyle = 'rgba(255,43,214,.45)'; g.lineWidth = 1 * u; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * 25 * u, -8 * u); g.lineTo(k * 30 * u, 8 * u); g.stroke(); }
      const a = t * .8, pts = [0, 1, 2, 3].map(k => [Math.cos(a + k * Math.PI / 2) * 40 * u, -12 * u + Math.sin(a + k * Math.PI / 2) * 12 * u]), top = [0, -100 * u];
      for (const [col, w] of [['rgba(0,229,255,.35)', 7], ['#00e5ff', 2]]) { g.strokeStyle = col; g.lineWidth = w * u; g.beginPath(); pts.forEach((p, i) => { g.moveTo(p[0], p[1]); g.lineTo(...pts[(i + 1) % 4]); g.moveTo(p[0], p[1]); g.lineTo(...top); }); g.stroke(); }
      wmGlow(g, 0, -55 * u, 60 * u, '#ff2bd6', .25 + .1 * Math.sin(t * 5));
      g.fillStyle = '#ff2bd6'; g.font = '900 ' + (10 * u) + 'px monospace'; g.textAlign = 'center'; for (let k = 0; k < 5; k++) { const q = (t * .5 + k / 5) % 1; g.globalAlpha = 1 - q; g.fillText(k % 2 ? '1' : '0', (k * 31 % 100 - 50) * u, (-20 - q * 90) * u); } g.globalAlpha = 1; break;
    }
    case 6: { // Ordinateur rétro : écran cathodique, clavier et disquette
      wmBox(g, -40 * u, -82 * u, 80 * u, 66 * u, '#efebe9', '#a1887f', 8 * u);
      const blink = Math.sin(t * 4) > 0;
      g.fillStyle = '#0b2a0b'; rr(g, -32 * u, -75 * u, 64 * u, 46 * u, 6 * u); g.fill();
      g.fillStyle = '#76ff03'; g.font = '700 ' + (9 * u) + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('C:\\>RUN', -27 * u, -70 * u); g.fillText('VIRUS?' + (blink ? '_' : ''), -27 * u, -58 * u);
      wmGlow(g, 0, -52 * u, 40 * u, '#76ff03', .2);
      wmBox(g, -46 * u, -14 * u, 92 * u, 14 * u, '#d7ccc8', '#8d6e63', 3 * u);
      g.fillStyle = '#6d4c41'; for (let i = 0; i < 10; i++) g.fillRect((-41 + i * 8.5) * u, -11 * u, 6 * u, 3 * u);
      g.save(); g.translate(56 * u, -18 * u); g.rotate(.3); wmBox(g, -12 * u, -12 * u, 24 * u, 24 * u, '#1565c0', '#0d47a1', 2 * u); g.fillStyle = '#cfd8dc'; g.fillRect(-6 * u, -12 * u, 12 * u, 8 * u); g.restore(); break;
    }
    case 7: { // Le Nuage : antenne de serveur et petit orage
      g.strokeStyle = '#90a4ae'; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(-14 * u, 0); g.lineTo(0, -90 * u); g.lineTo(14 * u, 0); g.moveTo(-9 * u, -30 * u); g.lineTo(9 * u, -30 * u); g.moveTo(-5 * u, -60 * u); g.lineTo(5 * u, -60 * u); g.stroke();
      const on = Math.sin(t * 5) > 0; wmGlow(g, 0, -92 * u, 22 * u, '#ff5252', on ? .9 : .3);
      for (let k = 1; k <= 3; k++) { g.strokeStyle = 'rgba(144,202,249,' + (.6 - k * .15) + ')'; g.lineWidth = 2 * u; g.beginPath(); g.arc(0, -92 * u, (10 + k * 10 + (t * 20) % 10) * u, -2.4, -.7); g.stroke(); }
      g.save(); g.translate(52 * u, -70 * u); for (const [x, y, r] of [[-14, 0, 14], [0, -6, 16], [14, 0, 13]]) { g.fillStyle = '#78909c'; g.beginPath(); g.arc(x * u, y * u, r * u, 0, TAU); g.fill(); }
      if (Math.sin(t * 3) > .6) { g.fillStyle = '#ffeb3b'; g.beginPath(); g.moveTo(0, 8 * u); g.lineTo(-6 * u, 22 * u); g.lineTo(0, 20 * u); g.lineTo(-4 * u, 34 * u); g.lineTo(6 * u, 16 * u); g.lineTo(0, 18 * u); g.closePath(); g.fill(); }
      g.restore(); break;
    }
  }
  g.restore();
}
function wmPadlock(g, s) {
  const gr = g.createRadialGradient(0, -s * .2, 0, 0, -s * .2, s * 1.1); gr.addColorStop(0, 'rgba(8,10,16,.6)'); gr.addColorStop(1, 'rgba(8,10,16,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, -s * .2, s * 1.1, 0, TAU); g.fill();
  g.strokeStyle = '#cfd8dc'; g.lineWidth = s * .07; g.beginPath(); g.arc(0, -s * .32, s * .16, Math.PI, 0); g.stroke();
  wmBox(g, -s * .24, -s * .32, s * .48, s * .36, '#eceff1', '#90a4ae', s * .06);
  g.fillStyle = '#37474f'; g.beginPath(); g.arc(0, -s * .17, s * .05, 0, TAU); g.fill();
}

/* ---------- boucle de dessin ---------- */
function wmSize() {
  const r = wmCv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, save.eco ? 1 : 2);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (wmCv.width !== w || wmCv.height !== h) { wmCv.width = w; wmCv.height = h; }
  return { W: r.width, H: r.height, dpr };
}
function wmBackground(g, W, H, wf) {
  const a = WORLDS[Math.floor(wf)].panel, b = WORLDS[Math.min(WORLDS.length - 1, Math.ceil(wf))].panel, k = wf - Math.floor(wf);
  const mix = (c1, c2) => { const p = parseInt(c1.slice(1), 16), q = parseInt(c2.slice(1), 16), m = i => Math.round(((p >> i) & 255) * (1 - k) + ((q >> i) & 255) * k); return 'rgb(' + m(16) + ',' + m(8) + ',' + m(0) + ')'; };
  const gr = g.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .8);
  gr.addColorStop(0, mix(a[1], b[1])); gr.addColorStop(.55, mix(a[2], b[2])); gr.addColorStop(1, '#03050a');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (!WM.stars) { const R = mulberry(42); WM.stars = Array.from({ length: 70 }, () => [R(), R(), R()]); }
  for (const [x, y, z] of WM.stars) { g.fillStyle = 'rgba(255,255,255,' + (.15 + .5 * z * (.6 + .4 * Math.sin(WM.t * 2 + x * 40))) + ')'; g.fillRect(((x * W - WM.pos * 30 * z) % W + W) % W, y * H, 1 + z * 1.5, 1 + z * 1.5); }
  g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1; g.beginPath(); for (let x = -((WM.pos * 40) % 60); x < W; x += 60) { g.moveTo(x, H * .7); g.lineTo(x - 120, H); } g.stroke();
}
function wmFrame() {
  if (state !== 'maps') { WM.run = false; return; }
  requestAnimationFrame(wmFrame);
  const now = performance.now(); if (save.eco && now - (WM.last || 0) < 45) return;
  const dt = Math.min(.05, (now - (WM.last || now)) / 1000); WM.last = now; WM.t += dt;
  const { W, H, dpr } = wmSize(), g = wmG; g.setTransform(dpr, 0, 0, dpr, 0, 0); WM.hit = [];
  if (WM.view === 'worlds') {
    if (!WM.drag) WM.pos += (WM.target - WM.pos) * Math.min(1, dt * 9);
    wmBackground(g, W, H, clamp(WM.pos, 0, WORLDS.length - 1));
    const land = W > H, sp = land ? Math.min(W * .36, H * .8) : W * .7, base = land ? Math.min(W * .14, H * .21) : Math.min(W * .27, H * .17), cy = land ? H * .4 : H * .44;
    const order = WORLDS.map((w, i) => i).sort((a, b) => Math.abs(b - WM.pos) - Math.abs(a - WM.pos));
    for (const i of order) {
      const d = i - WM.pos, ad = Math.abs(d); if (ad > 2.6) continue;
      const x = W / 2 + d * sp, s = base * (1 - Math.min(1, ad) * .38) * (1 - Math.max(0, ad - 1) * .2), y = cy + Math.sin(WM.t * 1.4 + i) * s * .06 + Math.min(1, ad) * s * .2;
      g.save(); g.globalAlpha = clamp(1.3 - ad * .45, 0, 1); g.translate(x, y); drawIsland(g, i, s, WM.t);
      if (!wmUnlocked(i)) wmPadlock(g, s);
      g.restore();
      WM.hit.push({ x: x - s * 1.2, y: y - s * 1.3, w: s * 2.4, h: s * 2.8, i, z: -ad });
    }
    // points de pagination
    for (let i = 0; i < WORLDS.length; i++) { const on = i === WM.target; g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(W / 2 + (i - (WORLDS.length - 1) / 2) * 16, H - 18, on ? 4.5 : 3, 0, TAU); g.fill(); }
  } else wmPathDraw(g, W, H);
}
function wmStart() { if (!WM.run) { WM.run = true; WM.last = 0; requestAnimationFrame(wmFrame); } }

/* ---------- chemin des zones d'un monde ---------- */
function wmNodes(W, H) {
  const land = W > H, top = land ? 80 : 190, bot = land ? 26 : 230; // place pour la fiche de zone en bas en portrait
  return land ? [[.1, .7], [.33, .42], [.57, .64]].map(([x, y]) => [x * W, top + y * (H - top - bot)]) : [[.3, .82], [.7, .5], [.34, .16]].map(([x, y]) => [x * W, top + y * (H - top - bot)]);
}
function wmPathDraw(g, W, H) {
  const wi = mapPage, P = ISLE[wi], acc = MAPS[wi * 3].acc;
  wmBackground(g, W, H, wi);
  if (!thumbs[wi * 3]) thumbs[wi * 3] = buildBG(wi * 3, 16); // décor du monde en fond, estompé
  const bg = thumbs[wi * 3], sc = Math.max(W / bg.width, H / bg.height); g.globalAlpha = .28; g.drawImage(bg, (W - bg.width * sc) / 2, (H - bg.height * sc) / 2, bg.width * sc, bg.height * sc); g.globalAlpha = 1;
  const N = wmNodes(W, H), s = Math.min(W, H) * (W > H ? .11 : .1), un = k => save.unlocked[curDiff] > wi * 3 + k;
  // chemin lumineux
  for (let k = 0; k < 2; k++) {
    const [x1, y1] = N[k], [x2, y2] = N[k + 1], open = un(k + 1), mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - s * .9;
    for (const [col, w, dash] of [[open ? rgbaA(acc).replace('A', .25) : 'rgba(255,255,255,.08)', s * .22, []], [open ? acc : 'rgba(255,255,255,.35)', s * .06, open ? [] : [s * .12, s * .1]]]) {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.setLineDash(dash); g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(mx, my, x2, y2); g.stroke();
    }
    g.setLineDash([]);
    if (open) { const q = (WM.t * .5 + k * .5) % 1, bx = (1 - q) * (1 - q) * x1 + 2 * (1 - q) * q * mx + q * q * x2, by = (1 - q) * (1 - q) * y1 + 2 * (1 - q) * q * my + q * q * y2; wmGlow(g, bx, by, s * .25, acc, .9); }
  }
  // plateformes
  const next = clamp(save.unlocked[curDiff] - 1 - wi * 3, -1, 2);
  N.forEach(([x, y], k) => {
    const mi = wi * 3 + k, open = un(k), st = save.stars[curDiff + mi] || 0, boss = k === 2, ss = s * (boss ? 1.25 : 1), bob = Math.sin(WM.t * 1.5 + k) * ss * .05;
    g.save(); g.translate(x, y + bob);
    if (k === next && curMode !== 'endless' || k === WM.sel) { // faisceau sur la zone à jouer
      const gr = g.createLinearGradient(0, -ss * 2.6, 0, 0); gr.addColorStop(0, rgbaA(acc).replace('A', 0)); gr.addColorStop(1, rgbaA(acc).replace('A', k === WM.sel ? .55 : .35));
      g.fillStyle = gr; g.beginPath(); g.moveTo(-ss * .45, 0); g.lineTo(-ss * .3, -ss * 2.6); g.lineTo(ss * .3, -ss * 2.6); g.lineTo(ss * .45, 0); g.closePath(); g.fill();
    }
    if (wi === 7) { for (const [cx, cy, r] of [[-.5, .1, .45], [0, .2, .55], [.5, .1, .45]]) { g.fillStyle = '#e3eefc'; g.beginPath(); g.arc(cx * ss, cy * ss, r * ss, 0, TAU); g.fill(); } }
    else wmRock(g, ss * .85, P[1], P[2], mi * 31 + 7);
    if (wi !== 7) wmTop(g, ss * .85, P[0]);
    // socle circulaire numéroté
    const gr = g.createRadialGradient(0, -ss * .05, 0, 0, 0, ss * .5); gr.addColorStop(0, open ? '#ffffff' : '#9e9e9e'); gr.addColorStop(1, open ? acc : '#424242');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, -ss * .05, ss * .42, ss * .16, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = ss * .03; g.stroke();
    if (boss) { const ic = WM.cache['b' + wi] || (WM.cache['b' + wi] = enemyIcon(WBOSS[wi], 128)); const bs = ss * 1.25; g.globalAlpha = open ? 1 : .45; g.drawImage(ic, -bs / 2, -ss * .15 - bs + Math.sin(WM.t * 2) * ss * .05, bs, bs); g.globalAlpha = 1; }
    g.font = '900 ' + Math.round(ss * .36) + 'px Rubik, system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = ss * .08; g.strokeStyle = '#0b1410'; g.fillStyle = '#fff';
    const lab = String(k + 1); g.strokeText(lab, 0, boss ? ss * .45 : -ss * .55); g.fillText(lab, 0, boss ? ss * .45 : -ss * .55);
    if (curMode !== 'endless') { g.font = Math.round(ss * .26) + 'px system-ui'; for (let j = 0; j < 3; j++) { g.fillStyle = j < st ? '#ffd740' : 'rgba(255,255,255,.25)'; g.fillText('★', (j - 1) * ss * .28, boss ? ss * .8 : ss * .62); } }
    if (!open) { g.translate(0, -ss * .35); wmPadlock(g, ss * .7); }
    g.restore();
    WM.hit.push({ x: x - ss, y: y - ss * 1.4, w: ss * 2, h: ss * 2.4, i: k, z: 0 });
  });
}

/* ---------- interface (HTML par-dessus le dessin) ---------- */
function wmInfoWorld() {
  const i = WM.target, W0 = WORLDS[i], open = wmUnlocked(i), st = wmStars(i), dz = wmDone(i), lv = Math.min(5, Math.ceil((i + 1) * 5 / WORLDS.length));
  $('#wmWorld').innerHTML = '<b style="color:' + MAPS[i * 3].acc + '">Monde ' + (i + 1) + ' · ' + W0.name + '</b>' +
    '<small>' + (open ? (curMode === 'endless' ? 'Record : vague ' + Math.max(...[0, 1, 2].map(k => (save.endless || {})[curDiff + (i * 3 + k)] || 0)) : '★ ' + st + ' / 9 · ' + dz + ' / 3 zones') + ' · Difficulté ' + '◆'.repeat(lv) + '◇'.repeat(5 - lv) : 'Verrouillé : termine le monde précédent') + '</small>' +
    '<small class="wm-rule">' + RULES[W0.style].name + ' · Boss : ' + ETYPES[WBOSS[i]].name + '</small>' +
    (open ? '<button class="big" id="wmEnter">▶ Entrer</button>' : '');
  const e = $('#wmEnter'); if (e) e.onclick = () => wmOpen(i);
  $('#mapPrev').classList.toggle('off', i === 0); $('#mapNext').classList.toggle('off', i === WORLDS.length - 1);
}
function wmOpen(i) { if (!wmUnlocked(i)) { toast('Termine le monde précédent pour ouvrir celui-ci'); sfx('err'); return; } mapPage = i; WM.view = 'path'; WM.sel = -1; sfx('build'); buildMaps(); }
function wmCard(k) {
  const i = mapPage * 3 + k, m = MAPS[i], box = $('#wmCard');
  if (k < 0) { box.classList.add('hidden'); return; }
  const locked = i >= save.unlocked[curDiff], st = save.stars[curDiff + i] || 0, best = save.best[curDiff + i] || 0;
  const ent = m.routes.length, ex = new Set(m.routes.map(r => r[r.length - 1].join(','))).size, ch = zoneChals(i), rec = (save.endless || {})[curDiff + i] || 0;
  box.innerHTML = '<canvas width="' + COLS * 8 + '" height="' + ROWS * 8 + '"></canvas><div class="wm-ci"><b>' + (locked ? '🔒 ' : '') + 'Zone ' + (k + 1) + ' · ' + m.name + (k === 2 ? ' <span class="wm-boss">BOSS</span>' : '') + '</b>' +
    '<small>' + (curMode === 'endless' ? '∞ vagues · record : vague ' + rec : m.waves + ' vagues · ' + ent + ' entrée' + (ent > 1 ? 's' : '') + ' · ' + ex + ' sortie' + (ex > 1 ? 's' : '')) + '</small>' +
    (curMode === 'endless' ? '' : '<span class="st">' + '★'.repeat(st) + '☆'.repeat(3 - st) + (best ? ' <i>record ' + best + '</i>' : '') + '</span>' + ch.map(c => '<small class="chl' + ((save.chal || {})[i + ':' + c] ? ' done' : '') + '">' + ((save.chal || {})[i + ':' + c] ? '🏅 ' : '◻ ') + CHALS[c].name + '</small>').join('')) +
    '</div><button class="big" id="wmPlay"' + (locked ? ' disabled' : '') + '>' + (locked ? '🔒 Verrouillée' : '▶ Jouer') + '</button>';
  if (!thumbs[i]) thumbs[i] = buildBG(i, 16);
  box.querySelector('canvas').getContext('2d').drawImage(thumbs[i], 0, 0, COLS * 8, ROWS * 8);
  box.classList.remove('hidden');
  $('#wmPlay').onclick = () => { if (locked) { toast('Termine la zone précédente pour débloquer celle-ci'); return; } initAudio(); startMap(i, curMode === 'endless' ? { endless: true } : {}); };
}
function buildMaps() {
  const d = DIFFS[curDiff], sec = $('#maps');
  if (mapPage === null) { mapPage = Math.min(WORLDS.length - 1, Math.floor((save.unlocked[curDiff] - 1) / 3)); WM.view = 'worlds'; WM.pos = WM.target = mapPage; }
  sec.classList.toggle('wm-path', WM.view === 'path'); sec.classList.toggle('wm-worlds', WM.view === 'worlds');
  $('#mapsTitle').innerHTML = (curMode === 'endless' ? '♾ Mode infini' : WM.view === 'worlds' ? 'Carte des mondes' : 'Monde ' + (mapPage + 1) + ' · ' + WORLDS[mapPage].name) + ' · <span style="color:' + d.col + '">' + d.name + '</span>';
  const rb = $('#mapRandom'); rb.classList.toggle('hidden', curMode !== 'endless' || WM.view !== 'path'); rb.textContent = '🎲 Zone aléatoire · record vague ' + ((save.endless || {})[curDiff + NCAMP] || 0);
  if (WM.view === 'worlds') { WM.target = mapPage; wmInfoWorld(); $('#wmCard').classList.add('hidden'); }
  else {
    const WD = WORLDS[mapPage]; buildMuts();
    $('#worldDesc').innerHTML = WD.desc + '<br><b>Règle · ' + RULES[WD.style].name + '</b> : ' + RULES[WD.style].desc;
    if (WM.sel < 0) WM.sel = clamp(save.unlocked[curDiff] - 1 - mapPage * 3, 0, 2);
    wmCard(WM.sel);
  }
  wmStart();
}
// navigation : glisser, toucher une île ou une plateforme
wmCv.addEventListener('pointerdown', e => { WM.drag = { x: e.clientX, y: e.clientY, pos: WM.pos, t: performance.now(), moved: false }; try { wmCv.setPointerCapture(e.pointerId); } catch (er) { } });
wmCv.addEventListener('pointermove', e => {
  const D = WM.drag; if (!D) return; const dx = e.clientX - D.x;
  if (Math.abs(dx) > 8) D.moved = true;
  if (WM.view === 'worlds' && D.moved) { const r = wmCv.getBoundingClientRect(), sp = r.width > r.height ? Math.min(r.width * .36, r.height * .8) : r.width * .7; WM.pos = clamp(D.pos - dx / sp, -.3, WORLDS.length - .7); }
});
const wmUp = e => {
  const D = WM.drag; WM.drag = null; if (!D || e.type === 'pointercancel') return;
  const r = wmCv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (WM.view === 'worlds') {
    if (D.moved) { const v = (e.clientX - D.x) / Math.max(1, performance.now() - D.t); WM.target = clamp(Math.round(WM.pos - v * 2.2), 0, WORLDS.length - 1); if (WM.target !== mapPage) { mapPage = WM.target; sfx('coin'); } wmInfoWorld(); return; }
    const h = WM.hit.filter(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h).sort((a, b) => b.z - a.z)[0];
    if (!h) return;
    if (h.i === WM.target) wmOpen(h.i); else { WM.target = mapPage = h.i; sfx('coin'); wmInfoWorld(); }
  } else if (!D.moved) {
    const h = WM.hit.find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
    if (h) { WM.sel = h.i; sfx('build'); wmCard(h.i); }
  }
};
wmCv.addEventListener('pointerup', wmUp); wmCv.addEventListener('pointercancel', wmUp);
$('#mapPrev').onclick = () => { if (WM.view === 'worlds') { if (WM.target > 0) { WM.target = --mapPage; sfx('coin'); wmInfoWorld(); } } else if (mapPage > 0 && wmUnlocked(mapPage - 1)) { mapPage--; WM.sel = -1; buildMaps(); } };
$('#mapNext').onclick = () => { if (WM.view === 'worlds') { if (WM.target < WORLDS.length - 1) { WM.target = ++mapPage; sfx('coin'); wmInfoWorld(); } } else if (mapPage < WORLDS.length - 1 && wmUnlocked(mapPage + 1)) { mapPage++; WM.sel = -1; buildMaps(); } };
// retour : du chemin d'un monde vers la carte des mondes, puis vers la difficulté
function wmBack() { if (WM.view === 'path') { WM.view = 'worlds'; WM.pos = WM.target = mapPage; buildMaps(); return true; } return false; }
$('#wmBack').onclick = () => { if (!wmBack()) setState('diff'); };
document.addEventListener('keydown', e => { if (state !== 'maps' || WM.view !== 'worlds') return; if (e.key === 'ArrowLeft') $('#mapPrev').click(); if (e.key === 'ArrowRight') $('#mapNext').click(); if (e.key === 'Enter') wmOpen(WM.target); });
