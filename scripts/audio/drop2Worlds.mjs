// Drop 2's chord voices, one short-decay family a world, and the sync hits the picture had no sound for (since 2026-10-02:
// a chord held behind everything reads as noise, and there was room for more sync hits). The model is
// break 1 FALL (sections/break.mjs): no bed, the glass is the rhythm, every sound a picture event,
// lots of space. So the pads, the air bed, the shine and the choirs are gone (sections/drop2.mjs), and the harmony is carried by:
//   the Z-buffer (3–4): FM pop chords on the beats where its world changes (the dimension pop, the Riso ground, donut.exe, the march);
//   Defender v2.0's blueprint (9): drafting plucks — clean, dry — one more chord tone on each exploded layer, the box's iv, the spill's V7♭9;
//   the woodblock wave (10–11): Edo since 2026-10-03 — the shamisen's 8ths on the chord bus (drop2Edo.mjs, in place of the koto's 16ths),
//   the boats' flung boxes, the cartouche re-signed;
//   the voxel well (13): a blocky bleep on every hard drop, climbing the chord as the well fills (FALL's plips, a bottle filling);
//   Memphis (14): a bouncy marimba on the 8ths, the props landing on the first four;
//   the pictograms (15): clean bells on his limbs' 45° steps, on the world's four roll snaps and on the contact sheet;
//   the mirror trap (16–17): FALL's glass a semitone up — a pane on 16.1&, two on 16.2, four on 16.3, eight on 16.4 down the IV chord as
//   the mirrors multiply, and the 32nd cascade rising into the clamp under the ∞ wallpaper; the star shattering on the give-up.
// The act-1 bars keep their stabs and arp (sections/drop2.mjs, now on the chord bus too); the arcade its chip arps; the reel as built.
// New sync hits where the picture moved in silence: Defender's red rows (1.2, 2.4&, 4.2&), the Riso plates registering (1.3), his look into
// the lens (4.3), the boats' flung boxes (10.3), the mountain's pulses (10.3&, 11.3&: its breath, a shakuhachi phrase each since 2026-10-03,
// placed by drop2Edo.mjs), the cartouche re-signed (11.2), the I-piece spawning
// (13.3&), the reticles spinning loose (17.2&), the star's cracks (17.3&) and its shatter (17.4).
// And the wall smash (M3, 2026-10-02: a sync sound for the wall on the right being smashed out; placed by sections/drop2.mjs bar 7): the wall's creak as it
// bows (7.3, following its motion since 2026-10-03), then on the snap (7.3&) a low thud, the CRT bezel's bitcrushed crack and its debris
// clattering away right. Before it (W, 2026-10-03: on screen the bar reaches the wall in stages, so the music hits each stage), a push on each stage the
// bar goes through (pushHit: 7.1, 7.2, 7.3, each heavier and higher; and since the fix round its clank, climbing the iii chord) and a
// crack step on each cell the border's crack widens (crackStep).
// Every voice adds into `out` from sample `at`, silent before it, deterministic for its seed (9000–9299). Called by sections/drop2.mjs.
import { rng } from '../../src/engine/random.ts';
import * as D from '../../src/score/drop2.ts';
import { FRAMES_PER_BEAT } from '../../src/score/tempo.ts';
import { beep, woodClack } from './drop2Act2Voices.mjs';
import { SVF } from './filters.mjs';
import { fmBell } from './fm.mjs';

const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};
const SIXTEENTH = FRAMES_PER_BEAT / 4;

// ——— Voices ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A pane of glass struck — FALL's tink (breakVoices.mjs tink, the same recipe so the mirror trap rings like the break's glass): an FM bell
 * with an inharmonic modulator (× 5.37) whose index dies in a few tens of ms, ringing for `decayMs`, plus a 3 ms tick of noise above 6 kHz.
 */
export function paneTink(out, at, sr, { freq, gain = 0.09, decayMs = 600, click = 0.35, seed = 9000 }) {
  fmBell(out, at, sr, { freq, gain, decay: decayMs / 3000, ratio: 5.37, index: 1.6, attackMs: 1 });
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.003 * sr);
  for (let i = 0; i < n + Math.round(0.002 * sr); i++) {
    f.process(i < n ? r() * 2 - 1 : 0, 6000, 0.7);
    put(out, at + i, gain * click * f.hp * (i < n ? 1 - i / n : 1));
  }
}

/**
 * A marimba bar on `freq`: the fundamental ringing over `decay` s, the bar's overtone tuned two octaves up (4 ×, as a marimba's bars are)
 * dying four times faster, and a faint tenth partial (10.7 ×) at once; a soft mallet (1.5 ms) with a hint of pitch drop, so it bounces.
 */
