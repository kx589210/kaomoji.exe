// The comic club mixed on its own (its preview, KX-ClubInk, and the tests' loudness checks), until bgm.mjs plays it in the film: the film's
// chain (bgm.mjs mixdown) applied to the club's own buses — dry plus a plate reverb from each bus's send (restarting at the club's CUTS),
// the M/S clean-up (the mid high-passed at 20 Hz, the side at 150 Hz: everything below 150 Hz mono), the club's SILENCES gated, the post
// bus added, the true-peak limiter at LIMIT_DB, the master trim to CEILING_DB. bgm.mjs's own mixdown cannot be used yet: it gates the
// v04 club's silence and silences the held club 5–6, and its sends do not know the club's buses. Kept in step with bgm.mjs by hand (its
// plate settings, the order of the steps); the club's numbers are re-measured in the film once it is live.
//   node scripts/audio/clubMix.mjs            writes public/audio/sections/club-ink.wav (club 1.1 = sample 0, to break 1.1)
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { CLUB } from '../../src/score/club.ts';
import { FPS } from '../../src/score/tempo.ts';
import { Biquad } from './filters.mjs';
import { LIMIT_DB, MASTER_TRIM_DB, limit } from './limiter.mjs';
import { gate, stereo } from './mix.mjs';
import { plate } from './reverb.mjs';
import { CUTS, SENDS, SILENCES, renderClub } from './sections/club.mjs';
import { writeWav } from './wav.mjs';

/**
 * The club's buses in `stems` (each SENDS bus, the post bus, and a mono `sub` if any; missing ones are silent) mixed as bgm.mjs mixes the
 * film, `origin` being the film frame of the stems' first sample. Returns { L, R } at the master scale (or at the limit with `trim` false).
 */
export function mixClub(stems, sr, { origin = 0, trim = true } = {}) {
  const n = Object.values(stems).find((b) => b && b.L)?.L.length ?? stems.sub.length;
  const at = (frame) => Math.round((frame / FPS) * sr) - Math.round((origin / FPS) * sr);
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
  const edges = [0, ...CUTS.map(at).filter((c) => c > 0 && c < n), n];
  for (let k = 0; k + 1 < edges.length; k++) {
    const part = plate(send.L.subarray(edges[k], edges[k + 1]), send.R.subarray(edges[k], edges[k + 1]), sr, { predelayMs: 18, decay: 0.62, damping: 0.4 });
    wet.L.set(part.L, edges[k]);
    wet.R.set(part.R, edges[k]);
  }
  const side = Biquad.highpass(sr, 150);
  const lowCut = Biquad.highpass(sr, 20);
  for (let i = 0; i < n; i++) {
    const l = L[i] + 0.9 * wet.L[i];
    const r = R[i] + 0.9 * wet.R[i];
    const mid = lowCut.process(0.5 * (l + r) + (stems.sub ? stems.sub[i] : 0));
    const s = side.process(0.5 * (l - r));
    L[i] = mid + s;
    R[i] = mid - s;
  }
  for (const s of SILENCES) gate(L, R, Math.max(0, at(s.from)), Math.min(n, at(s.to)), sr);
  if (stems.post) {
    for (let i = 0; i < n; i++) {
      L[i] += stems.post.L[i];
      R[i] += stems.post.R[i];
    }
  }
  limit(L, R, sr, { ceilingDb: LIMIT_DB });
  if (!trim) return { L, R };
  const g = 10 ** (MASTER_TRIM_DB / 20);
  for (let i = 0; i < n; i++) {
    L[i] *= g;
    R[i] *= g;
  }
  return { L, R };
}

/** The club alone, club 1.1 → break 1.1 (sample 0 = club 1.1): rendered, mixed; { L, R, stems, events }. */
export function clubAlone(sr = 48000, opts = {}) {
  const n = Math.round(((CLUB.to - CLUB.from) / FPS) * sr);
  const stems = { post: stereo(n), sub: new Float32Array(n) };
  for (const k of Object.keys(SENDS)) stems[k] = stereo(n);
  const events = renderClub(stems, sr, { ...opts, origin: CLUB.from });
  return { ...mixClub(stems, sr, { origin: CLUB.from }), stems, events };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { L, R } = clubAlone();
  const out = path.join(KX, 'public', 'audio', 'sections', 'club-ink.wav');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  writeWav(out, L, R, 48000);
  console.log(`club-ink.wav ${(L.length / 48000).toFixed(2)} s`);
}
