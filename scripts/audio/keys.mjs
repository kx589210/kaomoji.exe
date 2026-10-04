// A mechanical keyboard. A press is a switch click, the keycap's resonant
// clack and a low case thock; the release adds a quieter click 70–110 ms
// later. Every key sounds a little different (seeded), and Space and Enter are
// deeper, with stabiliser rattle.
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';

/** Adds one keystroke into mono `out` from sample `at`. */
export function keyPress(out, at, sr, { gain = 0.5, kind = 'letter', seed = 1, releaseMs } = {}) {
  const r = rng(seed);
  const big = kind !== 'letter';
  const clackHz = (big ? 1500 : 2100) * (0.9 + 0.2 * r());
  const thockHz = (kind === 'enter' ? 150 : big ? 170 : 230) * (0.92 + 0.16 * r());
  const up = Math.round(((releaseMs ?? 70 + 40 * r()) / 1000) * sr);
  const len = up + Math.round(0.12 * sr);
  const level = gain * (kind === 'enter' ? 1.4 : 1);
  const click = new SVF(sr);
  const body = new SVF(sr);
  const release = new SVF(sr);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const j = at + i;
    if (j >= out.length) break;
    const t = i / sr;
    const noise = r() * 2 - 1;
    click.process(noise, 5200, 1.2);
    body.process(noise, clackHz, 4);
    ph += (thockHz * (1 + 0.6 * Math.exp(-t / 0.004))) / sr;
    let v = 0.9 * click.bp * Math.exp(-t / 0.0012);
    if (t > 0.0008) v += 1.1 * body.bp * Math.exp(-(t - 0.0008) / (big ? 0.018 : 0.011));
    if (big && t > 0.004) v += 0.25 * body.bp * Math.exp(-(t - 0.004) / 0.01);
    v += (big ? 0.55 : 0.35) * Math.sin(2 * Math.PI * ph) * Math.exp(-t / (big ? 0.045 : 0.025));
    if (i >= up) {
      release.process(noise, 4200, 1.5);
      v += 0.35 * release.bp * Math.exp(-(i - up) / sr / 0.0015);
    }
    if (j >= 0) out[j] += level * v;
  }
}

const ROWS = ['`1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'];
const OFFSET = [0, 1.5, 1.75, 2.25];

/** Stereo position of a key as heard from the typist's seat: −0.6 (left) … 0.6 (right); Space in the middle, Enter at 0.62. */
export function keyPan(ch) {
  if (ch === ' ') return 0;
  if (ch === '\n') return 0.62;
  const c = ch.toLowerCase();
  for (let row = 0; row < ROWS.length; row++) {
    const i = ROWS[row].indexOf(c);
    if (i >= 0) return Math.max(-0.6, Math.min(0.6, ((OFFSET[row] + i) / 13 - 0.5) * 1.2));
  }
  return 0;
}
