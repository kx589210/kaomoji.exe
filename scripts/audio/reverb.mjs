// Dattorro's plate reverb (J. Dattorro, "Effect Design, Part 1", JAES 1997):
// predelay, an input bandwidth filter, four input diffusers, then a
// figure-eight tank of two modulated branches with damping. Delay lengths are
// the paper's (at 29761 Hz) scaled to the working rate. Output taps are the
// paper's; the left tap at 1913 reaches past its 1800-sample allpass, so every
// line keeps enough history for its taps. Deterministic: the modulation is a
// fixed sine.
const BASE = 29761;

class Line {
  constructor(len) {
    this.buf = new Float32Array(len);
    this.len = len;
    this.pos = 0;
  }
  /** x[n − d] (d may be fractional), x[n] being the latest push. */
  tap(d) {
    const i = Math.floor(d);
    const f = d - i;
    let a = this.pos - 1 - i;
    if (a < 0) a += this.len;
    let b = a - 1;
    if (b < 0) b += this.len;
    return this.buf[a] * (1 - f) + this.buf[b] * f;
  }
  push(x) {
    this.buf[this.pos] = x;
    this.pos = this.pos + 1 === this.len ? 0 : this.pos + 1;
  }
}

/** Schroeder allpass of delay `d` and coefficient `g` whose internal signal lives in `line`. */
function allpass(line, d, g, x) {
  const delayed = line.tap(d - 1);
  const v = x - g * delayed;
  line.push(v);
  return delayed + g * v;
}

/**
 * Wet plate output for the mono sum of `inL` and `inR`. `clock(i)` (optional): the tank's modulation time at sample i, in samples (i
 * itself when left out); bgm.mjs stops it through a stub bridge, so what follows hears the chorus where it heard it before (v08).
 */
export function plate(inL, inR, sr, { predelayMs = 20, decay = 0.6, damping = 0.35, bandwidth = 0.9995, modDepth = 16, modHz = 1, clock = null } = {}) {
  const k = sr / BASE;
  const S = (n) => Math.max(1, Math.round(n * k));
  const T = (n) => Math.round(n * k);
  const exc = modDepth * k;
  const line = (...lengths) => new Line(Math.ceil(Math.max(...lengths)) + 2);
  const pre = Math.round((predelayMs / 1000) * sr);
  const preLine = line(pre, 1);
  const ID = [S(142), S(107), S(379), S(277)];
  const inLines = ID.map((d) => line(d));
  const A = { ap1: S(672), del1: S(4453), ap2: S(1800), del2: S(3720) };
  const B = { ap1: S(908), del1: S(4217), ap2: S(2656), del2: S(3163) };
  const la = { ap1: line(A.ap1 + exc), del1: line(A.del1, T(2974), T(2111)), ap2: line(A.ap2, T(1913), T(335)), del2: line(A.del2, T(1996), T(121)) };
  const lb = { ap1: line(B.ap1 + exc), del1: line(B.del1, T(3627), T(1990)), ap2: line(B.ap2, T(1228), T(187)), del2: line(B.del2, T(2673), T(1066)) };
  const n = inL.length;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  let bw = 0;
  let dampA = 0;
  let dampB = 0;
  for (let i = 0; i < n; i++) {
    const x = 0.5 * (inL[i] + inR[i]);
    const p = pre > 0 ? preLine.tap(pre - 1) : x;
    preLine.push(x);
    bw += bandwidth * (p - bw);
    let v = allpass(inLines[0], ID[0], 0.75, bw);
    v = allpass(inLines[1], ID[1], 0.75, v);
    v = allpass(inLines[2], ID[2], 0.625, v);
    v = allpass(inLines[3], ID[3], 0.625, v);
    const phase = (2 * Math.PI * modHz * (clock ? clock(i) : i)) / sr;
    const outA = la.del2.tap(A.del2 - 1);
    const outB = lb.del2.tap(B.del2 - 1);
    const a = allpass(la.ap1, A.ap1 + exc * Math.sin(phase), -0.7, v + decay * outB);
    const a1 = la.del1.tap(A.del1 - 1);
    la.del1.push(a);
    dampA += (1 - damping) * (a1 - dampA);
    la.del2.push(allpass(la.ap2, A.ap2, 0.5, decay * dampA));
    const b = allpass(lb.ap1, B.ap1 + exc * Math.cos(phase), -0.7, v + decay * outA);
    const b1 = lb.del1.tap(B.del1 - 1);
    lb.del1.push(b);
    dampB += (1 - damping) * (b1 - dampB);
    lb.del2.push(allpass(lb.ap2, B.ap2, 0.5, decay * dampB));
    L[i] = 0.6 * (la.del1.tap(T(266)) + la.del1.tap(T(2974)) - la.ap2.tap(T(1913)) + la.del2.tap(T(1996)) - lb.del1.tap(T(1990)) - lb.ap2.tap(T(187)) - lb.del2.tap(T(1066)));
    R[i] = 0.6 * (lb.del1.tap(T(353)) + lb.del1.tap(T(3627)) - lb.ap2.tap(T(1228)) + lb.del2.tap(T(2673)) - la.del1.tap(T(2111)) - la.ap2.tap(T(335)) - la.del2.tap(T(121)));
  }
  return { L, R };
}
