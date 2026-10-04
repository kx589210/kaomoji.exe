// v2 of the flat bars (break 2–5), the world (src/shots/breakWorld.ts, the v2 half; sheet notes/bid2/break-sheet2.md §3, §6.4–§6.5,
// the design's §5.4): the floor band and its tilt, the heap, the pill drop, the re-roll and the tofu block, the sag and the tip, the far
// blobs and the front confetti, the v2 peeks, the spying guest the ripple infects. The v04 layer (v2 off) is untouched.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DIAMOND,
  FLAT,
  FLOOR_BAND,
  GUEST_DUCK,
  GUEST_SPY,
  HANG,
  HEAP,
  INFECT,
  INFECT_FLASH,
  MORPH,
  PILL_DROP,
  REROLL,
  SKID,
  TILT,
  TOFU,
  WIPE_COVER,
} from '../src/score/break.ts';
import { partFrame } from '../src/score/film.ts';
import { BAR22_BLOCKS, BREAK_HEX, DEPTH, V2_HEX, depthZoom, flatCamV2, frameOf, toScreen } from '../src/shots/breakShared.ts';
import {
  FAR_BLOB_LAYOUT,
  FLOOR,
  GUEST_FACE,
  GUEST_PIECES,
  GUEST_STICKER,
  GUEST_V2,
  REEL,
  REELS,
  SQUIGGLE_V2,
  type SdfItem,
  blockAt,
  coralTip,
  farBlobsAt,
  floorBandAt,
  floorTilt,
  guestAt,
  hangSag,
  infectPop,
  peekAt,
  reelAt,
  reelColors,
  rerollColor,
  tofuCross,
  worldAt,
} from '../src/shots/breakWorld.ts';
import { MONITOR_BOX_V2 } from '../src/shots/breakSystem.ts';

const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);
const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const item = (f: number, base: string, role: SdfItem['role'] = 'block'): SdfItem => worldAt(f, true).items.find((i) => i.role === role && (i.base ?? i.colorName) === base)!;

test('the v04 layer is untouched: worldAt / blockAt / peekAt with v2 off are v04’s', () => {
  for (let f = FLAT.from; f < FLAT.to; f += 13.5) {
    assert.deepEqual(worldAt(f, false), worldAt(f));
    assert.deepEqual(peekAt(f, false), peekAt(f));
    assert.deepEqual(blockAt(f, 'coral', false), blockAt(f, 'coral'));
  }
});

test('the floor band: rises in with the pool from 2.2, its top edge on world y 900 once settled, drawn until the mint ground replaces it (4.1 + 10)', () => {
  assert.equal(floorBandAt(FLOOR_BAND - 1), null);
  const b = floorBandAt(FLOOR_BAND + 24)!;
  near(b.edge[0][1], FLOOR.top, 0.5, 'top edge (left end)');
  near(b.edge[1][1], FLOOR.top, 0.5, 'top edge (right end)');
  assert.ok(b.edge[0][0] <= -400 && b.edge[1][0] >= 2400, 'its ends past every framing');
  assert.ok(floorBandAt(DIAMOND + 9) !== null);
  assert.equal(floorBandAt(DIAMOND + 10), null);
});

test('3.3, THE FLOOR TILTS: −10° (a launch on the clap) about (960, 1000) — the band and what stands on it; the far blobs, the confetti, the floating blocks stay level', () => {
  assert.equal(floorTilt(TILT - 0.5), 0);
  assert.ok(floorTilt(TILT + 3) < -7, 'three quarters in 3 frames');
  near(floorTilt(TILT + 12), -10, 1e-9, 'settled');
  const before = worldAt(TILT - 1, true).items;
  const after = worldAt(TILT + 11.9, true).items;
  for (const it of after) {
    const was = before.find((b) => b.role === it.role && b.base === it.base && b.colorName === it.colorName)!;
    if (!was) continue;
    const turned = it.rot - was.rot;
    // The coral turns with the floor; the mint turns with it and tumbles +16° as it slides into the heap.
    if (it.role === 'block' && it.base === 'coral') assert.ok(turned < -8, `the coral turns with the floor (${turned.toFixed(1)}°)`);
    else if (it.role === 'block' && it.base === 'mint') near(turned, -10 + 16, 3, 'the mint: the tilt and its tumble');
    else if (it.role === 'confetti') assert.equal(it.rot, worldAt(TILT + 11.9).items.find((v) => v.role === 'confetti' && v.colorName === it.colorName)!.rot, 'the confetti keep their own turn (in the air)');
    else assert.ok(Math.abs(turned) < 3, `${it.role} ${it.base} stays level (${turned.toFixed(1)}°: its breath only)`);
  }
  // The band's left end drops: its top edge at the frame's left is lower than at its right.
  const band = floorBandAt(TILT + 12)!;
  assert.ok(band.edge[0][1] > band.edge[1][1] + 400);
});

