// The ending's sound, the part 'outro' (scripts/audio/sections/outro.mjs, scripts/audio/outroVoices.mjs; build sheet
// notes/b58/ending-sheet.md §8, music bible prep/music.md §4.8): IV under the blue screen with the heartbeat's lub-dub, the
// Defender's dry C, the ✓ in the lub's slot and the dub that never comes, the squeeze to a flatline, one beep shaped like his ω, the
// knocks on C♯2, the film's first tonic on outro 3.1, the wink, ↑ ↑, the reboot chime; outro 4 (r4, U5): the encore's
// whole bar in the hook's own rhythm, its drums the roll call's clock (a call on every hit), the walk-ons; outro 5 (U5 / U6): the
// bows, the plink, the button on his bow (the I chord struck once more), the band's stop, the chord ringing out under the dive with
// the tube's power-down, and S01's two cursor ticks into frame 0. Every frame comes from src/score/outro.ts (63-bar map since v08's bridges).
//
// scripts/audio/outroAsBuilt.mjs is imported first, as it was while FILM held the outro's `built`: the ending is built through on
// disk now (r4), so it does nothing (`patched` is false) and the tests hear the film's own map.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { patched } from '../scripts/audio/outroAsBuilt.mjs';

const { mixdown } = await import('../scripts/audio/bgm.mjs');
const { blip } = await import('../scripts/audio/drums.mjs');
const { Biquad } = await import('../scripts/audio/filters.mjs');
const { powerOn } = await import('../scripts/audio/fx.mjs');
const { stereo } = await import('../scripts/audio/mix.mjs');
const { MASTER_TRIM_DB, CEILING_DB } = await import('../scripts/audio/limiter.mjs');
const { integratedLoudness, lowCorrelation, truePeakDb } = await import('../scripts/audio/meter.mjs');
const { loudestWindow, powerPrefix } = await import('../scripts/check-loudness.mjs');
const V = await import('../scripts/audio/outroVoices.mjs');
const { renderIntro } = await import('../scripts/audio/sections/intro.mjs');
const { thirdBelow } = await import('../scripts/audio/sections/drop2.mjs');
const S = await import('../scripts/audio/sections/outro.mjs');
const { HOOK2 } = await import('../src/score/drop2.ts');
const { partStart, partTail } = await import('../src/score/film.ts');
const { CURSOR_BLINKS } = await import('../src/score/intro.ts');
const O = await import('../src/score/outro.ts');
const { EXIT_TYPED } = await import('../src/content/outro.ts');

const SR = 48000;
const at = (frame) => Math.round((frame / 60) * SR);
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

/** Strongest frequency of `x` over samples [a, b) among lo, lo + step, … hi (Goertzel on a Hann window). */
function peakHz(x, a, b, lo, hi, step) {
  let best = 0;
  let bestHz = 0;
  for (let hz = lo; hz <= hi; hz += step) {
    const w = (2 * Math.PI * hz) / SR;
    let re = 0;
    let im = 0;
    for (let i = a; i < b; i++) {
      const v = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * (i - a)) / (b - a)));
      re += v * Math.cos(w * i);
      im -= v * Math.sin(w * i);
    }
    const p = re * re + im * im;
    if (p > best) [best, bestHz] = [p, hz];
  }
  return bestHz;
}
const rms = (x, a, b) => Math.sqrt(x.subarray(a, b).reduce((s, v) => s + v * v, 0) / Math.max(1, b - a));
const peak = (x, a, b) => x.subarray(a, b).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const near = (got, want, tol) => Math.abs(got - want) <= tol * want;
/** `x` through `n` 2-pole filters of `kind` at `hz`. */
const filt = (x, kind, hz, n = 2) => {
  const fs = Array.from({ length: n }, () => Biquad[kind](SR, hz));
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};
const db = (x) => 20 * Math.log10(x);

// ——— The voices ————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('heartThump: a sub thump on its pitch (B1 for the lub), its peak exactly its gain (−18 dBFS for the lub), dying within 6 τ', () => {
  const x = new Float32Array(SR);
  V.heartThump(x, 0, SR, { freq: 61.7, gain: 0.126, decayMs: 70 });
  assert.ok(Math.abs(peak(x, 0, SR) - 0.126) < 1e-6, `peak ${peak(x, 0, SR)}`);
  assert.ok(near(peakHz(x, at(1.5), at(9), 40, 100, 0.5), 61.7, 0.03), 'on B1 once its strike has fallen');
  assert.ok(rms(x, at(12), at(18)) < 0.15 * rms(x, 0, at(6)), 'it dies away');
  assert.equal(peak(x, Math.round(0.42 * SR) + 1, SR), 0, 'and is gone after 6 τ');
});

test('monitorTone: a steady sine on its note, a 10 ms ramp at each end, nothing outside it', () => {
  const len = at(24);
  const x = new Float32Array(len + SR / 10);
  V.monitorTone(x, 100, len, SR, { freq: 1108.73, gain: 0.025 });
  assert.equal(peak(x, 0, 100), 0);
  assert.ok(peak(x, 100, 100 + 48) < 0.003, 'it starts from silence (no click)');
  assert.ok(near(peakHz(x, 100 + at(3), 100 + at(20), 1000, 1200, 1), 1108.73, 0.002));
  assert.ok(Math.abs(peak(x, 100 + at(3), 100 + at(20)) - 0.025) < 1e-3, 'steady at its gain');
  assert.ok(peak(x, 100 + len - 48, 100 + len) < 0.003 && peak(x, 100 + len, x.length) === 0, 'and ends without a click');
});

test('hum: a closed-mouth hum on its pitch, only inside its syllables, dark (most of it under 1 kHz), its peak at its gain', () => {
  const x = new Float32Array(SR);
  V.hum(x, 0, SR, { note: (t) => (t < 0.15 ? 54 : 49), syllables: [[0, 0.1], [0.15, 0.3]], gain: 0.05 });
  assert.ok(Math.abs(peak(x, 0, SR) - 0.05) < 1e-6);
  assert.ok(near(peakHz(x, at(1), at(5.5), 120, 220, 1), midiHz(54), 0.03), 'F♯3 first');
  assert.ok(near(peakHz(x, at(10), at(17), 110, 220, 1), midiHz(49), 0.03), 'then C♯3');
  assert.ok(rms(x, Math.round(0.135 * SR), Math.round(0.15 * SR)) < 0.15 * rms(x, at(1), at(5)), 'a gap between the two');
  const hi = filt(x, 'highpass', 1000, 2);
  assert.ok(rms(hi, 0, SR) < 0.3 * rms(x, 0, SR), 'closed-mouth: little above 1 kHz');
});

test('boing, twinkle, bloop, relay: a spring on its note, a sparkle round 8 kHz, a pop that dips and comes back, a dry clack and thud', () => {
  const b = new Float32Array(SR);
  V.boing(b, 0, SR, { freq: midiHz(61), gain: 0.04 });
  assert.ok(near(peakHz(b, at(6), at(14), 230, 330, 1), midiHz(61), 0.02), 'the boing settles on its note');
  assert.ok(peak(b, 0, SR) <= 0.04 + 1e-9 && rms(b, at(14), at(16)) < 0.4 * rms(b, 0, at(3)));
  const t = new Float32Array(SR);
  V.twinkle(t, 0, SR, { freqs: [5919.9, 7458.6, 8869.8], gain: 0.02 });
  assert.ok(peak(t, 0, SR) <= 0.02 + 1e-9);
  // Its partials F♯8 A♯8 C♯9 (5.9–8.9 kHz): next to nothing below 3 kHz or above 13 kHz (the filters' skirts allowed for).
  const share = (y) => (rms(y, 0, at(9)) / rms(t, 0, at(9))) ** 2;
  assert.ok(share(filt(t, 'lowpass', 3000, 4)) < 0.02, 'nothing low');
  assert.ok(share(filt(t, 'highpass', 13000, 4)) < 0.02, 'nothing above the sparkle');
  const p = new Float32Array(SR);
  V.bloop(p, 0, SR, { freq: midiHz(78), gain: 0.05, dip: 5 });
  const f0 = peakHz(p, Math.round(0.042 * SR), Math.round(0.12 * SR), 600, 900, 1);
  assert.ok(near(f0, midiHz(78), 0.02), `back on F♯5 after its dip (${f0} Hz)`);
  assert.ok(peakHz(p, Math.round(0.012 * SR), Math.round(0.028 * SR), 400, 900, 2) < 0.85 * midiHz(78), 'dipped in between');
  const r = new Float32Array(SR);
  V.relay(r, 0, SR, { gain: 0.15 });
  assert.ok(rms(filt(r, 'lowpass', 150, 2), 0, at(3)) > 0.01, 'a low thud');
  assert.ok(peak(filt(r, 'highpass', 1000, 2), 0, 240) > 0.05, 'a clack on its first 5 ms');
  assert.equal(peak(r, Math.round(0.2 * SR), SR), 0, 'gone by 200 ms');
});

test('repitch: a buffer played lower is lower and longer by the same ratio', () => {
  const x = Float32Array.from({ length: SR / 10 }, (_, i) => Math.sin((2 * Math.PI * 1000 * i) / SR));
  const y = V.repitch(x, -12);
  assert.ok(Math.abs(y.length - 2 * x.length) <= 2);
  assert.ok(near(peakHz(y, 0, y.length, 300, 700, 1), 500, 0.005));
});

test('powerOff: the flyback whine falls as the raster collapses and nothing sounds after the line; its thump swells into it', () => {
  const len = at(6);
  const x = new Float32Array(len + SR / 4);
  V.powerOff(x, 0, len, SR);
  assert.ok(peakHz(x, 0, Math.round(len / 4), 3000, 9000, 50) > 6000, 'the whine starts high');
  assert.ok(peakHz(x, Math.round(0.85 * len), len, 600, 4000, 25) < 3000, 'and has fallen by the line');
  assert.equal(peak(x, len, x.length), 0, 'silent from the line on');
  const low = filt(x, 'lowpass', 150, 2);
  const q = Math.round(len / 5);
  assert.ok(rms(low, len - q, len) > 3 * rms(low, 0, q), 'the thump swells into the line');
});

test('lineWhine: a thin whine at the pitch it is told, sample by sample, gone by its end', () => {
  const len = at(6);
  const dip = new Float32Array(len + 1000);
  V.lineWhine(dip, 0, len, SR, { freq: (k) => (k < at(3) ? 11000 : 9000), decayMs: 1e9 });
  assert.ok(Math.abs(peakHz(dip, 0, at(2.5), 10000, 12000, 50) - 11000) <= 50);
  assert.ok(Math.abs(peakHz(dip, at(3.5), at(5.5), 8000, 12000, 50) - 9000) <= 50, 'down to 9 kHz with the dip');
  assert.ok(peak(dip, len, dip.length) < 1e-4, 'silent after its end');
  assert.ok(peak(dip, 0, len) < 0.05, 'thin: never a scream');
});

