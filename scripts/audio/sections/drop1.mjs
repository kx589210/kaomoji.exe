// Drop 1's sound, the part 'cosmos' (spec revision 8, §8 Drop 1), placed from
// src/score/drop1.ts: cute future bass that has to be brighter and fuller
// than the end of the build.
//   cosmos 1, the Big Bang: kick, crash, impact and a sung chord on the drop;
//   half time under the freeze, a whoosh circling it, an impact as time snaps
//   back, a snare fill.
//   cosmos 2–4, one level of scale a bar: four on the floor, clap and snare on
//   2 and 4, open hats on the offbeats; wide supersaw chords voice-led from
//   bar to bar (common tones held, no voice moving more than three
//   semitones), pumping with the kick without being swallowed by it, with
//   rhythmic stabs on top; a saturated sub on B♭1–D2; a vocal-chop hook
//   climbing high; a crash, a rising bell run and a whoosh as each level
//   arrives.
// The stutter at the end of cosmos 4 is cut from the finished mix (bgm.mjs); the
// neon's crackle is written on the content frames its slices play.
// The club (club 1.1 → break 1.1, the comic club INK) is scripts/audio/sections/club.mjs: it carries drop 1's groove on with this file's
// VOICINGS and HOOK (rows 3 and 4 are its bars 1 and 2: the shared table, never retyped) and owns the glass (the hit, the creak and the
// glass giving way on break 1.1, v04's code and seeds). v04's club 1–4 (the dancing lines, the throw, the hit on club 4.4) is retired.
// The cosmos grew to 6 bars on the map (src/score/film.ts): this is its built bars, cosmos 1–4; its held bars are silent (bgm.mjs gates
// every held tail), and its music ends on club 1.1. Crash seeds are taken on seedFrame, so the drop keeps the crashes it was approved with.
import { hash } from '../../../src/engine/random.ts';
import * as D from '../../../src/score/drop1.ts';
import { builtPartBars, partStart, seedFrame } from '../../../src/score/film.ts';
import { FPS, FRAMES_PER_BEAT, barFrame, barOfFrame } from '../../../src/score/tempo.ts';
import { clap, hat, impact, kick, pop, riser, snare } from '../drums.mjs';
import { fmBell } from '../fm.mjs';
import { WHOOSH_PEAK, crash, reverseCymbal, spark, swarm, whoosh } from '../fx.mjs';
import { addMono, applyGain, duck, pingPong, stereo, truncate } from '../mix.mjs';
import { pluckBass, supersaw } from '../synth.mjs';
import { voxChop } from '../vox.mjs';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

/**
 * IV–V–iii–vi in F with ninths and a sus (spec §8), one chord a bar from
 * cosmos 1 (cosmos 2 and club 2: C9sus4 resolving to C9 on beat 3). Upper voices only —
 * the sub and the bass carry the roots — voice-led: each chord keeps its
 * neighbours' common tones and moves the rest by a step (the first version
 * stacked every chord on its root, so whole blocks jumped and cosmos 3 sounded
 * like the key dropping).
 */
export const VOICINGS = {
  IV: [60, 62, 65, 69], // B♭maj9: C D F A
  Vsus: [60, 62, 65, 70], // C9sus4: C D F B♭
  V: [60, 62, 64, 70], // C9: C D E B♭
  iii: [60, 64, 67, 71], // Am9: C E G B
  vi: [60, 64, 65, 69], // Dm9: C E F A
};
/** The chords of cosmos 1–4, a bar each, as [voicing, from beat] pairs (the club's are src/score/club.ts CHORDS). */
export const PROGRESSION = [
  [['IV', 0]],
  [['Vsus', 0], ['V', 2]],
  [['iii', 0]],
  [['vi', 0]],
];
/** The bar's root for the sub (B♭1, C2, A1, D2) by chord. */
const ROOT = { IV: 34, Vsus: 36, V: 36, iii: 33, vi: 38 };

/**
 * The hook, in sixteenths from each bar's downbeat, cosmos 2 – club 2: [sixteenth, MIDI note, length in sixteenths]. It climbs bar by bar.
 * Rows 0–2 are sung here on cosmos 2–4 (HOOK_BARS); rows 3 and 4 are the club's bars 1 and 2 (sections/club.mjs HOOK_ROWS), and the
 * break and drop 2 quote the table too.
 */