export function marimba(out, at, sr, { freq, gain = 0.1, decay = 0.12 }) {
  const n = Math.round(6 * decay * sr);
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const bend = 1 + 0.015 * Math.exp(-t / 0.006);
    p1 += (freq * bend) / sr;
    p2 += (4 * freq) / sr;
    p3 += (10.7 * freq) / sr;
    const v = Math.sin(2 * Math.PI * p1) * Math.exp(-t / decay) + 0.45 * Math.sin(2 * Math.PI * p2) * Math.exp(-t / (decay / 4)) + 0.12 * Math.sin(2 * Math.PI * p3) * Math.exp(-t / 0.004);
    put(out, at + i, gain * Math.min(1, t / 0.0015) * Math.min(1, (n - i) / (0.1 * n)) * v);
  }
}

/** Defender's drafting pluck (the blueprint, 9): a clean sine with its octave and twelfth, gone in about 250 ms, and the pen's tick. */
export function draftPluck(out, at, sr, { freq, gain = 0.05, decay = 0.045, seed = 9010 }) {
  const n = Math.round(0.3 * sr);
  const r = rng(seed);
  const tick = new SVF(sr);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    p += freq / sr;
    tick.process(i < 0.0015 * sr ? r() * 2 - 1 : 0, 4000, 0.8);
    const v = (Math.sin(2 * Math.PI * p) + 0.3 * Math.sin(4 * Math.PI * p) * Math.exp(-t / 0.02) + 0.1 * Math.sin(6 * Math.PI * p) * Math.exp(-t / 0.01)) * Math.exp(-t / decay);
    put(out, at + i, gain * (Math.min(1, t / 0.0005) * Math.min(1, (n - i) / (0.1 * n)) * v + 0.3 * tick.hp));
  }
}

/**
 * The voxel well's bleep: a square an octave up for its first block, then on `freq`, in four flat blocks of `ms` / 4 stepping down in level
 * (1, ¾, ½, ¼) — blocky, no curve — and stopping dead; through a 2-pole low-pass at 8 kHz (no aliased fizz up where the delivery's AAC
 * rings).
 */
export function bleep(out, at, sr, { freq, gain = 0.05, ms = 80 }) {
  const n = Math.round((ms / 1000) * sr);
  const block = Math.max(1, Math.floor(n / 4));
  const ramp = Math.round(0.0005 * sr);
  const lp = new SVF(sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const k = Math.min(3, Math.floor(i / block));
    ph = (ph + (k === 0 ? 2 * freq : freq) / sr) % 1;
    const edge = Math.min(1, (i + 1) / ramp, (n - i) / ramp);
    lp.process(gain * (1 - k / 4) * (ph < 0.5 ? 1 : -1), 8000, 0.7);
    put(out, at + i, edge * lp.lp);
  }
}

/**
 * How fast the monitor's right wall moves `t` frames after the memory bar hits it (drop2 7.3; the picture's bow, src/shots/drop2Overflow.ts
 * bowAmplitude: a spring, ζ 0.47, 6 frames a period, out to 190 px on + 3 and back to 160 by + 6, trembling ±3 px on + 6 and + 9), as a
 * share of its fastest (0–1). Before the hit, 0.
 */
export function bowSpeed(t) {
  const zeta = 0.47;
  const wd = Math.PI / 3;
  const wn = wd / Math.sqrt(1 - zeta * zeta);
  const k = zeta * wn;
  const amp = (u) => {
    if (u <= 0) return 0;
    const spring = 1 - Math.exp(-k * u) * (Math.cos(wd * u) + (k / wd) * Math.sin(wd * u));
    const tremble = (a) => (u > a ? 3 * Math.sin(Math.PI * (u - a)) * Math.exp(-(u - a) / 2) : 0);
    return 160 * spring + tremble(6) + tremble(9);
  };
  const speed = (u) => Math.abs(amp(u + 0.01) - amp(u - 0.01)) / 0.02;
  // Its fastest is on the way out, ≈ 1 frame in (160 · ωn²/ωd · e^(−k t) sin ωd t at tan ωd t = ωd / k).
  const top = 160 * ((wn * wn) / wd) * Math.exp(-k * (Math.atan(wd / k) / wd)) * Math.sin(Math.atan(wd / k));
  return t <= 0 ? 0 : Math.min(1, speed(t) / top);
}

/**
 * The wall bowing (M3, drop2 7.3 → 7.3&; reshaped on 2026-10-03, W: it swelled to the snap as one smooth creak, and the picture moves in
 * stages): a stick-slip creak that follows the wall's own motion (bowSpeed) — loud as the bar slams it out (its first 3 frames), weaker
 * as it springs back, a small re-creak on each tremble, near silence while it holds before the snap. Each slip is a 1.5 ms scrape of noise
 * ringing three plastic-body resonances (560, 1240, 2380 Hz, rising 15 % as it stretches), the slips 30 → 120 a second with the speed;
 * the level is the speed to the 0.7 (`gain` is its peak), cut over the last 2 ms of `len` samples (the smash takes over).
 */
