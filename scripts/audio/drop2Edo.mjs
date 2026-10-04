// Drop 2's woodblock wave (bars 10–11, `ukiyoe.print`) made EDO (2026-10-03, so the woodblock wave's music sounds more Edo): the instruments of
// an Edo theatre and its prints, each on a visible event of the build sheet's §3 rows 864–1055, every frame a score name of
// src/score/drop2.ts (the picture of this world will be redesigned, D5: the sounds move with the names). The beat, the key and the chords
// stay the song's (IV → V in F♯ major, straight + taiko); the Edo colour comes from the timbres and the scale:
//   the shamisen (三味線, honchōshi on C♯: C♯4 F♯4 C♯5): its bachi striking string and skin, the first string's sawari buzz — the wave's
//   chord voice on the 8ths (the lip's fingers tighten on every kick, the white flow lines surge on every open hat), the chord's own tones,
//   each fall into A♯ or E♯ slid from the semitone above (the in-scale's sigh) — in place of the koto's 16ths (no constant layer);
//   the koto (箏) in the miyako-bushi in-scale on A♯ (A♯ B D♯ E♯ F♯: all of F♯ major, so the chords stand; HIRAJOSHI): its sweep up the
//   strings on the burst (10.1) and the amber ink climbing the flow lines (10.1& – 10.2&), a string a 16th;
//   the hyoshigi (拍子木): the "chon!" on each block of the print (10.1 – 10.2) and the act's closing clappers as Defender quantises the
//   print (11.4, 11.4e, 11.4&);
//   the tsuke (付け打ち): kabuki's "battari!" on the three mie — the dive into the barrel (10.4), the crash (11.1), the seal (11.2);
//   the tsuzumi (鼓): the kotsuzumi's "pon" as he lands (the crest 10.3, the prow 11.2&), the ōtsuzumi's "kan!" as the fingers turn on
//   Defender's boats (10.2&) and as he stomps the prow (11.3);
//   the shakuhachi (尺八): the small mountain's breath (10.3&, 11.3&) — one short breathy phrase each, never held: the second sighs out
//   under Defender's scan line, gone before the arcade;
//   the ō-daiko (大太鼓): under the crash (11.1), with the kick's taiko.
// Every voice adds into `out` from sample `at`, silent before it, deterministic for its seed (9300–9499). Placed by renderEdo() (called by
// scripts/audio/drop2Act2.mjs with its context). The closing clappers and the breaths stay off the music bus that Defender crushes in 11.4:
// crushed (sample-and-hold), their noise filled the band with images, and the delivery's AAC, starved going into the arcade, rang over its
// ceiling on 12.1& (measured over ten encodes: 4 in 10 over −1.55 dBTP crushed, 1 in 10 not; the current mix 0 in 10).
// FIX ROUND (the checker, same night: in the finished mix the Edo voices were written, not heard — the shamisen 14–24 dB, the ink 22–30 dB,
// the tsuke's crack 11–17 dB, the blocks' hyoshigi 9–10 dB under the rest): the shamisen an octave up and ≈ 15 dB louder (its strike's spike soft-clipped), every string
// on the sawari (SHAMISEN_GAIN); the ink run ≈ 25 dB louder, its pluck's spike soft-clipped, a crescendo up the scale, and the sweep
// ≈ 11 dB (KOTO_EDO); the tsuke's crack ≈ 11 dB (tsuke `crack`, TSUKE_HIT) on the post bus, dry and out of the group clip; the blocks'
// hyoshigi and the kan on 10.2& 6 dB (BLOCK_KI: the keyline's and the boats' the heaviest; KAN_GAIN). Each now ≥ −6 dB against the
// rest of drop 2 in its band (tests/drop2Audio.test.mjs, E).
// V07 (the continuity plan, WP2): the ō-daiko also on 10.1, in place of the burst's impact and the taiko's DON (ODAIKO); the shamisen one
// string on 10.1 and its open strings' chord on 10.1& (the hero lands in his pose), thinned on 10.2 under the koto's hook; the closing ki
// on the music bus, crushed with it into the arcade (CLOSING_KI_GAIN); 11.4&'s string the march's D♯, crushed; the ō-daiko's DON carried
// onto 12.1, crushed into the arcade's grain (ARCADE_DON, crushOwn); the koto's sweep's spikes soft-clipped (KOTO_EDO.sweepClip).
import { rng } from '../../src/engine/random.ts';
import * as D from '../../src/score/drop2.ts';
import { FPS, FRAMES_PER_BEAT } from '../../src/score/tempo.ts';
import { taiko } from './drop2Act2Voices.mjs';
import { MOUNTAIN } from './drop2Worlds.mjs';
import { Biquad, SVF } from './filters.mjs';

