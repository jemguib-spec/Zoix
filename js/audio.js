'use strict';
/* Virus Défense — son : bruitages et musique générés */
/* ---------------- son : bruitages synthétisés + musique générée ---------------- */
let AC = null, NOISE = null, MASTER = null, SFXG = null, MUSG = null, ECHO = null; const lastS = {};
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    NOISE = AC.createBuffer(1, AC.sampleRate * .6, AC.sampleRate);
    const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    MASTER = AC.createGain(); MASTER.gain.value = .9; MASTER.connect(comp).connect(AC.destination);
    SFXG = AC.createGain(); SFXG.gain.value = 1; SFXG.connect(MASTER);
    MUSG = AC.createGain(); MUSG.gain.value = 0; MUSG.connect(MASTER);
    // petit écho pour donner de l'espace
    ECHO = AC.createDelay(1); ECHO.delayTime.value = .22;
    const fb = AC.createGain(); fb.gain.value = .28; const ef = AC.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 2200;
    ECHO.connect(ef).connect(fb).connect(ECHO); const ew = AC.createGain(); ew.gain.value = .35; ef.connect(ew).connect(MASTER);
    MUS.next = AC.currentTime + .1;
  } catch (e) { AC = null; }
}
// oscillateur avec enveloppe ; dest = SFXG par défaut, at = instant de départ
function tone(f, dur, type, vol, f2, at, dest, echo) {
  const t = at || AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(.01, dur / 4)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(dest || SFXG); if (echo) g.connect(ECHO); o.start(t); o.stop(t + dur + .03);
}
function noise(dur, vol, freq, at, dest, type, f2) {
  const t = at || AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE; s.playbackRate.value = .8 + Math.random() * .4;
  f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(f2 || 80, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(dest || SFXG); s.start(t, Math.random() * .3); s.stop(t + dur + .02);
}
function sfx(n, p) {
  if (!AC || !save.sound || (G && G.demo)) return;
  const now = performance.now(); if (lastS[n] && now - lastS[n] < 70) return; lastS[n] = now;
  const t = AC.currentTime;
  if (TOWERS[n] && themedSfx(n, t)) return;
  switch (n) {
    case 'pulse': tone(880, .07, 'square', .025, 330); noise(.03, .03, 3000); break;
    case 'gatling': noise(.04, .05, 2500, 0, 0, 'bandpass', 900); tone(160, .04, 'square', .02, 90); break;
    case 'cannon': tone(110, .25, 'sine', .22, 40); noise(.3, .12, 1200); break;
    case 'frost': tone(2200, .18, 'sine', .03, 3300, 0, 0, true); tone(1650, .2, 'triangle', .02, 2600, t + .03); break;
    case 'laser': tone(2400, .22, 'sawtooth', .03, 180, 0, 0, true); tone(1200, .22, 'square', .015, 90); break;
    case 'tesla': noise(.16, .1, 5000, 0, 0, 'highpass', 1200); tone(70, .14, 'square', .035, 140); break;
    case 'missile': noise(.45, .07, 400, 0, 0, 'bandpass', 2500); tone(300, .4, 'sawtooth', .015, 900); break;
    case 'flame': noise(.12, .05, 900, 0, 0, 'lowpass', 300); break;
    case 'vortex': tone(90, .5, 'sine', .12, 40, 0, 0, true); tone(600, .4, 'triangle', .03, 120); break;
    case 'pop': { const k = Math.pow(1.06, Math.min(24, p || 0)); tone(320 * k, .09, 'sine', .07, 900 * k); tone(640 * k, .06, 'triangle', .03, 1400 * k, t + .02); break; }
    case 'boom': noise(.8, .3, 2600); tone(90, .7, 'sine', .22, 28); break;
    case 'leak': tone(440, .12, 'square', .05, 220); tone(330, .25, 'sawtooth', .05, 110, t + .1); break;
    case 'build': tone(220, .06, 'square', .04, 440); tone(660, .12, 'triangle', .05, 990, t + .05, 0, true); break;
    case 'up': [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .06, 0, t + i * .06, 0, true)); break;
    case 'sell': tone(1046, .08, 'sine', .06); tone(1568, .14, 'sine', .05, 0, t + .07, 0, true); break;
    case 'coin': tone(1318, .06, 'square', .02); tone(1976, .12, 'square', .02, 0, t + .05); break;
    case 'err': tone(180, .12, 'square', .05); tone(140, .16, 'square', .05, 0, t + .1); break;
    case 'wave': [392, 523, 659].forEach((f, i) => tone(f, .18, 'sawtooth', .04, 0, t + i * .09, 0, true)); break;
    case 'alarm': for (let i = 0; i < 3; i++) { tone(660, .22, 'square', .05, 440, t + i * .45); tone(880, .2, 'square', .03, 587, t + i * .45 + .22); } break;
    case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, .3, 'triangle', .08, 0, t + i * .11, 0, true)); break;
    case 'lose': [440, 392, 349, 294, 220].forEach((f, i) => tone(f, .4, 'sawtooth', .05, f * .97, t + i * .18, 0, true)); noise(1, .15, 1500, t + .9); break;
  }
}
function vibe(ms) { if (G && G.demo) return; if (save.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }

// --- bruitages des tourelles selon le style du monde (médiéval, néon, glace, militaire) ---
function themedSfx(n, t) {
  let fam = typeof curStyle === 'function' ? curStyle() : 'modern';
  if (fam === 'glass') fam = 'neo'; else if (fam === 'sky') fam = 'ice';
  if (fam === 'retro') switch (n) {
    case 'pulse': case 'gatling': tone(n === 'pulse' ? 196 : 247, .1, 'triangle', .07, 130); noise(.09, .05, 4000, t + .01, 0, 'highpass', 1500); return true; // corde d'arc + sifflement
    case 'cannon': tone(95, .12, 'sawtooth', .03, 70); tone(70, .3, 'sine', .25, 35, t + .05); noise(.25, .1, 500, t + .05); return true;  // grincement + choc
    case 'missile': noise(.5, .08, 300, 0, 0, 'bandpass', 1400); tone(55, .35, 'sine', .2, 30); return true;
    case 'frost': for (let i = 0; i < 3; i++) tone(500 + Math.random() * 500, .07, 'sine', .04, 900, t + i * .04); return true; // bulles
    case 'flame': noise(.16, .07, 700, 0, 0, 'lowpass', 200); tone(85, .14, 'sawtooth', .03, 60); return true; // rugissement
    case 'laser': [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .18, 'sine', .03, 0, t + i * .03, 0, true)); return true; // magie
    case 'tesla': tone(1800, .25, 'sine', .04, 300, 0, 0, true); noise(.12, .06, 6000, 0, 0, 'highpass', 2000); return true;
    case 'vortex': noise(.6, .1, 300, 0, 0, 'bandpass', 1200); return true; // vent
  }
  if (fam === 'neo') switch (n) {
    case 'pulse': tone(1500, .09, 'sine', .05, 380); return true; // « piou »
    case 'gatling': tone(980, .045, 'square', .02, 620); return true;
    case 'cannon': tone(80, .35, 'sine', .28, 32); tone(240, .2, 'sawtooth', .02, 60); return true;
    case 'laser': tone(3000, .28, 'sawtooth', .025, 120, 0, 0, true); tone(90, .25, 'sine', .1, 45); return true;
    case 'missile': tone(420, .3, 'square', .015, 700); tone(436, .3, 'square', .015, 720); return true; // drones
    case 'tesla': for (let i = 0; i < 4; i++) tone(2000 + i * 400, .04, 'square', .015, 600, t + i * .025); return true;
  }
  if (fam === 'ice') switch (n) {
    case 'pulse': case 'gatling': tone(n === 'pulse' ? 2637 : 3136, .08, 'triangle', .035, 1800, 0, 0, true); return true; // tintement de glace
    case 'cannon': noise(.25, .12, 900, 0, 0, 'lowpass', 150); tone(120, .2, 'sine', .15, 50); return true; // boule de neige
    case 'frost': noise(.4, .06, 3000, 0, 0, 'bandpass', 600); return true; // blizzard
    case 'laser': tone(1760, .35, 'sine', .04, 2640, 0, 0, true); tone(2217, .35, 'sine', .03, 3300, t + .05, 0, true); return true;
  }
  if (fam === 'mil') switch (n) {
    case 'pulse': noise(.06, .12, 5000, 0, 0, 'highpass', 1500); tone(130, .06, 'sine', .1, 60); return true; // coup de fusil
    case 'gatling': noise(.035, .08, 4000, 0, 0, 'bandpass', 1200); tone(90, .03, 'square', .03, 60); return true;
    case 'cannon': tone(500, .3, 'sine', .02, 300); tone(75, .3, 'sine', .3, 30, t + .03); noise(.35, .15, 900, t + .03); return true; // mortier
    case 'laser': noise(.1, .16, 6000, 0, 0, 'highpass', 2000); tone(110, .3, 'sine', .14, 40); noise(.6, .04, 1500, t + .08, 0, 'lowpass', 200); return true; // sniper + écho
    case 'missile': noise(.5, .1, 1200, 0, 0, 'bandpass', 3000); return true;
  }
  return false;
}

