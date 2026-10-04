// The film's soundtrack. Renders every section built so far into stems, mixes
// them (plate reverb on a send, restarted after each cut to silence; lows
// below 150 Hz folded to mono), masters
// (true-peak limiter) and writes public/audio/bgm.wav (the whole film) plus
// one WAV per built section in public/audio/sections/. Also writes a
// spectrogram and a loudness report per built section to output/qa/. The
// mix is limited to limiter.mjs's LIMIT_DB (−1.5 dBTP, iteration 2's ruling 16)
// and the finished mix turned down as a whole to its CEILING_DB (−2.0 dBTP,
// iteration 4: so the MP4's AAC encode, which lifts the peaks, holds −1.5),
// held on standard meters (iteration 3: meter.mjs rebuilds the band above
// 20 kHz as ffmpeg and 8× checks do, and the limiter aims MARGIN_DB under it);
// the run fails, writing nothing, if the mix is over it.
// From the transition on each part (sections/transition.mjs, cosmos.mjs, bridgeA.mjs, club.mjs, break.mjs,
// drop2.mjs, bridgeB.mjs, outro.mjs) renders its own events and declares its own hooks — CUTS, SILENCES,
// SENDS (its own buses), PREVIEWS and finish(L, R, sr), and for the break BREAK_MUSIC and
// DIGITAL_ZERO — which this file reads, so those sections' builders never edit it. Drop 1 is
// the cosmos (sections/cosmos.mjs, "VERTIGO ∞ · LIGHTSPEED PRESS", whose finish() cuts the
// approved stutter from the finished mix) and the comic club (sections/club.mjs, which owns the
// hit, the glass silence and the glass). v04's cosmos (sections/drop1.mjs renderDrop1) is
// retired: drop1.mjs is read only for the voicings and the hook table the later parts share.
// The film's map is src/score/film.ts. Every held tail (a grown part's unbuilt bars, partTail)
// is silent: gated to digital zero, and the reverb restarts on both its edges. A stub (a bridge not
// built yet, film.ts STUBS) is not: its module renders nothing and what rings into it is heard.
// One WAV per section, and one per part of drop 1 (cosmos, club: KX-Cosmos,
// KX-Club), so a part's builder can cut just theirs.
//   node scripts/audio/bgm.mjs
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { SILENCE } from '../../src/score/build.ts';
import { STUBS, TAILS } from '../../src/score/film.ts';
import { PART_COMPOSITIONS, SECTIONS } from '../../src/score/shots.ts';
import { FPS, TOTAL_FRAMES, barFrame } from '../../src/score/tempo.ts';
import { Biquad } from './filters.mjs';
import { CEILING_DB, LIMIT_DB, MASTER_TRIM_DB, limit } from './limiter.mjs';
import { correlation, integratedLoudness, lowCorrelation, truePeakDb } from './meter.mjs';
import { gate, stereo } from './mix.mjs';
import { plate } from './reverb.mjs';
import * as BREAK from './sections/break.mjs';
import * as BRIDGE_A from './sections/bridgeA.mjs';
import * as BRIDGE_B from './sections/bridgeB.mjs';
import * as CLUB from './sections/club.mjs';
import * as COSMOS from './sections/cosmos.mjs';
import { renderBuild } from './sections/build.mjs';
import * as DROP2 from './sections/drop2.mjs';
import { renderIntro } from './sections/intro.mjs';
import * as OUTRO from './sections/outro.mjs';
import * as TRANSITION from './sections/transition.mjs';
import { spectrogramPng } from './spectrogram.mjs';
import { spectrumRows } from './spectrumDrop2.mjs';
import { writeWav } from './wav.mjs';

