'use strict';
/* Virus Défense — paysages peints de la carte des mondes.
   Chaque monde a un vrai décor en plusieurs plans (lointain, milieu, premier plan) : la partie fixe est peinte une fois
   dans une image en cache, les parties vivantes (lave, fumée, aurore, faisceaux, voyants, nuages…) sont animées par-dessus. */
const SCN = { cache: new Map() };
const sLin = (g, x0, y0, x1, y1, st) => { const gr = g.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
const sRad = (g, x, y, r0, r1, st) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
const sGlow = (g, x, y, r, col, a) => { g.fillStyle = sRad(g, x, y, 0, r, [[0, rgbaA(col).replace('A', a)], [1, rgbaA(col).replace('A', 0)]]); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
// crête de montagnes sur toute la largeur
function sRidge(g, R, W, baseY, amp, n, rough, fill) {
  g.beginPath(); g.moveTo(0, baseY + amp);
  const pts = []; for (let i = 0; i <= n; i++) pts.push([i / n * W, baseY - (.35 + .65 * R()) * amp]);
  g.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; for (let k = 1; k <= 4; k++) { const u = k / 4; g.lineTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + (R() - .5) * amp * rough); } }
  g.lineTo(W, baseY + amp * 3); g.lineTo(0, baseY + amp * 3); g.closePath(); g.fillStyle = fill; g.fill();
  return pts;
}
function sStars(g, R, W, H, n, maxY) { for (let i = 0; i < n; i++) { const a = .2 + R() * .7; g.fillStyle = 'rgba(255,255,255,' + a + ')'; const s = R() < .1 ? 2 : 1; g.fillRect(R() * W, R() * maxY, s, s); } }
function sNoise(g, R, W, H, n, col) { g.fillStyle = col; for (let i = 0; i < n; i++) g.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); }
// sol en perspective : lignes qui convergent vers un point de fuite
function sGridFloor(g, W, H, hy, vx, col, nx, ny) {
  g.strokeStyle = col; g.lineWidth = 1;
  g.beginPath(); for (let i = -nx; i <= nx * 2; i++) { const x = i / nx * W; g.moveTo(vx + (x - vx) * .02, hy); g.lineTo(x, H); } g.stroke();
  for (let j = 1; j <= ny; j++) { const u = Math.pow(j / ny, 2.2), y = hy + (H - hy) * u; g.globalAlpha = .3 + .7 * u; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.globalAlpha = 1;
}
function sCloud(g, x, y, s, top, bot, a, seed) { // cumulus doux en boules superposées ; seed fixe = forme stable quand le nuage bouge
  const R = mulberry(seed != null ? seed : (x * 13 + y * 7) | 0), blobs = [];
  for (let i = 0; i < 9; i++) blobs.push([x + (R() - .5) * s * 2.2, y - Math.abs(R() - .5) * s * .9, s * (.35 + R() * .45)]);
  blobs.push([x, y + s * .1, s * .6]);
  g.globalAlpha = a; g.fillStyle = bot; for (const [bx, by, r] of blobs) { g.beginPath(); g.arc(bx + r * .08, by + r * .14, r, 0, TAU); g.fill(); }
  for (const [bx, by, r] of blobs) { g.fillStyle = sRad(g, bx - r * .35, by - r * .45, r * .1, r * 1.05, [[0, top], [.7, top], [1, bot]]); g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill(); }
  g.fillStyle = bot; g.beginPath(); g.ellipse(x, y + s * .25, s * 1.35, s * .3, 0, 0, TAU); g.fill(); g.globalAlpha = 1; // base arrondie (plus de rectangle visible)
}

// évènement qui revient toutes les `per` secondes et dure `dur` : renvoie { q: avancement 0→1, n: numéro } ou null
function sEvent(t, per, dur, ph) { const u = t + (ph || 0), n = Math.floor(u / per), e = u - n * per; return e < dur ? { q: e / dur, n } : null; }
// éclair en zigzag à forme stable (même graine = même éclair), avec quelques branches
function sBolt(g, x, y, dx, dy, seed, col, a, w) {
  const R = mulberry(seed), steps = 8, path = [[x, y]], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  for (let i = 1; i <= steps; i++) { const u = i / steps, j = i < steps ? (R() - .5) * len * .22 : 0; path.push([x + dx * u + nx * j, y + dy * u + ny * j]); }
  const line = (pts, lw, al) => { g.globalAlpha = a * al; g.lineWidth = lw; g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); };
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; line(path, w * 4, .25); g.strokeStyle = '#ffffff'; line(path, w, 1);
  for (let b = 0; b < 2; b++) { const i = 2 + (R() * (steps - 4) | 0), [bx, by] = path[i], br = [[bx, by]]; let cx = bx, cy = by; for (let k = 0; k < 3; k++) { cx += dx / steps * .8 + nx * (R() - .2) * len * .12; cy += dy / steps * .8 + ny * (R() - .2) * len * .12; br.push([cx, cy]); } g.strokeStyle = col; line(br, w * .6, .8); }
  g.restore(); g.globalAlpha = 1;
}
// traînée lumineuse (étoile filante, paquet de données)
function sStreak(g, x, y, dx, dy, col, a, w) { const gr = g.createLinearGradient(x - dx, y - dy, x, y); gr.addColorStop(0, rgbaA(col).replace('A', 0)); gr.addColorStop(1, rgbaA(col).replace('A', a)); g.strokeStyle = gr; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x, y); g.stroke(); sGlow(g, x, y, w * 3, col, a); }