export function wallCreak(out, at, sr, { len, gain = 0.05, seed = 9200 }) {
  const r = rng(seed);
  const body = [[560, 7, 1], [1240, 9, 0.75], [2380, 11, 0.5]].map(([f, q, g]) => ({ f, q, g, s: new SVF(sr) }));
  const end = Math.round(0.002 * sr);
  const scrape = Math.round(0.0015 * sr);
  const y = new Float32Array(len);
  let ph = 1;
  let since = scrape;
  let amp = 0;
  let top = 1e-9;
  let lvl = 0;
  for (let i = 0; i < len; i++) {
    const frames = (i / sr) * 60;
    const v = bowSpeed(frames);
    // The level follows the speed with a 4 ms lag (a creak rings on a little after the wall stops).
    lvl += (v ** 0.7 - lvl) * (v ** 0.7 > lvl ? 1 : 1 / (0.004 * sr));
    ph += (30 + 90 * v) / sr;
    if (ph >= 1) {
      ph -= 1;
      since = 0;
      amp = 0.6 + 0.4 * r();
    }
    const x = (since < scrape ? amp * (1 - since / scrape) : 0.03) * (r() * 2 - 1);
    since++;
    let w = 0;
    for (const z of body) {
      z.s.process(x, z.f * (1 + 0.15 * Math.min(1, frames / 3)), z.q);
      w += z.g * z.s.bp;
    }
    y[i] = lvl * Math.min(1, i / (0.0008 * sr), (len - i) / end) * w;
    top = Math.max(top, Math.abs(y[i]));
  }
  for (let i = 0; i < len; i++) put(out, at + i, (gain / top) * y[i]);
}

/**
 * One stage of the memory bar's push through the monitor (drop2 bar 7, W, 2026-10-03: the bar
 * goes through in stages, so the music should hit them): the push's body (a sine falling from 3 × onto `freq` in
 * 30 ms, gone in 0.3 s, with a 400 Hz knock), the frame's crunch — four grains of noise in 22 ms at the band `crunch` (q 1.3), driven into
 * a soft clip and bitcrushed into the terminal's grain (held at 8 kHz, 4 bits of its own level; `crunchGain` of the body) — and a short
 * creak tail (`tailMs`: stick-slip slips 45 → 20 a second ringing the frame at half the crunch's band, fading out), so each push is heard,
 * then settles. `gain` is the body's level.
 */
export function pushHit(out, at, sr, { freq, crunch, gain = 0.4, crunchGain = 0.6, tailMs = 140, seed = 9240 }) {
  const r = rng(seed);
  const knock = new SVF(sr);
  const band = new SVF(sr);
  const frame = new SVF(sr);
  const n = Math.round(Math.max(0.32, tailMs / 1000 + 0.05) * sr);
  const grains = [[0, 1], [0.006, 0.75], [0.013, 0.55], [0.022, 0.35]];
  const hold = Math.round(sr / 8000);
  const tail = (tailMs / 1000) * sr;
  let ph = 0;
  let held = 0;
  let slip = 1;
  let since = 1e9;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (freq * (1 + 2 * Math.exp(-t / 0.012))) / sr;
    const x = r() * 2 - 1;
    knock.process(x, 400, 0.8);
    band.process(x, crunch, 1.3);
    let env = 0;
    for (const [b, a] of grains) if (t >= b) env = Math.max(env, a * Math.exp(-(t - b) / 0.004));
    if (i % hold === 0) held = Math.round(Math.tanh(5 * env * band.bp) * 8) / 8;
    // The creak tail: from 20 ms, slips slowing 45 → 20 a second, each a 1.5 ms scrape rung at half the crunch's band, fading out.
    let creak = 0;
    if (tail > 0 && t >= 0.02 && i < tail) {
      const u = (i - 0.02 * sr) / Math.max(1, tail - 0.02 * sr);
      slip += (45 - 25 * u) / sr;
      if (slip >= 1) {
        slip -= 1;
        since = 0;
      }
      frame.process(since < 0.0015 * sr ? x * (1 - since / (0.0015 * sr)) : 0.02 * x, crunch / 2, 8);
      since++;
      creak = 1.6 * frame.bp * (1 - u) ** 2;
    }
    const body = Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.09) + 0.6 * knock.lp * Math.exp(-t / 0.01);
    put(out, at + i, gain * Math.min(1, t / 0.0005, (n - i) / (0.02 * sr)) * (body + crunchGain * held + crunchGain * creak));
  }
}

/**
 * The crack in the monitor's top border widening by a cell (drop2 7.2 → 7.3, a 16th each; the bar's front gains 40 px with each): a dry
 * split — a click, then two grains of noise 4 ms apart at `freq` (q 2), clipped and bitcrushed like the bezel (8 kHz, 4 bits) — gone in
 * 30 ms.
 */