const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};
const SIXTEENTH = FRAMES_PER_BEAT / 4;
/** The sawari's rattle against the string's own tone (shamisen()). */
const BUZZ = 12;
/** The shamisen's body thump under the bachi: on C♯4, a tone of every chord the wave plays (IV and V; a thump at 190 Hz smeared onto G). */
const BODY_HZ = 277.18;
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

// ——— Voices ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A shamisen string (Karplus–Strong on a moving delay, linear-interpolated): the bachi's strike near the bridge (a bright, sharp shape
 * fed into the string over its first period) and its slap on the skin (`bachi`: a dry "pa" — band-passed noise at 1.4 kHz and the body's
 * thump on C♯4, BODY_HZ, gone in 20 ms). The pitch slides from `from` semitones onto `freq` over `slideMs` (the suri), the delay tuned for the
 * loop's own filters at every sample. The string loses 60 dB in `decay` s through a bright one-pole loss. With `sawari` (0–1) it buzzes
 * against the neck: wherever its swing passes 6 % of its first peak (one side only) it grazes the sawari, loses a little of that swing and
 * rattles — the swing's corners there, rung at 3.2 kHz (BUZZ × `sawari` of it) — so the buzz rings while the string is loud and dies into
 * the plain tone ("biin").
 */
export function shamisen(out, at, sr, { freq, gain = 0.1, decay = 0.6, sawari = 0, bachi = 1, from = 0, slideMs = 40, seed = 9300 } = {}) {
  const r = rng(seed);
  const lpA = 0.72;
  const pole = 0.9995;
  const fmin = freq * 2 ** (Math.min(0, from) / 12);
  const size = 2 ** Math.ceil(Math.log2(sr / fmin + 8));
  const buf = new Float32Array(size);
  const n = Math.round((1.15 * decay + 0.02) * sr);
  const period0 = Math.round(sr / (freq * 2 ** (from / 12)));
  // The pluck: a sharp triangle peaking near the bridge (15 % along) over bright noise, its mean removed, peak 1.
  const exc = new Float32Array(period0);
  let lp = 0;
  for (let k = 0; k < period0; k++) {
    const u = k / period0;
    const tri = u < 0.15 ? u / 0.15 : (1 - u) / 0.85;
    lp += 0.85 * (r() * 2 - 1 - lp);
    exc[k] = 0.65 * tri + 0.35 * lp;
  }
  const mean = exc.reduce((s, v) => s + v, 0) / period0;
  let peak = 1e-9;
  for (let k = 0; k < period0; k++) peak = Math.max(peak, Math.abs((exc[k] -= mean)));
  for (let k = 0; k < period0; k++) exc[k] /= peak;
  // The loop's phase delay (samples) at ω: the one-pole loss and the DC blocker.
  const loopDelay = (w) => {
    const lpPhase = -Math.atan2((1 - lpA) * Math.sin(w), 1 - (1 - lpA) * Math.cos(w));
    const dcPhase = Math.atan2(Math.sin(w), 1 - Math.cos(w)) - Math.atan2(pole * Math.sin(w), 1 - pole * Math.cos(w));
    return -(lpPhase + dcPhase) / w;
  };
  const buzz = new SVF(sr);
  const slap = new SVF(sr);
  const slide = Math.max(1, (slideMs / 1000) * sr);
  let s = 0;
  let x1 = 0;
  let y1 = 0;
  let fNow = 0;
  let top = 0;
  let lastExcess = 0;
  let dNow = 0;
  let gNow = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = freq * 2 ** ((from * (1 - smooth(i / slide))) / 12);
    if (f !== fNow) {
      fNow = f;
      dNow = sr / f - loopDelay((2 * Math.PI * f) / sr);
      gNow = 0.001 ** (1 / (f * decay));
    }
    const pos = i - dNow;
    const k0 = Math.floor(pos);
    const fr = pos - k0;
    const a = k0 >= 0 ? buf[k0 & (size - 1)] : 0;
    const b = k0 + 1 >= 0 ? buf[(k0 + 1) & (size - 1)] : 0;
    s += lpA * (a + fr * (b - a) - s);
    let v = gNow * s;
    // The sawari: the string's swing past `th` grazes the neck — a little of it is held back (the string loses it) and its corners
    // rattle, once a cycle: the buzz.
    if (i < 2 * period0) top = Math.max(top, Math.abs(v));
    const th = i < 2 * period0 ? Infinity : 0.06 * top;
    const excess = sawari > 0 && v > th ? v - th : 0;
    v -= 0.1 * sawari * excess;
    buzz.process(excess - lastExcess, 3200, 1.4);
    lastExcess = excess;
    const x = (i < period0 ? exc[i] : 0) + v;
    const y = x - x1 + pole * y1;
    x1 = x;
    y1 = y;
    buf[i & (size - 1)] = y;
    slap.process(t < 0.004 ? r() * 2 - 1 : 0, 1400, 1.2);
    const skin = bachi * (0.9 * slap.bp + 0.35 * Math.sin(2 * Math.PI * BODY_HZ * t) * Math.exp(-t / 0.018));
    put(out, at + i, gain * Math.min(1, i / 2) * Math.min(1, (n - i) / (0.12 * n)) * (0.8 * y + BUZZ * sawari * buzz.bp + skin));
  }
}

