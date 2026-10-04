// Loudness of the soundtrack per part (or section) and per bar: ITU-R BS.1770-4 / EBU R128 loudness and a 16× oversampled true peak.
//   LUFS-I   integrated loudness of the range: 400 ms blocks at 100 ms steps, gated at −70 LUFS and then 10 LU under the
//            mean (a range shorter than one block is measured ungated);
//   M max    the loudest 400 ms window (momentary) in the range, S max the loudest 3 s window (short-term), at 10 ms steps;
//   TP       true peak in dBTP: each channel rebuilt at 16 points a sample with a Kaiser-windowed sinc (--taps 128 taps a phase,
//            β 10, to Nyquist), the largest magnitude; SP the sample peak in dBFS; clipped = samples at 16-bit full scale.
// The ranges come from the film map: the parts of src/score/film.ts (--by parts, the default) when it exists, else the
// sections of src/score/shots.ts (SECTIONS); --by sections uses SECTIONS. Fails (exit code 1) when a range's true peak is over
// --max-tp (−1.0 dBTP), its loudness over --max-lufs (−8 LUFS) or under --min-lufs (off), a sample is clipped (--max-clipped 0),
// or a --louder A,B[,LU] rule is broken (range A at least LU, default 0, louder than range B; repeatable).
//   node scripts/check-loudness.mjs                                  # public/audio/bgm.wav, per part
//   node scripts/check-loudness.mjs output/kaomoji-full-v04-1080p.mp4 --bars   # the AAC of a cut, and every bar
//   node scripts/check-loudness.mjs public/audio/sections/break.wav --start break
//   node scripts/check-loudness.mjs --by sections --louder drop2,drop1,1 --json out.json
import path from 'node:path';
import { parseArgs } from 'node:util';
import { cliArgs, filmMap, isMain, num, readSoundtrack, resolveInput, table, writeJson } from './lib/review.mjs';

/** BS.1770 K-weighting at sample rate `sr`: the high shelf, then the high pass, each as [b0, b1, b2, a1, a2] (a0 = 1). */
export function kWeightCoefficients(sr) {
  // The analog prototypes of BS.1770's 48 kHz filters (as in libebur128), bilinear-transformed for `sr`.
  let K = Math.tan((Math.PI * 1681.974450955533) / sr);
  const Vh = 10 ** (3.999843853973347 / 20);
  const Vb = Vh ** 0.4996667741545416;
  let Q = 0.7071752369554196;
  let a0 = 1 + K / Q + K * K;
  const shelf = [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  K = Math.tan((Math.PI * 38.13547087602444) / sr);
  Q = 0.5003270373238773;
  a0 = 1 + K / Q + K * K;
  const highpass = [1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  return [shelf, highpass];
}

/** `x` through the K-weighting filter. */
export function kWeighted(x, sr) {
  let y = Float64Array.from(x);
  for (const [b0, b1, b2, a1, a2] of kWeightCoefficients(sr)) {
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < y.length; i++) {
      const v = y[i];
      const o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = v;
      y2 = y1;
      y1 = o;
      y[i] = o;
    }
  }
  return y;
}

/** Running sum of the K-weighted power of all channels (each weighted 1, as L and R are in BS.1770): p[i] = Σ_{j<i} Σ_c y_c[j]². */
export function powerPrefix(channels, sr) {
  const ys = channels.map((c) => kWeighted(c, sr));
  const n = ys[0].length;
  const p = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const y of ys) s += y[i] * y[i];
    p[i + 1] = p[i] + s;
  }
  return p;
}

const lufsOf = (meanPower) => (meanPower > 0 ? -0.691 + 10 * Math.log10(meanPower) : -Infinity);

/** Gated integrated loudness (LUFS) of samples [a, b) from a power prefix. */
export function integrated(p, a, b, sr) {
  const block = Math.round(0.4 * sr);
  const hop = Math.round(0.1 * sr);
  if (b - a < block) return lufsOf((p[b] - p[a]) / Math.max(1, b - a));
  const z = [];
  for (let s = a; s + block <= b; s += hop) z.push((p[s + block] - p[s]) / block);
  const abs = z.filter((m) => lufsOf(m) > -70);
  if (!abs.length) return -Infinity;
  const rel = lufsOf(abs.reduce((s, m) => s + m, 0) / abs.length) - 10;
  const kept = abs.filter((m) => lufsOf(m) > rel);
  return lufsOf(kept.reduce((s, m) => s + m, 0) / kept.length);
}