export function crackStep(out, at, sr, { freq, gain = 0.08, seed = 9250 }) {
  const r = rng(seed);
  const bp = new SVF(sr);
  const n = Math.round(0.03 * sr);
  const hold = Math.round(sr / 8000);
  let held = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const x = r() * 2 - 1;
    bp.process(x, freq, 2);
    const env = Math.exp(-t / 0.003) + (t >= 0.004 ? 0.7 * Math.exp(-(t - 0.004) / 0.003) : 0);
    // (Its first 1 ms is the split's click, unfiltered: the band takes a few samples to ring.)
    if (i % hold === 0) held = Math.round(Math.tanh(4 * env * (bp.bp + (t < 0.001 ? x : 0))) * 8) / 8;
    put(out, at + i, gain * held * Math.min(1, (n - i) / (0.2 * n)));
  }
}

/**
 * A push's clank (W's fix round, 2026-10-03: the pushes' thump and crunch were lost under the kick, the crash and the clap — the stages
 * need a voice of their own that climbs): the monitor's steel frame struck, on `freq` — its harmonics 1–4 (the pitch) and two inharmonic
 * modes (2.76 ×, 3.6 ×: metal), most of it in 2.5–5 kHz, the 3rd harmonic strongest, each mode dying in 35–80 ms — opened by a 1 ms tick
 * above 4 kHz, softly clipped, then bitcrushed into the terminal's grain: held 2 samples (24 kHz: its images fall above the delivery's
 * top) on 5 bits of its own peak, so it rasps as it dies and stops dead when it rounds to zero. `gain` is its peak. Gone in 0.3 s.
 */
export function clank(out, at, sr, { freq, gain = 0.2, seed = 9260 }) {
  const r = rng(seed);
  const tick = new SVF(sr);
  const modes = [[1, 0.3, 0.05], [2, 0.25, 0.045], [3, 1, 0.06], [4, 0.6, 0.045], [2.76, 0.6, 0.05], [3.6, 0.5, 0.04]];
  const phase = modes.map(() => 2 * Math.PI * r());
  const n = Math.round(0.3 * sr);
  const y = new Float32Array(n);
  let top = 1e-9;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = 0;
    modes.forEach(([ratio, amp, tau], m) => {
      v += amp * Math.sin(2 * Math.PI * freq * ratio * t + phase[m]) * Math.exp(-t / tau);
    });
    tick.process(t < 0.001 ? r() * 2 - 1 : 0, 4000, 0.7);
    // (Its first sample is the strike's edge, so it sounds from its sample through the crusher.)
    y[i] = Math.tanh(1.2 * (v / 3.25 + 0.4 * tick.hp + (i === 0 ? 0.8 : 0)));
    top = Math.max(top, Math.abs(y[i]));
  }
  const hold = Math.max(1, Math.round(sr / 24000));
  let held = 0;
  for (let i = 0; i < n; i++) {
    if (i % hold === 0) held = Math.round((y[i] / top) * 16) / 16;
    put(out, at + i, gain * held * Math.min(1, (n - i) / (0.05 * n)));
  }
}

/**
 * The wall smashed out (M3, drop2 7.3&): a low thud (a sine falling 125 → 42 Hz with a 300 Hz knock of noise) — the body of the hit, centred
 * a little right — returned apart from the break so the two can be panned on their own: see bezelCrack() and debris().
 */
export function wallThud(out, at, sr, { gain = 0.5, seed = 9210 }) {
  const r = rng(seed);
  const lp = new SVF(sr);
  const n = Math.round(0.45 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (42 + 83 * Math.exp(-t / 0.025)) / sr;
    lp.process(r() * 2 - 1, 300, 0.9);
    const v = Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.13) + 0.9 * lp.lp * Math.exp(-t / 0.03);
    put(out, at + i, gain * Math.min(1, t / 0.0008, (n - i) / (0.05 * sr)) * v);
  }
}

/**
 * The CRT's bezel cracking (M3): seven bursts of noise in 45 ms (plastic splitting, band 1.4–5 kHz) and two glassy pings (the tube's face,
 * 3.3 and 5.1 kHz, gone in 30 ms), driven into a soft clip and bitcrushed into the terminal's grain — held at 8 kHz and quantised to 4
 * bits of its own level (`gain` is its peak).
 */