test('ting: a struck bright bar on its note, under 5 % of its energy below 2 kHz or above 8 kHz, its peak never past its gain', () => {
  const x = new Float32Array(SR);
  V.ting(x, 0, SR, { freq: 2960, gain: 0.2 });
  assert.ok(Math.abs(peakHz(x, 0, at(6), 2500, 3500, 10) - 2960) <= 10);
  const share = (y) => (rms(y, 0, at(12)) / rms(x, 0, at(12))) ** 2;
  assert.ok(share(filt(x, 'lowpass', 1600, 4)) < 0.05);
  assert.ok(share(filt(x, 'highpass', 9500, 4)) < 0.05);
  assert.ok(peak(x, 0, SR) <= 0.2);
});

test('ePiano: a note rings until the damper and stops; bend shifts its pitch; amp scales it', () => {
  const len = Math.round(0.3 * SR);
  const x = new Float32Array(SR);
  V.ePiano(x, [{ at: 0, len, freq: 440, gain: 0.1 }], SR);
  assert.ok(Math.abs(peakHz(x, 2400, 7200, 300, 600, 2) - 440) <= 2);
  assert.ok(peak(x, len + Math.round(0.07 * SR), x.length) < 1e-6, 'damped 60 ms after its end');
  const down = new Float32Array(SR);
  V.ePiano(down, [{ at: 0, len, freq: 440, gain: 0.1 }], SR, { bend: () => -12 });
  assert.ok(Math.abs(peakHz(down, 2400, 7200, 150, 300, 2) - 220) <= 2, 'an octave down');
});

test('choke: untouched before it, a raised cosine over its length (no click), exactly silent after it', () => {
  const n = at(20);
  const L = new Float32Array(n).fill(0.5);
  const R = new Float32Array(n).fill(-0.5);
  const len = at(3);
  V.choke(L, R, at(10), len);
  assert.equal(L[at(10) - 1], 0.5);
  assert.ok(Math.abs(L[at(10) + len / 2] - 0.25) < 1e-6);
  assert.ok(L.subarray(at(10) + len).every((v) => v === 0) && R.subarray(at(10) + len).every((v) => v === 0));
});

test('S01’s cursor tick is TICK (the intro’s fx bus on its first frame is the CRT powering on plus exactly this blip), and cursorTick is that tick as the mix renders it', () => {
  const s0 = at(partStart('intro'));
  const n = s0 + at(20);
  const stems = { keys: stereo(n), fx: stereo(n), music: stereo(n), chime: stereo(n), drums: stereo(n), bass: stereo(n), chords: stereo(n), vox: stereo(n), post: stereo(n), sub: new Float32Array(n) };
  renderIntro(stems, SR);
  const on = new Float32Array(n);
  powerOn(on, 0, SR, { gain: 0.32 });
  const tick = new Float32Array(n);
  blip(tick, 0, SR, V.TICK);
  let worst = 0;
  for (let i = 0; i < at(1); i++) worst = Math.max(worst, Math.abs(stems.fx.L[s0 + i] - Math.SQRT1_2 * (on[i] + tick[i])));
  assert.ok(worst < 1e-6, `the film's first frame is powerOn + TICK (off by ${worst})`);
  const m = Math.round(0.4 * SR);
  const fx = stereo(m);
  const dry = new Float32Array(m);
  blip(dry, 0, SR, V.TICK);
  for (let i = 0; i < m; i++) fx.L[i] = fx.R[i] = Math.SQRT1_2 * dry[i];
  const ref = mixdown({ fx, sub: new Float32Array(m) }, SR, { stutter: false, trim: false });
  const t = V.cursorTick(SR);
  worst = 0;
  for (let i = 0; i < m; i++) worst = Math.max(worst, Math.abs(t.L[i] - ref.L[i]), Math.abs(t.R[i] - ref.R[i]));
  assert.ok(worst < 1e-6, `cursorTick is the mix's tick (off by ${worst})`);
});

// ——— The ending, rendered alone into the film's buses, and mixed through the real chain ——————————————————————————————————————————

const N = at(O.LOOP);
const fresh = () => {
  const s = { keys: stereo(N), fx: stereo(N), music: stereo(N), chime: stereo(N), drums: stereo(N), bass: stereo(N), chords: stereo(N), vox: stereo(N), post: stereo(N), sub: new Float32Array(N) };
  for (const name of Object.keys(S.SENDS)) s[name] = stereo(N);
  return s;
};
// These tests hear A, the earlier ending (U5 / U6), asked for by name ({ style: 'A' }): since 2026-10-03 the film's is B
// (ENDING_STYLE), which differs only in the e-piano, the tonic's saws and the encore's stabs and is checked against A at the end of the file.
const alone = fresh();
const events = S.renderOutro(alone, SR, { style: 'A' });
const of = (kind) => events.filter((e) => e.kind === kind).map((e) => e.at);
const master = mixdown(alone, SR);
const mono = (m, a = 0, b = N) => Float32Array.from({ length: b - a }, (_, k) => 0.5 * (m.L[a + k] + m.R[a + k]));
/** The ending (A unless `o.style` says otherwise) rendered with only the voices of `kinds` (`solo`) or without them (`mute`), into fresh buses. */
const render = (o) => {
  const s = fresh();
  S.renderOutro(s, SR, { style: 'A', ...o });
  return s;
};
/** Every bus of `s` summed to mono (the sub included). */
const sumAll = (s) => {
  const x = new Float32Array(N);
  for (const b of Object.values(s)) {
    if (b.L) for (let i = 0; i < N; i++) x[i] += 0.5 * (b.L[i] + b.R[i]);
    else for (let i = 0; i < N; i++) x[i] += b[i];
  }
  return x;
};
const momentary = (m, frame) => integratedLoudness(m.L.slice(at(frame), at(frame + 24)), m.R.slice(at(frame), at(frame + 24)), SR);
const lufs = (m, a, b) => integratedLoudness(m.L.slice(at(a), at(b)), m.R.slice(at(a), at(b)), SR);

test('this process hears the ending built through (the outro has no held tail here), and the ending runs to the end of the film', () => {
  assert.equal(partTail('outro'), null, patched ? 'outroAsBuilt removed the outro’s built count' : 'FILM has no built count on the outro');
  assert.equal(O.OUTRO_END, O.LOOP);
});

test('every sound of the ending lands on its picture’s frame (sheet §8, from src/score/outro.ts)', () => {
  const span = (from, n, step = 1) => Array.from({ length: n }, (_, k) => from + k * step);
  const expect = {
    outrelay: [O.OUTRO_START],
    outheart: O.LUB,
    outdub: O.DUB,
    outuhoh: [O.OUTRO_START],
    outhum: [O.OUTRO_START],
    // WP6 (v07): drop 2's crown glass rings into the blue on the burst's 32nds, where v06 had the band's chatter.
    outcrown: span(O.OUTRO_START, S.SEAM_GLASS.notes.length, 3),
    outdump: [O.HEX],
    outflip: O.FLIPS,
    outthup: [O.GATHER.to],
    outprogress: O.PROGRESS,
    outstamp: [O.STAMP],
    outcode: O.CODE_ROWS,
    outswish: [O.SLOT.from],
    outzip: span(O.SMALL_PRINT, 13),
    outplip: [O.LINES[1]],
    outspill: [O.LINES[1]],
    outsmug: [O.LINES[1]],
    outpromise: [O.LINES[2]],
    outflick: [O.FLICK.from],
    outreticle: [O.RETICLE.from],
    outepiano: O.CHORDS_OUT.filter((c) => c.chord !== 'I').map((c) => c.at),
    outlock: O.LOCK_BEEPS,
    outlastheart: [O.LAST_BEAT],
    outkey: O.KEYS,
    outenter: [O.ENTER, O.RUN],
    outpoweroff: [O.ENTER],
    outpop: [O.LINE],
    outflat: [O.FLATLINE.from],
    outwhine: [O.WHINE.from],
    outpedal: [O.WHINE.from],
    outbeep: [O.BEEP],
    outboing: [O.BEEP],
    outswell: [O.BREATH.to],
    outcurl: [O.CURL.from],
    outtwitch: [O.TWITCH],
    outclose: [O.CLOSE.from],
    outtup: [O.CLOSE.to],
    outknock: O.KNOCKS,
    outcreak: [O.CREAK],
    outtonic: [O.OPEN, O.BURST, O.BOWS.hero],
    outkick: [O.OPEN, O.RUN, ...O.KICKS],
    outcrash: [O.OPEN, O.BURST, O.BOWS.cat, O.BOWS.hero],
    outpomp: [O.OPEN],
    outbell: O.BELLS,
    outreadout: [O.MONITOR_BACK],
    outw5: span(O.MONITOR_BACK, 4, 2),
    outwink: [O.WINK],
    outdefender: O.DEFENDER_BLIPS,
    outtwinkle: O.TWINKLES,
    outup: O.RECALL,
    outpickup: O.VOX_PICKUPS,
    outriser: [O.RISER.from],
    outbloop: O.COUNTER,
    outencore: O.ENCORE,
    outcall: O.CALLS,
    outflight: [O.BURST],
    outwall: span(O.WALL_PRINT.from, O.WALL_PRINT.to - O.WALL_PRINT.from),
    outhat: O.HATS,
    outaww: [O.BOW_WAVE.from],
    outpomf: [O.HOP.to],
    outstep: O.STEPS,
    outpatter: S.PATTER,
    outthud: [O.WALK_ON.to],
    outnya: [O.BOWS.cat],
    outclap: O.CLAPS,
    outclink: [O.BOWS.guest],
    outhmhm: [O.BOWS.guest],
    outplink: [O.DROP.to],
    outok: [O.DROP.to],
    outstop: [O.STOP.from],
    outtube: [O.POWER_DOWN.from],
    outtick: O.TICKS,
  };
  for (const [kind, frames] of Object.entries(expect)) assert.deepEqual(of(kind), frames.map(at), kind);
  const stray = [...new Set(events.map((e) => e.kind))].filter((k) => !(k in expect));
  assert.deepEqual(stray, [], 'every kind is listed above');
  assert.ok(events.every((e) => e.kind.startsWith('out')), 'every kind is the ending’s own');
});

test('the ending plays nothing before outro 1.1 and nothing past the film’s end, and renders the same every time', () => {
  const a = at(O.OUTRO_START);
  for (const [name, b] of Object.entries(alone)) for (const x of b.L ? [b.L, b.R] : [b]) assert.equal(peak(x, 0, a), 0, `${name} before outro 1.1`);
  const again = render({});
  for (const name of Object.keys(alone)) {
    const x = alone[name].L ?? alone[name];
    const y = again[name].L ?? again[name];
    assert.ok(x.every((v, i) => v === y[i]), `${name} renders the same twice`);
  }
});

test('the hooks: the reverb restarts on outro 1.1, the mix is gated over SETTLE only (U6: the tonic rings out before it), one dry bus of its own for the Defender', () => {
  assert.deepEqual(S.CUTS, [O.OUTRO_START]);
  assert.deepEqual(S.SILENCES, [{ from: O.SETTLE.from, to: O.LOOP }]);
  assert.deepEqual(Object.keys(S.SENDS), ['outdry']);
  assert.ok(S.SENDS.outdry <= 0.05, 'the Defender is dry (M8)');
  assert.deepEqual(S.PREVIEWS, []);
});

