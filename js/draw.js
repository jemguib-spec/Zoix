'use strict';
/* Virus Défense — dessin des tourelles, des virus et de la carte */
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
// apparences des tourelles (achetées en puces dans la boutique)
const SKINS = {
  classic: { name: 'Classique', cost: 0, tile: ['#ffffff', '#e6eaf2', '#a3adc0'] },
  carbon: { name: 'Carbone', cost: 150, tile: ['#6b7178', '#33383e', '#15181b'], stripes: 'rgba(255,255,255,.06)' },
  ice: { name: 'Glace', cost: 200, tile: ['#ffffff', '#b3e5fc', '#4fa3d1'] },
  gold: { name: 'Or massif', cost: 300, tile: ['#fff8d0', '#ffd54f', '#b8860b'] },
  hazard: { name: 'Danger', cost: 250, tile: ['#ffe082', '#ffc400', '#c79100'], stripes: 'rgba(0,0,0,.35)' },
  neon: { name: 'Néon', cost: 400, tile: ['#2a1046', '#170828', '#06020c'], glow: true }
};
function towerBase(type, lvl) {
  const px = Math.max(16, Math.round(L.s * DPR / 4) * 4), key = type + lvl + ':' + px + ':' + (save.skin || '') + ':' + curTS().join();
  let c = baseCache[key];
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(px * 1.2); const g = c.getContext('2d'); g.setTransform(px, 0, 0, px, px * .55, px * .55); drawAnyBase(g, type, lvl); baseCache[key] = c; }
  return c;
}
// le socle et la tourelle prennent le style du monde en cours (voir WTSTYLE)
function drawAnyBase(c, type, lvl) {
  const [st, v] = curTS(); RP = RPAL[v] || RPAL.wood;
  if (st === 'retro') drawRetroBase(c, type, lvl); else if (st === 'neo') drawNeoBase(c, type, lvl);
  else if (st === 'ice') drawIceBase(c, type, lvl); else if (st === 'mil') drawMilBase(c, type, lvl);
  else if (st === 'glass') drawGlassBase(c, type, lvl); else if (st === 'sky') drawSkyBase(c, type, lvl); else drawTowerBase(c, type, lvl);
}
function drawTower(c, type, lvl, ang, time, flash, cached) {
  GD = c === ctx ? null : c;
  try {
    if (cached) c.drawImage(towerBase(type, lvl), -.55, -.55, 1.2, 1.2); else drawAnyBase(c, type, lvl);
    const st = curStyle(); RP = RPAL[curTS()[1]] || RPAL.wood;
    if (st === 'retro') drawRetroTurret(c, type, lvl, ang, time, flash);
    else if (st === 'neo') { // la tourelle flotte au-dessus de son socle, cerclée de néon
      NEO = TOWERS[type].col;
      c.save(); c.translate(0, Math.sin(time * 2.5 + type.length) * .02);
      c.globalCompositeOperation = 'lighter'; glowDot(0, 0, .42, rgbaA(NEO).replace('A', '.28')); c.globalCompositeOperation = 'source-over';
      drawTurret(c, type, lvl, ang, time, flash); c.restore();
    } else if (st === 'ice' || st === 'mil' || st === 'glass' || st === 'sky') { // mêmes formes, matières différentes
      MAT = st;
      if (st === 'sky') c.translate(0, Math.sin(time * 2 + type.length) * .025); // flotte sur son nuage
      drawTurret(c, type, lvl, ang, time, flash);
      if (st === 'ice') { // petites étincelles de givre
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) { const q = time * .9 + i * 2.1 + type.length, k = (Math.sin(time * 3 + i * 1.7) + 1) / 2; glowDot(Math.cos(q) * .3, Math.sin(q) * .3, .05 + k * .04, 'rgba(220,250,255,.8)'); }
        c.globalCompositeOperation = 'source-over';
      }
    } else drawTurret(c, type, lvl, ang, time, flash);
  } finally { GD = null; NEO = null; MAT = null; }
}
let NEO = null, GD = null, MAT = null; // NEO : couleur néon en cours ; GD : contexte cible des lueurs
// ---- style « jouet brillant » : contours épais, couleurs vives, reflets ----
const OUT = '#1b1230';
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  c.closePath(); c.fillStyle = '#ffd600'; c.fill(); c.lineWidth = r * .25; c.strokeStyle = OUT; c.stroke();
}
// boule brillante avec contour et reflet
function gball(c, x, y, r, col, lx, ly) {
  if (MAT === 'glass') { // sphère de verre avec cœur lumineux
    c.globalCompositeOperation = 'lighter'; glowDot(x, y, r * 1.1, rgbaA(col).replace('A', '.6')); c.globalCompositeOperation = 'source-over';
    const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .05, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.3, 'rgba(180,230,255,.35)'); g.addColorStop(1, 'rgba(20,60,110,.55)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.lineWidth = r * .1; c.strokeStyle = 'rgba(200,240,255,.9)'; c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * .3, 0, TAU); c.fill();
    return;
  }
  if (MAT === 'sky') { // porcelaine blanche cerclée d'or
    const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .05, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.6, '#eef3fb'); g.addColorStop(1, '#a9b8d4');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.lineWidth = r * .16; c.strokeStyle = '#c99a2e'; c.stroke();
    c.lineWidth = r * .05; c.strokeStyle = '#fff1b8'; c.beginPath(); c.arc(x, y, r * .92, 0, TAU); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * .32, 0, TAU); c.fill(); c.lineWidth = r * .08; c.strokeStyle = '#c99a2e'; c.stroke();
    return;
  }
  if (MAT === 'ice') { // boule de glace translucide à facettes
    const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .05, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.35, 'rgba(200,240,255,.95)'); g.addColorStop(.75, shade(col, .2)); g.addColorStop(1, '#1f5f8b');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.lineWidth = r * .14; c.strokeStyle = '#0d3c61'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = r * .06; c.beginPath();
    for (let i = 0; i < 3; i++) { const q = i * TAU / 3 + .4; c.moveTo(x, y); c.lineTo(x + Math.cos(q) * r * .8, y + Math.sin(q) * r * .8); } c.stroke();
    return;
  }
  if (MAT === 'mil') { // tourelle blindée kaki
    const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .1, x, y, r);
    g.addColorStop(0, '#a5ad7a'); g.addColorStop(.55, '#5b6538'); g.addColorStop(1, '#262b14');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.lineWidth = r * .16; c.strokeStyle = '#141708'; c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * .28, 0, TAU); c.fill(); c.lineWidth = r * .06; c.stroke();
    for (let i = 0; i < 6; i++) { const q = i * TAU / 6; c.fillStyle = '#1d2110'; c.beginPath(); c.arc(x + Math.cos(q) * r * .7, y + Math.sin(q) * r * .7, r * .07, 0, TAU); c.fill(); }
    return;
  }
  if (NEO) { // sphère sombre cerclée de néon
    const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .1, x, y, r);
    g.addColorStop(0, '#3a4566'); g.addColorStop(.6, '#141a2c'); g.addColorStop(1, '#05070d');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.lineWidth = r * .14; c.strokeStyle = col; c.stroke();
    c.globalCompositeOperation = 'lighter'; glowDot(x, y, r * .55, rgbaA(col).replace('A', '.55')); c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x + lx * r * .45, y + ly * r * .45, r * .14, 0, TAU); c.fill();
    return;
  }
  const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .1, x, y, r);
  g.addColorStop(0, shade(col, .55)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, -.45));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.lineWidth = r * .16; c.strokeStyle = OUT; c.stroke();
  c.save(); c.translate(x + lx * r * .42, y + ly * r * .42); c.rotate(Math.atan2(ly, lx) + Math.PI / 2);
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(0, 0, r * .42, r * .2, 0, 0, TAU); c.fill(); c.restore();
}
// canon arrondi brillant (axe x)
function gbar(c, x, y, w, h, col) {
  if (MAT === 'glass') { // fibre optique : tube transparent parcouru d'une impulsion lumineuse
    c.fillStyle = 'rgba(150,220,255,.25)'; rr(c, x, y, w, h, Math.min(h, w) * .45); c.fill(); c.lineWidth = .018; c.strokeStyle = 'rgba(200,240,255,.9)'; c.stroke();
    const u = (performance.now() / 600) % 1; c.globalCompositeOperation = 'lighter';
    c.fillStyle = '#40c4ff'; c.fillRect(x + w * .08, y + h * .4, w * .84, h * .2); glowDot(x + w * u, y + h / 2, h * .9, 'rgba(120,230,255,.9)');
    c.globalCompositeOperation = 'source-over';
    return;
  }
  if (MAT === 'sky') { // tube de porcelaine à bagues dorées
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#e3eaf6'); g.addColorStop(1, '#9fb0cf');
    c.fillStyle = g; rr(c, x, y, w, h, Math.min(h, w) * .45); c.fill(); c.lineWidth = .02; c.strokeStyle = '#8a6a1c'; c.stroke();
    c.fillStyle = '#d4a63a'; for (const k of [.15, .85]) c.fillRect(x + w * k - w * .04, y, w * .08, h);
    return;
  }
  if (MAT === 'ice') { // tube de glace avec reflet
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.4, '#b3e5fc'); g.addColorStop(1, '#3d8fc4');
    c.fillStyle = g; rr(c, x, y, w, h, Math.min(h, w) * .4); c.fill(); c.lineWidth = .03; c.strokeStyle = '#0d3c61'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.85)'; rr(c, x + w * .1, y + h * .14, w * .8, h * .16, h * .08); c.fill();
    return;
  }
  if (MAT === 'mil') { // canon en acier mat
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#8a8f7a'); g.addColorStop(.45, '#454a38'); g.addColorStop(1, '#1b1d14');
    c.fillStyle = g; rr(c, x, y, w, h, Math.min(h, w) * .2); c.fill(); c.lineWidth = .03; c.strokeStyle = '#141708'; c.stroke();
    c.fillStyle = 'rgba(0,0,0,.35)'; for (let k = .25; k < .9; k += .3) c.fillRect(x + w * k, y, w * .05, h);
    return;
  }
  if (NEO) { // tube en métal noir avec une ligne lumineuse
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#46506e'); g.addColorStop(.45, '#1c2236'); g.addColorStop(1, '#070910');
    c.fillStyle = g; rr(c, x, y, w, h, Math.min(h, w) * .45); c.fill();
    c.lineWidth = .02; c.strokeStyle = NEO; c.stroke();
    c.fillStyle = NEO; c.globalAlpha = .9; rr(c, x + w * .12, y + h * .42, w * .76, Math.max(.012, h * .16), h * .08); c.fill(); c.globalAlpha = 1;
    return;
  }
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
  // apparence achetée en priorité, sinon la tuile du monde (carbone, glace…)
  const SK = save.skin && save.skin !== 'classic' && SKINS[save.skin] ? SKINS[save.skin] : SKINS[curTS()[1]] || SKINS.classic;
  g.addColorStop(0, SK.tile[0]); g.addColorStop(.5, SK.tile[1]); g.addColorStop(1, SK.tile[2]);
  c.fillStyle = g; rr(c, -.46, -.46, .92, .92, .22); c.fill();
  if (SK.glow) { c.save(); c.shadowColor = d.col; c.shadowBlur = .25; c.strokeStyle = d.col; c.lineWidth = .05; rr(c, -.42, -.42, .84, .84, .2); c.stroke(); c.restore(); }
  if (SK.stripes) { c.save(); rr(c, -.46, -.46, .92, .92, .22); c.clip(); c.strokeStyle = SK.stripes; c.lineWidth = .06; for (let k = -1; k <= 1; k += .25) { c.beginPath(); c.moveTo(k - .5, -.5); c.lineTo(k + .5, .5); c.stroke(); } c.restore(); }
  rr(c, -.46, -.46, .92, .92, .22); c.lineWidth = .055; c.strokeStyle = lvl >= TMAX ? '#7a5200' : OUT; c.stroke();
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
  const a = (type === 'tesla' || type === 'boost' || type === 'miner' || type === 'vortex') ? 0 : ang, [lx, ly] = lightFor(a);
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
    case 'mine': { // lanceur de mines : tambour avec mines prêtes
      fins();
      gbar(c, .02, -.09, .3, .18, '#4e5a3a');
      for (let k = 0; k < 3; k++) { const q = time * .8 + k * TAU / 3, mx2 = Math.cos(q) * .14, my2 = Math.sin(q) * .14; c.fillStyle = '#33402a'; c.beginPath(); c.arc(mx2, my2, .08, 0, TAU); c.fill(); c.lineWidth = .025; c.strokeStyle = OUT; c.stroke(); c.fillStyle = Math.sin(time * 6 + k) > 0 ? '#ff1744' : '#5d0000'; c.beginPath(); c.arc(mx2, my2, .025, 0, TAU); c.fill(); }
      gball(c, 0, 0, .1 + (lvl >= 3 ? .02 : 0), col, lx, ly);
      muzzle = .34; break;
    }
    case 'vortex': { // spirale gravitationnelle
      c.save(); c.rotate(-time * 3);
      for (let k = 0; k < 3; k++) { c.rotate(TAU / 3); c.strokeStyle = k % 2 ? '#b388ff' : '#7c4dff'; c.lineWidth = .06; c.lineCap = 'round'; c.beginPath(); for (let j = 0; j <= 12; j++) { const u = j / 12, rr2 = .06 + u * (.26 + (lvl >= 3 ? .04 : 0)), aa = u * 3.2; j ? c.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2) : c.moveTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); } c.stroke(); }
      c.restore();
      const g = c.createRadialGradient(0, 0, 0, 0, 0, .13); g.addColorStop(0, '#000'); g.addColorStop(.7, '#1a0040'); g.addColorStop(1, '#7c4dff');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, .12, 0, TAU); c.fill(); c.lineWidth = .03; c.strokeStyle = OUT; c.stroke();
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

