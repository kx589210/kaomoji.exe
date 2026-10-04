// The build's sound (spec §8 加速 A and B, the parts 'swiss' and 'riso'; the bars 1–14 design notes/b112/final.md §8.3, build sheet
// notes/b114/sheet.md §10), placed from src/score/build.ts and src/transitions/flip.ts.
//   A (swiss, its bars 1–5): four on the floor, off-beat hats, a plucked bass, a square arp whose filter opens; claps from swiss 3;
//   the flip's fill and swoosh and a cascade of 144 card clicks. One chord a bar from BUILD_CHORDS: IV V iii iii vi.
//     swiss 1 S05  the drums enter with the lens; its arcs print with aperture clicks and step with clacks; the five cut-paper pieces slap
//                  down on the eighths, a step higher each; the lens slides onto his eye; he blinks.
//     swiss 2 S06  a pop for every face that bursts out; the Defender's chirp as its ticks re-acquire him on each split; the red bell.
//     swiss 3 S07a the glass rings in, turns, and the red bars sweep on the claps; the third hit's bell; a reverse swell leads the iris.
//     swiss 4 S07b THE SCAN (new): no kick and no hats on its first two beats, the bass a C2 pedal, the arp a C6 radar ping on the eighths,
//                  the world muffled (MUFFLE) while the Defender's dry voices stay clear — the shutter, its tone rising 300 → 1200 Hz,
//                  a tick for each hop, the sonar ping on him, its two beeps; then the groove slams back on 816 (a harder kick, a
//                  crash, open hats from here to the fill) with the glass's ting, red bar 3's clap, sweep and shimmer, and the pull.
//     swiss 5 S08  the climb resumes (its kicks a touch harder); the infection wave's squeegees and print thumps up D minor pentatonic,
//                  the virus's first "wa" (M7) as the wave starts and as it revives; the quarantine's clacks, the guest's boing and a
//                  low-pass duck; the revival's pops and the blinks; T2's clicks and the fill, the plates clacking into register.
//   B (riso, its bars 1–4): chord stabs on the picture's hits over break 1's faint glass pad (L14b: v04's supersaw bed is
//   gone), the first vocal chops, sixteenth hats in riso 3, the riser and the snare roll, then silence on the last half beat but
//   for a reverse inhale into the drop. IV V iii vi. Riso 1–3 are v04's sound a map later (seeded by their v04 places; nothing of the
//   new bars is let into riso's dry buses but the bells' ring, so every bus but the chime, the arp's (music) and the chords' is v04's
//   sample for sample there, tests/buildAudio.test.mjs); riso 4 adds the print's press thump and clacks and the sky roller's hiss.
// L14b (2026-10-02: a chord held behind everything reads as noise — no constant chord bed): riso's supersaw bed
//   (whole bars, 7 voices, its filter opening 500 → 4200 Hz, 1.4–3.2 LU under the drums) → a short stab on each of the picture's hits
//   over break 1 FALL's faint glass pad; the arp clean and short (12 bits, no sample-and-hold) everywhere, sparse in the Swiss part.
//   The build sits ≈ 0.8 LU under v04's −12.7 without the bed (its steps kept: the scan's dip, 816, swiss 5 over swiss 3, riso over
//   swiss 5, riso 4 the loudest). Before/after, numbers and probes: notes/b114/music-r1/.
// Picture hits sound on the same frames as the shots. The Defender's voices (scripts/audio/introVoices.mjs; music bible M8, M9) are
// dry, on the send-free `bass` bus, added after the bass line is muffled, so the scan bar's muffle never touches them. BUILD_THREADS'
// flags turn their additions off with the picture's (and `lens` / `infection` off bring v04's S05 / S08 sounds back).
import { BUILD_THREADS, POV_GRID, S08_GRID, S08_GUEST, S08_QUARANTINE, povReadout, reticleX } from '../../../src/content/build.ts';
import { READOUT_SLOT } from '../../../src/content/boot.ts';
import { hash } from '../../../src/engine/random.ts';
import {
  ARC_PRINT, ARC_STEPS, BLINK_WAVE, BLINK_WAVE_V04, BUILD_CHORDS, BUILD_START, CLAPS, DISC_LAND, FACES, FILL, FLIP, GLASS_TURN, HATS, HIT3, HOLE, HOPS,
  INFECT, IRIS, KICKS, LANDINGS, LENS_TRACK, MOUTHS, MUFFLE, PIECES, PING, PRINT_STEPS, PULL, QUARANTINE, REACQUIRE, RED_CELL, REGISTER, RETURN,
  REVIVE, ROLL, RULES, S05_BLINK, S05_BLINK_V04, SEA, SHIMMER, SILENCE, SKY_ROLLER, SLAMS, SLIDE, SPLITS, SPLIT_STAGGER, STRETCH, SUNRISE, SWEEPS,
  SWELL, TEARS, ZERO_THREATS,
} from '../../../src/score/build.ts';
import { partBar, partBars, partFrame, partStart, seedFrame } from '../../../src/score/film.ts';
import { FPS, FRAMES_PER_BAR, FRAMES_PER_BEAT, barFrame } from '../../../src/score/tempo.ts';
import { CARDS, turnStart } from '../../../src/transitions/flip.ts';
import { pad } from '../breakVoices.mjs';
import { boing, chordStab, muffle, noiseSwell, paperSlap, printThump, radarPing } from '../buildVoices.mjs';
import { blip, clap, click, hat, impact, kick, pop, press, riser, snare } from '../drums.mjs';
import { SVF } from '../filters.mjs';
import { fmBell } from '../fm.mjs';
import { WHOOSH_PEAK, crash, inhale, whoosh } from '../fx.mjs';
import { DEFENDER_PITCH, beeps, glide, sweep } from '../introVoices.mjs';
import { addMono, duck, pingPong, stereo, truncate } from '../mix.mjs';
import { pluckBass, pulseArp } from '../synth.mjs';
import { voxChop } from '../vox.mjs';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
/** IV–V–iii–vi in F (spec §8): bass roots, arp tones, supersaw voicings, one row per chord. */
const ROOTS = [34, 36, 33, 38];
const ARP = [[70, 74, 77, 81, 82], [72, 76, 79, 82, 84], [69, 72, 76, 79, 81], [74, 77, 81, 84, 86]];
const PADS = [[58, 62, 65, 69], [60, 64, 67, 70], [57, 60, 64, 67], [62, 65, 69, 72]];
const CHORD_ROW = { IV: 0, V: 1, iii: 2, vi: 3 };
const PATTERN = [0, 1, 2, 3, 4, 3, 2, 1];
/** A's first frame (swiss 1.1) and B's (riso 1.1). */
const A = partStart('swiss');
const B = partStart('riso');
if (BUILD_CHORDS.length !== partBars('swiss').length + partBars('riso').length) throw new Error('sections/build.mjs: BUILD_CHORDS needs one chord per Swiss and Riso bar');
/** The ROOTS / ARP / PADS row of the build's bar `k` (0 = swiss 1, … ; src/score/build.ts BUILD_CHORDS: IV V iii iii vi · IV V iii vi). */
export const chordRow = (k) => CHORD_ROW[BUILD_CHORDS[k]];
/** The chord row of the bar that holds `frame`. */
const chordAt = (frame) => chordRow(Math.floor((frame - A) / FRAMES_PER_BAR));

