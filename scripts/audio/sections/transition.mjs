// The transition's sound, the part 'transition' (2 bars, riso's last frame → cosmos 1.1): "VERTIGO ∞ · LIGHTSPEED PRESS", bars 1–2
// (build sheet notes/bcos/sheet.md §3, §11; design notes/cosmos3/final.md §9 bars 13–14; music bible notes/prep/music.md
// §2.1, §3 M4/M6/M13, §4.2–4.3, §5 S2). Every frame comes from src/score/transition.ts, so every hit lands on the picture's frame (an
// event on frame f starts on sample f × 800 at 48 kHz). Positions below are transition bar.beat.
//   Bar 1, DUPLICATOR → VERTIGO (ii, Gm11 over G1; half time, the exhale: soft, no crash, no clap): the approved inhale ends on 1.1 and
//   the page breathes out — a soft kick, a sub boom falling 55 → 38 Hz, a paper fwump — the pad behind a low-pass at 500 Hz that opens to
//   16 kHz by the vacuum, a noise riser climbing 800 Hz → 9 kHz with it, and the 8-bit Blue Danube (after J. Strauss II, Op. 314, PD; our
//   own arrangement: chip square, duty 25 %, vibrato from 80 ms, ping-pong 0.3 s). Paper "chk"s as the page Ctrl+V's itself, the rim's
//   tock and a paper thwack as the dolly zoom lurches (the pad sagging −30 cents with it), a printer's key-repeat burr under the held C5,
//   a launch whump as the camera jolts down the tunnel, a gate's doppler pass on 1.4.
//   Bar 2, STAR GATE → CRASH STOP → ✦ (C9sus4 over a C2 pedal): a kick and a press clunk on every beat (each press pass turns the
//   lights out), the pedal pumping; the snare roll doubling a stage a beat (8ths, 16ths, 32nds, 220 → 420 Hz), a gate whooshing past on
//   every roll hit; the flight noise whose band follows the speed (600 Hz → 4 kHz), panned L → R in four steps with the corkscrew and
//   cut dead on the crash stop with a 45 Hz slam; eight FM collapse blips climbing whole tones from C6 on the reverse Vertigo's 32nds, a
//   40 Hz rumble and a reverse cymbal into the vacuum, the ✦'s tiny "shing".
//   2.4&, S2 THE VACUUM: the music cut dead (CUTS, SILENCES: gated to digital zero) and, alone on the post bus, the point's whine
//   (outroVoices' lineWhine ≈ 10.5 kHz, ≈ −38 dBFS: the birth point's and the death line's are one sound, M13) wavering ±1 % with the
//   point's tremble, cut a frame before the Big Bang. No inhale (M4 belongs to riso 4.4& and the ending). The waltz's last B♭5 is
//   swallowed by the vacuum: the bang sings it.
// Seeds 6000–6499; event kinds tr… (kicks and snares end in "kick" / "snare" for check-sync; the roll's 8ths–32nds are "trroll").
import { hash } from '../../../src/engine/random.ts';
import { partBar } from '../../../src/score/film.ts';
import { FPS } from '../../../src/score/tempo.ts';
import * as T from '../../../src/score/transition.ts';
import { chip, pad, zip } from '../breakVoices.mjs';
import { pressClunk, burr, doppler, paperThwack, rumble, swellNoise, trackedNoise, travel } from '../cosmosVoices.mjs';
import { sampleOf, stage } from '../cosmosStage.mjs';
import { rim, sweep } from '../drop2Voices.mjs';
import { hat, kick, snare } from '../drums.mjs';
import { fmBell } from '../fm.mjs';
import { reverseCymbal } from '../fx.mjs';
import { duck, pingPong } from '../mix.mjs';
import { lineWhine } from '../outroVoices.mjs';
import { VOICINGS } from './drop1.mjs';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

/** The music stops dead on 2.4& (the vacuum): the plate restarts there, so no tail of the gate rings into the silence. */
export const CUTS = [T.POINT];
/** S2, the vacuum: the mix gated to digital zero from 2.4& to the Big Bang (the post bus — the whine — plays through it). */
export const SILENCES = [T.SILENCE];
/**
 * The transition's own buses and their reverb sends (bible §6.2's amounts). trWaltz: the 8-bit Blue Danube (its own ping-pong);
 * trSub: the boom, the G1 and the C2 pedal, the slam, the rumble (never sent).
 */