// ---- animation de pose, différente selon le style du monde ----
// pre = true : avant le dessin (déplacement, échelle) ; false : effets par-dessus
function placeAnim(t, age, pre) {
  const st0 = WTSTYLE[G.th] ? WTSTYLE[G.th][0] : 'modern', st = st0 === 'glass' ? 'neo' : st0 === 'sky' ? 'ice' : st0, ease = k => 1 - Math.pow(1 - k, 3);
  if (st === 'retro') { // la tourelle tombe et soulève de la poussière ; des planches volent
    const k = Math.min(1, age / .35);
    if (pre) { ctx.translate(0, -(1 - k * k) * 1.1); ctx.globalAlpha = Math.min(1, age * 6); return; }
    const a = age - .35; if (a < 0) return;
    const q = a / .85; ctx.fillStyle = 'rgba(170,140,100,' + (.55 * (1 - q)).toFixed(2) + ')';
    for (let i = 0; i < 7; i++) { const ang = i * TAU / 7, d = .35 + q * .45; ctx.beginPath(); ctx.arc(Math.cos(ang) * d, Math.sin(ang) * d * .7 + .15, .1 + q * .12, 0, TAU); ctx.fill(); }
    for (let i = 0; i < 3; i++) { const ang = i * 2.2 + 1, d = q * .7; ctx.save(); ctx.translate(Math.cos(ang) * d, Math.sin(ang) * d - Math.sin(q * Math.PI) * .3); ctx.rotate(q * 8 + i); ctx.globalAlpha = 1 - q; wood(ctx, -.07, -.02, .14, .04); ctx.restore(); }
    ctx.globalAlpha = 1;
  } else if (st === 'neo') { // hologramme qui se matérialise de bas en haut
    const k = Math.min(1, age / .7);
    if (pre) { ctx.globalAlpha = k < 1 ? (.35 + .65 * k) * (Math.sin(age * 60) > -.3 ? 1 : .4) : 1; ctx.beginPath(); ctx.rect(-.6, .6 - 1.2 * ease(k), 1.2, 1.2 * ease(k) + .01); if (k < 1) ctx.clip(); return; }
    if (k >= 1) { const q = (age - .7) / .5; ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(0,229,255,' + (.6 * (1 - q)).toFixed(2) + ')'; ctx.lineWidth = .04; ctx.beginPath(); ctx.arc(0, 0, .5 + q * .4, 0, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; return; }
    const y = .6 - 1.2 * ease(k); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(0,229,255,.55)'; ctx.fillRect(-.55, y - .02, 1.1, .04); glowDot(0, y, .4, 'rgba(0,229,255,.35)');
    ctx.strokeStyle = 'rgba(0,229,255,.25)'; ctx.lineWidth = .01; ctx.beginPath(); for (let yy = y; yy < .5; yy += .08) { ctx.moveTo(-.46, yy); ctx.lineTo(.46, yy); } ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  } else if (st === 'ice') { // la glace se forme : cristaux qui poussent puis éclat de givre
    const k = Math.min(1, age / .5);
    if (pre) { const sc = ease(k) * (1 + Math.sin(k * Math.PI) * .12); ctx.scale(sc, sc); return; }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) { const ang = i * TAU / 8 + .2, d = .25 + ease(Math.min(1, age / .9)) * .45; ctx.globalAlpha = Math.max(0, 1 - age / 1.1); glowDot(Math.cos(ang) * d, Math.sin(ang) * d, .08, 'rgba(220,250,255,.9)'); }
    ctx.strokeStyle = 'rgba(200,240,255,' + Math.max(0, .7 - age * .6).toFixed(2) + ')'; ctx.lineWidth = .03; ctx.beginPath(); ctx.arc(0, 0, .3 + age * .5, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  } else if (st === 'mil') { // largage en parachute
    const k = Math.min(1, age / .75);
    if (pre) { ctx.translate(Math.sin(age * 9) * .05 * (1 - k), -(1 - ease(k)) * 1.4); return; }
    if (k < 1) {
      ctx.save(); // déjà décalé par l'appel « pre »
      ctx.strokeStyle = 'rgba(30,30,20,.7)'; ctx.lineWidth = .012; ctx.beginPath(); ctx.moveTo(-.25, -.15); ctx.lineTo(-.4, -.75); ctx.moveTo(.25, -.15); ctx.lineTo(.4, -.75); ctx.moveTo(0, -.2); ctx.lineTo(0, -.8); ctx.stroke();
      const g = ctx.createLinearGradient(0, -1.05, 0, -.72); g.addColorStop(0, '#9aa86a'); g.addColorStop(1, '#4e5a2a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -.75, .48, .3, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1b1d14'; ctx.lineWidth = .025; ctx.stroke();
      ctx.restore();
    } else { const q = (age - .75) / .45; ctx.fillStyle = 'rgba(120,120,100,' + (.5 * (1 - q)).toFixed(2) + ')'; for (let i = 0; i < 6; i++) { const ang = i * TAU / 6; ctx.beginPath(); ctx.arc(Math.cos(ang) * (.35 + q * .3), Math.sin(ang) * (.3 + q * .25) + .2, .08 + q * .08, 0, TAU); ctx.fill(); } }
  } else if (pre && age < .45) { // style d'origine : petit rebond
    const k = age / .45, sc = 1 + Math.sin(k * Math.PI) * .25 * (1 - k) + (1 - k) * .6 * (1 - k); ctx.globalAlpha = Math.min(1, k * 3); ctx.scale(sc, sc);
  }
}

// ---- déguisements des virus selon le monde (repère du virus : il regarde vers +x) ----
function wearHat(e, r, lw, t) {
  const th = G.th, back = (rad, a0, a1) => { ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.closePath(); };
  if (th === 'retro') { // casque de chevalier et plumet
    ctx.strokeStyle = '#c62828'; ctx.lineWidth = r * .22;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-r * .7, k * r * .08); ctx.quadraticCurveTo(-r * 1.25, k * r * .25 + Math.sin(t * 9 + k) * r * .15, -r * 1.6, k * r * .3 + Math.sin(t * 9 + k + 1) * r * .2); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#eceff1'); g.addColorStop(.45, '#9ea7ad'); g.addColorStop(1, '#4b5358');
    back(r * 1.06, 1.85, 4.43); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.lineWidth = lw * .9; ctx.beginPath(); ctx.moveTo(-r * 1.04, 0); ctx.lineTo(-r * .27, 0); ctx.stroke();
    ctx.fillStyle = '#37474f'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(-r * .5, s * r * .55, r * .08, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * .5, -r * .45, r * .25, r * .1, -.5, 0, TAU); ctx.fill();
  } else if (th === 'forge') { // casque de chantier avec lampe
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#fff59d'); g.addColorStop(.5, '#fbc02d'); g.addColorStop(1, '#a66f00');
    back(r * 1.02, 1.85, 4.43); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.lineWidth = lw * .7; ctx.beginPath(); ctx.moveTo(-r * .95, 0); ctx.lineTo(-r * .27, 0); ctx.stroke();
    ctx.fillStyle = '#fffde7'; ctx.beginPath(); ctx.arc(-r * .3, 0, r * .14, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(-r * .2, 0, r * .5, 'rgba(255,240,150,.35)'); ctx.restore();
  } else if (th === 'ice') { // bonnet à pompon
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ef5350'); g.addColorStop(1, '#8e0000');
    back(r * 1.04, 1.85, 4.43); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-r * .42, -r * .9, r * .2, r * 1.8); ctx.strokeRect(-r * .42, -r * .9, r * .2, r * 1.8);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = r * .1; for (const k of [-.65, -.85]) { ctx.beginPath(); ctx.moveTo(k * r, -r * .85); ctx.lineTo(k * r, r * .85); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-r * 1.08, Math.sin(t * 6) * r * .08, r * .26, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .8; ctx.strokeStyle = OUT; ctx.stroke();
  } else if (th === 'rack') { // casque audio d'opérateur réseau
    ctx.strokeStyle = OUT; ctx.lineWidth = r * .26; ctx.beginPath(); ctx.arc(-r * .15, 0, r * .95, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = '#455a64'; ctx.lineWidth = r * .14; ctx.stroke();
    for (const s of [-1, 1]) { ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.ellipse(-r * .15, s * r * .95, r * .3, r * .2, 0, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .8; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = '#76ff03'; ctx.beginPath(); ctx.arc(-r * .15, s * r * .95, r * .07, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#263238'; ctx.lineWidth = r * .08; ctx.beginPath(); ctx.moveTo(-r * .15, r * .95); ctx.quadraticCurveTo(r * .5, r * 1.05, r * .75, r * .45); ctx.stroke();
  } else if (th === 'neon') { // antennes lumineuses de pirate du cyberespace
    for (const s of [-1, 1]) {
      const x2 = -r * 1.35, y2 = s * r * (.7 + Math.sin(t * 7 + s) * .12);
      ctx.strokeStyle = OUT; ctx.lineWidth = r * .12; ctx.beginPath(); ctx.moveTo(-r * .5, s * r * .4); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(x2, y2, r * .5, s > 0 ? 'rgba(255,43,214,.8)' : 'rgba(0,229,255,.8)'); ctx.restore();
    }
  } else if (th === 'cloud') { // petites ailes d'ange
    for (const s of [-1, 1]) {
      const f = Math.sin(t * 14) * .25;
      ctx.save(); ctx.translate(-r * .2, s * r * .75); ctx.rotate(s * (.4 + f));
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-r * .2, s * r * .35, r * .55, r * .3, 0, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .7; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.strokeStyle = 'rgba(100,140,200,.6)'; ctx.lineWidth = lw * .4; ctx.beginPath(); ctx.moveTo(-r * .5, s * r * .35); ctx.lineTo(r * .1, s * r * .35); ctx.stroke();
      ctx.restore();
    }
  }
}

// ---- virus en style cartoon brillant (contours épais, gros yeux, reflets) ----
// ======== style « Vieux PC » : bois, pierre et fer (catapultes, arbalètes…) ========
const RO = '#2a1a0e';
// palettes : « wood » = vieux PC (bois et pierre), « forge » = Fournaise (fer noirci et braises)
const RPAL = {
  wood: { l: '#a86e34', d: '#6d4524', plank: ['#b77a3e', '#5a3618'], stone: ['#cfc8b8', '#a09886', '#666052'], seam: 'rgba(45,35,25,.6)', ring: '#3d4044' },
  forge: { l: '#7a6a62', d: '#463a36', plank: ['#5e4c44', '#22191a'], stone: ['#5b4a44', '#3a2c28', '#1e1513'], seam: 'rgba(255,120,30,.85)', ring: '#1d1a19' }
};
let RP = RPAL.wood;
const NPAL = { data: ['#22385a', '#101d33', '#050b16'], neon: ['#3a1f50', '#1c0e2b', '#0a0412'], cloud: ['#4f6f96', '#28425f', '#0f1d30'] };
function wood(c, x, y, w, h, dark) {
  const b = dark ? RP.d : RP.l, g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(b, .35)); g.addColorStop(.5, b); g.addColorStop(1, shade(b, -.45));
  c.fillStyle = g; rr(c, x, y, w, h, Math.min(w, h) * .3); c.fill();
  c.lineWidth = .022; c.strokeStyle = RO; c.stroke();
  c.strokeStyle = 'rgba(60,30,10,.5)'; c.lineWidth = .009; c.beginPath();
  if (w >= h) { c.moveTo(x + w * .08, y + h * .38); c.lineTo(x + w * .9, y + h * .38); c.moveTo(x + w * .2, y + h * .68); c.lineTo(x + w * .7, y + h * .68); }
  else { c.moveTo(x + w * .38, y + h * .08); c.lineTo(x + w * .38, y + h * .9); }
  c.stroke();
}
function iron(c, x, y, w, h) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#9ea3a8'); g.addColorStop(.5, '#585d63'); g.addColorStop(1, '#2b2e32');
  c.fillStyle = g; c.fillRect(x, y, w, h); c.lineWidth = .012; c.strokeStyle = RO; c.strokeRect(x, y, w, h);
}
function rock(c, x, y, r, lx, ly, seed) {
  c.beginPath();
  for (let i = 0; i < 9; i++) { const q = i * TAU / 9, k = .8 + ((Math.sin((seed || 1) * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1 * .3; c.lineTo(x + Math.cos(q) * r * k, y + Math.sin(q) * r * k); }
  c.closePath();
  const g = c.createRadialGradient(x + lx * r * .4, y + ly * r * .4, r * .1, x, y, r * 1.1); g.addColorStop(0, '#c8bfae'); g.addColorStop(.55, '#80766a'); g.addColorStop(1, '#3d3731');
  c.fillStyle = g; c.fill(); c.lineWidth = r * .14; c.strokeStyle = RO; c.stroke();
}
function drawRetroBase(c, type, lvl) {
  const d = TOWERS[type];
  c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, -.41, -.37, .92, .92, .1); c.fill();
  let g = c.createLinearGradient(0, -.46, 0, .46);
  g.addColorStop(0, RP.stone[0]); g.addColorStop(.5, RP.stone[1]); g.addColorStop(1, RP.stone[2]);
  c.fillStyle = g; rr(c, -.46, -.46, .92, .92, .1); c.fill();
  // pavés de pierre
  c.save(); rr(c, -.46, -.46, .92, .92, .1); c.clip();
  for (let r = 0; r < 4; r++) for (let k = -1; k < 4; k++) {
    const x = -.46 + k * .31 + (r % 2) * .155, y = -.46 + r * .23, sh = ((r * 7 + k * 13) % 5) / 5;
    c.fillStyle = 'rgba(' + (sh > .5 ? '255,255,255,.07' : '0,0,0,.08') + ')'; c.fillRect(x + .01, y + .01, .29, .21);
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x + .02, y + .015, .26, .02);
    c.strokeStyle = RP.seam; c.lineWidth = .016; c.strokeRect(x, y, .31, .23);
  }
  c.restore();
  c.lineWidth = .05; c.strokeStyle = lvl >= TMAX ? '#7a5200' : RO; rr(c, -.46, -.46, .92, .92, .1); c.stroke();
  if (lvl >= TMAX) { c.lineWidth = .03; c.strokeStyle = '#ffca28'; rr(c, -.42, -.42, .84, .84, .08); c.stroke(); }
  // plateforme ronde en planches
  c.save(); c.beginPath(); c.arc(0, 0, .33, 0, TAU); c.clip();
  g = c.createRadialGradient(-.1, -.1, .02, 0, 0, .35); g.addColorStop(0, RP.plank[0]); g.addColorStop(1, RP.plank[1]);
  c.fillStyle = g; c.fillRect(-.35, -.35, .7, .7);
  c.strokeStyle = 'rgba(40,20,5,.6)'; c.lineWidth = .014; c.beginPath();
  for (let i = -2; i <= 2; i++) { c.moveTo(-.35, i * .13); c.lineTo(.35, i * .13); }
  c.stroke(); c.restore();
  c.lineWidth = .05; c.strokeStyle = RP.ring; c.beginPath(); c.arc(0, 0, .33, 0, TAU); c.stroke();
  c.lineWidth = .02; c.strokeStyle = d.col; c.beginPath(); c.arc(0, 0, .33, 0, TAU); c.stroke();
  for (let i = 0; i < 8; i++) { const q = i * TAU / 8; c.fillStyle = '#c9ccd0'; c.beginPath(); c.arc(Math.cos(q) * .33, Math.sin(q) * .33, .018, 0, TAU); c.fill(); }
  for (let i = 0; i < lvl - 1; i++) star(c, (i - (lvl - 2) / 2) * .2, .39, .075);
}
function bowArc(c, bx, half, bend, lw) {
  c.lineCap = 'round';
  for (const [w, col] of [[lw + .03, RO], [lw, '#7b4a20'], [lw * .35, '#c68a4c']]) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(bx - .1, -half); c.quadraticCurveTo(bx + bend, 0, bx - .1, half); c.stroke();
  }
  c.lineCap = 'butt';
}
function arrowBolt(c, x1, x2, y) {
  c.strokeStyle = '#e8dcc8'; c.lineWidth = .025; c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke();
  c.fillStyle = '#9ea3a8'; c.beginPath(); c.moveTo(x2 + .07, y); c.lineTo(x2, y - .035); c.lineTo(x2, y + .035); c.closePath(); c.fill(); c.lineWidth = .01; c.strokeStyle = RO; c.stroke();
  c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(x1, y); c.lineTo(x1 - .05, y - .04); c.lineTo(x1 + .03, y); c.lineTo(x1 - .05, y + .04); c.closePath(); c.fill();
}
function drawRetroTurret(c, type, lvl, ang, time, flash) {
  const d = TOWERS[type], col = d.col, fixed = type === 'tesla' || type === 'boost' || type === 'miner' || type === 'vortex';
  const a = fixed ? 0 : ang, [lx, ly] = lightFor(a), k = flash > 0 ? flash / .07 : 0;
  softShadow(c, .05, .07, .3, .3, .5);
  c.save(); c.rotate(a);
  let muzzle = 0;
  switch (type) {
    case 'pulse': { // arbalète
      wood(c, -.24, -.05, .6, .1);
      if (lvl >= 2) { iron(c, -.12, -.06, .03, .12); iron(c, .05, -.06, .03, .12); }
      const bows = lvl >= 3 ? [.3, .16] : [.28];
      for (const bx of bows) {
        bowArc(c, bx, .3, .14, .045);
        const pull = k > 0 ? bx - .06 : -.08;
        c.strokeStyle = '#f5f0e6'; c.lineWidth = .012; c.beginPath(); c.moveTo(bx - .1, -.3); c.lineTo(pull, 0); c.lineTo(bx - .1, .3); c.stroke();
      }
      if (k <= 0) arrowBolt(c, -.06, .36, 0);
      ball(c, -.15, 0, .09, '#8d5a2b', lx, ly); c.lineWidth = .02; c.strokeStyle = RO; c.stroke();
      muzzle = .44; break;
    }
    case 'gatling': { // baliste à répétition
      wood(c, -.28, -.08, .66, .16, true);
      bowArc(c, .3, .36, .16, .07);
      c.strokeStyle = '#f5f0e6'; c.lineWidth = .014; c.beginPath(); c.moveTo(.2, -.36); c.lineTo(k > 0 ? .2 : -.04, 0); c.lineTo(.2, .36); c.stroke();
      // chargeur de flèches qui défile
      wood(c, -.2, -.15, .26, .3);
      iron(c, -.2, -.15, .26, .035); iron(c, -.2, .115, .26, .035);
      const n = lvl >= 3 ? 4 : 3, off = (time * 6) % 1;
      for (let i = 0; i < n; i++) { const y = -.1 + ((i + off) / n) * .2; c.fillStyle = '#9ea3a8'; c.beginPath(); c.moveTo(.08, y); c.lineTo(.02, y - .025); c.lineTo(.02, y + .025); c.closePath(); c.fill(); }
      if (k <= 0) arrowBolt(c, .02, .4, 0);
      muzzle = .46; break;
    }
    case 'cannon': { // catapulte
      for (const y of [-.2, .2]) wood(c, -.34, y - .045, .68, .09, true);
      wood(c, -.3, -.2, .07, .4); wood(c, .18, -.2, .07, .4);
      for (const [x, y] of [[-.28, -.24], [.24, -.24], [-.28, .24], [.24, .24]]) { ball(c, x, y, .055, '#4e342e', lx, ly); c.lineWidth = .015; c.strokeStyle = RO; c.stroke(); }
      // bras : armé vers l'arrière, projeté vers l'avant au moment du tir
      const ax = .05 - .37 * (1 - 2 * k), big = lvl >= 3 ? 1.2 : 1;
      c.strokeStyle = RO; c.lineWidth = .1; c.beginPath(); c.moveTo(.05, 0); c.lineTo(ax, 0); c.stroke();
      c.strokeStyle = '#a86e34'; c.lineWidth = .07; c.stroke();
      iron(c, .01, -.13, .08, .26);
      c.fillStyle = '#5d3a1a'; c.beginPath(); c.arc(ax, 0, .1 * big, 0, TAU); c.fill(); c.lineWidth = .025; c.strokeStyle = RO; c.stroke();
      if (k < .5) rock(c, ax, 0, .075 * big, lx, ly, 3);
      muzzle = 0; break;
    }
    case 'frost': { // chaudron de potion glacée
      for (let i = 0; i < 3; i++) { const q = i * TAU / 3 + .5; iron(c, Math.cos(q) * .24 - .03, Math.sin(q) * .24 - .03, .06, .06); }
      gbarIron(c, .12, -.045, .3, .09);
      ball(c, 0, 0, .26, '#3b3f45', lx, ly, '#8a9099'); c.lineWidth = .03; c.strokeStyle = RO; c.stroke();
      c.lineWidth = .04; c.strokeStyle = '#6b7079'; c.beginPath(); c.arc(0, 0, .22, 0, TAU); c.stroke();
      const g = c.createRadialGradient(0, 0, .02, 0, 0, .2); g.addColorStop(0, '#e1f9ff'); g.addColorStop(.5, '#4fc3f7'); g.addColorStop(1, '#01579b');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, .19, 0, TAU); c.fill();
      for (let i = 0; i < 4; i++) { const q = time * 1.5 + i * 1.7, r = .04 + ((time * .7 + i * .3) % 1) * .1; c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .012; c.beginPath(); c.arc(Math.cos(q) * .08, Math.sin(q) * .08, r * .3, 0, TAU); c.stroke(); }
      if (lvl >= 3) for (let i = 0; i < 5; i++) { const q = i * TAU / 5 - time * .8; c.save(); c.translate(Math.cos(q) * .3, Math.sin(q) * .3); c.rotate(q); c.fillStyle = 'rgba(200,245,255,.9)'; c.beginPath(); c.moveTo(.05, 0); c.lineTo(0, -.025); c.lineTo(-.05, 0); c.lineTo(0, .025); c.closePath(); c.fill(); c.restore(); }
      c.globalCompositeOperation = 'lighter'; glowDot(0, 0, .3, 'rgba(120,220,255,.35)'); c.globalCompositeOperation = 'source-over';
      muzzle = .42; break;
    }
    case 'flame': { // tête de dragon en bronze
      const g = c.createRadialGradient(-.05 + lx * .1, ly * .1, .03, 0, 0, .34); g.addColorStop(0, '#9ccc65'); g.addColorStop(.6, '#43a047'); g.addColorStop(1, '#1b5e20');
      for (const s of [-1, 1]) { c.fillStyle = '#e0c068'; c.beginPath(); c.moveTo(-.16, s * .12); c.lineTo(-.42, s * .24); c.lineTo(-.22, s * .04); c.closePath(); c.fill(); c.lineWidth = .02; c.strokeStyle = RO; c.stroke(); }
      c.fillStyle = g; c.beginPath();
      c.moveTo(.42, -.05); c.quadraticCurveTo(.46, 0, .42, .05); c.lineTo(.2, .12); c.quadraticCurveTo(.05, .22, -.18, .18); c.quadraticCurveTo(-.32, 0, -.18, -.18); c.quadraticCurveTo(.05, -.22, .2, -.12); c.closePath();
      c.fill(); c.lineWidth = .03; c.strokeStyle = RO; c.stroke();
      if (lvl >= 2) for (let i = 0; i < 4; i++) { const x = -.18 + i * .09; c.fillStyle = '#e0c068'; c.beginPath(); c.moveTo(x, -.03); c.lineTo(x - .06, 0); c.lineTo(x, .03); c.closePath(); c.fill(); }
      for (const s of [-1, 1]) {
        c.fillStyle = '#ffeb3b'; c.beginPath(); c.ellipse(.12, s * .1, .045, .03, s * .3, 0, TAU); c.fill(); c.lineWidth = .012; c.strokeStyle = RO; c.stroke();
        c.fillStyle = '#111'; c.fillRect(.115, s * .1 - .022, .012, .044);
        c.fillStyle = RO; c.beginPath(); c.arc(.38, s * .028, .012, 0, TAU); c.fill();
      }
      const fl = .05 + Math.abs(Math.sin(time * 23)) * .035;
      c.globalCompositeOperation = 'lighter'; glowDot(.46, 0, fl * 2.2, 'rgba(255,145,0,.8)', 'rgba(255,240,180,.9)'); c.globalCompositeOperation = 'source-over';
      muzzle = 0; break;
    }
    case 'missile': { // trébuchet
      for (const y of [-.22, .22]) wood(c, -.36, y - .04, .7, .08, true);
      for (const y of [-.22, .22]) { c.fillStyle = '#7b4a20'; c.beginPath(); c.moveTo(-.18, y); c.lineTo(0, y * .35); c.lineTo(.18, y); c.closePath(); c.fill(); c.lineWidth = .02; c.strokeStyle = RO; c.stroke(); }
      const sw = k > 0 ? .35 : 0;
      c.save(); c.rotate(sw);
      wood(c, -.28, -.035, .66, .07);
      c.fillStyle = '#5d5a56'; rr(c, -.36, -.12, .14, .24, .03); c.fill(); c.lineWidth = .02; c.strokeStyle = RO; c.stroke();
      iron(c, -.36, -.02, .14, .04);
      if (k <= 0) { c.globalCompositeOperation = 'lighter'; glowDot(.38, 0, .13 + Math.sin(time * 15) * .015, 'rgba(255,120,0,.8)', 'rgba(255,230,150,.9)'); c.globalCompositeOperation = 'source-over'; rock(c, .38, 0, .05, lx, ly, 5); }
      c.restore();
      iron(c, -.02, -.22, .04, .44);
      if (lvl >= 3) { c.fillStyle = col; c.fillRect(-.33, -.27, .1, .04); c.fillRect(-.33, .23, .1, .04); }
      muzzle = .4; break;
    }
    case 'laser': { // tour du mage avec bâton de cristal
      const g = c.createRadialGradient(lx * .1, ly * .1, .03, 0, 0, .3); g.addColorStop(0, '#d7d0c2'); g.addColorStop(1, '#6e675b');
      for (let i = 0; i < 8; i++) { const q = i * TAU / 8; c.save(); c.rotate(q); c.fillStyle = '#9b9384'; c.fillRect(.22, -.055, .1, .11); c.lineWidth = .016; c.strokeStyle = RO; c.strokeRect(.22, -.055, .1, .11); c.restore(); }
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, .25, 0, TAU); c.fill(); c.lineWidth = .025; c.strokeStyle = RO; c.stroke();
      c.strokeStyle = 'rgba(45,35,25,.5)'; c.lineWidth = .012; c.beginPath(); c.arc(0, 0, .15, 0, TAU); c.stroke();
      wood(c, -.08, -.025, .44, .05, true);
      c.fillStyle = col; c.beginPath(); c.moveTo(.48, 0); c.lineTo(.4, -.06); c.lineTo(.33, 0); c.lineTo(.4, .06); c.closePath(); c.fill(); c.lineWidth = .016; c.strokeStyle = RO; c.stroke();
      c.globalCompositeOperation = 'lighter'; glowDot(.4, 0, .16 + Math.sin(time * 6) * .03, 'rgba(255,60,90,.6)'); c.globalCompositeOperation = 'source-over';
      if (lvl >= 3) for (let i = 0; i < 3; i++) { const q = time * 2 + i * TAU / 3; c.fillStyle = 'rgba(255,215,64,.9)'; c.font = 'bold .1px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ᚱᛟᚾ'[i], Math.cos(q) * .14, Math.sin(q) * .14); }
      muzzle = .48; break;
    }
    case 'tesla': { // pilier de pierre gravé de runes et orbe magique
      c.fillStyle = '#857d6f'; c.beginPath(); for (let i = 0; i < 8; i++) { const q = i * TAU / 8 + Math.PI / 8; c.lineTo(Math.cos(q) * .26, Math.sin(q) * .26); } c.closePath(); c.fill(); c.lineWidth = .03; c.strokeStyle = RO; c.stroke();
      c.fillStyle = '#b5ad9c'; c.beginPath(); for (let i = 0; i < 8; i++) { const q = i * TAU / 8 + Math.PI / 8; c.lineTo(Math.cos(q) * .18, Math.sin(q) * .18 - .03); } c.closePath(); c.fill(); c.lineWidth = .02; c.stroke();
      const on = .6 + Math.sin(time * 5) * .4;
      c.fillStyle = 'rgba(255,230,80,' + on + ')'; c.font = 'bold .09px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 6; i++) { const q = i * TAU / 6; c.fillText('ᚠᚢᚦᚨᚱᚲ'[i], Math.cos(q) * .22, Math.sin(q) * .22); }
      const p = .1 + Math.sin(time * 8) * .012, oy = lvl >= 3 ? -.12 : -.08;
      c.globalCompositeOperation = 'lighter'; glowDot(0, oy, p * 3.4, 'rgba(160,120,255,.55)'); c.globalCompositeOperation = 'source-over';
      ball(c, 0, oy, p, '#b39ddb', -.7, -.7, '#ffffff');
      if (Math.sin(time * 13) > .5) {
        c.strokeStyle = 'rgba(220,200,255,.95)'; c.lineWidth = .02; c.beginPath();
        for (let q = 0; q < 2; q++) { c.moveTo(0, oy); for (let j = 1; j < 4; j++) c.lineTo(rand(-.3, .3), oy + rand(-.2, .25)); }
        c.stroke();
      }
      muzzle = 0; break;
    }
    case 'mine': { // poudrière : canon court et tonneaux de poudre
      iron(c, .04, -.08, .32, .16);
      for (let i = 0; i < 3; i++) {
        const q = time * .8 + i * TAU / 3, bx = Math.cos(q) * .15, by = Math.sin(q) * .15;
        c.fillStyle = RP.l; c.beginPath(); c.arc(bx, by, .085, 0, TAU); c.fill(); c.lineWidth = .02; c.strokeStyle = RO; c.stroke();
        c.strokeStyle = '#4a4d52'; c.lineWidth = .016; c.beginPath(); c.arc(bx, by, .06, 0, TAU); c.stroke();
        c.fillStyle = '#212121'; c.font = 'bold .07px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✸', bx, by);
      }
      ball(c, 0, 0, .08 + (lvl >= 3 ? .02 : 0), '#5d3a1a', lx, ly); c.lineWidth = .02; c.strokeStyle = RO; c.stroke();
      if (Math.sin(time * 9) > 0) { c.globalCompositeOperation = 'lighter'; glowDot(.38, 0, .07, 'rgba(255,180,0,.9)'); c.globalCompositeOperation = 'source-over'; }
      muzzle = .38; break;
    }
    case 'vortex': { // moulin à vent : les ailes soufflent les virus en arrière
      c.fillStyle = RP.stone[1]; c.beginPath(); c.arc(0, 0, .2, 0, TAU); c.fill(); c.lineWidth = .025; c.strokeStyle = RO; c.stroke();
      c.strokeStyle = RP.seam; c.lineWidth = .012; c.beginPath(); c.arc(0, 0, .13, 0, TAU); c.stroke();
      c.save(); c.rotate(time * (lvl >= 3 ? 4 : 3));
      for (let i = 0; i < 4; i++) {
        c.rotate(TAU / 4);
        wood(c, .03, -.018, .36, .036, true);
        c.fillStyle = 'rgba(245,235,215,.92)'; c.fillRect(.12, .018, .24, .09); c.lineWidth = .014; c.strokeStyle = RO; c.strokeRect(.12, .018, .24, .09);
        c.strokeStyle = 'rgba(90,60,30,.6)'; c.lineWidth = .008; c.beginPath(); for (let j = 1; j < 4; j++) { c.moveTo(.12 + j * .06, .018); c.lineTo(.12 + j * .06, .108); } c.stroke();
      }
      c.restore();
      ball(c, 0, 0, .06, '#5d3a1a', lx, ly); c.lineWidth = .015; c.strokeStyle = RO; c.stroke();
      muzzle = 0; break;
    }
    case 'boost': { // tambour de guerre et bannières
      const beat = Math.max(0, Math.sin(time * 6)) * .02;
      for (const s of [-1, 1]) {
        iron(c, s * .24 - .012, -.3, .024, .3);
        const wv = Math.sin(time * 4 + s) * .03;
        c.fillStyle = '#00c853'; c.beginPath(); c.moveTo(s * .24, -.3); c.lineTo(s * .24 + s * .16, -.27 + wv); c.lineTo(s * .24 + s * .12, -.2); c.lineTo(s * .24 + s * .16, -.13 + wv); c.lineTo(s * .24, -.16); c.closePath(); c.fill(); c.lineWidth = .015; c.strokeStyle = RO; c.stroke();
      }
      c.fillStyle = '#b71c1c'; c.beginPath(); c.arc(0, .04, .22, 0, TAU); c.fill(); c.lineWidth = .03; c.strokeStyle = RO; c.stroke();
      c.strokeStyle = '#ffd54f'; c.lineWidth = .014; c.beginPath(); for (let i = 0; i <= 12; i++) { const q = i * TAU / 12; c.lineTo(Math.cos(q) * (i % 2 ? .16 : .21), .04 + Math.sin(q) * (i % 2 ? .16 : .21)); } c.stroke();
      const g = c.createRadialGradient(-.04, 0, .01, 0, .04, .16 + beat); g.addColorStop(0, '#fff8e1'); g.addColorStop(1, '#d7b98a');
      c.fillStyle = g; c.beginPath(); c.arc(0, .04, .14 + beat, 0, TAU); c.fill(); c.lineWidth = .015; c.strokeStyle = RO; c.stroke();
      c.globalCompositeOperation = 'lighter'; glowDot(0, .04, .32 + beat * 4, 'rgba(0,230,118,.35)'); c.globalCompositeOperation = 'source-over';
      muzzle = 0; break;
    }
    case 'miner': { // coffre au trésor ouvert
      wood(c, -.27, -.22, .54, .14, true);
      iron(c, -.27, -.22, .54, .025);
      wood(c, -.27, -.07, .54, .3);
      iron(c, -.2, -.07, .04, .3); iron(c, .16, -.07, .04, .3);
      c.fillStyle = '#ffca28'; c.fillRect(-.04, .02, .08, .08); c.lineWidth = .012; c.strokeStyle = RO; c.strokeRect(-.04, .02, .08, .08);
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#ffd740' : '#ffb300'; c.beginPath(); c.ellipse(-.18 + i * .07, -.08, .045, .03, 0, 0, TAU); c.fill(); c.lineWidth = .01; c.strokeStyle = '#8d6e00'; c.stroke(); }
      const w = Math.abs(Math.cos(time * 3)) * .12 + .015, y = -.22 + Math.sin(time * 2) * .02;
      const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, '#b8860b'); g.addColorStop(.5, '#fff59d'); g.addColorStop(1, '#b8860b');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, y, w, .12, 0, 0, TAU); c.fill(); c.lineWidth = .025; c.strokeStyle = RO; c.stroke();
      if (lvl >= 3) { c.globalCompositeOperation = 'lighter'; glowDot(0, -.1, .32, 'rgba(255,215,64,.4)'); c.globalCompositeOperation = 'source-over'; }
      muzzle = 0; break;
    }
  }
  if (k > 0 && muzzle) { // petit nuage de poussière / étincelles au tir
    c.globalAlpha = k * .8; c.fillStyle = '#e8dcc8';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(muzzle + i * .04, (i - 1) * .05, .04 * (1 + (1 - k) * 2), 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  }
  c.restore();
}
function gbarIron(c, x, y, w, h) { iron(c, x, y, w, h); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, y + h * .15, w, h * .15); }