// ——— Bars 1–2: the heartbeat, the Defender, the squeeze, the monitor ————————————————————————————————————————————————————

test('the heartbeat: thumps on the lubs and dubs (B1), the ✓ in the lub’s slot on 2.1, the knocks on C♯2 — and nothing where the dub should be', () => {
  const s = render({ solo: ['outheart', 'outdub', 'outlastheart', 'outknock'] });
  const x = sumAll(s);
  const low = filt(x, 'lowpass', 250, 2);
  const onset = (f) => rms(low, at(f), at(f + 3));
  for (const f of [...O.LUB, ...O.DUB, O.LAST_BEAT, ...O.KNOCKS]) assert.ok(onset(f) > 0.02, `a thump on ${f} (${onset(f).toFixed(4)})`);
  assert.ok(onset(O.DUB_MISSING) < 0.3 * onset(O.LAST_BEAT), `no dub on ${O.DUB_MISSING}: only the ✓’s tail (${onset(O.DUB_MISSING).toFixed(4)})`);
  assert.deepEqual(events.filter((e) => e.at === at(O.DUB_MISSING)).map((e) => e.kind), ['outkey'], 'only the antivirus’s first key there');
  assert.ok(near(peakHz(low, at(O.LUB[0] + 1.5), at(O.LUB[0] + 5.5), 40, 100, 0.5), 61.7, 0.03), 'the lub is B1');
  assert.ok(near(peakHz(low, at(O.KNOCKS[0] + 1.5), at(O.KNOCKS[0] + 5.5), 40, 100, 0.5), midiHz(37), 0.03), 'the knocks are C♯2');
  assert.ok(Math.abs(db(peak(alone.sub, at(O.LUB[0]), at(O.LUB[0] + 6))) + 18) < 1.5, 'the lub peaks near −18 dBFS on the sub');
});

test('the Defender is dry, narrow and on C (M8): the reticle sweeps C5 → C6, the lock beeps C6, the wink’s blips C4 — all on its own dry bus', () => {
  const kinds = ['outreticle', 'outlock', 'outdefender'];
  const s = render({ solo: kinds });
  for (const [name, b] of Object.entries(s)) {
    if (name === 'outdry') continue;
    for (const x of b.L ? [b.L, b.R] : [b]) assert.equal(peak(x, 0, N), 0, `${name} carries none of the Defender`);
  }
  const x = mono(s.outdry);
  const r0 = at(O.RETICLE.from);
  assert.ok(near(peakHz(x, r0, r0 + at(1), 450, 650, 2), midiHz(72), 0.06), 'the sweep starts on C5');
  assert.ok(near(peakHz(x, r0 + at(9), r0 + at(12), 900, 1200, 2), midiHz(84), 0.01), 'and holds C6 for the 32nd before the lock');
  assert.ok(near(peakHz(x, at(O.LOCK_BEEPS[0]), at(O.LOCK_BEEPS[0]) + 1100, 900, 1200, 2), midiHz(84), 0.02), 'lock beep C6');
  assert.ok(near(peakHz(x, at(O.DEFENDER_BLIPS[0]), at(O.DEFENDER_BLIPS[0]) + 700, 200, 330, 1), midiHz(60), 0.03), 'blip C4');
  const [l, r] = [s.outdry.L, s.outdry.R];
  assert.ok(rms(l, r0, r0 + at(12)) > 1.5 * rms(r, r0, r0 + at(12)), 'the reticle panned left, to his slot');
});

test('the antivirus types `exit` key by key on the KEYS, dry, and presses Enter on 2.1a; ↑ ↑ and Enter again on 3.3, 3.3& and 3.4', () => {
  assert.equal(EXIT_TYPED.length, O.KEYS.length);
  assert.deepEqual(S.TYPED.filter((t) => t.kind === 'letter' && !t.w5 && t.frame < O.ENTER).map((t) => t.ch).join(''), EXIT_TYPED);
  assert.deepEqual(S.TYPED.filter((t) => t.ch === '\n').map((t) => t.frame), [O.ENTER, O.RUN]);
  assert.deepEqual(S.TYPED.filter((t) => t.ch === '↑').map((t) => t.frame), O.RECALL);
  const s = render({ solo: ['outkey'] });
  assert.ok(peak(s.outdry.L, 0, N) > 0.01 && peak(s.keys.L, 0, N) === 0, '`exit` is on the dry bus');
});

test('the stamp’s beep-boop is in key: A♯4 then F♯4, square', () => {
  const x = mono(render({ solo: ['outstamp'] }).fx);
  const a = at(O.STAMP);
  assert.ok(near(peakHz(x, a + 60, a + 2300, 400, 500, 1), midiHz(70), 0.02), 'A♯4');
  assert.ok(near(peakHz(x, at(O.STAMP + 3) + 60, at(O.STAMP + 3) + 2700, 330, 420, 1), midiHz(66), 0.02), 'F♯4');
});

test('the harmony: IV → Vsus → V on the e-piano, the film’s first tonic F♯6/9 on outro 3.1 over F♯1, re-struck on 4.1 and struck once more on 5.2 (the button, R16); no F♯ root before 3.1', () => {
  assert.deepEqual(O.CHORDS_OUT.map((c) => c.chord), ['IV', 'Vsus', 'V', 'I', 'I', 'I']);
  assert.deepEqual(O.CHORDS_OUT.slice(3).map((c) => c.at), [O.OPEN, O.BURST, O.BOWS.hero]);
  const pcs = (v) => [...new Set(v.map((m) => m % 12))].sort((a, b) => a - b);
  assert.deepEqual(pcs(S.VOICINGS_OUT.IV), [1, 3, 6, 10, 11], 'B D♯ F♯ A♯ C♯: Bmaj9');
  assert.deepEqual(pcs(S.VOICINGS_OUT.Vsus), [1, 3, 6, 8, 11], 'C♯ F♯ G♯ B D♯: C♯9sus4');
  assert.deepEqual(pcs(S.VOICINGS_OUT.V), [1, 3, 5, 8, 11], 'C♯ E♯ G♯ B D♯: C♯9');
  assert.deepEqual(pcs(S.VOICINGS_OUT.I), [1, 3, 6, 8, 10], 'F♯ A♯ C♯ G♯ D♯: F♯6/9');
  for (const c of ['IV', 'Vsus', 'V']) assert.notEqual(S.ROOTS_OUT[c] % 12, 6, `${c} is not on the tonic`);
  assert.equal(S.ROOTS_OUT.I, 30, 'F♯1');
  const sub = alone.sub;
  for (const [a, b, want] of [[O.OUTRO_START + 8, O.LUB[1] - 2, 35], [O.LINE + 8, O.BEEP, 37], [O.OPEN + 3, O.OPEN + 18, 30]]) {
    const hz = peakHz(sub, at(a), at(b), 30, 100, 0.25);
    assert.ok(near(hz, midiHz(want), 0.03), `the sub on MIDI ${want} over ${a}–${b} (${hz} Hz)`);
  }
});

test('the power-off: Enter takes the e-piano down with the picture (an octave’s sag over the squeeze); the V comes back muffled on the line', () => {
  for (let f = O.ENTER; f <= O.LINE; f += 0.5) {
    const p = S.powerDown(f);
    assert.ok(p.bend <= 0 && p.bend >= -12 && p.amp >= 0 && p.amp <= 1);
  }
  assert.deepEqual(S.powerDown(O.ENTER), { bend: -0, amp: 1 });
  assert.deepEqual(S.powerDown(O.LINE), { bend: -12, amp: 0 });
  const chords = mono(alone.chords);
  const zcr = (a, b) => {
    let c = 0;
    for (let i = a + 1; i < b; i++) if (chords[i - 1] < 0 !== chords[i] < 0) c++;
    return c / (b - a);
  };
  assert.ok(zcr(at(O.LINE - 1.5), at(O.LINE - 0.25)) < 0.8 * zcr(at(O.ENTER - 3), at(O.ENTER - 1)), 'it sags');
  const v = filt(chords.subarray(at(O.LINE + 6), at(O.CLOSE.from)), 'highpass', 2500, 2);
  assert.ok(rms(v, 0, v.length) < 0.12 * rms(chords, at(O.LINE + 6), at(O.CLOSE.from)), 'muffled: the V has almost nothing above 2.5 kHz');
  assert.ok(rms(chords, at(O.LINE + 6), at(O.BEEP)) > 0.002, 'but it is there');
  assert.ok(peak(chords, at(O.CLOSE.to) + 4800, at(O.OPEN)) < 1e-4, 'and closes with the iris');
});

test('the monitor: the flatline tone (C♯6) sounds only over FLATLINE, the beep on 2.3 is C♯6, the whine dips with the ω and stops with the iris', () => {
  const flat = mono(render({ solo: ['outflat'] }).fx);
  assert.equal(peak(flat, 0, at(O.FLATLINE.from)), 0);
  assert.equal(peak(flat, at(O.FLATLINE.to), N), 0, 'the tone stops on 2.3');
  assert.ok(near(peakHz(flat, at(O.LINE + 2), at(O.BEEP - 2), 1000, 1200, 0.5), 1108.73, 0.002));
  const beep = mono(render({ solo: ['outbeep'] }).fx);
  assert.ok(near(peakHz(beep, at(O.BEEP) + 480, at(O.BEEP) + 3600, 1000, 1200, 1), 1108.73, 0.003));
  assert.equal(S.whineDip(O.BEEP - 1), 0);
  // The ω is in the trace from the beep until the curl flattens it into the arc (CURL.from + 6): the whine dips for exactly as long.
  assert.ok(S.whineDip(O.BEEP + 3) > 0.9 && S.whineDip(O.CURL.from - 1) === 1, 'it dips with the pulse and stays down while the ω is there');
  assert.ok(S.whineDip(O.CURL.from + 3) < 1 && S.whineDip(O.CURL.from + 6) === 0, 'and comes back as the curl flattens the ω');
  const w = mono(render({ solo: ['outwhine'] }).fx);
  assert.ok(Math.abs(peakHz(w, at(O.LINE + 3), at(O.BEEP - 1), 10000, 12000, 50) - 11000) <= 150, '11 kHz on the line');
  assert.ok(peakHz(w, at(O.BEEP + 2), at(O.BEEP + 4), 8000, 12000, 50) < 9600, 'down with the ω');
  assert.ok(peak(w, at(O.WHINE.to) + 96, N) < 1e-5, 'gone when the dot closes');
});

test('the breath into the tonic (M4): the reverse cymbal and the inhale swell from the beep and stop exactly on outro 3.1; the inhale is on the post bus', () => {
  const s = render({ solo: ['outswell'] });
  const post = mono(s.post);
  const a = at(O.OPEN);
  assert.ok(rms(post, a - 2400, a) > 3 * rms(post, at(O.BREATH.from), at(O.BREATH.from + 12)), 'it swells');
  assert.equal(peak(post, a, N), 0, 'and stops on the tonic');
  const fx = mono(s.fx);
  assert.ok(rms(fx, a - 2400, a) > 0 && peak(fx, a, N) === 0);
});

// ——— Bars 3–4: the tonic, the wink, the reboot, the encore, the bows, the choke, the ticks ——————————————————————————————————

