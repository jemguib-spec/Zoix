'use strict';
/* Virus Défense — carte des mondes : un seul parcours linéaire qui traverse les 8 mondes et leurs 40 zones.
   Tout est dessiné par le jeu, dans l'univers de l'ordinateur (puces, forge, disques, serveurs, glace, néon, vieux PC, nuage). */
const WM = { scroll: 0, scrollT: 0, vel: 0, drag: null, sel: -1, t: 0, run: false, hit: [], cache: {}, stars: null, L: null };
const wmCv = $('#wmCv'), wmG = wmCv.getContext('2d');
const wmUnlocked = wi => save.unlocked[curDiff] > wi * ZPW; // un monde est ouvert dès que sa première zone l'est
const wmZones = wi => CORDER.slice(wi * ZPW, wi * ZPW + ZPW);  // numéros des zones du monde, dans l'ordre de la campagne
const wmStars = wi => wmZones(wi).reduce((a, mi) => a + (save.stars[curDiff + mi] || 0), 0);
const wmDone = wi => wmZones(wi).filter(mi => save.unlocked[curDiff] > CPOS[mi] + 1).length;
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
function drawIsland(g, wi, s, t, flat) { // flat : posé au sol (décor du parcours) au lieu de flotter
  const P = ISLE[wi], sd = wi * 977 + 13;
  g.save();
  if (flat) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(s * .08, s * .12, s * 1.05, s * .36, 0, 0, TAU); g.fill(); wmGlow(g, 0, -s * .3, s * 1.3, P[3], .14); }
  else wmGlow(g, 0, s * .6, s * 1.6, P[3], .22);
  if (flat) { } else if (wi === 7) { // le Nuage : île faite de nuages
    for (const [x, y, r] of [[-.7, .15, .45], [-.25, .3, .55], [.3, .28, .5], [.75, .12, .42], [0, .55, .45], [-.45, .55, .35], [.45, .55, .35]]) { const gr = g.createRadialGradient(x * s - r * s * .3, y * s - r * s * .3, 0, x * s, y * s, r * s); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#a9c4e8'); g.fillStyle = gr; g.beginPath(); g.arc(x * s, y * s, r * s, 0, TAU); g.fill(); }
  } else wmRock(g, s, P[1], P[2], sd);
  // petits rochers qui flottent autour
  const R = mulberry(sd + 5);
  for (let k = 0; k < (flat ? 0 : 3); k++) { const a = R() * TAU, d = s * (1.25 + R() * .3), y0 = Math.sin(t * 1.3 + k * 2) * s * .05; g.save(); g.translate(Math.cos(a) * d, s * .3 + Math.sin(a) * s * .35 + y0); g.scale(s * .1, s * .1); if (wi === 7) { g.fillStyle = '#eef5ff'; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); } else { g.fillStyle = P[1]; g.beginPath(); g.moveTo(-1, 0); g.lineTo(1, -.2); g.lineTo(.3, 1.4); g.closePath(); g.fill(); g.fillStyle = P[0]; g.beginPath(); g.ellipse(0, 0, 1.05, .35, 0, 0, TAU); g.fill(); } g.restore(); }
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

/* ---------- parcours : mise en page ---------- */
// le parcours avance à l'horizontale en paysage, de bas en haut en portrait ; a = position le long du parcours
function wmLayout(W, H) {
  const land = W > H, seg = land ? Math.max(W * 1.3, 700) : Math.max(H * 1.05, 700), pad = (land ? W : H) * .14;
  const nodes = [];
  for (let n = 0; n < NCAMP; n++) {
    const w = Math.floor(n / ZPW), k = n % ZPW, a = pad + w * seg + seg * (.16 + .17 * k), c = Math.sin(n * 1.15 + .4) * (k === ZPW - 1 ? .35 : 1);
    nodes.push({ n, w, k, mi: CORDER[n], a, c });
  }
  return { land, seg, pad, len: pad * 2 + WORLDS.length * seg, nodes, W, H };
}
// position à l'écran d'un point du parcours (a le long, c en travers entre -1 et 1)
function wmXY(L, a, c) {
  if (L.land) { const top = 104, bot = 150, mid = (top + L.H - bot) / 2, amp = (L.H - bot - top) / 2 * .8; return [a - WM.scroll, mid + c * amp]; }
  const base = L.H - 250, mid = L.W / 2, amp = L.W * .3; return [mid + c * amp, base - (a - WM.scroll)];
}
const wmView = L => L.land ? L.W : L.H - 250 - 130; // longueur visible du parcours
const wmClampScroll = (L, v) => clamp(v, 0, Math.max(0, L.len - wmView(L)));
const wmFocus = (L, n) => wmClampScroll(L, L.nodes[n].a - wmView(L) * (L.land ? .42 : .4));