export function bezelCrack(out, at, sr, { gain = 0.2, seed = 9220 }) {
  const r = rng(seed);
  const hp = new SVF(sr);
  const bp = new SVF(sr);
  const bursts = [[0, 1], [0.0035, 0.8], [0.008, 0.95], [0.0135, 0.65], [0.021, 0.55], [0.031, 0.35], [0.044, 0.25]];
  const n = Math.round(0.12 * sr);
  const hold = Math.round(sr / 8000);
  const steps = 8;
  let held = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let env = 0;
    for (const [b, a] of bursts) if (t >= b) env = Math.max(env, a * Math.exp(-(t - b) / 0.003));
    env = Math.max(env, 0.25 * Math.exp(-t / 0.035));
    const x = r() * 2 - 1;
    bp.process(x, 2600, 0.9);
    hp.process(bp.bp, 1400, 0.7);
    const ping = (0.5 * Math.sin(2 * Math.PI * 3300 * t) + 0.35 * Math.sin(2 * Math.PI * 5100 * t)) * Math.exp(-t / 0.03);
    const v = Math.tanh(4 * env * hp.hp + 0.6 * ping);
    if (i % hold === 0) held = Math.round(v * steps) / steps;
    put(out, at + i, gain * held * Math.min(1, (n - i) / (0.01 * sr)));
  }
}

/**
 * The debris of the wall clattering away (M3): `pieces` bits of bezel and glyph landing over ~0.4 s, closer together at first — the first
 * few chunky plastic knocks (700–1100 Hz), the rest small bright ticks (2–6 kHz) — each quieter than the last.
 */
export function debris(out, at, sr, { gain = 0.1, pieces = 14, seed = 9230 }) {
  const r = rng(seed);
  for (let k = 0; k < pieces; k++) {
    const t0 = 0.02 + 0.38 * (k / pieces) ** 1.5 + 0.012 * r();
    const chunk = k < 4;
    const freq = chunk ? 700 + 400 * r() : 2000 + 4000 * r();
    const decay = chunk ? 0.012 : 0.004 + 0.005 * r();
    const g = gain * (1 - 0.65 * (k / pieces)) * (chunk ? 1 : 0.7);
    const f = new SVF(sr);
    const m = Math.round(6 * decay * sr);
    const s = at + Math.round(t0 * sr);
    let ph = r();
    for (let i = 0; i < m; i++) {
      const t = i / sr;
      f.process(r() * 2 - 1, freq, chunk ? 3 : 5);
      ph += (freq * 1.02) / sr;
      put(out, s + i, g * Math.exp(-t / decay) * Math.min(1, (m - i) / (0.2 * m)) * (f.bp + (chunk ? 0.4 : 0.15) * Math.sin(2 * Math.PI * ph)));
    }
  }
}

/** The pictograms' bell: clean (a harmonic FM pair, ratio 2, its index dying in 40 ms) with a quiet pure octave, ringing over `decay` s. */
export function cleanBell(out, at, sr, { freq, gain = 0.05, decay = 0.3 }) {
  fmBell(out, at, sr, { freq, gain, decay, ratio: 2, index: 1.1, attackMs: 1 });
  fmBell(out, at, sr, { freq: 2 * freq, gain: 0.25 * gain, decay: 0.4 * decay, ratio: 1, index: 0, attackMs: 1 });
}

// ——— Where they play (score names from src/score/drop2.ts; every frame on the 32nd grid) —————————————————————————————————————————

const b2 = (bar, beat = 0) => D.DROP2_START + (bar - 1) * 4 * FRAMES_PER_BEAT + beat * FRAMES_PER_BEAT;
const steps = (a, b, step) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

/** The Z-buffer's beats that change its world: the dimension pop (3.1), the Riso ground under Defender's flat scan (3.2), donut.exe (3.3), the march (4.1–4.3). */
export const ZCHORDS = [D.POP, D.ZBUF2.scan.from, D.ZBUF2.donut.from, ...D.MARCH];
/** The blueprint's drafting: v2.0 ready (9.1), each exploded layer (9.1&, 9.2, 9.2&: one more chord tone each), the box (9.3, iv), the spill (9.4, V7♭9). */
export const DRAFTS = [D.SWITCH.from, ...D.EXPLODE, D.BOX, D.SPILL[0]];
/** Memphis's marimba: every 8th of bar 14 (the props land on the first four). */
export const MARIMBA = steps(D.TOTEM, D.PICTO, 2 * SIXTEENTH);
/** v07 (seam 4800): the marimba's last note (14.4&) rings over `decay` s (the others 0.14), so it is still −6 dB on 15.1 and gone in a beat. */
export const MARIMBA_TAIL = { decay: 0.3 };
/** The pictograms' bells: his limbs' two 45° steps into en garde (15.1&, src/shots/drop2Picto.ts), the world's four roll snaps, the contact sheet. */
export const BELLS = [D.PICTO + 2 * SIXTEENTH, D.PICTO + 3 * SIXTEENTH, ...D.WORLD_ROLL, D.SHEET];
/** The mirror trap's panes, doubling a beat as FALL's do (1, 2, 4, 8) while the mirrors multiply (8 → 12 → 16 → 24); then the ∞ cascade. */
export const PANES = [b2(16, 0.5), ...steps(b2(16, 1), b2(16, 2), 12), ...steps(b2(16, 2), b2(16, 3), 6), ...steps(b2(16, 3), b2(17), 3)];
export const CASCADE = steps(D.WALLPAPER.from, D.WALLPAPER.to, 3);
/** More sync points (frames the picture moves on with no sound): the Riso plates registering (1.3: 3 frames after its blade, as built). */
export const PLATE_REGISTER = D.BLADES[2] + 3;
/** He sees us (4.3 + 6, as built: the • slide 0.05 em toward the lens). */
export const LOOK = D.MARCH[2] + 6;
/** The small kaomoji mountain's faces pulse (10.3&: +16 %; 11.3&: +8 %; build sheet §3, drop2 10–11): its breath (drop2Edo.mjs BREATHS). */
export const MOUNTAIN = [D.CREST + 2 * SIXTEENTH, D.WAVE_CRASH + 2 * FRAMES_PER_BEAT + 2 * SIXTEENTH];
/** The reticles spin loose from their locks (17.2&), and the star's cracks run out along its points on the 32nds (17.3&). */
export const UNLOCK = D.WALLPAPER.from + 2 * SIXTEENTH;
export const STAR_CRACKS = steps(D.CLAMP.from + 2 * SIXTEENTH, D.CLAMP.from + 4 * SIXTEENTH, 3);

