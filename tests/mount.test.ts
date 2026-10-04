import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mountRoot } from '../src/engine/mount.ts';
import { FLAT_LOOK, type Renderable } from '../src/engine/types.ts';

class Counting implements Renderable {
  inits = 0;
  disposals = 0;
  async init() {
    this.inits++;
  }
  render() {}
  look() {
    return FLAT_LOOK;
  }
  dispose() {
    this.disposals++;
  }
}

test('every mount gets a fresh root, so a disposed root is never initialised again', async () => {
  const made: Counting[] = [];
  const create = () => {
    const r = new Counting();
    made.push(r);
    return r;
  };
  const first = mountRoot(create);
  await first.root.init(null as never, { width: 1, height: 1 });
  first.release();
  const second = mountRoot(create);
  await second.root.init(null as never, { width: 1, height: 1 });
  assert.notEqual(second.root, first.root);
  assert.deepEqual(made.map((r) => [r.inits, r.disposals]), [[1, 1], [1, 0]]);
});

test('releasing twice disposes once', () => {
  const m = mountRoot(() => new Counting());
  m.release();
  m.release();
  assert.equal((m.root as Counting).disposals, 1);
});
