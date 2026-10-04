import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BURST_FACES } from '../src/content/castDrop1.ts';
import type { Pose } from '../src/engine/camera.ts';
import { BANG_KICKS, BURST, FILL, FREEZE, LEVELS, RESUME } from '../src/score/drop1.ts';
import { partEnd, partFrame } from '../src/score/film.ts';
import { APERTURE, BURST_V, EARTH_R, ORIGIN, PIECES, type Piece, SWING, burstAperture, burstCamera, burstClock, burstFlat, burstPaper, burstTemporal, coreAt, lensIndex, piecePose, vogel } from '../src/shots/burst.ts';
import { type RisoLayout, SUN, risoFrame } from '../src/shots/riso.ts';
import { bodies } from '../src/shots/voyage.ts';
import { PAPER } from '../src/worlds/riso.ts';
import { SPACE_BLACK } from '../src/worlds/space.ts';

const RL: RisoLayout = { advance: (ch) => ('()'.includes(ch) ? 0.36 : 0.6), mouths: {} };
/** Earth locks on cosmos 2.1. */
const LOCK = LEVELS.earth;
/** The first stab after time snaps back (cosmos 1.3&). */
const STAB = partFrame('cosmos', 1, 2.5);
/** S12's last frame: the riso's last, the frame before the drop. */
const S12_END = partEnd('riso') - 1;
/** The kick under the freeze (on 2½). */
const FROZEN_KICK = BANG_KICKS.find((k) => k > FREEZE.from && k < RESUME)!;
const DEG = Math.PI / 180;

const sub = (a: readonly number[], b: readonly number[]) => a.map((v, i) => v - b[i]);
const len = (a: readonly number[]) => Math.hypot(...a);
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i);
/** Angle of the camera about the vertical axis through what it looks at, 0 = square on (looking down −z). */
const angle = (p: Pose) => Math.atan2(p.position[0] - p.target[0], p.position[2] - p.target[2]);
/** How far the camera turns from frame `f` to `f + 1`, the short way round. */
const step = (f: number): number => {
  const d = angle(burstCamera(f + 1)) - angle(burstCamera(f));
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d;
};
/** The camera's whole turn from frame `a` to `b`. */
const turn = (a: number, b: number) => range(a, b).reduce((s, f) => s + step(f), 0);
/** How far piece `p` moves from frame `f` to `f + 1`. */
const moved = (p: Piece, f: number) => len(sub(piecePose(p, f + 1).pos, piecePose(p, f).pos));
/** How far the whole cloud moves from frame `f` to `f + 1`. */
const cloudMoved = (f: number) => PIECES.reduce((s, p) => s + moved(p, f), 0);
const out = (p: Piece, f: number) => len(sub(piecePose(p, f).pos, ORIGIN));

test('the drop opens on S12’s last frame: the same camera, the same sun on the same paper, nothing out of it yet', () => {
  const a = burstCamera(BURST);
  const b = risoFrame(S12_END, RL).camera;
  for (const k of ['position', 'target', 'up'] as const) assert.ok(len(sub(a[k], b[k])) < 1e-6, k);
  assert.equal(a.fov, b.fov);
  const sun = risoFrame(S12_END, RL).content.under.filter((s) => s.kind === 'ellipse');
  const discs = burstFlat(BURST).under.filter((s) => s.kind === 'ellipse');
  assert.equal(discs.length, 2);
  const bySize = <T extends { w: number }>(xs: T[]) => [...xs].sort((x, y) => y.w - x.w);
  bySize(discs).forEach((d, i) => {
    const s = bySize(sun)[i];
    assert.equal(d.w, s.w, 'the same size');
    // The Riso discs sit off their centre by the plates' misregistration (≤ 12 px) and the sun's bob (≤ 3 px).
    assert.ok(len(sub([d.x, d.y], [s.x, s.y])) <= 15, `the same place (${d.x}, ${d.y} vs ${s.x}, ${s.y})`);
    assert.equal(d.alpha, 1);
  });
  assert.deepEqual(burstPaper(BURST), PAPER);
  assert.deepEqual(burstPaper(BURST + 1), SPACE_BLACK, 'black space from the next frame');
  for (const p of PIECES) assert.equal(piecePose(p, BURST).scale, 0);
});

