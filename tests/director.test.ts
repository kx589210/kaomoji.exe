import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Director, shared } from '../src/director.ts';
import { DEFAULT_TEMPORAL, type Segment } from '../src/engine/temporal.ts';
import { FLAT_LOOK, type FrameContext, type Renderable } from '../src/engine/types.ts';
import { FLIP } from '../src/score/build.ts';
import { partStart } from '../src/score/film.ts';
import { SPANS } from '../src/score/spans.ts';
import { TOTAL_FRAMES } from '../src/score/tempo.ts';

class Fake implements Renderable {
  readonly name: string;
  readonly frames: number[] = [];
  segment?: (frame: number) => Segment;
  constructor(name: string, own?: Segment) {
    this.name = name;
    if (own) this.segment = () => own;
  }
  async init() {}
  render(_gl: unknown, ctx: FrameContext) {
    this.frames.push(ctx.frame);
  }
  look() {
    return FLAT_LOOK;
  }
  dispose() {}
}

const ctx = (frame: number) => ({ frame }) as FrameContext;

test('builds only the scenes that overlap the composition and routes frames to them', () => {
  const made: string[] = [];
  const spans = [
    { from: 0, to: 100, make: () => (made.push('a'), new Fake('a')) },
    { from: 100, to: 200, make: () => (made.push('b'), new Fake('b')) },
    { from: 200, to: 300, make: () => (made.push('c'), new Fake('c')) },
  ];
  const d = new Director(spans, { from: 50, to: 150 });
  assert.deepEqual(made, ['a', 'b']);
  const gl = null as never;
  d.render(gl, ctx(99.9), gl);
  d.render(gl, ctx(100), gl);
  d.render(gl, ctx(-0.25), gl);
  d.render(gl, ctx(400), gl);
  const [a, b] = (d as unknown as { active: { scene: Fake }[] }).active.map((x) => x.scene);
  assert.deepEqual(a.frames, [99.9, -0.25]);
  assert.deepEqual(b.frames, [100, 400]);
});

test('a scene’s own segment wins; otherwise its span is the segment; sampling defaults', () => {
  const d = new Director([{ from: 0, to: 384, make: () => new Fake('intro', { from: 96, to: 384 }) }, { from: 384, to: 3456, make: () => new Fake('slate') }], { from: 0, to: 3456 });
  assert.deepEqual(d.segment(200), { from: 96, to: 384 });
  assert.deepEqual(d.segment(500), { from: 384, to: 3456 });
  assert.deepEqual(d.temporal(500), DEFAULT_TEMPORAL);
});

test('a range no scene covers is an error', () => {
  assert.throws(() => new Director([{ from: 0, to: 10, make: () => new Fake('a') }], { from: 20, to: 30 }), /no scene/);
});

/** A scene that owns a child scene, as a transition does. */
class Holder extends Fake {
  readonly child: Renderable;
  constructor(child: Renderable) {
    super('holder');
    this.child = child;
  }
  async init() {
    await this.child.init(null as never, { width: 1, height: 1 });
  }
  dispose() {
    this.child.dispose();
  }
}

test('a shared scene is made once, and its init and dispose run once however many owners call them', async () => {
  let made = 0;
  let inits = 0;
  let disposed = 0;
  class Counted extends Fake {
    async init() {
      inits++;
    }
    dispose() {
      disposed++;
    }
  }
  const s = shared(() => {
    made++;
    return new Counted('s');
  });
  const d = new Director(
    [
      { from: 0, to: 10, make: s },
      { from: 10, to: 20, make: s },
      { from: 20, to: 30, make: () => new Holder(s()) },
    ],
    { from: 0, to: 30 },
  );
  await d.init(null as never, { width: 1, height: 1 });
  d.dispose();
  assert.deepEqual([made, inits, disposed], [1, 1, 1]);
});

test('the scene spans cover the film end to end, and T2 is the flip window', () => {
  assert.equal(SPANS[0].from, partStart('intro'));
  assert.equal(SPANS[SPANS.length - 1].to, TOTAL_FRAMES);
  SPANS.forEach((s, i) => {
    assert.ok(s.to > s.from);
    if (i > 0) assert.equal(s.from, SPANS[i - 1].to);
  });
  assert.deepEqual(SPANS.find((s) => s.key === 't2'), { from: FLIP.from, to: FLIP.to, key: 't2' });
});
test("the director hands the energy's view to the pipeline and adds its flash to the scene's look", () => {
  const scene = { init: async () => {}, render: () => {}, look: () => FLAT_LOOK, dispose: () => {} };
  const plain = new Director([{ from: 0, to: 100, make: () => scene }], { from: 0, to: 100 });
  assert.deepEqual(plain.view(10), { zoom: 1, x: 0, y: 0, roll: 0 });
  assert.equal(plain.look(10).flash, undefined);
  const energy = { view: (f: number) => ({ zoom: 1 + f / 1000, x: 0, y: 0, roll: 0 }), flash: (f: number) => (f === 10 ? 0.4 : 0) };
  const d = new Director([{ from: 0, to: 100, make: () => scene }], { from: 0, to: 100 }, energy);
  assert.equal(d.view(20).zoom, 1.02);
  assert.equal(d.look(10).flash, 0.4);
  assert.equal(d.look(11).flash, undefined);
});
