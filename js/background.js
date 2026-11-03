'use strict';
/* Virus Défense — mise en page, caméra et décors des mondes */
/* ---------------- mise en page + caméra (zoom / déplacement) ---------------- */
let DPR = 1, SW = 0, SH = 0;
const L = { T: 30, port: false, zoom: 1, vx: COLS / 2, vy: ROWS / 2, ax: 0, ay: 0, aw: 100, ah: 100, s: 30 };
function hasPanel() { return state === 'play' || state === 'pause' || state === 'result' || state === 'edit'; }
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
  const ep = $('#edPanel'); ep.classList.toggle('land', !L.port); ep.classList.toggle('port', L.port); ep.classList.toggle('left', save.side === 'left' && !L.port);
  const left = save.side === 'left'; panel.classList.toggle('left', left && !L.port);
  const PW = 176;
  if (!pan) { L.ax = 0; L.ay = 0; L.aw = SW; L.ah = SH; }
  else if (!L.port) { L.ax = left ? PW + sL + 4 : sL; L.ay = 0; L.aw = SW - PW - sR - sL - 4; L.ah = SH; }
  else { L.ax = 0; L.ay = 0; L.aw = SW; L.ah = SH - sB - (state === 'edit' ? 300 : 226); }
  // T = taille d'une case quand toute la carte est visible
  L.T = L.port ? Math.min(L.aw / ROWS, L.ah / COLS) : Math.min(L.aw / COLS, L.ah / ROWS);
  if (!pan) L.T = L.port ? Math.max(L.aw / ROWS, L.ah / COLS) : Math.max(L.aw / COLS, L.ah / ROWS); // menu : la carte remplit l'écran
  setZoom(L.zoom);
  if (G && G.sel) { dockPopup(); placePopup(); }
  const pw = $('#powers');
  if (pw) { pw.style.left = (L.ax + 12) + 'px'; pw.style.top = 'auto'; pw.style.bottom = (L.port ? SH - (L.ay + L.ah) + 8 : 12 + sB) + 'px'; }
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
  } else if (th === 'retro') { // plastique beige façon vieux PC, grain et trames de pixels
    fillAll(shade(m.base, .12), shade(m.base, -.35));
    for (let i = 0; i < W * H / (P * 3); i++) { g.fillStyle = R() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(60,40,10,.06)'; g.fillRect(R() * W, R() * H, P * .04, P * .04); }
    const px = P * .25;
    for (let i = 0; i < 9; i++) { const x0 = R() * W, y0 = R() * H, n = 4 + Math.floor(R() * 6); for (let k = 0; k < n * n; k++) if (R() < .45) { g.fillStyle = 'rgba(90,60,20,.09)'; g.fillRect(x0 + (k % n) * px, y0 + Math.floor(k / n) * px, px - 1, px - 1); } }
    for (let y = P * 3.5; y < H; y += P * 3.5) { g.fillStyle = 'rgba(80,55,20,.18)'; g.fillRect(0, y, W, P * .03); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, y + P * .03, W, P * .02); }
  } else if (th === 'cloud') { // ciel et nuages
    gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, shade(m.base, .35)); gr.addColorStop(1, shade(m.base, -.25)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) { const cx = R() * W, cy = R() * H, sc = P * (.6 + R() * 1.4); for (let k = 0; k < 6; k++) blob(cx + (k - 2.5) * sc * .55, cy + Math.sin(k * 1.7) * sc * .25, sc * (.55 + R() * .35), 'rgba(255,255,255,' + (.18 + R() * .14).toFixed(2) + ')'); }
  } else {
    fillAll(shade(m.base, .12), shade(m.base, -.38));
  }
}
// pistes / tuyaux / fibres / câbles / néons : chacun enregistré pour les impulsions animées
function paintLines(g, W, H, P, R, m, th, rec, mult, via) {
  const cfg = { pcb: [24, 7, .13], forge: [10, 2, .24], data: [22, 4, .1], rack: [12, 5, .11], ice: [11, 2, .22], neon: [16, 3, .13], retro: [9, 1, .2], cloud: [18, 2, .12] }[th] || [24, 7, .13];
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
      } else if (th === 'retro') { // câbles en nappe gris à liserés
        const w = P * .34;
        path(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = w + P * .05; g.stroke();
        path(); g.strokeStyle = '#a9a9a9'; g.lineWidth = w; g.stroke();
        for (let q = -2; q <= 2; q++) { const o2 = offPts(op, q * w * .18); g.beginPath(); o2.forEach(([px2, py2], j) => j ? g.lineTo(px2, py2) : g.moveTo(px2, py2)); g.strokeStyle = q === -2 ? '#c62828' : 'rgba(80,80,80,.55)'; g.lineWidth = P * .018; g.stroke(); }
        for (const [px2, py2] of [e0, e1]) { g.fillStyle = '#3e3e3e'; g.fillRect(px2 - w * .6, py2 - w * .6, w * 1.2, w * 1.2); g.fillStyle = '#9e9e9e'; g.fillRect(px2 - w * .4, py2 - w * .15, w * .8, w * .3); }
      } else if (th === 'cloud') { // liaisons de données lumineuses
        path(); g.shadowColor = '#ffffff'; g.shadowBlur = P * .25; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = P * .035; g.stroke();
        g.shadowColor = 'transparent'; g.shadowBlur = 0;
        g.setLineDash([P * .08, P * .12]); path(); g.strokeStyle = col2 === '#ffffff' ? '#40c4ff' : col2; g.lineWidth = P * .02; g.stroke(); g.setLineDash([]);
        for (const [px2, py2] of [e0, e1]) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px2, py2, P * .07, 0, TAU); g.fill(); }
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
const FLOOR = { retro: ['#2a2016', '#0f0b07'], cloud: ['#1a2a44', '#0a1222'], pcb: ['#1c1814', '#0c0a08'], forge: ['#24100a', '#080302'], data: ['#071226', '#01050c'], rack: ['#202226', '#0d0e10'], ice: ['#163a58', '#061626'], neon: ['#0a0316', '#010006'] };
const RIM = { retro: ['#ff9100', 'rgba(255,240,200,.6)'], cloud: ['#ffffff', 'rgba(200,235,255,.8)'], pcb: ['#d8b25a', 'rgba(255,248,210,.55)'], forge: ['#5d4037', 'rgba(255,170,90,.7)'], data: ['#4f83cc', 'rgba(200,240,255,.6)'], rack: ['#ffc400', null], ice: ['#e1f5fe', 'rgba(255,255,255,.8)'], neon: [null, 'rgba(255,255,255,.85)'] };

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
  const silk = th === 'retro' ? 'rgba(70,45,15,.8)' : th === 'cloud' ? 'rgba(20,40,80,.7)' : th === 'rack' ? 'rgba(20,24,28,.75)' : th === 'neon' ? rgbaA(m.acc).replace('A', .85) : th === 'data' ? 'rgba(160,220,255,.75)' : th === 'ice' ? 'rgba(10,40,70,.7)' : 'rgba(238,238,225,.78)';
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
  } else if (th === 'retro') {
    for (let i = 0; i < 5; i++) { // disquettes
      const s2 = P * (.8 + R() * .3), pos = place(s2, s2); if (!pos) continue;
      const [x, y] = pos, col = ['#1565c0', '#212121', '#c62828', '#2e7d32', '#6a1b9a'][i % 5]; shadowOn(.2, .08);
      g.fillStyle = col; rr(g, x, y, s2, s2, P * .04); g.fill(); shadowOff();
      metal(x + s2 * .25, y, s2 * .5, s2 * .32, true); g.fillStyle = '#333'; g.fillRect(x + s2 * .55, y + s2 * .05, s2 * .1, s2 * .22);
      g.fillStyle = '#f5f0e1'; g.fillRect(x + s2 * .12, y + s2 * .48, s2 * .76, s2 * .45);
      g.fillStyle = '#555'; g.font = 'bold ' + (P * .1) + 'px monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(['DOS 3.1', 'JEUX', 'SAVE', 'BASIC', 'BOOT'][i % 5], x + s2 * .18, y + s2 * .66);
    }
    for (let i = 0; i < 14; i++) { // touches de clavier
      const s2 = P * .42, pos = place(s2, s2, 15); if (!pos) continue;
      const [x, y] = pos; shadowOn(.1, .06);
      gr = g.createLinearGradient(0, y, 0, y + s2); gr.addColorStop(0, '#f3ead6'); gr.addColorStop(1, '#bfae8c'); g.fillStyle = gr; rr(g, x, y, s2, s2, P * .06); g.fill(); shadowOff();
      g.fillStyle = 'rgba(255,255,255,.6)'; rr(g, x + s2 * .12, y + s2 * .1, s2 * .76, s2 * .62, P * .04); g.fill();
      g.fillStyle = '#5d4a2e'; g.font = 'bold ' + (P * .2) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('QWERTYASDF?!'.charAt(i % 12), x + s2 / 2, y + s2 * .42);
    }
    for (let i = 0; i < 3; i++) { // cartouches
      const w = P * 1.1, h = P * .7, pos = place(w, h); if (!pos) continue;
      const [x, y] = pos; shadowOn(.2, .08); g.fillStyle = '#5d5d5d'; rr(g, x, y, w, h, P * .06); g.fill(); shadowOff();
      g.fillStyle = ['#ffab00', '#e53935', '#43a047'][i]; g.fillRect(x + w * .1, y + h * .15, w * .8, h * .5);
      g.fillStyle = '#fff'; g.font = 'bold ' + (P * .13) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(['8-BIT', 'RAM 64K', 'ROM'][i], x + w / 2, y + h * .4);
      g.fillStyle = '#c9a227'; for (let k = 0; k < 6; k++) g.fillRect(x + w * .12 + k * w * .13, y + h * .78, w * .07, h * .2);
    }
    for (let i = 0; i < 3; i++) chip(i);
    smd(20, ['#3e2723', '#8d6e63']);
    if (rec) for (let i = 0; i < 8; i++) { const pos = place(P * .2, P * .14, 30); if (pos) led(pos[0] + P * .1, pos[1] + P * .07, i); }
    { const pos = place(P * 2.6, P * .3, 80); if (pos) label('VD-8BIT  1987', pos[0], pos[1] + P * .25, .2); }
  } else if (th === 'cloud') {
    for (let i = 0; i < 5; i++) { // serveurs flottants
      const w = P * (1.3 + R() * .7), h = P * .65, pos = place(w, h); if (!pos) continue;
      const [x, y] = pos; shadowOn(.35, .25);
      gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#b0c4de'); g.fillStyle = gr; rr(g, x, y, w, h, h / 2.2); g.fill(); shadowOff();
      g.fillStyle = 'rgba(30,60,100,.25)'; for (let k = 0; k < 3; k++) g.fillRect(x + w * .15, y + h * (.28 + k * .18), w * .45, h * .07);
      if (rec) { led(x + w * .75, y + h * .35, i); led(x + w * .85, y + h * .65, i + 1); }
    }
    for (let i = 0; i < 6; i++) { // symboles wifi
      const r = P * (.3 + R() * .2), pos = place(r * 2, r * 1.6, 20); if (!pos) continue;
      const cx = pos[0] + r, cy = pos[1] + r * 1.4; g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = P * .045; g.lineCap = 'round';
      for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy, r * k / 3, -Math.PI * .75, -Math.PI * .25); g.stroke(); }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, P * .05, 0, TAU); g.fill();
    }
    for (let i = 0; i < 3; i++) { // paraboles
      const r = P * .45, pos = place(r * 2, r * 2); if (!pos) continue;
      const cx = pos[0] + r, cy = pos[1] + r; shadowOn(.2, .1);
      g.fillStyle = '#eceff1'; g.beginPath(); g.ellipse(cx, cy, r, r * .55, -.5, 0, TAU); g.fill(); shadowOff();
      g.strokeStyle = '#90a4ae'; g.lineWidth = P * .03; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + r * .6, cy - r * .7); g.stroke();
      g.fillStyle = '#ff5252'; g.beginPath(); g.arc(cx + r * .6, cy - r * .7, P * .05, 0, TAU); g.fill();
    }
    for (let i = 0; i < 4; i++) chip(i, 'data');
    if (rec) for (let i = 0; i < 6; i++) { const pos = place(P * .2, P * .14, 30); if (pos) led(pos[0] + P * .1, pos[1] + P * .07, i); }
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
    } else if (o.kind === 'crt') { // écran cathodique
      gr = g.createLinearGradient(x, y, x, y + w); gr.addColorStop(0, '#e8dcc0'); gr.addColorStop(1, '#a8977a');
      g.fillStyle = gr; rr(g, x + P * .06, y + P * .06, w - P * .12, w - P * .12, P * .2); g.fill(); shadowOff();
      g.fillStyle = '#111'; rr(g, x + P * .25, y + P * .22, w - P * .5, w - P * .7, P * .18); g.fill();
      g.fillStyle = '#5d4a2e'; g.fillRect(x + P * .4, y + w - P * .38, P * .3, P * .08); g.fillStyle = '#ff3d00'; g.beginPath(); g.arc(x + w - P * .45, y + w - P * .34, P * .05, 0, TAU); g.fill();
    } else if (o.kind === 'floppy') { // lecteur de disquette géant
      g.fillStyle = '#ddd2b8'; rr(g, x + P * .08, y + P * .3, w - P * .16, w - P * .6, P * .1); g.fill(); shadowOff();
      g.fillStyle = '#111'; g.fillRect(x + P * .3, y + P * .8, w - P * .6, P * .12); g.fillStyle = '#76ff03'; g.fillRect(x + w - P * .5, y + P * .5, P * .12, P * .08);
      label('DRIVE A:', x + P * .3, y + P * .62, .14);
    } else if (o.kind === 'antenna') { // antenne relais
      shadowOff(); g.strokeStyle = '#cfd8dc'; g.lineWidth = P * .06;
      g.beginPath(); g.moveTo(x + P * .5, y + w - P * .15); g.lineTo(x + P, y + P * .2); g.lineTo(x + w - P * .5, y + w - P * .15); g.moveTo(x + P * .7, y + P * 1.2); g.lineTo(x + P * 1.3, y + P * 1.2); g.moveTo(x + P * .6, y + P * 1.5); g.lineTo(x + P * 1.4, y + P * 1.5); g.stroke();
      g.fillStyle = '#ff5252'; g.beginPath(); g.arc(x + P, y + P * .2, P * .1, 0, TAU); g.fill();
    } else if (o.kind === 'cumulus') { // gros nuage (animé à part)
      shadowOff(); g.fillStyle = 'rgba(255,255,255,.15)'; rr(g, x + P * .1, y + P * .1, w - P * .2, w - P * .2, P * .5); g.fill();
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
  } else if (th === 'retro') { // damier de pixels
    for (let y = 0; y < H; y += P * .25) for (let x = 0; x < W; x += P * .25) if (((x + y) / (P * .25)) % 2 === 0 && R() < .5) { g.fillStyle = 'rgba(255,160,60,.04)'; g.fillRect(x, y, P * .25, P * .25); }
  } else if (th === 'cloud') { // brume d'orage
    for (let i = 0; i < 30; i++) { const x = R() * W, y = R() * H, r2 = P * (.4 + R()); gr = g.createRadialGradient(x, y, 0, x, y, r2); gr.addColorStop(0, 'rgba(200,220,255,.08)'); gr.addColorStop(1, 'rgba(200,220,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r2, 0, TAU); g.fill(); }
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
  if (P >= 32) addNoise(g, W, H, R, th === 'neon' || th === 'data' || th === 'cloud' ? 5 : 10);
  return c;
}
