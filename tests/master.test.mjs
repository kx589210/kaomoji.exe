// The master (iteration 2, the director's ruling 16; sync review 10): the mix is limited to −1.5 dBTP, and the finished mix is
// re-limited after the edits bgm.mjs makes past the limiter (drop 1's stutter, each later section's finish()), so no peak of bgm.wav
// is over it. v01 peaked at −1.13 dBTP (the stutter's splice) and its AAC at −0.80: a re-encode needs the headroom. Iteration 4: the
// delivered MP4 must hold −1.5 too, and its AAC lifts the peaks by up to 0.4 dB, so the finished mix is turned down by one gain,
// −0.5 dB, to a −2.0 dBTP master ceiling. A lower limit instead squeezed the loud passages (drop 1's brightness over the build, break 6.4's rise).
import assert from 'node:assert/strict';
import test from 'node:test';
import { mixdown, renderStems, SR } from '../scripts/audio/bgm.mjs';
import { CEILING_DB, LIMIT_DB, MASTER_TRIM_DB, limit } from '../scripts/audio/limiter.mjs';
import { truePeakDb } from '../scripts/audio/meter.mjs';
import { BANG_TRIM, bangTrimDb } from '../scripts/audio/sections/cosmos.mjs';
import { BANG, STUTTER } from '../src/score/cosmos.ts';
import { TAILS, TOTAL_BARS, TOTAL_FRAMES, partEnd, partFrame, partStart } from '../src/score/film.ts';
import { SECTIONS } from '../src/score/shots.ts';
import { FPS, barFrame } from '../src/score/tempo.ts';

const at = (frame) => Math.round((frame / FPS) * SR);

test('the mix is limited to −1.5 dBTP and the master trimmed 0.5 dB to a −2.0 dBTP ceiling (the MP4’s AAC then holds −1.5), the limiter’s default', () => {
  assert.equal(LIMIT_DB, -1.5);
  assert.equal(CEILING_DB, -2.0);
  assert.equal(MASTER_TRIM_DB, -0.5);
  const L = Float32Array.from({ length: SR / 2 }, (_, i) => 1.6 * Math.sin((2 * Math.PI * 997 * i) / SR));
  const R = L.slice();
  limit(L, R, SR);
  assert.ok(truePeakDb(L, R) <= CEILING_DB + 1e-3, `${truePeakDb(L, R).toFixed(2)} dBTP`);
});

const { stems } = renderStems(SR);
/** The finished mix (the stutter and every finish() applied), and the mix before those edits. */
const master = mixdown(stems, SR);
const plain = mixdown(stems, SR, { stutter: false });

test('the master trim is one gain: the finished mix is the mix at the limit × −0.5 dB, sample for sample, and sits on the ceiling', () => {
  const atLimit = mixdown(stems, SR, { trim: false });
  const g = 10 ** (MASTER_TRIM_DB / 20);
  for (const [a, b] of [[atLimit.L, master.L], [atLimit.R, master.R]]) {
    for (let i = 0; i < a.length; i++) if (Math.fround(a[i] * g) !== b[i]) assert.fail(`sample ${i}: ${a[i]} × ${g} ≠ ${b[i]}`);
  }
  const tp = truePeakDb(master.L, master.R);
  assert.ok(tp > CEILING_DB - 0.1 && tp <= CEILING_DB, `the film peaks at ${tp.toFixed(3)} dBTP`);
  assert.ok(truePeakDb(atLimit.L, atLimit.R) > LIMIT_DB - 0.1, 'and the mix at the limit rides it');
});

test('every section of the finished mix stays under the ceiling, the edits made past the limiter included (the stutter, each finish())', () => {
  for (const s of SECTIONS) {
    const a = at(barFrame(s.fromBar));
    const b = Math.min(master.L.length, at(barFrame(s.toBar + 1)));
    const tp = truePeakDb(master.L.subarray(a, b), master.R.subarray(a, b));
    assert.ok(tp <= CEILING_DB + 0.005, `${s.id}: ${tp.toFixed(2)} dBTP`);
  }
  assert.ok(truePeakDb(master.L, master.R) <= CEILING_DB + 0.005, `the film: ${truePeakDb(master.L, master.R).toFixed(2)} dBTP`);
});

// The film's stutter is the cosmos's (src/score/cosmos.ts, cosmos 6.4 → club 1.1, cut by sections/cosmos.mjs finish()); v04's at cosmos 4.3
// (src/score/drop1.ts) is retired with v04's cosmos music.
// On v08 (2026-10-03) the bang went down (sections/cosmos.mjs BANG_TRIM, a finish() edit: one gain on cosmos 1.1 → 2.1, which
// only lowers, so the re-limit leaves it be): there the finished mix is the unedited mix × that gain.
test('the re-limit touches only what the edits pushed over: the film up to the stutter (cosmos 6.4) is the unedited mix, sample for sample (× the bang’s trim on cosmos 1.1 → 2.1)', () => {
  const end = at(STUTTER.from) - Math.round(0.006 * SR); // the limiter's 5 ms look-ahead ramps in before an over
  const [t0, t1] = [at(BANG), at(BANG_TRIM.to)];
  for (let i = 0; i < end; i += 3) {
    if (i >= t0 && i < t1) {
      const g = 10 ** (bangTrimDb((i / SR) * FPS) / 20);
      if (Math.abs(master.L[i] - plain.L[i] * g) > 1e-6 || Math.abs(master.R[i] - plain.R[i] * g) > 1e-6) assert.fail(`sample ${i} (frame ${((i / SR) * FPS).toFixed(1)}) is not the trim`);
    } else if (master.L[i] !== plain.L[i] || master.R[i] !== plain.R[i]) assert.fail(`sample ${i} (frame ${((i / SR) * FPS).toFixed(1)}) changed`);
  }
});

test('the 63-bar map: the soundtrack runs all 63 bars (v08: the two bridges), the transition and every bar of the cosmos have music (its bars 5–6 built, no longer held), and a held tail, if any, is digital zero', () => {
  const quiet = (from, to) => {
    let peak = 0;
    for (let i = at(from); i < Math.min(master.L.length, at(to)); i++) peak = Math.max(peak, Math.abs(master.L[i]), Math.abs(master.R[i]));
    return peak;
  };
  assert.equal(TOTAL_BARS, 63);
  assert.equal(master.L.length, at(TOTAL_FRAMES), 'the soundtrack runs all 63 bars');
  assert.ok(quiet(partStart('transition'), partEnd('transition')) > 0.1, `the transition peaks at ${quiet(partStart('transition'), partEnd('transition'))}`);
  for (let bar = 1; bar <= 6; bar++) {
    const peak = quiet(partFrame('cosmos', bar), partFrame('cosmos', bar + 1));
    assert.ok(peak > 0.1, `cosmos bar ${bar} peaks at ${peak}`);
  }
  // Each tail fades out over its first 1.5 ms (SPLICE_MS), so nothing before it is touched; from its second frame on it is exactly 0.
  for (const t of TAILS) assert.equal(quiet(t.from + 1, t.to), 0, `${t.id}'s held bars ${t.from}–${t.to}`);
});