export const SR = 48000;
/** The parts from the transition on, in film order: each module's hooks are read below. */
const LATER = [TRANSITION, COSMOS, BRIDGE_A, CLUB, BREAK, DROP2, BRIDGE_B, OUTRO];
const BUILT = ['intro', 'build', 'transition', 'drop1', 'break', 'drop2', 'bridgeB', 'outro'];
/** Preview slices of sections still being built: each later section's own; and the parts of drop 1 on their own. */
const PREVIEWS = [...PART_COMPOSITIONS.map((p) => ({ id: p.part, fromBar: p.fromBar, toBar: p.toBar })), ...LATER.flatMap((s) => s.PREVIEWS)];
/** The shared buses' reverb sends. */
const SHARED_SENDS = { keys: 0.1, fx: 0.22, music: 0.3, chime: 0.55, drums: 0.08, bass: 0, chords: 0.25, vox: 0.4 };
/** Every bus with its reverb send: the shared ones and each later section's own (a section may not reuse a name). */
const SENDS = { ...SHARED_SENDS };
for (const s of LATER) {
  for (const [name, amount] of Object.entries(s.SENDS)) {
    if (name in SENDS || name === 'post' || name === 'sub') throw new Error(`bgm: a section declares bus "${name}", which already exists`);
    SENDS[name] = amount;
  }
}
/**
 * Where the music stops dead (spec §8: the last half beat of riso 4, and each later part's own — the club's hit on club 6.4 among them):
 * the reverb restarts there, so no tail from before comes back.
 */
const CUTS = [...new Set([SILENCE.from, ...LATER.flatMap((s) => s.CUTS), ...TAILS.flatMap((t) => [t.from, t.to])])].sort((a, b) => a - b);
/**
 * Where the music comes back after Drop 1's hit: with the break's first note
 * (spec §6 T4: from the hit through the shatter on break 1.1 only the glass is
 * heard). sections/break.mjs owns it (the end of the film until the break has
 * music).
 */
const BREAK_MUSIC = BREAK.BREAK_MUSIC;
/** Windows the whole mix is silent in (the post bus plays through them): the build's last half beat, and each later part's own (the club's: from its hit until the break's music, BREAK_MUSIC). */
const SILENCES = [SILENCE, ...LATER.flatMap((s) => s.SILENCES)];
if (!SILENCES.some((w) => w.to === BREAK_MUSIC)) throw new Error('bgm: no silence ends where the break\'s music begins (the club\'s glass silence runs to BREAK_MUSIC)');
/**
 * Windows written as exact zeros, in samples of the film: each later part's DIGITAL_ZERO (only the break declares one: S4, its fake
 * drop's dead air). The WAVs leave the 16-bit dither out there (wav.mjs `silent`; review F8); a file that holds none of them is written
 * byte for byte as before.
 */
export const DIGITAL_ZERO = LATER.flatMap((s) => s.DIGITAL_ZERO ?? []).map((w) => [Math.round((w.from / FPS) * SR), Math.round((w.to / FPS) * SR)]);
/** DIGITAL_ZERO within a slice of `n` samples starting at sample `a` of the film, in the slice's own samples (clipped to it). */
export const digitalZeroIn = (a, n) => DIGITAL_ZERO.map(([x, y]) => [Math.max(0, x - a), Math.min(n, y - a)]).filter(([x, y]) => x < y);
/**
 * The plate's modulation clock for a reverb run starting on film sample `a` (v08): it stands still through every stub (film.ts STUBS: a
 * bridge not built yet), so a part after a stub hears the tank's chorus exactly where it heard it before the bridge was inserted (the
 * club after bridge A); undefined, the plain clock, when no stub lies ahead of `a`. Continuous: the modulation holds through the stub.
 */
export function plateClock(a, sr) {
  const stubs = STUBS.map((s) => [Math.round((s.from / FPS) * sr), Math.round((s.to / FPS) * sr)]).filter(([, y]) => y > a);
  if (!stubs.length) return undefined;
  return (i) => {
    const s = a + i;
    let t = i;
    for (const [x, y] of stubs) if (s > x) t -= Math.min(s, y) - Math.max(x, a);
    return t;
  };
}

/** The stutter's splices cross-fade over this long (equal power), so no cut clicks. */
export const SPLICE_MS = 1.5;

/**
 * The held tails (src/score/film.ts partTail) to digital zero, post bus and all, fading out over their first SPLICE_MS so nothing before
 * them is touched; in place. A tail is silent until its bars are built (its picture holds the part's last frame).
 */
