// Bridge A's sound, the part 'bridgeA' (v08: one bar between the cosmos and the comic club; film bar 23, frames 2112–2207 on the 63-bar
// map; score src/score/bridgeA.ts). The v07 review: the turn from the cosmos to the comic came too fast. Contract: output/qa/v08/MAP-CONTRACT.md.
//
// THE BREATH THAT PRINTS THE CLUB. The cosmos's stutter crushes to the point and the club's piano and horn have already pre-lapped into it
// (sections/cosmos.mjs PRELAP, 2106 and 2109). Here the cosmos's glass thins out while the club's groove arrives a layer a beat, in the
// club's own voices and room, so its downbeat is the next beat of something already playing, not six new sounds at once:
//   beat 1  the piano lands the club's IV (the pickup's answer, soft); the cosmos's glass plays the hook's head on its tinks — D6 C6 D6,
//           the notes club 1.1 sings — the C6 on the point's blink; closed hats creep in from 1.1e.
//   beat 2  the kick, low-passed (the club through a wall), with the press's thunk as the plates land; the hook's F6 whispered on 2&.
//   beat 3  the bass: the sub on B♭ and the pluck on the &s; the kick opens; the hook's E6 whispered as the plates register (a small
//           register clack); a reversed cymbal starts to swell into club 1.1's crash.
//   beat 4  the kick open; the snare fill on the sixteenths, rising (each prints the Ben-Day dots a ring further); a piano stab on 4a and
//           the horn lipped up into the downbeat on the last 32nd — the gesture the cosmos played into the point, now played into the club.
// Every voice here is a voice the club plays from 1.1 (kick, hats, piano, horn, sub, pluck, the hook) or the cosmos's glass, at the club's
// gains and sends, so club 1.1's new kinds are only its hit: the crash, the impact, the dot, the sung chord (FW3 ≤ 4).
// No cut, no silence: the plate rings across both of the bridge's lines (the club's room is the cosmos's room is this one: FW4). Its own
// buses start on the bridge's first frame and are cut on club 1.1 (stage(): a 1.5 ms fade), where the club's take over.
// Seeds 9000–9099. Event kinds ba… (the kicks end in "kick", the fill's snares in "fill", for check-sync).
import * as A from '../../../src/score/bridgeA.ts';
import { partBar } from '../../../src/score/film.ts';
import { FPS, FRAMES_PER_BEAT } from '../../../src/score/tempo.ts';
import { tink } from '../breakVoices.mjs';
import { hornHit, housePiano } from '../clubVoices.mjs';
import { stage } from '../cosmosStage.mjs';
import { click, hat, kick, press, snare } from '../drums.mjs';
import { SVF } from '../filters.mjs';
import { reverseCymbal } from '../fx.mjs';
import { addMono, duck, pingPong, stereo } from '../mix.mjs';
import { pluckBass } from '../synth.mjs';
import { voxChop } from '../vox.mjs';
import { HOOK_LEVEL, LEVEL_DB as CLUB_LEVEL_DB, OFF_KICK_PAN, PIANO, SUNG_SPREAD, WIDTH } from './club.mjs';
import { VOICINGS } from './drop1.mjs';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const SIXTEENTH = FRAMES_PER_BEAT / 4;

/** No cut: the plate rings across the bridge both ways (FW3: it restarts only after a designed silence, and neither line is one). */
export const CUTS = [];
/** No silence: the bridge is a breath, not a hole (the review of drop 2's end: a gap reads as a break). */
export const SILENCES = [];
/** Its buses and their reverb sends: the club's amounts for the club's voices (sections/club.mjs SENDS), the cosmos's for its glass. */
export const SENDS = { baDrums: 0.08, baPiano: 0.22, baBrass: 0.2, baGlass: 0.32, baVox: 0.4, baFx: 0.22, baBass: 0, baSub: 0 };
/** The seam whole (bgm.mjs writes public/audio/sections/bridgeA-seam.wav): the event horizon → the bridge → the club's first bar. */
export const PREVIEWS = [{ id: 'bridgeA-seam', fromBar: partBar('cosmos', 6), toBar: partBar('club', 1) }];
/** Nothing to edit in the finished mix (the cosmos's finish(), which runs before it, ends its stutter on the bridge's first frame). */
export function finish() {}