test('the Riso sun swells and fades out over the first four frames while a shockwave ring races out and is gone 14 frames after the drop', () => {
  const discs = (f: number) => burstFlat(f).under.filter((s) => s.kind === 'ellipse');
  const rings = (f: number) => burstFlat(f).under.filter((s) => s.kind === 'ring');
  for (let f = BURST; f < BURST + 3; f++) {
    const [a, b] = [discs(f), discs(f + 1)];
    assert.ok(Math.max(...b.map((s) => s.w)) > Math.max(...a.map((s) => s.w)), `the sun swells (${f})`);
    assert.ok(b.every((s) => (s.alpha ?? 1) < (a[0].alpha ?? 1)), `and fades (${f})`);
  }
  assert.equal(discs(BURST + 4).length, 0, 'the sun is gone 4 frames after the drop');
  assert.equal(rings(BURST).length, 0);
  for (let f = BURST + 1; f < BURST + 13; f++) {
    const [a, b] = [rings(f)[0], rings(f + 1)[0]];
    assert.ok(b.w > a.w && (b.alpha ?? 1) < (a.alpha ?? 1), `the ring races out and fades (${f})`);
  }
  assert.equal(burstFlat(BURST + 14).under.length, 0, 'nothing flat left 14 frames after the drop');
});

test('the burst launches out of the sun and fills the frame by the freeze', () => {
  for (const p of PIECES) {
    assert.ok(out(p, BURST + 1) <= SUN.endR, 'every piece starts inside the sun');
    for (let f = BURST + 1; f < FREEZE.from; f++) assert.ok(out(p, f + 1) > out(p, f), 'flying outward');
    assert.equal(piecePose(p, FREEZE.from).scale, 1);
  }
  // The camera is square on at the freeze (looking down −z): where each piece lands on the 16:9 frame, ±1 at its edges.
  const cam = burstCamera(FREEZE.from);
  const tan = Math.tan((cam.fov * Math.PI) / 360);
  const onScreen = PIECES.map((p) => {
    const q = piecePose(p, FREEZE.from).pos;
    const z = cam.position[2] - q[2];
    return [(q[0] - cam.target[0]) / (z * tan * (16 / 9)), (q[1] - cam.target[1]) / (z * tan), z] as const;
  });
  const reach = Math.max(...onScreen.filter(([, , z]) => z > 0).map(([, y]) => Math.abs(y)));
  assert.ok(reach > 1, `the cloud reaches past the top or bottom of the frame (${reach})`);
  const seen = onScreen.filter(([x, y, z]) => z > 0 && Math.abs(x) <= 1 && Math.abs(y) <= 1);
  assert.ok(seen.length > 0.75 * PIECES.length, `most of the burst is in view, not flown off (${seen.length} of ${PIECES.length})`);
  const quarters = [0, 0, 0, 0];
  for (const [x, y] of seen) quarters[(x > 0 ? 1 : 0) + (y > 0 ? 2 : 0)]++;
  assert.ok(quarters.every((n) => n > 0.15 * seen.length), `centred: every quarter of the frame is filled (${quarters})`);
});

test('frozen from a sixteenth after the drop: until the kick on 2½ every piece drifts at about 2% of its speed, and the whole hold moves it less than half as far as the sixteenth before it', () => {
  for (let f = BURST; f < FREEZE.from; f++) assert.ok(cloudMoved(f) > 30 * cloudMoved(FREEZE.from), `the burst runs at full speed right up to the freeze (${f})`);
  for (let f = FREEZE.from; f < FROZEN_KICK; f++) {
    for (const p of PIECES) {
      const m = moved(p, f);
      assert.ok(m <= 0.021 * BURST_V * p.speed + 1e-9, `frozen (${f})`);
      assert.ok(m >= 0.01 * BURST_V * p.speed, `but alive: a slow drift (${f})`);
    }
  }
  for (const p of PIECES) {
    const held = len(sub(piecePose(p, RESUME).pos, piecePose(p, FREEZE.from).pos));
    const flown = len(sub(piecePose(p, FREEZE.from).pos, piecePose(p, BURST).pos));
    assert.ok(held < 0.5 * flown, `${held} vs ${flown}`);
  }
});