test('the tonic opens with the iris: the chord’s top end follows the pry-open (springL) rather than starting bright', () => {
  const chords = mono(alone.chords);
  const hf = (a, b) => rms(filt(chords.subarray(a - 2400, b), 'highpass', 4000, 2), 2400, b - a + 2400) / rms(chords, a, b);
  assert.ok(hf(at(O.OPEN + 4), at(O.OPEN + 7)) > 2 * hf(at(O.OPEN) + 240, at(O.OPEN + 1)));
  assert.equal(S.irisOpen(O.OPEN - 1), 0);
  assert.ok(S.irisOpen(O.OPEN + 5) > 1 && Math.abs(S.irisOpen(O.OPEN + 14) - 1) < 0.02);
});

test('outro 3.1 sounds F♯ major over F♯: the strongest pitch class of the ring is the tonic triad’s and F♯ is among the top three', () => {
  const x = mono(master, at(O.OPEN + 6), at(O.WINK));
  const energy = new Array(12).fill(0);
  for (let m = 42; m <= 90; m++) {
    const w = (2 * Math.PI * midiHz(m)) / SR;
    let re = 0;
    let im = 0;
    for (let i = 0; i < x.length; i++) {
      const v = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / x.length));
      re += v * Math.cos(w * i);
      im -= v * Math.sin(w * i);
    }
    energy[m % 12] += re * re + im * im;
  }
  const order = energy.map((e, pc) => [e, pc]).sort((a, b) => b[0] - a[0]).map(([, pc]) => pc);
  assert.ok([6, 10, 1].includes(order[0]), `strongest pitch class ${order[0]}`);
  assert.ok(order.slice(0, 3).includes(6), `top three ${order.slice(0, 3)}`);
});

test('the wink has its own sound (v04’s ruling 13): a ting ≥ 6 dB over the bed in its band, the bed ducked ≥ 4 dB for it and back by its 8th', () => {
  const bed = mixdown(render({ mute: ['outwink'] }), SR);
  const F = filt(mono(master), 'highpass', 1500, 2);
  const B = filt(mono(bed), 'highpass', 1500, 2);
  const Vt = Float32Array.from(F, (v, i) => v - B[i]);
  const [a, b] = [at(O.WINK), at(O.WINK) + 0.1 * SR];
  assert.ok(db(rms(Vt, a, b) / rms(B, a, b)) >= 6, `${db(rms(Vt, a, b) / rms(B, a, b)).toFixed(1)} dB`);
  assert.ok(rms(Vt, at(O.WINK - 3), a) < 0.05 * rms(Vt, a, b), 'it starts on the wink');
  const hp = filt(mono(bed), 'highpass', 200, 2);
  const before = rms(hp, at(O.WINK - 6), at(O.WINK - 1));
  const under = rms(hp, at(O.WINK) + 0.01 * SR, at(O.WINK) + 0.06 * SR);
  const after = rms(hp, at(O.WINK + 12), at(O.WINK + 15));
  assert.ok(db(before / under) >= 4, `ducked ${db(before / under).toFixed(1)} dB`);
  assert.ok(db(before / after) <= 2.5, `back by 3.2& (${db(before / after).toFixed(1)} dB under)`);
});

test('the reboot chime (M3): the replication bloops play the boot chime’s 1-3-5-9 in F♯ — F♯5 A♯5 C♯6 G♯6 — one on each count, rising in level', () => {
  assert.deepEqual(S.BLOOP_NOTES, [78, 82, 85, 92]);
  const x = mono(render({ solo: ['outbloop'] }).chime);
  O.COUNTER.forEach((f, k) => {
    const a = at(f) + Math.round(0.045 * SR);
    const hz = peakHz(x, a, a + Math.round(0.07 * SR), 600, 1800, 1);
    assert.ok(near(hz, midiHz(S.BLOOP_NOTES[k]), 0.015), `count ${k + 1}: ${hz} Hz`);
  });
  const lv = O.COUNTER.map((f) => peak(x, at(f), at(f + 5)));
  assert.ok(lv.every((v, k) => k === 0 || v > lv[k - 1]), `rising ${lv.map((v) => v.toFixed(3))}`);
});

test('the encore (M1, R13): drop 2’s hook row 1 in its own rhythm — its first bar’s eight notes on ENCORE’s eight onsets — its third below under it', () => {
  const bar = HOOK2.filter((h) => h.at < HOOK2[0].at + 96);
  const row = bar.map((h) => h.midi);
  assert.deepEqual(S.ENCORE_NOTES, row.slice(0, O.ENCORE.length));
  assert.equal(O.ENCORE.length, bar.length, 'the whole bar: every note of the hook’s first bar');
  assert.deepEqual(O.ENCORE.map((f) => f - O.BURST), bar.map((h) => h.at - HOOK2[0].at), 'the hook’s own rhythm');
  const s = render({ solo: ['outencore'] });
  const x = mono(s.vox);
  O.ENCORE.forEach((f, k) => {
    const a = at(f) + 960;
    const want = midiHz(S.ENCORE_NOTES[k]);
    const hz = peakHz(x, a, a + 3000, want * 0.9, want * 1.1, 1);
    assert.ok(near(hz, want, 0.02), `16th ${k + 1}: ${hz} vs ${want.toFixed(1)} Hz`);
  });
  const h = mono(render({ solo: ['outharmony'] }).vox);
  const a = at(O.ENCORE[0]) + 960;
  const want = midiHz(thirdBelow(S.ENCORE_NOTES[0]));
  assert.ok(near(peakHz(h, a, a + 3000, want * 0.9, want * 1.1, 1), want, 0.02), 'the third below');
});

test('the roll call (U5): eight calls one an 8th climbing the F♯ major scale (F♯6 → F♯7, an octave over the encore’s hook), left to right across each riser, each ringing into its 8th and over before the next', () => {
  assert.deepEqual(S.CALL_NOTES, [90, 92, 94, 95, 97, 99, 101, 102]);
  assert.equal(S.CALL_PANS.length, 8);
  assert.ok(S.CALL_PANS.slice(0, 4).every((p, k, a) => k === 0 || p > a[k - 1]) && S.CALL_PANS.slice(4).every((p, k, a) => k === 0 || p > a[k - 1]));
  const s = render({ solo: ['outcall'] });
  const x = sumAll(s);
  assert.deepEqual(O.CALLS.map((f, k) => f - O.CALLS[0] - 12 * k), new Array(8).fill(0), 'one an 8th');
  for (const f of O.CALLS) assert.ok(rms(x, at(f), at(f + 2)) > 3 * rms(x, at(f) - 300, at(f)) || f === O.CALLS[0], `a call on ${f}`);
  // Eight worlds, one arpeggio: every call sounds within 3 dB of the others on its onset, rings on into its 8th (a readable note,
  // not a 32nd's tick: U5), and is over before the next begins.
  const lv = O.CALLS.map((f) => rms(x, at(f), at(f + 2)));
  assert.ok(db(Math.max(...lv) / Math.min(...lv)) <= 3, `levels ${lv.map((v) => db(v).toFixed(1))} dB`);
  const ring = O.CALLS.map((f) => db(rms(x, at(f + 4), at(f + 6)) / rms(x, at(f), at(f + 2))));
  assert.ok(ring.every((d) => d > -20), `each still sounds 4 frames on: ${ring.map((d) => d.toFixed(1))} dB`);
  for (const f of O.CALLS.slice(0, -1)) assert.ok(rms(x, at(f + 12) - 48, at(f + 12)) < 0.05 * rms(x, at(f), at(f + 2)), `the call on ${f} is over by the next`);
});

test('the encore’s drums are the calls’ clock (R13): kicks on the beats (and 5.1, 5.2), claps on 2 and 4 (and the guest’s bow), closed hats on the off-8ths; in outro 4 every drum hit is a call and every call a drum hit', () => {
  assert.deepEqual(O.KICKS, [O.at(4), O.at(4, 2), O.at(4, 3), O.at(4, 4), O.at(5), O.at(5, 2)]);
  assert.deepEqual(O.CLAPS, [O.at(4, 2), O.at(4, 4), O.BOWS.guest]);
  assert.deepEqual(O.HATS, [O.at(4, 1.5), O.at(4, 2.5), O.at(4, 3.5), O.at(4, 4.5)]);
  const inBar4 = (f) => f >= O.at(4) && f < O.at(5);
  const hits = ['outkick', 'outclap', 'outhat'].flatMap(of).filter((a) => inBar4((a / SR) * 60));
  assert.deepEqual([...new Set(hits)].sort((a, b) => a - b), O.CALLS.map(at), 'the bar’s hits are its calls');
  // Heard: on the drums bus alone, a transient on every call of outro 4 and none between them (each 8th’s other frames only decay),
  // above 200 Hz (the kicks’ beaters, the claps, the hats; a frame’s RMS of the kicks’ 46 Hz bodies wobbles with their phase).
  const d = filt(mono(render({ solo: ['outkick', 'outclap', 'outhat'] }).drums), 'highpass', 200);
  const fr = (f) => rms(d, at(f), at(f + 1));
  for (let f = O.at(4); f < O.at(5); f++) {
    if (O.CALLS.includes(f)) assert.ok(fr(f) > 2 * fr(f - 1), `a drum hit on the call ${f} (${db(fr(f) / fr(f - 1)).toFixed(1)} dB)`);
    else assert.ok(fr(f) < 1.12 * fr(f - 1), `no drum hit on ${f}, between the calls (${db(fr(f) / fr(f - 1)).toFixed(1)} dB)`);
  }
  // The bows bar’s drums: the cat’s kick, the guest’s clap, the button’s kick; nothing else on the drums bus there until the stop.
  const bows = ['outkick', 'outclap', 'outhat'].flatMap(of).filter((a) => !inBar4((a / SR) * 60) && a >= at(O.at(5))).sort((a, b) => a - b);
  assert.deepEqual(bows, [O.BOWS.cat, O.BOWS.guest, O.BOWS.hero].map(at));
});

test('the walk-ons (R14): the guest’s steps on the 8ths from 4.3, panned with him from the left wing; the cat’s patter on the 32nds of its dash, right; the two thuds on 4.4a', () => {
  assert.deepEqual(O.STEPS, [O.at(4, 3), O.at(4, 3.5), O.at(4, 4), O.at(4, 4.5)]);
  assert.deepEqual(S.PATTER, [3, 6, 9, 12].map((k) => O.CAT_DASH.from + k));
  assert.ok(S.PATTER.every((f) => f < O.WALK_ON.to), 'the patter is over before the plant');
  const st = render({ solo: ['outstep'] }).fx;
  const pt = render({ solo: ['outpatter'] }).fx;
  const side = (b, f, n) => db(rms(b.L, at(f), at(f + n)) / rms(b.R, at(f), at(f + n)));
  O.STEPS.forEach((f, k) => assert.ok(side(st, f, 3) > 3, `step ${k + 1} on the left (${side(st, f, 3).toFixed(1)} dB L over R)`));
  assert.ok(side(st, O.STEPS[0], 3) > side(st, O.STEPS[3], 3), 'moving in from the wing');
  S.PATTER.forEach((f) => assert.ok(side(pt, f, 2) < -3, `patter on ${f} on the right`));
  const x = mono(st);
  for (const f of O.STEPS) assert.ok(rms(x, at(f), at(f + 1)) > 4 * rms(x, at(f) - 200, at(f)) + 1e-6, `a step on ${f}`);
});