/**
 * FALL's notes a semitone up over drop 2's IV (B♭maj9 → Bmaj9: the same chord function): A♯6 F♯6 D♯6 B5 A♯5 F♯5 D♯5 down the arpeggio as
 * the panes let go, then (16.4) back up in 32nds; the ∞ cascade climbs ♭VI D(add9) (D E F♯ A) into the clamp. Pans across the frame.
 */
const PANE_NOTES = [94, 90, 87, 83, 82, 78, 75, 83, 87, 90, 94, 95, 99, 102, 106];
const CASCADE_NOTES = [74, 76, 78, 81, 86, 88, 90, 93];

/** Renders the worlds' chord voices and the new sync hits into the context's buses (sections/drop2.mjs renderDrop2). */
export function renderWorlds(c) {
  const { sr, at, own, place, midi, chordAt2, VOICINGS2 } = c;
  const hz = midi;
  const voicing = (f) => VOICINGS2[chordAt2(f)];

  // ——— Act 1: Defender's red rows in the windows (1.2, 2.4&, 4.2&) — a dry error ping on C, his pitch class ———————————————————————
  D.DEFENDER_ROWS.forEach((f, k) => place(own.d2dry, f, 0.12, (b) => {
    beep(b, 0, sr, { freq: hz(84), ms: 30, duty: 0.25, gain: 0.08 });
    beep(b, at(1.5), sr, { freq: hz(72), ms: 40, duty: 0.25, gain: 0.08 });
  }, { kind: 'd2defrow', pan: [0.35, 0.45, 0.4][k % 3] }));

  // 1.3 + 3: the Riso plates clack into register (as built, 3 frames after the blade's cut) — a paper-and-plate clack, left.
  place(own.fx, PLATE_REGISTER, 0.1, (b) => {
    woodClack(b, 0, sr, { freq: 950, gain: 0.12 }, 9030);
    woodClack(b, at(0.5), sr, { freq: 1400, gain: 0.07 }, 9031);
  }, { kind: 'd2plate', pan: -0.35 });
  // 4.3 + 6: he sees us (the • slide toward the lens) — a small glint on the chord's top note.
  place(own.chime, LOOK, 0.8, (b) => fmBell(b, 0, sr, { freq: hz(voicing(LOOK)[3] + 24), gain: 0.04, decay: 0.12, ratio: 3.5, index: 1.4 }), { kind: 'd2look', pan: 0.1 });

  // ——— 3–4, the Z-buffer: FM pop chords (its own family: the glints and the march's pops) on the beats its world changes ——————————————
  ZCHORDS.forEach((f, k) => place(own.d2chords, f, 1.6, (b) => {
    voicing(f).forEach((m, j) => fmBell(b, 0, sr, { freq: hz(m + 12), gain: 0.044 + (j === 3 ? 0.012 : 0), decay: 0.16, ratio: 3.5, index: 1.6 }));
  }, { kind: 'd2zchord', pan: k % 2 ? 0.3 : -0.3 }));

  // ——— 9, Defender v2.0's blueprint: drafting plucks, dry and clean — the chord drawn a tone a layer, then the box and the spill ——————
  DRAFTS.forEach((f, k) => {
    const v = voicing(f);
    const notes = (k < 4 ? v.slice(0, k + 1) : v).map((m) => m + 12);
    place(own.d2chords, f, 0.4, (b) => notes.forEach((m, j) => draftPluck(b, Math.round(j * 0.004 * sr), sr, { freq: hz(m), gain: k >= 4 ? 0.03 : 0.034, seed: 9010 + 4 * k + j })), {
      kind: 'd2draft',
      pan: [-0.35, -0.15, 0.1, 0.3, 0, -0.2][k],
    });
  });

  // ——— 10–11, the woodblock wave: the boats fling their boxes (10.3: three a boat, 2 frames apart; Defender's, dry, falling C6 → C5),
  // and the cartouche is re-signed (11.2: the ten bytes inked one a frame, a wood tick each, pitched on the byte) ————————————————————
  place(own.d2dry, D.CREST, 0.2, (b) => {
    for (let k = 0; k < 3; k++) beep(b, at(2 * k), sr, { freq: hz(84), to: hz(72), ms: 70, bendMs: 60, duty: 0.25, gain: 0.03 });
  }, { kind: 'd2throw', pan: 0.45 });
  place(own.fx, D.SEAL, 0.3, (b) => {
    const bytes = [0xe2, 0x80, 0xa2, 0x20, 0xcf, 0x89, 0x20, 0xe2, 0x80, 0xa2];
    bytes.forEach((byte, k) => woodClack(b, at(k), sr, { freq: 1500 + 110 * (byte & 15), gain: 0.12 }, 9040 + k));
  }, { kind: 'd2sign', pan: 0.7 });

  // 10.3& and 11.3&: the small kaomoji mountain's faces pulse (+16 %, then +8 %) — its breath, a shakuhachi phrase each (drop2Edo.mjs).

  // ——— 13, the voxel well: a blocky bleep on every hard drop, climbing the vi chord as the well fills ——————————————————————————————
  // 13.3&: the I-piece spawns at the top of the open column (it drops on the next 16th): a short high bleep.
  place(own.d2chords, D.HARD_DROPS[D.HARD_DROPS.length - 1] - SIXTEENTH, 0.08, (b) => bleep(b, 0, sr, { freq: hz(voicing(D.WELL)[3] + 36), gain: 0.045, ms: 50 }), { kind: 'd2spawn', pan: 0 });
  D.HARD_DROPS.forEach((f, k) => {
    const v = voicing(f);
    const m = [v[0], v[1], v[2], v[3], v[0] + 12][k % 5] + 24;
    place(own.d2chords, f, 0.12, (b) => bleep(b, 0, sr, { freq: hz(m), gain: 0.09, ms: 90 }), { kind: 'd2bleep', pan: -0.4 + 0.2 * k });
  });

  // ——— 14, Memphis: the marimba bouncing on the 8ths over IV (low, high, a tenth apart; the props landing on the first four) ——————
  // v07 (seam 4704): the first pair lands on A♯ (A♯4 D♯5), ending the march's D♯ C♯ B the colour blips play on 13.4& (drop2Act2.mjs
  // COLOUR_MARIMBA). v07 (seam 4800): the last note rings on a beat into the pictograms (MARIMBA_TAIL: still −6 dB on 15.1).
  MARIMBA.forEach((f, k) => {
    const v = voicing(f);
    const pair = [[v[2], v[0] + 12], [v[1] + 12, v[3] + 12], [v[0] + 12, v[2] + 12], [v[3], v[1] + 12]][k ? k % 4 : 3];
    const prop = k < 4;
    const decay = k === MARIMBA.length - 1 ? MARIMBA_TAIL.decay : 0.14;
    place(own.d2chords, f, k === MARIMBA.length - 1 ? 6 * decay : 0.8, (b) => pair.forEach((m, j) => marimba(b, at(j * 0.5), sr, { freq: hz(m), gain: (prop ? 0.11 : 0.09) * (j ? 0.8 : 1), decay })), {
      kind: 'd2marimba',
      pan: k % 2 ? 0.45 : -0.45,
    });
  });

  // ——— 15, the pictograms: clean bells — his limbs' steps (up the chord), the roll's snaps (down it as the world turns), the sheet ———
  BELLS.forEach((f, k) => {
    const v = voicing(f);
    const notes = k < 2 ? [v[k] + 24] : k < 6 ? [[v[3], v[2], v[1], v[0]][k - 2] + 24] : v.map((m) => m + 24);
    place(own.d2chords, f, 1.5, (b) => notes.forEach((m) => cleanBell(b, 0, sr, { freq: hz(m), gain: k === 6 ? 0.04 : 0.06, decay: k === 6 ? 0.3 : 0.18 })), {
      kind: 'd2bell',
      pan: k < 2 ? [-0.45, 0.45][k] : k < 6 ? [0.7, 0.25, -0.25, -0.7][k - 2] : 0,
    });
  });

  // ——— 16–17, the mirror trap: FALL's glass (a pane a mirror: 1, 2, 4, 8 a beat), the ∞ cascade into the clamp, the star's shatter —————
  // Each pane rings shorter as they come faster (600 ms a beat apart, 350 on the 16ths, 220 on the 32nds), so every one is heard let go.
  PANES.forEach((f, k) => {
    const up = k >= 7;
    place(own.chime, f, 1.4, (b) => paneTink(b, 0, sr, { freq: hz(PANE_NOTES[k]), gain: up ? 0.13 : 0.15, decayMs: up ? 220 : k >= 3 ? 350 : 600, seed: 9100 + k }), {
      kind: 'd2pane',
      pan: Math.sin(2.4 * k) * 0.75,
    });
  });
  CASCADE.forEach((f, k) => place(own.chime, f, 1, (b) => paneTink(b, 0, sr, { freq: hz(CASCADE_NOTES[k] + 12), gain: 0.09 + 0.007 * k, decayMs: 220, seed: 9120 + k }), {
    kind: 'd2pane',
    pan: Math.cos(1.9 * k) * 0.7,
  }));
  // 17.2&: the reticles spin loose from their locks (Defender's: dry, C7 falling to C6).
  place(own.d2dry, UNLOCK, 0.12, (b) => beep(b, 0, sr, { freq: hz(96), to: hz(84), ms: 80, bendMs: 70, duty: 0.25, gain: 0.05 }), { kind: 'd2unlock', pan: 0.4 });
  // 17.3&: cracks run out along the star's points and his amber leaks through — four glass cracks on the 32nds, climbing ♭VII.
  STAR_CRACKS.forEach((f, k) => place(own.chime, f, 0.5, (b) => paneTink(b, 0, sr, { freq: hz([88, 90, 92, 95][k] + 12), gain: 0.06, decayMs: 140, click: 0.6, seed: 9060 + k }), {
    kind: 'd2starcrack',
    pan: [-0.6, 0.6, -0.3, 0.3][k],
  }));
  // 17.4: the star shatters into red shards — twelve panes over the 10 frames after the burst, down the V7 chord, flung wide.
  place(own.chime, D.GIVING_UP, 1.2, (b) => {
    const tones = voicing(D.GIVING_UP).flatMap((m) => [m + 24, m + 36]);
    const r = rng(9140);
    for (let k = 0; k < 12; k++) {
      const t = k === 0 ? 0 : Math.round((0.012 + 0.15 * (k / 12) ** 1.4) * sr);
      paneTink(b, t, sr, { freq: hz(tones[Math.floor(r() * tones.length)]), gain: 0.07 * (1 - k / 16), decayMs: 220, click: 0.25, seed: 9141 + k });
    }
  }, { kind: 'd2shatter', pan: 0.1 });
}