test('on the kick under the freeze the frozen cloud hiccups outward, then settles back to its drift by the resume', () => {
  assert.ok(cloudMoved(FROZEN_KICK) > 10 * cloudMoved(FROZEN_KICK - 2), `${cloudMoved(FROZEN_KICK)} vs ${cloudMoved(FROZEN_KICK - 2)}`);
  for (let f = FROZEN_KICK; f < RESUME - 1; f++) assert.ok(cloudMoved(f + 1) < cloudMoved(f), `dying away (${f})`);
  assert.ok(cloudMoved(RESUME - 1) < 1.5 * cloudMoved(FROZEN_KICK - 2), 'back to the drift');
  for (const p of PIECES) for (let f = FROZEN_KICK; f < RESUME; f++) assert.ok(out(p, f + 1) >= out(p, f), 'outward, never back');
});

test('time snaps back on cosmos 1.3, faster than the burst itself, everything flying on out', () => {
  assert.equal(burstClock(BURST - 1), 0);
  assert.ok(cloudMoved(RESUME) > 30 * cloudMoved(RESUME - 2), `${cloudMoved(RESUME)} vs ${cloudMoved(RESUME - 2)}`);
  assert.ok(cloudMoved(RESUME + 1) > cloudMoved(BURST + 1), 'faster than on the drop');
  for (const p of PIECES) for (let f = RESUME; f < LOCK; f++) assert.ok(out(p, f + 1) > out(p, f), `flying on out (${f})`);
});

test('the big pieces are all there on the first hit of the fill, then shrink away and are gone two frames before Earth locks', () => {
  for (const p of PIECES) {
    assert.equal(piecePose(p, FILL[0]).scale, 1);
    for (let f = FILL[0]; f < LOCK - 2; f++) {
      const drop = piecePose(p, f).scale - piecePose(p, f + 1).scale;
      assert.ok(drop >= 0, `shrinking (${f})`);
      assert.ok(drop < 0.15, `away over the fill, not popping out (${f}: ${drop})`);
    }
    assert.equal(piecePose(p, LOCK - 2).scale, 0);
  }
});

test('from S12’s last pose the camera glides back to square on to the burst by the freeze, with no cut', () => {
  const whole = len(sub(burstCamera(FREEZE.from).position, burstCamera(BURST).position));
  const reAim = len(sub(burstCamera(FREEZE.from).target, burstCamera(BURST).target));
  for (let f = BURST - 1; f < FREEZE.from; f++) {
    const moved = len(sub(burstCamera(f + 1).position, burstCamera(f).position));
    assert.ok(moved <= 0.3 * whole + 1e-9, `no jump at ${f}: ${moved} of ${whole}`);
    assert.ok(len(sub(burstCamera(f + 1).target, burstCamera(f).target)) <= 0.3 * reAim + 1e-9, `the aim moves smoothly too (${f})`);
  }
  assert.ok(len(sub(burstCamera(FREEZE.from).target, ORIGIN)) < 1e-6, 'aimed at the sun’s centre when the swing starts');
});

test('from the freeze the camera swings round the frozen burst, always the same way, easing in and out, aimed at its centre and never pushing in', () => {
  assert.ok(Math.abs(angle(burstCamera(FREEZE.from))) < 1e-9, 'square on to the burst when the swing starts');
  for (let f = FREEZE.from; f < RESUME; f++) assert.ok(step(f) > 0, `turning at ${f}`);
  assert.ok(Math.abs(turn(FREEZE.from, RESUME) - SWING) < 1e-9, `${turn(FREEZE.from, RESUME) / DEG}°`);
  assert.ok(turn(FREEZE.from, RESUME) > 90 * DEG && turn(FREEZE.from, RESUME) < 150 * DEG, `about a third of the way round, not a nudge (${turn(FREEZE.from, RESUME) / DEG}°)`);
  const mid = Math.round((FREEZE.from + RESUME) / 2);
  assert.ok(step(mid) > 10 * step(FREEZE.from) && step(mid) > 10 * step(RESUME - 1), 'eases in and out');
  const lift = (f: number) => burstCamera(f).position[1] - burstCamera(f).target[1];
  assert.ok(lift(mid) > 0 && Math.abs(lift(FREEZE.from)) < 1e-9 && Math.abs(lift(RESUME)) < 1e-9, 'a little higher mid-way');
  const reach = (c: Pose) => Math.hypot(c.position[0] - c.target[0], c.position[2] - c.target[2]);
  const d0 = reach(burstCamera(FREEZE.from));
  assert.ok(lift(mid) < 0.2 * d0, 'only a little');
  for (let f = FREEZE.from; f <= LOCK; f++) {
    const c = burstCamera(f);
    assert.ok(len(sub(c.target, ORIGIN)) < 1e-6, `aimed at the burst's centre (${f})`);
    assert.ok(Math.abs(reach(c) - d0) < 1e-6, `at the same distance (${f})`);
  }
});