/**
 * The hyoshigi (拍子木): two bars of hard wood struck together — the kabuki stage's "chon!". Each bar rings a free bar's modes (1, 2.76,
 * 5.40 × its pitch, over 70, 30 and 12 ms: short, so the print's blocks a 16th apart each stand alone), the second bar 4 % higher so the
 * pair beats; the knock of the strike is 1 ms of noise above 2 kHz. Gone in 350 ms.
 */
export function hyoshigi(out, at, sr, { freq = 1180, gain = 0.2, seed = 9310 } = {}) {
  const r = rng(seed);
  const hp = new SVF(sr);
  const n = Math.round(0.35 * sr);
  const modes = [[1, 1, 0.07], [2.76, 0.45, 0.03], [5.4, 0.2, 0.012]];
  const phase = [r(), r(), r(), r(), r(), r()].map((p) => 2 * Math.PI * p);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = 0;
    [1, 1.04].forEach((bar, j) => {
      modes.forEach(([ratio, amp, tau], m) => {
        v += (j ? 0.8 : 1) * amp * Math.sin(2 * Math.PI * freq * bar * ratio * t + phase[3 * j + m]) * Math.exp(-t / tau);
      });
    });
    hp.process(t < 0.001 ? r() * 2 - 1 : 0, 2000, 0.7);
    put(out, at + i, gain * Math.min(1, t / 0.0003) * Math.min(1, (n - i) / (0.1 * n)) * (0.55 * v + 0.9 * hp.hp));
  }
}

/**
 * The tsuke (付け打ち): two oak clappers slammed on a board on the stage floor, kabuki's "battari!" (one strike; renderEdo() places the
 * pair). A hard crack (noise 1.5–7 kHz, saturated on its own, `crack` × the board's level at most, gone in 7 ms; 0.3 the first pass's
 * level), the board's three modes (190, 430, 820 Hz, over 60, 35 and 20 ms) with their slap, a little saturation; dry. Gone in 250 ms.
 */
export function tsuke(out, at, sr, { gain = 0.3, crack: snap = 0.3, seed = 9320 } = {}) {
  const r = rng(seed);
  const crack = new SVF(sr);
  const knock = new SVF(sr);
  const n = Math.round(0.25 * sr);
  const modes = [[190, 1, 0.06], [430, 0.7, 0.035], [820, 0.45, 0.02]];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const x = r() * 2 - 1;
    crack.process(x, 3500, 0.6);
    knock.process(x, 600, 0.9);
    let board = 0;
    for (const [f, a, tau] of modes) board += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / tau);
    // The clappers' crack, saturated on its own (`snap` × the board's level at most), so it can stand over the board.
    const hit = snap * Math.tanh(6 * crack.bp) * Math.exp(-t / 0.007);
    const v = Math.tanh(1.4 * (0.8 * board + 0.9 * knock.bp * Math.exp(-t / 0.012))) + hit;
    put(out, at + i, gain * Math.min(1, t / 0.0002) * Math.min(1, (n - i) / (0.15 * n)) * v);
  }
}

