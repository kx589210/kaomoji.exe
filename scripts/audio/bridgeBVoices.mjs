// Bridge B's voices (v08, the crash taking time: src/score/bridgeB.ts; the section is sections/bridgeB.mjs). The tape stop and the
// winding-down music box are the same gesture as the picture's: a read rate falling. Pure DSP on Float32Arrays; plain Node.
import { musicBox } from './drop2Act2Voices.mjs';

/**
 * `src` read back at a varying rate (`rate(i)`, the output sample's: 1 = as written, 0.5 = an octave down and twice as long), linearly
 * interpolated, until the source runs out or `len` samples are written. Returns the new buffer (`len` long, zero past the source's end).
 */
export function varispeed(src, rate, len = src.length) {
  const out = new Float32Array(len);
  let pos = 0;
  for (let i = 0; i < len; i++) {
    const k = Math.floor(pos);
    if (k + 1 >= src.length) break;
    out[i] = src[k] + (pos - k) * (src[k + 1] - src[k]);
    pos += Math.max(0, rate(i));
  }
  return out;
}

/**
 * The tape stop's read rate at output sample `i` of a voice that starts `start` samples before the stop begins (negative: after it),
 * the stop running `span` samples and falling from 1 to `floor` (a constant deceleration, as the picture's camera clock: src/score/
 * bridgeB.ts cameraTime), then held at `floor`.
 */
export function tapeStopRate(i, { start, span, floor }) {
  const t = i - start;
  if (t <= 0) return 1;
  return 1 - (1 - floor) * Math.min(1, t / span);
}

/**
 * A music-box tine (drop2Act2Voices.mjs musicBox, the bullet time's) running down: struck `cents` flat and sagging a further `sag` cents
 * over `sagSeconds`, its ring slowing with it; into a buffer `seconds` long.
 */
export function windingBox(sr, { freq, cents = 0, sag = 0, sagSeconds = 0.6, gain = 0.15, decay = 0.8, seconds = 3 }) {
  const n = Math.round(seconds * sr);
  const src = new Float32Array(n);
  musicBox(src, 0, sr, { freq: freq * 2 ** (cents / 1200), gain, decay });
  if (!sag) return src;
  const m = sagSeconds * sr;
  return varispeed(src, (i) => 2 ** ((sag * Math.min(1, i / m)) / 1200), n);
}

/**
 * The finished mix's sound skipping (a CD's skip): from sample `at`, `times` repeats of the `slice` samples before it, each `stepDb`
 * quieter, replacing the mix (`fade` samples of crossfade at every splice, equal gain: nothing clicks, nothing gets louder). In place.
 */
export function skip(L, R, { at, slice, times, stepDb = -1.5, fade = 48 }) {
  if (at - slice < 0 || at + times * slice > L.length) return;
  for (const ch of [L, R]) {
    const src = ch.slice(at - slice, at);
    for (let k = 0; k < times; k++) {
      const g = 10 ** ((k * stepDb) / 20);
      for (let i = 0; i < slice; i++) {
        const j = at + k * slice + i;
        const w = Math.min(1, (i + 0.5) / fade, (slice - i - 0.5) / fade);
        // The first splice crossfades from the live mix; the others butt (each fades over `fade` at both ends).
        const live = k === 0 && i < fade ? 1 - (i + 0.5) / fade : 0;
        ch[j] = live * ch[j] + g * w * src[i];
      }
    }
    // After the last repeat the mix comes back in over `fade`.
    const end = at + times * slice;
    for (let i = 0; i < fade && end + i < ch.length; i++) ch[end + i] *= (i + 0.5) / fade;
  }
}

/**
 * The stuck buffer (the program's last 32nd looping, as drop 2's freeze did at 19.3: drop2Voices.mjs buzzLoops): from sample `at` to
 * `to`, the `slice` samples before `at` repeated, each loop `stepDb` quieter and darker (a one-pole pair falling `lp[0]` → `lp[1]` Hz),
 * replacing the mix there; `fade` samples at every splice. In place.
 */
export function stuck(L, R, sr, { at, to, slice, stepDb = -2, lp = [6000, 1200], fade = 48 }) {
  if (at - slice < 0 || to > L.length) return;
  const loops = Math.ceil((to - at) / slice);
  for (const ch of [L, R]) {
    const src = ch.slice(at - slice, at);
    let y = src[0];
    let z = src[0];
    for (let k = 0; k < loops; k++) {
      const g = 10 ** ((k * stepDb) / 20);
      const c = lp[0] * (lp[1] / lp[0]) ** (k / Math.max(1, loops - 1));
      const a = 1 - Math.exp((-2 * Math.PI * c) / sr);
      for (let i = 0; i < slice; i++) {
        const j = at + k * slice + i;
        if (j >= to) break;
        y += a * (src[i] - y);
        z += a * (y - z);
        const w = Math.min(1, (i + 0.5) / fade, (slice - i - 0.5) / fade, (to - j - 0.5) / fade);
        const live = k === 0 && i < fade ? 1 - (i + 0.5) / fade : 0;
        ch[j] = live * ch[j] + g * w * z;
      }
    }
  }
}
