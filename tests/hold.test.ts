// A held tail (src/score/film.ts partTail; src/scenes/hold.ts): a grown part holds its last built frame over its unbuilt bars. The hold
// draws the part's own scene at the instants of that frame — its sub-frames, segment, look and screen overlay — with the camera
// energy held too, so every tail frame is that frame, frozen. Rules for any map; today's tails are pinned in tests/filmMap.test.ts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type * as THREE from 'three';
import { DEFAULT_TEMPORAL, temporalSamples } from '../src/engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../src/engine/types.ts';
import { FLAT_LOOK } from '../src/engine/types.ts';
import { filmScenes } from '../src/scenes/index.ts';
import { HeldScene } from '../src/scenes/hold.ts';
import { flashAt, rigAt } from '../src/score/energy.ts';
import { FILM, TAILS, builtEnd, heldFrame, isHeld, partEnd, partFrame, partStart, seedFrame } from '../src/score/film.ts';
import { SPANS } from '../src/score/spans.ts';

/** A scene that records what it is asked, at which instants. */
function recorder(): Renderable & { frames: number[]; cams: number[]; looks: number[]; overlays: number[]; inits: number; disposals: number } {
  const r = {
    frames: [] as number[],
    cams: [] as number[],
    looks: [] as number[],
    overlays: [] as number[],
    inits: 0,
    disposals: 0,
    init: async () => {
      r.inits++;
    },
    render: (_gl: THREE.WebGLRenderer, ctx: FrameContext) => {
      r.frames.push(ctx.frame);
      r.cams.push(ctx.cam);
    },
    look: (f: number): Look => {
      r.looks.push(f);
      return { ...FLAT_LOOK, exposure: 1 + f / 1e6 };
    },
    temporal: () => ({ samples: 24, shutter: 0.5, persistence: 2 }),
    segment: (f: number) => ({ from: f - 30, to: f + 1 }),
    screenOverlay: (_gl: THREE.WebGLRenderer, _t: THREE.WebGLRenderTarget, f: number) => {
      r.overlays.push(f);
    },
    dispose: () => {
      r.disposals++;
    },
  };
  return r;
}

test('a part is built for its first bars (all of them unless it says otherwise); its tail is the rest, and the tails are where nothing is built', () => {
  for (const p of FILM) {
    assert.ok(builtEnd(p.id) > partStart(p.id) && builtEnd(p.id) <= partEnd(p.id), p.id);
    const t = TAILS.find((x) => x.id === p.id);
    if (builtEnd(p.id) === partEnd(p.id)) assert.equal(t, undefined, `${p.id} is built through`);
    else assert.deepEqual(t, { id: p.id, from: builtEnd(p.id), to: partEnd(p.id) });
  }
  for (const t of TAILS) {
    assert.ok(!isHeld(t.from - 1) && isHeld(t.from) && isHeld(t.to - 1) && !isHeld(t.to), `${t.id}: [${t.from}, ${t.to})`);
    for (const f of [t.from, t.from + 0.49, t.to - 1, t.to - 1.25]) {
      const h = heldFrame(f);
      assert.ok(Math.abs(h - (t.from - 1)) < 0.5 + 1e-9, `${f} shows ${h}: within half a frame of ${t.id}'s last built frame`);
      assert.ok(!isHeld(h), `${h} is drawn, not held`);
    }
  }
});

test('seedFrame moves a frame by whole bars — its part’s move since the v04 map, and the bars inserted inside its part before it (60-bar map: the RAIN bar intro 2 and the SCAN bar swiss 4) — the same for every instant of a bar; intro 1 never moved', () => {
  for (let f = 0; f < partFrame('intro', 2); f += 7) assert.equal(seedFrame(f), f);
  for (const p of FILM) {
    for (let bar = 1; bar <= p.bars; bar++) {
      const a = partFrame(p.id, bar);
      const d = a - seedFrame(a);
      assert.equal(d % 96, 0, `${p.id} bar ${bar} moved ${d} frames`);
      for (const f of [a, a + 0.25, Math.min(a + 95, partEnd(p.id) - 1)]) assert.equal(f - seedFrame(f), d, `${p.id} bar ${bar} at ${f}`);
    }
  }
  assert.equal(partStart('riso') - seedFrame(partStart('riso')), 192, 'riso: +192 (the RAIN and SCAN bars)');
});