test('after the resume the camera carries on round the same way to one full turn, square on again by cosmos 2.1', () => {
  for (let f = FREEZE.from; f < LOCK; f++) assert.ok(step(f) >= 0, `one way only (${f})`);
  assert.ok(Math.abs(turn(FREEZE.from, LOCK) - 2 * Math.PI) < 1e-6, `one full turn (${turn(FREEZE.from, LOCK) / DEG}°)`);
  const square = burstCamera(FREEZE.from);
  const lock = burstCamera(LOCK);
  for (const k of ['position', 'target', 'up'] as const) assert.ok(len(sub(lock[k], square[k])) < 1e-6, k);
  assert.ok(Math.abs(step(LOCK - 1)) < 0.1 * DEG, 'it arrives there, no jump on the lock');
});

test('the camera kicks round a step as time snaps back and on each hit of the fill, and has mostly settled before the next', () => {
  const hits = [RESUME, ...FILL];
  hits.forEach((h, i) => {
    const next = hits[i + 1] ?? LOCK;
    assert.ok(step(h) > 10 * DEG, `a step round on ${h} (${step(h) / DEG}°)`);
    assert.ok(step(h) > 20 * Math.abs(step(h - 1)), `a kick on the hit, coasting just before it (${h})`);
    assert.ok(step(next - 1) < 0.05 * step(h), `settled before ${next} (${step(next - 1) / DEG}° vs ${step(h) / DEG}°)`);
  });
  for (const h of FILL) assert.ok(turn(h, h + 6) > 20 * DEG, `the hit on ${h} carries the camera on round (${turn(h, h + 6) / DEG}°)`);
});

test('the shutter is crisp through the freeze, so the frozen faces read, and through the fill from the stab, so each kick lands sharp; 64 sub-frames all through cosmos bar 1', () => {
  for (let f = BURST; f < LOCK; f++) {
    const t = burstTemporal(f);
    assert.equal(t.samples, 64, `${f}`);
    assert.equal(t.persistence, 0, `${f}`);
    const crisp = (f > FREEZE.from && f < RESUME) || (f >= RESUME + 12 && f < LOCK);
    if (crisp) assert.ok(t.shutter > 0 && t.shutter <= 0.25, `crisp at ${f} (${t.shutter})`);
    else assert.ok(t.shutter >= 0.45 && t.shutter <= 1, `the burst and the resume keep their motion blur (${f}: ${t.shutter})`);
  }
});

