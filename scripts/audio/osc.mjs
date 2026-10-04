// Oscillators with PolyBLEP anti-aliasing for the saw and pulse edges.
const blep = (t, dt) => {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
};

export class Osc {
  constructor(sampleRate, phase = 0) {
    this.sr = sampleRate;
    this.phase = phase;
  }
  step(dt) {
    this.phase += dt;
    if (this.phase >= 1) this.phase -= Math.floor(this.phase);
  }
  saw(freq) {
    const dt = freq / this.sr;
    const t = this.phase;
    this.step(dt);
    return 2 * t - 1 - blep(t, dt);
  }
  pulse(freq, pw = 0.5) {
    const dt = freq / this.sr;
    const t = this.phase;
    this.step(dt);
    return (t < pw ? 1 : -1) + blep(t, dt) - blep((t - pw + 1) % 1, dt);
  }
  sine(freq) {
    const t = this.phase;
    this.step(freq / this.sr);
    return Math.sin(2 * Math.PI * t);
  }
  tri(freq) {
    const t = this.phase;
    this.step(freq / this.sr);
    return 1 - 4 * Math.abs(t - 0.5);
  }
}
