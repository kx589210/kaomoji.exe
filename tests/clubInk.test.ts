// The comic club INK's dispatcher and hand-offs (src/shots/clubInk.ts, clubInkKit.ts, clubInkReadout.ts; build sheet
// notes/b58/club-sheet.md §5, §9–§10): every instant drawn by its part, sub-frames never crossing a cut, each frame's photography and
// look, the plates, the glass beat exactly v04's code path with v04's draws, and the party monitor ending on the box the break picks up.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { temporalSamples } from '../src/engine/temporal.ts';
import { ClubScene } from '../src/scenes/club.ts';
import * as C from '../src/score/club.ts';
import * as D1 from '../src/score/drop1.ts';
import { seedFrame } from '../src/score/film.ts';
import { GLASS_LOOK, PARTS, glassInstant, inkLookAt, inkPartAt, inkSegment, inkTemporal } from '../src/shots/clubInk.ts';
import {
  APPROACH_PUNCH, BUMP_KICKS, K, PAPER, PLATE_REST, PLATE_SLIP, PRINT_BUMP, SCREEN, type InkLayout, bumpAt, bumpDraws, bumpDrop, bumpPitch, bumpZoom, dropPose, plateAt,
} from '../src/shots/clubInkKit.ts';
import { INK_HUD_WINDOWS, inkHudContent, inkMonitorAt } from '../src/shots/clubInkReadout.ts';
import { GLASS, clubTemporal, glassFrame } from '../src/shots/glass.ts';
import { WARNINGS, hudContent } from '../src/shots/hud.ts';

const advance = (ch: string): number => (ch.charCodeAt(0) > 0x2000 ? 1 : 0.6);
const L: InkLayout = { advance: { face: advance, sfx: advance, ui: advance, display: advance, mono: advance, readout: advance } };

test('every instant of the club is drawn by its part, sub-frame instants routed by themselves (the dive at club 3.1, the crash zoom at 4.3, the throw at 5.3)', () => {
  for (const p of C.INK_PARTS) for (const f of [p.from, p.from + 0.25, p.to - 0.25]) assert.equal(inkPartAt(f), p.id, `${f}`);
  assert.equal(inkPartAt(C.RECORD - 0.1), 'splash');
  assert.equal(inkPartAt(C.LENS - 0.1), 'bar');
  assert.equal(inkPartAt(C.THROW - 0.1), 'incident');
  assert.equal(inkPartAt(C.HIT - 0.1), 'flight');
  assert.equal(inkPartAt(C.HIT), 'glass');
});

test('no sub-frame crosses a cut: every output frame’s shutter stays in its segment (E1 1919/1920, E6 club 4.1, E10 club 5.1, E14 the hit)', () => {
  for (let F = C.CLUB.from; F < C.CLUB.to; F++) {
    const seg = inkSegment(F);
    for (const s of temporalSamples(F, inkTemporal(F), seg)) assert.ok(s.frame >= seg.from && s.frame < seg.to, `${F}: ${s.frame}`);
    assert.ok(F >= seg.from && F < seg.to);
  }
  for (const cut of [C.CLUB.from, C.MATCH_CUP, C.KICK_CUP, C.HIT]) assert.equal(inkSegment(cut).from, cut);
});

test('fast moves blur instead of printing copies: the burst, the leaps and bands, the dive, the crash zoom take 64–96 sub-frames; the throw (U2: 0.35, the stamp and the page print whole) and the flight 32', () => {
  for (const F of [C.DOT_INKS, C.LEAPS[0].from + 6, C.LEAPS[1].from + 6, C.DIVE.from + 6, C.RECORD, C.CRASH_ZOOM.from + 6, C.LENS]) assert.ok(inkTemporal(F).samples >= 64, `${F}: ${inkTemporal(F).samples}`);
  for (const F of [C.PULL_BACK, C.RISE.from + 12, C.INSET_SLAM.from, C.PLATES.from]) assert.ok(inkTemporal(F).samples >= 48, `${F}`);
  assert.deepEqual(inkTemporal(C.THROW), { samples: 32, shutter: 0.35, persistence: 0 });
  assert.deepEqual(inkTemporal(C.THROW + 20), { samples: 32, shutter: 0.4, persistence: 0 });
  for (let F = C.CLUB.from; F < C.CLUB.to; F++) assert.ok(inkTemporal(F).samples >= 24, `${F}`);
});