/**
 * The kotsuzumi's "pon" (小鼓, the shoulder drum): the fingers' slap (noise at 2.5 kHz, 4 ms) and the skin's tone, whose pitch the hand
 * lifts by squeezing the ropes — from 0.92 × `freq` up past it (1.06 ×, at 50 ms) and settling back onto it — with two faint inharmonic
 * modes (1.52, 2.3 ×). Rings ≈ 0.6 s.
 */
export function pon(out, at, sr, { freq = 330, gain = 0.15, seed = 9330 } = {}) {
  const r = rng(seed);
  const slap = new SVF(sr);
  const n = Math.round(0.65 * sr);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const squeeze = 0.92 + 0.14 * smooth(t / 0.05) - 0.06 * smooth((t - 0.05) / 0.25);
    p += (freq * squeeze) / sr;
    const tone = Math.sin(2 * Math.PI * p) * Math.exp(-t / 0.2) + 0.25 * Math.sin(2 * Math.PI * 1.52 * p) * Math.exp(-t / 0.06) + 0.12 * Math.sin(2 * Math.PI * 2.3 * p) * Math.exp(-t / 0.03);
    slap.process(t < 0.004 ? r() * 2 - 1 : 0, 2500, 1);
    put(out, at + i, gain * Math.min(1, t / 0.0008) * Math.min(1, (n - i) / (0.1 * n)) * (tone + 0.6 * slap.bp));
  }
}

/**
 * The ōtsuzumi's "kan!" (大鼓, the hip drum: a hard, dry skin struck with capped fingers): a crack of noise (2–7 kHz, 3 ms) on a short,
 * high ring (`freq` and 1.62 ×, gone in 30 ms). 30 dB down within 120 ms.
 */
export function kan(out, at, sr, { freq = 1250, gain = 0.15, seed = 9335 } = {}) {
  const r = rng(seed);
  const crack = new SVF(sr);
  const n = Math.round(0.15 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    crack.process(r() * 2 - 1, 4000, 0.7);
    const ring = (Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(2 * Math.PI * 1.62 * freq * t)) * Math.exp(-t / 0.012);
    put(out, at + i, gain * Math.min(1, t / 0.0002) * Math.min(1, (n - i) / (0.1 * n)) * Math.tanh(1.5 * (1.4 * crack.bp * Math.exp(-t / 0.003) + ring)));
  }
}

/**
 * A short shakuhachi phrase (尺八): `notes` ({ t: s from its start, midi, len: s }) slurred, each lifted onto its pitch from below over
 * 70 ms (kari; the first from a semitone under), a breath vibrato (yuri, 5 Hz) growing over each note, a small dip where the finger
 * changes; a breathy tone — a sine with weak 2nd and 3rd harmonics, air around the fundamental (noise in a band at the pitch, q 5) and
 * broadband breath above 2 kHz — opened by the muraiki, a hard burst of breath. It swells in 40 ms and dies away by its last note's end
 * (no held bed): silent `release` s after it.
 */
export function shakuhachi(out, at, sr, { notes, gain = 0.08, breath = 0.5, release = 0.04, seed = 9340 } = {}) {
  const r = rng(seed);
  const air = new SVF(sr);
  const hiss = new SVF(sr);
  const blast = new SVF(sr);
  const end = notes[notes.length - 1].t + notes[notes.length - 1].len;
  const n = Math.round((end + release) * sr);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let k = 0;
    while (k + 1 < notes.length && t >= notes[k + 1].t) k++;
    const note = notes[k];
    const u = t - note.t;
    const lift = (k === 0 ? 1 : 0.6) * (1 - smooth(u / 0.07));
    const yuri = 0.22 * smooth((u - 0.06) / 0.2) * Math.sin(2 * Math.PI * 5 * u);
    const f = 440 * 2 ** ((note.midi - lift + yuri - 69) / 12);
    p += f / sr;
    const change = k > 0 ? 1 - 0.3 * Math.exp(-((u / 0.012) ** 2)) : 1;
    const shape = Math.min(1, t / 0.04) * (t < end ? 0.5 + 0.5 * Math.cos(Math.PI * smooth((t - 0.55 * end) / (0.45 * end))) : 0) * change;
    const x = r() * 2 - 1;
    air.process(x, f, 5);
    hiss.process(x, 2000, 0.7);
    blast.process(x, 1200, 0.7);
    const tone = Math.sin(2 * Math.PI * p) + 0.18 * Math.sin(4 * Math.PI * p) + 0.08 * Math.sin(6 * Math.PI * p);
    const muraiki = 1.6 * blast.bp * Math.exp(-t / 0.06);
    const v = shape * (tone + breath * (1.2 * air.bp + 0.25 * hiss.hp)) + muraiki * Math.min(1, t / 0.004);
    put(out, at + i, gain * v * Math.min(1, (n - i) / (release * sr + 1)));
  }
}