// ======== style « Futur quantique » : socle hexagonal et néons ========
function drawNeoBase(c, type, lvl) {
  const d = TOWERS[type], hex = (r) => { c.beginPath(); for (let i = 0; i < 6; i++) { const q = i * TAU / 6 + Math.PI / 6; c.lineTo(Math.cos(q) * r, Math.sin(q) * r); } c.closePath(); };
  c.save(); c.translate(.04, .06); hex(.5); c.fillStyle = 'rgba(0,0,0,.5)'; c.fill(); c.restore();
  let g = c.createLinearGradient(0, -.5, 0, .5); const NP = NPAL[curTS()[1]] || NPAL.data; g.addColorStop(0, NP[0]); g.addColorStop(.5, NP[1]); g.addColorStop(1, NP[2]);
  hex(.5); c.fillStyle = g; c.fill(); c.lineWidth = .035; c.strokeStyle = lvl >= TMAX ? '#ffd740' : '#05060b'; c.stroke();
  // lignes de circuit lumineuses
  c.save(); hex(.47); c.clip();
  c.strokeStyle = rgbaA(d.col).replace('A', '.22'); c.lineWidth = .012; c.beginPath();
  for (let i = -3; i <= 3; i++) { c.moveTo(-.5, i * .14); c.lineTo(.5, i * .14 + .2); }
  c.stroke(); c.restore();
  // anneau néon
  c.globalCompositeOperation = 'lighter';
  c.lineWidth = .07; c.strokeStyle = rgbaA(d.col).replace('A', '.25'); hex(.4); c.stroke();
  c.lineWidth = .022; c.strokeStyle = d.col; hex(.4); c.stroke();
  c.globalCompositeOperation = 'source-over';
  g = c.createRadialGradient(0, 0, .02, 0, 0, .3); g.addColorStop(0, rgbaA(d.col).replace('A', '.35')); g.addColorStop(1, 'rgba(0,0,0,.6)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, .29, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = .012; c.beginPath(); c.arc(0, 0, .2, 0, TAU); c.stroke();
  // niveaux : petits losanges lumineux
  for (let i = 0; i < lvl - 1; i++) {
    const x = (i - (lvl - 2) / 2) * .16, y = .4;
    c.fillStyle = lvl >= TMAX ? '#ffd740' : '#7df9ff'; c.beginPath(); c.moveTo(x, y - .05); c.lineTo(x + .04, y); c.lineTo(x, y + .05); c.lineTo(x - .04, y); c.closePath(); c.fill();
  }
}


// ======== Flux de données : socle de verre et grille lumineuse ========
function drawGlassBase(c, type, lvl) {
  const d = TOWERS[type];
  c.fillStyle = 'rgba(0,10,30,.5)'; rr(c, -.41, -.37, .92, .92, .16); c.fill();
  let g = c.createLinearGradient(0, -.46, 0, .46); g.addColorStop(0, '#16345c'); g.addColorStop(1, '#071628');
  c.fillStyle = g; rr(c, -.46, -.46, .92, .92, .16); c.fill();
  c.save(); rr(c, -.46, -.46, .92, .92, .16); c.clip();
  c.strokeStyle = 'rgba(64,196,255,.22)'; c.lineWidth = .01; c.beginPath(); for (let i = -4; i <= 4; i++) { c.moveTo(i * .12, -.5); c.lineTo(i * .12, .5); c.moveTo(-.5, i * .12); c.lineTo(.5, i * .12); } c.stroke();
  c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(-.46, -.46); c.lineTo(.2, -.46); c.lineTo(-.46, .2); c.closePath(); c.fill(); // reflet de vitre
  c.restore();
  c.lineWidth = .03; c.strokeStyle = lvl >= TMAX ? '#ffd740' : 'rgba(150,220,255,.9)'; rr(c, -.46, -.46, .92, .92, .16); c.stroke();
  c.globalCompositeOperation = 'lighter'; c.lineWidth = .05; c.strokeStyle = rgbaA(d.col).replace('A', '.3'); c.beginPath(); c.arc(0, 0, .31, 0, TAU); c.stroke(); c.globalCompositeOperation = 'source-over';
  c.lineWidth = .018; c.strokeStyle = '#7fdbff'; c.beginPath(); c.arc(0, 0, .31, 0, TAU); c.stroke();
  for (let i = 0; i < lvl - 1; i++) { const x = (i - (lvl - 2) / 2) * .16; c.fillStyle = lvl >= TMAX ? '#ffd740' : '#64ffda'; c.fillRect(x - .04, .36, .08, .05); }
}
// ======== Le Nuage : tourelle posée sur un nuage, ciel et dorures ========
function drawSkyBase(c, type, lvl) {
  const d = TOWERS[type], puffs = [[-.28, .18, .2], [0, .24, .22], [.28, .18, .2], [-.34, -.05, .17], [.34, -.05, .17], [-.18, -.25, .19], [.18, -.25, .19], [0, -.05, .3]];
  c.fillStyle = 'rgba(40,70,120,.3)'; c.beginPath(); c.ellipse(.03, .1, .5, .42, 0, 0, TAU); c.fill();
  c.lineWidth = .05; c.strokeStyle = lvl >= TMAX ? '#c99a2e' : '#6f8fbf'; for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); }
  for (const [x, y, r] of puffs) { const g = c.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d4e2f7'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  const g = c.createRadialGradient(0, 0, .05, 0, 0, .27); g.addColorStop(0, '#9cc9ff'); g.addColorStop(1, '#4f86d6');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, .25, 0, TAU); c.fill(); c.lineWidth = .035; c.strokeStyle = '#c99a2e'; c.stroke();
  c.lineWidth = .012; c.strokeStyle = d.col; c.beginPath(); c.arc(0, 0, .21, 0, TAU); c.stroke();
  for (let i = 0; i < lvl - 1; i++) star(c, (i - (lvl - 2) / 2) * .2, .4, .07);
}