test('the print: the comic pass on every comic frame (paper and key the palette’s, keylines the parts’ own), off inside the lens (the antivirus’s X-ray screen); never a look flash', () => {
  for (let F = C.CLUB.from; F < C.HIT; F++) {
    const look = inkLookAt(F);
    assert.equal(look.flash ?? 0, 0);
    assert.equal(look.bloom.intensity, 0, `${F}: no glow in the comic`);
    if (inkPartAt(F) === 'lens') {
      assert.equal(look.comic, undefined, `${F}`);
      continue;
    }
    assert.equal(look.comic?.amount, 1, `${F}`);
    assert.equal(look.comic?.outline, 0);
    assert.deepEqual([look.comic?.paper, look.comic?.key], [PAPER, K]);
  }
});

test('the plates: at rest (1.5, −1) off the key, slipping ≈ 12 px (plan v07 §4: 8 px did not read at 1×) on every clap in alternating directions, whole on the clap’s frame, springing back within 16 frames', () => {
  assert.deepEqual(plateAt(C.CLUB.from), [...PLATE_REST]);
  const slip = (i: number) => {
    const p = plateAt(C.CLAPS[i]);
    return [p[0] - PLATE_REST[0], p[1] - PLATE_REST[1]];
  };
  assert.deepEqual(slip(0), [...PLATE_SLIP]);
  assert.deepEqual(slip(1), [-PLATE_SLIP[0], -PLATE_SLIP[1]]);
  assert.ok(Math.abs(Math.hypot(...slip(0)) - 12) < 0.4);
  assert.deepEqual(plateAt(C.CLAPS[0] - 1), [...PLATE_REST], 'nothing before the clap');
  assert.deepEqual(plateAt(C.CLAPS[0] + 16), [...PLATE_REST]);
});

// ——— The print bump (continuity plan v07 §4): the ink grammar's kick ———————————————————————————————————————————————————————————————

test('the print bump: on every kick (the flam too) from the dot to the hit the page drops 6 px and its dots spread 16 → 18 px, whole on the kick’s frame, gone in 6 frames; nothing on the & or after the hit', () => {
  assert.deepEqual(BUMP_KICKS, [...C.KICKS, C.FLAM].filter((f) => f < C.HIT).sort((a, b) => a - b));
  for (const k of BUMP_KICKS) {
    assert.equal(bumpAt(k), 1, `${k}`);
    assert.equal(bumpDrop(k), PRINT_BUMP.drop);
    assert.equal(bumpPitch(k), 16 + PRINT_BUMP.pitch);
    const next = BUMP_KICKS.find((b) => b > k) ?? Infinity;
    const prev = [...BUMP_KICKS].reverse().find((b) => b < k) ?? -Infinity;
    if (k - prev > PRINT_BUMP.frames) assert.equal(bumpAt(k - 1), 0, `nothing before ${k}`);
    if (next - k > PRINT_BUMP.frames) assert.equal(bumpAt(k + PRINT_BUMP.frames), 0, `gone by ${k} + 6`);
    for (let t = 1; t < PRINT_BUMP.frames && k + t < next; t++) assert.ok(bumpAt(k + t) < bumpAt(k + t - 1), `${k}+${t} recovers`);
    // The kick's frame is the bump's biggest step (an impact): every later step is smaller.
    if (next - k > PRINT_BUMP.frames && k - prev > PRINT_BUMP.frames) for (let t = 1; t < PRINT_BUMP.frames; t++) assert.ok(bumpAt(k + t - 1) - bumpAt(k + t) < 1 - bumpAt(k - 1));
  }
  for (const f of C.OPEN_HATS) if (!BUMP_KICKS.some((k) => f - k >= 0 && f - k < PRINT_BUMP.frames)) assert.equal(bumpAt(f), 0, `no bump on the & ${f}`);
  for (let f = C.HIT; f < C.CLUB.to; f++) assert.equal(bumpAt(f), 0, `${f}`);
  // Sub-frames take their output frame's bump (whole, never smeared).
  assert.equal(bumpAt(C.KICKS[3] - 0.3), 1);
  assert.equal(bumpAt(C.KICKS[3] - 0.6), 0);
  // The looks print the spread: the comic pass's pitch on every printed frame but the flight (its own plates).
  for (const k of BUMP_KICKS.filter((f) => inkPartAt(f) !== 'lens')) assert.equal(inkLookAt(k).comic?.pitch, 18, `${k}`);
  assert.equal(inkLookAt(C.KICKS[1] + 12).comic?.pitch, 16);
});