// ——— Where they play: the score's names (src/score/drop2.ts), sheet §3 rows 864–1055 ——————————————————————————————————————————

/** The miyako-bushi in-scale on A♯ (pitch classes A♯ B D♯ E♯ F♯: 0 1 5 7 8 over A♯), all inside F♯ major. */
export const IN_SCALE = [10, 11, 3, 5, 6];
/** The koto's hirajōshi tuning on that scale (strings 2–13, from D♯4): its sweep and its runs pick strings from here. */
export const HIRAJOSHI = [63, 65, 66, 70, 71, 75, 77, 78, 82, 83, 87, 89];
/**
 * The shamisen's open strings (honchōshi on C♯: C♯4 F♯4 C♯5); the first buzzes on the sawari. An octave up since the fix round (2026-10-03,
 * the checker: on C♯3 the plucks sat 14–24 dB under the rest, inside the kick, the taiko and the bass): from C♯4 they play over them.
 */
export const HONCHOSHI = [61, 66, 73];
/** His stomp on the lead boat's prow (11.3: a hop from 11.2& + 6, landing on the kick; the scoreboard's first pip falls with it). */
export const PROW_STOMP = D.SEAL + FRAMES_PER_BEAT;
/**
 * The shamisen's 8ths (sheet rows 864–1044: on every kick the lip's fingers tighten, on every open hat the white flow lines surge 14 px),
 * to the last surge before the arcade's first "pew" (11.4&). Each: the strings (MIDI; the first entry is struck hardest), the chord's tones
 * of IV (C♯ D♯ F♯ A♯) and of V (C♯ D♯ E♯ B); a slide (`from`, semitones from the note): over IV the in-scale's fall B → A♯, over V a
 * rise D♯ → E♯ (the shakuhachi sings V's semitone, F♯ → E♯, off the chord bus).
 */
export const SHAMISEN = [
  // v07 (§3, seam 4320): 10.1 one string (the sawari's C♯4), the full chord of the open strings on 10.1& (the hero lands in his pose:
  // drop2MochiPen's beat), the 10.2 string thinned under the koto's hook (`gain`); they were the chord on 10.1 and an A♯ on 10.1&.
  { at: D.BURST, notes: [61], from: 0 },
  { at: D.BURST + 2 * SIXTEENTH, notes: [61, 66, 73], from: 0 },
  { at: D.BLOCKS[4], notes: [66], from: 0, gain: 0.85 },
  { at: D.CLAWS, notes: [73], from: 0 },
  { at: D.CREST, notes: [61, 73], from: 0 },
  { at: D.CREST + 2 * SIXTEENTH, notes: [66], from: 0 },
  { at: D.BARREL.from, notes: [70], from: 1 },
  { at: D.BARREL.from + 2 * SIXTEENTH, notes: [75], from: 0 },
  { at: D.WAVE_CRASH, notes: [61, 65, 73], from: 0 },
  { at: D.WAVE_CRASH + 2 * SIXTEENTH, notes: [71], from: 0 },
  { at: D.SEAL, notes: [65], from: -2 },
  { at: D.PROW, notes: [63], from: 0 },
  { at: PROW_STOMP, notes: [61, 65], from: 0 },
  { at: PROW_STOMP + 2 * SIXTEENTH, notes: [71], from: 0 },
  { at: D.DOWNSAMPLE.from, notes: [65], from: -2 },
  // v07 (seam 4512): 11.4& plays the march's first note, D♯ (the arcade's triangle starts its D♯ C♯ B A♯ a 16th later), crushed with the
  // music bus (`crushed`: on the chord bus, the plain string without the sawari's buzz, whose images rang the AAC). It was a C♯ on the fx bus.
  { at: D.DOWNSAMPLE_STEPS[2], notes: [63], from: 0, crushed: true },
];
/** The koto's sweep up the hirajōshi strings on the burst (10.1: the print's keyline lands), a string every 13 ms, to D♯6. */
export const SWEEP = HIRAJOSHI.slice(0, 11);
/** The amber ink climbing the flow lines (INFECT_ROWS, a 16th each): the koto up the in-scale, A♯5 B5 D♯6 E♯6 F♯6 A♯6. */
export const INK_RUN = [82, 83, 87, 89, 90, 94];
/** Kabuki's three mie (the main strike on the frame, the pickup a 32nd before): the dive (10.4), the crash (11.1), the seal (11.2). */
export const TSUKE = [D.BARREL.from, D.WAVE_CRASH, D.SEAL];
/** The kotsuzumi as he lands (the crest 10.3: F♯4; the prow 11.2&: E♯4), the ōtsuzumi as the fingers turn on the boats (10.2&) and on his stomp (11.3). */
export const PON = [{ at: D.CREST, midi: 66 }, { at: D.PROW, midi: 65 }];
export const KAN = [D.CLAWS, PROW_STOMP];
/**
 * The hyoshigi that close the act as Defender quantises the print (11.4, 11.4e, 11.4&). v07 (seam 4512): on the music bus, crushed with
 * it a step each (10 → 8 → 6 bits: sections/drop2.mjs's downsample), so the Edo world is quantised into the arcade's grain as the picture
 * is; CLOSING_KI_GAIN takes back the music bus's make-up and fader (+4.8 dB in bar 11) so they stay as loud as they were.
 */
