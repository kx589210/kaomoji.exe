/** Zero-delay-feedback state variable filter (Zavalishin). After process(): .lp, .bp, .hp. */
export class SVF {
  constructor(sampleRate) {
    this.sr = sampleRate;
    this.ic1 = 0;
    this.ic2 = 0;
    this.lp = 0;
    this.bp = 0;
    this.hp = 0;
  }
  process(x, cutoff, q = Math.SQRT1_2) {
    const g = Math.tan((Math.PI * Math.min(cutoff, this.sr * 0.49)) / this.sr);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.ic2;
    const v1 = a1 * this.ic1 + a2 * v3;
    const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2;
    this.bp = v1;
    this.hp = x - k * v1 - v2;
  }
}

/** RBJ-cookbook biquad, direct form I. */
export class Biquad {
  constructor(b0, b1, b2, a1, a2) {
    Object.assign(this, { b0, b1, b2, a1, a2, x1: 0, x2: 0, y1: 0, y2: 0 });
  }
  static make(type, sr, f, q, gainDb = 0) {
    const w = (2 * Math.PI * f) / sr;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const A = 10 ** (gainDb / 40);
    let c;
    if (type === 'lowpass') c = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
    else if (type === 'highpass') c = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
    else if (type === 'peak') c = [1 + alpha * A, -2 * cos, 1 - alpha * A, 1 + alpha / A, -2 * cos, 1 - alpha / A];
    else if (type === 'highShelf') {
      const s = 2 * Math.sqrt(A) * alpha;
      c = [A * (A + 1 + (A - 1) * cos + s), -2 * A * (A - 1 + (A + 1) * cos), A * (A + 1 + (A - 1) * cos - s), A + 1 - (A - 1) * cos + s, 2 * (A - 1 - (A + 1) * cos), A + 1 - (A - 1) * cos - s];
    } else throw new Error(`unknown biquad ${type}`);
    const [b0, b1, b2, a0, a1, a2] = c;
    return new Biquad(b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
  }
  static lowpass(sr, f, q = Math.SQRT1_2) {
    return Biquad.make('lowpass', sr, f, q);
  }
  static highpass(sr, f, q = Math.SQRT1_2) {
    return Biquad.make('highpass', sr, f, q);
  }
  static peak(sr, f, q, gainDb) {
    return Biquad.make('peak', sr, f, q, gainDb);
  }
  static highShelf(sr, f, q, gainDb) {
    return Biquad.make('highShelf', sr, f, q, gainDb);
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}
