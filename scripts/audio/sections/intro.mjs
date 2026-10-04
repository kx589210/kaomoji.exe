// The intro's sound (spec §8 开机, the part 'intro', its five bars; the bars 1–14 design notes/b112/final.md §8.1–8.2, build
// sheet notes/b114/sheet.md §10), placed from src/score/intro.ts:
//   intro 1  a CRT switching on, two cursor ticks, the boot chime, data chatter under the scrolling log (the log's own clock: its
//            ticks are LOG_TICKS, none in the RAIN bar), and the Defender's two dry C7 beeps as it loads (A1);
//   intro 2  the RAIN bar (new): the tilt whoosh peaking as the camera tips up, a sub that bumps and swells under the rain, the rain's
//            hiss, a drip on every sixteenth (a cluster on the first wave), the red scan's falling sweep and a tick per HUD cell, the
//            signature's F6 bell (his: wet), the Defender's two beeps a beat late (`0 threats ✓`), the crane whoosh landing on the highway;
//   intro 3–5 v04's intro 2–4 a bar later: progress blips climbing and sweeping left to right, the whip, the typed command, Enter,
//            the fly-up swarm, the face locking in with the tube kick's CRT thunk, the red band's dry "look", the blink, and a riser
//            (under the blink and the push) with a reverse cymbal into swiss 1.1.
// An 8-bit arpeggio runs from the boot to the push, its filter opening across the five bars, over sub pulses on the downbeats of
// intro 2–5 (SUB_PULSES). The Defender's voices (scripts/audio/introVoices.mjs; music bible M8, M9) are dry: they go on the send-free
// `bass` bus, which the intro does not otherwise use. INTRO_THREADS' flags turn their additions off with the picture's.
// L14b (2026-10-02: no chord held behind everything) rebuilt the intro without its constant arp and
//   the RAIN bar on break 1 FALL's tinks; after an A/B only some of its small sounds stayed:
// L14c (A's opening works better): the intro's music is A's again — the arp's unbroken sixteenths
//   (the `music` bus), the sub (the C2 swell at 0.22), the boot chime ringing on into the rain, no INTRO_LIFT;
// L14d (the code rain's original sound works better for that bar): the RAIN bar is A's again on every bus (B's
//   face tinks, wave cluster, landing tinks and denser drips are gone). What stays of B in the intro: the highway's progress blips
//   (PROGRESS_MIX). Swiss and riso keep B (sections/build.mjs). A, B, C and D: notes/b114/music-r1/ and integ-r1/.
import { COMMAND, INTRO_THREADS, RAIN_HUD, RAIN_HUD_DONE, READOUT_SLOT } from '../../../src/content/boot.ts';
import { hash } from '../../../src/engine/random.ts';
import { partBars, partStart } from '../../../src/score/film.ts';
import {
  BLINK, CRANE, CRANE_PEAK, CURSOR_BLINKS, DEFENDER_BEEPS, DRIPS, ENTER_FRAME, HIGHWAY_START, INTRO_END, LAUNCH, LOCK, LOG_START, LOG_TICKS, LOOK,
  PROGRESS_STEPS, RAIN, RAIN_WAVES, RISE, SCAN_HUD_CELLS, SCAN_RAIN, SIG_BELL, SUB_PULSES, TILT, TILT_PEAK, WHIP, WINDUP, ZERO_RAIN, typeFrames,
} from '../../../src/score/intro.ts';
import { FPS, FRAMES_PER_BEAT, FRAMES_PER_BAR } from '../../../src/score/tempo.ts';
import { blip, impact, riser } from '../drums.mjs';
import { fmBell } from '../fm.mjs';
import { WHOOSH_PEAK, powerOn, reverseCymbal, swarm, whoosh } from '../fx.mjs';
import { DEFENDER_PITCH, beeps, crtThunk, drip, glide, rainHiss, subSwell, sweep } from '../introVoices.mjs';
import { keyPan, keyPress } from '../keys.mjs';
import { addMono } from '../mix.mjs';
import { pulseArp, subPulse } from '../synth.mjs';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
/** Arpeggio chord tones, one chord per bar: B♭maj7 – C9sus4 – C7 – Am7 – Dm7 (src/score/intro.ts INTRO_CHORDS: IV–Vsus–V–iii–vi in F), with the root an octave up on top. */
const ARP = [
  [70, 74, 77, 81, 82],
  [72, 74, 77, 82, 84], // intro 2, the RAIN bar: C9sus4 (Vsus)
  [72, 76, 79, 82, 84],
  [69, 72, 76, 79, 81],
  [74, 77, 81, 84, 86],
];
if (ARP.length !== partBars('intro').length) throw new Error(`sections/intro.mjs: ARP has ${ARP.length} chords for the intro's ${partBars('intro').length} bars (src/score/film.ts): write one per bar`);
const PATTERN = [0, 1, 2, 3, 4, 3, 2, 1];
const TICKS = [2093, 2349, 2637, 3136, 3520];
const PROGRESS_NOTES = [72, 76, 79, 82, 84, 88, 91, 94];
/** The rain's drips: C D F G B♭ (the C9sus4's tones), octave 6 or 7 by hash; the first wave (intro 2.2) drips a C D F cluster. */
const DRIP_NOTES = [84, 86, 89, 91, 94];
const DRIP_CLUSTER = [84, 86, 89];
/** Picture x (1080p px from the centre) → pan, as every gag is panned (music bible §6.2): x / 960 × 0.9. */
const panX = (x) => Math.max(-1, Math.min(1, (x / 960) * 0.9));
/** Where the readout slot's character `k` sits (JetBrains Mono: 0.6 em a character). */
const readoutX = (k) => READOUT_SLOT.x + 0.6 * READOUT_SLOT.px * k;
/** The RAIN bar's levels (bars 1–14 design §8.2; A's, L14d): the bar sits about −16 LUFS. */
const RAIN_MIX = { tilt: 0.3, crane: 0.26, hiss: 0.04, drip: 0.03, swell: 0.22, scan: 0.05, cell: 0.02, bell: 0.03, beeps: 0.05 };
/** The highway's progress blips (L14b, kept in L14c/L14d: FALL's plips, "climbing like a bottle filling"): v04 0.06, 35 ms. */
const PROGRESS_MIX = { gain: 0.1, ms: 50 };