/** The bridge into the master at the club's level (sections/club.mjs LEVEL_DB): its voices are the club's, at the club's gains. */
export const LEVEL_DB = CLUB_LEVEL_DB;
/**
 * The hats, × the club's (0.2 on the beat, 0.25 on the &, 0.16 on the e and a): −15 dB on 1.1e rising to −9 on 4a, where club bar 1's own
 * fade-in starts (sections/club.mjs hatFadeIn: −9, −6, −3, 0 dB by beat): one crescendo across club 1.1.
 */
export const HAT_DB = { from: -15, to: -9 };
export const hatDb = (f) => HAT_DB.from + (HAT_DB.to - HAT_DB.from) * Math.min(1, Math.max(0, (f - A.HATS[0]) / (A.HATS[A.HATS.length - 1] - A.HATS[0])));
/**
 * The kicks from beat 2: the club's kick (its 0.5, a little under it here) low-passed at `cutoff` Hz (2 poles), opening beat by beat — on
 * 2.1 a thud through the wall, on 4.1 nearly open; club 1.1's kick (0.6) is the first one whole.
 */
export const KICK_STEPS = [
  { gain: 0.42, cutoff: 500 },
  { gain: 0.44, cutoff: 1200 },
  { gain: 0.42, cutoff: 4000 },
];
/** The press's thunk as the plates land (2.1) and the register's clack (3.1): the print heard. */
export const PRESS = { gain: 0.16, seed: 9014 };
export const CLACK = { gain: 0.09, tone: 2600, seed: 9015 };
/** The glass (FALL's tink, the cosmos's GLASS voice): the hook's head D6 C6 D6, near the centre (the stutter's room is narrow), softer each. */
export const GLASS_NOTES = [
  { midi: 86, gain: 0.24, decayMs: 600, pan: -0.1 },
  { midi: 84, gain: 0.2, decayMs: 500, pan: 0.12 },
  { midi: 86, gain: 0.18, decayMs: 450, pan: -0.05 },
];
/** … and its thread on the e and a of beats 2–3 (GLASS_THREAD), down B♭maj9 (F6 D6 F6 D6) as club bar 1's carried tinks are, fading. */
export const THREAD_NOTES = [89, 86, 89, 86];
export const THREAD = { gain: 0.13, stepDb: -2, decayMs: 300, pan: 0.3 };
/**
 * The piano on STABS (the club's house stab on IV, its gain × these): the landing (with the root an octave over the sub under it: the
 * breath's body), the 3-3-2 from the bass, the pickup; the off-kick ones panned as the club pans them (OFF_KICK_PAN by sixteenth).
 */
export const STAB_GAINS = [1.05, 0.45, 0.55, 0.6, 0.65, 0.7];
/**
 * The landing's left hand: the root in octaves (B♭1 B♭2) under the chord, centred and close (`spread`), held `frames` before the damper
 * and ringing `decay` s — the breath's body where the groove has no kick yet (FW4: the stutter's room is narrow and full in the lows).
 */
export const LANDING_BASS = { notes: [34, 46], gain: 1.15, frames: 20, decay: 1.2, spread: 0.08, seed: 9006 };
/** The horn's pickup (the cosmos's PRELAP horn: lipped up from 1.2 semitones under, two frames, into the downbeat). */
export const HORN = { gain: 0.42, frames: 3, scoop: 1.2, seed: 9030 };
/** The hook whispered (HOOK_GHOST): sung as the club sings it (HOOK_LEVEL.noteDb), `db` under, with its ping-pong. */
export const GHOST_DB = -4;
/** The sub (the club's: B♭1, saturated, ducked by each kick) at `gain` of the club's 0.27, from 3.1; the pluck on the &s, the club's. */
export const SUB = { gain: 0.65, root: 34 };
export const PLUCK = { gain: 0.22, bright: 2200 };
/** The fill: snares on beat 4's sixteenths and its last 32nd, rising (the club's FILL voice, a step under it), alternating sides. */
export const FILL = { gain: 0.14, step: 0.06, tone: 240, toneStep: 15, pan: 0.35 };
/** The open hats on the &s from beat 2 (the club's, at its gain × this). */
export const OPEN_GAIN = 0.7;
/** The reversed cymbal swelling into club 1.1's crash. */
export const SWELL_GAIN = 0.2;

/**
 * Renders bridge A into `stems` at `sr` (its own buses, SENDS). `origin`: the film frame of the stems' first sample. `solo(kind, frame)`
 * picks which sounds are rendered (check-seam-audio renders without the hook's voices). Returns its events as { kind, at } (film samples).
 */