/* ---------- dessin ---------- */
function wmSize() {
  const r = wmCv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, save.eco ? 1 : 2);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (wmCv.width !== w || wmCv.height !== h) { wmCv.width = w; wmCv.height = h; }
  return { W: r.width, H: r.height, dpr };
}
function wmSegRect(L, w) { // rectangle à l'écran de la portion d'un monde
  const a0 = L.pad + w * L.seg - (w === 0 ? L.pad : 0), a1 = L.pad + (w + 1) * L.seg + (w === WORLDS.length - 1 ? L.pad : 0);
  if (L.land) return [a0 - WM.scroll, 0, a1 - a0, L.H];
  const base = L.H - 250; return [0, base - (a1 - WM.scroll), L.W, a1 - a0];
}
// ambiance animée propre à chaque monde, dessinée dans le rectangle du monde
function wmAmbience(g, w, x, y, rw, rh, t) {
  const R = mulberry(w * 71 + 3), n = save.eco ? 10 : 26;
  g.save(); g.beginPath(); g.rect(x, y, rw, rh); g.clip();
  switch (w) {
    case 0: for (let i = 0; i < n; i++) { const px = x + R() * rw, py = y + R() * rh, k = (Math.sin(t * 2 + i) + 1) / 2; wmGlow(g, px, py, 3 + k * 5, '#76ff03', .35 * k); } break; // étincelles des pistes
    case 1: for (let i = 0; i < n; i++) { const q = (t * (.05 + R() * .08) + R()) % 1, px = x + R() * rw + Math.sin(t + i) * 12, py = y + rh * (1 - q); g.fillStyle = 'rgba(255,' + (120 + R() * 80 | 0) + ',30,' + (.8 * (1 - q)) + ')'; g.fillRect(px, py, 3, 3); } break; // braises qui montent
    case 2: g.font = '700 12px monospace'; for (let i = 0; i < n; i++) { const q = (t * (.06 + R() * .1) + R()) % 1, px = x + R() * rw, py = y + rh * q; g.fillStyle = 'rgba(24,255,255,' + (.35 * (1 - q)) + ')'; g.fillText(R() < .5 ? '0' : '1', px, py); } break; // pluie binaire
    case 3: for (let i = 0; i < n; i++) { const px = x + R() * rw, py = y + R() * rh, on = Math.sin(t * (3 + R() * 4) + i) > .3; g.fillStyle = on ? (i % 4 ? 'rgba(118,255,3,.6)' : 'rgba(255,171,0,.6)') : 'rgba(118,255,3,.08)'; g.fillRect(px, py, 4, 4); } break; // voyants de serveurs
    case 4: for (let i = 0; i < n; i++) { const q = (t * (.03 + R() * .05) + R()) % 1, px = x + R() * rw + Math.sin(t * .8 + i) * 18, py = y + rh * q; g.fillStyle = 'rgba(255,255,255,' + (.7 * (1 - q * .6)) + ')'; g.beginPath(); g.arc(px, py, 1.5 + R() * 2, 0, TAU); g.fill(); } break; // neige
    case 5: { g.strokeStyle = 'rgba(255,43,214,.18)'; g.lineWidth = 1; const off = (t * 20) % 40; g.beginPath(); for (let k = -1; k * 40 < rh + 40; k++) { g.moveTo(x, y + k * 40 + off); g.lineTo(x + rw, y + k * 40 + off); } for (let k = 0; k * 60 < rw; k++) { g.moveTo(x + k * 60, y); g.lineTo(x + k * 60, y + rh); } g.stroke(); break; } // grille néon
    case 6: { g.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = y; yy < y + rh; yy += 4) g.fillRect(x, yy, rw, 1.5); const sy = y + ((t * 60) % rh); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, sy, rw, 24); break; } // balayage d'écran rétro
    case 7: for (let i = 0; i < 6; i++) { const px = x + ((R() * rw + t * (8 + R() * 10)) % (rw + 400)) - 200, py = y + R() * rh, sc = 30 + R() * 40; g.fillStyle = 'rgba(255,255,255,.07)'; for (const [dx, dy, r] of [[0, 0, 1], [.8, .2, .8], [-.8, .25, .7]]) { g.beginPath(); g.arc(px + dx * sc, py + dy * sc, r * sc, 0, TAU); g.fill(); } } break; // nuages
  }
  g.restore();
}
// socle hexagonal d'une zone
function wmHex(g, r) { g.beginPath(); for (let i = 0; i < 6; i++) { const q = i * Math.PI / 3 + Math.PI / 6; g.lineTo(Math.cos(q) * r, Math.sin(q) * r * .55); } g.closePath(); }
function wmDraw(g, L) {
  const { W, H } = L, un = n => save.unlocked[curDiff] > n;
  // couleur du monde ; les mondes très clairs (glace, nuage) prennent une teinte plus soutenue pour que le chemin ressorte
  const acc = w => { const c = MAPS[w * 3].acc, v = parseInt(c.slice(1), 16), lum = ((v >> 16 & 255) * .3 + (v >> 8 & 255) * .59 + (v & 255) * .11) / 255; return lum > .8 ? WORLDS[w].panel[0] : c; };
  // fond : chaque monde a ses couleurs, son décor estompé et son ambiance ; fondu entre deux mondes
  // chaque paysage déborde de F sur ses voisins ; le monde suivant apparaît en fondu progressif par-dessus le précédent
  const F = Math.min(L.seg * .2, (L.land ? W : H) * .3), dpr = g.getTransform().a || 1;
  const off = WM.off || (WM.off = document.createElement('canvas')), og = off.getContext('2d');
  if (off.width !== g.canvas.width || off.height !== g.canvas.height) { off.width = g.canvas.width; off.height = g.canvas.height; }
  for (let w = 0; w < WORLDS.length; w++) {
    let [x, y, rw, rh] = wmSegRect(L, w);
    if (L.land) { x -= F; rw += F * 2; } else { y -= F; rh += F * 2; }
    if (x > W || y > H || x + rw < 0 || y + rh < 0) continue;
    const paint = c => { drawScene(c, w, x, y, rw + 1, rh + 1, WM.t + w * 3); if (!wmUnlocked(w)) { c.fillStyle = 'rgba(4,6,12,.55)'; c.fillRect(x, y, rw + 1, rh + 1); } };
    if (w === 0) { paint(g); continue; }
    og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-over'; og.clearRect(0, 0, off.width, off.height); og.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(og);
    const gm = L.land ? og.createLinearGradient(x, 0, x + F * 2, 0) : og.createLinearGradient(0, y + rh, 0, y + rh - F * 2);
    gm.addColorStop(0, 'rgba(0,0,0,0)'); gm.addColorStop(.5, 'rgba(0,0,0,.55)'); gm.addColorStop(1, 'rgba(0,0,0,1)');
    og.globalCompositeOperation = 'destination-in'; og.fillStyle = gm; og.fillRect(0, 0, W, H); og.globalCompositeOperation = 'source-over';
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(off, 0, 0); g.restore();
  }
  // tracé du parcours : piste de circuit à double rail, courbe lisse qui passe par toutes les zones
  const pts = L.nodes.map(o => wmXY(L, o.a, o.c));
  // points de passage : avant la 1re zone, les zones, et une ligne droite qui traverse chaque portail (d = zone atteinte, wc = couleur)
  const all = [{ p: wmXY(L, L.nodes[0].a - L.seg * .2, L.nodes[0].c * .5), d: 0, wc: 0 }], gates = [];
  L.nodes.forEach((o, n) => {
    if (o.k === 0 && o.w > 0) { const prev = L.nodes[n - 1], ga = L.pad + o.w * L.seg, gc = (prev.c + o.c) / 2, st = L.seg * .045;
      gates[o.w] = wmXY(L, ga, gc); for (const da of [-st, 0, st]) all.push({ p: wmXY(L, ga + da, gc), d: n, wc: o.w - 1 }); }
    all.push({ p: pts[n], d: n, wc: Math.max(0, o.w - (o.k === 0 && o.w > 0 ? 1 : 0)) });
  });
  all.push({ p: wmXY(L, L.nodes[NCAMP - 1].a + L.seg * .2, 0), d: NCAMP, wc: WORLDS.length - 1 });
  gates[0] = (() => { const a = all[0].p, b = pts[0]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; })();
  const P = all.map(o => o.p);
  const ctrl = i => { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    return [p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2]; };
  const curve = i => { const [a, b, c, d] = ctrl(i); g.beginPath(); g.moveTo(a[0], a[1]); g.bezierCurveTo(b[0], b[1], c[0], c[1], d[0], d[1]); };
  const sw = Math.min(W, H) * .024; g.lineCap = 'round'; g.lineJoin = 'round';
  const vis = i => { const [x1, y1] = P[i], [x2, y2] = P[i + 1]; return !(Math.max(x1, x2) < -80 || Math.min(x1, x2) > W + 80 || Math.max(y1, y2) < -80 || Math.min(y1, y2) > H + 80); };
  for (let i = 0; i < all.length - 1; i++) { if (!vis(i)) continue; curve(i); g.setLineDash([]); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = sw * 2.6; g.stroke(); }
  for (let i = 0; i < all.length - 1; i++) {
    if (!vis(i)) continue;
    const open = i === 0 || un(all[i + 1].d), col = acc(all[i + 1].wc);
    curve(i);
    g.setLineDash([]); g.strokeStyle = open ? shade(col, -.55) : '#1d2128'; g.lineWidth = sw * 2; g.stroke();             // fond de la piste
    g.strokeStyle = open ? rgbaA(col).replace('A', .22) : 'rgba(255,255,255,.04)'; g.lineWidth = sw * 3.2; g.stroke();     // halo
    g.strokeStyle = open ? shade(col, .15) : 'rgba(255,255,255,.18)'; g.lineWidth = sw * .32; g.setLineDash(open ? [] : [sw * .9, sw * .9]); g.stroke(); // rail central
    if (open) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = sw * .3; g.setLineDash([sw * .4, sw * 2.6]); g.lineDashOffset = -WM.t * sw * 6; g.stroke(); g.lineDashOffset = 0; } // impulsions d'énergie
  }
  g.setLineDash([]);
  // portails entre les mondes
  WM.hit = [];
  for (let w = 0; w < WORLDS.length; w++) {
    const [gx, gy] = gates[w], s = Math.min(W, H) * .075;
    if (gx < -s * 4 || gx > W + s * 4 || gy < -s * 4 || gy > H + s * 4) continue;
    const open = wmUnlocked(w), c = acc(w);
    g.save(); g.translate(gx, gy); g.save(); // la piste passe tout droit au milieu de l'arche
    if (L.land) g.rotate(-Math.PI / 2); g.translate(0, s * .8); // en paysage la piste est horizontale : l'arche est tournée vers elle
    wmGlow(g, 0, -s * 1.2, s * 2.2, c, open ? .25 + .08 * Math.sin(WM.t * 2) : .05);
    for (const sx of [-1, 1]) { wmBox(g, sx * s * .95 - s * .2, -s * 1.6, s * .4, s * 1.7, shade(c, -.05), shade(c, -.65), s * .08); g.fillStyle = shade(c, -.75); g.fillRect(sx * s * .95 - s * .28, -s * .02, s * .56, s * .16); wmGlow(g, sx * s * .95, -s * 1.65, s * .5, c, open ? .9 : .2); }
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = s * .26; g.beginPath(); g.arc(0, -s * 1.5, s * .95, Math.PI, 0); g.stroke();
    g.strokeStyle = open ? c : 'rgba(255,255,255,.3)'; g.lineWidth = s * .16; g.stroke();
    if (open) { g.save(); g.beginPath(); g.arc(0, -s * 1.5, s * .8, Math.PI, 0); g.lineTo(s * .8, 0); g.lineTo(-s * .8, 0); g.closePath(); g.clip(); const gp = g.createLinearGradient(0, -s * 2.4, 0, 0); gp.addColorStop(0, rgbaA(c).replace('A', .45)); gp.addColorStop(1, rgbaA(c).replace('A', .05)); g.fillStyle = gp; g.fillRect(-s, -s * 2.4, s * 2, s * 2.4); for (let k = 0; k < 4; k++) { const q = (WM.t * .7 + k / 4) % 1; g.strokeStyle = 'rgba(255,255,255,' + (.35 * (1 - q)) + ')'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, -s * .8, s * .75 * q, s * .9 * q, 0, 0, TAU); g.stroke(); } g.restore(); }
    if (!open) { g.save(); g.translate(0, -s * .8); if (L.land) g.rotate(Math.PI / 2); wmPadlock(g, s * .8); g.restore(); }
    g.restore(); g.translate(0, L.land ? s * 1.1 : s * .8);
    // panneau du monde
    const lab = 'Monde ' + (w + 1) + ' · ' + WORLDS[w].name; g.font = '800 ' + Math.round(s * .36) + 'px Rubik, system-ui'; const tw = g.measureText(lab).width + s * .7, lx = gx; g.translate(clamp(lx, tw / 2 + 8, Math.max(tw / 2 + 8, W - tw / 2 - 8)) - lx, 0); // le panneau reste dans l'écran
    g.fillStyle = 'rgba(8,12,20,.88)'; rr(g, -tw / 2, -s * 3.05, tw, s * .72, s * .36); g.fill(); g.strokeStyle = open ? c : 'rgba(255,255,255,.25)'; g.lineWidth = s * .05; g.stroke();
    g.fillStyle = open ? '#fff' : 'rgba(255,255,255,.6)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, 0, -s * 2.69);
    if (open) { const st = wmStars(w); g.font = '700 ' + Math.round(s * .26) + 'px Rubik, system-ui'; g.fillStyle = '#ffd740'; g.fillText('★ ' + st + ' / ' + ZPW * 3, 0, -s * 2.12); }
    g.restore();
  }
  // zones
  const next = clamp(save.unlocked[curDiff] - 1, 0, NCAMP - 1), s0 = Math.min(W, H) * (L.land ? .08 : .07);
  L.nodes.forEach((o, n) => {
    const [x, y] = pts[n], boss = o.k === ZPW - 1, ss = s0 * (boss ? 1.3 : 1); if (x < -ss * 2 || x > W + ss * 2 || y < -ss * 3 || y > H + ss * 2) return;
    const open = un(n), done = un(n + 1) || (save.stars[curDiff + o.mi] || 0) > 0, st = save.stars[curDiff + o.mi] || 0, c = acc(o.w), cur = n === next && curMode !== 'endless', sel = n === WM.sel;
    g.save(); g.translate(x, y);
    if (cur || sel) { // ondes et faisceau sur la zone à jouer / choisie
      for (let k = 0; k < 2; k++) { const q = (WM.t * .8 + k * .5) % 1; g.strokeStyle = rgbaA(c).replace('A', .6 * (1 - q)); g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, ss * (.8 + q * .9), ss * (.44 + q * .5), 0, 0, TAU); g.stroke(); }
      const gr = g.createLinearGradient(0, -ss * 3, 0, 0); gr.addColorStop(0, rgbaA(c).replace('A', 0)); gr.addColorStop(1, rgbaA(c).replace('A', sel ? .5 : .32)); g.fillStyle = gr; g.beginPath(); g.moveTo(-ss * .55, 0); g.lineTo(-ss * .3, -ss * 3); g.lineTo(ss * .3, -ss * 3); g.lineTo(ss * .55, 0); g.closePath(); g.fill();
    }
    // socle hexagonal métallique
    g.fillStyle = 'rgba(0,0,0,.45)'; g.save(); g.translate(ss * .06, ss * .2); wmHex(g, ss * .85); g.fill(); g.restore();
    g.save(); g.translate(0, ss * .14); wmHex(g, ss * .8); g.fillStyle = boss ? '#4a0d14' : '#1d232c'; g.fill(); g.restore();
    wmHex(g, ss * .8); let gr = g.createLinearGradient(0, -ss * .45, 0, ss * .45); gr.addColorStop(0, boss ? '#ffd54f' : '#cfd8dc'); gr.addColorStop(.5, boss ? '#b71c1c' : '#607d8b'); gr.addColorStop(1, boss ? '#4a0d14' : '#263238'); g.fillStyle = gr; g.fill();
    g.strokeStyle = done ? '#ffd740' : open ? c : 'rgba(255,255,255,.25)'; g.lineWidth = ss * (done ? .07 : .05); g.stroke();
    wmHex(g, ss * .58); gr = g.createRadialGradient(0, -ss * .05, 0, 0, 0, ss * .6); gr.addColorStop(0, open ? '#ffffff' : '#616161'); gr.addColorStop(.45, open ? c : '#424242'); gr.addColorStop(1, open ? shade(c, -.6) : '#212121'); g.fillStyle = gr; g.fill();
    if (open) wmGlow(g, 0, -ss * .05, ss * .9, c, .25 + (cur ? .15 * Math.sin(WM.t * 4) : 0));
    if (boss) { // boss du monde : couronne et virus géant
      const ic = WM.cache['b' + o.w] || (WM.cache['b' + o.w] = enemyIcon(WBOSS[o.w], 128)); const bs = ss * 1.25, by = -ss * .15 - bs + Math.sin(WM.t * 2 + n) * ss * .06;
      g.globalAlpha = open ? 1 : .45; g.drawImage(ic, -bs / 2, by, bs, bs); g.globalAlpha = 1;
      g.fillStyle = '#ffd740'; g.strokeStyle = '#5d4300'; g.lineWidth = ss * .04; g.beginPath(); const cy2 = by + bs * .2; g.moveTo(-ss * .25, cy2); g.lineTo(-ss * .25, cy2 - ss * .2); g.lineTo(-ss * .12, cy2 - ss * .1); g.lineTo(0, cy2 - ss * .26); g.lineTo(ss * .12, cy2 - ss * .1); g.lineTo(ss * .25, cy2 - ss * .2); g.lineTo(ss * .25, cy2); g.closePath(); g.fill(); g.stroke();
    }
    // numéro, étoiles, état
    g.font = '900 ' + Math.round(ss * .4) + 'px Rubik, system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = ss * .1; g.strokeStyle = 'rgba(0,0,0,.75)'; g.fillStyle = '#fff';
    const lab = String(n + 1);
    if (open) { g.strokeText(lab, 0, -ss * .02); g.fillText(lab, 0, -ss * .02); }
    else { // zone verrouillée : cadenas au centre, numéro dans une pastille dessous
      g.font = '800 ' + Math.round(ss * .26) + 'px Rubik, system-ui'; const tw = g.measureText(lab).width + ss * .3;
      g.fillStyle = 'rgba(8,12,20,.85)'; rr(g, -tw / 2, ss * .42, tw, ss * .32, ss * .16); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(lab, 0, ss * .58);
    }
    if (curMode !== 'endless' && open) { g.font = Math.round(ss * .3) + 'px system-ui'; g.lineWidth = ss * .06; for (let j = 0; j < 3; j++) { const sx = (j - 1) * ss * .32, sy = ss * .7 + (j === 1 ? ss * .06 : 0); g.strokeText('★', sx, sy); g.fillStyle = j < st ? '#ffd740' : 'rgba(255,255,255,.3)'; g.fillText('★', sx, sy); } }
    if (done && !boss) { g.fillStyle = '#ffd740'; g.beginPath(); g.arc(ss * .62, -ss * .32, ss * .17, 0, TAU); g.fill(); g.strokeStyle = '#3b2a00'; g.lineWidth = ss * .05; g.beginPath(); g.moveTo(ss * .54, -ss * .32); g.lineTo(ss * .6, -ss * .25); g.lineTo(ss * .71, -ss * .4); g.stroke(); }
    if (!open) { g.translate(0, ss * .12); wmPadlock(g, ss * .55); }
    if (cur) { const by2 = -ss * (boss ? 2.1 : 1.2) - Math.abs(Math.sin(WM.t * 3)) * ss * .25; g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = ss * .05; g.beginPath(); g.moveTo(-ss * .2, by2 - ss * .25); g.lineTo(ss * .2, by2 - ss * .25); g.lineTo(0, by2); g.closePath(); g.fill(); g.stroke(); } // flèche « à jouer »
    g.restore();
    WM.hit.push({ x: x - ss * .9, y: y - ss * (boss ? 2 : 1.2), w: ss * 1.8, h: ss * (boss ? 2.9 : 2.1), n });
  });
  // vignettage
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function wmFrame() {
  if (state !== 'maps') { WM.run = false; return; }
  requestAnimationFrame(wmFrame);
  const now = performance.now(); if (save.eco && now - (WM.last || 0) < 45) return;
  const dt = Math.min(.05, (now - (WM.last || now)) / 1000); WM.last = now; WM.t += dt;
  const { W, H, dpr } = wmSize(); const L = WM.L = wmLayout(W, H);
  if (!WM.drag) { if (Math.abs(WM.vel) > 5) { WM.scrollT = wmClampScroll(L, WM.scrollT + WM.vel * dt); WM.vel *= Math.pow(.04, dt); } WM.scroll += (WM.scrollT - WM.scroll) * Math.min(1, dt * 10); }
  WM.scroll = wmClampScroll(L, WM.scroll);
  wmG.setTransform(dpr, 0, 0, dpr, 0, 0); wmDraw(wmG, L);
  // le monde affiché au centre de l'écran donne le titre, la règle et la progression
  const mid = WM.scroll + wmView(L) * (L.land ? .42 : .4), w = clamp(Math.floor((mid - L.pad) / L.seg), 0, WORLDS.length - 1);
  if (w !== WM.shown) { WM.shown = w; wmWorldInfo(w); }
}
function wmStart() { if (!WM.run) { WM.run = true; WM.last = 0; requestAnimationFrame(wmFrame); } }