/** The SCAN bar (swiss 4): new, so its events seed in the build's new range; every other bar seeds as it was approved (v04). */
const SCAN = { from: partFrame('swiss', 4), to: partFrame('swiss', 5) };
const inScan = (f) => f >= SCAN.from && f < SCAN.to;
/**
 * The index event `f` of `list` had in v04 (the kept bars' events in v04's order, by seedFrame), so every approved hit keeps its
 * seed, and with it its sound; null for an event of the scan bar.
 */
const v04Index = (list, f) => (inScan(f) ? null : list.filter((g) => !inScan(g) && seedFrame(g) < seedFrame(f)).length);
/** Its index among the scan bar's events of `list`. */
const scanIndex = (list, f) => list.filter((g) => inScan(g) && g < f).length;

/** Picture x (1080p px from the centre) → pan, as every gag is panned (music bible §6.2): x / 960 × 0.9. */
const panX = (x) => Math.max(-1, Math.min(1, (x / 960) * 0.9));
/** Fades `x` out over samples [a, b) (a raised cosine) and silences it from b on; in place. */
const fadeOut = (x, a, b) => {
  for (let i = Math.max(0, a); i < x.length; i++) x[i] *= i >= b ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * (i - a)) / (b - a));
};
/** S08's card (col, row) → its x (px). */
const cardX = (col) => (col - (S08_GRID.cols - 1) / 2) * S08_GRID.cell;
/** His cell at S06's level `l` (1–3): the anchor chain from the frame's centre puts him at x = 960 / 2^l. */
const heroX = (level) => 960 / 2 ** level;
/** The readout slot's character `k` (JetBrains Mono: 0.6 em a character). */
const readoutX = (k) => READOUT_SLOT.x + 0.6 * READOUT_SLOT.px * k;
/** S08's infection thumps: up D minor pentatonic with the wave, D6 F6 G6 A6 C7 D7. */
const INFECT_NOTES = [86, 89, 91, 93, 96, 98];
/** The scan bar's levels (bars 1–14 design §8.3): the bar dips to about −15 LUFS and 816 is its loudest beat. */
const SCAN_MIX = { pedal: 0.16, radar: 0.05, tone: 0.04, hop: 10 ** (-36 / 20), sonar: 0.05, beeps: 0.05, shutter: 0.08, ting: 0.07, returnCrash: 0.2, returnKick: 1.15, openHatMs: 110 };

/** S08's levels: the infection climbs (bar 10 at least 0.3 LU over the glass's bar 8). */
const S08_MIX = { squeegee: 0.14, thump: 0.09, revive: 0.06, wa: 0.4, kick: 1.08 };

/**
 * The arp (L14b): v04's ran unbroken sixteenths at 0.1, each note held 0.8 of a sixteenth, quantised to 7 bits and held at 16 kHz (a
 * chord haze in the plate); now short notes (`length` of a sixteenth), clean (12 bits, no sample-and-hold), only where arpPlays says:
 * sparse and soft in the Swiss part, at v04's level in riso, whose picture runs on its sixteenths.
 */
const ARP_MIX = { swiss: { gain: 0.09, length: 0.45 }, riso: { gain: 0.115, length: 0.6 }, bits: 12, crushHz: 48000 };
/**
 * Where the arp sounds. Swiss: the off-beat eighths, but not in S05 (its rule bells and paper pieces carry the IV), the scan (the radar
 * pings) or S08's wave (its thumps). Riso: every sixteenth from S09's first tear, as the picture moves on them — the tears (each sheet
 * flies to its note's side, as in v04), S10's rings, S11's dot pulses, S12's print and sea steps.
 */
const arpPlays = (f) => {
  if (f >= IRIS && f < RETURN) return false;
  if (f < partFrame('swiss', 2)) return false;
  if (f >= partFrame('swiss', 5) && f < partFrame('swiss', 5, 2)) return false;
  if (f >= B) return f >= TEARS[0];
  return (f - A) % FRAMES_PER_BEAT === FRAMES_PER_BEAT / 2;
};
/** Riso's chord stabs (L14b): on S09's slams, S10's bursts through the mouths, S11's faces, S12's print and its two sunrise hits. */
const STABS = [...SLAMS, ...MOUTHS, ...FACES, PRINT_STEPS[0], SUNRISE.from, SUNRISE.to];
/**
 * Their levels: `gain` at riso 1.1, × `climb` by the second sunrise hit (riso 4.3), the downbeats (and the last hit) × `accent`; the
 * low-pass's bite opening `bright` [riso 1.1, riso 4.3] Hz; the high-pass under them at `hp`; τ `decayMs`, gone by `lenMs` (an eighth is 200 ms).
 */