function silenceTails(L, R, sr) {
  const ramp = Math.max(1, Math.round((SPLICE_MS / 1000) * sr));
  for (const t of TAILS) {
    const a = Math.round((t.from / FPS) * sr);
    const b = Math.min(L.length, Math.round((t.to / FPS) * sr));
    for (let i = a; i < b; i++) {
      const g = Math.max(0, 1 - (i - a + 1) / ramp);
      L[i] *= g;
      R[i] *= g;
    }
  }
}

/**
 * Every built section rendered into stems of `n` samples (the shared buses, the mono sub and each later section's own buses). `ending`
 * picks the ending's music (sections/outro.mjs ENDING_STYLE, the film's 'B', when left out; 'A' is the earlier ending, which scripts/audio/endingAB.mjs also renders).
 */
export function renderStems(sr = SR, n = Math.round((TOTAL_FRAMES / FPS) * sr), { ending } = {}) {
  const stems = {
    keys: stereo(n), fx: stereo(n), music: stereo(n), chime: stereo(n), drums: stereo(n), bass: stereo(n), chords: stereo(n), vox: stereo(n), post: stereo(n),
    sub: new Float32Array(n),
  };
  for (const name of Object.keys(SENDS)) stems[name] ??= stereo(n);
  const events = [
    ...renderIntro(stems, sr),
    ...renderBuild(stems, sr),
    ...TRANSITION.renderTransition(stems, sr),
    ...COSMOS.renderCosmos(stems, sr),
    ...BRIDGE_A.renderBridgeA(stems, sr),
    ...CLUB.renderClub(stems, sr),
    ...BREAK.renderBreak(stems, sr),
    ...DROP2.renderDrop2(stems, sr),
    ...BRIDGE_B.renderBridgeB(stems, sr),
    ...OUTRO.renderOutro(stems, sr, { style: ending }),
  ];
  return { stems, events };
}

/**
 * Dry buses + plate reverb from the sends (its modulation clock standing still through a stub bridge:
 * plateClock) + the mono sub; the mid is
 * high-passed at 20 Hz (no DC or infrasound), the side at 150 Hz (the lows
 * stay mono). The reverb runs afresh after each cut, each silence is gated
 * to zero (whatever a bus still holds there: dry, reverb or sub), and then
 * the post bus is added. Limited to LIMIT_DB (−1.5 dBTP); then each later
 * section's finish() edits the finished mix (the cosmos's: the stutter, cut
 * from it and trimmed under the limiter's aim as a whole so its repeats stay
 * exact), and the result is limited again so those edits stay under the
 * ceiling too (the second pass measures only what the edits changed and
 * leaves every sample before its first over untouched). All but the first
 * limit only with the `stutter` option (the edits past the limiter), on by default. Missing buses count as
 * silent. Last (iteration 4), the finished mix is turned down as a whole by
 * MASTER_TRIM_DB (−0.5 dB) to the master ceiling, CEILING_DB (−2.0 dBTP): one
 * gain, so every balance set against the limit stays as it was (the `trim`
 * option, on by default; off, the mix is returned at the limit).
 */