/**
 * Drop 2's worlds and their chord voices (the bars up to the reel), for the tests and the build sheet: each world's bars, its family, and
 * the kinds that place it.
 */
export const WORLD_VOICES = [
  { bars: [1, 2], world: 'the slash and the style cube', voice: 'drop 1’s supersaw stabs and the 8-bit arp (as built), the blades’ shings', kinds: ['d2stab', 'd2arp'] },
  { bars: [3, 4], world: 'the Z-buffer', voice: 'FM pop chords on the beats its world changes (with its glints and the march’s pops)', kinds: ['d2zchord', 'd2arp'] },
  { bars: [5, 8], world: 'the game, the overflow, the kernel', voice: 'the stabs and the arp (as built)', kinds: ['d2stab', 'd2arp'] },
  { bars: [9, 9], world: 'Defender v2.0’s blueprint', voice: 'drafting plucks, dry and clean', kinds: ['d2draft'] },
  {
    bars: [10, 11],
    world: 'the woodblock wave (Edo)',
    voice: 'the shamisen’s 8ths on the chord (its sawari buzzing), the koto in the in-scale, the hyoshigi, the tsuke’s battari, the tsuzumi, a shakuhachi breath',
    kinds: ['d2shamisen', 'd2gliss', 'd2infect', 'd2block', 'd2tsuke', 'd2pon', 'd2kan', 'd2ki', 'd2mountain'],
  },
  { bars: [12, 12], world: 'the arcade', voice: 'chip square arpeggios', kinds: ['d2arp', 'd2chip'] },
  { bars: [13, 13], world: 'the voxel well', voice: 'blocky bleeps on the hard drops', kinds: ['d2bleep', 'd2arp'] },
  { bars: [14, 14], world: 'Memphis', voice: 'a bouncy marimba on the 8ths', kinds: ['d2marimba'] },
  { bars: [15, 15], world: 'the pictograms', voice: 'clean bells', kinds: ['d2bell'] },
  { bars: [16, 17], world: 'the mirror trap', voice: 'FALL’s glass panes, doubling a beat; the ∞ cascade; the shatter (over the stabs)', kinds: ['d2pane', 'd2shatter', 'd2stab'] },
  { bars: [18, 19], world: 'the reel, stuck in ASCII', voice: 'the stabs and the arp (as built); a stab on each frame-rate drop of 19', kinds: ['d2stab', 'd2arp', 'd2fps'] },
];
