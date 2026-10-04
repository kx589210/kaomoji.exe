// v2 of the hero in the flat bars (src/shots/breakHero.ts with v2 = true; sheet notes/bid2/break-sheet2.md §3, §7.2): only two things
// about him change — his ±4° wobble after the slam (the floor tilts, the camera stays level) and the shard's flight, which must end on its
// slot's LIVE screen place under the travelling camera. Everything else is v04's (the v04 tests hold the identity layer).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIZZY, LOCK, SHARD_FLIGHT, SHARD_STAYS, WOBBLE } from '../src/score/break.ts';
import { heroAt, shardScreen, wobbleAt } from '../src/shots/breakHero.ts';
import { breakCam, flatCamV2, fromScreen, toScreen } from '../src/shots/breakShared.ts';

test('3.3: dizzy after the slam he wobbles ±4° — 1.5 wobbles over the beat, dying away — and never outside it', () => {
  assert.equal(WOBBLE.from, DIZZY);
  let peak = 0;
  for (let t = WOBBLE.from - 24; t < WOBBLE.to + 24; t += 0.25) {
    const w = wobbleAt(t);
    if (t < WOBBLE.from || t >= WOBBLE.to) assert.equal(w, 0, `still on ${t}`);
    assert.ok(Math.abs(w) <= 4);
    peak = Math.max(peak, Math.abs(w));
  }
  assert.ok(peak > 3.2, `it wobbles: ${peak}`);
  assert.ok(Math.abs(wobbleAt(WOBBLE.to - 0.25)) < 0.2, 'dies away into the next beat');
});

test('the wobble is v2’s only: heroAt(f) without v2 is untouched through it, with v2 his fragments turn', () => {
  const f = WOBBLE.from + 4;
  const a = heroAt(f);
  const b = heroAt(f, true);
  assert.deepEqual(a, heroAt(f, false));
  assert.notDeepEqual(a.frags.map((x) => x.m), b.frags.map((x) => x.m));
});

test('E2 under the travelling camera: the shard leaves the glass exactly as the fall drew it and lands on its slot’s live screen place on the lock', () => {
  for (let t = SHARD_STAYS; t < SHARD_FLIGHT.from; t += 1) assert.deepEqual(shardScreen(t, true), shardScreen(t), `on the glass on ${t}`);
  // On the lock (the flight's end) its centroid is the slot as the v2 camera shows it, not as v04's did.
  const end = shardScreen(SHARD_FLIGHT.to - 1e-6, true).centre;
  const slot = shardScreen(SHARD_FLIGHT.to - 1e-6).centre;
  const cam = flatCamV2(LOCK);
  const moved = Math.hypot(end[0] - slot[0], end[1] - slot[1]);
  assert.ok(moved > 50, `the v2 camera has moved the slot: ${moved.toFixed(0)} px`);
  // The live place: the slot (v04's screen slot taken back into the world through v04's camera) through the v2 camera.
  const restLive = toScreen(cam, ...fromScreen(breakCam(SHARD_FLIGHT.to), slot[0], slot[1]));
  assert.ok(Math.hypot(end[0] - restLive[0], end[1] - restLive[1]) < 1.5, `home: ${end.map((v) => v.toFixed(1))} vs ${restLive.map((v) => v.toFixed(1))}`);
});