test('the guest’s plink on 4.2e is drop 2’s crash plink (F♯6), and the bed ducks under it for 60 ms', () => {
  assert.deepEqual({ midi: S.PLINK.midi, ratio: S.PLINK.ratio, index: S.PLINK.index, decay: S.PLINK.decay }, { midi: 90, ratio: 3.5, index: 3, decay: 0.4 });
  const x = mono(render({ solo: ['outplink'] }).chime);
  assert.equal(peak(x, 0, at(O.DROP.to)), 0);
  assert.ok(near(peakHz(x, at(O.DROP.to) + 2400, at(O.DROP.to) + 9600, 1300, 1700, 1), midiHz(90), 0.01));
  const bed = sumAll(render({ mute: ['outplink'] }));
  const dry = sumAll(render({ mute: ['outplink'], ducks: false }));
  const d = at(O.DROP.to);
  assert.ok(db(rms(dry, d + 240, d + 2400) / rms(bed, d + 240, d + 2400)) >= 3, 'ducked ≥ 3 dB under it');
  assert.ok(Math.abs(db(rms(dry, d + 9600, d + 12000) / rms(bed, d + 9600, d + 12000))) < 0.5, 'and back 200 ms on');
});

test('the guest’s hm-hm on its bow is the infected Defender: C3 bending up to C♯3, then rising to F♯3 (M7, M8)', () => {
  const x = mono(render({ solo: ['outhmhm'] }).outdry);
  const a = at(O.BOWS.guest);
  assert.ok(near(peakHz(x, a, a + 1800, 110, 160, 0.5), midiHz(48), 0.035), 'it starts on C3');
  assert.ok(near(peakHz(x, a + 2600, a + 4300, 110, 160, 0.5), midiHz(49), 0.025), 'bent up to C♯3');
  assert.ok(near(peakHz(x, a + 8600, a + 11000, 150, 220, 0.5), midiHz(54), 0.03), 'and up to F♯3');
});

test('the story’s sounds are heard (music.md §4.5 rule 3, solo against the mix in their own band): the knocks, the encore and the plink lead; every one of the eight calls, the Defender’s blips, the nya and the hm-hm within 6 dB', () => {
  // Measured on the dry buses (the chain's plate and limiter move these by ≤ 1.5 dB: notes/b58/music/audible.mjs).
  const full = sumAll(alone);
  const band = (x, lo, hi, a, b) => {
    const y = filt(filt(x.subarray(a - 4800, b), 'highpass', lo, 2), 'lowpass', hi, 2);
    return rms(y, 4800, y.length);
  };
  const cases = [
    ['outknock', O.KNOCKS[0], 9, 500, 2000, 0],
    ['outencore', O.ENCORE[0], 36, 700, 3500, 0],
    ['outplink', O.DROP.to, 6, 1000, 6000, 0],
    ...O.CALLS.map((f) => ['outcall', f, 6, 1000, 6000, -6]),
    ['outdefender', O.DEFENDER_BLIPS[0], 6, 200, 2000, -6],
    ['outnya', O.BOWS.cat, 9, 400, 3000, -6],
    ['outhmhm', O.BOWS.guest, 16, 100, 700, -6],
  ];
  const beds = {};
  for (const [kind, f, frames, lo, hi, floor] of cases) {
    const bed = (beds[kind] ??= sumAll(render({ mute: [kind] })));
    const own = Float32Array.from(full, (v, i) => v - bed[i]);
    const d = db(band(own, lo, hi, at(f), at(f + frames)) / band(bed, lo, hi, at(f), at(f + frames)));
    assert.ok(d >= floor, `${kind}: ${d.toFixed(1)} dB against the bed (floor ${floor})`);
  }
});

test('the knocks get the room: the breath’s swell is ducked ≥ 6 dB under each, and back at full for its last 10 ms into the tonic', () => {
  const x = mono(render({ solo: ['outswell'] }).fx);
  const y = mono(render({ solo: ['outswell'], ducks: false }).fx);
  for (const f of O.KNOCKS) {
    const a = at(f) + 240;
    assert.ok(db(rms(y, a, a + 1440) / rms(x, a, a + 1440)) >= 6, `ducked under the knock on ${f}`);
  }
  const back = at(O.OPEN) - 480;
  assert.ok(rms(x, back, at(O.OPEN)) > 0.9 * rms(y, back, at(O.OPEN)), 'and back for the swell’s last 10 ms');
});

// ——— U6 (the review after v07: the music cut off too abruptly): on his bow the band plays its button and stops; the I chord rings out under the dive ——

test('the button (R16): a 32nd’s breath before his bow (the chord lifts), then kick, crash and the I chord struck once more on 5.2, together', () => {
  const tonic = mono(render({ solo: ['outtonic'] }).chords);
  const held = rms(tonic, at(O.ANTICIPATE - 6), at(O.ANTICIPATE));
  const breath = rms(tonic, at(O.BOWS.hero - 1), at(O.BOWS.hero));
  assert.ok(db(held / breath) >= 4, `the chord lifts over the 32nd before the button (${db(held / breath).toFixed(1)} dB)`);
  const strike = rms(tonic, at(O.BOWS.hero) + 480, at(O.BOWS.hero + 1));
  assert.ok(db(strike / breath) >= 6, `and is struck on the button (${db(strike / breath).toFixed(1)} dB over the breath)`);
  assert.ok(peak(tonic, at(O.BOWS.hero) - 48, at(O.BOWS.hero)) > 0, 'a lift, not a gap: the chord’s release still sounds');
  for (const kind of ['outkick', 'outcrash', 'outtonic']) assert.ok(of(kind).includes(at(O.BOWS.hero)), `${kind} on the button`);
  // M2 (u5 round 1): the chord is STRUCK on the button (BUTTON_STRIKE over the ring's level), then settles to the ring over the 32nd.
  const ring = rms(tonic, at(O.STOP.to), at(O.STOP.to + 1));
  assert.ok(db(strike / ring) >= 1.5, `the strike stands over the ring (${db(strike / ring).toFixed(1)} dB)`);
  // The band’s last hit is the loudest frame of the bows bar from the guest’s bow on; and (M2) the BUM is the biggest hit above the
  // lows too: above 300 Hz its frame is ≥ 1 dB over every other frame from the guest's bow on, the plink's included (v13: −20.2 dBFS
  // against the plink's −19.2).
  const m = mono(master);
  const fr = (f) => rms(m, at(f), at(f + 1));
  const hi = filt(m, 'highpass', 300);
  const frHi = (f) => rms(hi, at(f), at(f + 1));
  for (let f = O.at(5, 1.5); f < O.TICKS[0]; f++) {
    if (f === O.BOWS.hero) continue;
    assert.ok(fr(f) < 1.6 * fr(O.BOWS.hero), `the button outsounds ${f}`);
    assert.ok(db(frHi(O.BOWS.hero) / frHi(f)) >= 1, `above 300 Hz the button outsounds ${f} (${db(frHi(O.BOWS.hero) / frHi(f)).toFixed(1)} dB)`);
  }
});

/** finish()'s additions alone (the tube's whine and the ticks, before the master trim), and the bed: the master less them. */
const ticksAlone = (() => {
  const z = { L: new Float32Array(N), R: new Float32Array(N) };
  S.finish(z.L, z.R, SR);
  return z;
})();
const TRIM = 10 ** (MASTER_TRIM_DB / 20);
const bed = { L: master.L.map((v, i) => v - TRIM * ticksAlone.L[i]), R: master.R.map((v, i) => v - TRIM * ticksAlone.R[i]) };
/** RMS (dBFS) of `m`'s mono sum over frame `f`, or over [f, g). */
const frameDb = (m, f, g = f + 1) => db(rms(mono(m, at(f), at(g)), 0, at(g) - at(f)));

test('the ring-out’s curves (RING, keyed to the score): the chord struck on his bow and settling over the 32nd, its low-pass closing to landHz on the █’s landing and closeHz by the ring’s end, the release at dbAtTick on the landing’s tick (≈ 0.5 dB a frame or gentler), closed from that tick to zero by the ring’s end; the ticks’ tails close into SETTLE', () => {
  // The frames the ring is keyed to (sheet §8): his bow, the landing (the first tick), the ring's end — after that tick (it sits on the
  // tail), by SETTLE (the only digital zero), and by a second tick if there is one (that one alone).
  assert.ok(O.SLAM.to - O.STOP.from >= 24, 'the dive is a full beat or more (U6)');
  assert.equal(O.RING_OUT.from, O.STOP.from);
  assert.equal(O.TICKS[0], O.SLAM.to, 'the first tick is the landing');
  assert.ok(O.RING_OUT.to > O.TICKS[0] && O.RING_OUT.to <= O.SETTLE.from, `the ring ends after the landing's tick, by SETTLE (${O.RING_OUT.to})`);
  if (O.TICKS.length > 1) assert.ok(O.RING_OUT.to <= O.TICKS[1], 'and by the second tick');
  assert.equal(S.ringFade(), O.RING_OUT.to - O.TICKS[0]);
  assert.equal(S.ringClose(O.STOP.from), 0);
  assert.equal(S.ringClose(O.RING_OUT.to), 1);
  assert.equal(S.ringClose(O.LOOP), 1);
  // The low-pass: open to his bow, RING.landHz on the landing, RING.closeHz by the ring's end, closing all the way.
  for (const hz of [9000, 11000]) {
    assert.equal(S.ringCutoff(hz, O.STOP.from), hz);
    assert.ok(Math.abs(S.ringCutoff(hz, O.SLAM.to) - S.RING.landHz) < 1e-6, 'landHz on the landing');
    assert.ok(Math.abs(S.ringCutoff(hz, O.RING_OUT.to) - S.RING.closeHz) < 1e-6 && S.ringCutoff(hz, O.LOOP) === S.ringCutoff(hz, O.RING_OUT.to));
    for (let f = O.STOP.from; f < O.RING_OUT.to; f += 0.25) assert.ok(S.ringCutoff(hz, f + 0.25) < S.ringCutoff(hz, f), `closing (${f})`);
  }
  assert.deepEqual([S.RING.landHz, S.RING.closeHz], [500, 200], 'the chord’s C♯4–A♯4 still pass on the landing (M1); dark by the end');
  // The chord: struck BUTTON_STRIKE.db over the ring's level (bloomDb over the encore's) and back to it over the 32nd, falling all the way.
  assert.equal(S.ringBloom(O.STOP.from - 1), 1);
  assert.ok(Math.abs(db(S.ringBloom(O.STOP.from)) - (S.RING.bloomDb + S.BUTTON_STRIKE.db)) < 1e-9);
  assert.equal(S.BUTTON_STRIKE.frames, O.STOP.to - O.STOP.from, 'the strike settles over the band’s 32nd');
  assert.ok(Math.abs(db(S.ringBloom(O.STOP.to)) - S.RING.bloomDb) < 1e-9);
  for (let f = O.STOP.from; f < O.STOP.to; f += 0.25) assert.ok(S.ringBloom(f + 0.25) < S.ringBloom(f));
  // The release (M1): dbAtTick on the landing's tick at ≈ 0.5 dB a frame or gentler (r4 built ≈ 1), falling all the way, zero by the end.
  assert.equal(S.ringRelease(O.STOP.from), 1);
  assert.ok(Math.abs(db(S.ringRelease(O.TICKS[0])) - S.RING.dbAtTick) < 1e-9, 'the release reaches dbAtTick on the first tick');
  assert.ok(S.RING.dbAtTick / (O.TICKS[0] - O.STOP.from) >= -0.55, `≤ 0.55 dB a frame (${(S.RING.dbAtTick / (O.TICKS[0] - O.STOP.from)).toFixed(2)})`);
  for (let f = O.STOP.from; f < O.RING_OUT.to; f += 0.25) assert.ok(S.ringRelease(f + 0.25) < S.ringRelease(f), `falling all the way (${f})`);
  assert.equal(S.ringRelease(O.RING_OUT.to), 0);
  assert.equal(S.ringRelease(O.LOOP), 0);
  assert.equal(S.tickTail(O.SETTLE.from - S.RING.tickTail), 1);
  assert.equal(S.tickTail(O.SETTLE.from), 0);
  assert.ok(S.tickTail(O.SETTLE.from - S.RING.tickTail / 2) > 0.49 && S.tickTail(O.SETTLE.from - S.RING.tickTail / 2) < 0.51);
  assert.deepEqual(S.RING.buses, ['chords', 'sub'], 'what rings on: the tonic’s supersaws and its F♯1');
});