test('the bump moves every draw of a frame alike: the pose dropped 6 px on screen (frontal or the receding page’s tilt), the approach’s kicks punched 4 % in for 2 frames', () => {
  const front = SCREEN;
  const d = dropPose(front, 6);
  assert.ok(Math.abs(d.position[1] - front.position[1] - 6) < 1e-9 && Math.abs(d.target[1] - front.target[1] - 6) < 1e-9, 'the camera up 6 px: the page down 6 px');
  const z = dropPose(front, 0, 0.04);
  const dist = (q: typeof front) => Math.hypot(q.position[0] - q.target[0], q.position[1] - q.target[1], q.position[2] - q.target[2]);
  assert.ok(Math.abs(dist(front) / dist(z) - 1.04) < 1e-9, '4 % closer');
  assert.deepEqual(APPROACH_PUNCH.kicks, C.KICKS.filter((k) => k >= C.club(6) && k < C.HIT));
  for (const k of APPROACH_PUNCH.kicks) assert.deepEqual([bumpZoom(k - 1), bumpZoom(k), bumpZoom(k + 1), bumpZoom(k + 2), bumpZoom(k + 3)], [0, 0.04, 0.025, 0.01, 0]);
  for (const k of C.KICKS.filter((f) => f < C.club(6))) assert.equal(bumpZoom(k), 0);
  const draws = PARTS.splash.frame(C.KICKS[2], L);
  const bumped = bumpDraws(draws, C.KICKS[2]);
  assert.equal(bumped.length, draws.length);
  bumped.forEach((b, i) => assert.deepEqual(b.pose, dropPose(draws[i].pose, 6)));
  assert.deepEqual(bumpDraws(draws, C.KICKS[2] + 12).map((b) => b.pose), draws.map((b) => b.pose), 'between kicks: untouched');
});

test('every part draws its frame from a ground (its first draw brings paper); the parts are the builders’ (stubs until built)', () => {
  for (const p of C.INK_PARTS) {
    if (p.id === 'glass') continue;
    for (const f of [p.from, (p.from + p.to) / 2, p.to - 1]) {
      const draws = PARTS[p.id].frame(f, L);
      assert.ok(draws.length > 0 && draws[0].paper, `${p.id} at ${f}`);
    }
  }
});

test('the glass beat is v04’s code path at v04’s instants: the same time after the hit, so the same tremble draws (seeded as old 1896 + k), the same sub-frames and look', () => {
  for (let k = 0; k < C.SMASH - C.HIT; k++) {
    const g = glassInstant(C.HIT + k);
    assert.equal(g, GLASS.hit + k);
    assert.equal(seedFrame(g), seedFrame(C.SMASH) - 24 + k, `the jitter draw of old ${1896 + k}`);
    assert.deepEqual(glassFrame(g, advance), glassFrame(GLASS.hit + k, advance));
    assert.deepEqual(inkTemporal(C.HIT + k), clubTemporal(GLASS.hit + k));
  }
  assert.deepEqual(inkTemporal(C.HIT), { samples: 96, shutter: 0.5, persistence: 0 });
  assert.deepEqual(GLASS_LOOK, new ClubScene().look(), 'the club neon look, exactly');
  for (let F = C.HIT; F < C.SMASH; F++) assert.deepEqual(inkLookAt(F), GLASS_LOOK);
});

test('the party monitor: up on the dance floor (club 3.2 → 4.1) and from the trap to the glass (5.2 → break 1.1), memory 128 % from the throw, the warnings of threads.md', () => {
  assert.deepEqual(INK_HUD_WINDOWS.map((w) => [...w]), [[C.READOUT_A.from, C.READOUT_A.to], [C.READOUT_C.from, C.READOUT_C.to]]);
  for (const f of [C.CLUB.from, C.SWAP - 1, C.MATCH_CUP, C.LIGHTS_OUT - 1]) assert.equal(inkHudContent(f, advance).under.length, 0, `none at ${f}`);
  const line = (f: number) => inkMonitorAt(f).warning?.text;
  assert.equal(line(C.SWAP), '[WARN] cuteness exceeds safe limits');
  assert.equal(line(C.FLOWER), '[SCAN] dance floor … threats: ∞');
  assert.equal(line(C.LIGHTS_OUT), '[WARN] honeypot triggered');
  assert.equal(line(C.THROW), '[QUARANTINE] (•ω•)');
  assert.equal(line(C.HIT), '[FATAL] screen integrity 0%');
  assert.deepEqual([inkMonitorAt(C.THROW - 1).memory, inkMonitorAt(C.THROW).memory], [99, 128]);
  assert.equal(WARNINGS[WARNINGS.length - 1].text, line(C.HIT), 'the break’s falling monitor reads hud.ts’s last warning: the same words');
});

test('the club’s last box is the box the break picks up on break 1.1 today (v04’s last club frame), glyph for glyph', () => {
  assert.deepEqual(inkHudContent(C.SMASH - 1, advance), hudContent(D1.CLUB_END - 1, advance));
  assert.deepEqual(inkHudContent(C.HIT, advance), hudContent(D1.HIT, advance), 'and on the hit');
});