test('the lens opens only in the freeze, easing open and shut, and its sub-frames tile the disk', () => {
  for (let f = BURST - 6; f <= LOCK; f += 0.5) {
    if (f <= FREEZE.from || f >= RESUME) assert.equal(burstAperture(f), 0, `shut at ${f}`);
  }
  assert.equal(burstAperture((FREEZE.from + RESUME) / 2), APERTURE);
  const wide = range(FREEZE.from, RESUME).filter((f) => burstAperture(f) === APERTURE).length;
  assert.ok(wide > 0.6 * (RESUME - FREEZE.from), `wide open for most of the hold (${wide} frames)`);
  const opening = burstAperture(FREEZE.from + 2);
  const closing = burstAperture(RESUME - 2);
  assert.ok(opening > 0 && opening < APERTURE && closing > 0 && closing < APERTURE, 'eases, no pop');
  assert.ok(APERTURE >= 15 && APERTURE <= 35, 'a lens that blurs the near and far faces, not the whole cloud');
  const pts = Array.from({ length: 64 }, (_, k) => vogel(k, 64));
  assert.ok(pts.every(([x, y]) => Math.hypot(x, y) <= 1));
  const [mx, my] = pts.reduce(([a, b], [x, y]) => [a + x / 64, b + y / 64], [0, 0]);
  assert.ok(Math.hypot(mx, my) < 0.05, `${mx}, ${my}`);
  // Evenly over the disk's area: half the points inside the circle that holds half its area, and out to the rim.
  const inner = pts.filter(([x, y]) => Math.hypot(x, y) < Math.SQRT1_2).length;
  assert.ok(Math.abs(inner - 32) <= 2, `${inner} of 64 in the inner half of the area`);
  assert.ok(Math.max(...pts.map(([x, y]) => Math.hypot(x, y))) > 0.95, 'out to the rim');
  const used = Array.from({ length: 64 }, (_, i) => lensIndex(i, 64));
  assert.equal(new Set(used).size, 64, 'every lens point once a frame');
  const meanR = (ks: number[]) => ks.reduce((s, k) => s + Math.hypot(...vogel(k, 64)), 0) / ks.length;
  assert.ok(Math.abs(meanR(used.slice(0, 32)) - meanR(used.slice(32))) < 0.05, 'the early and late sub-frames spread over the same disk, so no streak is sharp at one end');
});

test('the core flares on the stab at cosmos 1.3& and dies back down by the fill', () => {
  for (let f = BURST; f < STAB; f++) assert.equal(coreAt(f).flare, 1, `quiet at ${f}`);
  assert.ok(coreAt(STAB).flare > 1.5, `${coreAt(STAB).flare}`);
  for (let f = BURST; f < LOCK + 12; f++) assert.ok(coreAt(f).flare <= coreAt(STAB).flare, `peaks on the stab (${f})`);
  for (let f = STAB; f < LOCK; f++) assert.ok(coreAt(f + 1).flare < coreAt(f).flare, `decays (${f})`);
  assert.ok(coreAt(FILL[0]).flare < 1.05, `${coreAt(FILL[0]).flare}`);
  assert.ok(coreAt(STAB).light > coreAt(STAB - 1).light, 'its light on the pieces flares with it');
});

test('after the resume the core lights the pieces more dimly, so none flashes as it crosses it', () => {
  for (let f = BURST; f <= RESUME; f++) assert.equal(coreAt(f).light, 1, `${f}`);
  for (let f = RESUME + 6; f < STAB; f++) assert.ok(coreAt(f).light < 0.7, `${f}: ${coreAt(f).light}`);
  for (let f = FILL[0]; f < LOCK; f++) assert.ok(coreAt(f).light < 0.7, `${f}: ${coreAt(f).light}`);
});

test('the core stays white-hot until the fill, then cools a step on each hit (gold, orange, deep red, dark) and is cold by cosmos 2.1', () => {
  for (let f = BURST; f <= FILL[0]; f++) assert.equal(coreAt(f).heat, 1, `white-hot at ${f}`);
  for (let f = BURST; f < LOCK + 12; f++) assert.ok(coreAt(f + 1).heat <= coreAt(f).heat, `never warms up (${f})`);
  FILL.forEach((h, i) => {
    const next = FILL[i + 1] ?? LOCK;
    assert.ok(Math.abs(coreAt(next).heat - (1 - (i + 1) / 4)) < 0.03, `a quarter cooler after ${h}: ${coreAt(next).heat}`);
    assert.ok(coreAt(h).heat - coreAt(h + 2).heat > 0.5 * 0.25, `most of the step on the hit (${h})`);
  });
  assert.ok(coreAt(LOCK).heat < 0.01, `${coreAt(LOCK).heat}`);
});