// ======== Zone cryogénique : socle enneigé, glaçons ========
function drawIceBase(c, type, lvl) {
  const d = TOWERS[type];
  c.fillStyle = 'rgba(0,30,60,.45)'; rr(c, -.41, -.37, .92, .92, .2); c.fill();
  let g = c.createLinearGradient(0, -.46, 0, .46); g.addColorStop(0, '#e6f7ff'); g.addColorStop(.5, '#9fd4f0'); g.addColorStop(1, '#4f95c4');
  c.fillStyle = g; rr(c, -.46, -.46, .92, .92, .2); c.fill();
  c.save(); rr(c, -.46, -.46, .92, .92, .2); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = .012; c.beginPath(); // fissures dans la glace
  c.moveTo(-.46, .1); c.lineTo(-.2, .18); c.lineTo(-.05, .4); c.moveTo(.46, -.15); c.lineTo(.25, -.05); c.lineTo(.3, .2); c.stroke();
  c.restore();
  c.lineWidth = .05; c.strokeStyle = lvl >= TMAX ? '#7a5200' : '#0d3c61'; rr(c, -.46, -.46, .92, .92, .2); c.stroke();
  if (lvl >= TMAX) { c.lineWidth = .03; c.strokeStyle = '#ffca28'; rr(c, -.42, -.42, .84, .84, .17); c.stroke(); }
  // neige sur le bord haut
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-.44, -.36);
  for (let i = 0; i <= 8; i++) { const x = -.44 + i * .11; c.quadraticCurveTo(x - .055, -.52 + (i % 2) * .04, x, -.4 - (i % 3) * .02); }
  c.lineTo(.44, -.3); c.lineTo(-.44, -.3); c.closePath(); c.fill(); c.lineWidth = .015; c.strokeStyle = 'rgba(13,60,97,.5)'; c.stroke();
  // glaçons sur le bord bas
  for (let i = 0; i < 5; i++) { const x = -.32 + i * .16, h = .07 + ((i * 7) % 3) * .03; c.fillStyle = 'rgba(225,248,255,.95)'; c.beginPath(); c.moveTo(x - .03, .45); c.lineTo(x + .03, .45); c.lineTo(x, .45 + h); c.closePath(); c.fill(); }
  g = c.createRadialGradient(0, .05, .04, 0, 0, .33); g.addColorStop(0, '#0d3c61'); g.addColorStop(1, shade(d.col, -.2));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, .3, 0, TAU); c.fill(); c.lineWidth = .035; c.strokeStyle = '#e6f7ff'; c.stroke();
  for (let i = 0; i < lvl - 1; i++) { // flocons de niveau
    const x = (i - (lvl - 2) / 2) * .2, y = .37; c.strokeStyle = lvl >= TMAX ? '#ffd740' : '#ffffff'; c.lineWidth = .025; c.beginPath();
    for (let k = 0; k < 3; k++) { const q = k * Math.PI / 3; c.moveTo(x + Math.cos(q) * .06, y + Math.sin(q) * .06); c.lineTo(x - Math.cos(q) * .06, y - Math.sin(q) * .06); } c.stroke();
  }
}
// ======== Salle des serveurs : style militaire (béton, sacs de sable, bandes de danger) ========
function drawMilBase(c, type, lvl) {
  const d = TOWERS[type];
  c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, -.41, -.37, .92, .92, .08); c.fill();
  let g = c.createLinearGradient(0, -.46, 0, .46); g.addColorStop(0, '#9a9a8e'); g.addColorStop(.5, '#73736a'); g.addColorStop(1, '#4a4a44');
  c.fillStyle = g; rr(c, -.46, -.46, .92, .92, .08); c.fill();
  c.save(); rr(c, -.46, -.46, .92, .92, .08); c.clip();
  // bandes de danger dans les coins
  for (const [sx, sy] of [[-1, -1], [1, 1]]) { c.save(); c.translate(sx * .46, sy * .46); c.rotate(Math.PI / 4); for (let k = -3; k <= 3; k++) { c.fillStyle = k % 2 ? '#ffc400' : '#1b1b1b'; c.fillRect(k * .06 - .03, -.09, .06, .18); } c.restore(); }
  c.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 9; i++) c.fillRect(-.4 + ((i * 37) % 80) / 100, -.4 + ((i * 53) % 80) / 100, .03, .03);
  c.restore();
  c.lineWidth = .05; c.strokeStyle = lvl >= TMAX ? '#7a5200' : '#1b1d14'; rr(c, -.46, -.46, .92, .92, .08); c.stroke();
  if (lvl >= TMAX) { c.lineWidth = .03; c.strokeStyle = '#ffca28'; rr(c, -.42, -.42, .84, .84, .06); c.stroke(); }
  // anneau de sacs de sable
  for (let i = 0; i < 10; i++) {
    const q = i * TAU / 10; c.save(); c.translate(Math.cos(q) * .3, Math.sin(q) * .3); c.rotate(q + Math.PI / 2);
    g = c.createLinearGradient(0, -.05, 0, .05); g.addColorStop(0, '#d9c99a'); g.addColorStop(1, '#8f7f52');
    c.fillStyle = g; rr(c, -.085, -.05, .17, .1, .04); c.fill(); c.lineWidth = .014; c.strokeStyle = '#4a3f22'; c.stroke(); c.restore();
  }
  c.fillStyle = '#3a3f2a'; c.beginPath(); c.arc(0, 0, .22, 0, TAU); c.fill();
  c.lineWidth = .02; c.strokeStyle = d.col; c.beginPath(); c.arc(0, 0, .22, 0, TAU); c.stroke();
  for (let i = 0; i < lvl - 1; i++) { // galons de grade
    const x = (i - (lvl - 2) / 2) * .17, y = .4; c.strokeStyle = lvl >= TMAX ? '#ffd740' : '#e0e0d0'; c.lineWidth = .03;
    c.beginPath(); c.moveTo(x - .05, y - .02); c.lineTo(x, y + .03); c.lineTo(x + .05, y - .02); c.stroke();
  }
}

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
  if (d.ghost) ctx.globalAlpha *= e.phased ? .22 : .88;
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
    case 'pixel': case 'bit': { // virus en gros pixels
      const n = e.type === 'bit' ? 2 : 4, c = r * 2 / n;
      const mask = e.type === 'bit' ? [1, 1, 1, 1] : [0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0];
      for (let i = 0; i < n * n; i++) if (mask[i]) { const px = -r + (i % n) * c, py = -r + Math.floor(i / n) * c; ctx.fillStyle = (i + Math.floor(t * 4)) % 5 ? col : shade(d.col, .4); ctx.fillRect(px, py, c + .005, c + .005); }
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * .7; ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.fillStyle = '#000'; ctx.fillRect(r * .2, -r * .45, c * .7, c * .7); ctx.fillRect(r * .2, r * .45 - c * .7, c * .7, c * .7);
      break;
    }
    case 'drone': { // drone à 4 hélices
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.strokeStyle = OUT; ctx.lineWidth = lw * .8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sx * r * .9, sy * r * .9); ctx.stroke();
        ctx.save(); ctx.translate(sx * r * .9, sy * r * .9); ctx.rotate(t * 40); ctx.fillStyle = 'rgba(200,230,255,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, r * .55, r * .12, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      glossBody(r * .62, col, lx, ly, lw, circle(r * .62));
      ctx.fillStyle = '#ff1744'; ctx.beginPath(); ctx.arc(r * .25, 0, r * .18, 0, TAU); ctx.fill();
      break;
    }
    case 'mainframe': { // ordinateur central : armoire beige à bandes magnétiques
      glossBody(r, col, lx, ly, lw, () => rr(ctx, -r, -r * .9, r * 2, r * 1.8, r * .12));
      for (const sy of [-1, 1]) { ctx.save(); ctx.translate(-r * .35, sy * r * .42); ctx.rotate(t * 3 * sy); ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, TAU); ctx.fill(); ctx.fillStyle = '#bcaaa4'; ctx.fillRect(-r * .05, -r * .28, r * .1, r * .56); ctx.restore(); }
      for (let k = 0; k < 5; k++) { ctx.fillStyle = (Math.floor(t * 6) + k) % 3 ? '#76ff03' : '#ff3d00'; ctx.fillRect(r * .3, -r * .6 + k * r * .3, r * .14, r * .12); }
      face(e, r, lw, { x: .78, sp: .5, er: .16, mx: .95, mw: .3, pupil: '#ff3d00', teeth: 3 });
      break;
    }
    case 'tempest': { // tempête : nuage noir et éclairs
      for (let k = 0; k < 7; k++) { const a = k * TAU / 7 + t * .6; ctx.fillStyle = k % 2 ? '#37474f' : '#546e7a'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * .6, Math.sin(a) * r * .5, r * .55, 0, TAU); ctx.fill(); }
      glossBody(r * .75, '#455a64', lx, ly, lw, circle(r * .75));
      if (Math.sin(t * 9) > .3) { ctx.strokeStyle = '#fff59d'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-r * .2, r * .5); ctx.lineTo(r * .05, r * .85); ctx.lineTo(-r * .1, r * .9); ctx.lineTo(r * .15, r * 1.3); ctx.stroke(); }
      face(e, r * .8, lw, { three: true, pupil: '#fff59d', mw: .4, teeth: 3, er: .2 });
      break;
    }
    // ---- virus supplémentaires de chaque monde ----
    case 'capa': { // condensateur : cylindre avec bande et signe +
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); rr(ctx, -r * 1.05, -r * .82, r * 2.1, r * 1.64, r * .55); });
      ctx.fillStyle = 'rgba(20,20,40,.55)'; ctx.fillRect(-r * .75, -r * .82, r * .32, r * 1.64);
      ctx.fillStyle = '#fff'; ctx.font = '900 ' + (r * .45).toFixed(3) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', -r * .59, 0);
      shine(r, lx, ly); face(e, r, lw, { x: .45, mx: .85 }); break;
    }
    case 'chipset': { // puce : carré à pattes dorées
      ctx.fillStyle = '#ffd54f'; ctx.strokeStyle = OUT; ctx.lineWidth = lw * .6;
      for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) { ctx.fillRect(i * r * .36 - r * .09, s * r * 1.02 - (s > 0 ? 0 : r * .25), r * .18, r * .25); ctx.fillRect(s * r * 1.02 - (s > 0 ? 0 : r * .25), i * r * .36 - r * .09, r * .25, r * .18); }
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); rr(ctx, -r * .95, -r * .95, r * 1.9, r * 1.9, r * .2); });
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = lw * .5; ctx.strokeRect(-r * .6, -r * .6, r * 1.2, r * 1.2);
      face(e, r, lw, { x: .3 }); break;
    }
    case 'slag': { // scorie : rocher de lave fissuré
      glossBody(r, col, lx, ly, lw, blobPath(r, 7, .14, e.id));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,110,20,' + (.6 + .3 * Math.sin(t * 5)).toFixed(2) + ')'; ctx.lineWidth = lw * .8;
      ctx.beginPath(); ctx.moveTo(-r * .8, -r * .2); ctx.lineTo(-r * .3, r * .1); ctx.lineTo(-r * .5, r * .6); ctx.moveTo(-r * .2, -r * .7); ctx.lineTo(0, -r * .3); ctx.stroke(); ctx.restore();
      face(e, r, lw, { x: .45, teeth: 3 }); break;
    }
    case 'phoenix': { // phénix : boule de feu à ailes de flammes
      const f = Math.sin(t * 16) * .3;
      for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * f * .6); ctx.fillStyle = s > 0 ? '#ff6d00' : '#ffab00'; ctx.beginPath(); ctx.moveTo(0, s * r * .5); ctx.quadraticCurveTo(-r * .1, s * r * 1.9, -r * 1.2, s * r * 1.6); ctx.quadraticCurveTo(-r * .7, s * r * 1, -r * .4, s * r * .5); ctx.fill(); ctx.lineWidth = lw * .6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = '#ffd740'; ctx.beginPath(); ctx.moveTo(-r * .7, 0); ctx.lineTo(-r * 1.7, -r * .35 + f * r * .3); ctx.lineTo(-r * 1.4, 0); ctx.lineTo(-r * 1.7, r * .35 - f * r * .3); ctx.closePath(); ctx.fill();
      glossBody(r, col, lx, ly, lw, circle(r)); shine(r, lx, ly); face(e, r, lw, { x: .4, mouth: false });
      ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.moveTo(r * .85, -r * .15); ctx.lineTo(r * 1.25, 0); ctx.lineTo(r * .85, r * .15); ctx.closePath(); ctx.fill(); ctx.lineWidth = lw * .6; ctx.strokeStyle = OUT; ctx.stroke(); break;
    }
    case 'byte': { // octet : cube de 8 cases
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); rr(ctx, -r, -r, r * 2, r * 2, r * .3); });
      ctx.strokeStyle = 'rgba(0,40,60,.45)'; ctx.lineWidth = lw * .5; ctx.beginPath(); for (const k of [-.33, .33]) { ctx.moveTo(k * r * 2 * .75, -r); ctx.lineTo(k * r * 2 * .75, r); ctx.moveTo(-r, k * r * 1.5); ctx.lineTo(r, k * r * 1.5); } ctx.stroke();
      face(e, r, lw, { x: .35, nice: false }); break;
    }
    case 'stream': { // flux : goutte étirée avec traînées
      ctx.strokeStyle = shade(d.col, .3); ctx.lineWidth = lw; for (const o of [-.4, 0, .4]) { ctx.globalAlpha *= .6; ctx.beginPath(); ctx.moveTo(-r * 1.1, o * r); ctx.lineTo(-r * (1.8 + Math.abs(o)), o * r); ctx.stroke(); ctx.globalAlpha /= .6; }
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); ctx.moveTo(r * 1.1, 0); ctx.quadraticCurveTo(r * .6, -r * .95, -r * .4, -r * .75); ctx.quadraticCurveTo(-r * 1.3, 0, -r * .4, r * .75); ctx.quadraticCurveTo(r * .6, r * .95, r * 1.1, 0); ctx.closePath(); });
      shine(r, lx, ly); face(e, r, lw, { x: .3, sp: .28, er: .22, mx: .82, mw: .2 }); break;
    }
    case 'firewall': { // pare-feu : mur de briques en flammes
      for (let i = 0; i < 5; i++) { const q = -r * .9 + i * r * .45, h = r * (.4 + .25 * Math.sin(t * 12 + i)); ctx.fillStyle = i % 2 ? '#ffab00' : '#ff3d00'; ctx.beginPath(); ctx.moveTo(-r * .7, q - r * .15); ctx.quadraticCurveTo(-r * .7 - h * 1.6, q, -r * .7, q + r * .15); ctx.fill(); }
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); rr(ctx, -r * .9, -r * .95, r * 1.85, r * 1.9, r * .25); });
      ctx.strokeStyle = 'rgba(60,10,0,.5)'; ctx.lineWidth = lw * .5; ctx.beginPath();
      for (let k = -1; k <= 1; k++) { ctx.moveTo(-r * .9, k * r * .6); ctx.lineTo(r * .95, k * r * .6); } for (let k = 0; k < 4; k++) { const x = -r * .5 + k * r * .45 + (k % 2) * r * .2; ctx.moveTo(x, -r * .95); ctx.lineTo(x, r * .95); } ctx.stroke();
      face(e, r, lw, { x: .4 }); break;
    }
    case 'spam': { // spam : petite enveloppe
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); rr(ctx, -r * 1.1, -r * .8, r * 2.2, r * 1.6, r * .2); });
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * .7; ctx.beginPath(); ctx.moveTo(-r * 1.05, -r * .75); ctx.lineTo(0, 0); ctx.lineTo(-r * 1.05, r * .75); ctx.stroke();
      face(e, r, lw, { x: .5, sp: .35, er: .28, mouth: false }); break;
    }
    case 'yeti': { // yéti : grosse boule de poils blancs, visage bleu
      glossBody(r, col, lx, ly, lw, blobPath(r, 16, .08, t));
      ctx.fillStyle = '#90caf9'; ctx.beginPath(); ctx.ellipse(r * .35, 0, r * .55, r * .65, 0, 0, TAU); ctx.fill(); ctx.lineWidth = lw * .6; ctx.strokeStyle = OUT; ctx.stroke();
      face(e, r, lw, { x: .38, sp: .28, er: .22, teeth: 4, mw: .34 }); break;
    }
    case 'flake': { // flocon volant à un œil
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 2.2; ctx.lineCap = 'round';
      const arms = () => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i * Math.PI / 3 + t * 1.2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(q) * r * 1.25, Math.sin(q) * r * 1.25); ctx.moveTo(Math.cos(q) * r * .8 + Math.cos(q + .6) * r * .3, Math.sin(q) * r * .8 + Math.sin(q + .6) * r * .3); ctx.lineTo(Math.cos(q) * r * .8, Math.sin(q) * r * .8); ctx.lineTo(Math.cos(q) * r * .8 + Math.cos(q - .6) * r * .3, Math.sin(q) * r * .8 + Math.sin(q - .6) * r * .3); } };
      arms(); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = lw * 1.1; arms(); ctx.stroke();
      glossBody(r * .55, col, lx, ly, lw, circle(r * .55)); face(e, r * .6, lw, { one: true, mouth: false, x: .1 }); break;
    }
    case 'spectre': { // spectre : drap flottant à bord ondulé
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); ctx.arc(r * .1, 0, r, -Math.PI / 2, Math.PI / 2); for (let i = 0; i <= 6; i++) { const y = r - i * r * 2 / 6; ctx.lineTo(-r * .8 - (i % 2 ? r * .45 : 0) + Math.sin(t * 8 + i) * r * .12, y); } ctx.closePath(); });
      shine(r, lx, ly); face(e, r, lw, { x: .45, nice: true }); break;
    }
    case 'replicant': { // réplicant : deux corps qui se dédoublent
      const o = r * (.25 + .08 * Math.sin(t * 6));
      glossBody(r * .8, shade(col, -.2), lx, ly, lw, () => { ctx.beginPath(); ctx.arc(-o, -o * .6, r * .8, 0, TAU); });
      glossBody(r * .9, col, lx, ly, lw, () => { ctx.beginPath(); ctx.arc(o * .4, o * .3, r * .9, 0, TAU); });
      ctx.save(); ctx.translate(o * .4, o * .3); face(e, r * .9, lw, { three: true }); ctx.restore(); break;
    }
    case 'knight': { // chevalier : heaume à visière, écu et plumet
      ctx.strokeStyle = '#c62828'; ctx.lineWidth = r * .25; ctx.beginPath(); ctx.moveTo(-r * .6, 0); ctx.quadraticCurveTo(-r * 1.3, Math.sin(t * 9) * r * .3, -r * 1.7, Math.sin(t * 9 + 1) * r * .25); ctx.stroke();
      glossBody(r, col, lx, ly, lw, circle(r));
      ctx.fillStyle = '#263238'; for (const y of [-.25, .25]) ctx.fillRect(r * .3, y * r - r * .07, r * .62, r * .14);
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * .8; ctx.beginPath(); ctx.moveTo(-r * .95, 0); ctx.lineTo(r * .98, 0); ctx.stroke();
      ctx.save(); ctx.translate(0, r * .95); ctx.fillStyle = '#1565c0'; ctx.beginPath(); ctx.moveTo(-r * .4, -r * .3); ctx.lineTo(r * .4, -r * .3); ctx.lineTo(r * .35, r * .15); ctx.lineTo(0, r * .45); ctx.lineTo(-r * .35, r * .15); ctx.closePath(); ctx.fill(); ctx.lineWidth = lw * .7; ctx.stroke();
      ctx.fillStyle = '#ffd740'; ctx.fillRect(-r * .06, -r * .25, r * .12, r * .55); ctx.fillRect(-r * .25, -r * .1, r * .5, r * .1); ctx.restore();
      shine(r, lx, ly); break;
    }
    case 'invader': { // envahisseur 8 bits
      const P = ['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'], fr = Math.floor(t * 4) % 2, px = r * 2.1 / 11;
      ctx.save(); ctx.rotate(Math.PI / 2);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 11; x++) { const ch = y === 7 && fr ? 'X.........X'[x] : P[y][x]; if (ch === 'X') { ctx.fillStyle = col; ctx.fillRect(-r * 1.05 + x * px, -r * .75 + y * px, px + .002, px + .002); } }
      ctx.restore(); break;
    }
    case 'droplet': { // goutte de pluie volante
      glossBody(r, col, lx, ly, lw, () => { ctx.beginPath(); ctx.moveTo(-r * 1.4, 0); ctx.quadraticCurveTo(-r * .3, -r * .95, r * .4, -r * .85); ctx.arc(r * .1, 0, r * .9, -1.25, 1.25); ctx.quadraticCurveTo(-r * .3, r * .95, -r * 1.4, 0); ctx.closePath(); });
      shine(r, lx, ly); face(e, r, lw, { x: .3, nice: true, er: .25 }); break;
    }
    case 'thunder': { // cumulonimbus : nuage gris et éclair
      const puffs = [[-.45, -.35, .55], [.2, -.45, .6], [.5, .15, .55], [-.15, .35, .6], [-.6, .2, .45]];
      for (const [x, y, rad] of puffs) { ctx.beginPath(); ctx.arc(x * r, y * r, rad * r, 0, TAU); ctx.lineWidth = lw * 1.6; ctx.strokeStyle = OUT; ctx.stroke(); }
      for (const [x, y, rad] of puffs) { const g = ctx.createRadialGradient(x * r - rad * r * .3, y * r - rad * r * .3, 0, x * r, y * r, rad * r); g.addColorStop(0, shade(col, .45)); g.addColorStop(1, col); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x * r, y * r, rad * r, 0, TAU); ctx.fill(); }
      if (Math.sin(t * 7) > .3) { ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.moveTo(-r * .1, r * .5); ctx.lineTo(-r * .4, r * 1.1); ctx.lineTo(-r * .15, r * 1.05); ctx.lineTo(-r * .35, r * 1.6); ctx.lineTo(r * .1, r * .9); ctx.lineTo(-r * .12, r * .95); ctx.closePath(); ctx.fill(); ctx.lineWidth = lw * .5; ctx.strokeStyle = OUT; ctx.stroke(); }
      face(e, r, lw, { x: .3 }); break;
    }
    default: glossBody(r, col, lx, ly, lw, circle(r)); face(e, r, lw);
  }
  if (G && !e.phased && d.world === undefined) wearHat(e, r, lw, t); // les virus exclusifs d'un monde ont déjà leur propre look
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
  (GD || ctx).drawImage(c, x - r, y - r, r * 2, r * 2);
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
    } else if (o.kind === 'crt') { // écran cathodique qui affiche du texte vert
      const x0 = o.x + .25, y0 = o.y + .22, w0 = 1.5, h0 = 1.3;
      ctx.save(); ctx.beginPath(); rr(ctx, x0, y0, w0, h0, .18); ctx.clip();
      ctx.fillStyle = '#031a06'; ctx.fillRect(x0, y0, w0, h0);
      ctx.fillStyle = 'rgba(118,255,3,.85)'; ctx.font = 'bold .14px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const lines = ['C:\\> SCAN', 'VIRUS : ' + G.enemies.length, 'VAGUE ' + G.wave, 'PV : ' + G.lives, (Math.floor(t * 2) % 2 ? '_' : ' ')];
      lines.forEach((l, i) => ctx.fillText(l, x0 + .1, y0 + .1 + i * .22));
      ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let yy = y0; yy < y0 + h0; yy += .06) ctx.fillRect(x0, yy, w0, .02);
      ctx.restore();
    } else if (o.kind === 'cumulus') { // nuage qui ondule
      for (let k = 0; k < 5; k++) { const a = k * 1.3 + t * .4; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * .35, cy + Math.sin(a * 1.3) * .2, .45 + .05 * Math.sin(t + k), 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(180,200,230,.6)'; ctx.beginPath(); ctx.ellipse(cx, cy + .35, .75, .2, 0, 0, TAU); ctx.fill();
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
  } else if (th === 'retro') { // pixels qui tombent
    ctx.globalCompositeOperation = 'source-over';
    for (const p of A) { const y = ((p.y + t * p.spd * .5) % (ROWS + 1) + ROWS + 1) % (ROWS + 1) - .5; ctx.fillStyle = ['rgba(255,109,0,.5)', 'rgba(118,255,3,.45)', 'rgba(255,171,0,.5)'][Math.floor(p.ph) % 3]; ctx.fillRect(Math.round(p.x * 4) / 4, Math.round(y * 4) / 4, .12, .12); }
  } else if (th === 'cloud') { // petits nuages qui passent
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 10; i++) { const p = A[i], x = ((p.x + t * p.spd * .3) % (COLS + 3) + COLS + 3) % (COLS + 3) - 1.5; ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + k * .35, p.y + Math.sin(k) * .1, .3 + p.s * .2, 0, TAU); ctx.fill(); } }
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
  if (G.boltW) { // la foudre va tomber ici
    const k = .5 + .5 * Math.sin(G.time * 22);
    ctx.strokeStyle = 'rgba(255,245,157,' + (.4 + .5 * k).toFixed(2) + ')'; ctx.lineWidth = .07; ctx.setLineDash([.2, .12]); ctx.beginPath(); ctx.arc(G.boltW.x, G.boltW.y, 1.3, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '900 .8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,245,157,' + (.5 + .4 * k).toFixed(2) + ')'; ctx.fillText('⚡', G.boltW.x, G.boltW.y);
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
    ctx.fillStyle = inC ? 'rgba(255,235,59,.32)' : n ? CBC().cov + Math.min(.32, .08 + n * .06).toFixed(2) + ')' : CBC().nocov;
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
  for (const m of G.mines) { // mines posées
    const x = m.sx + (m.x - m.sx) * m.k, y = m.sy + (m.y - m.sy) * m.k - Math.sin(m.k * Math.PI) * .6;
    softShadow(ctx, x + .03, y + .05, .14, .1, .5);
    ctx.fillStyle = '#2e3a23'; ctx.beginPath(); ctx.arc(x, y, .14, 0, TAU); ctx.fill(); ctx.lineWidth = .03; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = m.col; ctx.lineWidth = .025; ctx.beginPath(); ctx.arc(x, y, .1, 0, TAU); ctx.stroke();
    const on = m.arm <= 0 && Math.sin(G.time * 8 + m.x * 3) > 0; ctx.fillStyle = on ? '#ff1744' : m.arm > 0 ? '#ffd740' : '#5d0000'; ctx.beginPath(); ctx.arc(x, y, .04, 0, TAU); ctx.fill();
  }
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
      ctx.fillStyle = ok ? CBC().ok : CBC().bad; ctx.fillRect(hx, hy, 1, 1);
      if (ok) {
        ctx.globalAlpha = .5; ctx.save(); ctx.translate(hx + .5, hy + .5); drawTower(ctx, G.tool, 1, -Math.PI / 2, G.time, 0); ctx.restore(); ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .04; ctx.setLineDash([.15, .1]); ctx.beginPath(); ctx.arc(hx + .5, hy + .5, tStats(G.tool, 1).range, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }
  for (const f of G.fx) if (f.kind === 'bad') { ctx.fillStyle = 'rgba(' + CBC().rgb + ',' + (f.life / f.max * .6) + ')'; ctx.fillRect(f.x, f.y, 1, 1); }
  // virus au sol (sous les tourelles qui débordent un peu)
  for (const e of G.enemies) if (!e.fly) drawEnemy(e);
  // cases bonus (éditeur de niveaux) : +30 % de dégâts pour la tourelle posée dessus
  if (G.bonus) for (const k of G.bonus) {
    const x = k % COLS, y = Math.floor(k / COLS), pu = .5 + .5 * Math.sin(G.time * 3 + k);
    ctx.fillStyle = 'rgba(255,215,64,' + (.12 + .1 * pu).toFixed(2) + ')'; ctx.fillRect(x + .04, y + .04, .92, .92);
    ctx.strokeStyle = 'rgba(255,215,64,' + (.55 + .35 * pu).toFixed(2) + ')'; ctx.lineWidth = .045; ctx.setLineDash([.16, .1]); ctx.strokeRect(x + .08, y + .08, .84, .84); ctx.setLineDash([]);
    if (!G.towerAt[y][x]) star(ctx, x + .5, y + .5, .16);
  }
  // tourelles
  for (const t of G.towers) {
    const age = G.time - t.born; ctx.save(); ctx.translate(t.x + .5, t.y + .5);
    if (age < 1.2) placeAnim(t, age, true);
    if (t.lvl >= TMAX) {
      const pb = t.path === 1;
      ctx.globalCompositeOperation = 'lighter'; glowDot(0, 0, .75 + Math.sin(G.time * 4) * .05, pb ? 'rgba(64,196,255,.35)' : 'rgba(255,215,64,.35)'); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = pb ? 'rgba(64,196,255,.85)' : 'rgba(255,215,64,.8)'; ctx.lineWidth = .035; ctx.setLineDash([.12, .09]); ctx.lineDashOffset = -G.time * .6;
      ctx.beginPath(); ctx.arc(0, 0, .58, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    drawTower(ctx, t.type, t.lvl, t.ang, G.time, t.flash || 0, true);
    if (age < 1.2) { ctx.globalAlpha = 1; placeAnim(t, age, false); }
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
  const PST = curStyle();
  for (const p of G.projs) if (p.kind === 'shell') {
    const sc = 1 + (p.h || 0) * .9;
    if (PST === 'retro') rock(ctx, p.x, p.y, .1 * sc, -.7, -.7, 2);
    else if (PST === 'ice') { ball(ctx, p.x, p.y, .1 * sc, '#e3f2fd', -.7, -.7, '#ffffff'); ctx.lineWidth = .015; ctx.strokeStyle = '#5c8fb3'; ctx.stroke(); }
    else if (PST === 'neo') { ctx.globalCompositeOperation = 'lighter'; glowDot(p.x, p.y, .22 * sc, 'rgba(200,120,255,.7)'); ctx.globalCompositeOperation = 'source-over'; ball(ctx, p.x, p.y, .07 * sc, '#2a0f4a', -.7, -.7, '#ea80fc'); }
    else { ball(ctx, p.x, p.y, .085 * sc, '#3a3f44', -.7, -.7, '#9aa4aa'); glowDot(p.x - .06, p.y - .06, .07, 'rgba(255,170,0,.8)'); }
  }
  if (PST === 'retro') for (const p of G.projs) if (p.kind === 'bullet') { // carreaux d'arbalète
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.ly - p.y, p.lx - p.x)); arrowBolt(ctx, -.16, .08, 0); ctx.restore();
  }
  for (const p of G.projs) if (p.kind === 'missile' && PST === 'retro') { // boule de feu du trébuchet
    ctx.globalCompositeOperation = 'lighter'; glowDot(p.x, p.y, .22, 'rgba(255,110,0,.8)', 'rgba(255,235,160,.95)'); ctx.globalCompositeOperation = 'source-over';
    rock(ctx, p.x, p.y, .06, -.7, -.7, 4);
  } else if (p.kind === 'missile' && PST === 'neo') { // mini-drone
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a || 0);
    ctx.globalCompositeOperation = 'lighter'; glowDot(-.1, 0, .14, 'rgba(120,200,255,.8)'); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#141a2c'; ctx.beginPath(); ctx.moveTo(.13, 0); ctx.lineTo(-.08, -.09); ctx.lineTo(-.04, 0); ctx.lineTo(-.08, .09); ctx.closePath(); ctx.fill();
    ctx.lineWidth = .02; ctx.strokeStyle = p.col; ctx.stroke(); ctx.restore();
  } else if (p.kind === 'missile') { // petite fusée
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
    if (p.kind === 'shell' || p.kind === 'missile' || (PST === 'retro' && p.kind === 'bullet')) continue;
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
    } else if (f.kind === 'shock') { // onde de choc + éclair
      const u = 1 - k;
      ctx.globalAlpha = k; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = .08 * k + .01;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (.25 + u * .9), 0, TAU); ctx.stroke();
      if (u < .35) glowDot(f.x, f.y, f.r * .7, 'rgba(255,250,220,' + (.7 * (1 - u / .35)).toFixed(2) + ')');
      ctx.globalAlpha = 1;
    } else if (f.kind === 'cpuhit') {
      glowDot(f.x, f.y, 1.6 * (1.2 - k * .2), 'rgba(' + CBC().rgb + ',' + (.7 * k).toFixed(2) + ')', 'rgba(255,255,255,' + (.6 * k).toFixed(2) + ')');
    } else if (f.kind === 'ring') {
      if (f.delay && f.max - f.life < f.delay) continue;
      const R = f.r * (1.15 - k * .65);
      const g = ctx.createRadialGradient(f.x, f.y, R * .2, f.x, f.y, R);
      g.addColorStop(0, 'rgba(255,255,220,' + .55 * k + ')'); g.addColorStop(.6, f.col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = k; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  for (const q of G.parts) if (!q.smoke && !q.goo && !q.fire && !q.deb) {
    const k = q.life / q.max; ctx.globalAlpha = k; ctx.strokeStyle = q.col; ctx.lineWidth = q.size;
    ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * .035, q.y - q.vy * .035); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const q of G.parts) if (q.goo) { // gouttes de virus
    const k = q.life / q.max; ctx.globalAlpha = Math.min(1, k * 2);
    ctx.fillStyle = q.col; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * (1 + (1 - k) * .4), q.size * .8, Math.atan2(q.vy, q.vx), 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(q.x - q.size * .3, q.y - q.size * .3, q.size * .3, 0, TAU); ctx.fill();
  }
  // débris de destruction selon le monde
  for (const q of G.parts) if (q.deb) {
    const k = q.life / q.max, s = q.size; ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.save(); ctx.translate(q.x, q.y);
    switch (q.deb) {
      case 'px': ctx.fillStyle = q.col; ctx.fillRect(-s, -s, s * 2, s * 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-s, s * .4, s * 2, s * .6); break; // pixels 8 bits
      case 'ember': ctx.globalCompositeOperation = 'lighter'; glowDot(0, 0, s * 2.4 * (.5 + k * .5), 'rgba(255,120,0,.9)', 'rgba(255,240,170,1)'); break;
      case 'shard': ctx.rotate(q.rot); ctx.fillStyle = 'rgba(225,248,255,.95)'; ctx.beginPath(); ctx.moveTo(s * 1.8, 0); ctx.lineTo(-s, -s * .8); ctx.lineTo(-s * .6, s * .9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(80,150,200,.8)'; ctx.lineWidth = s * .25; ctx.stroke(); break;
      case 'spark': ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = k > .5 ? '#ffffff' : '#ffe57f'; ctx.lineWidth = s * .5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-q.vx * .06, -q.vy * .06); ctx.stroke(); break;
      case 'glitch': ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = (q.ch === '0' ? 'rgba(255,43,214,' : 'rgba(0,229,255,') + (.9 * k).toFixed(2) + ')'; ctx.fillRect(-s * 2.5 + Math.sin(q.life * 40) * s, -s * .5, s * 5, s); break;
      case 'feather': ctx.rotate(q.rot * .3); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, s * 2.2, s * .8, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(120,150,190,.7)'; ctx.lineWidth = s * .2; ctx.beginPath(); ctx.moveTo(-s * 2.4, 0); ctx.lineTo(s * 2, 0); ctx.stroke(); break;
      case 'bit': ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#64ffda'; ctx.font = '900 ' + (s * 3.4).toFixed(3) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.ch, 0, 0); break;
      default: ctx.rotate(q.rot); ctx.fillStyle = q.ch === '0' ? '#d08a3c' : q.col; ctx.fillRect(-s * 1.2, -s * .6, s * 2.4, s * 1.2); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-s * 1.2, -s * .6, s * 2.4, s * .35); // éclats de cuivre
    }
    ctx.restore();
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
  // pastilles des virus spéciaux (qui viser en premier)
  ctx.font = '900 ' + Math.round(clamp(T * .3, 9, 13)) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const e of G.enemies) {
    const bd = BADGE[e.type]; if (!bd || e.dead) continue;
    const [sx, sy] = toScreen(e.x, e.y), bx = sx + T * e.r * .9, by = sy - T * e.r * .9, br = clamp(T * .2, 6, 9);
    ctx.fillStyle = bd[1]; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(bd[0], bx, by + .5);
  }
  // alerte : virus tout près du processeur
  let danger = 0;
  for (const e of G.enemies) if (!e.dead && e.route.length - 1 - e.ri <= 4) { danger++; const ex = e.route[e.route.length - 1], [sx, sy] = toScreen(ex[0] + .5, ex[1] + .5), a = .5 + .5 * Math.sin(G.time * 14); ctx.strokeStyle = 'rgba(255,40,40,' + (.4 + .5 * a).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, T * (.8 + .15 * a), 0, TAU); ctx.stroke(); }
  if (danger && !G.demo && !G.over) {
    const a = .5 + .5 * Math.sin(G.time * 10), g = ctx.createRadialGradient(L.ax + L.aw / 2, L.ay + L.ah / 2, Math.min(L.aw, L.ah) * .4, L.ax + L.aw / 2, L.ay + L.ah / 2, Math.max(L.aw, L.ah) * .75);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,0,0,' + (.12 + .1 * a).toFixed(2) + ')'); ctx.fillStyle = g; ctx.fillRect(L.ax, L.ay, L.aw, L.ah);
    if (G.time - (G.dangerT || -9) > 4) { G.dangerT = G.time; sfx('leak'); }
  }
  for (const e of G.enemies) {
    if (e.hp >= e.max) continue;
    const [sx, sy] = toScreen(e.x, e.y), w = T * (isBoss(e) ? 1.2 : .6), y = sy - T * e.r - 10, k = e.hp / e.max;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(ctx, sx - w / 2 - 1.5, y - 1.5, w + 3, 6, 2); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + 3); const col = k > .5 ? CBC().hp[0] : k > .25 ? '#ffca28' : CBC().hp[1];
    g.addColorStop(0, shade(col, .4)); g.addColorStop(1, shade(col, -.3)); ctx.fillStyle = g; ctx.fillRect(sx - w / 2, y, w * k, 3);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 ' + Math.max(11, T * .36) + 'px system-ui';
  const baseFont = ctx.font;
  for (const t of G.texts) {
    const [sx, sy] = toScreen(t.x, t.y); ctx.globalAlpha = Math.min(1, t.life * 2);
    if (t.small) { ctx.save(); ctx.font = '800 ' + Math.max(9, T * .26) + 'px system-ui'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(t.t, sx, sy); ctx.fillStyle = t.col; ctx.fillText(t.t, sx, sy); ctx.restore(); continue; }
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
    g.addColorStop(0, 'rgba(' + CBC().rgb + ',0)'); g.addColorStop(1, 'rgba(' + CBC().rgb + ',' + (f.life / f.max * .5) + ')');
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
  if (G.recap && !G.over && !G.banner) {
    const r = G.recap, a = Math.min(1, r.life / .4, (r.max - r.life) / .2), txt = r.t + '  ·  ' + r.parts.join('  ·  ');
    ctx.save(); ctx.globalAlpha = a; ctx.font = '800 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = 13; const mw = L.aw - 30; while (ctx.measureText(txt).width + 28 > mw && fs > 9) { fs -= .5; ctx.font = '800 ' + fs + 'px system-ui'; }
    const w = ctx.measureText(txt).width + 28, sx = L.ax + L.aw / 2, sy = L.ay + L.ah * .26 + (L.sT || 0);
    ctx.fillStyle = 'rgba(6,10,12,.88)'; rr(ctx, sx - w / 2, sy - 15, w, 30, 15); ctx.fill();
    ctx.strokeStyle = r.bad ? 'rgba(255,82,82,.8)' : 'rgba(105,240,174,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, sx, sy + .5); ctx.restore();
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