export const SENDS = { trDrums: 0.08, trPad: 0.25, trWaltz: 0.3, trFx: 0.22, trBell: 0.55, trSub: 0 };
/** Previews of the joins (bgm.mjs writes public/audio/sections/<id>.wav): the inhale → the exhale (riso 4 → tr 1), the vacuum → the Big Bang (tr 2 → cosmos 1). */
export const PREVIEWS = [
  { id: 'lift-seam', fromBar: partBar('riso', 4), toBar: partBar('transition', 1) },
  { id: 'bang', fromBar: partBar('transition', 2), toBar: partBar('cosmos', 1) },
];
/** Nothing to edit in the finished mix: the cut is made in the transition's own buses and the vacuum is gated. */
export function finish() {}

/**
 * The lift's one new colour (bible §2.1): drop 1's Vsus upper voices C D F B♭ held across both bars, D5 on top over G1 (ii, Gm11),
 * F5 on top over the C2 pedal (C9sus4). On cosmos 1.1 the B♭ falls to A and the bass to B♭: IV, a resolution that spends no tonic.
 */
export const LIFT_VOICINGS = { ii: [...VOICINGS.Vsus, 74], Vsus: [...VOICINGS.Vsus, 77] };
/** The roots: G1 under ii, the C2 pedal under Vsus. */
export const LIFT_ROOTS = { ii: 31, Vsus: 36 };
/**
 * The lift's own gain per bar (bible §1: the lift −13.0 ± 0.7, bar 1 ≈ −14.5 — the exhale, soft on purpose so it never reads as a drop
 * attempt — and bar 2 ≈ −11.5), on its own buses: the balance inside each bar (the waltz ≈ 4 dB over the pad, the kicks as the design
 * sets them) is the voices'; this sets where the bar sits. Measured (cosmosMix.mjs): bar 1 −14.5, bar 2 −11.5, the lift −12.8.
 */
export const LIFT_TRIM_DB = [-1.1, -1.5];
/** The lift's gain at frame `f`: LIFT_TRIM_DB of its bar, the step into bar 2 ramped over the 25 ms before 2.1's kick. */
export const liftTrim = (f) => {
  const [a, b] = LIFT_TRIM_DB.map((db) => 10 ** (db / 20));
  const u = (f - (T.at(2) - 0.025 * FPS)) / (0.025 * FPS);
  return u <= 0 ? a : u >= 1 ? b : a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * u));
};
/** The kicks' gains: the soft exhale on 1.1 (0.45), the launch (0.5), then bar 2 rising 0.5 → 0.6. */
export const kickGain = (f) => {
  if (f === T.EXHALE) return 0.45;
  if (f < T.at(2)) return 0.5;
  const bar2 = T.KICKS.filter((k) => k >= T.at(2));
  return 0.5 + (0.1 * bar2.indexOf(f)) / Math.max(1, bar2.length - 1);
};
/** The pad's low-pass (Hz) at frame `f`: 500 Hz on 1.1, opening exponentially to 16 kHz by the vacuum (OPEN). */
export const padCutoff = (f) => 500 * 32 ** Math.max(0, Math.min(1, (f - T.OPEN.from) / (T.OPEN.to - T.OPEN.from)));
/** The vertigo wobble (semitones) at frame `f`: the pad sags −30 cents from the lurch (1.2) to 1.2&, and is back by the launch (1.3). */
export const wobbleAt = (f) => {
  const mid = (T.WOBBLE.from + T.WOBBLE.to) / 2;
  if (f <= T.WOBBLE.from || f >= T.WOBBLE.to) return 0;
  const u = f < mid ? (f - T.WOBBLE.from) / (mid - T.WOBBLE.from) : (T.WOBBLE.to - f) / (T.WOBBLE.to - mid);
  return -0.3 * (u * u * (3 - 2 * u));
};
/** The L curve of every launch (sheet §0): 75 % of a move in 3 frames, settling after. */
const launch = (df) => (df <= 0 ? 0 : 1 - Math.exp((-df * Math.LN2 * 2) / 3));
/** The flight's speed (units a frame) at frame `f` (SPEED: 0 → 6 on the launch, ×2 a roll stage, 0 on the crash), each step an L. */
export const speedAt = (f) => {
  let v = 0;
  for (const s of T.SPEED) {
    if (s.units === 0) {
      if (f >= s.at) return 0;
      continue;
    }
    v += (s.units - v) * launch(f - s.at);
  }
  return v;
};
/** The flight noise's band centre (Hz): 600 Hz at 6 units a frame, 4 kHz at 24, on a power law between. */
export const flightCentre = (f) => 600 * Math.max(0.25, speedAt(f) / 6) ** (Math.log(4000 / 600) / Math.log(4));
/** Its pan: centred down the tunnel, then L → R in four steps with the corkscrew's 22.5° turns (each an L). */
export const flightPan = (f) => {
  let p = 0;
  T.CORKSCREW.forEach((c, k) => {
    const target = -0.6 + 0.4 * k;
    p += (target - p) * launch(f - c);
  });
  return p;
};
/** The whine's pitch (Hz) at frame `f`: 10.5 kHz, wavering ±1 % on a new hashed step every 2 frames (the point's ±1 px tremble). */
export const whineFreq = (f) => 10500 * (1 + 0.01 * (2 * hash(Math.floor((f - T.POINT) / 2), 6007) - 1));
/** The roll's gain and tone at hit k of bar 2 (8ths, 16ths, 32nds): 0.16 → 0.45, 220 → 420 Hz, the last 32nds shooting up. */
export const rollVoice = (f) => {
  const bar2 = T.ROLL.filter((r) => r >= T.at(2));
  const k = bar2.indexOf(f);
  const u = k / Math.max(1, bar2.length - 1);
  const up = f >= T.CROSS ? (f - T.CROSS) / (T.POINT - T.CROSS) : 0;
  return { gain: 0.16 + 0.29 * u ** 1.2, tone: 220 * (420 / 220) ** u * (1 + 0.45 * up) };
};

