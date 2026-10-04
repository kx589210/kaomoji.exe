// The comic club INK: the rig never blurs (build sheet notes/b58/club-sheet.md §10.2, review R2-4). The pipeline samples every
// sub-frame through its own screen-space view (src/engine/pipeline.ts frameSteps: view = energy.view(s.cam)), so each punch and shake
// smears the whole frame across the shutter, and the comic pass prints every smeared K keyline as a dotted double line for 3–4 frames
// after each kick and clap. In the club the rig is taken at the output frame instead (what a draft shows), from club 1.1 to the hit; the
// v04 glass beat (HIT → break 1.1) keeps v04's per-instant rig, so it stays identical. Measured through the real film (the Director over
// filmScenes() with the film's ENERGY, as Film.tsx builds it) and the KX-ClubInk preview (ClubInkScene with INK_ENERGY).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Director } from '../src/director.ts';
import { type FrameStep, frameSteps } from '../src/engine/pipeline.ts';
import type { View } from '../src/engine/view.ts';
import { ClubInkScene } from '../src/scenes/clubInk.ts';
import { filmScenes } from '../src/scenes/index.ts';
import * as C from '../src/score/club.ts';
import { ENERGY, rigAt } from '../src/score/energy.ts';
import { INK_ENERGY, inkRigAt } from '../src/shots/clubInk.ts';

const SIZE = { width: 1920, height: 1080 };
/** The frame's corners and edge midpoints (1080p px, y up, from the centre): where a zoom or a roll moves the picture most. */
const EDGE: readonly (readonly [number, number])[] = [[-960, -540], [960, -540], [-960, 540], [960, 540], [0, 540], [0, -540], [-960, 0], [960, 0]];

/** Where the view puts the rendered frame's point `p` on screen (zoom about the centre, then roll, then the move). */
const place = (v: View, p: readonly [number, number]): [number, number] => {
  const c = Math.cos(v.roll);
  const s = Math.sin(v.roll);
  return [v.zoom * (c * p[0] - s * p[1]) + v.x, v.zoom * (s * p[0] + c * p[1]) + v.y];
};
/** The rendered frame's point that view `v` puts at screen point `q`. */
const unplace = (v: View, q: readonly [number, number]): [number, number] => {
  const x = (q[0] - v.x) / v.zoom;
  const y = (q[1] - v.y) / v.zoom;
  const c = Math.cos(-v.roll);
  const s = Math.sin(-v.roll);
  return [c * x - s * y, s * x + c * y];
};
const subs = (steps: readonly FrameStep[]) => steps.flatMap((s) => (s.kind === 'sub' ? [s] : []));

/** How far (px at 1080p) the rig smears a point seen at the frame's edge across the sub-frames of output frame `F`. */
function rigSmear(root: Director, F: number): number {
  const views = subs(frameSteps(root, F, 'final', SIZE)).map((s) => s.view);
  const ref = root.view(F);
  let worst = 0;
  for (const q of EDGE) {
    const p = unplace(ref, q);
    const at = views.map((v) => place(v, p));
    for (const a of at) for (const b of at) worst = Math.max(worst, Math.hypot(a[0] - b[0], a[1] - b[1]));
  }
  return worst;
}

const film = (): Director => new Director(filmScenes(), C.CLUB, ENERGY);
const preview = (): Director => new Director([{ from: C.CLUB.from, to: C.CLUB.to, make: () => new ClubInkScene() }], C.CLUB, INK_ENERGY);

/** Club frames (as +L) whose rig smears an edge point by more than `max` px within their shutter. */
function smeared(root: Director, max: number): string[] {
  const out: string[] = [];
  for (let F = C.CLUB.from; F < C.HIT; F++) {
    const s = rigSmear(root, F);
    if (s > max) out.push(`+${F - C.CLUB.from} (${s.toFixed(1)} px)`);
  }
  return out;
}

// R2-4, landed (integration r2): both energy views take the rig at C.clubRigInstant (src/score/club.ts). Before it, on the tree of
// 2026-10-02, 174 of the 328 rig-moving frames before the hit smeared an edge point by more than 1 px, 104 by more than 2 (up to 13.5 px:
// the kick cup, club 1.1, LOCK, the throw), on the drum frames and the 1–3 after them.