test('3.3 → 3.3&: the coral and the mint skid downhill (ease-in) and land in a heap at the low end on HEAP, squashing 1.06 / 0.94', () => {
  const m0 = item(SKID.from, 'mint');
  const mMid = item(SKID.from + 6, 'mint');
  const m1 = item(HEAP, 'mint');
  const c1 = item(HEAP, 'coral');
  assert.ok(m0.x - mMid.x < (m0.x - m1.x) / 2, 'ease-in: less than half the way at half time');
  assert.ok(m0.x - m1.x > 900, `the mint slides across the floor (${(m0.x - m1.x).toFixed(0)} px)`);
  assert.ok(Math.abs(m1.x - c1.x) < 600, 'the mint lands against the coral');
  near(m1.hx / (BAR22_BLOCKS.mint.w / 2), 1.06, 0.03, 'heap squash (along the slide)');
  assert.ok(item(HEAP + 14, 'mint').hx / (BAR22_BLOCKS.mint.w / 2) < 1.005, 'springs back');
});

test('2.3: the lock knocks the yellow pill off its perch — 140 px down-right, −20°, landing (I) on 2.3&, and it stays askew', () => {
  const y0 = item(PILL_DROP.from - 1, 'yellow');
  const y1 = item(PILL_DROP.to + 14, 'yellow');
  near(Math.hypot(y1.x - y0.x, y1.y - y0.y), 140, 1, 'slide');
  assert.ok(y1.rot - y0.rot < -18, 'turned');
  const late = item(at(4, 2), 'yellow');
  assert.ok(Math.hypot(late.x - y0.x, late.y - y0.y) > 130, 'still askew in bar 4');
});

test('4.1 (C4): the mint leaps out of the heap, spins +45° and grows ×8 to the frame’s centre, then the ground is mint', () => {
  const heap = item(DIAMOND - 1, 'mint');
  const d = item(DIAMOND + 5, 'mint');
  assert.ok(d.scale > 4 && d.x > heap.x, 'out of the heap and growing');
  near(d.rot - heap.rot, 45 * (1 - (1 - 6 / 10) ** 3), 2, 'spinning');
  assert.equal(worldAt(DIAMOND + 10, true).items.find((i) => i.base === 'mint' && i.role === 'block'), undefined);
});