export const CLOSING_KI = D.DOWNSAMPLE_STEPS.slice(0, 3);
export const CLOSING_KI_GAIN = 10 ** (-4.8 / 20);
/**
 * The ō-daiko (大太鼓), a fifth under the kick's taiko: v07 (§3) it replaces the burst's impact and the taiko's DON on 10.1 — tonal, no noise
 * — and stays under the crash (11.1), as built. `freq` 41 Hz; each hit's `gain` and `decayMs` (11.1's as built).
 */
export const ODAIKO = { freq: 41, hits: [{ at: D.BURST, gain: 0.34, decayMs: 650 }, { at: D.WAVE_CRASH, gain: 0.34, decayMs: 650 }] };
/**
 * v07 (seam 4512, FW3): one more DON on the arcade's downbeat (12.1), 6 dB under the chip thump (`gain`: the kick's 0.33 peak there and its LFSR burst), crushed to
 * `bits` (its own peak the full scale) and held at `holdHz`: the wave's drum, already in the arcade's grain, carried a beat into it.
 */
export const ARCADE_DON = { at: D.ARCADE.from, gain: 0.17, bits: 6, holdHz: 8000 };
/**
 * The mountain's breath (sheet: its faces pulse +16 % on 10.3&, +8 % on 11.3&): a shakuhachi phrase each, short and breathy, in the
 * in-scale — 10.3& E♯5 lifted to F♯5 (the scale's semitone, over IV); 11.3& D♯5 up to F♯5 and sighing onto E♯5 (over V) as the scan
 * line comes. On the chime bus (its long plate: a mountain far off).
 */
export const BREATHS = [
  { at: MOUNTAIN[0], notes: [{ t: 0, midi: 77, len: 0.09 }, { t: 0.09, midi: 78, len: 0.33 }], gain: 0.07 },
  { at: MOUNTAIN[1], notes: [{ t: 0, midi: 75, len: 0.1 }, { t: 0.1, midi: 78, len: 0.16 }, { t: 0.26, midi: 77, len: 0.28 }], gain: 0.075 },
];

/**
 * The shamisen's strings' gains: the first (struck hardest, on the sawari string) and the others (≈ 15 dB over the first pass's 0.11, 0.075);
 * each pluck soft-clipped at `clip` (its spike); the two under Defender's downsample, on the fx bus, `fx` × louder. v07: every Edo voice
 * ≈ 4 dB up (the blocks' hyoshigi and the kan ≈ 6, the pon 2) — the koto's hook now carries the wave (FW1, 0.22 → KOTO_HOOK), and each
 * Edo voice still stands within 6 dB of the rest of drop 2 in its band (tests/drop2Audio.test.mjs, E); 10.1 is loud by these voices (§3).
 */
