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

// --- musique : séquenceur simple (basse, arpège, mélodie, batterie) composé par le jeu ---
const MUS = { next: 0, step: 0, mode: 'menu', vol: 0 };
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
// 3 ambiances : menu (calme), jeu, boss (plus rapide et plus sombre). Accords = notes MIDI de la fondamentale.
const SONGS = {
  menu: { bpm: 92, chords: [57, 53, 60, 55], minor: [1, 0, 0, 0], drums: 0, lead: [0, 3, 7, 10, 7, 3, 5, 3] },
  game: { bpm: 120, chords: [57, 57, 53, 55, 57, 60, 55, 52], minor: [1, 1, 0, 0, 1, 0, 0, 1], drums: 1, lead: [12, 10, 7, 10, 12, 15, 14, 10] },
  boss: { bpm: 138, chords: [52, 52, 53, 50], minor: [1, 1, 0, 1], drums: 2, lead: [12, 13, 12, 10, 7, 8, 7, 3] }
};
// une musique de jeu par monde (tempo, accords, timbres)
const WSONGS = {
  forge: { bpm: 128, chords: [52, 52, 55, 50, 52, 48, 50, 47], minor: [1, 1, 0, 0, 1, 0, 0, 0], drums: 2, lead: [12, 15, 12, 10, 7, 10, 12, 15], arp: 'sawtooth', bass: 'sawtooth' },
  data: { bpm: 136, chords: [60, 57, 53, 55], minor: [0, 1, 0, 0], drums: 1, lead: [7, 12, 14, 19, 14, 12, 7, 5], arp: 'square' },
  rack: { bpm: 112, chords: [50, 50, 53, 48], minor: [1, 1, 0, 0], drums: 1, lead: [0, 3, 5, 7, 5, 3, 0, 3], arp: 'triangle' },
  ice: { bpm: 96, chords: [62, 59, 55, 57], minor: [0, 1, 0, 0], drums: 1, lead: [12, 14, 16, 19, 16, 14, 12, 7], arp: 'sine', pad: true },
  retro: { bpm: 140, chords: [60, 60, 57, 55, 53, 55, 57, 55], minor: [0, 0, 1, 0, 0, 0, 1, 0], drums: 1, lead: [12, 16, 19, 24, 19, 16, 12, 14], arp: 'square', bass: 'square' },
  cloud: { bpm: 104, chords: [64, 60, 57, 62], minor: [0, 0, 1, 1], drums: 1, lead: [12, 14, 16, 19, 21, 19, 16, 14], arp: 'triangle', pad: true },
  neon: { bpm: 124, chords: [57, 53, 48, 55], minor: [1, 0, 0, 0], drums: 1, lead: [12, 10, 12, 15, 17, 15, 12, 10], arp: 'sawtooth', bass: 'square' }
};
function musicTick() {
  if (!AC) return;
  const want = save.music ? (state === 'pause' ? .35 : 1) * .32 * (save.musVol ?? .8) : 0;
  SFXG.gain.value = save.sound ? (save.sfxVol ?? 1) : 0;
  MUS.vol += (want - MUS.vol) * .05; MUSG.gain.value = MUS.vol;
  if (MUS.vol < .002) { MUS.next = AC.currentTime + .05; return; }
  const mode = (G && !G.demo && (state === 'play' || state === 'pause')) ? ((G.enemies.some(isBoss) || G.alarm > 0) ? 'boss' : 'game') : 'menu';
  const mkey = mode + (G ? G.th : '');
  if (mkey !== MUS.key) { MUS.key = mkey; MUS.mode = mode; MUS.step = 0; }
  const S = MUS.mode === 'game' && G && WSONGS[G.th] ? WSONGS[G.th] : SONGS[MUS.mode], spb = 60 / S.bpm / 4; // durée d'une double-croche
  if (MUS.next < AC.currentTime - .2) MUS.next = AC.currentTime + .02;
  while (MUS.next < AC.currentTime + .18) {
    const st = MUS.step, t = MUS.next, bar = Math.floor(st / 16) % S.chords.length, b = st % 16;
    const root = S.chords[bar], minor = S.minor[bar], third = minor ? 3 : 4, tri = [0, third, 7, 12];
    // basse
    if (b % 4 === 0 || (S.drums && b % 4 === 3 && b !== 15)) tone(NOTE(root - 24 + (b === 8 ? 7 : 0)), spb * (b % 4 ? 1 : 2.5), S.bass || 'triangle', S.bass ? .18 : .5, 0, t, MUSG);
    // arpège
    if (S.drums || b % 2 === 0) tone(NOTE(root + tri[(b + bar) % 4] + 12), spb * 1.6, S.arp || 'square', S.arp === 'sine' ? .12 : .07, 0, t, MUSG, true);
    // nappe (menu, monde glacé)
    if ((!S.drums || S.pad) && b === 0) for (const iv of [0, third, 7]) tone(NOTE(root + iv), spb * 15, 'sine', .09, 0, t, MUSG);
    // mélodie (une note par temps, une mesure sur deux)
    if (bar % 2 === 1 && b % 4 === 0) { const n = S.lead[(b / 4 + bar * 2) % S.lead.length]; tone(NOTE(root + 12 + n - (minor ? 0 : (n === 3 || n === 15 ? -1 : 0))), spb * 3, 'sawtooth', .05, 0, t, MUSG, true); }
    // batterie
    if (S.drums) {
      if (b === 0 || b === 8 || (S.drums > 1 && (b === 6 || b === 10))) tone(150, .18, 'sine', .7, 40, t, MUSG);
      if (b === 4 || b === 12) noise(.14, .3, 2500, t, MUSG, 'bandpass', 900);
      if (b % 2 === 0) noise(.035, .12, 9000, t, MUSG, 'highpass', 6000);
    }
    MUS.next += spb; MUS.step++;
  }
}