test('4.2 → 4.2& (keep-fixer round 1, REROLL-BLINK): the world re-rolls as a slot machine — every block a reel spinning from 4.2, slowing, stopping on 4.2&’s kick with a clunk — and lands wrong: yellow ↔ violet, the coral as it was, the cream square a tofu block', () => {
  // The landed colours (rerollColor): the block's own until TOFU, then wrong, until the restart wipe covers the frame.
  for (const c of ['yellow', 'violet', 'coral', 'cream'] as const) for (const r of REROLL) assert.equal(rerollColor(c, r), c, `${c} keeps its own fill on ${r} (the reel draws the spin)`);
  assert.equal(rerollColor('yellow', TOFU), 'violet');
  assert.equal(rerollColor('violet', TOFU), 'yellow');
  assert.equal(rerollColor('coral', TOFU), 'coral');
  assert.equal(rerollColor('cream', TOFU), 'cream');
  assert.equal(rerollColor('yellow', WIPE_COVER), 'yellow');
  assert.equal(item(TOFU, 'yellow').colorName, 'violet');
  assert.equal(tofuCross(TOFU - 1).length, 0);
  assert.equal(tofuCross(TOFU).length, 2, 'the tofu block’s X');
  // Every block is a reel from REEL.from to the clunk's end; the mint (the ground) is not.
  for (const base of ['yellow', 'violet', 'coral'] as const) {
    assert.equal(item(REEL.from - 1, base).reel, undefined, `${base} still before 4.2`);
    assert.ok(item(REEL.from + 0.5, base).reel, `${base} spins`);
    assert.ok(item(TOFU + 4, base).reel, `${base} clunks`);
    assert.equal(item(TOFU + REEL.settle, base).reel, undefined, `${base} a block again`);
  }
  assert.ok(item(REEL.from + 5, 'cream', 'square').reel, 'the cream square spins');
  assert.equal(reelAt('mint', REEL.from + 5), null);
  // The spin: from 0, monotonic, fast to a crawl, exactly on the landing symbol on TOFU, past it and back (the clunk), exactly on it by the settle.
  for (const base of ['yellow', 'violet', 'coral', 'cream'] as const) {
    const r = REELS[base];
    const s = (f: number) => reelAt(base, f)!.s;
    near(s(REEL.from), 0, 1e-9, `${base} starts at its own symbol`);
    for (let f = REEL.from + 0.25; f < TOFU; f += 0.25) assert.ok(s(f) > s(f - 0.25), `${base} spins forward on ${f}`);
    const v0 = s(REEL.from + 0.5) - s(REEL.from);
    const v1 = s(TOFU) - s(TOFU - 0.5);
    assert.ok(v0 > 1.4 * v1, `${base} slows: ${v0.toFixed(2)} → ${v1.toFixed(2)} symbols a half frame`);
    near(s(TOFU), r.symbols, 1e-9, `${base} on the landing symbol on TOFU`);
    assert.ok(s(TOFU + 1) > r.symbols + 0.1, `${base} runs on past the stop`);
    near(reelAt(base, TOFU + REEL.settle - 1e-6)!.s, r.symbols, 1e-3, `${base} settled`);
    assert.equal(reelAt(base, TOFU)!.land, r.symbols - 1, 'the landing colour fills the whole window at rest');
    // The landing colour scrolls in over the last 3 frames only (the window shows symbols ⌊s − ½⌋ … ⌊s + 3/2⌋).
    assert.ok(s(TOFU - 3) + 1.5 < r.symbols - 1, `${base}: no landing colour 3 frames before the kick`);
  }
  // Photosensitivity: every reel's spin colours share its block's lightness (< 0.06 apart) and none is the ground's mint.
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const hex = (c: string): string => (c in V2_HEX ? V2_HEX[c as keyof typeof V2_HEX] : BREAK_HEX[c as keyof typeof BREAK_HEX]);
  for (const base of ['yellow', 'violet', 'coral', 'cream'] as const) {
    const L = REELS[base].spin.map((c) => lum(hex(c)));
    assert.ok(Math.max(...L) - Math.min(...L) < 0.06, `${base}'s reel spans ${L.map((l) => l.toFixed(3)).join(' / ')}`);
    assert.ok(!(REELS[base].spin as readonly string[]).includes('mint') && REELS[base].land !== 'mint', `${base}'s reel never shows the mint ground`);
    assert.equal(REELS[base].spin[0], base, 'symbol 0 is the block’s own colour (no jump when the reel starts)');
    assert.equal(REELS[base].land, rerollColor(base, TOFU), 'the reel lands on the landed colour');
  }
  // The scene's strips: four colours each, in strip order.
  assert.equal(reelColors(REEL.from + 3).length, 16);
});

test('4.4, the hang, bigger: the world sags 60 px (the camera’s 20 + 40), the crooked coral tips 30° more over its low corner', () => {
  assert.equal(hangSag(HANG - 1), 0);
  near(hangSag(HANG + 12), 40, 1e-9, 'sag');
  near(coralTip(HANG + 12), -30, 1e-9, 'tip');
  const c0 = item(HANG - 1, 'coral');
  const c1 = item(HANG + 12, 'coral');
  near(c1.rot - c0.rot, -30, 0.5, 'the coral tips');
  assert.equal(hangSag(WIPE_COVER), 0);
});

test('the far blobs (back depth, z −900): three pale blobs rising in on 2.2; on bar 4’s wide frame at least two are 60 % in frame, none behind the monitor', () => {
  assert.equal(farBlobsAt(MORPH.from - 1).length, 0);
  assert.equal(farBlobsAt(MORPH.from + 30).length, 3);
  for (const b of farBlobsAt(MORPH.from + 30)) assert.equal(b.z, DEPTH.back);
  const monitor = { x0: 40, x1: 46 + MONITOR_BOX_V2.cols * 0.6 * MONITOR_BOX_V2.size + 6, y0: 1080 - 46 - 5 * 27 - 4, y1: 1080 - 40 };
  for (let f = at(4) + 12; f <= at(4, 2.5); f += 6) {
    const c = flatCamV2(f);
    const s = depthZoom(c.zoom, DEPTH.back);
    let inFrame = 0;
    for (const b of FAR_BLOB_LAYOUT) {
      const x0 = 960 + s * (b.x - b.w / 2 - c.cx);
      const x1 = 960 + s * (b.x + b.w / 2 - c.cx);
      const y0 = 540 + s * (b.y - b.h / 2 - c.cy);
      const y1 = 540 + s * (b.y + b.h / 2 - c.cy);
      const vis = (Math.max(0, Math.min(1920, x1) - Math.max(0, x0)) * Math.max(0, Math.min(1080, y1) - Math.max(0, y0))) / ((x1 - x0) * (y1 - y0));
      if (vis >= 0.6) inFrame++;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      assert.ok(!(cx > monitor.x0 && cx < monitor.x1 && cy > monitor.y0 && cy < monitor.y1), `blob ${b.tint} centre behind the monitor on ${f}`);
    }
    assert.ok(inFrame >= 2, `${inFrame} blobs 60 % in frame on ${f}`);
  }
});