const STAB_MIX = { gain: 0.2, climb: 1.2, accent: 1.15, bright: [2500, 5000], dark: 900, attackMs: 8, holdMs: 25, decayMs: 60, lenMs: 195, hp: 220 };
/** The glass pad under the stabs (break 1's settings): its level and cutoff [riso 1.1, the silence], the high-pass, the kick's duck depth. */
const GLASS_MIX = { gain: [0.04, 0.045], cutoff: [900, 1500], hp: 200, duck: 0.6 };

/**
 * Renders the build into `stems` (stereo buses keys, fx, music, chime, drums, bass — and on it the Defender's dry voices — chords, vox
 * and post, and a mono sub) at sample rate `sr`. Everything is cut at the silent half beat, except the `post` bus (the inhale). Returns
 * every placed event as { kind, at } (drum hits also with their `seed`) with `at` in samples.
 */
export function renderBuild(stems, sr) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const seconds = (frames) => frames / FPS;
  const cut = at(SILENCE.from);
  const events = [];
  /** Renders a mono voice into its own buffer, cuts it at the silence, and adds it to a bus. */
  const place = (bus, frame, dur, draw, { pan = 0, kind, seed } = {}) => {
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    truncate(buf, cut - at(frame), sr);
    addMono(bus, buf, { at: at(frame), pan });
    if (kind) events.push(seed === undefined ? { kind, at: at(frame) } : { kind, at: at(frame), seed });
  };
  /** A whoosh `frames` long whose peak lands on frame `peak` (the picture's hit); its event is recorded at the peak. */
  const swoosh = (peak, frames, o, { kind, pan = 0 } = {}) => {
    place(stems.fx, peak - WHOOSH_PEAK * frames, frames / FPS, (b) => whoosh(b, 0, b.length, sr, o), { pan });
    if (kind) events.push({ kind, at: at(peak) });
  };
  const full = () => new Float32Array(stems.sub.length);
  /** Cuts a whole-length stereo buffer at the silence and adds it to a bus. */
  const layStereo = (bus, s) => {
    truncate(s.L, cut, sr);
    truncate(s.R, cut, sr);
    for (let i = 0; i < s.L.length; i++) {
      bus.L[i] += s.L[i];
      bus.R[i] += s.R[i];
    }
  };
  /** The Defender's voices go on after the muffle (below), so it never touches them; each is { frame, dur, draw, pan, kind }. */
  const dryVoices = [];
  const dry = (frame, dur, draw, { pan = 0, kind } = {}) => dryVoices.push({ frame, dur, draw, pan, kind });

  // Drums. Each hit of a kept bar keeps its v04 seed; the scan bar's take the build's new range.
  KICKS.forEach((f) => {
    const i = v04Index(KICKS, f);
    const seed = i === null ? 1450 + scanIndex(KICKS, f) : 600 + i;
    // The kick comes back from the scan harder (816), and swiss 5's stay a touch harder: the climb resumes (the picture's punches grow
    // bar by bar, energy.ts KICK_ARC). The extra weight is a layer of the same kick faded out by riso 1.1, so riso's drums stay v04's.
    const weight = f === RETURN ? SCAN_MIX.returnKick : f >= partFrame('swiss', 5) && f < B ? S08_MIX.kick : 1;
    place(stems.drums, f, 1.2, (b) => {
      kick(b, 0, sr, { gain: 0.5 }, seed);
      if (weight === 1) return;
      const extra = new Float32Array(b.length);
      kick(extra, 0, sr, { gain: 0.5 * (weight - 1) }, seed);
      fadeOut(extra, at(B) - at(f) - Math.round(0.03 * sr), at(B) - at(f));
      for (let i = 0; i < b.length; i++) b[i] += extra[i];
    }, { kind: 'kick', seed });
  });
  HATS.forEach((f, n) => {
    const i = v04Index(HATS, f);
    const seed = i === null ? 1455 + scanIndex(HATS, f) : 700 + i;
    const odd = (i ?? n) % 2 === 1;
    const sixteenths = f >= partFrame('riso', 3) && f < partFrame('riso', 4);
    // After the scan bar's breakdown the groove comes back bigger than it left: the off-beat hats open from the cut back to the fill.
    const open = f > RETURN && f < FILL[0];
    place(stems.drums, f, 0.25, (b) => hat(b, 0, sr, { gain: sixteenths ? (odd ? 0.13 : 0.09) : 0.15, decayMs: open ? SCAN_MIX.openHatMs : 38 }, seed), { pan: odd ? 0.22 : -0.18, kind: 'hat', seed });
  });
  CLAPS.forEach((f) => {
    const i = v04Index(CLAPS, f);
    const k = scanIndex(CLAPS, f);
    const [s1, s2] = i === null ? [1460 + k, 1465 + k] : [800 + i, 850 + i];
    place(stems.drums, f, 0.6, (b) => clap(b, 0, sr, { gain: 0.42 }, s1), { pan: -0.15, kind: 'clap', seed: s1 });
    place(stems.drums, f + 0.12, 0.6, (b) => clap(b, 0, sr, { gain: 0.3, tone: 1300 }, s2), { pan: 0.2 });
  });
  FILL.forEach((f, i) => place(stems.drums, f, 0.8, (b) => snare(b, 0, sr, { gain: 0.3 + 0.05 * i, tone: 200 * 2 ** (i / 12) }, 900 + i), { pan: (i - 1.5) * 0.2, kind: 'fill' }));
  ROLL.forEach((f, i) => {
    const p = i / (ROLL.length - 1);
    place(stems.drums, f, 0.8, (b) => snare(b, 0, sr, { gain: 0.2 + 0.28 * p, tone: 170 * 2 ** p, decayMs: 120 - 60 * p }, 950 + i), { pan: (hash(i, 31) - 0.5) * 0.3, kind: 'roll' });
  });
  place(stems.drums, BUILD_START, 5, (b) => crash(b, 0, sr, { gain: 0.26 }, 41), { kind: 'crash' });
  place(stems.drums, FLIP.to, 5, (b) => crash(b, 0, sr, { gain: 0.18, decay: 1.1 }, 42), { pan: 0.25 });

  // Plucked bass: off-beat eighths in A, driving eighths in B, a held D under the 32nd roll; under the scan, a C2 pedal instead.
  const bass = [];
  /** The held D: from riso 4.3 to the silence. */
  const held = partFrame('riso', 4, 2);
  for (const bar of [...partBars('swiss'), ...partBars('riso')]) {
    const root = ROOTS[chordRow(bar - partBar('swiss'))];
    const inA = bar < partBar('riso');
    for (let e = 0; e < 8; e++) {
      const f = barFrame(bar, e / 2);
      if (f >= held) break;
      if (inA && e % 2 === 0) continue;
      if (f >= IRIS && f < RETURN) continue;
      const up = inA ? e === 7 : [2, 5, 7].includes(e);
      bass.push({ at: at(f), len: at(f + 10) - at(f), freq: midi(root + (up ? 12 : 0)) });
    }
  }
  bass.push({ at: at(held), len: cut - at(held), freq: midi(ROOTS[chordRow(BUILD_CHORDS.length - 1)]) });
  const bassBuf = full();
  pluckBass(bassBuf, bass, sr, { gain: 0.36 });
  // The scan bar's pedal: C2 (iii's third, the Defender's pitch class), a sine held from the iris to the cut back, ducked by the clap.
  {
    const a = at(IRIS);
    const b = Math.min(bassBuf.length, at(RETURN));
    const g = duck(Math.max(0, b - a), CLAPS.filter(inScan).filter((f) => f < RETURN).map((f) => at(f) - a), sr, { depth: 0.5, releaseMs: 110 });
    const f0 = midi(36);
    for (let i = Math.max(0, a); i < b; i++) {
      const t = (i - a) / sr;
      const env = Math.min(1, t / 0.02) * Math.min(1, (b - i) / (0.008 * sr));
      bassBuf[i] += SCAN_MIX.pedal * env * g[i - a] * Math.sin(2 * Math.PI * f0 * t);
    }
    events.push({ kind: 'pedal', at: a });
  }
  truncate(bassBuf, cut, sr);
  events.push({ kind: 'bass', at: bass[0].at });

  // The square arp (L14b: no constant chord haze): short, clean notes (ARP_MIX) where arpPlays says — in the Swiss part
  // the off-beat eighths, walking the chord up then down a bar (each side in turn); in riso v04's pattern and sides on the picture's
  // sixteenths; under the scan, a C6 radar ping on the eighths. Its filter still opens through A and on through B.
  const sixteenth = FRAMES_PER_BEAT / 4;
  const notes = { swiss: [[], []], riso: [[], []] };
  let j = 0;
  for (let f = BUILD_START, k = 0; f < SILENCE.from; f += sixteenth, k++) {
    if (!arpPlays(f)) continue;
    const chord = ARP[chordAt(f)];
    const riso = f >= B;
    const n = riso ? k : j++;
    const lift = riso && n % 8 === 4 ? 12 : 0;
    const mix = riso ? ARP_MIX.riso : ARP_MIX.swiss;
    notes[riso ? 'riso' : 'swiss'][n % 2].push({ at: at(f), len: Math.round(seconds(sixteenth * mix.length) * sr), freq: midi(chord[PATTERN[n % 8]] + lift), duty: [0.125, 0.25, 0.5, 0.25][k % 4] });
  }
  const opening = (i) => {
    const f = (i / sr) * FPS;
    if (f < B) return 900 * (7000 / 900) ** Math.min(1, Math.max(0, (f - BUILD_START) / (B - BUILD_START)));
    return 7000 + 2000 * Math.min(1, (f - B) / (SILENCE.from - B));
  };
  for (const [group, sides] of Object.entries(notes)) {
    sides.forEach((list, side) => {
      const buf = full();
      pulseArp(buf, list, sr, { gain: ARP_MIX[group].gain, cutoff: opening, bits: ARP_MIX.bits, crushHz: ARP_MIX.crushHz });
      truncate(buf, cut, sr);
      addMono(stems.music, buf, { pan: side === 0 ? -0.4 : 0.4 });
    });
  }
  const played = [...notes.swiss.flat(), ...notes.riso.flat()].map((x) => x.at).sort((a, b) => a - b);
  events.push({ kind: 'arp', at: played[0] });
  for (const a of played) events.push({ kind: 'arpnote', at: a });
  for (let f = IRIS; f < RETURN; f += 2 * sixteenth) place(stems.music, f, 0.06, (b) => radarPing(b, 0, sr, { freq: DEFENDER_PITCH.c6, gain: SCAN_MIX.radar }), { kind: 'radar' });

  // Riso's chords (L14b; was v04's whole-bar supersaw bed, ducked by the kick): a short stab on each of the picture's hits
  // (STABS) — S09's slams, S10's bursts, S11's faces, S12's print and its two sunrise hits — high-passed, gone within an eighth, brighter
  // and a little louder bar by bar towards the drop (the climb the bed's opening filter made), the downbeats a touch harder.
  const stabs = stereo(stems.sub.length);
  STABS.forEach((f, k) => {
    const u = (f - B) / (SUNRISE.to - B);
    const accent = (f - B) % FRAMES_PER_BAR === 0 || f === SUNRISE.to ? STAB_MIX.accent : 1;
    chordStab(stabs.L, stabs.R, at(f), sr, {
      freqs: PADS[chordAt(f)].map(midi),
      gain: STAB_MIX.gain * STAB_MIX.climb ** u * accent,
      bright: STAB_MIX.bright[0] * (STAB_MIX.bright[1] / STAB_MIX.bright[0]) ** u,
      dark: STAB_MIX.dark,
      attackMs: STAB_MIX.attackMs,
      holdMs: STAB_MIX.holdMs,
      decayMs: STAB_MIX.decayMs,
      lenMs: STAB_MIX.lenMs,
      hp: STAB_MIX.hp,
      seed: 1480 + k,
    });
    events.push({ kind: 'stab', at: at(f) });
  });
  // Under them, break 1 FALL's faint glass pad (the music bible's M2 reference) instead of the supersaw: 3 voices,
  // ±0.14 st, dark (GLASS_MIX.cutoff, never over 1.5 kHz), high-passed, ducked by every kick.
  const glass = stereo(stems.sub.length);
  const span = (i) => Math.min(1, Math.max(0, ((i / sr) * FPS - B) / (SILENCE.from - B)));
  pad(glass.L, glass.R, partBars('riso').map((bar, k, bars) => ({ at: at(barFrame(bar)), len: (k === bars.length - 1 ? cut : at(barFrame(bar + 1))) - at(barFrame(bar)), freqs: PADS[chordRow(bar - partBar('swiss'))].map(midi) })), sr, {
    voices: 3,
    detune: 0.14,
    spread: 0.6,
    gain: (i) => GLASS_MIX.gain[0] + (GLASS_MIX.gain[1] - GLASS_MIX.gain[0]) * span(i),
    cutoff: (i) => GLASS_MIX.cutoff[0] + (GLASS_MIX.cutoff[1] - GLASS_MIX.cutoff[0]) * span(i),
    attackMs: 30,
    releaseMs: 120,
    seed: 1490,
  });
  const kickDuck = duck(stems.sub.length, KICKS.filter((f) => f >= B).map(at), sr, { depth: GLASS_MIX.duck, releaseMs: 150 });
  for (const x of [glass.L, glass.R]) {
    const hp = new SVF(sr);
    for (let i = 0; i < x.length; i++) {
      hp.process(x[i], GLASS_MIX.hp, 0.7);
      x[i] = hp.hp * kickDuck[i];
    }
  }
  layStereo(stems.chords, glass);
  events.push({ kind: 'glasspad', at: at(B) });
  layStereo(stems.chords, stabs);

  // Vocal chops tease (B): two in riso 2 (the second on the punch through the hole), one on riso 4, with ping-pong echoes.
  const vox = stereo(stems.sub.length);
  const chop = (frame, o) => {
    const b = new Float32Array(Math.round(0.6 * sr));
    voxChop(b, 0, sr, { ...o, len: Math.round(o.dur * sr) });
    addMono(vox, b, { at: at(frame) });
    events.push({ kind: 'vox', at: at(frame) });
  };
  chop(partFrame('riso', 2, 1.5), { freq: midi(76), vowel: 'a', to: 'o', glide: 2, dur: 0.18, gain: 0.26, seed: 71 });
  chop(HOLE, { freq: midi(79), vowel: 'o', to: 'a', glide: -3, dur: 0.16, gain: 0.26, seed: 72 });
  chop(partFrame('riso', 4), { freq: midi(74), vowel: 'u', to: 'a', glide: 5, dur: 0.35, gain: 0.3, seed: 73 });
  pingPong(vox, sr, { time: 0.3, feedback: 0.35, mix: 0.3 });
  layStereo(stems.vox, vox);

  // The riser under riso 3–4.
  place(stems.fx, partFrame('riso', 3), seconds(SILENCE.from - partFrame('riso', 3)), (b) => riser(b, 0, b.length, sr, { gain: 0.2 }, 61), { kind: 'riser' });

  // ——— swiss 1 · S05 ————————————————————————————————————————————————————————————————————————————————————————————————————————————————
  // The disc shrinks into its place fastest just after its launch (swiss 1.1 and half a frame).
  swoosh(DISC_LAND.from + 2, 8, { from: 6000, to: 400, gain: 0.16, seed: 62 }, { kind: 'land' });
  const ruleGain = BUILD_THREADS.lens ? 0.045 * 10 ** (-3 / 20) : 0.045;
  RULES.forEach((f, g) => place(stems.chime, f, 1.5, (b) => fmBell(b, 0, sr, { freq: midi([70, 74, 77, 81, 82, 86, 89][g]), gain: ruleGain, decay: 0.25, index: 1.2 }), { pan: g < 4 ? -0.6 + 0.4 * g : 0, kind: 'rule' }));
  if (BUILD_THREADS.lens) {
    // The arcs print outward from the lens: a dry aperture click each, rising. They step on the kicks of 1.2 and 1.3 and ride with the
    // lens on 1.4: a clack each (two layers, 1.8 + 2.6 kHz).
    ARC_PRINT.forEach((f, k) => dry(f, 0.05, (b) => click(b, 0, sr, { gain: 0.05, tone: 1800 + 300 * k }, 1400 + k), { pan: 0.15, kind: 'aperture' }));
    [...ARC_STEPS, LENS_TRACK].forEach((f, k) =>
      dry(f, 0.05, (b) => {
        click(b, 0, sr, { gain: 0.07, tone: 1800 }, 1406 + 2 * k);
        click(b, Math.round(0.004 * sr), sr, { gain: 0.05, tone: 2600 }, 1407 + 2 * k);
      }, { pan: 0.15, kind: 'arc' }),
    );
    // His five cut-paper pieces slap down on the eighths, each a step higher, from the side it enters by.
    PIECES.forEach((f, k) => place(stems.fx, f, 0.07, (b) => paperSlap(b, 0, sr, { gain: 0.18, step: 2 * k, seed: 1412 }), { pan: [-0.5, -0.1, 0, 0.1, 0.5][k], kind: 'paper' }));
    // The lens slides onto his eye (a launch: the whoosh peaks a frame in), and he blinks: he has noticed.
    swoosh(LENS_TRACK + 1, 12, { from: 400, to: 5000, gain: 0.16, seed: 63 }, { pan: -0.2, kind: 'track' });
    place(stems.fx, S05_BLINK, 0.05, (b) => blip(b, 0, sr, { freq: 1175, ms: 20, gain: 0.05 }), { kind: 'blink' });
  } else {
    swoosh(SLIDE.from + 1, 12, { from: 400, to: 5000, gain: 0.16, seed: 63 }, { pan: -0.3, kind: 'slide' });
    place(stems.fx, S05_BLINK_V04, 0.05, (b) => blip(b, 0, sr, { freq: 1175, ms: 20, gain: 0.05 }), { kind: 'blink' });
  }

  // ——— swiss 2 · S06 ———————————————————————————————————————————————————————————————————————————————————————————————————————————————
  // A pop for every face that bursts out, higher at each split, from the beat to SPLIT_STAGGER frames after.
  SPLITS.forEach((f, level) => {
    events.push({ kind: 'split', at: at(f) });
    const count = level === 0 ? 1 : 3 * 4 ** (level - 1);
    for (let i = 0; i < count; i++) {
      const lag = level === 0 || i === 0 ? 0 : (SPLIT_STAGGER * i) / count;
      place(stems.fx, f + lag, 0.1, (b) => pop(b, 0, sr, { freq: [440, 660, 990, 1320][level] * 2 ** ((4 * hash(level, i, 17) - 2) / 12), gain: 0.11 / Math.sqrt(count) }), { pan: 1.2 * (hash(level, i, 18) - 0.5), kind: 'pop' });
    }
  });
  // Re-acquire: the Defender's ticks snap round him on each split after the first — a dry chirp C7 → G7 from his cell.
  if (BUILD_THREADS.reacquire) REACQUIRE.forEach((f, k) => dry(f, 0.04, (b) => glide(b, 0, sr, { from: DEFENDER_PITCH.c7, to: midi(103), ms: 30, gain: 0.03 }), { pan: panX(heroX(k + 1)), kind: 'chirp' }));
  place(stems.chime, RED_CELL, 2, (b) => fmBell(b, 0, sr, { freq: midi(84), gain: 0.07, decay: 0.5, index: 3 }), { kind: 'red' });

  // ——— swiss 3 · S07a ——————————————————————————————————————————————————————————————————————————————————————————————————————————————
  // The glass rings in, turns, and the red bars sweep on the claps (and on 4.4, through him).
  [81, 84, 88, 91, 93, 96].forEach((m, i) => place(stems.chime, partFrame('swiss', 3) + i, 8, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.05, decay: 1.6, index: 2.8 }), { pan: -0.5 + 0.2 * i, kind: i === 0 ? 'glass' : undefined }));
  place(stems.chime, GLASS_TURN, 10, (b) => fmBell(b, 0, sr, { freq: midi(93), gain: 0.05, decay: 2, index: 1.2 }), { pan: -0.2 });
  SWEEPS.forEach((f, i) => swoosh(f, 14, { from: 900, to: 8000, gain: 0.2, seed: inScan(f) ? 1420 : 64 + i }, { kind: 'sweep' }));
  // The third hit turns him back toward us: a bell a fourth above the turn's.
  place(stems.chime, HIT3, 8, (b) => fmBell(b, 0, sr, { freq: midi(98), gain: 0.05, decay: 1.6, index: 1.2 }), { pan: 0.2, kind: 'hit3' });
  // The J-cut: a reverse swell leads the iris by an eighth and stops dead on it.
  place(stems.fx, SWELL.from, seconds(SWELL.to - SWELL.from), (b) => noiseSwell(b, b.length, b.length, sr, { from: 300, to: 3000, gain: 0.12, seed: 1421 }), { kind: 'swell' });

  // ——— swiss 4 · S07b THE SCAN ————————————————————————————————————————————————————————————————————————————————————————————————————
  // The iris opens: the lens's shutter (dry), then its tone rising 300 → 1200 Hz as the reticle works across the grid, topping out at
  // the ✓ and stopping on the cut back.
  dry(IRIS, 0.05, (b) => {
    click(b, 0, sr, { gain: SCAN_MIX.shutter, tone: 1200 }, 1422);
    click(b, Math.round(0.01 * sr), sr, { gain: 0.6 * SCAN_MIX.shutter, tone: 3000 }, 1423);
  }, { kind: 'shutter' });
  dry(IRIS, seconds(RETURN - IRIS) - 0.002, (b) => glide(b, 0, sr, { from: 300, to: 1200, ms: seconds(ZERO_THREATS - IRIS) * 1000, holdMs: seconds(RETURN - ZERO_THREATS) * 1000 - 2, gain: SCAN_MIX.tone, attackMs: 30 }), { kind: 'scantone' });
  // A dry square tick on each hop, from the reticle's column; on 4.2 the hop lands dead on him and pings (sonar C7 → C6) — nothing locks.
  HOPS.forEach((f, k) => dry(f, 0.02, (b) => blip(b, 0, sr, { freq: DEFENDER_PITCH.c7, ms: 12, gain: SCAN_MIX.hop }), { pan: panX(reticleX(k % POV_GRID.cols)), kind: 'hop' }));
  dry(PING, 0.05, (b) => glide(b, 0, sr, { from: DEFENDER_PITCH.c7, to: DEFENDER_PITCH.c6, ms: 40, gain: SCAN_MIX.sonar }), { pan: panX(reticleX(HOPS.indexOf(PING))), kind: 'sonar' });
  // `[SCAN] grid 144/144 · 0 threats ✓`: the two beeps from the readout's ✓.
  dry(ZERO_THREATS, 0.12, (b) => beeps(b, 0, sr, { freq: DEFENDER_PITCH.c7, gain: SCAN_MIX.beeps }), { pan: panX(readoutX([...povReadout(144, true)].length)), kind: 'beeps' });
  // 816: the groove slams back — the kick (a touch harder), the hats, the bass and the arp, a crash, and the glass's ting (FM A6). The
  // crash is faded out into riso 1.1 (under its own crash and the slam), so riso's drums stay v04's.
  place(stems.drums, RETURN, seconds(B - RETURN), (b) => {
    crash(b, 0, sr, { gain: SCAN_MIX.returnCrash, decay: 0.9 }, 1424);
    fadeOut(b, b.length - Math.round(0.03 * sr), b.length);
  }, { kind: 'return' });
  place(stems.chime, RETURN, 5, (b) => fmBell(b, 0, sr, { freq: midi(93), gain: SCAN_MIX.ting, decay: 1, index: 3 }), { pan: 0.05, kind: 'ting' });
  // Red bar 3 passes through the glass: the light splits — a bell on each 32nd, A5 C6 E6 G6, across the frame.
  SHIMMER.forEach((f, k) => place(stems.chime, f, 3, (b) => fmBell(b, 0, sr, { freq: midi([81, 84, 88, 91][k]), gain: 0.05, decay: 0.5, index: 2 }), { pan: -0.4 + 0.25 * k, kind: 'shimmer' }));
  // The anchored pull back onto the poster.
  swoosh(PULL.from + 1, PULL.to - PULL.from, { from: 7000, to: 300, gain: 0.22, seed: 66 }, { kind: 'pull' });

  // ——— swiss 5 · S08 and T2 ————————————————————————————————————————————————————————————————————————————————————————————————————————
  if (BUILD_THREADS.infection) {
    // The Warhol wave: each step's cards silkscreen in — a squeegee swipe and a print thump, up D minor pentatonic with the wave.
    INFECT.forEach((f, k) => {
      place(stems.fx, f, 0.065, (b) => sweep(b, 0, b.length, sr, { from: 2000, to: 6000, peak: 0.35, gain: S08_MIX.squeegee, q: 1.5, seed: 1430 + k }), { pan: k % 2 ? 0.2 : -0.2 });
      place(stems.fx, f, 0.08, (b) => printThump(b, 0, sr, { freq: midi(INFECT_NOTES[k]), gain: S08_MIX.thump }), { pan: panX(cardX(8)), kind: 'infect' });
    });
    // The antivirus strikes back: the Bass strips clack down round the three copies (dry), the guest boings, and the world ducks under a
    // low-pass as the copies go grey.
    dry(QUARANTINE.at, 0.12, (b) => {
      for (let i = 0; i < 4; i++) click(b, Math.round(0.016 * i * sr), sr, { gain: 0.07, tone: 1600 + 400 * i }, 1436 + i);
    }, { pan: panX(S08_QUARANTINE.reduce((s, [c]) => s + cardX(c), 0) / S08_QUARANTINE.length), kind: 'quarantine' });
    dry(QUARANTINE.at, 0.25, (b) => boing(b, 0, sr, { from: 500, to: 180, ms: 220, gain: 0.05 }), { pan: panX(cardX(S08_GUEST[0])), kind: 'boing' });
    // Revival: the strips fly off and each grey card reprints as four — pops up an octave — and the blink wave runs out from his card.
    place(stems.fx, REVIVE, 0.12, (b) => {
      for (let i = 0; i < 4; i++) pop(b, Math.round(0.012 * i * sr), sr, { freq: 1320 * (1 + 0.1 * i), gain: S08_MIX.revive });
    }, { kind: 'revive' });
    for (let k = 0; k < 3; k++) place(stems.fx, BLINK_WAVE + 3 * k, 0.03, (b) => blip(b, 0, sr, { freq: 1568, ms: 10, gain: 0.025 }), { pan: -0.3 + 0.3 * k });
    // M7, the virus's "wa" (music bible): a u → a chop on the vi chord's top voice an octave up (A5, as the cosmos sings it over vi), as
    // the wave starts and as it revives — the film's first "wa", which the cosmos answers on every infection clap. Wet (the vox bus, the
    // cosmos's ping-pong), panned −0.3 then +0.3, against the antivirus's dry clacks between them (M9). Its echoes are faded out by
    // riso 1.1, so riso's vox stays v04's.
    const wa = stereo(stems.sub.length);
    [INFECT[0], REVIVE].forEach((f, k) => {
      const b = new Float32Array(Math.round(0.4 * sr));
      voxChop(b, 0, sr, { freq: midi(81), len: Math.round(seconds(9) * sr), vowel: 'u', to: 'a', gain: S08_MIX.wa, seed: 1470 + k });
      addMono(wa, b, { at: at(f), pan: k ? 0.3 : -0.3 });
      events.push({ kind: 'wa', at: at(f) });
    });
    pingPong(wa, sr, { time: 0.3, feedback: 0.3, mix: 0.28 });
    for (const x of [wa.L, wa.R]) fadeOut(x, at(B) - Math.round(0.03 * sr), at(B));
    for (let i = 0; i < wa.L.length; i++) {
      stems.vox.L[i] += wa.L[i];
      stems.vox.R[i] += wa.R[i];
    }
  } else {
    for (let k = 0; k < 6; k++) place(stems.fx, BLINK_WAVE_V04 + 3 * k, 0.03, (b) => blip(b, 0, sr, { freq: 1568, ms: 10, gain: 0.025 }), { pan: -0.6 + 0.24 * k });
  }
  for (let row = 0; row < CARDS.rows; row++) {
    for (let col = 0; col < CARDS.cols; col++) {
      place(stems.fx, turnStart(col, row), 0.05, (b) => click(b, 0, sr, { gain: 0.05, tone: 1800 + 60 * row }, 1000 + row * CARDS.cols + col), { pan: (col / (CARDS.cols - 1) - 0.5) * 1.4, kind: 'card' });
    }
  }
  place(stems.fx, FLIP.from, seconds(FLIP.to - FLIP.from), (b) => whoosh(b, 0, b.length, sr, { from: 400, to: 6000, gain: 0.2, seed: 67 }), { kind: 'flip' });
  // The plates converge into register on the fill's sixteenths: a clack each, alternating sides (on the drums: the tail stays short).
  if (BUILD_THREADS.register) REGISTER.forEach((f, k) => place(stems.drums, f, 0.05, (b) => click(b, 0, sr, { gain: 0.04, tone: 2400 }, 1440 + k), { pan: k % 2 ? 0.2 : -0.2, kind: 'register' }));

  // ——— riso 1–3 · S09 S10 S11 (v04's) —————————————————————————————————————————————————————————————————————————————————————————————
  // S09: each sheet torn off with a short rip, panned to the side it flies (the side of its arp note); each new face slammed down on the beat.
  TEARS.forEach((f, i) => place(stems.fx, f, 0.1, (b) => whoosh(b, 0, b.length, sr, { from: 1600, to: 7000, gain: 0.07, q: 1.4, seed: 1200 + i }), { pan: ((f - B) / 6) % 2 ? 0.5 : -0.5, kind: 'tear' }));
  SLAMS.forEach((f, i) => place(stems.fx, f, 0.15, (b) => press(b, 0, sr, { gain: 0.35 }, 1220 + i), { kind: 'slam' }));
  // S10: a rush rising into each burst through a mouth (on the kicks; the first from S09's last tear), a pop as it bursts (the last, HOLE, has its whump),
  // and a falling rush across the gap to the next face's landing on the and.
  const bursts = [...MOUTHS, HOLE];
  const from = [TEARS[TEARS.length - 1], ...LANDINGS];
  bursts.forEach((f, i) => {
    place(stems.fx, from[i], seconds(f - from[i]), (b) => whoosh(b, 0, b.length, sr, { from: 300, to: 2600 + 500 * i, gain: 0.1, q: 0.9, seed: 1300 + i }), { pan: (hash(i, 41) - 0.5) * 0.6, kind: 'rush' });
    if (f === HOLE) return;
    place(stems.fx, f, 0.1, (b) => pop(b, 0, sr, { freq: 660 * 2 ** (i / 4), gain: 0.08 }), { kind: 'mouth' });
    place(stems.fx, f, seconds(LANDINGS[i] - f), (b) => whoosh(b, 0, b.length, sr, { from: 4200, to: 500, gain: 0.08, q: 0.8, seed: 1310 + i }), { pan: (hash(i, 42) - 0.5) * 0.8, kind: 'gap' });
  });
  place(stems.fx, HOLE, 1.7, (b) => impact(b, 0, sr, { gain: 0.2 }, 69), { kind: 'punch' });
  swoosh(HOLE + 2, 18, { from: 5000, to: 300, gain: 0.18, seed: 70 }, { kind: 'hole' });
  // S11: a bell on each new face.
  FACES.forEach((f, i) => place(stems.chime, f, 2, (b) => fmBell(b, 0, sr, { freq: midi([81, 84, 88, 91][i]), gain: 0.05, decay: 0.3, index: 1.5 }), { pan: -0.3 + 0.2 * i, kind: 'face' }));

  // ——— riso 4 · S12 ————————————————————————————————————————————————————————————————————————————————————————————————————————————————
  if (BUILD_THREADS.printSteps) {
    // The inversion prints on the snare sixteenths: a press thump on the first proof, a clack on each of the next three; the sky roller's hiss.
    place(stems.fx, PRINT_STEPS[0], 0.15, (b) => press(b, 0, sr, { gain: 0.25 }, 1444), { kind: 'print' });
    PRINT_STEPS.slice(1).forEach((f, k) => place(stems.drums, f, 0.05, (b) => click(b, 0, sr, { gain: 0.05, tone: 2400 }, 1445 + k), { pan: k % 2 ? 0.15 : -0.15, kind: 'clack' }));
    place(stems.fx, SKY_ROLLER.from, seconds(SKY_ROLLER.to - SKY_ROLLER.from), (b) => sweep(b, 0, b.length, sr, { from: 6000, to: 1500, peak: 0.85, gain: 0.12, q: 0.8, seed: 1448 }), { kind: 'roller' });
  }
  // S12: the mouth stretches, the sea swells (the sun rises on the roll and the riser).
  swoosh(STRETCH.from + 1, STRETCH.to - STRETCH.from, { from: 600, to: 4000, q: 3, gain: 0.15, seed: 74 }, { kind: 'stretch' });
  swoosh(SEA.from + 4, SEA.to - SEA.from, { from: 200, to: 1400, q: 0.8, gain: 0.12, seed: 75 }, { kind: 'sea' });

  // ——— The scan bar's muffle, then the Defender's dry voices on top of it ————————————————————————————————————————————————————————
  // The world heard through the antivirus: music, chords, drums, chime and the bass line low-passed at 1.5 kHz, gliding in after the
  // shutter's attack (MUFFLE.in) and snapping open into the cut back (MUFFLE.out; the bus is exactly dry again from 816). S08's greys
  // duck the music and the bells under a short low-pass (888 → 896).
  const window = { a: at(MUFFLE.in.from), b: at(MUFFLE.in.to), c: at(MUFFLE.out.from), d: at(MUFFLE.out.to), cutoff: 1500, q: 0.7 };
  if (BUILD_THREADS.pov !== false) {
    for (const bus of [stems.music, stems.chords, stems.drums, stems.chime]) muffle([bus.L, bus.R], sr, window);
    muffle([bassBuf], sr, window);
    events.push({ kind: 'muffle', at: window.a });
  }
  if (BUILD_THREADS.infection) {
    const grey = { a: at(QUARANTINE.at), b: at(QUARANTINE.at) + Math.round(0.004 * sr), c: at(QUARANTINE.at + 2), d: at(QUARANTINE.at + 8), cutoff: 1200, q: 0.7 };
    for (const bus of [stems.music, stems.chime]) muffle([bus.L, bus.R], sr, grey);
  }
  addMono(stems.bass, bassBuf);
  for (const v of dryVoices) place(stems.bass, v.frame, v.dur, v.draw, { pan: v.pan, kind: v.kind });

  // The last half beat: the mix goes silent (bgm.mjs), and a reverse inhale on the post bus ends on the drop.
  const breath = full();
  inhale(breath, at(SILENCE.to), at(SILENCE.to) - at(SILENCE.from), sr, { gain: 0.45, seed: 76 });
  addMono(stems.post, breath);
  events.push({ kind: 'inhale', at: at(SILENCE.from) });
  return events;
}