test('the band stops on his bow (STOP, a 32nd, before the reverb): every voice but the I chord plays the button and falls over the 32nd, exactly silent after it', () => {
  const band = render({ mute: ['outtonic'] });
  const all = sumAll(band);
  const before = rms(all, at(O.STOP.from - 6), at(O.STOP.from));
  assert.ok(before > 0.05, `the band plays into the bow (${before.toFixed(4)})`);
  const button = rms(all, at(O.STOP.from), at(O.STOP.from + 1));
  assert.ok(button > before, `the button is the band's last hit (${db(button / before).toFixed(1)} dB over the bars before)`);
  assert.ok(rms(all, at(O.STOP.from + 2), at(O.STOP.to)) < 0.25 * button, 'a 32nd, not a fade');
  for (const [name, b] of Object.entries(band)) for (const x of b.L ? [b.L, b.R] : [b]) assert.equal(peak(x, at(O.STOP.to), N), 0, `${name} after the 32nd`);
});

test('the I chord rings on through the gap: struck over the room the band leaves, its low-pass closing over the dive (≥ 12 dB less above 1 kHz by the █’s landing, ≥ 20 by the ring’s end), still the chord on the landing', () => {
  const tonic = render({ solo: ['outtonic'] });
  const chords = mono(tonic.chords);
  const was = rms(chords, at(O.STOP.from - 3), at(O.STOP.from));
  assert.ok(rms(chords, at(O.STOP.to), at(O.STOP.to + 1)) > was, 'it fills the room the band leaves');
  // M1: the filter no longer takes the chord before the release does: above 300 Hz the bus loses ≤ 12 dB from the band's stop to the
  // landing, before the release (r4 as built: the low-pass was shut to 200 Hz by then).
  const hi300 = filt(chords, 'highpass', 300);
  const kept = db(rms(hi300, at(O.SLAM.to - 1), at(O.SLAM.to)) / rms(hi300, at(O.STOP.to), at(O.STOP.to + 1)));
  assert.ok(kept > -12, `above 300 Hz on the landing: ${kept.toFixed(1)} dB from the band's stop`);
  // Above 1 kHz through a 4-pair high-pass (a 2-pair one's skirt lets the chord's C♯4–F♯4 through at ≈ −25 dB: a floor, not the chord).
  const hi = filt(chords, 'highpass', 1000, 4);
  const share = (f) => db(rms(hi, at(f), at(f + 1)) / rms(chords, at(f), at(f + 1)));
  // M1: darker by the landing (landHz: the chord’s C♯4–A♯4 still pass; r4 shut it to 200 Hz there: ≥ 20 dB), dark by the ring’s end.
  const [bow, land, out] = [O.STOP.from - 1, O.SLAM.to - 1, O.RING_OUT.to - 1].map(share);
  assert.ok(land < bow - 12 && out < bow - 20, `above 1 kHz: ${bow.toFixed(1)} dB on the bow, ${land.toFixed(1)} dB by the landing, ${out.toFixed(1)} dB by the ring’s end`);
  // Still the tonic as it closes: F♯1 under it, and the chord's lowest voices (C♯4, D♯4, F♯4) through the closed low-pass.
  assert.equal(peakHz(tonic.sub, at(O.STOP.to), at(O.SLAM.to), 30, 70, 1), Math.round(midiHz(S.ROOTS_OUT.I)));
});

test('the encore resolves (U6, M1): no hard choke — the bed falls frame by frame from his bow, the chord heard through the dive, the landing’s tick on its tail (≈ −33 dBFS, the chord above 300 Hz), the tail dead by the ring’s end', () => {
  const m = mono(master);
  const before = rms(m, at(O.STOP.from - 6), at(O.STOP.from));
  assert.ok(before > 0.02, `the encore rings into the bow (${before.toFixed(4)})`);
  const end = O.RING_OUT.to;
  const levels = [];
  for (let f = O.STOP.from; f < end; f++) levels.push(frameDb(bed, f));
  const report = levels.map((v, k) => `${O.STOP.from + k} ${v.toFixed(1)}`).join(' · ');
  levels.forEach((v, k) => {
    if (!k) return;
    // No cliff while it is heard (over −50 dBFS): no frame falls more than 4 dB (the band's cue, ≈ −3.4, is the steepest; the old
    // choke fell 12 dB, then to zero). Under −50 the raised cosine's end and the saws' beating may step further.
    if (levels[k - 1] > -50) assert.ok(v - levels[k - 1] > -4, `no cliff: ${report}`);
    // Never up by 1.5 dB (the saws' beating wobbles a frame's RMS by about a dB), or by 2 deep in the tail (under −50 dBFS).
    assert.ok(v < levels[k - 1] + (levels[k - 1] > -50 ? 1.5 : 2), `falling: ${report}`);
  });
  // And falling as a whole, 8th by 8th of the ring (each 12-frame mean ≥ 1 dB under the last).
  const mean12 = (k) => levels.slice(k, k + 12).reduce((a, v) => a + v, 0) / 12;
  for (let k = 12; k + 12 <= levels.length; k += 12) assert.ok(mean12(k) < mean12(k - 12) - 1, `the ring falls every 8th: ${report}`);
  assert.ok(levels[O.STOP.to - O.STOP.from] > -30, `the chord carries the gap the band leaves (≥ −30 dBFS on STOP.to): ${report}`);
  assert.ok(levels[12] > -36, `the ring is heard through the dive (his bow + 12: ${levels[12].toFixed(1)}): ${report}`);
  // M1: the chord is heard through the whole dive and under the landing's tick, above 300 Hz (where a laptop hears it), not only as
  // sub: the frame before the tick and the tick's own (the bed's) ≥ −43 dBFS above 300 Hz (v13: −54 / −56), within 8 dB of the full band.
  const hiBed = filt(mono(bed), 'highpass', 300);
  const hiDb = (f, g = f + 1) => db(rms(hiBed, at(f), at(g)));
  const tail = hiDb(O.TICKS[0] - 1, O.TICKS[0] + 1);
  const atTick = frameDb(bed, O.TICKS[0] - 1, O.TICKS[0] + 1);
  assert.ok(tail > -43, `the chord under the landing's tick, above 300 Hz: ${tail.toFixed(1)} dBFS`);
  assert.ok(tail > atTick - 8, `the chord, not a rumble: ${tail.toFixed(1)} above 300 Hz, ${atTick.toFixed(1)} in all`);
  for (let f = O.STOP.to; f < O.TICKS[0]; f++) assert.ok(hiDb(f) > -43, `above 300 Hz the chord is heard on ${f}: ${hiDb(f).toFixed(1)}`);
  // The tail round the landing's tick (its frame and the one before; mono, as the reviews measure): ≈ −33 dBFS (v13: −47; v08: zero).
  assert.ok(atTick > -38 && atTick < -29, `the tail round the first tick ≈ −33 dBFS: ${atTick.toFixed(1)}`);
  // The tick reads over the tail: in its own band (above 1 kHz), its frame is ≥ 20 dB over the tail's.
  const tickHi = filt(mono(master, at(O.TICKS[0]), at(O.TICKS[0] + 1)), 'highpass', 1000);
  const bedHi = filt(mono(bed, at(O.TICKS[0]), at(O.TICKS[0] + 1)), 'highpass', 1000);
  assert.ok(db(rms(tickHi, 0, tickHi.length) / rms(bedHi, 0, bedHi.length)) > 20, 'the tick on the landing is heard over the tail');
  // The tail closes on the raised cosine from the tick: under −55 dBFS 6 frames before the ring's end, then gone (bar rounding) from
  // it on: silence only after the tail (and a second tick, if there is one, alone).
  assert.ok(frameDb(bed, end - 6) < -55, `nearly dead 6 frames before the ring's end: ${frameDb(bed, end - 6).toFixed(1)}`);
  for (const x of [bed.L, bed.R]) assert.ok(peak(x, at(end), N) < 1e-6, 'nothing but the ticks from the ring’s end');
});

test('the last sounds are S01’s two cursor ticks on 5.3 and 5.4 (×2), exactly as the mix renders frame 0’s tick, their tails closed into SETTLE, and SETTLE digital zero', () => {
  const t = V.cursorTick(SR);
  for (const f of O.TICKS) {
    const a = at(f);
    const end = Math.min(t.L.length, at(O.SETTLE.from - S.RING.tickTail) - a);
    let worst = 0;
    for (let k = 0; k < end; k++) worst = Math.max(worst, Math.abs(ticksAlone.L[a + k] - Math.fround(S.LAST_TICK_GAIN * t.L[k])), Math.abs(ticksAlone.R[a + k] - Math.fround(S.LAST_TICK_GAIN * t.R[k])));
    assert.ok(worst < 1e-6, `the tick on ${f} is S01's ×${S.LAST_TICK_GAIN} (off by ${worst})`);
  }
  // From the ring's end on the master is the ticks (and their tails) alone, closed into SETTLE.
  let worst = 0;
  for (let i = at(O.RING_OUT.to); i < N; i++) worst = Math.max(worst, Math.abs(master.L[i] - Math.fround(TRIM * ticksAlone.L[i])), Math.abs(master.R[i] - Math.fround(TRIM * ticksAlone.R[i])));
  assert.ok(worst < 1e-6, `from the ring's end it is the ticks alone (off by ${worst})`);
  const tail = (f) => frameDb(ticksAlone, f);
  assert.ok(tail(O.SETTLE.from - 1) < tail(O.SETTLE.from - S.RING.tickTail) - 20, 'the last tail closes, not cut');
  assert.equal(S.LAST_TICK_GAIN, 2);
  for (const x of [master.L, master.R]) assert.equal(peak(x, at(O.SETTLE.from), N), 0, 'the settle is digital zero');
  let last = -1;
  for (let i = 0; i < N; i++) if (Math.abs(master.L[i]) > 0.01 || Math.abs(master.R[i]) > 0.01) last = i;
  const lastTick = O.TICKS[O.TICKS.length - 1];
  assert.ok(last >= at(lastTick) && last < Math.max(at(lastTick) + 0.02 * SR, at(O.RING_OUT.to)), 'the last sound above −40 dB is the last tick (or the tail it sits on)');
});