test('the confetti fly to the front depth with the morph: under the reference camera exactly where v04 put them, then sliding ≈ 1.2–1.4× faster than the world behind them', () => {
  const ref = MORPH.from;
  const v04 = worldAt(ref).items.filter((i) => i.role === 'confetti');
  const v2 = worldAt(ref, true).items.filter((i) => i.role === 'confetti');
  v04.forEach((c, k) => {
    near(v2[k].x, c.x, 1e-6, 'x');
    near(v2[k].y, c.y, 1e-6, 'y');
  });
  // From 2.2 + 30 to 2.4 the camera eases back out: a front confetto moves farther across the screen than a mid point beside it.
  const a = MORPH.to + 10;
  const b = at(2, 4);
  const conf = (f: number) => worldAt(f, true).items.filter((i) => i.role === 'confetti')[3];
  const move = (p: { x: number; y: number }, q: { x: number; y: number }, fa: number, fb: number) => {
    const s0 = toScreen(flatCamV2(fa), p.x, p.y);
    const s1 = toScreen(flatCamV2(fb), q.x, q.y);
    return Math.hypot(s1[0] - s0[0], s1[1] - s0[1]);
  };
  const c0 = conf(a);
  const c1 = conf(b);
  const front = move(c0, c1, a, b);
  const mid = move({ x: c0.x, y: c0.y }, { x: c0.x, y: c0.y }, a, b);
  assert.ok(front > 1.1 * mid, `front ${front.toFixed(0)} px vs mid ${mid.toFixed(0)} px`);
});

test('the v2 peeks: the dog, the waver, the guest on 3.2& (gone under the scan-wipe), the uneasy one — and no peeker on 4.2& → 4.4 (the two cut)', () => {
  assert.ok(peekAt(at(3, 2.5) + 6, true).some((p) => p.color === 'red'), 'the guest peeks on 3.2&');
  assert.equal(peekAt(at(3, 3.5) + 3, true).length, 0, 'gone once the POV has swept');
  for (let f = at(4, 2.5); f < at(4, 4); f += 1) assert.equal(peekAt(f, true).length, 0, `no peeker on ${f}`);
});

test('5.3 → 5.4& (keep-fixer round 1, F5): the guest spies — a red sticker (￣▽￣), em ≥ 150, capsule eyes and a filled ▽ — beside the cat’s block; INFECT turns his ▽ into the hero’s amber ω; one wave (ノ); he ducks behind the violet block', () => {
  assert.equal(guestAt(GUEST_SPY.from - 1), null);
  const spy = guestAt(INFECT - 3)!;
  assert.ok(GUEST_V2.size >= 150, `em ${GUEST_V2.size}`);
  assert.equal(spy.size, GUEST_V2.size);
  near(spy.x, GUEST_V2.x, 1, 'out at his spot');
  const kinds = spy.pieces.map((p) => p.kind).sort();
  assert.deepEqual(kinds, ['bar', 'bar', 'glyph', 'glyph', 'tri'], 'two bracket glyphs, two capsule eyes, the ▽');
  for (const p of spy.pieces) assert.equal(p.color, 'red');
  for (const p of spy.pieces) if (p.kind === 'bar') assert.ok(p.width >= 12, 'eyes at least 12 px thick inside their outline');
  assert.ok(GUEST_STICKER.outline >= 5 && GUEST_STICKER.shadow >= 8, 'the sticker style');
  const inf = guestAt(INFECT + 1)!;
  assert.equal(inf.pieces.find((p) => p.kind === 'tri'), undefined, 'the ▽ is gone');
  const w = inf.pieces.find((p) => p.kind === 'glyph' && p.key === GUEST_PIECES.mouth);
  assert.ok(w && w.kind === 'glyph' && w.color === 'amber' && w.font === 'hero', 'the hero’s amber ω');
  assert.ok(guestAt(INFECT + 6)!.pieces.some((p) => p.kind === 'glyph' && p.key === GUEST_PIECES.hand), 'the wave');
  assert.ok(guestAt(GUEST_DUCK.to - 1)!.x > GUEST_V2.x + 100, 'ducking back behind the block (cubic in: fastest as he goes)');
  assert.equal(guestAt(GUEST_SPY.to), null);
});