/* ---------- interface (HTML par-dessus le dessin) ---------- */
function wmWorldInfo(w) {
  const W0 = WORLDS[w], d = DIFFS[curDiff], st = wmStars(w), dz = wmDone(w), acc = MAPS[w * 3].acc;
  $('#mapsTitle').innerHTML = (curMode === 'endless' ? '♾ ' : '') + 'Monde ' + (w + 1) + ' · <span style="color:' + acc + '">' + W0.name + '</span> · <span style="color:' + d.col + '">' + d.name + '</span>';
  $('#wmProg').innerHTML = '<i style="width:' + Math.round(dz / ZPW * 100) + '%;background:' + acc + '"></i><span>' + dz + ' / ' + ZPW + ' zones' + (curMode === 'endless' ? '' : ' · ★ ' + st + ' / ' + ZPW * 3) + '</span>';
  $('#worldDesc').innerHTML = '<b>' + RULES[W0.style].name + '</b> : ' + RULES[W0.style].desc + ' · Boss : ' + ETYPES[WBOSS[w]].name;
  $('#mapPrev').classList.toggle('off', w === 0); $('#mapNext').classList.toggle('off', w === WORLDS.length - 1);
}
function wmCard(n) {
  const box = $('#wmCard');
  if (n < 0) { box.classList.add('hidden'); return; }
  const i = CORDER[n], m = MAPS[i], k = n % ZPW;
  const locked = n >= save.unlocked[curDiff], st = save.stars[curDiff + i] || 0, best = save.best[curDiff + i] || 0;
  const ent = m.routes.length, ex = new Set(m.routes.map(r => r[r.length - 1].join(','))).size, ch = zoneChals(i), rec = (save.endless || {})[curDiff + i] || 0;
  box.innerHTML = '<canvas width="' + COLS * 8 + '" height="' + ROWS * 8 + '"></canvas><div class="wm-ci"><b>' + (locked ? '🔒 ' : '') + (n + 1) + '. ' + m.name + (k === ZPW - 1 ? ' <span class="wm-boss">BOSS</span>' : '') + '</b>' +
    '<small>' + WORLDS[worldIdx(i)].name + ' · ' + (curMode === 'endless' ? '∞ vagues · record : vague ' + rec : m.waves + ' vagues · ' + ent + ' entrée' + (ent > 1 ? 's' : '') + ' · ' + ex + ' sortie' + (ex > 1 ? 's' : '')) + '</small>' +
    (curMode === 'endless' ? '' : '<span class="st">' + '★'.repeat(st) + '☆'.repeat(3 - st) + (best ? ' <i>record ' + best + '</i>' : '') + '</span>' + ch.map(c => '<small class="chl' + ((save.chal || {})[i + ':' + c] ? ' done' : '') + '">' + ((save.chal || {})[i + ':' + c] ? '🏅 ' : '◻ ') + CHALS[c].name + '</small>').join('')) +
    '</div><button class="big" id="wmPlay"' + (locked ? ' disabled' : '') + '>' + (locked ? '🔒 Verrouillée' : '▶ Jouer') + '</button>';
  if (!thumbs[i]) thumbs[i] = buildBG(i, 16);
  box.querySelector('canvas').getContext('2d').drawImage(thumbs[i], 0, 0, COLS * 8, ROWS * 8);
  box.classList.remove('hidden');
  $('#wmPlay').onclick = () => { if (locked) { toast('Termine la zone précédente pour débloquer celle-ci'); return; } initAudio(); startMap(i, curMode === 'endless' ? { endless: true } : {}); };
}
// aller à un monde : sa zone en cours (ou sa première zone)
function wmOpen(w) {
  const L = WM.L || wmLayout(innerWidth, innerHeight), n = clamp(save.unlocked[curDiff] - 1, w * ZPW, w * ZPW + ZPW - 1);
  mapPage = w; WM.sel = wmUnlocked(w) ? n : -1; WM.scrollT = wmFocus(L, w * ZPW + 2); WM.vel = 0; wmCard(WM.sel);
  if (!wmUnlocked(w)) toast('Monde ' + (w + 1) + ' verrouillé : termine le monde précédent');
}
function buildMaps() {
  const sec = $('#maps'), r = sec.getBoundingClientRect(), L = WM.L = wmLayout(r.width || innerWidth, r.height || innerHeight);
  sec.classList.add('wm-path'); sec.classList.remove('wm-worlds');
  const rb = $('#mapRandom'); rb.classList.toggle('hidden', curMode !== 'endless'); rb.textContent = '🎲 Zone aléatoire · record vague ' + ((save.endless || {})[curDiff + NCAMP] || 0);
  buildMuts();
  // nouvelle difficulté : on va à la prochaine zone à jouer ; au retour d'une partie on reste sur la zone jouée
  if (mapPage === null || WM.diff !== curDiff + curMode || WM.sel < 0) { WM.diff = curDiff + curMode; WM.sel = clamp(save.unlocked[curDiff] - 1, 0, NCAMP - 1); }
  mapPage = Math.floor(WM.sel / ZPW); WM.scroll = WM.scrollT = wmFocus(L, WM.sel); WM.vel = 0; WM.shown = -1;
  wmCard(WM.sel); wmWorldInfo(mapPage); wmStart();
}
// glisser pour parcourir la carte, toucher une zone pour l'ouvrir
wmCv.addEventListener('pointerdown', e => { WM.drag = { x: e.clientX, y: e.clientY, s: WM.scroll, t: performance.now(), moved: false, lx: e.clientX, ly: e.clientY, lt: performance.now() }; WM.vel = 0; try { wmCv.setPointerCapture(e.pointerId); } catch (er) { } });
wmCv.addEventListener('pointermove', e => {
  const D = WM.drag; if (!D || !WM.L) return; const land = WM.L.land, d = land ? -(e.clientX - D.x) : (e.clientY - D.y);
  if (Math.abs(e.clientX - D.x) + Math.abs(e.clientY - D.y) > 8) D.moved = true;
  if (D.moved) { const now = performance.now(), dd = land ? -(e.clientX - D.lx) : (e.clientY - D.ly); WM.vel = dd / Math.max(1, now - D.lt) * 1000; D.lx = e.clientX; D.ly = e.clientY; D.lt = now; WM.scroll = WM.scrollT = wmClampScroll(WM.L, D.s + d); }
});
const wmUp = e => {
  const D = WM.drag; WM.drag = null; if (!D || e.type === 'pointercancel') return;
  if (D.moved) { if (performance.now() - D.lt > 80) WM.vel = 0; return; }
  WM.vel = 0;
  const r = wmCv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, h = WM.hit.find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
  if (h) { WM.sel = h.n; mapPage = Math.floor(h.n / ZPW); sfx('build'); wmCard(h.n); }
};
wmCv.addEventListener('pointerup', wmUp); wmCv.addEventListener('pointercancel', wmUp);
wmCv.addEventListener('wheel', e => { if (!WM.L) return; WM.scrollT = wmClampScroll(WM.L, WM.scrollT + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (WM.L.land ? 1 : -1)); e.preventDefault(); }, { passive: false });
$('#mapPrev').onclick = () => { if (WM.shown > 0) { wmOpen(WM.shown - 1); sfx('coin'); } };
$('#mapNext').onclick = () => { if (WM.shown < WORLDS.length - 1) { wmOpen(WM.shown + 1); sfx('coin'); } };
function wmBack() { return false; } // un seul écran : le retour mène au choix de la difficulté
$('#wmBack').onclick = () => setState('diff');
document.addEventListener('keydown', e => { if (state !== 'maps') return; if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') $('#mapPrev').click(); if (e.key === 'ArrowRight' || e.key === 'ArrowUp') $('#mapNext').click(); });