export function renderBridgeA(stems, sr, { origin = 0, solo = () => true } = {}) {
  const S = stage(stems, sr, { origin, from: A.BRIDGE_A_START, to: A.BRIDGE_A_END, sends: SENDS, solo });
  const { B, place, lo, len } = S;

  // The piano on STABS: the landing (with its root), the 3-3-2 from the bass, the pickup.
  A.STABS.forEach((f, k) => {
    if (!S.mark('bastab', f)) return;
    const v = VOICINGS.IV;
    const sixteenth = Math.round((f - A.BRIDGE_A_START) / SIXTEENTH);
    if (f === A.LANDING) {
      const h = LANDING_BASS;
      housePiano(B.baPiano.L, B.baPiano.R, lo(f), sr, { notes: h.notes, len: lo(f + h.frames) - lo(f), gain: PIANO.gain * h.gain, bright: 0.8, decay: h.decay, releaseMs: 120, spread: h.spread, seed: h.seed });
    }
    housePiano(B.baPiano.L, B.baPiano.R, lo(f), sr, {
      notes: [...v, v[3] + 12], len: lo(f + PIANO.frames) - lo(f), gain: PIANO.gain * STAB_GAINS[k], bright: PIANO.bright, decay: PIANO.decay, releaseMs: PIANO.releaseMs,
      click: PIANO.click, pan: OFF_KICK_PAN[sixteenth] ?? 0, seed: 9000 + k,
    });
  });
  // The glass: the hook's head on beat 1, then its thread, fading.
  A.GLASS.forEach((f, k) => {
    const g = GLASS_NOTES[k];
    place(B.baGlass, f, 0.1 + (5 * g.decayMs) / 3000, (b) => tink(b, 0, sr, { freq: midi(g.midi), gain: g.gain, decayMs: g.decayMs, seed: 9005 + k }), { kind: 'batink', pan: g.pan });
  });
  A.GLASS_THREAD.forEach((f, k) => {
    const gain = THREAD.gain * 10 ** ((THREAD.stepDb * k) / 20);
    place(B.baGlass, f, 0.1 + (5 * THREAD.decayMs) / 3000, (b) => tink(b, 0, sr, { freq: midi(THREAD_NOTES[k]), gain, decayMs: THREAD.decayMs, seed: 9010 + k }), { kind: 'batink', pan: (k % 2 ? 1 : -1) * THREAD.pan });
  });
  A.OPEN_HATS.forEach((f, i) => place(B.baDrums, f, 0.6, (b) => hat(b, 0, sr, { gain: 0.22 * OPEN_GAIN, decayMs: 140, cutoff: 7500 }, 9080 + i), { kind: 'baopenhat', pan: i % 2 ? -WIDTH.open : WIDTH.open }));

  // The hats from 1.1e, creeping up (hatDb), at the club's pattern and width.
  A.HATS.forEach((f, i) => {
    const s = Math.round((f - A.BRIDGE_A_START) / SIXTEENTH) % 4;
    const g = 10 ** (hatDb(f) / 20) * (s === 2 ? 0.25 : s % 2 ? 0.16 : 0.2);
    place(B.baDrums, f, 0.25, (b) => hat(b, 0, sr, { gain: g, decayMs: 34, cutoff: 9000 }, 9040 + i), { kind: 'bahat', pan: s % 2 ? WIDTH.hats[1] : WIDTH.hats[0] });
  });

  // The kicks, low-passed and opening; the press's thunk on the first (the plates land), the register's clack on the second.
  A.KICKS.forEach((f, i) => {
    const k = KICK_STEPS[i];
    place(B.baDrums, f, 1, (b) => {
      kick(b, 0, sr, { gain: k.gain, f0: 210, f1: 45, pitchMs: 38, decayMs: 260 }, 9020 + i);
      const lp = [new SVF(sr), new SVF(sr)];
      for (let j = 0; j < b.length; j++) {
        lp[0].process(b[j], k.cutoff, 0.7);
        lp[1].process(lp[0].lp, k.cutoff, 0.7);
        b[j] = lp[1].lp;
      }
    }, { kind: 'bakick' });
  });
  place(B.baFx, A.PLATES, 0.2, (b) => press(b, 0, sr, { gain: PRESS.gain }, PRESS.seed), { kind: 'bapress' });
  place(B.baFx, A.REGISTER, 0.05, (b) => click(b, 0, sr, { gain: CLACK.gain, tone: CLACK.tone }, CLACK.seed), { kind: 'baclack', pan: 0.1 });

  // The bass from 3.1: the sub on B♭ (ducked by the kicks), the pluck on the &s.
  if (S.mark('basub', A.BASS)) {
    const from = lo(A.BASS);
    const g = duck(len, A.KICKS.map(lo), sr, { depth: 0.85, attackMs: 2, releaseMs: 120 });
    let ph = 0;
    for (let i = from; i < len; i++) {
      ph += midi(SUB.root) / sr;
      const v = SUB.gain * 0.27 * Math.min(1, (i - from) / (0.004 * sr)) * Math.tanh(1.4 * Math.sin(2 * Math.PI * ph)) * g[i];
      B.baSub.L[i] += v;
      B.baSub.R[i] += v;
    }
  }
  const plucks = A.PLUCKS.filter((f) => S.mark('bapluck', f)).map((f) => ({ at: lo(f), len: lo(f + 9) - lo(f), freq: midi(SUB.root + 12) }));
  if (plucks.length) {
    const pb = new Float32Array(len);
    pluckBass(pb, plucks, sr, { gain: PLUCK.gain, bright: PLUCK.bright });
    addMono(B.baBass, pb);
  }

  // The hook whispered on the register's steps: the club's chop, at its level less GHOST_DB, with its ping-pong.
  const vox = stereo(len);
  A.HOOK_GHOST.forEach((h, k) => {
    if (!S.mark('bahook', h.at)) return;
    const n = Math.round((h.sixteenths * SIXTEENTH * 0.95 * sr) / FPS);
    const b = new Float32Array(n + Math.round(sr / 10));
    voxChop(b, 0, sr, { freq: midi(h.midi), len: n, vowel: k ? 'e' : 'u', to: k ? 'a' : 'o', glide: 0, gain: 0.3, seed: 9050 + k });
    const rms = Math.sqrt(b.subarray(0, n).reduce((q, x) => q + x * x, 0) / n) || 1e-12;
    const gain = Math.min(10 ** (HOOK_LEVEL.maxBoostDb / 20), 10 ** ((HOOK_LEVEL.noteDb + GHOST_DB) / 20) / rms) * 10 ** (HOOK_LEVEL.liftDb / 20);
    addMono(vox, b, { at: lo(h.at), pan: (k ? 1 : -1) * 0.1 * SUNG_SPREAD, gain });
  });
  pingPong(vox, sr, { time: 0.3, feedback: 0.3, mix: 0.28 });
  for (let i = 0; i < len; i++) {
    B.baVox.L[i] += vox.L[i];
    B.baVox.R[i] += vox.R[i];
  }

  // Beat 4: the fill, rising; the pickup (a stab on 4a, the horn lipped up into the downbeat); the swell into the crash.
  A.FILL.forEach((f, i) => place(B.baDrums, f, 0.5, (b) => snare(b, 0, sr, { gain: FILL.gain + FILL.step * i, tone: FILL.tone + FILL.toneStep * i, decayMs: 90 }, 9060 + i), { kind: 'bafill', pan: (i % 2 ? 1 : -1) * FILL.pan }));
  if (S.mark('bahorn', A.PICKUP.horn)) {
    const v = VOICINGS.IV;
    hornHit(B.baBrass.L, B.baBrass.R, lo(A.PICKUP.horn), sr, {
      notes: [SUB.root + 24, ...v.map((m) => m + 12)], len: lo(A.PICKUP.horn + HORN.frames) - lo(A.PICKUP.horn), gain: HORN.gain,
      attackMs: 5, body: 0.6, decayMs: 30, releaseMs: 35, scoop: HORN.scoop, spread: WIDTH.horns, seed: HORN.seed,
    });
  }
  // The swell in two layers, one each side (a reversed cymbal is noise: two seeds make it wide). Its event is where it starts sounding
  // (3.1), not where it stops: it is heard through the bar before club 1.1, so it is no new voice on the downbeat (FW3's count).
  place(B.baFx, A.SWELL.from, (A.SWELL.to - A.SWELL.from) / FPS, (b) => reverseCymbal(b, b.length, b.length, sr, { gain: SWELL_GAIN, seed: 9070 }), { kind: 'barevcym', pan: -0.5 });
  place(B.baFx, A.SWELL.from, (A.SWELL.to - A.SWELL.from) / FPS, (b) => reverseCymbal(b, b.length, b.length, sr, { gain: SWELL_GAIN, seed: 9071 }), { as: 'barevcym', pan: 0.5 });

  // At the club's level, cut on club 1.1 (stage's commit).
  const level = 10 ** (LEVEL_DB / 20);
  for (const b of Object.values(B)) {
    for (let i = 0; i < len; i++) {
      b.L[i] *= level;
      b.R[i] *= level;
    }
  }
  S.commit();
  return S.events;
}