/** The loudest window of `seconds` (LUFS, ungated) inside samples [a, b), at 10 ms steps; −∞ when the range is shorter. */
export function loudestWindow(p, a, b, sr, seconds) {
  const w = Math.round(seconds * sr);
  const step = Math.round(0.01 * sr);
  let best = -Infinity;
  for (let s = a; s + w <= b; s += step) best = Math.max(best, lufsOf((p[s + w] - p[s]) / w));
  return best;
}

const bessel0 = (x) => {
  let s = 1;
  let t = 1;
  for (let k = 1; k < 80; k++) {
    t *= (x / (2 * k)) ** 2;
    s += t;
  }
  return s;
};

/**
 * True-peak envelope of one channel: e[n] = the largest magnitude of the signal rebuilt at n, n + 1/P … n + (P − 1)/P (P =
 * `oversample`), with a Kaiser-windowed sinc of `taps` taps a phase (β `beta`, to Nyquist).
 */
export function truePeakEnvelope(x, { oversample = 16, taps = 128, beta = 10 } = {}) {
  const half = taps / 2 - 1;
  const phases = [];
  for (let q = 1; q < oversample; q++) {
    phases.push(
      Float64Array.from({ length: taps }, (_, k) => {
        const u = q / oversample - (k - half);
        return (Math.sin(Math.PI * u) / (Math.PI * u)) * (bessel0(beta * Math.sqrt(Math.max(0, 1 - (u / (taps / 2)) ** 2))) / bessel0(beta));
      }),
    );
  }
  const n = x.length;
  const pad = new Float64Array(n + taps + 1);
  for (let i = 0; i < n; i++) pad[i + half] = x[i];
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = Math.abs(x[i]);
    for (const h of phases) {
      let y = 0;
      for (let k = 0; k < taps; k++) y += h[k] * pad[i + k];
      if (y < 0) y = -y;
      if (y > m) m = y;
    }
    e[i] = m;
  }
  return e;
}

const db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);

/** Every measure of samples [a, b): { lufs, mMax, sMax, tp (dBTP), sp (dBFS), clipped }. */
export function measure({ p, env, channels, sr }, a, b) {
  let tp = 0;
  let sp = 0;
  let clipped = 0;
  for (let i = a; i < b; i++) {
    let full = false;
    for (let c = 0; c < channels.length; c++) {
      const v = Math.abs(channels[c][i]);
      if (v > sp) sp = v;
      if (env[c][i] > tp) tp = env[c][i];
      if (v >= 1) full = true;
    }
    if (full) clipped++;
  }
  return { lufs: integrated(p, a, b, sr), mMax: loudestWindow(p, a, b, sr, 0.4), sMax: loudestWindow(p, a, b, sr, 3), tp: db(tp), sp: db(sp), clipped };
}

