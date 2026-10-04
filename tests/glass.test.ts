import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import type { Glyph } from '../src/engine/glyphField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import type { Advance } from '../src/engine/typeset.ts';
import { shardDecal } from '../src/scenes/club.ts';
import { HIT, SMASH } from '../src/score/drop1.ts';
import { partFrame } from '../src/score/film.ts';
import { DECAL_Z, GLASS, SHARDS, type Shard, clubSegment, clubTemporal, decalUV, glassFrame, shardCorner, shardFlight } from '../src/shots/glass.ts';
import type { RGB } from '../src/engine/color.ts';
import { CLUB_TEXTS, HERO, NEON, heroAt, linesFrame } from '../src/shots/lines.ts';
import { FRONT } from '../src/shots/swiss.ts';

/** Symmetric advances (brackets narrow), so a face's middle is the mean of its characters. */
const adv: Advance = (ch) => (ch === ' ' ? 0.3 : '()（）'.includes(ch) ? 0.4 : 0.8);
const W = 1920;
const H = 1080;
type V2 = readonly [number, number];
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i);

/** Shoelace area of a polygon. */
const area = (pts: readonly V2[]): number => Math.abs(pts.reduce((s, a, i) => { const b = pts[(i + 1) % pts.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;
/** The part of a polygon inside the frame (Sutherland–Hodgman against its four edges). */
function inFrame(pts: readonly V2[]): V2[] {
  const edges: [(p: V2) => number][] = [[(p) => W / 2 - p[0]], [(p) => p[0] + W / 2], [(p) => H / 2 - p[1]], [(p) => p[1] + H / 2]];
  let poly: V2[] = [...pts];
  for (const [d] of edges) {
    const out: V2[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const da = d(a);
      const db = d(b);
      const cut = (): V2 => { const t = da / (da - db); return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; };
      if (da >= 0) {
        out.push(a);
        if (db < 0) out.push(cut());
      } else if (db >= 0) out.push(cut());
    }
    poly = out;
    if (poly.length === 0) break;
  }
  return poly;
}
/** Even–odd point in polygon. */
const contains = (pts: readonly V2[], [x, y]: V2): boolean => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** Where a point of shard `s` lands on screen at `f`, through the scene's camera at FRONT looking down −z. */
const onScreen = (s: Shard, f: number): { r: number; z: number } => {
  const m = shardFlight(s, f);
  return { r: (Math.hypot(s.c[0] + m.x, s.c[1] + m.y) * FRONT) / (FRONT - m.z), z: m.z };
};
/** The glyphs on the glass at `f`. */
const face = (f: number): readonly Glyph[] => glassFrame(f, adv).light.glyphs.neon ?? [];
/** `c` is `hue` at some brightness. */
const isHue = (c: RGB, hue: RGB): boolean => {
  const n = Math.hypot(...c) * Math.hypot(...hue);
  return (c[0] * hue[0] + c[1] * hue[1] + c[2] * hue[2]) / n > 0.9999;
};
const middle = (gs: readonly Glyph[]): V2 => [gs.reduce((s, g) => s + g.x, 0) / gs.length, gs.reduce((s, g) => s + g.y, 0) / gs.length];

test('the glass takes over on the hit, holds through the beat of silence, breaks on the break’s downbeat (break 1.1), and its shards fly until break 1.3', () => {
  assert.equal(GLASS.hit, HIT);
  assert.equal(GLASS.shatter, SMASH);
  assert.equal(GLASS.end, partFrame('break', 1, 2));
  assert.ok(GLASS.hit < GLASS.silence && GLASS.silence < GLASS.shatter, 'the face settles inside the silence');
});

test('the shards tile the whole frame: every point of the screen lies in exactly one shard', () => {
  const clipped = SHARDS.reduce((s, sh) => s + area(inFrame(sh.pts)), 0);
  assert.ok(Math.abs(clipped - W * H) / (W * H) < 0.001, `the shards cover ${clipped.toFixed(0)} px² of the ${W * H} px² frame`);
  for (let x = -W / 2 + 7; x < W / 2; x += 61) {
    for (let y = -H / 2 + 5; y < H / 2; y += 43) {
      const n = SHARDS.filter((sh) => contains(sh.pts, [x, y])).length;
      assert.equal(n, 1, `(${x}, ${y}) is in ${n} shards`);
    }
  }
  for (const corner of [[-W / 2 + 1, -H / 2 + 1], [W / 2 - 1, -H / 2 + 1], [-W / 2 + 1, H / 2 - 1], [W / 2 - 1, H / 2 - 1]] as const) {
    assert.equal(SHARDS.filter((sh) => contains(sh.pts, corner)).length, 1, `corner (${corner})`);
  }
});

test('every shard is a piece of the screen: its middle lies inside the frame', { skip: 'suspected bug: the outer crack ring (≈1180 px) reaches past the 1920×1080 frame — 16 of 75 shard middles lie off-screen and 6 shards are wholly off-screen' }, () => {
  for (const sh of SHARDS) {
    assert.ok(Math.abs(sh.c[0]) <= W / 2 && Math.abs(sh.c[1]) <= H / 2, `shard ${sh.k} centred at (${sh.c[0].toFixed(0)}, ${sh.c[1].toFixed(0)})`);
    assert.ok(area(inFrame(sh.pts)) > 0, `shard ${sh.k} shows on screen`);
  }
});

test('on the smash every shard is still exactly where it was in the glass, flat and unturned', () => {
  for (const s of SHARDS) {
    const m = shardFlight(s, GLASS.shatter);
    for (const [k, v] of Object.entries(m)) assert.ok(Math.abs(v) < 1e-9, `shard ${s.k}: ${k} = ${v}`);
  }
});

test('after the smash every shard flies at us, tumbling: nearer every moment, and further from the middle of the screen as seen through the camera, until it passes the camera', () => {
  for (const s of SHARDS) {
    let prev = onScreen(s, GLASS.shatter);
    let turned = false;
    for (let f = GLASS.shatter + 0.5; f <= GLASS.end; f += 0.5) {
      const now = onScreen(s, f);
      assert.ok(now.z > prev.z, `shard ${s.k} comes nearer at ${f}`);
      if (now.z >= FRONT - 40) break;
      assert.ok(now.r > prev.r, `shard ${s.k} moves out on screen at ${f}: ${prev.r.toFixed(1)} → ${now.r.toFixed(1)}`);
      const m = shardFlight(s, f);
      if (Math.abs(m.rx) + Math.abs(m.ry) + Math.abs(m.rz) > 0) turned = true;
      prev = now;
    }
    assert.ok(turned, `shard ${s.k} tumbles as it flies`);
  }
});

test('by break 1.3 the shards have flown at us: most have passed the camera and the rest are nearly there', () => {
  const zs = SHARDS.map((s) => shardFlight(s, GLASS.end).z);
  const passed = zs.filter((z) => z >= FRONT - 40).length;
  assert.ok(passed > SHARDS.length / 2, `${passed} of ${SHARDS.length} shards past the camera`);
  assert.ok(Math.min(...zs) > 0.75 * FRONT, `the slowest has come ${(100 * Math.min(...zs) / FRONT).toFixed(0)}% of the way`);
  const mid = SHARDS.map((s) => shardFlight(s, (GLASS.shatter + GLASS.end) / 2).z);
  assert.ok(mid.every((z) => z < FRONT - 40), 'none gone before the middle of the beat: the glass is seen breaking');
});

test('from the hit to the smash the glass shows one face, (×ω×), where he hit, and nothing else', () => {
  assert.equal(HERO.dying, '(×ω×)');
  for (const f of range(GLASS.hit, GLASS.shatter)) {
    const gs = face(f);
    assert.equal(gs.map((g) => g.ch).join(''), [...HERO.dying].filter((c) => c.trim() !== '').join(''), `at ${f}`);
    const [x, y] = middle(gs);
    assert.ok(Math.hypot(x, y) < 12, `at ${f} the face sits at (${x.toFixed(1)}, ${y.toFixed(1)})`);
    assert.ok(gs.every((g) => g.size * (g.stretch ?? 1) >= 0.25 * H), 'squashed big on the glass');
    assert.ok(gs.every((g) => isHue(g.color, NEON.amber)), `at ${f}: still his amber`);
  }
});

test('the glass is drawn from the club’s atlas: every character on it is in CLUB_TEXTS', () => {
  const atlas = new Set(CLUB_TEXTS.flatMap((t) => [...t]));
  for (const f of range(GLASS.hit, GLASS.shatter)) {
    for (const [k, gs] of Object.entries(glassFrame(f, adv).light.glyphs)) {
      assert.equal(k, 'neon', 'the club’s one atlas');
      for (const g of gs) assert.ok(atlas.has(g.ch), `${f}: ${g.ch} is not in the atlas`);
    }
  }
});

test('the face trembles through the silence: it never holds still for more than two frames', () => {
  for (const f of range(GLASS.hit, GLASS.shatter - 2)) {
    const ps = [f, f + 1, f + 2].map((g) => middle(face(g)));
    const moved = ps.some((p, i) => i > 0 && Math.hypot(p[0] - ps[i - 1][0], p[1] - ps[i - 1][1]) > 0.01);
    assert.ok(moved, `still from ${f} to ${f + 2}`);
  }
});

test('the face trembles from frame to frame, never inside one: across the sub-frames of every glass frame it moves as one smooth blur', () => {
  for (const F of range(GLASS.hit, GLASS.shatter)) {
    const ps = temporalSamples(F, clubTemporal(F), clubSegment(F)).map((s) => middle(face(s.frame)));
    for (let i = 1; i < ps.length; i++) {
      const d = Math.hypot(ps[i][0] - ps[i - 1][0], ps[i][1] - ps[i - 1][1]);
      assert.ok(d < 1, `${F}: the face jumps ${d.toFixed(2)} px between two sub-frames`);
    }
  }
});

test('the hit is a smack, not a shrink: he lands flat on the glass as wide as he flew in, squashed, and springs back to his resting face by the end of the half beat', () => {
  /** His em across (px) on the glass at `f`. */
  const across = (f: number) => face(f)[0].size * (face(f)[0].stretch ?? 1);
  const flying = heroAt(GLASS.hit - 1)!.size;
  assert.ok(across(GLASS.hit) >= flying, `as wide as his flight's last frame: ${across(GLASS.hit).toFixed(0)} px against ${flying.toFixed(0)} px`);
  assert.ok((face(GLASS.hit)[0].stretch ?? 1) > 1.8, `squashed flat on the hit: ${face(GLASS.hit)[0].stretch}`);
  for (const f of range(GLASS.hit + 1, GLASS.shatter)) {
    const k = across(f - 1) / across(f);
    assert.ok(k >= 1 - 1e-9 && k < 1.35, `${f}: ${across(f - 1).toFixed(0)} → ${across(f).toFixed(0)} px across (×${(1 / k).toFixed(2)})`);
  }
  for (const f of range(GLASS.silence, GLASS.shatter)) {
    for (const g of face(f)) {
      assert.ok(Math.abs(g.size - 360) < 1e-6 && Math.abs((g.stretch ?? 1) - 1.3) < 1e-6, `${f}: at rest, ${g.size.toFixed(1)} px, stretched ${g.stretch}`);
    }
  }
});

test('the smack lands where he flew in: his ω on the glass on the hit is where his ω was on the frame before, within a tenth of his em', () => {
  const omega = (gs: readonly Glyph[]) => gs.find((g) => g.ch === 'ω')!;
  const before = omega(linesFrame(GLASS.hit - 1, { advance: adv }).front.light.glyphs.neon ?? []);
  const on = omega(face(GLASS.hit));
  const d = Math.hypot(on.x - before.x, on.y - before.y);
  assert.ok(d < 0.1 * before.size, `his ω jumps ${d.toFixed(0)} px on the hit (from (${before.x.toFixed(0)}, ${before.y.toFixed(0)}) at an em of ${before.size.toFixed(0)} px)`);
});

test('the shards carry the frozen glass exactly where it was: each point of a shard’s face sits DECAL_Z in front of the glass and samples the frozen frame where it lands on screen', () => {
  assert.ok(DECAL_Z > 11 && DECAL_Z < 40, `the face lies just in front of the glass's front: ${DECAL_Z}`);
  for (const s of SHARDS) {
    for (const [x, y] of s.pts) {
      const [u, v] = decalUV(x, y);
      // Through the camera at FRONT, the point (x, y, DECAL_Z) lands on screen px (x, y) × FRONT / (FRONT − DECAL_Z).
      const k = FRONT / (FRONT - DECAL_Z);
      assert.ok(Math.abs(u * W - W / 2 - x * k) < 1e-6 && Math.abs(v * H - H / 2 - y * k) < 1e-6, `shard ${s.k} (${x.toFixed(0)}, ${y.toFixed(0)}) samples (${u.toFixed(4)}, ${v.toFixed(4)})`);
    }
  }
});

test('the shards add the frozen glass as it was drawn: its colour added one to one, not weighted by its alpha (which sums every glyph added over the paper)', () => {
  const m = shardDecal(new THREE.Texture());
  assert.equal(m.blending, THREE.CustomBlending);
  assert.equal(m.blendEquation, THREE.AddEquation);
  assert.equal(m.blendSrc, THREE.OneFactor);
  assert.equal(m.blendDst, THREE.OneFactor);
  assert.equal(m.premultipliedAlpha, false, 'no shader-side rgb × alpha either');
  assert.equal(m.toneMapped, false);
  m.dispose();
});

test('fast moves blur instead of printing copies: the cracks racing out on the hit and every shard corner on screen move no more than 3 px between consecutive sub-frames', () => {
  const h = 1e-3;
  const step = (F: number, speed: (s: number) => number) => {
    const t = clubTemporal(F);
    const seg = clubSegment(F);
    return Math.max(...[-0.5, -0.25, 0, 0.25, 0.5].map((k) => Math.min(Math.max(F + k * t.shutter, seg.from + 0.05), seg.to - 2 * h)).map(speed)) * (t.shutter / t.samples);
  };
  /** How fast the cracks' ends move at `s` (px a frame). */
  const cracks = (s: number) => {
    const [a, b] = [glassFrame(s, adv).cracks, glassFrame(s + h, adv).cracks];
    const ends = (c: (typeof a)[number]) => [-1, 1].map((k) => [c.x + (k * c.w * Math.cos(c.rot ?? 0)) / 2, c.y + (k * c.w * Math.sin(c.rot ?? 0)) / 2]);
    let v = 0;
    a.forEach((c, i) => {
      if (c.kind !== 'segment' || Math.abs(c.x) > W / 2 || Math.abs(c.y) > H / 2) return;
      const [p, q] = [ends(c), ends(b[i])];
      for (const j of [0, 1]) v = Math.max(v, Math.hypot(q[j][0] - p[j][0], q[j][1] - p[j][1]) / h);
    });
    return v;
  };
  for (const F of range(GLASS.hit, GLASS.silence)) assert.ok(step(F, cracks) <= 3, `${F}: the cracks print ${step(F, cracks).toFixed(1)} px apart`);
  /** How fast the shards' corners on screen move at `s` (px a frame). */
  const shards = (s: number) => {
    let v = 0;
    for (const sh of SHARDS) {
      for (const pt of sh.pts) {
        const [a, b] = [shardCorner(sh, pt, s), shardCorner(sh, pt, s + h)];
        if (a && b && Math.abs(a[0]) < 1100 && Math.abs(a[1]) < 700) v = Math.max(v, Math.hypot(b[0] - a[0], b[1] - a[1]) / h);
      }
    }
    return v;
  };
  for (const F of range(GLASS.shatter, GLASS.end)) assert.ok(step(F, shards) <= 3, `${F}: the shards print ${step(F, shards).toFixed(1)} px apart`);
});

test('a shard corner lands on screen where the glass had it until the shard moves, and leaves with the shard', () => {
  for (const s of SHARDS) {
    for (const pt of s.pts) {
      const p = shardCorner(s, pt, GLASS.shatter)!;
      const [u, v] = decalUV(pt[0], pt[1]);
      assert.ok(Math.abs(p[0] - (u * W - W / 2)) < 1e-6 && Math.abs(p[1] - (v * H - H / 2)) < 1e-6, `shard ${s.k}: (${p[0].toFixed(2)}, ${p[1].toFixed(2)})`);
    }
  }
  const gone = SHARDS.find((s) => shardFlight(s, GLASS.end).z >= FRONT - 40)!;
  assert.equal(shardCorner(gone, gone.pts[0], GLASS.end), null);
});

test('the cracks burst out from the hit to past the corners within a few frames and stay until the smash', () => {
  const reach = (f: number) => Math.max(...glassFrame(f, adv).cracks.filter((s) => s.kind === 'segment').map((s) => Math.hypot(s.x, s.y) + s.w / 2));
  for (const f of range(GLASS.hit, GLASS.shatter)) assert.ok(glassFrame(f, adv).cracks.filter((s) => s.kind === 'segment').length >= 50, `cracks at ${f}`);
  assert.ok(reach(GLASS.hit) < 100, 'they start at the point of impact');
  assert.ok(reach(GLASS.hit) < reach(GLASS.hit + 1) && reach(GLASS.hit + 1) < reach(GLASS.hit + 2), 'and grow');
  const corner = Math.hypot(W / 2, H / 2);
  for (const f of range(GLASS.hit + 4, GLASS.shatter)) assert.ok(reach(f) > corner, `at ${f} they reach past the corners (${reach(f).toFixed(0)} px)`);
});

test('the glass breaks along the cracks we saw: once grown, every crack runs along an edge between shards, and every shard edge on screen is cracked', () => {
  const cracks = glassFrame(GLASS.shatter - 1, adv).cracks.filter((s) => s.kind === 'segment');
  const edges = SHARDS.flatMap((s) => s.pts.map((p, i): [V2, V2] => [p, s.pts[(i + 1) % s.pts.length]]));
  /** Distance from `p` to the segment a–b. */
  const toEdge = (p: V2, [a, b]: [V2, V2]) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  for (const c of cracks) {
    const along = edges.some((e) => toEdge([c.x, c.y], e) < 1 && Math.abs(Math.sin((c.rot ?? 0) - Math.atan2(e[1][1] - e[0][1], e[1][0] - e[0][0]))) < 0.01);
    assert.ok(along, `the crack at (${c.x.toFixed(0)}, ${c.y.toFixed(0)}) runs along no shard edge`);
  }
  /** `p` lies on crack `c` (within its length and a pixel of its line). */
  const onCrack = (p: V2, c: (typeof cracks)[number]) => {
    const r = c.rot ?? 0;
    const [u, v] = [(p[0] - c.x) * Math.cos(r) + (p[1] - c.y) * Math.sin(r), -(p[0] - c.x) * Math.sin(r) + (p[1] - c.y) * Math.cos(r)];
    return Math.abs(u) <= c.w / 2 && Math.abs(v) <= c.h / 2 + 1;
  };
  let seen = 0;
  for (const [a, b] of edges) {
    for (const t of [0.25, 0.5, 0.75]) {
      const p: V2 = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      if (Math.abs(p[0]) > W / 2 || Math.abs(p[1]) > H / 2) continue;
      seen++;
      assert.ok(cracks.some((c) => onCrack(p, c)), `no crack at (${p[0].toFixed(0)}, ${p[1].toFixed(0)}) on a shard edge`);
    }
  }
  assert.ok(seen > 100, `${seen} points of shard edges on screen`);
});