/**
 * Renders the intro into `stems` (stereo buses keys, fx, music, chime and bass — the Defender's dry voices — and a mono sub) at sample
 * rate `sr`. Returns every placed event as { kind, at } with `at` in samples, so tests can check the timing.
 */
export function renderIntro(stems, sr) {
  const at = (frame) => Math.round((frame / FPS) * sr);
  const seconds = (frames) => frames / FPS;
  const events = [];
  const place = (bus, frame, dur, draw, { pan = 0, kind } = {}) => {
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    addMono(bus, buf, { at: at(frame), pan });
    if (kind) events.push({ kind, at: at(frame) });
  };
  /** A whoosh `frames` long whose peak lands on frame `peak` (the picture's hit); its event is recorded at the peak. */
  const swoosh = (peak, frames, o, kind) => {
    place(stems.fx, peak - WHOOSH_PEAK * frames, seconds(frames), (b) => whoosh(b, 0, b.length, sr, o));
    if (kind) events.push({ kind, at: at(peak) });
  };
  /** A sweep over [from, to) frames whose loudest point lands on frame `peak`; its event is recorded at the peak. */
  const sweepTo = (from, peak, to, o, kind) => {
    place(stems.fx, from, seconds(to - from), (b) => sweep(b, 0, b.length, sr, { ...o, peak: (peak - from) / (to - from) }));
    events.push({ kind, at: at(peak) });
  };
  const placeSub = (frame, dur, draw) => {
    const buf = new Float32Array(Math.round(dur * sr));
    draw(buf);
    const a = at(frame);
    for (let i = 0; i < buf.length && a + i < stems.sub.length; i++) stems.sub[a + i] += buf[i];
  };
  /** The Defender's dry voices (M8, M9): on the send-free bus. */
  const dry = (frame, dur, draw, o) => place(stems.bass, frame, dur, draw, o);
  const twoBeeps = (frame, pan) => dry(frame, 0.12, (b) => beeps(b, 0, sr, { freq: DEFENDER_PITCH.c7, gain: RAIN_MIX.beeps }), { pan, kind: 'beeps' });

  // ——— intro 1 · S01 BOOT ——————————————————————————————————————————————————————————————————————————————————————————————————————————
  place(stems.fx, partStart('intro'), 0.6, (b) => powerOn(b, 0, sr, { gain: 0.32 }), { kind: 'power' });
  for (const [on] of CURSOR_BLINKS) place(stems.fx, on, 0.05, (b) => blip(b, 0, sr, { freq: 1760, ms: 10, gain: 0.05 }), { kind: 'tick' });

  [65, 69, 72, 79].forEach((m, i) => place(stems.chime, LOG_START + i, 7.5, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.11, decay: 1.4, index: 2 }), { pan: -0.45 + 0.3 * i, kind: 'chime' }));

  // Each log line's tick, on the film frame it prints (the log's clock holds through the RAIN bar: no ticks there).
  LOG_TICKS.forEach((f, i) => {
    if (i > 0) place(stems.fx, f, 0.03, (b) => blip(b, 0, sr, { freq: TICKS[Math.floor(hash(i, 11) * TICKS.length)], ms: 7, gain: 0.018 }), { pan: (hash(i, 12) - 0.5) * 1.4, kind: 'logtick' });
  });
  // A1: `[ OK ] defender loaded (￣▽￣)` — the antivirus's first sound, two dry C7 beeps (DEFENDER_BEEPS[0]; none with bootLines off).
  for (const f of DEFENDER_BEEPS.filter((x) => x < RAIN.from)) twoBeeps(f, 0);

  // The arp (A, L14c): sixteenths from the boot chime to the push, alternating left and right, its filter opening across the five bars.
  const sixteenth = FRAMES_PER_BEAT / 4;
  const notes = [[], []];
  for (let f = LOG_START, k = 0; f < INTRO_END; f += sixteenth, k++) {
    const chord = ARP[Math.floor((f - partStart('intro')) / FRAMES_PER_BAR)];
    notes[k % 2].push({ at: at(f), len: Math.round(seconds(sixteenth * 0.8) * sr), freq: midi(chord[PATTERN[k % 8]]), duty: [0.125, 0.25, 0.5, 0.25][k % 4] });
  }
  const cutoff = (i) => 350 * (6500 / 350) ** Math.min(1, Math.max(0, ((i / sr) * FPS - LOG_START) / (INTRO_END - LOG_START)));
  notes.forEach((list, side) => {
    const buf = new Float32Array(stems.sub.length);
    pulseArp(buf, list, sr, { gain: 0.12, cutoff });
    addMono(stems.music, buf, { pan: side === 0 ? -0.35 : 0.35 });
  });
  events.push({ kind: 'arp', at: at(LOG_START) });

  // The sub on the downbeats of intro 2–5: C2 under the tilt (it bumps, then swells under the rain, gone before the highway's C2),
  // C2 on the highway, A1 under the typing, D2 under the face.
  for (const [k, p] of SUB_PULSES.entries()) {
    if (k === 0) placeSub(p.at, seconds(HIGHWAY_START - 2 - p.at), (b) => subSwell(b, 0, b.length, sr, { freq: midi(p.midi), gain: RAIN_MIX.swell }));
    else placeSub(p.at, 2, (b) => subPulse(b, 0, sr, { freq: midi(p.midi), gain: 0.5 }));
    events.push({ kind: 'sub', at: at(p.at) });
  }

  // ——— intro 2 · S02R THE RAIN BAR ————————————————————————————————————————————————————————————————————————————————————————————————
  // The tilt up: a launch out of the wind-up, so its whoosh rises under the wind-up (WINDUP.from) and peaks two frames into the tilt.
  sweepTo(WINDUP.from, TILT_PEAK, TILT.to + 2, { from: 300, to: 4000, gain: RAIN_MIX.tilt, q: 1.4, seed: 103 }, 'tilt');
  // The rain's hiss: in from nothing to `0 threats ✓`, then ducked out by the highway.
  place(stems.fx, RAIN.from, seconds(RAIN.to - RAIN.from), (b) => rainHiss(b, 0, b.length, sr, { gain: RAIN_MIX.hiss, rise: at(ZERO_RAIN) - at(RAIN.from), seed: 104 }), { pan: 0, kind: 'hiss' });
  // A drip on every sixteenth, pitched and panned by hash; the first wave (intro 2.2) drips a C D F cluster, 12 ms apart.
  DRIPS.forEach((f, i) => {
    events.push({ kind: 'drip', at: at(f) });
    if (f === RAIN_WAVES[0]) {
      DRIP_CLUSTER.forEach((m, j) => place(stems.fx, f + (j * 0.012 * FPS), 0.06, (b) => drip(b, 0, sr, { freq: midi(m), gain: RAIN_MIX.drip }), { pan: -0.4 + 0.4 * j }));
      return;
    }
    const m = DRIP_NOTES[Math.floor(hash(i, 113) * DRIP_NOTES.length)] + (hash(i, 114) < 0.4 ? 12 : 0);
    place(stems.fx, f, 0.06, (b) => drip(b, 0, sr, { freq: midi(m), gain: RAIN_MIX.drip }), { pan: (hash(i, 115) - 0.5) * 1.6 });
  });
  // THE SCAN: the red plane's dry sweep C6 → C5 as it falls through the walls, and a dry tick for each ▓ the HUD fills (at the cell).
  dry(SCAN_RAIN.from, seconds(SCAN_RAIN.to - SCAN_RAIN.from) + 0.01, (b) => glide(b, 0, sr, { from: DEFENDER_PITCH.c6, to: DEFENDER_PITCH.c6 / 2, ms: (seconds(SCAN_RAIN.to - SCAN_RAIN.from)) * 1000, gain: RAIN_MIX.scan }), { kind: 'scan' });
  SCAN_HUD_CELLS.forEach((f, k) => dry(f, 0.02, (b) => blip(b, 0, sr, { freq: DEFENDER_PITCH.c7, ms: 8, gain: RAIN_MIX.cell }), { pan: panX(readoutX(RAIN_HUD.tag.length + 1 + k)), kind: 'cell' }));
  // The signature column completes (… E2 80 A2): his F6 bell, wet, from the column's place right of centre.
  place(stems.chime, SIG_BELL, 5, (b) => fmBell(b, 0, sr, { freq: midi(89), gain: RAIN_MIX.bell, decay: 0.9, index: 2 }), { pan: 0.15, kind: 'sigbell' });
  // `· 0 threats ✓`, a beat late: the Defender's two beeps from the readout's ✓.
  for (const f of DEFENDER_BEEPS.filter((x) => x >= RAIN.from)) twoBeeps(f, panX(readoutX([...RAIN_HUD_DONE].length)));
  // The crane down onto the highway: an impact, so its whoosh (falling 5 kHz → 300 Hz as the camera descends) peaks just before it lands.
  sweepTo(CRANE.from, CRANE_PEAK, CRANE.to + 4, { from: 5000, to: 300, gain: RAIN_MIX.crane, q: 1.2, seed: 105 }, 'crane');

  // ——— intro 3–5 (v04's intro 2–4) ————————————————————————————————————————————————————————————————————————————————————————————————
  PROGRESS_STEPS.forEach((f, k) => place(stems.fx, f, 0.08, (b) => blip(b, 0, sr, { freq: midi(PROGRESS_NOTES[k]), ms: PROGRESS_MIX.ms, gain: PROGRESS_MIX.gain }), { pan: (k / 7 - 0.5) * 0.9, kind: 'progress' }));
  [96, 100].forEach((m, i) => place(stems.chime, PROGRESS_STEPS[7] + i, 5, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.05, decay: 0.9, index: 1.5 }), { pan: i ? 0.4 : -0.2 }));

  // The whip and the launch are launches: their whooshes peak two frames in, where they move fastest.
  swoosh(WHIP.from + 2, 16, { from: 350, to: 7000, gain: 0.32, seed: 21 }, 'whip');

  [...COMMAND].forEach((ch, i) => place(stems.keys, typeFrames[i], 0.25, (b) => keyPress(b, 0, sr, { kind: ch === ' ' ? 'space' : 'letter', seed: 300 + i, gain: 0.42 }), { pan: keyPan(ch), kind: 'key' }));
  place(stems.keys, ENTER_FRAME, 0.3, (b) => keyPress(b, 0, sr, { kind: 'enter', seed: 399, gain: 0.55 }), { pan: keyPan('\n'), kind: 'enter' });
  placeSub(ENTER_FRAME, 1, (b) => subPulse(b, 0, sr, { freq: 45, gain: 0.22, decayMs: 200 }));

  swoosh(LAUNCH + 2, 20, { from: 300, to: 3200, gain: 0.26, seed: 22 }, 'launch');
  swarm(stems.fx.L, stems.fx.R, at(LAUNCH + 2), at(LOCK) - at(LAUNCH), sr, { gain: 0.14, density: 420, seed: 23 });

  [74, 77, 81, 84, 88].forEach((m, i) => place(stems.chime, LOCK + i, 6, (b) => fmBell(b, 0, sr, { freq: midi(m), gain: 0.065, decay: 1.2, index: 2.2 }), { pan: -0.5 + 0.25 * i, kind: 'lock' }));
  place(stems.fx, LOCK, 1.7, (b) => impact(b, 0, sr, { gain: 0.18 }, 24));
  // The tube kick: the CRT thunks as its glass bulges on the lock.
  if (INTRO_THREADS.tubeKick) place(stems.fx, LOCK, 0.2, (b) => crtThunk(b, 0, sr, { gain: 0.3 }), { kind: 'thunk' });
  // The red band rolls down the face: the antivirus looks (a dry C6, 120 ms).
  if (INTRO_THREADS.redBand) dry(LOOK, 0.13, (b) => glide(b, 0, sr, { from: DEFENDER_PITCH.c6, ms: 120, gain: 0.03, attackMs: 4 }), { kind: 'look' });

  place(stems.fx, BLINK.close, 0.05, (b) => blip(b, 0, sr, { freq: 880, ms: 25, gain: 0.07 }), { pan: -0.2, kind: 'blink' });
  place(stems.fx, BLINK.open, 0.05, (b) => blip(b, 0, sr, { freq: 1175, ms: 25, gain: 0.07 }), { pan: 0.2 });

  place(stems.fx, RISE.from, seconds(RISE.to - RISE.from), (b) => riser(b, 0, b.length, sr, { gain: 0.26 }, 25), { kind: 'push' });
  place(stems.fx, INTRO_END - 48, seconds(48), (b) => reverseCymbal(b, b.length, b.length, sr, { gain: 0.3, seed: 26 }));
  return events;
}