export const HOOK = [
  [[0, 79, 2], [2, 77, 1], [3, 79, 2], [6, 82, 2], [8, 81, 3], [11, 79, 1], [12, 77, 2], [14, 76, 2]],
  [[0, 79, 2], [2, 81, 1], [3, 84, 2], [6, 83, 2], [8, 81, 4], [12, 79, 2], [14, 81, 2]],
  [[0, 81, 2], [2, 84, 1], [3, 86, 2], [6, 84, 2], [8, 88, 4], [12, 86, 2], [14, 84, 2]],
  [[0, 86, 2], [2, 84, 1], [3, 86, 2], [6, 89, 2], [8, 88, 3], [11, 86, 1], [12, 84, 2], [14, 86, 2]],
  [[0, 86, 2], [2, 89, 1], [3, 91, 2], [6, 89, 2], [8, 88, 4], [12, 86, 2], [14, 84, 2]],
];
/** The stab rhythm over the pad, in sixteenths of a bar (a syncopated future-bass chop). */
const STABS = [0, 3, 6, 8, 10, 13];
const VOWELS = ['a', 'i', 'u', 'e', 'o'];
/**
 * v04's cosmos bars, in order: cosmos 1–4 (PROGRESSION's bars). The cosmos is built through (6 bars, src/score/film.ts) and its music is
 * sections/cosmos.mjs; this v04 renderer (renderDrop1, retired: bgm.mjs no longer calls it) keeps its own 4 bars.
 */
const DROP1_BARS = [...builtPartBars('cosmos')].slice(0, PROGRESSION.length);
if (PROGRESSION.length !== DROP1_BARS.length) throw new Error(`sections/drop1.mjs: PROGRESSION has ${PROGRESSION.length} rows for the cosmos's ${DROP1_BARS.length} built bars (src/score/film.ts): write one row per bar`);
/** The hook's bars here: cosmos 2–4 (HOOK's rows 0–2; its later rows are the club's). */
const HOOK_BARS = DROP1_BARS.slice(1, 1 + HOOK.length);
/** The stabs' bars: cosmos 1–4 (the freeze in cosmos 1 holds the pad alone). */
const STAB_BARS = DROP1_BARS;
/** The cosmos's music ends on club 1.1, where the club's begins (sections/club.mjs). */
const END = partStart('club');

/** The chord sounding at `frame` (cosmos 1–4: PROGRESSION's row k is DROP1_BARS[k]; a held bar keeps the last built bar's before it). */
export const chordAt = (frame) => {
  const bar = barOfFrame(frame);
  let k = 0;
  while (k + 1 < DROP1_BARS.length && DROP1_BARS[k + 1] <= bar) k++;
  const parts = PROGRESSION[k];
  const beat = (frame - barFrame(DROP1_BARS[k])) / FRAMES_PER_BEAT;
  let name = parts[0][0];
  for (const [n, b] of parts) if (beat >= b) name = n;
  return name;
};

/**
 * Renders the cosmos into `stems` (the same buses as the build) at sample
 * rate `sr`: the music up to club 1.1 (END). Returns every placed event as
 * { kind, at } (samples; content time inside the stutter).
 */