// écran du vieux PC : une session DOS qui copie, décompresse et lance un petit jeu de raquettes, puis recommence
const RETRO_SCRIPT = [
  ['c', 'C:\\> A:'], ['c', 'A:\\> DIR'], ['o', ' TENNIS.ZIP   12 Ko'], ['o', ' 1 fichier(s)'],
  ['c', 'A:\\> COPY TENNIS.ZIP C:'], ['w', .8], ['o', ' 1 fichier(s) copié(s)'],
  ['c', 'A:\\> C:'], ['c', 'C:\\> PKUNZIP TENNIS.ZIP'], ['o', ' Extraction TENNIS.EXE'], ['w', .5], ['o', ' OK'],
  ['c', 'C:\\> TENNIS'], ['p', 1.8], ['g', 9], ['o', 'MERCI D\'AVOIR JOUÉ !'], ['w', 1.2], ['c', 'C:\\> CLS'], ['w', .6]
];
const RETRO_DUR = RETRO_SCRIPT.reduce((d, [k, v]) => d + (k === 'c' ? v.length / 11 + .6 : k === 'o' ? .35 : v), 0);
function retroScreen(g, x, y, w, h, S, t) {
  const fs = Math.max(6, Math.round(S * .03)), lh = fs * 1.25, maxL = Math.max(2, Math.floor(h / lh)), cur = Math.sin(t * 6) > 0 ? '█' : '';
  let tt = t % RETRO_DUR, out = [], game = -1, last = '';
  for (const [k, v] of RETRO_SCRIPT) {
    const d = k === 'c' ? v.length / 11 + .6 : k === 'o' ? .35 : v;
    if (tt >= d) { if (k === 'c' || k === 'o') out.push(v); tt -= d; continue; }
    if (k === 'c') { const n = Math.min(v.length, Math.floor(tt * 11)); last = v.slice(0, n) + cur; }
    else if (k === 'p') { const n = Math.floor(tt / v * 10); last = ' [' + '#'.repeat(n) + '.'.repeat(10 - n) + '] ' + n * 10 + '%'; }
    else if (k === 'g') game = tt;
    else if (k === 'w') last = ' ';
    break;
  }
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#76ff03'; g.strokeStyle = '#76ff03';
  if (game >= 0) { // le jeu : deux raquettes, une balle qui rebondit, le score
    const tri = (u, p) => { const q = (u / p) % 2; return q < 1 ? q : 2 - q; }, bx = x + w * (.06 + .88 * tri(game + .3, 1.1)), by = y + h * (.12 + .8 * tri(game * 1.37 + .5, .9)), bs = Math.max(2, S * .012);
    const pad = (px, lag) => { const py = clamp(y + h * (.12 + .8 * tri(game * 1.37 + .5 - lag, .9)) - h * .11, y + h * .1, y + h * .76); g.fillRect(px, py, bs, h * .22); };
    const sc = Math.floor((game + .3) / 2.2); g.font = '700 ' + fs + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText(String(sc % 4), x + w * .38, y + h * .02); g.fillText(String((sc + 1) / 2 | 0), x + w * .62, y + h * .02);
    for (let yy = y + h * .12; yy < y + h; yy += bs * 2.5) g.fillRect(x + w / 2 - bs / 4, yy, bs / 2, bs * 1.2);
    pad(x + w * .03, .12); pad(x + w * .97 - bs, .2); g.fillRect(bx - bs / 2, by - bs / 2, bs, bs);
  } else { // la console : on garde les dernières lignes qui tiennent à l'écran
    const L = last ? out.concat([last]) : out.concat([cur ? 'C:\\>' + cur : '']), view = L.slice(-maxL);
    g.font = '700 ' + fs + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'top';
    view.forEach((l, i) => g.fillText(l, x, y + i * lh));
  }
  g.restore();
}

