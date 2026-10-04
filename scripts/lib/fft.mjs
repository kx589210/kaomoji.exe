// In-place iterative radix-2 FFT, plus FFT cross-correlation for sync checks.
export function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/** Lag (in samples, within ±maxLag) at which `b` best matches `a`; positive if `b` is late. */
export function xcorrLag(a, b, maxLag) {
  let n = 1;
  while (n < a.length + b.length) n <<= 1;
  const ar = new Float64Array(n);
  const ai = new Float64Array(n);
  const br = new Float64Array(n);
  const bi = new Float64Array(n);
  ar.set(a);
  br.set(b);
  fft(ar, ai);
  fft(br, bi);
  for (let k = 0; k < n; k++) {
    const r = br[k] * ar[k] + bi[k] * ai[k];
    const i = bi[k] * ar[k] - br[k] * ai[k];
    br[k] = r;
    bi[k] = i;
  }
  fft(br, bi, true);
  let best = 0;
  let bestV = -Infinity;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const v = br[(lag + n) % n];
    if (v > bestV) {
      bestV = v;
      best = lag;
    }
  }
  return best;
}