export const SHAMISEN_GAIN = { first: 0.95, other: 0.67, clip: 0.48, fx: 1.4 };
/** The tsuke's strikes (+ 0.03 a mie) and their pickups, with their cracks (tsuke `crack`; 0.3 is the first pass's level). */
export const TSUKE_HIT = { gain: 0.48, crack: 1.8, pick: 0.25, pickCrack: 1.2 };
/** The ōtsuzumi's kan on the fingers' turn (10.2&) and on the stomp (11.3). */
export const KAN_GAIN = [0.52, 0.36];
/** The kotsuzumi's pon (0.16 before v07). */
export const PON_GAIN = { gain: 0.2 };
/** The koto in the in-scale: the sweep's strings (+ 0.007 each; v07: their spikes soft-clipped at sweepClip) and the ink run's notes (+ 0.004 each), their decays (s). */
export const KOTO_EDO = { sweep: 0.25, sweepDecay: 0.6, sweepClip: 0.18, ink: 2.38, inkStep: 0.095, inkDecay: 0.4, inkBright: 0.5, inkClip: 0.54 };
/** The block hyoshigi's gains (+ 0.02 a block; the last, the boats, the heaviest). */
export const BLOCK_KI = { first: 0.68, gain: 0.4, step: 0.06, last: 0.68 };

/**
 * A sound's own bitcrush, in place (ARCADE_DON): held every sr / `holdHz` samples and rounded to `bits` of its own peak, then low-passed
 * at 7 kHz (2 poles, twice) so the hold's images stay out of the band the delivery's AAC rings on.
 */
export function crushOwn(b, sr, { bits, holdHz }) {
  let peak = 1e-9;
  for (let i = 0; i < b.length; i++) peak = Math.max(peak, Math.abs(b[i]));
  const steps = 2 ** (bits - 1);
  const hold = Math.max(1, Math.round(sr / holdHz));
  let held = 0;
  for (let i = 0; i < b.length; i++) {
    if (i % hold === 0) held = (Math.round((b[i] / peak) * steps) / steps) * peak;
    b[i] = held;
  }
  const f = [Biquad.lowpass(sr, 7000), Biquad.lowpass(sr, 7000)];
  for (let i = 0; i < b.length; i++) b[i] = f.reduce((v, s) => s.process(v), b[i]);
}

/** Wraps `draw` so its buffer is topped at 16.5 kHz (8-pole Butterworth, as sections/drop2.mjs TOP.pre) once drawn: for the post bus. */
const topped = (sr, draw) => (b) => {
  draw(b);
  const f = [0.5098, 0.6013, 0.9, 2.5629].map((q) => Biquad.lowpass(sr, 16500, q));
  for (let i = 0; i < b.length; i++) b[i] = f.reduce((v, s) => s.process(v), b[i]);
};