test('F5: the infection is its own beat — on INFECT the ω pops 0.6 → 1.3 → 1 over 5 frames, his face takes the hit, and an amber burst (two rings, five sparks) rings out over 12 frames', () => {
  const omega = (f: number) => guestAt(f)!.pieces.find((p) => p.kind === 'glyph' && p.key === GUEST_PIECES.mouth) as { size: number } | undefined;
  const base = GUEST_FACE.omega.size * GUEST_V2.size;
  assert.equal(omega(INFECT - 1), undefined);
  // Every sub-frame instant of INFECT's shutter (± 0.25) shows the ω at ≥ 0.6 of its size: never a half-exposed sliver.
  for (const d of [-0.25, -0.1, 0, 0.1, 0.24]) assert.ok(omega(INFECT + d)!.size >= 0.6 * base - 1e-9, `ω on ${d}`);
  near(infectPop(0), 0.6, 1e-9, 'pop from 0.6');
  near(infectPop(2), 1.3, 1e-9, 'to 1.3');
  near(infectPop(5), 1, 1e-9, 'back to 1');
  assert.ok(omega(INFECT + 2)!.size > 1.2 * base, 'the peak lands on INFECT + 2');
  near(omega(INFECT + 8)!.size, base, 1e-6, 'settled');
  assert.equal(guestAt(INFECT - 1)!.rings.length, 0);
  assert.ok(guestAt(INFECT + 3)!.rings.length === 2 && guestAt(INFECT + 3)!.sparks.length === 5, 'the burst');
  const r = (f: number) => guestAt(f)!.rings[0].r;
  assert.ok(r(INFECT + 6) > r(INFECT + 2), 'the rings grow');
  assert.equal(guestAt(INFECT + 11)!.rings.length, 0, 'the rings are over by INFECT + 11, as he ducks');
});

test('ruling R-F4 (kept with F5): the guest spies ≥ 40 px clear of the confetti (bar 5’s mint squiggle re-pops left of his spot) and clear of the hero’s head — his face is the beat', () => {
  const S = GUEST_V2.size;
  // His face's box about his centre (ems): the brackets ±1.45, the eyes' top and the brackets' feet ±0.6.
  for (let f = GUEST_SPY.from + 6; f < GUEST_DUCK.from; f += 1) {
    const cam = flatCamV2(f);
    const g = guestAt(f)!;
    const [x0, y0] = toScreen(cam, g.x - 1.45 * S, g.y - 0.6 * S);
    const [x1, y1] = toScreen(cam, g.x + 1.45 * S, g.y + 0.6 * S);
    for (const it of worldAt(f, true).items.filter((i) => i.role === 'confetti')) {
      const [x, y] = toScreen(cam, it.x, it.y);
      // The confetto's reach as it turns: its half diagonal, scaled with its depth and the camera.
      const reach = Math.hypot(it.hx, it.hy) * it.scale * cam.zoom;
      const dx = Math.max(x0 - x, 0, x - x1);
      const dy = Math.max(y0 - y, 0, y - y1);
      const gap = Math.hypot(dx, dy) - reach;
      assert.ok(gap >= 40, `confetti ${it.colorName} ${gap.toFixed(0)} px from his face on +${f - at(1)}`);
    }
    // His brackets' feet stay above the hero's head (world y 352 at its tallest, measured on the v04 master).
    assert.ok(g.y + 0.6 * S < 352 - 10, 'clear of his head');
  }
  // The squiggle's new spot is v2's only: the v04 layer keeps v04's.
  const sq = (v2: boolean) => worldAt(at(5, 3), v2).items.find((i) => i.role === 'confetti' && i.colorName === 'mint')!;
  near(sq(false).x, 1260, 1e-9, 'v04 x');
  assert.ok(Math.abs(sq(true).x - SQUIGGLE_V2[0]) < 60, 'v2 re-pops at its new spot (parallax aside)');
});

test('ruling R-F3, the infection reads on him: the ripple’s outline never reaches his eyes (it stops at ×1.45 about (960, 540)), so he flashes amber himself over INFECT_FLASH — an amber halo outside his ink, whole on each frame', () => {
  for (let f = GUEST_SPY.from; f < GUEST_SPY.to; f += 0.25) {
    const flash = frameOf(f) >= INFECT_FLASH.from && frameOf(f) < INFECT_FLASH.to;
    assert.equal(guestAt(f)!.halo, flash ? 1 : 0, `halo on ${f}`);
  }
});
