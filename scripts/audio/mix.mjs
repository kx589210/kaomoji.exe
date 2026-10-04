// Stereo helpers: constant-power pan and adding mono voices into buses.

/** Left and right gains for `pan` in −1 (left) … 1 (right); l² + r² = 1. */
export const panGains = (pan) => {
  const a = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
};

/** A silent stereo bus of `n` samples. */
export const stereo = (n) => ({ L: new Float32Array(n), R: new Float32Array(n) });

/** Adds mono `src` into the stereo bus `dst` from sample `at`, panned and scaled. */
export function addMono(dst, src, { gain = 1, pan = 0, at = 0 } = {}) {
  const [l, r] = panGains(pan);
  for (let i = 0; i < src.length; i++) {
    const j = at + i;
    if (j < 0 || j >= dst.L.length) continue;
    dst.L[j] += src[i] * gain * l;
    dst.R[j] += src[i] * gain * r;
  }
}

/** Gain curve of a bus ducked by the kick: down to 1 − depth over `attackMs` after each onset (samples), then back with `releaseMs`. */
export function duck(n, onsets, sr, { depth = 0.7, attackMs = 3, releaseMs = 140 } = {}) {
  const g = new Float32Array(n).fill(1);
  const att = Math.max(1, Math.round((attackMs / 1000) * sr));
  const rel = (releaseMs / 1000) * sr;
  for (const o of onsets) {
    for (let i = Math.max(0, o); i < n; i++) {
      const k = i - o;
      const d = k < att ? (depth * k) / att : depth * Math.exp(-(k - att) / rel);
      if (k >= att && d < 1e-4) break;
      g[i] = Math.min(g[i], 1 - d);
    }
  }
  return g;
}

/** Multiplies a stereo bus by a gain curve, in place. */
export function applyGain(bus, g) {
  for (let i = 0; i < g.length; i++) {
    bus.L[i] *= g[i];
    bus.R[i] *= g[i];
  }
}

/** Ping-pong delay, in place: the echoes alternate right, left, right… every `time` seconds, each `feedback` quieter, mixed in at `mix`. */
export function pingPong(bus, sr, { time = 0.3, feedback = 0.4, mix = 0.35 } = {}) {
  const d = Math.max(1, Math.round(time * sr));
  const n = bus.L.length;
  const wL = new Float32Array(n);
  const wR = new Float32Array(n);
  for (let i = d; i < n; i++) {
    wR[i] = 0.5 * (bus.L[i - d] + bus.R[i - d]) + feedback * wL[i - d];
    wL[i] = feedback * wR[i - d];
  }
  for (let i = 0; i < n; i++) {
    bus.L[i] += mix * wL[i];
    bus.R[i] += mix * wR[i];
  }
}

/** Silences samples [from, to) of L and R after a `rampMs` fade; what follows `to` is left alone (a drop starts there). In place. */
export function gate(L, R, from, to, sr, rampMs = 1.5) {
  const ramp = Math.max(1, Math.round((rampMs / 1000) * sr));
  for (let i = Math.max(0, from - ramp); i < Math.min(L.length, to); i++) {
    const g = i < from ? (from - i) / ramp : 0;
    L[i] *= g;
    R[i] *= g;
  }
}

/** Cuts a voice at sample `end` of its buffer (a fade of `rampMs` before it, silence after), in place; `end` may lie outside the buffer. */
export function truncate(buf, end, sr, rampMs = 1.5) {
  const ramp = Math.max(1, Math.round((rampMs / 1000) * sr));
  for (let i = Math.max(0, end - ramp); i < buf.length; i++) buf[i] *= i < end ? (end - i) / ramp : 0;
}