/** Renders the Edo voices of bars 10–11 into the context's buses (drop2Act2.mjs renderNewBars, the wave). */
export function renderEdo(c) {
  const { sr, own, place, midi } = c;
  const hz = midi;

  // The shamisen's 8ths on the chord bus (the wave's chord voice): the first string's C♯4 buzzing on the sawari, the bachi on the skin.
  // Fix round (2026-10-03, the checker: 14–24 dB under the rest — no one would have named it): an octave up (HONCHOSHI) and ≈ 15 dB louder
  // (SHAMISEN_GAIN), every string grazing the sawari a little, so its buzz fills the 2.5–4.5 kHz the wave leaves open. The two under
  // Defender's downsample (11.4, 11.4&) go on the fx bus, uncrushed, as the closing clappers do (crushed at this level, their buzz's images
  // starved the delivery's AAC into 12.1: over its ceiling in 3 encodes of 10), SHAMISEN_GAIN.fx louder (the fx bus has no make-up or fader).
  SHAMISEN.forEach((x, k) => place(x.at >= D.DOWNSAMPLE.from && !x.crushed ? own.fx : own.d2chords, x.at, 1.2, (b) => {
    x.notes.forEach((m, j) => shamisen(b, Math.round(j * 0.006 * sr), sr, {
      freq: hz(m),
      gain: (j === 0 ? SHAMISEN_GAIN.first : SHAMISEN_GAIN.other) * (x.notes.length > 1 ? 1 : 0.95) * (x.gain ?? 1),
      decay: m === HONCHOSHI[0] ? 0.8 : 0.5,
      sawari: x.crushed ? 0 : m === HONCHOSHI[0] ? 1 : 0.5,
      bachi: j === 0 ? 1 : 0.3,
      from: x.from,
      slideMs: 45,
      seed: 9350 + 3 * k + j,
    }));
    // The strike's spike rounded off (SHAMISEN_GAIN.clip): 15 dB over the string's ring, it drove the group clip 11 dB deep, every bus with it.
    const lift = x.at >= D.DOWNSAMPLE.from && !x.crushed ? SHAMISEN_GAIN.fx : 1;
    for (let i = 0; i < b.length; i++) b[i] = lift * SHAMISEN_GAIN.clip * Math.tanh(b[i] / SHAMISEN_GAIN.clip);
    // Gone by the arcade (12.1, the hard cut to 8-bit; a 15 ms fade): rung on into it, the 16 kHz sample-and-hold the chord bus wears
    // there turned its buzz into images, and the delivery's AAC rang over its ceiling on 12.1e and 12.1& (3 encodes in 10).
    const end = Math.round(((D.ARCADE.from - x.at) / FPS) * sr);
    const fade = Math.round(0.015 * sr);
    for (let i = Math.max(0, end - fade); i < b.length; i++) b[i] *= Math.max(0, (end - i) / fade);
  }, { kind: 'd2shamisen', pan: [-0.25, 0.3, -0.1, 0.35, -0.3, 0.25, -0.15, 0.3][k % 8] }));

  // The tsuke's "battari!": the pickup a 32nd before (its own group), the strike on the frame — heavier each mie. On the post bus (fix round:
  // through the group clip, under the kick and the taiko, its crack sat 11–17 dB under the rest in 1.5–7 kHz): dry, unclipped, its crack
  // raised (TSUKE_HIT), topped at 16.5 kHz as the buses are (TOP.pre: the delivery's AAC).
  TSUKE.forEach((f, k) => {
    place(own.post, f - FRAMES_PER_BEAT / 8, 0.3, topped(sr, (b) => tsuke(b, 0, sr, { gain: TSUKE_HIT.pick + 0.03 * k, crack: TSUKE_HIT.pickCrack, seed: 9360 + 2 * k })), { group: 'd2tsukepick', pan: 0.15 });
    place(own.post, f, 0.3, topped(sr, (b) => tsuke(b, 0, sr, { gain: TSUKE_HIT.gain + 0.03 * k, crack: TSUKE_HIT.crack, seed: 9361 + 2 * k })), { kind: 'd2tsuke', pan: 0.15 });
  });
  // The tsuzumi: pon as he lands, kan! on the threat and the stomp (6 dB louder in the fix round on 10.2&, 3 dB on 11.3: KAN_GAIN).
  PON.forEach((x, k) => place(own.fx, x.at, 0.7, (b) => pon(b, 0, sr, { freq: hz(x.midi), gain: PON_GAIN.gain, seed: 9370 + k }), { kind: 'd2pon', pan: k ? 0.35 : -0.25 }));
  KAN.forEach((f, k) => place(own.fx, f, 0.2, (b) => kan(b, 0, sr, { freq: 1250 + 60 * k, gain: KAN_GAIN[k], seed: 9375 + k }), { kind: 'd2kan', pan: k ? 0.4 : 0.3 }));
  // The ō-daiko, a fifth under the kick's taiko: on 10.1 (v07: in place of the impact and the taiko's DON) and under the crash (11.1).
  ODAIKO.hits.forEach((x, k) => place(own.drums, x.at, 2.4, (b) => taiko(b, 0, sr, { freq: ODAIKO.freq, gain: x.gain, decayMs: x.decayMs }, k ? 9380 : 9379), { kind: 'd2odaiko', pan: 0 }));
  // v07: and its DON carried onto the arcade's downbeat, crushed into its grain, under the chip thump (ARCADE_DON).
  place(own.drums, ARCADE_DON.at, 2.4, (b) => {
    taiko(b, 0, sr, { freq: ODAIKO.freq, gain: ARCADE_DON.gain, decayMs: ODAIKO.hits[1].decayMs }, 9378);
    crushOwn(b, sr, ARCADE_DON);
  }, { kind: 'd2odaiko', pan: 0 });
  // The act's closing hyoshigi, a little louder each as the print is quantised (v07: crushed with the music bus, CLOSING_KI).
  CLOSING_KI.forEach((f, k) => place(own.d2music, f, 0.4, (b) => hyoshigi(b, 0, sr, { freq: 1180, gain: CLOSING_KI_GAIN * (0.11 + 0.02 * k), seed: 9385 + k }), { kind: 'd2ki', pan: 0.2 - 0.2 * k }));
  // The mountain's breath: a shakuhachi phrase on each pulse, far off.
  BREATHS.forEach((x, k) => place(own.chime, x.at, 1.2, (b) => shakuhachi(b, 0, sr, { notes: x.notes, gain: x.gain, breath: 0.55, seed: 9390 + k }), { kind: 'd2mountain', pan: -0.45 }));
}
