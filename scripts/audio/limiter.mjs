import { truePeakEnvelope } from './meter.mjs';

/**
 * The ceiling the mix is limited against (iteration 2, ruling 16: headroom for a re-encode). Every level the sections set against the
 * master — drop2 1.1's slam 3 dB into it, break 6.4 riding it, drop 1's density over the build — is balanced against this one.
 */
export const LIMIT_DB = -1.5;
/**
 * The master's true-peak ceiling (iteration 4): the delivered MP4 must hold −1.5 dBTP too, and its AAC encode lifts the peaks by up to
 * 0.4 dB (v03: bgm.wav −1.52, its AAC −1.18 dBTP on a 16× meter; v03 turned down 0.4 dB still read −1.52 after the AAC). bgm.mjs
 * limits the mix to LIMIT_DB and then turns the finished mix down as a whole by MASTER_TRIM_DB, so the balance stays exactly the
 * approved one (a lower limit squeezed the loud passages: drop 1 lost its brightness over the build, break 6.4 its rise). The meter and the
 * limiter are unchanged; `limit` called on its own holds this ceiling.
 */
export const CEILING_DB = -2.0;
/** The finished mix's gain (dB): from the limit to the master ceiling. */
export const MASTER_TRIM_DB = CEILING_DB - LIMIT_DB;
/**
 * How far under its ceiling the limiter aims on meter.mjs (iteration 3, ruling 16). meter.mjs takes the largest of several
 * rebuilds of the band above 20 kHz, as meters differ there; what is left between it and any one standard meter (ffmpeg's ebur128,
 * 8× checks of 16 to 256 taps, cut-offs under Nyquist) is a few hundredths of a dB on the master's brightest passages.
 */
export const MARGIN_DB = 0.03;

/**
 * Look-ahead true-peak limiter, in place: afterwards no point of the rebuilt signal (meter.mjs) is over `ceilingDb` − MARGIN_DB.
 * The gain ramps down linearly over the look-ahead before each over and recovers exponentially. Because the gain changes between
 * samples, the result is measured, and where a peak of it is still over, the gain needed there is lowered by what it is over and the
 * pass runs again from the original — only those spots change. Samples are clamped to the aim as a last resort.
 * `under` ({ L, R }): a signal already under the aim that the input differs from only in places (bgm.mjs: the mix before its edits);
 * only those places are measured.
 */
export function limit(L, R, sr, { ceilingDb = CEILING_DB, lookaheadMs = 5, releaseMs = 80, under = null } = {}) {
  const aim = 10 ** ((ceilingDb - MARGIN_DB) / 20);
  const n = L.length;
  const srcL = Float32Array.from(L);
  const srcR = Float32Array.from(R);
  const differs = under ? (from, to) => changed(srcL, srcR, under, from, to) : null;
  const opts = { above: aim * 10 ** (-1 / 20), where: differs };
  const envL = truePeakEnvelope(srcL, opts);
  const envR = truePeakEnvelope(srcR, opts);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(envL[i], envR[i]);
    need[i] = p > aim ? aim / p : 1;
  }
  const la = Math.max(1, Math.round((sr * lookaheadMs) / 1000));
  const rel = Math.exp(-1 / ((sr * releaseMs) / 1000));
  // What the last pass's result was measured against: first the original, then each pass's result (only where they differ can a
  // peak have moved).
  let before = { L: srcL, R: srcR };
  for (let pass = 0; pass < 12; pass++) {
    L.set(srcL);
    R.set(srcR);
    const gain = applyGain(L, R, need, aim, la, rel);
    const ref = before;
    const where = (from, to) => changed(L, R, ref, from, to);
    const outL = truePeakEnvelope(L, { above: aim, where });
    const outR = truePeakEnvelope(R, { above: aim, where });
    let over = false;
    for (let i = 0; i < n; i++) {
      const p = Math.max(outL[i], outR[i]);
      if (p <= aim) continue;
      over = true;
      need[i] = Math.min(need[i], (gain[i] * aim * 0.9995) / p);
    }
    if (!over) return;
    before = { L: L.slice(), R: R.slice() };
  }
  throw new Error(`limiter could not reach ${ceilingDb} dBTP`);
}

/** Whether the pair differs from `ref` anywhere in [from, to). */
function changed(L, R, ref, from, to) {
  for (let i = from; i < to; i++) if (L[i] !== ref.L[i] || R[i] !== ref.R[i]) return true;
  return false;
}

/** Applies the gain that `need` asks for (look-ahead ramp, exponential release) in place; returns the gain at each sample. */
function applyGain(L, R, need, aim, la, rel) {
  const n = L.length;
  const g = new Float32Array(n).fill(1);
  for (let j = 0; j < n; j++) {
    if (need[j] >= 1) continue;
    for (let k = 0; k <= la; k++) {
      const i = j - k;
      if (i < 0) break;
      const v = need[j] + ((1 - need[j]) * k) / la;
      if (v < g[i]) g[i] = v;
    }
  }
  let cur = 1;
  for (let i = 0; i < n; i++) {
    cur = g[i] < cur ? g[i] : g[i] + (cur - g[i]) * rel;
    g[i] = cur;
    if (cur === 1) continue;
    L[i] = Math.max(-aim, Math.min(aim, L[i] * cur));
    R[i] = Math.max(-aim, Math.min(aim, R[i] * cur));
  }
  return g;
}