test('the film: from club 1.1 to the hit, no punch or shake of the rig moves the picture within an output frame’s shutter (≤ 1 px at the frame’s edge)', () => {
  const bad = smeared(film(), 1);
  assert.deepEqual(bad.slice(0, 24), [], `${bad.length} frames smeared by the rig`);
});

test('KX-ClubInk (the preview, INK_ENERGY): the same — the rig never blurs before the hit', () => {
  const bad = smeared(preview(), 1);
  assert.deepEqual(bad.slice(0, 24), [], `${bad.length} frames smeared by the rig`);
});

test('the v04 glass beat keeps v04’s rig: from the hit to break 1.1 every sub-frame is seen through the rig of its own instant (the hit’s shake motion-blurred, as approved)', () => {
  const root = film();
  for (let F = C.HIT; F < C.CLUB.to; F++) {
    for (const s of subs(frameSteps(root, F, 'final', SIZE))) assert.deepEqual(s.view, rigAt(s.ctx.cam), `${F} @ ${s.ctx.cam}`);
  }
  // …and that rig does move within the shutter there (the hit's shake), so a hold that leaked past HIT would show here.
  assert.ok(rigSmear(root, C.HIT + 1) > 1, `the hit's shake is blurred on HIT + 1 (${rigSmear(root, C.HIT + 1).toFixed(2)} px)`);
});

test('the hold changes only the smear: every output frame keeps its own rig (the draft’s), against the per-instant rig the film had before R2-4; no edge point moves at all before the hit; the glass beat’s smear is unchanged', () => {
  const held = film();
  const perInstant = new Director(filmScenes(), C.CLUB, { ...ENERGY, view: rigAt });
  assert.deepEqual(smeared(held, 0), []);
  // Continuity plan v07 §4: before the hit each output frame shows the rig of the next frame's instant (RIG_LEAD), so every punch and
  // shake lands on its drum's own frame; from the hit on, its own.
  for (let F = C.CLUB.from; F < C.CLUB.to; F++) assert.deepEqual(held.view(F), perInstant.view(F < C.HIT ? Math.min(C.HIT, F + 1) : F), `${F}`);
  for (let F = C.HIT; F < C.CLUB.to; F++) assert.equal(rigSmear(held, F), rigSmear(perInstant, F), `${F}`);
  // …and the per-instant rig really did smear the drum frames (so the hold is what makes the first two tests pass).
  assert.ok(smeared(perInstant, 2).length > 50, 'the per-instant rig smears the club’s drum frames');
});

test('the energy views are exactly the held rig: the film’s ENERGY.view = rigAt ∘ clubRigInstant, KX-ClubInk’s = inkRigAt ∘ clubRigInstant', () => {
  for (let at = C.CLUB.from - 2; at < C.CLUB.to + 2; at += 0.125) {
    assert.deepEqual(ENERGY.view(at), rigAt(C.clubRigInstant(at)), `${at}`);
    assert.deepEqual(INK_ENERGY.view(at), inkRigAt(C.clubRigInstant(at)), `${at}`);
  }
});

test('the club’s punches land on their kicks (plan v07 §4: a punch is nothing on its own frame, so taken at the frame it landed a frame late): each punch’s biggest zoom step is onto its own frame', () => {
  const z = (f: number) => ENERGY.view(f).zoom;
  for (const a of C.CLUB_ACCENTS.filter((x) => (x.punch ?? 0) > 0 && x.at < C.HIT && x.at > C.CLUB.from && !(x.shake ?? 0))) {
    const on = z(a.at) - z(a.at - 1);
    for (let t = 1; t < 6; t++) assert.ok(z(a.at + t) - z(a.at + t - 1) < on, `${a.at}+${t}: a bigger step than the kick's own`);
    assert.ok(on > 0.8 * a.punch!, `${a.at}: ${on.toFixed(4)} of ${a.punch} on the kick's frame`);
  }
  // Every kick before the throw punches (the ink grammar's kick), but where the shot's own camera launches.
  for (const k of C.KICKS.filter((f) => f < C.THROW && f > C.CLUB.from)) {
    if (C.KICK_PUNCH_SKIP.includes(k)) continue;
    assert.ok(C.CLUB_ACCENTS.some((a) => a.at === k && (a.punch ?? 0) >= 0.02), `${k} punches`);
  }
});