/**
 * Renders the transition into `stems` at `sr`: its own buses (SENDS; created if missing) and the post bus (the whine). `origin`: the
 * film frame of the stems' first sample (0 for the film). Returns every event as { kind, at } (at: the film sample of the score frame —
 * a whoosh's or a pass's is its peak, a reversed sound's the frame it stops on). `solo(kind, frame)` picks which sounds are rendered.
 */
export function renderTransition(stems, sr, { origin = 0, solo = () => true } = {}) {
  const S = stage(stems, sr, { origin, from: T.TRANSITION_START, to: T.TRANSITION_END, sends: SENDS, solo });
  const { B, lo, frameAt, len, place, placeStereo, postAt, mark } = S;
  const seconds = (frames) => frames / FPS;
  const kicks = T.KICKS;

  // ——— Drums: the soft exhale, the launch, then four on the floor with the press passes; the roll doubling; the hats ———————————————
  kicks.forEach((f, i) => place(B.trDrums, f, 1.2, (b) => kick(b, 0, sr, { gain: kickGain(f), f0: f === T.EXHALE ? 150 : 200, f1: 45, pitchMs: 40, decayMs: f === T.EXHALE ? 320 : 260 }, 6000 + i), { kind: 'trkick' }));
  kicks.filter((f) => f >= T.at(2)).forEach((f, i) => place(B.trDrums, f, 0.6, (b) => pressClunk(b, 0, sr, { gain: 0.22 + 0.03 * i, seed: 6010 + i }), { kind: 'trclunk', pan: -0.1 + 0.07 * i }));
  T.ROLL.forEach((f, i) => {
    if (f < T.at(2)) {
      place(B.trDrums, f, 0.8, (b) => snare(b, 0, sr, { gain: 0.2, tone: 210, decayMs: 140 }, 6020 + i), { kind: 'trsnare', pan: i % 2 ? 0.12 : -0.12 });
      return;
    }
    const v = rollVoice(f);
    place(B.trDrums, f, 0.4, (b) => snare(b, 0, sr, { gain: v.gain, tone: v.tone, decayMs: 70 }, 6030 + i), { kind: 'trroll', pan: i % 2 ? 0.2 : -0.2 });
  });
  T.HATS.forEach((f, i) => place(B.trDrums, f, 0.25, (b) => hat(b, 0, sr, { gain: f < T.at(2) ? 0.12 : i % 2 ? 0.1 : 0.15, decayMs: 30, cutoff: 9000 }, 6060 + i), { kind: 'trhat', pan: i % 2 ? 0.25 : -0.2 }));

  // ——— 1.1 the exhale: the sub boom (55 → 38 Hz over 1.2 s) and the paper fwump; the riser climbing to the vacuum ————————————————————
  place(B.trSub, T.EXHALE, 1.25, (b) => sweep(b, 0, sr, { from: 55, to: 38, ms: 1200, gain: 0.34, attackMs: 4, decayMs: 520 }), { kind: 'trboom' });
  placeStereo(B.trFx, T.EXHALE, seconds(26), (L, R, m) => travel(L, R, 0, m, sr, { from: 200, to: 1400, gain: 0.9, q: 0.8, panFrom: -0.3, panTo: 0.3, peak: 0.13, seed: 6080 }), { kind: 'trfwump' });
  place(B.trFx, T.OPEN.from, seconds(T.OPEN.to - T.OPEN.from), (b) => swellNoise(b, 0, b.length, sr, { from: 800, to: 9000, gain: 0.12, q: 1.2, curve: 2.2, seed: 6081 }), { kind: 'trriser' });

  // ——— The page Ctrl+V's itself: paper chks on the first three pastes; the key-repeat burr under the held C5 ————————————————————
  T.PASTE_TICKS.forEach((f, i) => place(B.trFx, f, 0.03, (b) => zip(b, 0, sr, { from: 2000, to: 6000, ms: 10, gain: 0.09, q: 1.2, seed: 6082 + i }), { kind: 'trpaste', pan: [-0.35, 0.35, 0][i % 3] }));
  T.KEY_REPEAT.forEach((f, i) => place(B.trFx, f, 0.02, (b) => burr(b, 0, sr, { gain: 0.045, seed: 6090 + i }), { kind: 'trburr', pan: -0.4 + (0.8 * i) / Math.max(1, T.KEY_REPEAT.length - 1) }));
  // 1.2, the Vertigo lurch: the rim's tock and a paper thwack (the pad sags with the dolly: wobbleAt).
  place(B.trDrums, T.RIM, 0.12, (b) => rim(b, 0, sr, { gain: 0.24 }, 6100), { kind: 'trrim' });
  place(B.trFx, T.RIM, 0.12, (b) => paperThwack(b, 0, sr, { gain: 0.16, seed: 6101 }), { as: 'trrim', pan: 0.1 });
  // 1.3, the launch: a whump peaking two frames after the kick (the camera's surge), low and wide.
  placeStereo(B.trFx, T.LAUNCH, seconds(20), (L, R, m) => travel(L, R, 0, m, sr, { from: 90, to: 900, gain: 1.0, q: 0.8, panFrom: 0, panTo: 0, peak: 0.3, seed: 6102 }), { kind: 'trlaunch', start: T.LAUNCH + 2 - 0.3 * 20 });

  // ——— The gates: a doppler pass on every roll hit from 1.4 to the crash, peaking on the hit, louder and brighter as the speed climbs ——
  T.GATES.forEach((f, i) => {
    const s = Math.max(6, speedAt(f)) / 24;
    const pre = 10;
    const post = 8;
    const side = i % 2 ? 1 : -1;
    placeStereo(B.trFx, f, seconds(pre + post), (L, R, m) => doppler(L, R, 0, m, sr, {
      from: 1800 + 3200 * s, to: 600 + 500 * s, gain: 0.14 + 0.18 * s, q: 1.5, peak: pre / (pre + post), width: 0.1 + 0.06 * (1 - s), panFrom: -0.6 * side, panTo: 0.6 * side, seed: 6110 + i,
    }), { kind: 'trgate', start: f - pre });
  });

  // ——— The flight noise: its band follows the speed, ducked by the kicks, panned L → R with the corkscrew, cut dead on the crash ——————
  if (mark('trflight', T.FLIGHT_NOISE.from)) {
    const a = lo(T.FLIGHT_NOISE.from);
    const m = lo(T.FLIGHT_NOISE.to) - a;
    const g = duck(m, kicks.filter((k) => k >= T.FLIGHT_NOISE.from).map((k) => lo(k) - a), sr, { depth: 0.55, attackMs: 2, releaseMs: 150 });
    const fr = (i) => frameAt(a + i);
    trackedNoise(B.trFx.L, B.trFx.R, a, m, sr, {
      centre: (i) => flightCentre(fr(i)),
      level: (i) => 0.18 * (speedAt(fr(i)) / 24) ** 0.6 * g[i] * Math.min(1, (m - i) / (0.0015 * sr)),
      pan: (i) => flightPan(fr(i)),
      q: 1.1,
      body: 0.5,
      seed: 6120,
    });
  }
  // 2.2, the corkscrew: a whoosh L → R over the beat.
  placeStereo(B.trFx, T.CORKSCREW[0], seconds(24), (L, R, m) => travel(L, R, 0, m, sr, { from: 900, to: 6000, gain: 0.1, q: 1.4, panFrom: -0.85, panTo: 0.85, peak: 0.45, seed: 6125 }), { kind: 'trcorkscrew' });

  // ——— 2.3 the crash stop: a 45 Hz slam; the collapse blips, the rumble, the reverse cymbal into the vacuum; 2.4 the ✦'s shing ——————————
  place(B.trSub, T.CRASH, 0.5, (b) => kick(b, 0, sr, { gain: 0.42, f0: 95, f1: 45, pitchMs: 14, decayMs: 120 }, 6130), { kind: 'trslam' });
  T.COLLAPSE_BLIPS.forEach((f, k) => place(B.trBell, f, 0.4, (b) => fmBell(b, 0, sr, { freq: midi(84 + 2 * k), gain: 0.055, decay: 0.06, ratio: 2, index: 2.6, attackMs: 0.6 }), { kind: 'trblip', pan: (k % 2 ? 1 : -1) * (0.15 + 0.07 * k) }));
  place(B.trSub, T.RUMBLE.from, seconds(T.RUMBLE.to - T.RUMBLE.from), (b) => rumble(b, 0, b.length, sr, { freq: 40, gain: 0.2, seed: 6131 }), { kind: 'trrumble' });
  place(B.trFx, T.REVERSE_CYMBAL.to, seconds(T.REVERSE_CYMBAL.to - T.REVERSE_CYMBAL.from), (b) => reverseCymbal(b, b.length, b.length, sr, { gain: 0.26, seed: 6132 }), { kind: 'trrevcym', start: T.REVERSE_CYMBAL.from });
  place(B.trBell, T.SHING, 0.5, (b) => {
    fmBell(b, 0, sr, { freq: 5587.65, gain: 0.04, decay: 0.09, ratio: 1.414, index: 3.2, attackMs: 0.4 });
    fmBell(b, Math.round(0.004 * sr), sr, { freq: 7902.13, gain: 0.02, decay: 0.06, ratio: 1.5, index: 2, attackMs: 0.4 });
  }, { kind: 'trshing' });

  // ——— Harmony: the pad (ii → Vsus) behind its opening low-pass, sagging on the lurch, pumping in bar 2; the sub ———————————————————
  const chords = T.CHORDS.map((c, k) => ({ ...c, to: k + 1 < T.CHORDS.length ? T.CHORDS[k + 1].at : T.POINT }));
  chords.forEach((c) => mark('trpad', c.at));
  if (solo('trpad', T.CHORDS[0].at)) {
    const L = new Float32Array(len);
    const R = new Float32Array(len);
    pad(L, R, chords.map((c) => {
      const v = LIFT_VOICINGS[c.chord];
      // The top voice and the B♭ doubled an octave up as the filter opens: the lift's brightness arrives with it.
      return { at: lo(c.at), len: lo(c.to) - lo(c.at), freqs: [...v, v[3] + 12, v[4] + 12].map(midi) };
    }), sr, {
      voices: 6, detune: 0.16, spread: 0.9, q: 0.9, attackMs: 40, releaseMs: 120, seed: 6140,
      gain: (i) => {
        const f = frameAt(i);
        return f < T.at(2) ? 0.055 + 0.025 * ((f - T.EXHALE) / (T.at(2) - T.EXHALE)) : 0.12;
      },
      cutoff: (i) => padCutoff(frameAt(i)),
      bend: (i) => wobbleAt(frameAt(i)),
    });
    const g = duck(len, kicks.filter((k) => k >= T.LAUNCH).map(lo), sr, { depth: 0.55, attackMs: 2, releaseMs: 150 });
    for (let i = 0; i < len; i++) {
      B.trPad.L[i] += L[i] * g[i];
      B.trPad.R[i] += R[i] * g[i];
    }
  }
  // The sub: G1 from the launch (the boom carries the first half bar), the C2 pedal through bar 2, pumping with every kick.
  if (mark('trsub', T.LAUNCH)) {
    const a = lo(T.LAUNCH);
    const b = lo(T.POINT);
    const g = duck(len, kicks.map(lo), sr, { depth: 0.85, attackMs: 2, releaseMs: 110 });
    let ph = 0;
    for (let i = a; i < b; i++) {
      const f = frameAt(i);
      const pedal = f >= T.at(2);
      ph += midi(pedal ? LIFT_ROOTS.Vsus : LIFT_ROOTS.ii) / sr;
      const v = (pedal ? 0.25 : 0.15) * Math.min(1, (i - a) / (0.004 * sr)) * Math.tanh(1.4 * Math.sin(2 * Math.PI * ph)) * g[i];
      B.trSub.L[i] += v;
      B.trSub.R[i] += v;
    }
  }

  // ——— The 8-bit Blue Danube: chip square, duty 25 %, a vibrato from 80 ms (±15 cents, 5.5 Hz), ping-pong 0.3 s, unfiltered ———————————
  const notes = T.WALTZ.filter((w) => mark('trwaltz', w.at)).map((w) => ({ at: lo(w.at), len: Math.round(0.94 * (lo(w.to) - lo(w.at))), freq: midi(w.midi), duty: 0.25 }));
  if (notes.length) {
    const starts = notes.map((nt) => nt.at);
    let k = 0;
    const buf = new Float32Array(len);
    chip(buf, notes, sr, {
      gain: 0.16,
      cutoff: () => 14000,
      q: 0.8,
      crushHz: () => 22050,
      bits: 7,
      bend: (j) => {
        while (k + 1 < starts.length && starts[k + 1] <= j) k++;
        const t = (j - starts[k]) / sr - 0.08;
        return t <= 0 ? 0 : 0.15 * Math.min(1, t / 0.06) * Math.sin(2 * Math.PI * 5.5 * t);
      },
    });
    for (let i = 0; i < len; i++) {
      B.trWaltz.L[i] += 0.7071 * buf[i];
      B.trWaltz.R[i] += 0.7071 * buf[i];
    }
    pingPong(B.trWaltz, sr, { time: 0.3, feedback: 0.35, mix: 0.3 });
  }

  // ——— 2.4&, S2 the vacuum: the point's whine alone on the post bus, wavering with the tremble, cut a frame before the bang ————————————
  postAt(T.WHINE.from, seconds(T.WHINE.to - 1 - T.WHINE.from), (b) => lineWhine(b, 0, b.length, sr, { gain: 0.012, decayMs: 4000, freq: (k) => whineFreq(T.WHINE.from + (k * FPS) / sr) }), { kind: 'trwhine' });

  // The lift's level (bible §1: −13.0 ± 0.7, bar 1 ≈ −14.5, bar 2 ≈ −11.5): one gain a bar on its own buses (never the master).
  for (const bus of Object.values(B)) {
    for (let i = 0; i < len; i++) {
      const g = liftTrim(frameAt(i));
      bus.L[i] *= g;
      bus.R[i] *= g;
    }
  }
  // Every music bus ends on the vacuum (a 1.5 ms fade: the reverse cymbal stops dead, no B♭5 rings into it); the post bus plays on.
  S.commit({ cut: T.POINT });
  return S.events;
}

/** The transition's first and last samples in the film at `sr` (its WAV and its tests). */
export const TRANSITION_SAMPLES = (sr) => ({ from: sampleOf(T.TRANSITION_START, sr), to: sampleOf(T.TRANSITION_END, sr) });