/* ---------------- musique ----------------
   Petit studio génératif : chaque monde a son morceau (tonalité, accords, rythme, instruments),
   une mélodie composée par le jeu (motif répété et varié), et la musique s'adapte à l'action :
   ambiance calme entre les vagues, morceau complet pendant les vagues, thème spécial pour les boss. */
const MUS = { next: 0, step: 0, key: null, vol: 0, cache: {} };
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], phryg: [0, 1, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
// prog = degrés de la gamme (accords construits automatiquement dans la gamme)
// motifs rythmiques sur 16 doubles-croches : x = coup, . = rien ; basse : r fondamentale, o octave, f quinte
const SONGS = {
  menu: { bpm: 84, key: 57, scale: 'dorian', prog: [0, 5, 2, 4], swing: .14, kick: 'x.........x.....', snare: '....x.......x...', hat: '..x...x...x...x.', bass: 'r.......r...f...', pad: 'warm', arp: 'bell', arpPat: 'x..x..x.x..x..x.', lead: 'soft', seed: 3, snareKind: 'rim' },
  pcb: { bpm: 118, key: 50, scale: 'minor', prog: [0, 5, 2, 6], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...xx', bass: 'r.ro..r.r.ro..rf', pad: 'saw', arp: 'pluck', arpPat: 'x.xxx.xxx.xxx.xx', lead: 'saw', seed: 11 },
  forge: { bpm: 132, key: 52, scale: 'phryg', prog: [0, 0, 5, 6, 0, 0, 1, 6], kick: 'x.x...x.x.x...x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'rrr.rrr.rrr.rro.', pad: 'dark', arp: 'stab', arpPat: 'x.....x...x.....', lead: 'fuzz', seed: 23, dist: true },
  data: { bpm: 136, key: 48, scale: 'major', prog: [5, 3, 0, 4], kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', bass: 'r.o.r.o.r.o.r.o.', pad: 'saw', arp: 'pluck', arpPat: 'xxxxxxxxxxxxxxxx', lead: 'square', seed: 37 },
  rack: { bpm: 122, key: 50, scale: 'minor', prog: [0, 0, 3, 6], kick: 'x...x...x...x...', snare: '....x.......x..x', hat: '..x...x...x...x.', bass: 'r.rr.rr.r.rr.ro.', pad: null, arp: 'acid', arpPat: 'x.xx.x.xx.x.xx.x', lead: 'square', seed: 41, snareKind: 'clap' },
  ice: { bpm: 90, key: 55, scale: 'lydian', prog: [0, 1, 5, 4], kick: 'x.........x.....', snare: '........x.......', hat: '....x.......x...', bass: 'r.......f.......', pad: 'glass', arp: 'bell', arpPat: 'x.x.x.x.x.x.x.x.', lead: 'flute', seed: 53, snareKind: 'rim' },
  neon: { bpm: 112, key: 57, scale: 'minor', prog: [0, 5, 2, 6], kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'roroororoororoor', pad: 'saw', arp: 'pluck', arpPat: 'x.x.x.x.x.x.x.x.', lead: 'saw', seed: 61, pump: true },
  retro: { bpm: 144, key: 60, scale: 'major', prog: [0, 5, 3, 4], kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'r.o.r.o.f.o.r.o.', pad: null, arp: 'chip', arpPat: 'xxxxxxxxxxxxxxxx', lead: 'chip', seed: 71, chip: true },
  cloud: { bpm: 100, key: 52, scale: 'major', prog: [0, 4, 5, 3], swing: .1, kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.xxx.x.x.xxx.x.', bass: 'r......rr...f...', pad: 'warm', arp: 'pluck', arpPat: 'x..x..x...x..x..', lead: 'flute', seed: 83 },
  boss: { bpm: 150, key: 52, scale: 'phryg', prog: [0, 1, 0, 6], kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x.x.', hat: 'xxxxxxxxxxxxxxxx', bass: 'rrrrrrrrrrrrrrro', pad: 'dark', arp: 'stab', arpPat: 'x..x..x.x..x..x.', lead: 'fuzz', seed: 97, dist: true, pump: true }
};
let MUSG2 = null, MUSF = null, PUMP = null, REV = null, MDLY = null, PULSE = null, DIST = null;
function musBuses() {
  if (MUSF) return;
  MUSF = AC.createBiquadFilter(); MUSF.type = 'lowpass'; MUSF.frequency.value = 18000; MUSF.connect(MUSG);
  MUSG2 = AC.createGain(); MUSG2.gain.value = 1; MUSG2.connect(MUSF);
  PUMP = AC.createGain(); PUMP.connect(MUSG2); // bus « pompé » par la grosse caisse
  // réverbération : réponse impulsionnelle générée (bruit qui décroît)
  REV = AC.createConvolver(); const len = AC.sampleRate * 2.4, ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  REV.buffer = ir; const rg = AC.createGain(); rg.gain.value = .32; REV.connect(rg).connect(MUSF);
  MDLY = AC.createDelay(1); const fb = AC.createGain(), lp = AC.createBiquadFilter(), dw = AC.createGain();
  fb.gain.value = .32; lp.type = 'lowpass'; lp.frequency.value = 2600; dw.gain.value = .3; MDLY.connect(lp).connect(fb).connect(MDLY); lp.connect(dw).connect(MUSF);
  // onde « 8 bits » à 25 % de rapport cyclique
  const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let k = 1; k < N; k++) re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * .25);
  PULSE = AC.createPeriodicWave(re, im);
  DIST = AC.createWaveShaper(); const cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; cv[i] = Math.tanh(x * 4); } DIST.curve = cv; const dg = AC.createGain(); dg.gain.value = .38; DIST.connect(dg).connect(MUSG2);
}
// voix de synthé : oscillateurs (désaccordés), filtre avec enveloppe, enveloppe de volume, vibrato, envois d'effets
function voice(t, f, dur, o) {
  const g = AC.createGain(), oscs = [];
  for (const dt of (o.uni ? [-o.uni, o.uni] : [0])) {
    const os = AC.createOscillator(); if (o.wave === 'pulse') os.setPeriodicWave(PULSE); else os.type = o.wave;
    os.frequency.setValueAtTime(f, t); os.detune.value = dt; oscs.push(os);
  }
  let src = g;
  if (o.cut) {
    const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = o.q || .8;
    fl.frequency.setValueAtTime(Math.min(16000, o.cut * (o.env || 1)), t); fl.frequency.exponentialRampToValueAtTime(o.cut, t + (o.envT || .12));
    oscs.forEach(x => x.connect(fl)); fl.connect(g);
  } else oscs.forEach(x => x.connect(g));
  if (o.vib) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .008, t + .25); l.connect(lg); oscs.forEach(x => lg.connect(x.frequency)); l.start(t); l.stop(t + dur + (o.r || .1) + .05); }
  const a = o.a || .005, r = o.r || .08, v = o.vol;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + a);
  if (o.dec) g.gain.setTargetAtTime(v * (o.sus || 0), t + a, o.dec);
  g.gain.setValueAtTime(o.dec ? Math.max(.0001, v * (o.sus || .05)) : v, t + Math.max(a, dur)); g.gain.exponentialRampToValueAtTime(.0001, t + Math.max(a, dur) + r);
  for (const d of o.to) g.connect(d);
  oscs.forEach(x => { x.start(t); x.stop(t + Math.max(a, dur) + r + .05); });
}
// batterie
function kick(t, v) { tone(160, .2, 'sine', .9 * v, 42, t, MUSG2); tone(1200, .015, 'square', .05 * v, 300, t, MUSG2); }
function chipKick(t, v) { tone(220, .09, 'square', .32 * v, 50, t, MUSG2); }
function snare(t, v, kind, chip) {
  if (chip) { noise(.09, .3 * v, 6000, t, MUSG2, 'highpass', 2000); return; }
  if (kind === 'rim') { tone(1700, .03, 'triangle', .12 * v, 900, t, MUSG2); noise(.04, .12 * v, 3000, t, MUSG2, 'bandpass', 2500); return; }
  if (kind === 'clap') { for (let i = 0; i < 3; i++) noise(.05 + i * .03, .28 * v, 1600, t + i * .011, MUSG2, 'bandpass', 1100); noise(.25, .08 * v, 1500, t, REV, 'bandpass', 900); return; }
  noise(.16, .35 * v, 2200, t, MUSG2, 'bandpass', 900); tone(190, .09, 'triangle', .25 * v, 140, t, MUSG2); noise(.2, .08 * v, 2000, t, REV, 'bandpass', 800);
}
function hat(t, v, open) { noise(open ? .18 : .035, (open ? .09 : .1) * v, 10000, t, MUSG2, 'highpass', 7000); }
function duck(t, amt) { PUMP.gain.setValueAtTime(amt, t); PUMP.gain.setTargetAtTime(1, t + .02, .09); }
// instruments mélodiques
function inst(name, t, n, dur, vel, S) {
  const f = NOTE(n), v = vel || 1;
  switch (name) {
    case 'pluck': voice(t, f, .02, { wave: 'sawtooth', uni: 7, vol: .07 * v, cut: 700, env: 6, envT: .15, dec: .12, sus: .1, r: .25, to: [PUMP, MDLY] }); break;
    case 'bell': voice(t, f * 2, .02, { wave: 'sine', vol: .08 * v, dec: .35, sus: .05, r: .9, to: [PUMP, REV] }); voice(t, f * 5.4, .02, { wave: 'sine', vol: .015 * v, dec: .1, r: .3, to: [REV] }); break;
    case 'chip': voice(t, f, dur * .8, { wave: 'pulse', vol: .075 * v, r: .03, to: [MUSG2] }); break;
    case 'stab': voice(t, f, .12, { wave: 'sawtooth', uni: 12, vol: .06 * v, cut: 900, env: 4, envT: .1, r: .12, to: [S.dist ? DIST : PUMP, REV] }); break;
    case 'acid': voice(t, f, dur * .7, { wave: 'sawtooth', vol: .07 * v, cut: 260, env: 9, envT: .14, q: 9, r: .05, to: [PUMP, MDLY] }); break;
    case 'saw': voice(t, f, dur, { wave: 'sawtooth', uni: 9, vol: .055 * v, cut: 2200, env: 1.5, a: .01, r: .18, vib: dur > .2, to: [MUSG2, REV, MDLY] }); break;
    case 'square': voice(t, f, dur, { wave: 'square', vol: .04 * v, cut: 2600, a: .01, r: .12, vib: dur > .2, to: [MUSG2, REV, MDLY] }); break;
    case 'fuzz': voice(t, f, dur, { wave: 'sawtooth', uni: 14, vol: .05 * v, cut: 1500, a: .01, r: .12, vib: dur > .2, to: [DIST, REV] }); break;
    case 'flute': voice(t, f, dur, { wave: 'triangle', vol: .09 * v, a: .06, r: .3, vib: true, to: [MUSG2, REV, MDLY] }); break;
    case 'soft': voice(t, f, dur, { wave: 'triangle', vol: .07 * v, a: .03, r: .4, vib: true, to: [MUSG2, REV, MDLY] }); break;
  }
}
function padChord(t, notes, dur, kind) {
  const P = { warm: ['triangle', 0, 1400, .05], saw: ['sawtooth', 10, 1100, .028], dark: ['sawtooth', 14, 600, .035], glass: ['sine', 4, 0, .05] }[kind];
  for (const n of notes) voice(t, NOTE(n), dur, { wave: P[0], uni: P[1], vol: P[3], cut: P[2] || 0, a: dur * .3, r: dur * .4, to: [PUMP, REV] });
}
// génère (une fois) la mélodie d'un morceau : motif de 2 mesures répété et varié, notes d'accord sur les temps forts
function compose(S) {
  if (S.mel) return S.mel;
  let seed = S.seed * 9301 + 49297; const R = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const rhythms = [[0, 4, 6, 8, 12, 16, 20, 22, 24], [0, 3, 6, 8, 10, 12, 16, 19, 22, 24, 28], [0, 2, 4, 8, 12, 14, 16, 18, 20, 24], [0, 6, 8, 12, 16, 22, 24, 26, 28]];
  const rhy = rhythms[Math.floor(R() * rhythms.length)], rhy2 = rhythms[Math.floor(R() * rhythms.length)];
  const contour = rhy.map((p, i) => p % 8 === 0 ? [0, 2, 4, 7][Math.floor(R() * 4)] : Math.floor(R() * 7) - 1);
  const contour2 = rhy2.map((p, i) => p % 8 === 0 ? [0, 2, 4, 7][Math.floor(R() * 4)] : Math.floor(R() * 7) - 1);
  const mel = []; // { step (sur 8 mesures = 128), deg, len }
  const phrase = (start, rh, ct, vary) => rh.forEach((p, i) => {
    const nx = i + 1 < rh.length ? rh[i + 1] : 32, bar = Math.floor((start + p) / 16) % S.prog.length;
    let dg = S.prog[bar] + ct[i] + (vary && i >= rh.length - 2 ? (i % 2 ? 2 : -1) : 0);
    while (dg > 11) dg -= 7; while (dg < 3) dg += 7;
    mel.push({ step: start + p, deg: dg, len: Math.min(nx - p, 6) });
  });
  phrase(0, rhy, contour, false); phrase(32, rhy, contour, true); phrase(64, rhy2, contour2, false); phrase(96, rhy, contour, true);
  return (S.mel = mel);
}
const degNote = (S, d) => { const sc = SCALES[S.scale]; return S.key + 12 * Math.floor(d / 7) + sc[((d % 7) + 7) % 7]; };
const chordOf = (S, deg) => [0, 2, 4, 6].map(k => degNote(S, deg + k));
function musicTick() {
  if (!AC) return;
  musBuses();
  const paused = state === 'pause';
  const want = save.music ? (paused ? .5 : 1) * .36 * (save.musVol ?? .8) : 0;
  SFXG.gain.value = save.sound ? (save.sfxVol ?? 1) : 0;
  MUS.vol += (want - MUS.vol) * .05; MUSG.gain.value = MUS.vol;
  MUSF.frequency.value += ((paused ? 700 : 18000) - MUSF.frequency.value) * .08; // son étouffé en pause
  if (MUS.vol < .002) { MUS.next = AC.currentTime + .05; return; }
  const inGame = G && !G.demo && (state === 'play' || state === 'pause' || state === 'result');
  const boss = inGame && (G.enemies.some(isBoss) || G.alarm > 0);
  const want2 = !inGame ? 'menu' : boss ? 'boss' : (SONGS[G.th] ? G.th : 'pcb');
  if (MUS.next < AC.currentTime - .2) MUS.next = AC.currentTime + .02;
  while (MUS.next < AC.currentTime + .2) {
    // changement de morceau : au début d'une mesure (tout de suite pour un boss)
    if (want2 !== MUS.key && (MUS.key === null || MUS.step % 16 === 0 || (want2 === 'boss' && MUS.step % 4 === 0))) { MUS.key = want2; MUS.step = 0; }
    const S = SONGS[MUS.key], spb = 60 / S.bpm / 4, st = MUS.step, b = st % 16, bar = Math.floor(st / 16);
    const t = MUS.next + (b % 2 ? (S.swing || 0) * spb : 0), ci = bar % S.prog.length, deg = S.prog[ci], ch = chordOf(S, deg);
    // intensité : calme entre les vagues, complet pendant les vagues ; le menu alterne les sections
    const calm = MUS.key === 'menu' ? false : inGame && !boss && !G.enemies.length && !(G.queue && G.queue.length);
    const sec = Math.floor(bar / 8) % 4; // 0 intro légère, 1 complet, 2 avec mélodie, 3 pause rythmique
    const drums = !calm && !(sec === 3 && bar % 8 < 2) && !(bar < 2 && MUS.key !== 'boss');
    const leadOn = !calm && (sec >= 2 || MUS.key === 'boss' || MUS.key === 'menu');
    // nappe d'accords
    if (S.pad && b === 0) padChord(t, ch.slice(0, 3).map(n => n + (n < S.key ? 12 : 0)), spb * 16, S.pad);
    // batterie
    if (drums) {
      if (S.kick[b] === 'x') { if (S.chip) chipKick(t, 1); else kick(t, 1); if (S.pump || S.pad === 'saw') duck(t, .35); }
      if (S.snare[b] === 'x') snare(t, 1, S.snareKind, S.chip);
      if (S.hat[b] === 'x') hat(t, b % 4 === 2 ? 1 : .6, MUS.key === 'rack' && b % 4 === 2);
    } else if (calm && b % 8 === 4) hat(t, .3);
    // basse
    const bc = S.bass[b];
    if (bc !== '.' && (!calm || b % 8 === 0)) {
      const n = ch[0] - 24 + (bc === 'o' ? 12 : bc === 'f' ? 7 : 0) + (ch[0] - 24 < S.key - 30 ? 12 : 0);
      if (S.chip) voice(t, NOTE(n), spb * .9, { wave: 'triangle', vol: .3, r: .03, to: [MUSG2] });
      else voice(t, NOTE(n), spb * (bc === 'r' && S.bass[b + 1] === '.' ? 1.8 : .9), { wave: S.dist ? 'sawtooth' : 'sawtooth', uni: 5, vol: S.dist ? .09 : .13, cut: S.dist ? 500 : 320, env: 4, envT: .1, q: 3, r: .06, to: [S.dist ? DIST : MUSG2] });
    }
    // arpège
    if (S.arpPat[b] === 'x' && (sec !== 0 || MUS.key === 'menu' || calm || bar % 2)) {
      const up = [0, 1, 2, 3, 2, 1][(st) % 6], n = ch[up % 4] + (S.chip ? 12 : 12) + (b >= 8 && S.arp !== 'chip' ? 12 : 0);
      if (S.arp === 'chip') { for (let k = 0; k < 2; k++) inst('chip', t + k * spb / 2, ch[(st * 2 + k) % 3] + 12, spb / 2, .9, S); }
      else inst(S.arp, t, n, spb, calm ? .6 : 1, S);
    }
    // mélodie composée
    if (leadOn) { const mel = compose(S), pos = st % 128; for (const m of mel) if (m.step === pos) inst(S.lead, t, degNote(S, m.deg) + 12, spb * m.len * .9, calm ? .6 : 1, S); }
    MUS.next += spb; MUS.step++;
  }
}