test('the hold draws its scene at the held frame’s instants: every sub-frame of a tail frame is the matching sub-frame of the last built frame (on the tail’s first, none before it)', () => {
  for (const t of TAILS) {
    const inner = recorder();
    const hold = new HeldScene(() => inner);
    const last = t.from - 1;
    for (const out of [t.from, t.from + 1, Math.floor((t.from + t.to) / 2), t.to - 1]) {
      const spec = hold.temporal(out);
      assert.deepEqual(spec, { samples: 24, shutter: 0.5, persistence: 0 }, 'its own shutter, no phosphor tail');
      const seg = hold.segment(out);
      // On the tail's first frame the shutter's opening half would fall before the tail (in the live span): it is drawn at the held instant.
      const want = temporalSamples(last, spec, inner.segment!(last)).map((w) => ({ frame: out === t.from ? Math.max(w.frame, last) : w.frame }));
      const got = temporalSamples(out, spec, seg);
      inner.frames.length = 0;
      for (const s of got) hold.render(null as never, { frame: s.frame, cam: s.cam, t: 0, beat: 0, quality: 'final', width: 1, height: 1 }, null as never);
      assert.equal(inner.frames.length, want.length);
      inner.frames.forEach((f, i) => assert.ok(Math.abs(f - want[i].frame) < 1e-9, `${t.id} ${out}: sub-frame ${i} at ${f}, not ${want[i].frame}`));
      for (const s of got) assert.ok(s.frame >= t.from, `${out}: a sub-frame at ${s.frame} before the tail would be the live span's`);
      assert.deepEqual(hold.look(out), inner.look(last));
      hold.screenOverlay(null as never, null as never, out);
      assert.equal(inner.overlays.at(-1), last);
    }
  }
});

// HeldScene reads the film's own tails (heldFrame), so this needs a real one: none since the cosmos was built through (2026-10-02).
const NO_TAIL = TAILS.length === 0 && 'no part holds today (the cosmos built through, 2026-10-02, notes/bcos/sheet.md §12.1): runs again when a part grows a tail';

test('a hold with no segment or temporal of its scene falls back to the defaults, inside its tail', { skip: NO_TAIL }, () => {
  const t = TAILS[0];
  const bare: Renderable = { init: async () => {}, render: () => {}, look: () => FLAT_LOOK, dispose: () => {} };
  const hold = new HeldScene(() => bare);
  assert.deepEqual(hold.temporal(t.from + 3), { ...DEFAULT_TEMPORAL, persistence: 0 });
  assert.deepEqual(hold.segment(t.from + 3), { from: t.from, to: Infinity });
});

test('the camera energy holds with the picture, and a held tail never flashes', () => {
  for (const t of TAILS) {
    for (const f of [t.from, t.from + 0.25, t.to - 1, t.to - 0.75]) assert.deepEqual(rigAt(f), rigAt(heldFrame(f)), `${t.id} ${f}`);
    for (let f = t.from; f < t.to; f++) assert.equal(flashAt(f), 0, `${t.id} ${f}`);
  }
});

test('the film builds one scene per held part: its held span draws the same (shared) scene as its live one, made and initialised once', async () => {
  const spans = filmScenes();
  assert.equal(spans.length, SPANS.length);
  for (const t of TAILS) {
    const i = SPANS.findIndex((s) => s.held && s.from === t.from);
    assert.ok(i > 0, `${t.id} has a held span`);
    assert.equal(SPANS[i - 1].key, SPANS[i].key, `${t.id}: the span before it is its live one`);
    const live = spans[i - 1].make();
    const held = spans[i].make();
    assert.ok(held instanceof HeldScene, `${t.id}: drawn by a hold`);
    assert.equal((held as unknown as { inner: Renderable }).inner, live, `${t.id}: the hold draws the live span's scene`);
  }
});