test('the tube powers down with the picture (POWER_DOWN, M13’s whine): faint (≤ −40 dBFS), dry, falling 11 → 4 kHz from his bow, gone before the █ lands, never choked by the band’s stop', () => {
  const w = { L: new Float32Array(N), R: new Float32Array(N) };
  S.tubeWhine(w.L, w.R, SR);
  const x = mono(w);
  assert.equal(peak(x, 0, at(O.POWER_DOWN.from)), 0, 'nothing before his bow');
  assert.equal(peak(x, at(O.TICKS[0] - 2), N), 0, 'gone two frames before the first tick');
  assert.ok(db(peak(x, 0, N)) <= -40, `≤ −40 dBFS (${db(peak(x, 0, N)).toFixed(1)})`);
  assert.ok(db(peak(x, 0, N)) > -46, `but there (${db(peak(x, 0, N)).toFixed(1)})`);
  const p0 = at(O.POWER_DOWN.from);
  const hz0 = peakHz(x, p0 + at(0.5), p0 + at(2.5), 8000, 12000, 50);
  const hz1 = peakHz(x, at(O.TICKS[0] - 8), at(O.TICKS[0] - 4), 3000, 7000, 25);
  assert.ok(hz0 > 9500 && Math.abs(hz1 - S.TUBE.to) < 1200 && hz1 < hz0, `falling: ${hz0} → ${hz1} Hz`);
  // finish() adds it after the release: mid-dive, finish()'s additions are the whine, as tubeWhine draws it.
  const mid = at(O.POWER_DOWN.from + 10);
  let worst = 0;
  for (let i = mid; i < mid + at(3); i++) worst = Math.max(worst, Math.abs(ticksAlone.L[i] - w.L[i]), Math.abs(ticksAlone.R[i] - w.R[i]));
  assert.ok(worst < 1e-7 && rms(mono(ticksAlone, mid, mid + at(3)), 0, at(3)) > 0, `finish() adds it whole (off by ${worst})`);
});

test('bar 2 rises from the beep (R1-MUSIC-ARC): the muffled V and its C♯2 pedal hold under the flatline, then swell ×2 to the iris-out’s close', () => {
  assert.equal(S.vSwell(O.LINE), 1);
  assert.equal(S.vSwell(O.BEEP), 1);
  assert.equal(S.vSwell(O.CLOSE.to), S.V_SWELL.gain);
  for (let f = O.BEEP; f < O.CLOSE.to; f++) assert.ok(S.vSwell(f + 1) > S.vSwell(f), 'rising all the way');
  const v = mono(render({ solo: ['outepiano'] }).chords);
  const pedal = render({ solo: ['outpedal'] }).sub;
  // The pedal is a steady sine: its swell is the whole ×2 at the close's middle (≈ +5 dB); the V's e-piano also decays (τ 3 s) meanwhile.
  for (const [name, x, min] of [['the V', v, 2.5], ['the pedal', pedal, 4.5]]) {
    const flat = rms(x, at(O.LINE + 6), at(O.BEEP));
    const late = rms(x, at(O.CLOSE.from), at(O.CLOSE.to - 1));
    assert.ok(db(late / flat) > min, `${name} swells ${db(late / flat).toFixed(1)} dB from the flatline to the close`);
  }
});

test('the encore’s F♯1 on every kick is ducked off its attack (music.md §6.2: depth 0.85), so the two never peak together; the tonic’s pulse (3.1) blooms as built', () => {
  // What each pulse adds over its kick's first 10 ms (above the earlier pulse's tail): undducked, a F♯1 pulse adds ≈ its own gain (0.25–0.3).
  const sub = render({ solo: ['outtonic'] }).sub;
  const k = Math.round(0.01 * SR);
  const adds = (f) => peak(sub, at(f), at(f) + k) - peak(sub, at(f) - k, at(f));
  for (const f of O.KICKS) assert.ok(adds(f) < 0.1, `ducked on ${f}: it adds ${adds(f).toFixed(3)}`);
  assert.ok(adds(O.OPEN) > 0.2, `the tonic’s pulse strikes at once (it adds ${adds(O.OPEN).toFixed(3)})`);
  assert.deepEqual(S.SUB_DUCK, { depth: 0.85, attackMs: 2, releaseMs: 110 });
});

test('the loop preview (music.md §6.4 `loop`): outro 5 (film bar 63), then the film’s first bar, cut from the finished mix and joined sample-exact; zero into the join, the ticks a beat apart across it', () => {
  assert.equal(S.LOOP_PREVIEW.id, 'loop');
  assert.deepEqual(S.LOOP_PREVIEW.spans, [{ from: O.at(5), to: O.LOOP }, { from: partStart('intro'), to: partStart('intro') + 96 }]);
  assert.equal(O.at(5), 5952, 'film bar 63 (61 before v08’s bridges)');
  // On index ramps (exact in float32 below 2^24): every sample comes from where it should.
  const L = Float32Array.from({ length: N }, (_, i) => i);
  const R = Float32Array.from({ length: N }, (_, i) => -i);
  const q = S.loopPreview(L, R, SR);
  const a = at(O.at(5));
  const join = N - a;
  assert.equal(q.L.length, join + at(96));
  for (const [i, want] of [[0, a], [join - 1, N - 1], [join, 0], [q.L.length - 1, at(96) - 1]]) {
    assert.equal(q.L[i], want);
    assert.equal(q.R[i], -want);
  }
  assert.throws(() => S.loopPreview(L.subarray(0, N - 1), R.subarray(0, N - 1), SR), /whole film/);
  // On the ending's mix: its half is the master's, and the settle is digital zero into the join.
  const m = S.loopPreview(master.L, master.R, SR);
  assert.equal(peak(m.L, at(O.SETTLE.from) - a, join), 0);
  assert.equal(peak(m.R, at(O.SETTLE.from) - a, join), 0);
  const lastTick = O.TICKS[O.TICKS.length - 1];
  assert.ok(peak(m.L, at(lastTick) - a, at(lastTick) - a + 480) > 0.01, 'the last tick is in it');
  const ticks = [...O.TICKS.map((f) => f - O.at(5)), ...CURSOR_BLINKS.map(([f]) => f - partStart('intro') + 96)];
  ticks.forEach((t, k) => k && assert.equal(t - ticks[k - 1], 24, `one a beat across the join: ${ticks}`));
  assert.deepEqual(ticks.slice(-3), [72, 96, 120], 'the last of the ending’s a beat before the join, the intro’s two on it and a beat after');
});

test('the loop: the ticks fall one a beat across the seam (the ending’s, a beat apart up to 5.4, then frame 0 and frame 24, the intro’s own two)', () => {
  const across = [...O.TICKS.map((f) => f - O.LOOP), ...CURSOR_BLINKS.map(([f]) => f - partStart('intro'))];
  across.forEach((t, k) => k && assert.equal(t - across[k - 1], 24, `${across}`));
  assert.deepEqual(across.slice(-3), [-24, 0, 24]);
});

test('the ending’s levels (sheet §8, r4): bar 1 ≈ −18, bar 2 ≈ −19 rising, 3.1 ≈ −12 and its bar ≈ −14, outro 4 the peak bar ≈ −12.5 with 4.1 between −11 and −10.5, outro 5 ≈ −15, the part −15 ± 1; true peak under the ceiling; the lows mono', () => {
  const b1 = lufs(master, O.at(1), O.at(2));
  const b2 = lufs(master, O.at(2), O.at(3));
  const b2head = lufs(master, O.at(2), O.at(2, 3));
  const [m22, m23, m24] = [2, 3, 4].map((beat) => momentary(master, O.at(2, beat)));
  const m31 = momentary(master, O.OPEN);
  const b3 = lufs(master, O.at(3), O.at(4));
  const m41 = momentary(master, O.BURST);
  const b4 = lufs(master, O.at(4), O.at(5));
  const b5 = lufs(master, O.at(5), O.LOOP);
  // check-loudness's M max (the loudest 400 ms at 10 ms steps), over the windows that start in the encore (4.1 → the choke).
  const p = powerPrefix([master.L, master.R], SR);
  const m41max = loudestWindow(p, at(O.BURST), at(O.STOP.from) + 0.4 * SR, SR, 0.4);
  const part = lufs(master, O.OUTRO_START, O.LOOP);
  const report = `bar1 ${b1.toFixed(2)} · bar2 ${b2.toFixed(2)} (2.1–2.2 ${b2head.toFixed(2)}; 2.2 ${m22.toFixed(2)}, 2.3 ${m23.toFixed(2)}, 2.4 ${m24.toFixed(2)}) · 3.1 ${m31.toFixed(2)} · bar3 ${b3.toFixed(2)} · 4.1 ${m41.toFixed(2)} (max ${m41max.toFixed(2)}) · bar4 ${b4.toFixed(2)} · bar5 ${b5.toFixed(2)} · part ${part.toFixed(2)}`;
  assert.ok(b1 > -19.5 && b1 < -16.5, report);
  // Round 1 (R1-MUSIC-ARC): bar 2 ≈ −19 (round 0: −20.2), its floor on the flatline (2.2), rising from the beep, ≈ −16 by 2.4 (round 0:
  // 2.3 was the ending's quietest beat, −21.9).
  assert.ok(b2 > -19.8 && b2 < -18.2, `bar 2 ≈ −19: ${report}`);
  assert.ok(b2head > -21 && b2head < -17, report);
  assert.ok(m23 > m22 + 0.5 && m24 > m23 + 2, `bar 2 rises from the beep into the tonic: ${report}`);
  assert.ok(m24 > -17 && m24 < -15, `≈ −16 by 2.4: ${report}`);
  assert.ok(m24 > b2head + 1.5, `bar 2 rises into the tonic: ${report}`);
  assert.ok(m31 > -13.5 && m31 <= -11, report);
  assert.ok(b3 > -15.5 && b3 < -12.5, report);
  assert.ok(m41 >= -11 && m41 <= -10.5, report);
  assert.ok(m41max <= -10.5, `4.1's loudest 400 ms ≤ −10.5 (round 0: −10.36): ${report}`);
  assert.ok(m41 > m31 + 0.5, `the encore is the ending's loudest beat: ${report}`);
  // r4: outro 4, the encore's whole bar, is the ending's peak bar; outro 5 (two beats of band, the button, the ring-out, the ticks) ≈ −15.
  assert.ok(b4 > -13.5 && b4 < -11.5, `outro 4 ≈ −12.5: ${report}`);
  assert.ok(b4 > Math.max(b1, b2, b3, b5) + 0.5, `outro 4 is the ending's loudest bar: ${report}`);
  assert.ok(b5 > -16.5 && b5 < -13.5, `outro 5 ≈ −15: ${report}`);
  assert.ok(part > -16 && part < -14, report);
  const all = { L: master.L.slice(at(O.OUTRO_START), N), R: master.R.slice(at(O.OUTRO_START), N) };
  assert.ok(truePeakDb(all.L, all.R) <= CEILING_DB + 0.005, `true peak ${truePeakDb(all.L, all.R).toFixed(2)}`);
  assert.ok(lowCorrelation(all.L, all.R, SR) >= 0.99, `lows ${lowCorrelation(all.L, all.R, SR).toFixed(3)}`);
});