export function mixdown(stems, sr, { stutter: cut = true, trim: toCeiling = true } = {}) {
  const n = stems.sub.length;
  const send = stereo(n);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (const [name, amount] of Object.entries(SENDS)) {
    const bus = stems[name];
    if (!bus) continue;
    for (let i = 0; i < n; i++) {
      send.L[i] += bus.L[i] * amount;
      send.R[i] += bus.R[i] * amount;
      L[i] += bus.L[i];
      R[i] += bus.R[i];
    }
  }
  const wet = stereo(n);
  const edges = [0, ...CUTS.map((f) => Math.round((f / FPS) * sr)).filter((c) => c > 0 && c < n), n];
  for (let k = 0; k + 1 < edges.length; k++) {
    const part = plate(send.L.subarray(edges[k], edges[k + 1]), send.R.subarray(edges[k], edges[k + 1]), sr, { predelayMs: 18, decay: 0.62, damping: 0.4, clock: plateClock(edges[k], sr) });
    wet.L.set(part.L, edges[k]);
    wet.R.set(part.R, edges[k]);
  }
  const side = Biquad.highpass(sr, 150);
  const lowCut = Biquad.highpass(sr, 20);
  for (let i = 0; i < n; i++) {
    const l = L[i] + 0.9 * wet.L[i];
    const r = R[i] + 0.9 * wet.R[i];
    const mid = lowCut.process(0.5 * (l + r) + stems.sub[i]);
    const s = side.process(0.5 * (l - r));
    L[i] = mid + s;
    R[i] = mid - s;
  }
  for (const s of SILENCES) gate(L, R, Math.round((s.from / FPS) * sr), Math.round((s.to / FPS) * sr), sr);
  if (stems.post) {
    for (let i = 0; i < n; i++) {
      L[i] += stems.post.L[i];
      R[i] += stems.post.R[i];
    }
  }
  silenceTails(L, R, sr);
  limit(L, R, sr, { ceilingDb: LIMIT_DB });
  if (cut) {
    const limited = { L: L.slice(), R: R.slice() };
    for (const s of LATER) s.finish(L, R, sr);
    // Iteration 2, ruling 16: the stutter's splices and the sections' edits (drop2 1.1's slam, the stuck buffer) came out over the ceiling.
    limit(L, R, sr, { ceilingDb: LIMIT_DB, under: limited });
    // The splices and edits stay out of the held tails.
    silenceTails(L, R, sr);
  }
  // Iteration 4: the master ceiling, by one gain (the MP4's AAC lifts the peaks up to 0.4 dB; it holds −1.5 dBTP from here).
  if (!toCeiling) return { L, R };
  const trim = 10 ** (MASTER_TRIM_DB / 20);
  for (let i = 0; i < n; i++) {
    L[i] *= trim;
    R[i] *= trim;
  }
  return { L, R };
}


const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { stems } = renderStems();
  const { L, R } = mixdown(stems, SR);
  const film = truePeakDb(L, R);
  if (film > CEILING_DB) {
    console.error(`TRUE PEAK ${film.toFixed(3)} dBTP is over the ${CEILING_DB} dBTP ceiling; nothing written`);
    process.exit(1);
  }
  const audio = path.join(KX, 'public', 'audio');
  fs.mkdirSync(path.join(audio, 'sections'), { recursive: true });
  writeWav(path.join(audio, 'bgm.wav'), L, R, SR, { silent: digitalZeroIn(0, L.length) });
  const qa = path.join(KX, 'output', 'qa');
  fs.mkdirSync(qa, { recursive: true });
  const report = {};
  for (const s of [...SECTIONS.filter((x) => BUILT.includes(x.id)), ...PREVIEWS]) {
    const a = Math.round((barFrame(s.fromBar) / FPS) * SR);
    const b = Math.round((barFrame(s.toBar + 1) / FPS) * SR);
    const l = L.slice(a, b);
    const r = R.slice(a, b);
    writeWav(path.join(audio, 'sections', `${s.id}.wav`), l, r, SR, { silent: digitalZeroIn(a, l.length) });
    spectrogramPng(path.join(qa, `bgm-${s.id}-spectrogram.png`), l, r, SR);
    report[s.id] = {
      seconds: +((b - a) / SR).toFixed(3),
      lufs: +integratedLoudness(l, r, SR).toFixed(2),
      truePeakDb: +truePeakDb(l, r).toFixed(2),
      correlation: +correlation(l, r).toFixed(3),
      lowCorrelation: +lowCorrelation(l, r, SR).toFixed(3),
    };
  }
  // The whole film too: its true peak is what the ceiling is held to.
  report.film = {
    seconds: +(L.length / SR).toFixed(3),
    lufs: +integratedLoudness(L, R, SR).toFixed(2),
    truePeakDb: +film.toFixed(2),
    correlation: +correlation(L, R).toFixed(3),
    lowCorrelation: +lowCorrelation(L, R, SR).toFixed(3),
  };
  fs.writeFileSync(path.join(qa, 'bgm-audio.json'), JSON.stringify(report, null, 2));
  console.log(`bgm.wav ${(L.length / SR).toFixed(1)} s`, report);
  // E8: S30's highway reads the song's own spectrogram (scripts/audio/spectrumDrop2.mjs), so it is rebuilt from every mix.
  fs.writeFileSync(path.join(audio, 'bgm-spectrum.bin'), spectrumRows(L, R, SR));
}