/* ---------- partie fixe de chaque monde ---------- */
const SCENE_STATIC = [
  // 0 Circuit imprimé : ville de composants géants, processeur, pistes en perspective
  (g, W, H, S, R) => {
    const hy = H * .56;
    g.fillStyle = sLin(g, 0, 0, 0, hy, [[0, '#04140c'], [.6, '#0b3320'], [1, '#1f6b3d']]); g.fillRect(0, 0, W, hy);
    sStars(g, R, W, H, 60, hy * .6); sGlow(g, W * .5, hy, S * 1.1, '#76ff03', .18);
    // composants lointains (silhouettes dans la brume)
    for (let i = 0; i < 16; i++) { const x = R() * W, w = S * (.05 + R() * .12), h = S * (.08 + R() * .3), t = R(); g.fillStyle = 'rgba(30,90,55,' + (.5 + R() * .3) + ')';
      if (t < .4) { rr(g, x, hy - h, w, h, w * .1); g.fill(); g.fillStyle = 'rgba(160,220,120,.25)'; for (let k = 0; k < h / 9; k++) if (R() < .5) g.fillRect(x + w * .2, hy - h + 4 + k * 9, w * .6, 2); }
      else if (t < .7) { rr(g, x, hy - h * .7, w * .6, h * .7, w * .3); g.fill(); g.fillStyle = 'rgba(200,230,200,.15)'; g.fillRect(x, hy - h * .7, w * .6, w * .12); }
      else { g.fillRect(x, hy - h * .25, w * 1.4, h * .25); g.fillStyle = 'rgba(255,214,79,.18)'; for (let k = 0; k < 5; k++) g.fillRect(x + k * w * .3, hy - h * .3, w * .1, h * .08); } }
    g.fillStyle = sLin(g, 0, hy - S * .1, 0, hy, [[0, 'rgba(40,140,80,0)'], [1, 'rgba(60,170,90,.45)']]); g.fillRect(0, hy - S * .1, W, S * .1); // brume
    // plan du circuit imprimé
    g.fillStyle = sLin(g, 0, hy, 0, H, [[0, '#0e3d22'], [1, '#165a32']]); g.fillRect(0, hy, W, H - hy);
    sGridFloor(g, W, H, hy, W * .5, 'rgba(255,214,79,.22)', 14, 10);
    sNoise(g, R, W, H, 300, 'rgba(0,0,0,.12)');
    // pistes de cuivre à angles droits au premier plan
    g.strokeStyle = 'rgba(214,160,60,.55)'; g.lineWidth = Math.max(2, S * .008);
    for (let i = 0; i < 10; i++) { let x = R() * W, y = H - R() * (H - hy) * .4; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { if (k % 2) x += (R() - .5) * S * .5; else y -= R() * S * .12; g.lineTo(x, y); } g.stroke(); g.fillStyle = '#d6a03c'; g.beginPath(); g.arc(x, y, S * .012, 0, TAU); g.fill(); }
    // grand processeur central
    const cx = W * .5, cy = hy + S * .05, cw = S * .62, ch = S * .2;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(cx, cy + ch * .9, cw * .7, ch * .5, 0, 0, TAU); g.fill();
    g.fillStyle = sLin(g, 0, cy - ch, 0, cy + ch, [[0, '#9aa5ad'], [.5, '#4e5a61'], [1, '#1b2226']]); rr(g, cx - cw / 2, cy - ch * .8, cw, ch * 1.4, S * .02); g.fill();
    g.fillStyle = sLin(g, cx - cw * .35, 0, cx + cw * .35, 0, [[0, '#cfd8dc'], [.5, '#ffffff'], [1, '#90a4ae']]); rr(g, cx - cw * .36, cy - ch * .65, cw * .72, ch * .95, S * .015); g.fill();
    g.fillStyle = '#263238'; g.font = '900 ' + Math.round(S * .055) + 'px Rubik, system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('VD-CORE', cx, cy - ch * .2);
    g.fillStyle = '#d6a03c'; for (let k = 0; k < 18; k++) { const x = cx - cw / 2 + cw * (k + .5) / 18; g.fillRect(x - 1.5, cy + ch * .6, 3, ch * .3); }
    // condensateurs au premier plan
    for (const [x, h] of [[W * .1, .22], [W * .16, .16], [W * .86, .26], [W * .93, .18]]) { const w = S * .07, y = H - S * .04; g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x + w * .3, y, w * .9, w * .3, 0, 0, TAU); g.fill();
      g.fillStyle = sLin(g, x - w / 2, 0, x + w / 2, 0, [[0, '#0d47a1'], [.35, '#64b5f6'], [1, '#0a2f6b']]); g.fillRect(x - w / 2, y - h * S, w, h * S); g.fillStyle = '#cfd8dc'; g.beginPath(); g.ellipse(x, y - h * S, w / 2, w * .18, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x - w * .3, y - h * S, w * .1, h * S); }
  },
  // 1 La Fournaise : chaîne volcanique, grand volcan, coulées de lave, forges
  (g, W, H, S, R) => {
    const hy = H * .62;
    g.fillStyle = sLin(g, 0, 0, 0, hy, [[0, '#0d0405'], [.45, '#3a0d08'], [.8, '#8a2a0a'], [1, '#d4521a']]); g.fillRect(0, 0, W, hy);
    sGlow(g, W * .55, hy * .7, S * 1.2, '#ff5722', .25);
    sRidge(g, R, W, hy - S * .18, S * .22, 7, .25, sLin(g, 0, hy - S * .5, 0, hy, [[0, '#3b1a1c'], [1, '#5a2414']]));
    sRidge(g, R, W, hy - S * .04, S * .16, 10, .35, sLin(g, 0, hy - S * .3, 0, hy, [[0, '#241010'], [1, '#3d1a10']]));
    // grand volcan
    const vx = W * .55, vt = hy - S * .46, vw = S * .9;
    g.fillStyle = sLin(g, vx - vw, 0, vx + vw, 0, [[0, '#1a0b08'], [.45, '#4a2216'], [.55, '#3b1a12'], [1, '#120706']]);
    g.beginPath(); g.moveTo(vx - vw, hy + S * .02); g.quadraticCurveTo(vx - vw * .35, hy - S * .2, vx - S * .1, vt); g.lineTo(vx + S * .1, vt); g.quadraticCurveTo(vx + vw * .35, hy - S * .2, vx + vw, hy + S * .02); g.closePath(); g.fill();
    // stries de roche
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { const sx = vx + (R() - .5) * S * .15; g.beginPath(); g.moveTo(sx, vt + S * .05); g.quadraticCurveTo(sx + (sx - vx) * 3, hy - S * .2, sx + (sx - vx) * 6 + (R() - .5) * S * .3, hy); g.stroke(); }
    // coulées de lave
    for (let i = 0; i < 4; i++) { const sx = vx + (i - 1.5) * S * .05, ex = vx + (i - 1.5) * S * .32 + (R() - .5) * S * .1;
      for (const [lw, c] of [[S * .024, 'rgba(255,87,34,.3)'], [S * .011, '#ff6d00'], [S * .0045, '#ffe082']]) { g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, vt + S * .02); g.bezierCurveTo(sx + (R() - .5) * S * .1, vt + S * .25, ex + (R() - .5) * S * .1, hy - S * .15, ex, hy + S * .02); g.stroke(); } }
    // cratère incandescent
    g.fillStyle = sRad(g, vx, vt, 0, S * .14, [[0, '#fff3c4'], [.4, '#ff9100'], [1, 'rgba(255,61,0,0)']]); g.beginPath(); g.ellipse(vx, vt + S * .01, S * .14, S * .05, 0, 0, TAU); g.fill();
    // sol de roche sombre et rivière de lave
    g.fillStyle = sLin(g, 0, hy, 0, H, [[0, '#2a120b'], [1, '#120806']]); g.fillRect(0, hy, W, H - hy);
    sNoise(g, R, W, H, 400, 'rgba(255,120,40,.06)');
    g.beginPath(); g.moveTo(0, H * .86); for (let x = 0; x <= W; x += W / 20) g.lineTo(x, H * .86 + Math.sin(x / W * 9) * S * .04); for (let x = W; x >= 0; x -= W / 20) g.lineTo(x, H * .93 + Math.sin(x / W * 7 + 1) * S * .03); g.closePath();
    g.fillStyle = sLin(g, 0, H * .84, 0, H * .96, [[0, '#ffb74d'], [.5, '#ff5722'], [1, '#bf360c']]); g.fill();
    // forges et cheminées au premier plan
    for (const fx of [W * .12, W * .88]) { const fw = S * .2, fh = S * .22, fy = H * .84;
      g.fillStyle = sLin(g, fx - fw / 2, 0, fx + fw / 2, 0, [[0, '#1b0f0b'], [.5, '#3e2723'], [1, '#120a08']]); g.fillRect(fx - fw / 2, fy - fh, fw, fh);
      g.fillRect(fx + fw * .15, fy - fh - S * .2, fw * .18, S * .2); g.fillStyle = sLin(g, 0, fy - fh * .6, 0, fy - fh * .2, [[0, '#ffd54f'], [1, '#ff6d00']]); rr(g, fx - fw * .25, fy - fh * .6, fw * .5, fh * .4, S * .02); g.fill(); }
  },
  // 2 Flux de données : nuit bleue, tours de données, sol en grille lumineuse
  (g, W, H, S, R) => {
    const hy = H * .6;
    g.fillStyle = sLin(g, 0, 0, 0, hy, [[0, '#010612'], [.6, '#06204a'], [1, '#0b4a8a']]); g.fillRect(0, 0, W, hy);
    sStars(g, R, W, H, 90, hy * .7); sGlow(g, W * .5, hy, S * 1.3, '#18ffff', .16);
    // tours de données lointaines
    for (let i = 0; i < 26; i++) { const x = R() * W, w = S * (.04 + R() * .08), h = S * (.12 + R() * .45); g.fillStyle = 'rgba(10,40,80,' + (.6 + R() * .3) + ')'; g.fillRect(x, hy - h, w, h);
      for (let k = 0; k < h / 7; k++) for (let j = 0; j < w / 6; j++) if (R() < .35) { g.fillStyle = R() < .8 ? 'rgba(64,196,255,.55)' : 'rgba(255,255,255,.7)'; g.fillRect(x + 2 + j * 6, hy - h + 3 + k * 7, 3, 2); } }
    // grandes tours au milieu (empilement de disques)
    for (const [tx, th] of [[W * .2, .55], [W * .78, .62]]) { const tw = S * .16; for (let k = 0; k < 6; k++) { const y = hy - th * S + k * th * S / 6; g.fillStyle = sLin(g, tx - tw, 0, tx + tw, 0, [[0, '#2a3b4f'], [.5, '#9fb6c9'], [1, '#22303f']]); g.beginPath(); g.ellipse(tx, y + th * S / 12, tw, tw * .25, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(24,255,255,.5)'; g.fillRect(tx - tw * .9, y + th * S / 12 - 1, tw * 1.8, 2); } }
    // sol en grille
    g.fillStyle = sLin(g, 0, hy, 0, H, [[0, '#04203f'], [1, '#010a18']]); g.fillRect(0, hy, W, H - hy);
    sGridFloor(g, W, H, hy, W * .5, 'rgba(24,255,255,.35)', 18, 12);
    g.fillStyle = sLin(g, 0, hy - 2, 0, hy + S * .06, [[0, 'rgba(24,255,255,.6)'], [1, 'rgba(24,255,255,0)']]); g.fillRect(0, hy - 2, W, S * .06);
  },
  // 3 Salle des serveurs : couloir de baies en perspective
  (g, W, H, S, R) => {
    const vy = H * .45, vx = W * .5;
    g.fillStyle = sLin(g, 0, 0, 0, H, [[0, '#0b1217'], [.45, '#1c2a33'], [1, '#0a0f12']]); g.fillRect(0, 0, W, H);
    // plafond : chemins de câbles
    for (let k = 0; k < 6; k++) { const u = k / 6, y = vy * (1 - Math.pow(1 - u, 1.6)); g.strokeStyle = 'rgba(255,196,0,' + (.15 + u * .2) + ')'; g.lineWidth = 1 + u * 3; g.beginPath(); g.moveTo(0, y * .55); g.lineTo(W, y * .55); g.stroke(); }
    // rangées de baies à gauche et à droite, en perspective
    const rows = 12;
    for (const side of [-1, 1]) for (let i = rows - 1; i >= 0; i--) {
      const u0 = i / rows, u1 = (i + 1) / rows, p = u => Math.pow(u, 1.7);
      const xa = vx + side * (S * .12 + p(u0) * W * .7), xb = vx + side * (S * .12 + p(u1) * W * .7), ta = vy - S * .08 - p(u0) * vy * 1.1, tb = vy - S * .08 - p(u1) * vy * 1.1, ba = vy + S * .05 + p(u0) * (H - vy) * 1.1, bb = vy + S * .05 + p(u1) * (H - vy) * 1.1;
      g.fillStyle = sLin(g, xa, 0, xb, 0, [[0, '#1d272e'], [1, i % 2 ? '#34434d' : '#2c3942']]); g.beginPath(); g.moveTo(xa, ta); g.lineTo(xb, tb); g.lineTo(xb, bb); g.lineTo(xa, ba); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
      const n = 8; for (let k = 1; k < n; k++) { const ya = ta + (ba - ta) * k / n, yb = tb + (bb - tb) * k / n; g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke(); }
    }
    // sol en dalles
    g.fillStyle = sLin(g, 0, vy, 0, H, [[0, '#2b3a44'], [1, '#141c21']]); g.beginPath(); g.moveTo(vx - S * .12, vy + S * .05); g.lineTo(vx + S * .12, vy + S * .05); g.lineTo(W * 1.4, H); g.lineTo(-W * .4, H); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,180,200,.12)'; g.lineWidth = 1; for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(vx + k * S * .02, vy + S * .05); g.lineTo(vx + k * W * .25, H); g.stroke(); }
    for (let j = 1; j < 10; j++) { const y = vy + S * .05 + Math.pow(j / 10, 2) * (H - vy); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    sGlow(g, vx, vy, S * .6, '#80deea', .25); // lumière froide au fond
  },
  // 4 Zone cryogénique : montagnes enneigées, glacier, lac gelé
  (g, W, H, S, R) => {
    const hy = H * .6;
    g.fillStyle = sLin(g, 0, 0, 0, hy, [[0, '#020a1c'], [.5, '#0c2b4f'], [1, '#2c6b94']]); g.fillRect(0, 0, W, hy);
    sStars(g, R, W, H, 80, hy * .6);
    const far = sRidge(g, R, W, hy - S * .25, S * .3, 6, .2, sLin(g, 0, hy - S * .6, 0, hy, [[0, '#a9c9e3'], [1, '#4d7fa8']]));
    for (const [x, y] of far) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(x - S * .08, y + S * .07); g.lineTo(x, y); g.lineTo(x + S * .08, y + S * .07); g.lineTo(x + S * .03, y + S * .05); g.lineTo(x, y + S * .08); g.closePath(); g.fill(); }
    sRidge(g, R, W, hy - S * .06, S * .18, 9, .3, sLin(g, 0, hy - S * .3, 0, hy, [[0, '#e3f2fd'], [1, '#90b8d6']]));
    // flèches de cristal
    for (let i = 0; i < 9; i++) { const x = W * (.05 + R() * .9), h = S * (.12 + R() * .3), w = h * .22, y = hy + S * .02; g.fillStyle = sLin(g, x - w, 0, x + w, 0, [[0, 'rgba(225,245,255,.95)'], [.5, 'rgba(129,212,250,.85)'], [1, 'rgba(2,136,209,.9)']]);
      g.beginPath(); g.moveTo(x - w, y); g.lineTo(x - w * .5, y - h * .8); g.lineTo(x, y - h); g.lineTo(x + w * .5, y - h * .8); g.lineTo(x + w, y); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.stroke(); }
    // lac gelé et reflets
    g.fillStyle = sLin(g, 0, hy, 0, H, [[0, '#7fb3d5'], [.3, '#3d7aa8'], [1, '#123a5c']]); g.fillRect(0, hy, W, H - hy);
    g.save(); g.globalAlpha = .25; g.translate(0, hy * 2); g.scale(1, -1); sRidge(g, mulberry(5), W, hy - S * .06, S * .18, 9, .3, '#cfe8f7'); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; for (let i = 0; i < 18; i++) { const x = R() * W, y = hy + R() * (H - hy); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * S * .3, y + (R() - .5) * S * .06); g.stroke(); }
    // congères au premier plan
    g.fillStyle = '#f4faff'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += W / 16) g.lineTo(x, H - S * (.05 + .05 * Math.sin(x / W * 11) + .03 * R())); g.lineTo(W, H); g.closePath(); g.fill();
  },
  // 5 Cyberespace : soleil néon, montagnes en fil de fer, ville néon
  (g, W, H, S, R) => {
    const hy = H * .6;
    g.fillStyle = sLin(g, 0, 0, 0, hy, [[0, '#07010f'], [.5, '#2a0745'], [1, '#7a0f6b']]); g.fillRect(0, 0, W, hy);
    sStars(g, R, W, H, 70, hy * .5);
    // soleil rayé
    const sx = W * .5, sy = hy - S * .05, sr = S * .38;
    g.save(); g.beginPath(); g.arc(sx, sy, sr, Math.PI, 0); g.clip();
    g.fillStyle = sLin(g, 0, sy - sr, 0, sy, [[0, '#ffeb3b'], [.5, '#ff6d00'], [1, '#ff2bd6']]); g.fillRect(sx - sr, sy - sr, sr * 2, sr);
    g.fillStyle = '#2a0745'; for (let k = 0; k < 7; k++) { const y = sy - sr * .55 + k * sr * .09, h = 2 + k * 1.6; g.fillRect(sx - sr, y, sr * 2, h); }
    g.restore(); sGlow(g, sx, sy - sr * .4, sr * 1.8, '#ff2bd6', .25);
    // montagnes en fil de fer
    for (const side of [-1, 1]) { g.fillStyle = '#12021f'; g.strokeStyle = '#00e5ff'; g.lineWidth = 1.5; const bx = sx + side * W * .3; g.beginPath(); g.moveTo(bx - S * .6, hy); g.lineTo(bx - S * .2, hy - S * .3); g.lineTo(bx, hy - S * .18); g.lineTo(bx + S * .25, hy - S * .36); g.lineTo(bx + S * .6, hy); g.closePath(); g.fill(); g.stroke();
      g.globalAlpha = .5; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(bx - S * .6 + k * S * .1, hy); g.lineTo(bx - S * .2 + k * S * .02, hy - S * .3 + k * S * .05); g.stroke(); } g.globalAlpha = 1; }
    // ville néon
    for (let i = 0; i < 30; i++) { const x = R() * W, w = S * (.03 + R() * .06), h = S * (.06 + R() * .2); if (Math.abs(x - sx) < sr * .8) continue; g.fillStyle = '#0a0114'; g.fillRect(x, hy - h, w, h); g.fillStyle = R() < .5 ? 'rgba(255,43,214,.7)' : 'rgba(0,229,255,.7)'; g.fillRect(x, hy - h, w, 2); for (let k = 0; k < h / 6; k++) if (R() < .3) g.fillRect(x + 2, hy - h + 4 + k * 6, w - 4, 1.5); }
    g.fillStyle = sLin(g, 0, hy, 0, H, [[0, '#1a0330'], [1, '#05000a']]); g.fillRect(0, hy, W, H - hy);
  },
  // 6 Ordinateur rétro : bureau, grand écran cathodique, clavier, disquettes, lampe
  (g, W, H, S, R) => {
    const hy = H * .55;
    // papier peint à motif
    g.fillStyle = sLin(g, 0, 0, 0, hy, [[0, '#2b2117'], [1, '#4a3a28']]); g.fillRect(0, 0, W, hy);
    g.fillStyle = 'rgba(255,220,160,.05)'; for (let y = 0; y < hy; y += 16) for (let x = (y / 16 % 2) * 8; x < W; x += 16) g.fillRect(x, y, 6, 6);
    // étagère avec disquettes
    g.fillStyle = '#5d4037'; g.fillRect(W * .04, hy * .32, W * .3, S * .03);
    const fcol = ['#1565c0', '#c62828', '#2e7d32', '#212121', '#f9a825', '#6a1b9a']; for (let k = 0; k < 12; k++) { const x = W * .05 + k * S * .045; g.fillStyle = fcol[k % 6]; g.fillRect(x, hy * .32 - S * .14, S * .035, S * .14); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + S * .006, hy * .32 - S * .11, S * .022, S * .03); }
    // bureau en bois
    g.fillStyle = sLin(g, 0, hy, 0, H, [[0, '#8d5a2b'], [.15, '#a86e34'], [1, '#5d3a1a']]); g.fillRect(0, hy, W, H - hy);
    g.strokeStyle = 'rgba(60,30,10,.35)'; g.lineWidth = 1.5; for (let i = 0; i < 14; i++) { const y = hy + R() * (H - hy); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * .3, y + (R() - .5) * 12, W * .7, y + (R() - .5) * 12, W, y); g.stroke(); }
    g.fillStyle = 'rgba(255,240,200,.25)'; g.fillRect(0, hy, W, 3);
    // grand écran cathodique beige
    const mx = W * .55, mw = S * .66, mh = S * .46, my = hy + S * .1;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(mx + S * .04, my + S * .02, mw * .62, S * .06, 0, 0, TAU); g.fill();
    g.fillStyle = sLin(g, mx - mw / 2, 0, mx + mw / 2, 0, [[0, '#cbbfa8'], [.5, '#efe6d4'], [1, '#a99c84']]); rr(g, mx - mw / 2, my - mh, mw, mh, S * .05); g.fill();
    g.fillStyle = '#d9cdb6'; g.fillRect(mx - mw * .3, my - S * .04, mw * .6, S * .05);
    g.fillStyle = '#1a1a14'; rr(g, mx - mw * .4, my - mh * .9, mw * .8, mh * .68, S * .05); g.fill();
    g.fillStyle = sRad(g, mx, my - mh * .56, 0, mw * .45, [[0, '#0f3d12'], [1, '#041204']]); rr(g, mx - mw * .37, my - mh * .87, mw * .74, mh * .62, S * .04); g.fill();
    g.fillStyle = '#8d8270'; g.fillRect(mx + mw * .28, my - mh * .15, S * .06, S * .02); g.fillStyle = '#ff6d00'; g.fillRect(mx + mw * .38, my - mh * .15, S * .015, S * .015);
    // clavier
    const kx = mx - S * .05, ky = H * .82, kw = S * .8, kh = S * .16;
    g.fillStyle = sLin(g, 0, ky, 0, ky + kh, [[0, '#efe6d4'], [1, '#a99c84']]); g.beginPath(); g.moveTo(kx - kw / 2 + S * .03, ky); g.lineTo(kx + kw / 2 - S * .03, ky); g.lineTo(kx + kw / 2, ky + kh); g.lineTo(kx - kw / 2, ky + kh); g.closePath(); g.fill();
    g.fillStyle = '#8d8270'; for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) { const u = (c + .5) / 14, x = kx - kw / 2 + S * .03 * (1 - r / 4) + u * (kw - S * .06 * (1 - r / 4)), y = ky + kh * (.12 + r * .21); g.fillRect(x - S * .02, y, S * .04, kh * .15); }
    // pile de disquettes et souris
    for (let k = 0; k < 4; k++) { const x = W * .12 + k * 2, y = H * .9 - k * S * .025; g.fillStyle = fcol[k]; g.fillRect(x, y, S * .16, S * .022); g.fillStyle = '#cfd8dc'; g.fillRect(x + S * .05, y, S * .06, S * .008); }
    g.fillStyle = '#e6dcc7'; g.beginPath(); g.ellipse(W * .9, H * .86, S * .05, S * .07, .3, 0, TAU); g.fill();
  },
  // 7 Le Nuage : ciel lumineux, cumulus, plateformes de serveurs, orage au loin
  (g, W, H, S, R) => {
    g.fillStyle = sLin(g, 0, 0, 0, H, [[0, '#1e5aa8'], [.45, '#5aa0e6'], [.8, '#a8d4ff'], [1, '#dcefff']]); g.fillRect(0, 0, W, H);
    sGlow(g, W * .82, H * .14, S * .9, '#fff8e1', .55); sGlow(g, W * .82, H * .14, S * .12, '#ffffff', 1);
    // orage au loin, à gauche
    sCloud(g, W * .14, H * .3, S * .32, '#7d8ea3', '#3d4b5e', .95); sCloud(g, W * .3, H * .26, S * .26, '#8a9bb0', '#4a5a6e', .9);
    // couches de nuages
    for (let i = 0; i < 6; i++) sCloud(g, R() * W, H * (.4 + R() * .1), S * (.18 + R() * .15), '#ffffff', '#b7cfe8', .8);
    // plateformes de serveurs posées sur les nuages
    for (const [px, py, sc] of [[W * .52, H * .55, 1], [W * .82, H * .5, .7]]) {
      sCloud(g, px, py + S * .06 * sc, S * .22 * sc, '#ffffff', '#c9dcf0', 1);
      const w = S * .3 * sc, h = S * .2 * sc; g.fillStyle = sLin(g, px - w / 2, 0, px + w / 2, 0, [[0, '#cfd8dc'], [.5, '#ffffff'], [1, '#90a4ae']]); rr(g, px - w / 2, py - h, w, h, S * .02); g.fill();
      for (let k = 0; k < 4; k++) { g.fillStyle = '#37474f'; g.fillRect(px - w * .4, py - h + h * (.12 + k * .21), w * .8, h * .14); g.fillStyle = '#40c4ff'; g.fillRect(px - w * .34, py - h + h * (.16 + k * .21), w * .06, h * .06); }
      g.strokeStyle = '#90a4ae'; g.lineWidth = 2 * sc; g.beginPath(); g.moveTo(px, py - h); g.lineTo(px, py - h - S * .16 * sc); g.stroke();
    }
    // mer de nuages au premier plan
    for (let i = 0; i < 9; i++) sCloud(g, (i + .5) / 9 * W + (R() - .5) * S * .2, H * (.82 + R() * .1), S * (.25 + R() * .15), '#ffffff', '#c3d9f2', 1);
  }
];

