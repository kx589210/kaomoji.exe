// The party monitor is a screen readout (review finding design-9): drawn once
// per output frame over the summed sub-frames, never inside a sub-frame, where
// the energy rig's kick punches and shakes would streak and double it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type * as THREE from 'three';
import { MINI_FACES } from '../src/content/drop1.ts';
import { Director, shared } from '../src/director.ts';
import { type FrameStep, frameSteps } from '../src/engine/pipeline.ts';
import { FLAT_LOOK, type FrameContext, type Renderable } from '../src/engine/types.ts';
import { IDENTITY_VIEW } from '../src/engine/view.ts';
import { ClubScene } from '../src/scenes/club.ts';
import { KosmosScene } from '../src/scenes/kosmos.ts';
import { FLIP, LEVELS, STUTTER } from '../src/score/drop1.ts';
import type { CardLayout } from '../src/shots/kosmos.ts';

/** Absorbs any GPU call: every property is itself, every call returns itself, every assignment is taken. */
const sink: never = new Proxy(() => undefined, {
  get: (_t, key) => (key === Symbol.toPrimitive ? () => 0 : key === 'then' ? undefined : sink),
  apply: () => sink,
  set: () => true,
}) as never;
const gl = sink as THREE.WebGLRenderer;
/** The target a draw went to, told apart by identity. */
const TARGET = { name: 'the frame' } as unknown as THREE.WebGLRenderTarget;

const at = (frame: number): FrameContext => ({ frame, cam: frame, t: frame / 60, beat: frame / 24, quality: 'final', width: 1920, height: 1080 });

/** Swaps a scene's readout layer for a spy; returns the draws it gets. */
function spyHud(scene: object): { target: unknown; frame: number }[] {
  const draws: { target: unknown; frame: number }[] = [];
  (scene as { hud: unknown }).hud = { init() {}, draw: (_gl: unknown, target: unknown, frame: number) => draws.push({ target, frame }), dispose() {} };
  return draws;
}
/** A scene before init(): its GPU layers (still null) replaced by the sink, so render() runs its pure part for real. */
function stubbed<S extends object>(scene: S, layout: unknown): S {
  for (const [k, v] of Object.entries(scene)) if (v === null) (scene as Record<string, unknown>)[k] = sink;
  (scene as { layout: unknown }).layout = layout;
  return scene;
}

/** A root at the throw (FLIP, club 3.3): the 0.75 shutter of the throw, a different kick punch at every instant, the space look's exposure. */
const punched = (overlay: boolean): Renderable => ({
  init: async () => {},
  render: () => {},
  look: () => ({ ...FLAT_LOOK, exposure: 1.25 }),
  temporal: () => ({ samples: 32, shutter: 0.75, persistence: 0 }),
  view: (f) => ({ zoom: 1.09, x: 16 * Math.sin(f * 40), y: -8, roll: 0.006 }),
  ...(overlay ? { screenOverlay: () => {} } : {}),
  dispose: () => {},
});
const kinds = (steps: FrameStep[]) => steps.map((s) => s.kind);
const subs = (steps: FrameStep[]) => steps.flatMap((s) => (s.kind === 'sub' ? [s] : []));

test('the pipeline draws the screen overlay once per output frame: after every sub-frame is summed (each through its own punch), before the finish', () => {
  const steps = frameSteps(punched(true), FLIP + 0.4, 'final', { width: 1920, height: 1080 });
  assert.deepEqual(kinds(steps), [...Array<string>(32).fill('sub'), 'overlay', 'finish']);
  assert.deepEqual(steps[32], { kind: 'overlay', frame: FLIP }, 'at the output frame');
  assert.ok(new Set(subs(steps).map((s) => s.view.x)).size > 1, 'the sub-frames keep their own views (the scene is still motion-blurred through the rig)');
  // Draft: one sub-frame, then the overlay, then the finish. A root with no overlay has no overlay step.
  assert.deepEqual(kinds(frameSteps(punched(true), FLIP, 'draft', { width: 1920, height: 1080 })), ['sub', 'overlay', 'finish']);
  assert.deepEqual(kinds(frameSteps(punched(false), FLIP, 'final', { width: 1920, height: 1080 })), [...Array<string>(32).fill('sub'), 'finish']);
  assert.deepEqual(frameSteps({ ...punched(false), view: undefined }, FLIP, 'draft', { width: 1920, height: 1080 })[0], {
    kind: 'sub', ctx: { ...at(FLIP), quality: 'draft' }, weight: 1, view: IDENTITY_VIEW,
  });
});

test("the look's exposure is applied once, to the finished sum, so the overlay drawn over the sum is exposed like the scene under it", () => {
  const steps = frameSteps(punched(true), FLIP, 'final', { width: 1920, height: 1080 });
  const total = subs(steps).reduce((a, s) => a + s.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `the sub-frames' weights sum to 1, not ${total}`);
  const finish = steps[steps.length - 1];
  assert.ok(finish.kind === 'finish' && finish.look.exposure === 1.25 && finish.frame === FLIP);
});

test('the club draws the party monitor in screenOverlay(), never in render() (where the rig would warp it)', () => {
  const club = stubbed(new ClubScene(), { advance: () => 0.6 });
  const draws = spyHud(club);
  // FLIP: the readout is up, the kick punch is on, the shutter is 0.75.
  club.render(gl, at(FLIP + 0.2), TARGET);
  assert.deepEqual(draws, [], 'render() draws no readout');
  club.screenOverlay(gl, TARGET, FLIP);
  assert.deepEqual(draws, [{ target: TARGET, frame: FLIP }]);
});

test('the cosmos draws the party monitor in screenOverlay(), never in render()', () => {
  const layout: CardLayout = { aspect: () => 2, quadPerEm: 1.25, faces: MINI_FACES };
  const kosmos = stubbed(new KosmosScene(), layout);
  const draws = spyHud(kosmos);
  // Earth's window (half a beat after Earth arrives, cosmos 2.1&); the stutter's (two frames before it).
  const earth = LEVELS.earth + 12;
  kosmos.render(gl, at(earth + 0.1), TARGET);
  kosmos.render(gl, at(STUTTER.from - 2), TARGET);
  assert.deepEqual(draws, [], 'render() draws no readout');
  kosmos.screenOverlay(gl, TARGET, earth);
  assert.deepEqual(draws, [{ target: TARGET, frame: earth }]);
});

test('the director hands the overlay to the scene of the output frame, through a shared scene too; a scene without one draws nothing', () => {
  const calls: [string, number][] = [];
  const scene = (name: string, overlay: boolean): Renderable => ({
    init: async () => {},
    render: () => {},
    look: () => FLAT_LOOK,
    ...(overlay ? { screenOverlay: (_gl: THREE.WebGLRenderer, _t: THREE.WebGLRenderTarget, frame: number) => void calls.push([name, frame]) } : {}),
    dispose: () => {},
  });
  const d = new Director(
    [
      { from: 0, to: 100, make: () => scene('a', true) },
      { from: 100, to: 200, make: shared(() => scene('b', true)) },
      { from: 200, to: 300, make: () => scene('c', false) },
    ],
    { from: 0, to: 300 },
  );
  for (const f of [50, 150, 250]) d.screenOverlay(gl, TARGET, f);
  assert.deepEqual(calls, [['a', 50], ['b', 150]]);
});