async function main() {
  const { values, positionals } = parseArgs({
    args: cliArgs(),
    allowPositionals: true,
    options: {
      start: { type: 'string', default: '0' },
      by: { type: 'string', default: 'parts' },
      bars: { type: 'boolean', default: false },
      taps: { type: 'string', default: '128' },
      'max-tp': { type: 'string', default: '-1' },
      'max-lufs': { type: 'string', default: '-8' },
      'min-lufs': { type: 'string' },
      'max-clipped': { type: 'string', default: '0' },
      louder: { type: 'string', multiple: true },
      json: { type: 'string' },
    },
  });
  if (positionals.length > 1) throw new Error('usage: check-loudness.mjs [FILE.wav|FILE.mp4] [--start FRAME|PART] [--by parts|sections] [--bars] [--taps 128] [--max-tp -1] [--max-lufs -8] [--min-lufs L] [--max-clipped 0] [--louder A,B[,LU]]… [--json FILE]');
  const file = resolveInput(positionals[0] ?? 'public/audio/bgm.wav');
  const map = await filmMap();
  const { sampleRate: sr, channels } = readSoundtrack(file);
  const n = channels[0].length;
  const start = map.start(values.start);
  const perFrame = sr / map.FPS;
  /** Film frame → sample index of this soundtrack (clamped to it). */
  const at = (frame) => Math.min(n, Math.max(0, Math.round((frame - start) * perFrame)));
  const clip = { from: start, to: start + n / perFrame };
  const taps = Number(values.taps);
  const t0 = Date.now();
  const ctx = { p: powerPrefix(channels, sr), env: channels.map((c) => truePeakEnvelope(c, { taps })), channels, sr };
  const ms = Date.now() - t0;

  const maxTp = Number(values['max-tp']);
  const maxLufs = Number(values['max-lufs']);
  const minLufs = values['min-lufs'] === undefined ? -Infinity : Number(values['min-lufs']);
  const maxClipped = Number(values['max-clipped']);
  const failures = [];
  const judge = (id, r) => {
    const bad = [];
    if (r.tp > maxTp) bad.push(`true peak ${num(r.tp)} dBTP > ${num(maxTp, 1)}`);
    if (r.lufs > maxLufs) bad.push(`${num(r.lufs)} LUFS > ${num(maxLufs, 1)}`);
    if (r.lufs < minLufs) bad.push(`${num(r.lufs)} LUFS < ${num(minLufs, 1)}`);
    if (r.clipped > maxClipped) bad.push(`${r.clipped} clipped samples`);
    for (const b of bad) failures.push(`${id}: ${b}`);
    return bad.length === 0;
  };

  const groups = map.groups(clip.from, Math.ceil(clip.to), values.by);
  const rows = [];
  const results = [];
  for (const g of [...groups, { id: 'whole file', from: clip.from, to: clip.to, all: true }]) {
    const a = g.all ? 0 : at(g.from);
    const b = g.all ? n : at(g.to);
    if (b <= a) continue;
    const r = measure(ctx, a, b);
    const ok = judge(g.id, r);
    results.push({ id: g.id, from: g.from, to: g.to, ...r, ok });
    rows.push([g.all ? `= ${g.id}` : g.id, g.all ? `${(n / sr).toFixed(2)} s` : `${g.from}–${Math.ceil(g.to) - 1}`, num(r.lufs, 1), num(r.mMax, 1), num(r.sMax, 1), num(r.tp), num(r.sp), r.clipped, ok ? 'ok' : 'FAIL']);
  }
  const lufsOfRange = (id) => {
    const r = map.range(id);
    return integrated(ctx.p, at(r.from), at(r.to), sr);
  };
  for (const rule of values.louder ?? []) {
    const [a, b, lu = '0'] = rule.split(',');
    const la = lufsOfRange(a);
    const lb = lufsOfRange(b);
    const ok = la >= lb + Number(lu);
    const line = `${a} ${num(la, 1)} LUFS vs ${b} ${num(lb, 1)} LUFS: ${num(la - lb, 1)} LU (≥ ${lu})`;
    results.push({ rule, a, b, lu: Number(lu), la, lb, ok });
    if (!ok) failures.push(`louder: ${line}`);
    else rows.push([`louder ${a} > ${b}`, '', '', '', '', '', '', '', `ok (${num(la - lb, 1)} LU)`]);
  }

  console.log(`${path.basename(file)}: ${sr} Hz, ${channels.length} ch, ${(n / sr).toFixed(2)} s from film frame ${start}; BS.1770 loudness; true peak ${16}× oversampled (${taps} taps a phase, ${(ms / 1000).toFixed(1)} s); ranges by ${values.by} (${map.source})`);
  console.log('\n' + table(['range', 'frames', 'LUFS-I', 'M max', 'S max', 'TP dBTP', 'SP dBFS', 'clipped', ''], rows));

  const bars = [];
  if (values.bars) {
    const bRows = [];
    for (let bar = Math.floor(clip.from / map.FPB) + 1; (bar - 1) * map.FPB < clip.to; bar++) {
      const from = (bar - 1) * map.FPB;
      const a = at(from);
      const b = at(from + map.FPB);
      if (b <= a) continue;
      const r = measure(ctx, a, b);
      bars.push({ bar, from, ...r });
      const level = Number.isFinite(r.lufs) ? Math.max(0, Math.round(r.lufs + 30)) : 0;
      bRows.push([map.label(from), num(r.lufs, 1), num(r.mMax, 1), num(r.tp), r.clipped || '', `${'#'.repeat(level)}`]);
    }
    console.log(`\nper bar (the arc: one # per LU over −30 LUFS):\n${table(['bar  part bar.beat', 'LUFS-I', 'M max', 'TP dBTP', 'clipped', 'LUFS-I'], bRows)}`);
  }
  writeJson(values.json, { file, sampleRate: sr, seconds: n / sr, start, by: values.by, options: { taps, oversample: 16, maxTp, maxLufs, minLufs: Number.isFinite(minLufs) ? minLufs : null, maxClipped }, ranges: results, bars, failures });
  if (failures.length) {
    console.error(`\nloudness check FAILED\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`\nloudness check OK (true peak ≤ ${num(maxTp, 1)} dBTP, ≤ ${num(maxLufs, 1)} LUFS in every range)`);
}

if (isMain(import.meta.url)) await main();