/* ---------- parties animées ---------- */
const SCENE_LIVE = [
  (g, W, H, S, t) => { // courant électrique sur les pistes et processeur qui pulse
    const hy = H * .56, cx = W * .5, cy = hy + S * .05;
    sGlow(g, cx, cy - S * .05, S * (.5 + .05 * Math.sin(t * 2)), '#76ff03', .22);
    for (let i = 0; i < 8; i++) { const u = (t * .25 + i / 8) % 1, x = cx + (i - 3.5) * W * .12 * Math.pow(u, 1.2), y = hy + (H - hy) * Math.pow(u, 1.8); sGlow(g, x, y, S * .015 + u * S * .03, '#c6ff00', .9 * (1 - u * .4)); }
    const e = sEvent(t, 4.5, .35); if (e) { const R = mulberry(e.n * 31 + 5), x0 = W * (.1 + R() * .8), y0 = hy + (H - hy) * (.2 + R() * .6), a = Math.sin(e.q * Math.PI); // arc électrique entre deux composants
      sGlow(g, x0, y0, S * .15, '#c6ff00', .4 * a); sBolt(g, x0, y0, (R() - .5) * S * .5, (R() - .5) * S * .2, e.n * 7 + 1, '#c6ff00', a, 1.5); }
  },
  (g, W, H, S, t) => { // fumée du volcan, lave qui palpite, braises, chaleur sur la rivière
    const hy = H * .62, vx = W * .55, vt = hy - S * .46;
    sGlow(g, vx, vt, S * (.35 + .05 * Math.sin(t * 3)), '#ff6d00', .45);
    for (let k = 0; k < 9; k++) { const q = (t * .06 + k / 9) % 1, r = S * (.06 + q * .3); g.fillStyle = 'rgba(' + (60 + q * 40 | 0) + ',' + (40 + q * 40 | 0) + ',' + (40 + q * 40 | 0) + ',' + (.55 * (1 - q)) + ')'; g.beginPath(); g.arc(vx + Math.sin(k * 2.3 + q * 3) * S * .08 + q * S * .4, vt - q * S * .9, r, 0, TAU); g.fill(); }
    for (let k = 0; k < 18; k++) { const q = (t * (.15 + (k % 5) * .03) + k / 18) % 1; g.fillStyle = 'rgba(255,' + (150 + (k % 4) * 25) + ',60,' + (1 - q) + ')'; g.fillRect(vx + Math.sin(k * 7.1) * S * .3 * q, vt - q * S * .7 + q * q * S * .5, 2.5, 2.5); }
    for (let k = 0; k < 6; k++) { const x = (k / 6 + t * .03) % 1 * W; sGlow(g, x, H * .89, S * .08, '#ffeb3b', .25 + .15 * Math.sin(t * 2 + k)); }
    const e = sEvent(t, 7, 2.2); if (e) { const R = mulberry(e.n * 13 + 3), q = e.q; // éruption : éclat au cratère puis bombes de lave en cloche
      sGlow(g, vx, vt, S * (.4 + .3 * (1 - q)), '#ffab40', .7 * (1 - q)); if (q < .15) { g.fillStyle = 'rgba(255,120,40,' + (.12 * (1 - q / .15)) + ')'; g.fillRect(0, 0, W, H); }
      for (let k = 0; k < 14; k++) { const vxk = (R() - .5) * S * .9, vyk = S * (.6 + R() * .7), u = q * (.8 + R() * .4), px = vx + vxk * u, py = vt - vyk * u + S * 1.1 * u * u, r = S * (.008 + R() * .012);
        if (py > H) continue; g.fillStyle = 'rgba(255,' + (90 + R() * 120 | 0) + ',30,' + (1 - q * .7) + ')'; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); sGlow(g, px, py, r * 4, '#ff6d00', .35 * (1 - q)); } }
  },
  (g, W, H, S, t) => { // faisceaux de fibre optique en arc avec impulsions
    const hy = H * .6;
    for (let k = 0; k < 5; k++) { const x0 = W * (.05 + k * .22), x1 = W * (.25 + k * .2), top = hy - S * (.5 + .25 * (k % 2)), col = k % 2 ? '#7c4dff' : '#18ffff';
      g.strokeStyle = rgbaA(col).replace('A', .35); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, hy); g.quadraticCurveTo((x0 + x1) / 2, top, x1, hy); g.stroke();
      for (let j = 0; j < 2; j++) { const u = (t * .3 + k * .17 + j * .5) % 1, x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * (x0 + x1) / 2 + u * u * x1, y = (1 - u) * (1 - u) * hy + 2 * (1 - u) * u * top + u * u * hy; sGlow(g, x, y, S * .03, col, 1); } }
    const off = (t * 30) % 40; g.strokeStyle = 'rgba(24,255,255,.25)'; g.lineWidth = 1; for (let j = 0; j < 8; j++) { const y = hy + Math.pow((j + off / 40) / 8, 2) * (H - hy); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const e = sEvent(t, 3.5, .9); if (e) { const R = mulberry(e.n * 17 + 2), x = W * (-.1 + e.q * 1.2), y = hy * (.15 + R() * .4) + e.q * S * .15; sStreak(g, x, y, S * .35, S * .04, R() < .5 ? '#18ffff' : '#b388ff', .9 * Math.sin(e.q * Math.PI), 2); } // paquet de données filant
  },
  (g, W, H, S, t) => { // voyants des baies et brume froide
    const vy = H * .45, vx = W * .5, rows = 12, p = u => Math.pow(u, 1.7);
    for (const side of [-1, 1]) for (let i = 0; i < rows; i++) { const u = (i + .5) / rows, x = vx + side * (S * .12 + p(u) * W * .7), top = vy - S * .08 - p(u) * vy * 1.1, bot = vy + S * .05 + p(u) * (H - vy) * 1.1, sz = 1 + u * 4;
      for (let k = 0; k < 7; k++) { const on = Math.sin(t * (3 + (i * 7 + k) % 5) + i * 1.3 + k * 2.1) > .1; if (!on) continue; g.fillStyle = (i + k) % 5 ? '#76ff03' : '#ffab00'; g.fillRect(x - sz / 2, top + (bot - top) * (k + .5) / 7.5, sz, sz); } }
    for (let k = 0; k < 4; k++) { const x = ((t * .02 + k / 4) % 1) * W * 1.4 - W * .2; g.fillStyle = sRad(g, x, H * .8, 0, S * .6, [[0, 'rgba(160,220,240,.12)'], [1, 'rgba(160,220,240,0)']]); g.fillRect(x - S * .6, H * .5, S * 1.2, H * .5); }
    const e = sEvent(t, 6, .5, 1); if (e) { const R = mulberry(e.n * 23 + 9), x = W * (.2 + R() * .6), y = H * (.05 + R() * .12), on = Math.sin(e.q * 40) > 0; // néon qui grésille et étincelle sur un chemin de câbles
      if (on) { g.fillStyle = 'rgba(200,240,255,.05)'; g.fillRect(0, 0, W, H); } sGlow(g, x, y, S * .12, '#80deea', on ? .8 : .2);
      for (let k = 0; k < 8; k++) { const u = e.q, a = R() * TAU, d = S * (.05 + R() * .12) * u; g.fillStyle = 'rgba(255,240,160,' + (1 - u) + ')'; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d + u * u * S * .2, 2, 2); } }
  },
  (g, W, H, S, t) => { // aurore boréale et neige
    const hy = H * .6;
    for (let b = 0; b < 3; b++) { const col = b === 1 ? '124,77,255' : '105,240,174'; g.beginPath(); for (let x = 0; x <= W; x += W / 30) { const y = hy * (.18 + b * .08) + Math.sin(x / W * 6 + t * .6 + b) * S * .06; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.lineWidth = S * (.08 - b * .015); g.strokeStyle = 'rgba(' + col + ',' + (.18 + .08 * Math.sin(t + b)) + ')'; g.stroke(); g.lineWidth = S * .015; g.strokeStyle = 'rgba(' + col + ',.35)'; g.stroke(); }
    const R = mulberry(9); for (let k = 0; k < 40; k++) { const sp = .03 + R() * .05, q = (t * sp + R()) % 1, x = (R() * W + Math.sin(t + k) * 15 + W) % W, y = q * H; g.fillStyle = 'rgba(255,255,255,' + (.5 + R() * .5) + ')'; g.beginPath(); g.arc(x, y, 1 + R() * 2, 0, TAU); g.fill(); }
    const e = sEvent(t, 5, 1.1, 2); if (e) { const R2 = mulberry(e.n * 19 + 4), x = W * (.1 + R2() * .5) + e.q * W * .4, y = hy * (.1 + R2() * .3) + e.q * S * .2; sStreak(g, x, y, S * .3, S * .15, '#e0f7fa', .9 * Math.sin(e.q * Math.PI), 1.6); } // étoile filante
    for (let k = 0; k < 5; k++) { const R3 = mulberry(k * 41 + Math.floor(t / 2.5 + k * .37)), a = Math.max(0, Math.sin(((t / 2.5 + k * .37) % 1) * Math.PI)), x = R3() * W, y = hy + R3() * (H - hy) * .9, r = S * .025 * a; // reflets qui scintillent sur la glace
      g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke(); }
  },
  (g, W, H, S, t) => { // grille néon qui défile vers l'avant
    const hy = H * .6, vx = W * .5;
    g.strokeStyle = 'rgba(255,43,214,.7)'; g.lineWidth = 1.5; g.beginPath(); for (let i = -14; i <= 14; i++) { g.moveTo(vx + i * S * .01, hy); g.lineTo(vx + i * W * .12, H); } g.stroke();
    const off = (t * .5) % 1; g.strokeStyle = 'rgba(0,229,255,.7)'; for (let j = 0; j < 10; j++) { const y = hy + Math.pow((j + off) / 10, 2.2) * (H - hy); g.globalAlpha = (j + off) / 10; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.globalAlpha = 1;
    sGlow(g, vx, hy, S * .5, '#ff2bd6', .2 + .05 * Math.sin(t * 2));
    const e = sEvent(t, 5.5, .45, 3); if (e) { const R = mulberry(e.n * 29 + 6), x = W * (.15 + R() * .7), a = e.q < .3 || (e.q > .5 && e.q < .7) ? 1 : .25; // éclair néon dans le ciel
      g.fillStyle = 'rgba(255,43,214,' + (.06 * a) + ')'; g.fillRect(0, 0, W, hy); sBolt(g, x, 0, (R() - .5) * S * .3, hy * .85, e.n * 11 + 3, R() < .5 ? '#ff2bd6' : '#00e5ff', a, 1.8); }
  },
  (g, W, H, S, t) => { // l'ordinateur tape de vraies commandes DOS pour installer un jeu de raquettes et y jouer, lumière de lampe
    const hy = H * .55, mx = W * .55, mw = S * .66, mh = S * .46, my = hy + S * .1;
    retroScreen(g, mx - mw * .35, my - mh * .84, mw * .7, mh * .56, S, t);
    sGlow(g, mx, my - mh * .56, mw * .55, '#76ff03', .12 + .03 * Math.sin(t * 30));
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = my - mh * .87; y < my - mh * .25; y += 3) g.fillRect(mx - mw * .37, y, mw * .74, 1);
    g.fillStyle = sRad(g, W * .1, 0, 0, S * .9, [[0, 'rgba(255,214,140,.25)'], [1, 'rgba(255,214,140,0)']]); g.beginPath(); g.moveTo(W * .1 - S * .05, 0); g.lineTo(W * .1 + S * .05, 0); g.lineTo(W * .1 + S * .5, H); g.lineTo(W * .1 - S * .4, H); g.closePath(); g.fill();
    const e = sEvent(t, 5, .3, 1.5); if (e) { const R = mulberry(e.n * 37 + 8); for (let k = 0; k < 3; k++) { const y = my - mh * (.85 - R() * .55), h = S * (.006 + R() * .02); g.fillStyle = k % 2 ? 'rgba(255,64,129,.35)' : 'rgba(118,255,3,.4)'; g.fillRect(mx - mw * .37 + (R() - .5) * S * .04, y, mw * .74, h); } } // parasite sur l'écran
  },
  (g, W, H, S, t) => { // nuages qui dérivent, éclairs au loin, rayons de soleil
    for (let k = 0; k < 6; k++) { const a = -.6 + k * .14 + Math.sin(t * .2 + k) * .02; g.fillStyle = 'rgba(255,250,230,.06)'; g.beginPath(); g.moveTo(W * .82, H * .14); g.lineTo(W * .82 + Math.cos(Math.PI / 2 + a) * H * 1.6 - S * .05, H * .14 + Math.sin(Math.PI / 2 + a) * H * 1.6); g.lineTo(W * .82 + Math.cos(Math.PI / 2 + a) * H * 1.6 + S * .05, H * .14 + Math.sin(Math.PI / 2 + a) * H * 1.6); g.closePath(); g.fill(); }
    for (let k = 0; k < 3; k++) { const x = ((t * .015 * (k + 1) + k * .37) % 1.3 - .15) * W; sCloud(g, x, H * (.18 + k * .08), S * (.12 + k * .03), '#ffffff', '#cfe0f5', .75, 911 + k * 37); }
    const e = sEvent(t, 4.5, .5); if (e) { const R = mulberry(e.n * 43 + 1), x = W * (.1 + R() * .2), a = e.q < .25 || (e.q > .45 && e.q < .6) ? 1 : .2; // éclair dans l'orage, double flash
      g.fillStyle = 'rgba(255,255,255,' + (.07 * a) + ')'; g.fillRect(0, 0, W, H); sGlow(g, x, H * .3, S * .5, '#ffffff', .45 * a); sBolt(g, x, H * .33, (R() - .5) * S * .12, S * .22, e.n * 5 + 2, '#2979ff', a, 2.2); }
    for (const [px, py, sc] of [[W * .52, H * .55, 1], [W * .82, H * .5, .7]]) sGlow(g, px, py - S * .36 * sc, S * .04, '#ff5252', Math.sin(t * 4 + px) > 0 ? .9 : .2);
  }
];