export function renderDrop1(stems, sr) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const n = stems.sub.length;
  const events = [];
  // The cosmos's music ends on club 1.1: every voice of it is written into a bus of its own, and only what lies before END reaches the
  // stems (at the end), so no tail rings on into the club; the sub is cut there as it is made.
  const own = Object.fromEntries(Object.keys(stems).filter((k) => k !== 'post' && k !== 'sub').map((k) => [k, stereo(n)]));
  const bus = { ...stems, ...own };
  const place = (bus, frame, dur, draw, { pan = 0, kind } = {}) => {
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    addMono(bus, buf, { at: at(frame), pan });
    if (kind) events.push({ kind, at: at(frame) });
  };
  const swoosh = (bus, peak, frames, o, { kind, pan = 0 } = {}) => {
    place(bus, peak - WHOOSH_PEAK * frames, frames / FPS, (b) => whoosh(b, 0, b.length, sr, o), { pan });
    if (kind) events.push({ kind, at: at(peak) });
  };
  const cosmosOnly = (frames) => frames.filter((f) => f < END);
  const allKicks = [...D.BANG_KICKS, ...cosmosOnly(D.KICKS)];

  // Drums.
  allKicks.forEach((f, i) => place(bus.drums, f, 1, (b) => kick(b, 0, sr, { gain: f === D.BURST ? 0.72 : 0.5, f0: 210, f1: 45, pitchMs: 38, decayMs: 260 }, 2100 + i), { kind: 'd1kick' }));
  [...D.BANG_SNARES, ...cosmosOnly(D.CLAPS)].forEach((f, i) => {
    place(bus.drums, f, 0.8, (b) => snare(b, 0, sr, { gain: 0.36, tone: 220, decayMs: 150 }, 2150 + i), { kind: 'd1snare' });
    place(bus.drums, f, 0.6, (b) => clap(b, 0, sr, { gain: 0.62, tone: 1600 }, 2200 + i), { pan: -0.15 });
    place(bus.drums, f + 0.15, 0.6, (b) => clap(b, 0, sr, { gain: 0.45, tone: 1900 }, 2250 + i), { pan: 0.18 });
  });
  D.FILL.forEach((f, i) => place(bus.drums, f, 0.5, (b) => snare(b, 0, sr, { gain: 0.16 + 0.07 * i, tone: 240 + 15 * i, decayMs: 90 }, 2300 + i), { kind: 'd1fill', pan: -0.2 + 0.13 * i }));
  cosmosOnly(D.HATS).forEach((f, i) => place(bus.drums, f, 0.25, (b) => hat(b, 0, sr, { gain: i % 4 === 2 ? 0.25 : i % 2 ? 0.16 : 0.2, decayMs: 34, cutoff: 9000 }, 2400 + i), { pan: i % 2 ? 0.28 : -0.22, kind: 'd1hat' }));
  cosmosOnly(D.OPEN_HATS).forEach((f, i) => place(bus.drums, f, 0.6, (b) => hat(b, 0, sr, { gain: 0.22, decayMs: 140, cutoff: 7500 }, 2700 + i), { pan: 0.1, kind: 'd1openhat' }));

  // The drop: a crash and an impact; a crash as each level of scale arrives (the cosmos's: Earth, the solar system, the galaxy).
  for (const f of [D.BURST]) {
    place(bus.drums, f, 5, (b) => crash(b, 0, sr, { gain: 0.36, decay: 1.8 }, 2801 + seedFrame(f)));
    place(bus.fx, f, 1.8, (b) => impact(b, 0, sr, { gain: 0.3 }, 2802 + seedFrame(f)), { kind: 'd1drop' });
  }
  Object.values(D.LEVELS).forEach((f, i) => f < END && place(bus.drums, f, 3, (b) => crash(b, 0, sr, { gain: 0.22, decay: 1.2 }, 2810 + i), { kind: 'd1level', pan: i % 2 ? 0.3 : -0.3 }));

  // The bullet time: a whoosh circling the frozen burst (centre, right, centre, left), an impact as time snaps back, stardust all through.
  const orbit = D.RESUME - D.FREEZE.from;
  const w = new Float32Array(Math.round((orbit / FPS) * sr));
  whoosh(w, 0, w.length, sr, { from: 450, to: 3600, gain: 0.3, q: 1.2, seed: 2821 });
  const start = at(D.FREEZE.from);
  for (let i = 0; i < w.length; i++) {
    const p = Math.sin((2 * Math.PI * i) / w.length);
    const j = start + i;
    if (j >= n) break;
    bus.fx.L[j] += w[i] * Math.sqrt((1 - p) / 2);
    bus.fx.R[j] += w[i] * Math.sqrt((1 + p) / 2);
  }
  events.push({ kind: 'd1orbit', at: at(D.FREEZE.from + WHOOSH_PEAK * orbit) });
  swarm(bus.chime.L, bus.chime.R, at(D.BURST), at(D.RESUME + 24) - at(D.BURST), sr, { gain: 0.13, density: 1400, seed: 2822 });
  // Frozen time shimmers: a crash swelling backwards into the resume, and one more crash as time snaps back.
  place(bus.fx, D.FREEZE.from, (D.RESUME - D.FREEZE.from) / FPS, (b) => reverseCymbal(b, b.length, b.length, sr, { gain: 0.22, seed: 2825 }));
  place(bus.drums, D.RESUME, 3, (b) => crash(b, 0, sr, { gain: 0.24, decay: 1.1 }, 2826));
  place(bus.fx, D.RESUME, 1.5, (b) => impact(b, 0, sr, { gain: 0.24 }, 2823), { kind: 'd1resume' });
  // Into the groove: a short riser over the fill.
  place(bus.fx, D.FILL[0], (D.LEVELS.earth - D.FILL[0]) / FPS, (b) => riser(b, 0, b.length, sr, { gain: 0.14 }, 2824));

  // Each level of scale arrives with a whoosh peaking on its downbeat and a bell run up the chord.
  Object.entries(D.LEVELS).forEach(([name, f], i) => {
    if (f >= END) return;
    swoosh(bus.fx, f, 14, { from: 1200, to: 9000, gain: 0.16, q: 1.4, seed: 2830 + i }, { kind: 'd1zoom', pan: i % 2 ? -0.25 : 0.25 });
    const tones = VOICINGS[chordAt(f)].map((m) => m + 24);
    tones.forEach((m, k) => place(bus.chime, f + 3 * k, 2.5, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.07, decay: 0.9, index: 2.2 }), { pan: -0.5 + 0.33 * k, kind: k === 0 ? `d1bells-${name}` : undefined }));
  });
  // The meteors land on Earth: a bubbly pop each group, a step higher each time.
  D.METEOR_LANDS.forEach((f, k) => place(bus.fx, f, 0.2, (b) => pop(b, 0, sr, { freq: 700 * 2 ** (k / 4), gain: 0.16 }), { kind: 'd1land', pan: (k - 1) * 0.3 }));
  // The galaxy's stardust, cosmos 4.
  swarm(bus.chime.L, bus.chime.R, at(D.LEVELS.galaxy), at(D.COSMOS_END) - at(D.LEVELS.galaxy), sr, { gain: 0.06, density: 700, seed: 2840 });

  // Chords: a pad held through each chord, pumping with every kick (depth 0.6: it breathes, it does not vanish) …
  const pad = stereo(n);
  const sustained = [];
  DROP1_BARS.forEach((bar, k) => {
    PROGRESSION[k].forEach(([name, b], j) => {
      const from = barFrame(bar, b);
      const to = j + 1 < PROGRESSION[k].length ? barFrame(bar, PROGRESSION[k][j + 1][1]) : barFrame(bar + 1);
      const v = VOICINGS[name];
      // The top two voices doubled an octave up: the drop's brightness.
      sustained.push({ at: at(from), len: at(to) - at(from), freqs: [...v, v[2] + 12, v[3] + 12, v[3] + 24].map(midi) });
    });
  });
  supersaw(pad.L, pad.R, sustained, sr, { gain: 0.2, cutoff: () => 9000, q: 0.7, spread: 1, seed: 2850 });
  applyGain(pad, duck(n, allKicks.map(at), sr, { depth: 0.6, attackMs: 2, releaseMs: 160 }));
  // … and bright stabs on a syncopated sixteenth pattern from cosmos 2, each with its own filter snap.
  const stabs = stereo(n);
  const stabList = [];
  for (const bar of STAB_BARS) {
    for (const s of STABS) {
      const f = barFrame(bar) + s * (FRAMES_PER_BEAT / 4);
      if (f < D.RESUME) continue; // the freeze holds the pad alone
      const v = VOICINGS[chordAt(f)];
      stabList.push({ at: at(f), len: at(f + 4) - at(f), freqs: [...v.map((m) => m + 12), v[3] + 24].map(midi) });
    }
  }
  const stabStarts = stabList.map((c) => c.at);
  let si = 0;
  supersaw(stabs.L, stabs.R, stabList, sr, {
    gain: 0.14,
    q: 1.1,
    spread: 0.8,
    seed: 2851,
    cutoff: (i) => {
      while (si + 1 < stabStarts.length && stabStarts[si + 1] <= i) si++;
      const t = (i - stabStarts[si]) / sr;
      return t < 0 ? 800 : 900 + 9000 * Math.exp(-t / 0.06);
    },
  });
  for (let i = 0; i < n; i++) {
    bus.chords.L[i] += pad.L[i];
    bus.chords.R[i] += pad.R[i];
    bus.music.L[i] += stabs.L[i];
    bus.music.R[i] += stabs.R[i];
  }
  events.push({ kind: 'd1chords', at: at(D.DROP1_START) });

  // The sub: the bar's root held, saturated a little so it is heard on small speakers, ducked hard by every kick.
  const sub = new Float32Array(n);
  let ph = 0;
  for (let i = at(D.DROP1_START); i < Math.min(n, at(END)); i++) {
    const f = (i / sr) * FPS;
    const freq = midi(ROOT[chordAt(f)]);
    ph += freq / sr;
    const env = Math.min(1, (i - at(D.DROP1_START)) / (0.004 * sr));
    sub[i] = 0.27 * env * Math.tanh(1.4 * Math.sin(2 * Math.PI * ph));
  }
  const subDuck = duck(n, allKicks.map(at), sr, { depth: 0.85, attackMs: 2, releaseMs: 120 });
  for (let i = 0; i < n; i++) bus.sub[i] += sub[i] * subDuck[i];
  // A plucked bass on the offbeats of the groove, an octave above the sub.
  const plucks = cosmosOnly(D.OPEN_HATS).map((f) => ({ at: at(f), len: at(f + 9) - at(f), freq: midi(ROOT[chordAt(f)] + 12) }));
  const pb = new Float32Array(n);
  pluckBass(pb, plucks, sr, { gain: 0.22, bright: 2200 });
  addMono(bus.bass, pb);

  // The vocals: a sung chord on the drop, a long "ooh" through the freeze, a "hey" as time snaps back, then the hook from cosmos 2.
  const vox = stereo(n);
  const sing = (frame, o, pan = 0) => {
    const b = new Float32Array(o.len + Math.round(sr / 10));
    voxChop(b, 0, sr, o);
    addMono(vox, b, { at: at(frame), pan });
  };
  VOICINGS.IV.forEach((m, k) => sing(D.BURST, { freq: midi(m + 12), len: at(20), vowel: 'a', to: 'o', gain: 0.18, seed: 2860 + k }, -0.3 + 0.2 * k));
  sing(D.FREEZE.from, { freq: midi(77), len: at(D.RESUME - D.FREEZE.from - 2), vowel: 'u', to: 'a', glide: 2, gain: 0.16, seed: 2865 });
  sing(D.RESUME, { freq: midi(81), len: at(8), vowel: 'e', to: 'i', glide: 3, gain: 0.28, seed: 2866 });
  events.push({ kind: 'd1bangvox', at: at(D.BURST) });
  let v = 0;
  HOOK.slice(0, HOOK_BARS.length).forEach((bar, k) => {
    for (const [s, note, len] of bar) {
      const f = barFrame(HOOK_BARS[k]) + s * (FRAMES_PER_BEAT / 4);
      const long = len >= 3;
      sing(f, { freq: midi(note), len: Math.round((len * (FRAMES_PER_BEAT / 4) * 0.95 * sr) / FPS), vowel: VOWELS[v % 5], to: VOWELS[(v + 2) % 5], glide: long ? 1 : 0, gain: 0.3, seed: 2870 + v }, (hash(v, 61) - 0.5) * 0.2);
      events.push({ kind: 'd1lead', at: at(f) });
      v++;
    }
  });
  pingPong(vox, sr, { time: 0.3, feedback: 0.3, mix: 0.28 });
  for (let i = 0; i < n; i++) {
    bus.vox.L[i] += vox.L[i];
    bus.vox.R[i] += vox.R[i];
  }

  // The bridge into the club, on the stutter (cosmos 4.4, STUTTER). The picture steps on each of its slices — STUTTER.from + 0, 6, 12,
  // 15, 18, 21 (voyage.ts bridgeStep) — while the sound replays content STUTTER.from + 0–5, + 6–8 and + 9–11 twice each (stutterFrame;
  // bgm.mjs cuts it from the finished mix), and content + 12–23 is never heard. So the neon is written on the frames the slices
  // show: a spark on the first frame of each, hotter slice by slice, is heard on every slice start; a transformer's hum from the
  // second (heard from + 12), swelling, runs on under the last slices into the tubes igniting on club 1.1.
  const SLICES = [0, 6, 12, 15, 18, 21].map((d) => D.STUTTER.from + d); // the picture's slices: 6, 6, 3, 3, 3, 3 frames
  const shown = [...new Set(SLICES.map(D.stutterFrame))]; // the content each pair of slices plays: STUTTER.from + 0, 6, 9
  shown.forEach((c, k) => place(bus.fx, c, 0.05, (b) => spark(b, 0, sr, { gain: 0.42 + 0.1 * k, tone: 4200 + 900 * k }, 2952 + k), { kind: 'd1crackle', pan: 0.1 - 0.15 * k }));
  const humFrom = shown[1];
  const swell = (D.stutterFrame(D.STUTTER.to - 1) + 1 - humFrom) / FPS; // to the end of the last content slice
  place(bus.fx, humFrom, (D.COSMOS_END + 3 - humFrom) / FPS, (b) => {
    const fade = 0.03 * sr;
    for (let i = 0; i < b.length; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.004) * Math.min(1, (b.length - i) / fade) * (0.5 + 0.5 * Math.min(1, t / swell));
      b[i] += env * 0.035 * (Math.sin(2 * Math.PI * 120 * t) + 0.5 * Math.sin(2 * Math.PI * 240 * t) + 0.3 * Math.sign(Math.sin(2 * Math.PI * 120 * t)));
    }
  }, { kind: 'd1hum', pan: 0.1 });
  // The cosmos's music ends on club 1.1: each of its buses reaches the stems only up to END (a 1.5 ms fade), nothing after it.
  const end = at(END);
  for (const [k, b] of Object.entries(own)) {
    for (const [src, dst] of [[b.L, stems[k].L], [b.R, stems[k].R]]) {
      truncate(src, end, sr);
      for (let i = 0; i < Math.min(n, end); i++) dst[i] += src[i];
    }
  }
  return events;
}