test('the core reads white-hot before the fill, then gold, orange and deep red as each hit settles, and Earth’s dark body by cosmos 2.1', () => {
  const colour = (f: number) => bodies(f, coreAt(f)).earth.color;
  const lum = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const gr = (c: readonly number[]) => c[1] / c[0];
  const white = colour(FILL[0] - 1);
  assert.ok(Math.min(...white) > 0.85 * Math.max(...white), `white, not tinted (${white})`);
  const [gold, orange, red] = [colour(FILL[1] - 1), colour(FILL[2] - 1), colour(FILL[3] - 1)];
  assert.ok(gold[0] > gold[1] && gold[1] > gold[2] && gr(gold) > 0.4 && gr(gold) < 0.9, `gold after ${FILL[0]} (${gold})`);
  assert.ok(orange[0] > orange[1] && orange[1] > orange[2] && gr(orange) > 0.1 && gr(orange) < 0.4, `orange after ${FILL[1]} (${orange})`);
  assert.ok(gr(red) < 0.1 && lum(red) < 0.25 * lum(orange), `a dim deep red after ${FILL[2]} (${red})`);
  const dark = colour(LOCK);
  assert.ok(Math.max(...dark) < 0.01 * Math.max(...white), `dark by ${LOCK} (${dark})`);
  const seq = [white, gold, orange, red, dark].map(lum);
  seq.slice(1).forEach((l, i) => assert.ok(l < seq[i], `dimmer after every hit (${seq})`));
});

test('the core is a small point until the fill’s third snare and grows to Earth’s size by cosmos 2.1, only once it has cooled', () => {
  assert.ok(coreAt(FREEZE.from).r > coreAt(BURST).r, 'it swells after the burst');
  for (let f = BURST; f <= FILL[2]; f++) assert.ok(coreAt(f).r < 0.3 * EARTH_R, `small at ${f}: ${coreAt(f).r}`);
  for (let f = BURST; f < LOCK; f++) {
    const grow = coreAt(f + 1).r - coreAt(f).r;
    assert.ok(grow >= 0, `never shrinks (${f})`);
    assert.ok(grow < 0.15 * EARTH_R, `grows over frames, never pops (${f}: ${grow})`);
  }
  assert.ok(Math.abs(coreAt(LOCK).r - EARTH_R) < 0.02 * EARTH_R, `Earth's size: ${coreAt(LOCK).r} vs ${EARTH_R}`);
  for (let f = BURST; f <= LOCK; f++) {
    const c = coreAt(f);
    if (c.r > EARTH_R / 3) assert.ok(c.heat <= 0.5, `no big hot disc: r ${c.r}, heat ${c.heat} at ${f}`);
  }
});

test('the burst’s 3D faces are cast from BURST_FACES, many of them', () => {
  const faces = PIECES.filter((p) => p.kind === 'face').map((p) => p.face);
  assert.ok(faces.every((f) => BURST_FACES.includes(f)));
  assert.ok(new Set(faces).size >= 100, `${new Set(faces).size} different faces`);
  for (const p of PIECES) if (p.kind !== 'face') assert.equal(p.face, '');
});

test('every piece flies straight out along its own ray and faces outward along it, on spokes all round the sun', () => {
  for (const p of PIECES) {
    for (const f of [BURST + 1, FREEZE.from, RESUME, FILL[2]]) {
      const pose = piecePose(p, f);
      const away = sub(pose.pos, ORIGIN);
      const d = len(away);
      assert.ok(len(sub(away.map((v) => v / d), p.dir)) < 1e-9, `on its ray (${f})`);
      assert.ok(len(sub(pose.facing, p.dir)) < 1e-9, `looking outward (${f})`);
    }
  }
  const rays = [...new Set(PIECES.map((p) => p.dir.join()))].map((r) => r.split(',').map(Number));
  assert.ok(rays.length > 40, `many spokes (${rays.length})`);
  const mean = rays.reduce((a, v) => a.map((x, i) => x + v[i] / rays.length), [0, 0, 0]);
  assert.ok(len(mean) < 0.05, `the spokes point every way, none lopsided (${mean})`);
});

test('no face appears twice in the burst', () => {
  const faces = PIECES.filter((p) => p.kind === 'face').map((p) => p.face);
  assert.equal(new Set(faces).size, faces.length);
});