/* ---------- accès : image fixe en cache + animation ---------- */
function sceneImage(w, Wd, Hd) {
  Wd = Math.max(2, Math.round(Wd)); Hd = Math.max(2, Math.round(Hd));
  const k = save.eco ? 1 : Math.min(1.5, window.devicePixelRatio || 1); // netteté sur les écrans haute définition
  const key = w + ':' + Wd + 'x' + Hd + '@' + k; let c = SCN.cache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = Math.round(Wd * k); c.height = Math.round(Hd * k);
    const g = c.getContext('2d'), S = Math.min(Wd, Hd); g.scale(k, k);
    try { SCENE_STATIC[w](g, Wd, Hd, S, mulberry(w * 1013 + 77)); } catch (e) { }
    SCN.cache.set(key, c); if (SCN.cache.size > 4) SCN.cache.delete(SCN.cache.keys().next().value); // garde les derniers paysages utilisés
  }
  return c;
}
// dessine le paysage du monde w dans le rectangle (x, y, Wd, Hd) de l'écran
function drawScene(g, w, x, y, Wd, Hd, t) {
  g.drawImage(sceneImage(w, Wd, Hd), x, y, Wd, Hd);
  if (save.eco) return;
  g.save(); g.beginPath(); g.rect(x, y, Wd, Hd); g.clip(); g.translate(x, y);
  try { SCENE_LIVE[w](g, Wd, Hd, Math.min(Wd, Hd), t); } catch (e) { }
  g.restore();
}
