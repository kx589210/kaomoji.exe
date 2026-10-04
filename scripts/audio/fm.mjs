// Two-operator FM bell: an inharmonic modulator (ratio 3.5) whose index decays
// faster than the tone, so the strike is bright and the tail pure.

/** Adds a bell of pitch `freq` into mono `out` from sample `at`. */
export function fmBell(out, at, sr, { freq, gain = 0.2, decay = 1.2, ratio = 3.5, index = 2.5, attackMs = 1.5 }) {
  const n = Math.round(decay * 5 * sr);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < n; i++) {
    const j = at + i;
    if (j >= out.length) break;
    const t = i / sr;
    const env = Math.min(1, t / (attackMs / 1000)) * Math.exp(-t / decay);
    const idx = index * Math.exp(-t / (decay * 0.35));
    pc += freq / sr;
    pm += (freq * ratio) / sr;
    if (j >= 0) out[j] += gain * env * Math.sin(2 * Math.PI * pc + idx * Math.sin(2 * Math.PI * pm));
  }
}