// ——— The ending's B (the whole-film mix pass, 2026-10-03: sections/outro.mjs ENDING_STYLE, ENDING_B) ———————————————————————————————
// B (no held bed: the e-piano struck on the drawn events, one swell from the iris, a house-piano stab per encore kick instead of the
// pumping supersaws) is the film's since 2026-10-03 (spec rev 11 §16 item 3); A, the earlier ending (U5 / U6),
// stays behind { style: 'A' } (every test above; scripts/audio/endingAB.mjs renders both).

test('ending B is the film’s: the default style, the same buses sample for sample as style "B" and not A’s; an unknown style is refused', () => {
  assert.equal(S.ENDING_STYLE, 'B');
  const film = fresh();
  S.renderOutro(film, SR);
  const b = render({ style: 'B' });
  for (const [name, x] of Object.entries(film)) {
    const y = b[name];
    if (x.L) for (let i = at(O.OUTRO_START); i < N; i += 7) assert.ok(x.L[i] === y.L[i] && x.R[i] === y.R[i], `${name} at ${i}`);
    else for (let i = at(O.OUTRO_START); i < N; i += 7) assert.equal(x[i], y[i], `${name} at ${i}`);
  }
  const chordsA = mono(alone.chords);
  assert.ok(mono(film.chords).some((v, i) => v !== chordsA[i]), 'the film’s chords are not A’s');
  assert.throws(() => S.renderOutro(fresh(), SR, { style: 'C' }), /no ending style/);
});

test('ending B’s levels (the film’s; spec rev 11 §16: −20.1 / −18.8 / −13.9 / −12.4 / −16.2): outro 4 still the ending’s loudest bar, quieter than A only where A held its bed (outro 1, 3), the same from his bow; true peak under the ceiling; the lows mono', () => {
  const mB = mixdown(render({ style: 'B' }), SR);
  const bars = (m) => [...[1, 2, 3, 4].map((k) => lufs(m, O.at(k), O.at(k + 1))), lufs(m, O.at(5), O.LOOP)];
  const [a, b] = [bars(master), bars(mB)];
  const report = `A ${a.map((x) => x.toFixed(2)).join(' / ')} · B ${b.map((x) => x.toFixed(2)).join(' / ')}`;
  const want = [-20.1, -18.8, -13.9, -12.4, -16.2];
  b.forEach((x, k) => assert.ok(Math.abs(x - want[k]) <= 0.75, `B bar ${k + 1}: ${report}`));
  assert.ok(b[3] > Math.max(b[0], b[1], b[2], b[4]) + 0.5, `outro 4 is B's loudest bar: ${report}`);
  assert.ok(b[0] < a[0] - 1 && b[2] < a[2], `B is quieter where A held its bed: ${report}`);
  assert.ok(Math.abs(b[4] - a[4]) <= 0.3, `outro 5 as A: ${report}`);
  const all = { L: mB.L.slice(at(O.OUTRO_START), N), R: mB.R.slice(at(O.OUTRO_START), N) };
  assert.ok(truePeakDb(all.L, all.R) <= CEILING_DB + 0.005, `true peak ${truePeakDb(all.L, all.R).toFixed(2)}`);
  assert.ok(lowCorrelation(all.L, all.R, SR) >= 0.99, `lows ${lowCorrelation(all.L, all.R, SR).toFixed(3)}`);
});

test('ending B, outro 1–2: the e-piano is struck on the drawn events and rung out within about a beat (≥ 12 dB down by the end of its beat, then damped; no tremolo), where A holds its chords', () => {
  const hit = (style) => mono(render({ solo: ['outepiano'], style }).chords);
  const [a, b] = [hit('A'), hit('B')];
  const strikes = S.ENDING_B.piano.strikes;
  assert.deepEqual(strikes.map((s) => s.at), [O.OUTRO_START, O.STAMP, O.LUB[1], O.LAST_BEAT, O.LINE, O.BEEP], 'the relay, the stamp, 1.3, the ✓, the line, the beep');
  for (const s of strikes.filter((x) => !x.muffled && !x.sag)) {
    const [s0, s1] = [rms(b, at(s.at), at(s.at + 3)), rms(b, at(s.at + 21), at(s.at + 24))];
    assert.ok(db(s1 / s0) <= -12, `B's strike on ${s.at}: ${db(s1 / s0).toFixed(1)} dB by the end of its beat`);
  }
  // A's IV is held: a beat after 1.1 it is still within 6 dB of its strike; B's has rung out by then (the strike on 1.2 comes after).
  assert.ok(db(rms(a, at(O.OUTRO_START + 21), at(O.OUTRO_START + 24)) / rms(a, at(O.OUTRO_START), at(O.OUTRO_START + 3))) > -6, 'A holds the IV');
  // 1.4 (no strike): B is near silent there, A rings on.
  const [w0, w1] = [at(O.LINES[2]) + at(6), at(O.LAST_BEAT)];
  assert.ok(rms(b, w0, w1) < 0.1 * rms(a, w0, w1), `1.4: B ${rms(b, w0, w1).toExponential(2)} against A's ${rms(a, w0, w1).toExponential(2)}`);
});

test('ending B, outro 3–4: one swell from the iris, gone within two beats; no supersaw under the encore, a house-piano stab on each of its kicks instead', () => {
  const saws = (style) => mono(render({ solo: ['outtonic'], style }).chords);
  const [a, b] = [saws('A'), saws('B')];
  assert.ok(rms(b, at(O.OPEN), at(O.OPEN + 12)) > 0.5 * rms(a, at(O.OPEN), at(O.OPEN + 12)), 'B opens with the iris as A does');
  assert.equal(S.swellB(O.OPEN + 2 * 24), 0);
  assert.equal(peak(b, at(O.OPEN + 2 * 24) + 1, at(O.BOWS.hero)), 0, 'nothing of the saws from 3.3 to the button');
  assert.ok(rms(a, at(O.BURST), at(O.BOWS.hero)) > 0.01, 'A pumps its saws under the encore');
  const ev = S.renderOutro(fresh(), SR, { style: 'B', solo: [] });
  const stabs = ev.filter((e) => e.kind === 'outstab').map((e) => e.at);
  assert.deepEqual(stabs, O.KICKS.filter((f) => f !== O.BOWS.hero).map(at), 'a stab on each kick of the encore and the cat’s bow, none on the button');
  assert.deepEqual(of('outstab'), [], 'A has none');
  const keys = mono(render({ solo: ['outstab'], style: 'B' }).keys);
  for (const f of O.KICKS.filter((x) => x !== O.BOWS.hero)) {
    assert.ok(rms(keys, at(f), at(f + 3)) > 0.01, `a stab on ${f}`);
    assert.ok(rms(keys, at(f + 12), at(f + 24)) < 0.05 * rms(keys, at(f), at(f + 3)), `the stab on ${f} is short`);
  }
});

test('ending B keeps the button and its ring-out: from his bow the chord, its root and the sub are A’s sample for sample', () => {
  const b = render({ style: 'B' });
  for (const name of ['chords', 'sub']) {
    const [x, y] = [alone[name], b[name]];
    if (x.L) for (let i = at(O.BOWS.hero); i < N; i += 3) assert.ok(x.L[i] === y.L[i] && x.R[i] === y.R[i], `${name} at ${i}`);
    else for (let i = at(O.BOWS.hero); i < N; i += 3) assert.equal(x[i], y[i], `${name} at ${i}`);
  }
});

test('WP6 (v07, seam 5376): the glass of drop 2 rings into the blue screen — the IV’s tones falling from the music box’s hanging C♯6 on the burst’s 32nds, each panned further out; the hum swells in over the beat; B’s 1.1 IV struck an octave up, its top voice that C♯6', () => {
  const G = S.SEAM_GLASS;
  const pcs = new Set(S.VOICINGS_OUT.IV.map((m) => m % 12));
  assert.equal(G.notes[0], 85, 'C♯6: the music box’s last note (src/score/drop2.ts MUSIC_BOX)');
  G.notes.forEach((m, k) => {
    assert.ok(pcs.has(m % 12), `${m} is a tone of the IV`);
    if (k) {
      assert.ok(m < G.notes[k - 1], 'falling');
      assert.ok(Math.abs(G.pans[k]) > Math.abs(G.pans[k - 1]) && Math.sign(G.pans[k]) !== Math.sign(G.pans[k - 1]), 'each further out, side to side');
    }
  });
  // Under the downbeat: the first tink quieter than the next.
  assert.ok(G.gains[0] < G.gains[1]);
  const glass = mono(render({ solo: ['outcrown'] }).chime);
  for (let k = 0; k < G.notes.length; k++) assert.ok(rms(glass, at(O.OUTRO_START + 3 * k), at(O.OUTRO_START + 3 * k + 2)) > 0.003, `tink ${k} sounds`);
  assert.equal(peak(glass, 0, at(O.OUTRO_START)), 0, 'nothing before 1.1');
  // The hum: half a beat in it is still swelling; by the end of the beat it is whole (−30 dBFS, B1).
  const hum = render({ solo: ['outhum'] }).sub;
  const early = rms(hum, at(O.OUTRO_START), at(O.OUTRO_START + 3));
  const whole = rms(hum, at(O.OUTRO_START + S.HUM_SWELL), at(O.OUTRO_START + S.HUM_SWELL + 6));
  assert.ok(early < 0.1 * whole, `swelling: ${early.toExponential(2)} vs ${whole.toExponential(2)}`);
  assert.ok(Math.abs(20 * Math.log10(whole * Math.SQRT2 * 1.3 / 1.04) + 30) < 1.5, 'whole at −30 dBFS');
  // B's first strike an octave up, the stamp's back in the blue screen's register.
  const [first, stamp] = S.ENDING_B.piano.strikes;
  assert.deepEqual([first.at, first.chord, first.octave], [O.OUTRO_START, 'IV', 1]);
  assert.equal(stamp.octave ?? 0, 0);
  assert.equal(Math.max(...S.VOICINGS_OUT.IV) + 12 * first.octave, 85, 'its top voice the music box’s C♯6');
  const piano = mono(render({ solo: ['outepiano'], style: 'B' }).chords);
  const hz = peakHz(piano, at(O.OUTRO_START) + 600, at(O.OUTRO_START + 12), 900, 1200, 2);
  assert.ok(near(hz, midiHz(85), 0.02), `C♯6 sounds on 1.1 (${hz} Hz)`);
});
