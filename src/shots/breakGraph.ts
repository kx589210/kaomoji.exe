// Break bar 6, GRAPH (new): the graph-editor rollercoaster — the pure model (what is where, at every instant). Build sheet
// notes/bid2/break-sheet2.md §3 "Break 6 · GRAPH", §5 C6 / C7, §6, §7.2; design notes/extend/interlude-final.md §3.6, §3.9–§3.11,
// §4.2, §5.2–§5.3, §6 #11–#13, §7 (its widget's bar-32 code notes/extend/iw/src/c.js, and the ride camera's ride.mjs). The drawing
// (shapes, glyphs, polygons) is src/shots/breakGraphDraw.ts; the GPU side src/scenes/breakGraph.ts.
//
// The antivirus's core drags him into a graph editor to "ease him to 0 px/f". The track is his own y over time — the curve a
// rollercoaster is — and its ten keyframes sit on the bar's drum hits, valued his signature E2 80 A2 20 CF 89 20 E2 80 A2 (`• ω •` in
// UTF-8). He rides it: the reveal pulls back from the selection (C6), a bunny hop, the big plunge bottoming out on the backbeat, the lift
// hill's ratchet on the 16th hats, airtime on the crest, the second plunge, the easeOutBack spike, the elastic rattle on the 16th fill.
// Then the red cursor rewinds the last key: the curve folds back into a red easeInBack hook (anticipation), k10's bezier handles stretch
// behind him into a V, and he is flung left into a whip with a hidden cut (C7), where the slingshot's band catches him on break 7.1.
//
// Coordinates are the break's layout px (1920 × 1080, y down; src/shots/breakShared.ts): world x = 24 px a frame from break 6.1, rail y =
// 980 − value × 3.6, his ω 138 over the rail in his car. The camera is a BreakCam whose bank pivots on the playhead's anchor on screen
// (the centre is solved for it). Time is part-local through the score's names (never a film frame). Plain Node imports this file (tests):
// no three / remotion / react.
//
// Where this differs from the design (each one a builder's ruling, reasoned where it is made):
//   his em 220 → 150 after the cut (TRACK / RIDE_EM); his ω 150 → 138 over the rail, on the car's normal (the car rides two wheels on
//   the rail and touches down level in the valleys: VALLEYS, TOUCH); the camera locks the playhead, not his leaning ω; the clamp gives
//   the spring no momentum (as ride.mjs); the rattle soft-limits the car's tilt (RATTLE_TILT); the impacts and the fling lead their
//   drums by a quarter frame and the bottoms print with a short shutter (HIT_LEAD, FLUNG, IMPACT_SHUTTER); the whip crashes in to the
//   slingshot's catch size (whipZoom) instead of holding Z 1 — C7 would otherwise hand a 150 px him to a 468 px him.
// Review round 1 (2026-10-02, the graph fixer; break8-wip-v02's findings F1, F3, F6, SYNC-2, BOTTOM-SNAP, CURSOR-EYE). check-sync's
// picture change saturates: any whole-world move changes the picture about as much as the next, so a kick only reads when the frames
// before it are still or slow and its own frame carries all of its move. Each of the bar's kicks is now such a frame (bar 6: 7 of 7
// on the beat, from 3 of 7):
//   - one sharp instant per frame: the track through the ride (its ink went grey under the shutter, F3), him and his car from the
//     second bottom to the hidden cut (the dive, the yank and the crash-in smeared the bar's story beat, F1) and on the ratchet's notches,
//     the cursor from its swoop; the world streaks past him on the fling (the widget's grammar). (Round 2 replaced it: below.)
//   - the lift hill ratchets (RATCHET, rideT / camT; 6.3): the chain hauls the train up a 16th a notch on the two 16th hats, the camera
//     holding dead still between while he creeps on; he teeters on the crest for a beat and the crest's kick tips him over it — the notch,
//     the pull-back to Z 0.88 (CREST_PULL), the 70 px airtime throw (AIR), the copies' hop, k5's ◆ pop and ring all on its frame. (Round
//     1's first try — an I pull-back landing on the kick plus a 2 % scene punch — still left 6.3 "none": the lift hill kept the whole
//     frame moving 35 px a frame. The punch, which peaks the frame after its kick, is gone; the rig's own CREST punch stays.)
//   - three snaps, each from stillness: on 6.4e the cursor clicks k10, the view snaps to the selection (CLICK_SNAP / SELECT: "frame
//     selected") and C6's red marquee snaps round it with a dim outside (selectionAt), held still while he dives and rattles in it; on 6.4&
//     the yank snaps him to full draw by the kick's own instant (DRAW_FRAMES, YANK), Σ(⊙ω⊙) popping, the marquee gone, the camera
//     tracking him — then five still frames to read the slingshot; on 6.4a the fling, C7's violet colour carry (AXIS_FLING, the
//     integrator's I-6) crossing the frame within the kick's frame and the crash-in landing on the hidden cut (whipZoom). The design's
//     swing on 6.4& smeared the hook it was meant to show; the integrator's rattle lock (±14 px) had the world dive past him in a blur.
//   - the bottoms: the cusp rounds over 2 frames (TOUCH); a bottom gives to 706 and the camera is pulled after him (GIVE_TAU); his ω never
//     moves more than RATE px a frame on screen through the ride (the spike flung him 252) (BOTTOM-SNAP). The camera still stops dead
//     with him on each bottom — the world jumps ≈ 225 px on the first bottom's frame: the backbeat's slam, kept as the impact (ruling).
//   - the cursor lives (F6): it hovers, shakes ±3 px every 2 f, drifts toward him, twitches on each bottom, swoops on the 32nd before the
//     click and lands on 6.4e; it holds the key from under it (GRAB), off his face (CURSOR-EYE).
// Review round 2 (2026-10-02, the graph fixer; break8-wip-v04's G-1 and C7-VIOLET-VOID; sheet §6.3):
//   - short shutters, not one instant (groupShutter, groupAt): round 1's sharp prints were stop-motion at the climax (his ω 149, 128,
//     … 269 px a frame with nothing between: a strobe at his face, 6 × 6 at 6 failing blocks). The track takes TRACK_SHUTTER (0.15)
//     through the ride, him HERO_SHUTTER (0.2) from the spike through the yank, each sampled by all of the frame's sub-frames; one sharp
//     instant only on the snaps (the notches, the click, the yank), the track on the bottoms (the world's slam) and him from full draw
//     to the cut (as the sling side prints him across C7).
//   - the elastic rattle dives for three frames, not 0.9 (RATTLE_ELASTIC), its bottom on the fill's 32nd; the click's still framing is
//     RATE-capped like the ride (CLICK_DRAG; dormant) and wider (SELECT Z 0.82 → 0.78) so the dive's crest stays in the window.
//   - the ties every 72 px of arc, not 48 (TIE_PITCH): at 24 px a frame 48 stepped exactly half a pitch (the ladder read backwards).
//   - C7: the flung violet panel carries the whip — the sling side's ground streaks (and the axis's hex labels) stream over it from the
//     fling, rising into the sling side's cut strength (FLUNG_STREAKS), so they run unbroken across the hidden cut.
import { SIGNATURE } from '../content/break.ts';
import { HERO_FACES_V2 } from '../content/castBreak.ts';
import { clamp, ease, lerp } from '../engine/math.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import {
  ARMS_UP,
  BOTTOMS,
  CHAIN_CLICKS,
  CHIPS_FOLD,
  CHIPS_REVEAL,
  CLAPS_V2,
  CLOSED_HATS_V2,
  CREST,
  FLING,
  GRAPH,
  GRAPH_KEYS,
  KICKS_V2,
  LABELS,
  OPEN_HATS_V2,
  RATTLE,
  REWIND,
  RIDE,
  SELECT_FOLD,
  WHIP,
  WHIP_CUT,
  CATCH,
  GRAPH_V2 as BR_GRAPH_V2,
} from '../score/break.ts';
import { partBar } from '../score/film.ts';
import { FRAMES_PER_BEAT } from '../score/tempo.ts';
import { SLING_KEYS, WHIP_IN_ZOOM } from './breakLaunch.ts';
import { BREAK_LOOK, type BreakCam, flow, frameOf, launchL, pop, rotate } from './breakShared.ts';

type V2 = readonly [number, number];
const G0 = GRAPH.from;
const THIRTY_SECOND = FRAMES_PER_BEAT / 8;

/**
 * The switch (sheet §4.1): true, the dispatcher (src/scenes/break.ts) draws break 6.1 → 6.4a with this bar; false, with the skeleton's
 * stub (the flat world's last frame, held) — for the identity proofs of the frames around it. Defined in src/score/break.ts with the
 * other two (a proof bundle turns it off with __KX_GRAPH_V04__), so the rig (BREAK_ACCENTS) follows it.
 */
export const GRAPH_V2: boolean = BR_GRAPH_V2;

// ——— The track ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * World x per frame, the rail's base (value 0x00) and px per value unit, his ω's height over the rail (138: his ω sits on the car's top
 * edge — the design's 150 left him floating over it), the lead-in's far end.
 */
export const TRACK = { pxPerFrame: 24, base: 980, valuePx: 3.6, seat: 138, leadIn: -2400 } as const;
/**
 * His em: 220 on the cut (× its Z 1.60 = 352, the flat world's 414 × 0.85 on 5.4&: C6, ×1.00), settling into his seat at 150 with the
 * reveal (L): at the design's 220 his face covered the track he rides; at 150 the coaster, its keys and chips read around him.
 */
export const CUT_EM = 220;
export const RIDE_EM = 150;
/**
 * An impact's picture starts a quarter frame before its drum: the beat frame's shutter opens there (sub-frames span ±0.25), so the whole
 * of the beat frame shows the hit — not half of it, ghosted over the frame before (a beat frame opens at most a quarter frame early).
 */
export const HIT_LEAD = 0.25;
/** His car: an ink pill (w × h) whose centre rides `lift` over the rail, its wheels on the rails, its top edge at his ω's underside. */
export const CAR = { w: 360, h: 80, lift: 46, wheel: 120, wheelR: 19 } as const;

const C1 = 1.70158;
const C3 = C1 + 1;
/**
 * The elastic rattle's shape (k8 → k9, the 16th fill: six frames), in frames of its segment (review round 2, G-1). Penner's preset
 * dives 0xE2 → 0x80 and 30 % past it in 0.9 of a frame: under the click's still framing that flung his ω 269 px down the screen in one
 * frame (+558 → +559), then rang him ±100 px every 1.8 frames — a local strobe at his face (6 × 6 r3c2: 8 transitions in 11 frames).
 * Here the dive launches off the fill's kick and takes three frames to its overshoot (`over` past 0x80, decelerating: 1 − (1 − s)^1.2),
 * landing on the fill's 32nd — the second jolt and the eye swap are its bottom — then rings back once (a damped spring from rest,
 * `period` frames, decaying at `decay` a frame) and settles on k9. His ω's steps on screen: ≈ 130, 120, 90 px, then ≤ 50 (RATE 150).
 * (Two frames, as the review proposed, cannot stay under RATE at the click's Z 0.82: the drop alone is 289 px on screen.)
 */
export const RATTLE_ELASTIC = { frames: 6, dive: 3, over: 0.2, decay: 0.5, period: 4 } as const;
function rattleElastic(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const { frames, dive, over, decay, period } = RATTLE_ELASTIC;
  const t = u * frames;
  if (t < dive) return (1 + over) * (1 - (1 - t / dive) ** 1.2);
  const w = (2 * Math.PI) / period;
  const tau = t - dive;
  return 1 + over * Math.exp(-decay * tau) * (Math.cos(w * tau) + (decay / w) * Math.sin(w * tau));
}
/** Robert Penner's easings (the generic preset names), one per segment: the track's shape (outElastic: the rattle's own, above). */
export const EASES = {
  inCubic: (u: number): number => u * u * u,
  outQuad: (u: number): number => 1 - (1 - u) * (1 - u),
  inQuart: (u: number): number => u ** 4,
  inOutSine: (u: number): number => (1 - Math.cos(Math.PI * u)) / 2,
  inSine: (u: number): number => 1 - Math.cos((u * Math.PI) / 2),
  outBack: (u: number): number => 1 + C3 * (u - 1) ** 3 + C1 * (u - 1) ** 2,
  outElastic: rattleElastic,
  inBack: (u: number): number => C3 * u * u * u - C1 * u * u,
} as const;
export type EaseName = keyof typeof EASES;

/** The drums a key sits on, as icon bits: 1 kick (◆ yellow), 2 clap (⧗ violet), 4 hat (● mint; a closed hat only when nothing else plays). */
const drumsOf = (f: number): number => {
  const kick = KICKS_V2.includes(f) ? 1 : 0;
  const clap = CLAPS_V2.includes(f) ? 2 : 0;
  const hat = OPEN_HATS_V2.includes(f) || (!kick && !clap && CLOSED_HATS_V2.includes(f)) ? 4 : 0;
  return kick | clap | hat;
};

/** The ten keyframes (k1 … k10): their frames (the drum hits), world x, values (the signature's bytes), the easing of the segment after each. */
export type Key = { readonly frame: number; readonly x: number; readonly value: number; readonly byte: string; readonly ease: EaseName | null; readonly drums: number };
const KEY_EASES: readonly (EaseName | null)[] = ['inCubic', 'outQuad', 'inQuart', 'inOutSine', 'inSine', 'inCubic', 'outBack', 'outElastic', 'inBack', null];
export const KEYS: readonly Key[] = GRAPH_KEYS.map((frame, i) => ({
  frame,
  x: (frame - G0) * TRACK.pxPerFrame,
  value: parseInt(SIGNATURE[i], 16),
  byte: SIGNATURE[i],
  ease: KEY_EASES[i],
  drums: drumsOf(frame),
}));

/** The curve's value (0x00–0xFF, the spike overshoots) at instant f: the flat lead-in at k1's value before break 6.1, k10's after. */
export function valueAt(f: number): number {
  if (f <= KEYS[0].frame) return KEYS[0].value;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (f <= b.frame) return a.value + (b.value - a.value) * EASES[a.ease!](clamp((f - a.frame) / (b.frame - a.frame)));
  }
  return KEYS[KEYS.length - 1].value;
}
/** The rail's world y at instant f (his car is on it at f). */
export const railY = (f: number): number => TRACK.base - valueAt(f) * TRACK.valuePx;
/** The rail's world y at world x. */
export const railAtX = (x: number): number => railY(G0 + x / TRACK.pxPerFrame);
/** A key's point on the rail (world). */
export const keyPoint = (i: number): V2 => [KEYS[i].x, railY(KEYS[i].frame)];

/** Arc length along the rail (world px), tabulated every 2 px of x from the lead-in's far end to k10. */
const ARC_STEP = 2;
const ARC: Float64Array = (() => {
  const n = Math.round((KEYS[9].x - TRACK.leadIn) / ARC_STEP);
  const a = new Float64Array(n + 1);
  let prev = railAtX(TRACK.leadIn);
  for (let i = 1; i <= n; i++) {
    const y = railAtX(TRACK.leadIn + i * ARC_STEP);
    a[i] = a[i - 1] + Math.hypot(ARC_STEP, y - prev);
    prev = y;
  }
  return a;
})();
/** The arc length (world px) from the lead-in's far end to world x on the rail. */
export function arcOfX(x: number): number {
  const k = clamp((x - TRACK.leadIn) / ARC_STEP, 0, ARC.length - 1);
  const i = Math.min(Math.floor(k), ARC.length - 2);
  return lerp(ARC[i], ARC[i + 1], k - i);
}
/** The world x at arc length s along the rail (the inverse of arcOfX). */
export function xOfArc(s: number): number {
  if (s <= 0) return TRACK.leadIn + s;
  let lo = 0;
  let hi = ARC.length - 1;
  if (s >= ARC[hi]) return TRACK.leadIn + hi * ARC_STEP;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (ARC[m] < s) lo = m;
    else hi = m;
  }
  return TRACK.leadIn + (lo + (s - ARC[lo]) / Math.max(1e-9, ARC[hi] - ARC[lo])) * ARC_STEP;
}
/**
 * A car's slope (dy/dx) at world x. A key is a corner (a plunge ends steep where the next segment starts flat or climbs), so at a corner
 * the car takes the flatter side, and where the rail turns from down to up (or up to down) it sits level: on the bottoms it lies in the
 * valley instead of standing on end.
 */
export function carSlope(x: number): number {
  const b = (railAtX(x) - railAtX(x - 4)) / 4;
  const f = (railAtX(x + 4) - railAtX(x)) / 4;
  return b * f < 0 ? 0 : Math.abs(b) < Math.abs(f) ? b : f;
}

// ——— The rewind and the fling ————————————————————————————————————————————————————————————————————————————————————————————————————

/** Where the cursor drags k10 (world): back in time past k9 (x 1560: break 6.3a's place) and below 0x00 (y > 980). */
export const DRAG_TO: V2 = [1560, 1040];
/** k10's two bezier handles' grips, pinned where k10 was (world): the V's two ends, the band's cords to be. */
export const GRIPS: readonly [V2, V2] = [
  [KEYS[9].x - 96, railY(KEYS[9].frame)],
  [KEYS[9].x + 96, railY(KEYS[9].frame)],
];
type Bezier = readonly [V2, V2, V2, V2];
const bez = (P: Bezier, t: number): V2 => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
};
export const bezierAt = bez;
/**
 * THE REWIND (break 6.4&): the last segment (k9 → k10, easeInBack) folds back into a red hook as the cursor drags k10 to DRAG_TO over 4
 * frames (cubic out): its control points from the curve's own (k9 + (48, 40), k10 − (48, 0)) to the hook's (k9 + (300, −20), the dragged
 * key + (420, 40)). Null before the rewind.
 */
export function hookAt(f: number): Bezier | null {
  if (f < YANK) return null;
  const e = ease.outCubic(clamp((f - YANK) / DRAW_FRAMES));
  const k9 = keyPoint(8);
  const k10 = keyPoint(9);
  const d: V2 = [lerp(k10[0], DRAG_TO[0], e), lerp(k10[1], DRAG_TO[1], e)];
  return [k9, [k9[0] + lerp(48, 300, e), k9[1] + lerp(40, -20, e)], [d[0] + lerp(-48, 420, e), d[1] + lerp(0, 40, e)], d];
}
/**
 * How far along the hook his car is carried back: 0 at k9 as the yank starts, 1 at the dragged key 0.9 frames later (cubic out: snapped
 * off the kick, home within 3 px on the kick's own instant) — full draw, held from the kick's frame to the fling: six frames for the
 * slingshot to read (round 1 F1: over the design's 4 frames the swing and the yank smeared him and the hook through 564–566; over 2,
 * the kick's frame carried only 58 % of the snap and the frame after it as much picture change as the kick's own: 6.4& "none").
 */
export const DRAW_FRAMES = 0.9;
/**
 * The instant the fling's motion starts: a quarter frame before the 16th kick (FLING), so the kick's frame is all flight — a launch, not
 * a still pose ghosted under a streak (the same lead as an impact's, HIT_LEAD).
 */
export const FLUNG = FLING - 0.25;
/**
 * The instant the rewind's yank starts: three quarters of a frame before its kick (REWIND), where the frame before it closes its shutter
 * — the kick's frame is all yank and its one sharp instant shows the hook snapped almost home: the rewind's hit is the kick's frame.
 */
export const YANK = REWIND.from - 0.75;
/**
 * The cursor's swoop (the 32nd before 6.4e, cubic in): it lands on the key on the fill's kick — the click — so its last step is the
 * kick's frame.
 */
export const SWOOP = { from: RATTLE.from - THIRTY_SECOND, to: RATTLE.from } as const;
/** How far the yank has carried him along the hook at instant f (0 → 1, cubic out over DRAW_FRAMES from YANK). */
export const hookU = (f: number): number => ease.outCubic(clamp((f - YANK) / DRAW_FRAMES));

/**
 * THE RATCHET (the lift hill, 6.2& → 6.3; round 1 F3 / SYNC-2). The design's lift hill is "the ratchet on the 16th hats", but a car
 * hauled at an even 24 px a frame with the camera climbing after it kept the whole frame moving 35 px a frame: the crest's kick had
 * nothing to stand out from (6.3 "none" in v02 and with every crest punch tried in round 1 — any whole-world move changes the picture
 * about as much as the next). So the ride's time — where he, his train, the playhead and the camera are along the track (rideT) — is
 * pulled up the hill in notches on the chain's clicks: on 6.2a and 6.2a + 6 (the 16th hats) the chain hauls the train a 16th of track
 * in one frame (cubic out over `dur` from `lead` before the hat — the frame before has closed its shutter, and the hat's own frame
 * shows it 98 % done: the notch is that frame's, none of it left for the next), then holds, the train creeping on (`creep`: the
 * chain's slack) under a camera that holds dead still (camT: a living hold — he moves, the world does not), so it is on the crest a
 * beat early and teeters there. On the crest's kick the last notch tips him over it (`tip` frames of track) and the ride runs at
 * `catchUp` × until it has caught the music up. The click on 6.2& (+510) stays a clack: a notch there would cut the bottom's recoil
 * short (the judge's "never a slam"). Outside, rideT = f.
 */
export const RATCHET = { hats: [CHAIN_CLICKS[1], CHAIN_CLICKS[2]], lead: 0.75, dur: 1, creep: 0.1, tip: 2.5, catchUp: 0.5 } as const;
/** The notches' frames: the two hats and the crest's kick (each notch is its frame's). */
export const NOTCHES: readonly number[] = [...RATCHET.hats, CREST];
type Knot = { f0: number; f1: number; t0: number; t1: number; notch: boolean };
const RATCHET_KNOTS: readonly Knot[] = (() => {
  const { hats, lead, dur, creep, tip, catchUp } = RATCHET;
  const out: Knot[] = [];
  let f = hats[0] - lead;
  let t = f;
  const add = (f1: number, t1: number, notch: boolean): void => {
    out.push({ f0: f, f1, t0: t, t1, notch });
    f = f1;
    t = t1;
  };
  // Each hat's notch the same size, so the last lands on the crest: CREST − start − the creep between them, shared out.
  const between = hats.slice(1).reduce((s, h, i) => s + (h - hats[i] - dur), 0);
  const hat = (CREST - t - creep * between) / hats.length;
  hats.forEach((h, i) => {
    add(h - lead + dur, t + hat, true);
    const next = i + 1 < hats.length ? hats[i + 1] : CREST;
    add(next - lead, t + creep * (next - lead - f), false);
  });
  add(CREST - lead + dur, t + tip, true);
  // Catching up at `catchUp` × until rideT meets f: t + q (S − f) = S.
  add((t - catchUp * f) / (1 - catchUp), (t - catchUp * f) / (1 - catchUp), false);
  return out;
})();
/** The ride's time at instant f: f, but pulled up the lift hill in notches (RATCHET). Continuous; it never runs backwards. */
export function rideT(f: number): number {
  for (const k of RATCHET_KNOTS) {
    if (f < k.f0) return f;
    if (f < k.f1) {
      const u = (f - k.f0) / (k.f1 - k.f0);
      return k.t0 + (k.t1 - k.t0) * (k.notch ? ease.outCubic(u) : u);
    }
  }
  return f;
}
/**
 * The camera's ride time at instant f: rideT, but held through the ratchet's holds (the train creeps on under a still camera) — each
 * notch takes it from where it held to where the notch puts him, so he is back on the playhead's anchor at every notch's end.
 */
export function camT(f: number): number {
  for (let i = 0; i < RATCHET_KNOTS.length; i++) {
    const k = RATCHET_KNOTS[i];
    if (f < k.f0) return f;
    if (f >= k.f1) continue;
    const u = (f - k.f0) / (k.f1 - k.f0);
    const last = i === RATCHET_KNOTS.length - 1;
    if (!k.notch) return last ? k.t0 + (k.t1 - k.t0) * u : k.t0;
    const from = i > 0 && !RATCHET_KNOTS[i - 1].notch ? RATCHET_KNOTS[i - 1].t0 : k.t0;
    return from + (k.t1 - from) * ease.outCubic(u);
  }
  return f;
}
/** The ratchet's span: from its first notch's start to the frame rideT has caught the music up. */
export const RATCHET_SPAN = { from: RATCHET_KNOTS[0].f0, to: RATCHET_KNOTS[RATCHET_KNOTS.length - 1].f1 } as const;

/**
 * The playhead's world x at instant f (24 px a frame of ride time from break 6.1): his car's place on the rail through the ride — he is
 * the playhead, so on the lift hill it ratchets with him (rideT).
 */
export const playX = (f: number): number => (rideT(f) - G0) * TRACK.pxPerFrame;

/** A car's centre and angle (radians, clockwise). */
export type Seat = { x: number; y: number; th: number };
/** The normal "up" from a car turned th (radians, clockwise; y down). */
const up = (th: number): V2 => [Math.sin(th), -Math.cos(th)];
/** A car standing on two wheels at a and b: its angle is the chord's, its centre `lift` over the chord's middle. */
const seatOn = (a: V2, b: V2, lift: number): Seat => {
  const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const n = up(th);
  return { x: (a[0] + b[0]) / 2 + lift * n[0], y: (a[1] + b[1]) / 2 + lift * n[1], th };
};
/**
 * The valleys, where the rail turns from a drop into a climb at a key (a corner): k2 (the bunny hop, on the 6.1& open hat) and the two
 * bottoms k4 and k7 (on the backbeats). A rigid car on the chord would hover over a V that sharp, so it touches down instead (below).
 */
export const VALLEYS: readonly number[] = [1, 3, 6];
/**
 * The touch-down at a valley: world px of x before it over which the car flares level (2 f for him: round 1's BOTTOM-SNAP — over 1.5 f
 * his ω swung 124 px across the screen in the frame into the first bottom) and after it over which it rocks back onto the chord (5 f:
 * the landing's small rebound). Scaled with the car (his copies' are half).
 */
export const TOUCH = { before: 48, after: 120 } as const;
/** How much a car at world x (scale k) is touching down in a valley: 1 on the key, 0 outside the touch-down (sine out in, F out). */
export function touchAt(x: number, k = 1): number {
  for (const i of VALLEYS) {
    const d = x - KEYS[i].x;
    // Flaring in fast and settling onto the key (sine out): the last frame into the bottom moves least.
    if (d >= -TOUCH.before * k && d < 0) return Math.sin((Math.PI / 2) * ((d + TOUCH.before * k) / (TOUCH.before * k)));
    if (d >= 0 && d < TOUCH.after * k) return 1 - flow(d / (TOUCH.after * k));
  }
  return 0;
}
/**
 * A car whose place is world x on the rail (k: 1 his, 0.5 his copies'): its wheels on the rail `wheel` px of arc either side, so it tilts
 * with the chord between them — level over a crest, steep on a drop, never jumping at a key's corner. In a valley it touches down: level,
 * its wheels on the rail point under the playhead (the bottom itself on the backbeat), blended in and out with touchAt.
 */
export function carOnRail(x: number, k = 1): Seat {
  const s = arcOfX(x);
  const xa = xOfArc(s - CAR.wheel * k);
  const xb = xOfArc(s + CAR.wheel * k);
  const chord = rattleLimit(seatOn([xa, railAtX(xa)], [xb, railAtX(xb)], CAR.lift * k), x, k);
  const w = touchAt(x, k);
  if (w <= 0) return chord;
  return { x: lerp(chord.x, x, w), y: lerp(chord.y, railAtX(x) - CAR.lift * k, w), th: lerp(chord.th, 0, w) };
}
/**
 * The elastic rattle (k8 → k9, the 16th fill): the curve drops 0xE2 → 0x80 in under a frame and rings, and a car on its chord would
 * swing ±70° from frame to frame, flinging his face 130 px side to side. Here the car only rattles: its tilt is soft-limited to ±RATTLE_TILT
 * (L·tanh(θ / L)), the limiter coming in (F) over the 2 frames up to k8 — he judders in his seat while the world shakes round him.
 */
export const RATTLE_TILT = 24;
function rattleLimit(c: Seat, x: number, k: number): Seat {
  const a = KEYS[7].x;
  const b = KEYS[8].x;
  const w = x < a ? flow((x - (a - 2 * TRACK.pxPerFrame)) / (2 * TRACK.pxPerFrame)) : x < b ? 1 : 1 - flow((x - b) / (2 * TRACK.pxPerFrame));
  if (w <= 0) return c;
  const L = (RATTLE_TILT * Math.PI) / 180;
  const th = lerp(c.th, L * Math.tanh(c.th / L), w);
  // Turn about the car's wheels' midpoint (its centre less its lift), so the wheels stay on the rail.
  const n0 = up(c.th);
  const n1 = up(th);
  const lift = CAR.lift * k;
  return { x: c.x - lift * n0[0] + lift * n1[0], y: c.y - lift * n0[1] + lift * n1[1], th };
}
/** The hook at instant f as a polyline with its arc lengths. */
function hookPolyline(f: number): { pts: V2[]; len: number[] } {
  const H = hookAt(f)!;
  const n = 48;
  const pts: V2[] = Array.from({ length: n + 1 }, (_, i) => bez(H, i / n));
  const len: number[] = [0];
  for (let i = 1; i <= n; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, len };
}
/** The path his car takes once the cursor has the last key: the rail up to k9 (arc < 0), then the hook (arc from k9), then on straight. */
function hookPath(f: number): (s: number) => V2 {
  const { pts, len } = hookPolyline(f);
  const n = pts.length - 1;
  const k9 = arcOfX(KEYS[8].x);
  return (s: number): V2 => {
    if (s <= 0) {
      const x = xOfArc(k9 + s);
      return [x, railAtX(x)];
    }
    if (s >= len[n]) {
      const dx = pts[n][0] - pts[n - 1][0];
      const dy = pts[n][1] - pts[n - 1][1];
      const l = Math.hypot(dx, dy) || 1;
      return [pts[n][0] + (dx / l) * (s - len[n]), pts[n][1] + (dy / l) * (s - len[n])];
    }
    let i = 1;
    while (i < n && len[i] < s) i++;
    const u = clamp((s - len[i - 1]) / Math.max(1e-9, len[i] - len[i - 1]));
    return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
  };
}

/**
 * His car at instant f: its centre and angle; its pop on the cut (0.6 → 1.05 → 1 over 5 f); the ratchet's 2 px jerk on each chain click.
 * On the rail through the ride; dragged back along the hook through the rewind (its place eased along it, F, the whole hook in 5 frames:
 * full draw), sliding upright as the key drags it; rolling off the hook's end once he is flung.
 */
export type Car = Seat & { s: number; jerk: number };
export function carAt(f: number): Car {
  const jerk = CHAIN_CLICKS.some((c) => f >= c && f < c + 2) ? 2 : 0;
  const s = f < G0 + 5 ? pop(f - G0) : 1;
  if (f < YANK) return { ...carOnRail(playX(f)), s, jerk };
  if (f < FLUNG) {
    // Dragged back with the key, not riding the hook: he slides along it upright, the car levelling (F) from its angle on the kick.
    const { len } = hookPolyline(f);
    const u = hookU(f);
    const p = hookPath(f)(len[len.length - 1] * u);
    // On the kick the car is where the ride left it (its centre over its wheels' chord, not over the rail point): ease that offset out.
    const c0 = carOnRail(playX(YANK));
    const n0 = up(c0.th);
    const k9 = keyPoint(8);
    const off: V2 = [c0.x - CAR.lift * n0[0] - k9[0], c0.y - CAR.lift * n0[1] - k9[1]];
    const th = c0.th * (1 - flow((f - YANK) / DRAW_FRAMES));
    const n = up(th);
    return { x: p[0] + off[0] * (1 - u) + CAR.lift * n[0], y: p[1] + off[1] * (1 - u) + CAR.lift * n[1], th, s, jerk };
  }
  // Flung out of it: the empty car stays at full draw, settling a little (he leaves it behind, to his right, under the crash-in).
  const c = carAt(FLUNG - 1e-6);
  const e = f - FLUNG;
  return { x: c.x - 20 * e, y: c.y + 6 * e * e, th: c.th * Math.max(0, 1 - e / 3), s, jerk };
}

/** His ω's seat (world): `seat − lift` over his car's centre along its normal (his ω on its top edge). */
const seatOf = (c: Seat): V2 => {
  const n = up(c.th);
  return [c.x + (TRACK.seat - CAR.lift) * n[0], c.y + (TRACK.seat - CAR.lift) * n[1]];
};
/** His ω (world) at instant f: in his seat through the ride and the rewind; flung left from full draw on the 16th kick (from FLUNG). */
export function omegaAt(f: number): V2 {
  if (f < FLUNG) return seatOf(carAt(f));
  const w = seatOf(carAt(FLUNG - 1e-6));
  return [w[0] - flungX(f), w[1] - 12 * (f - FLUNG)];
}

/**
 * THE WHIP'S CRASH-IN (6.4a → the hidden cut, C7): the camera whips left with him and crashes in on him (log-space; v06 a cubic out from the
 * fling, v07 the Hermite below), landing on the hidden cut at the size the sling side's whip tail opens on (src/shots/breakLaunch.ts: its catch em 360 at its
 * WHIP_IN_ZOOM 1.3 = 468 px). At Z 1 the design's whip handed a 150 px him to a 468 px him: a 3× pop the blur could not hide. Round 1:
 * the crash-in lands on the cut (it used to aim at the catch on 7.1 and was still accelerating his growth into the cut) — its biggest
 * step is the fling's next frame, his face sharp all the way (groupShutter: one instant from full draw to the cut).
 */
const CUT_APPARENT = SLING_KEYS[0].em * WHIP_IN_ZOOM;
/**
 * v07 WP5 (continuity plan §7, FW5 at C7): the crash-in is one motion with the sling side's tail. v06 crashed in over FLUNG → the cut with
 * a cubic out: × 1.28 on 6.4a, × 1.88 the frame after (his face 820 → 1520 px), × 1.03 into the cut, then the sling side kicked off again
 * (× 1.13): a pop and a stop-and-go. Now it leans in from the score's WHIP (6.4a − a 32nd, from rest) and lands on the cut at the speed the
 * sling side's tail leaves with (breakLaunch.ts slingState: an ease-out quad to the catch), a cubic Hermite in log space — at most ×1.30 a
 * frame, never stopping across the cut, still landing on CUT_APPARENT.
 */
export const WHIP_LEAN = WHIP.from;
const WHIP_LOG = Math.log(CUT_APPARENT / RIDE_EM);
/** The Hermite's end slope (log-zoom per unit of its span): the sling side's starting rate, 2 · ln(1.55 / 1.3) / 3 frames. */
const WHIP_END_SLOPE = ((2 * Math.log(SLING_KEYS[0].zoom / WHIP_IN_ZOOM)) / (CATCH - WHIP_CUT)) * (WHIP_CUT - WHIP_LEAN) / WHIP_LOG;
export function whipZoom(f: number): number {
  if (f < WHIP_LEAN) return 1;
  const s = clamp((f - WHIP_LEAN) / (WHIP_CUT - WHIP_LEAN));
  return Math.exp(WHIP_LOG * ((WHIP_END_SLOPE - 2) * s ** 3 + (3 - WHIP_END_SLOPE) * s ** 2));
}
/**
 * C7's colour carry (integrator round 2, I-6; review round 1 F2): on the fling the editor's violet value axis (screen x 0–96) is flung
 * across the frame behind him — its right edge from x 96 to past the right edge, cubic out over AXIS_FLING.frames from FLUNG (graph
 * fixer: ¾ of a frame, so the fling's kick frame is the one the frame turns violet on — over 2 its biggest change was the frame after,
 * 6.4a "close +1") — so the
 * hidden cut on +573 goes violet to violet (the slingshot's ground) instead of cream to violet (Δ luma 80, the break's biggest change
 * after 5.1). A wipe carried by an object: the panel's 3 px ink edge leads it. Drawn over the track and the sparks, under the train, him
 * and the chrome (which is being torn off). Screen px; null before the fling.
 */
export const AXIS_FLING = { from: FLUNG, frames: 0.75, x0: 96, x1: 2040 } as const;
export function axisFlingAt(f: number): { x: number } | null {
  if (f < AXIS_FLING.from) return null;
  const u = ease.outCubic(clamp((f - AXIS_FLING.from) / AXIS_FLING.frames));
  return { x: AXIS_FLING.x0 + (AXIS_FLING.x1 - AXIS_FLING.x0) * u };
}
/**
 * The flung panel carries the whip (review round 2, C7-VIOLET-VOID). In v04 the violet covered the world's streaks from +571: two
 * frames of a sharp zoom into a flat field, then on the cut the streaks, a new face and no car — two changes, not one hidden cut. Now
 * the sling side's ground streaks and speed lines (src/shots/breakLaunch.ts GROUND_STREAKS, TRAIL: the same streaks, tones, widths,
 * rightward speeds and placement, so they run unbroken across C7) stream over the violet from the fling, inside the panel, at this
 * strength per output frame — rising into the sling side's STREAK_CUT_ALPHA (0.5) on the cut and 1 after it — and the axis's own hex
 * ticks and labels ride it at the ground's speed, smeared by the 64 sub-frames, fading out before the cut (the sling side has none).
 */
export const FLUNG_STREAKS: readonly { at: number; ground: number; axis: number }[] = [
  { at: FLING, ground: 0.12, axis: 0.6 },
  { at: FLING + 1, ground: 0.25, axis: 0.35 },
  { at: FLING + 2, ground: 0.4, axis: 0.12 },
];
/** The flung panel's streak strengths on output frame o (none outside the fling's frames before the cut). */
export function flungStreaksAt(f: number): { ground: number; axis: number } | null {
  const o = frameOf(f);
  return FLUNG_STREAKS.find((s) => s.at === o) ?? null;
}
/**
 * His flight's speed on screen (px a frame) under the crash-in: what the sling side's whip tail streams at (WHIP_PX 120 at the catch's
 * zoom, its streaks 260), between them. In the world he slows as the camera closes in (180 / zoom).
 */
export const WHIP_SCREEN_PX = 180;
/** How far left he has flown (world px) since the launch: ∫ WHIP_SCREEN_PX / whipZoom, 16 steps a frame. */
function flungX(f: number): number {
  const e = f - FLUNG;
  if (e <= 0) return 0;
  const n = Math.max(1, Math.ceil(e * 16));
  let x = 0;
  for (let i = 0; i < n; i++) x += WHIP_SCREEN_PX / whipZoom(FLUNG + ((i + 0.5) / n) * e);
  return (x * e) / n;
}

/** k10's two handles stretched behind him (world): from the dragged key while it is dragged, from behind his ")" once he is flung. */
export function cordsAt(f: number): { anchor: V2; grips: readonly [V2, V2] } | null {
  if (f < YANK) return null;
  if (f < FLUNG) return { anchor: hookAt(f)![3], grips: GRIPS };
  const w = omegaAt(f);
  return { anchor: [w[0] + 1.5 * RIDE_EM, w[1] + 15], grips: GRIPS };
}

// ——— The camera ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The camera at an instant (the scene's; the rig's punches come on top), where it puts his ω on screen, and the playhead's screen x. */
export type GraphCam = BreakCam & { readonly omega: V2; readonly head: number };

/** The reveal's end (break 6.1&): Z 0.80, his ω at (740, 434). */
const REVEAL_END = { zoom: 0.8, omega: [740, 434] as V2 };
/**
 * The ride's screen window for his ω: y in [430, 690] (the spring-follow's clamp). Past `bottom` a bottom gives, to `give` at most: the
 * camera is pulled after him (GIVE_TAU) rather than pinned to him (round 1's BOTTOM-SNAP). It still has to match his last frame of fall
 * into a bottom (≈ 300 world px) and stops dead with him on it: the world's slam on the backbeat, kept as the impact. 706: under
 * ACCENTS_V2's 5 % punch on a bottom his ω still lands above y 720.
 */
export const RIDE_CLAMP = { top: 430, bottom: 690, give: 706, x: 740 } as const;
/** How fast the camera is pulled after him once he is past the clamp's bottom (frames, first order: no momentum). */
export const GIVE_TAU = 0.8;
/** The most his ω moves on screen in a frame through the ride (px; the spike off the second bottom flung him 252 px in one). */
export const RATE = 150;
/**
 * The pull-back to Z 0.88 over the crest, in ride time: from half a frame past the crest key (the ratchet's teetering creep stops short
 * of it) to the tip's end (cubic out) — so it happens inside the crest's notch, on the kick's own frame.
 */
export const CREST_PULL = { from: 0.5, to: 0.5 + RATCHET.tip } as const;

/**
 * The scene camera's zoom on the ride (design §3.10), in ride time (rideT): 0.80 → 1.00 (F) into the bunny hop; → 1.18 cubic in down the
 * big plunge; the L recoil off the bottom to 1.00, held up the lift hill; the pull-back to 0.88 as the last notch tips him over the crest
 * (CREST_PULL: the design's F from 6.2& left 6.3 with no picture event, round 1 F3); held widest over the crest; into the second bottom
 * (cubic in) → 1.00; out with the spike → 1.15 by the fill's kick, where the click's framing takes over (clickCam). The spike's zoom-out
 * is an F (integrator round 2, I-5): as a cubic out its biggest steps were the two frames after the bottom (+553 / +554 changed the
 * picture more than the bottom's own frame), so check-sync read 6.4 as "miss +2"; the bottom must be the frame that hits.
 */
export function rideZoom(f: number): number {
  const [, k2, k3, k4, k5, k6, k7, k8] = GRAPH_KEYS;
  if (f < k3) return 0.8 + 0.2 * flow((f - k2) / (k3 - k2));
  if (f <= k4) return 1 + 0.18 * ((f - k3) / (k4 - k3)) ** 3;
  if (f < k4 + 12) return 1.18 - 0.18 * launchL(f - k4);
  if (f < k6) return 1 - 0.12 * ease.outCubic(clamp((f - k5 - CREST_PULL.from) / (CREST_PULL.to - CREST_PULL.from)));
  if (f < k7) return 0.88 + 0.12 * ((f - k6) / (k7 - k6)) ** 3;
  if (f < k8) return 1 + 0.15 * flow((f - k7) / (k8 - k7));
  return 1.15;
}

/** The rail's slope under the playhead at instant f (degrees, y down: positive = going down). */
const pathSlope = (f: number): number => (Math.atan2((railY(f + 0.01) - railY(f - 0.01)) / 0.02, TRACK.pxPerFrame) * 180) / Math.PI;

/**
 * The ride camera (the judge's spec, design §3.6; verified by ride.mjs): from break 6.1& to the click, the camera's world y (C.y with
 * his ω at screen x 740) follows his ω's y with a critically damped spring (ω₀ 0.35 / frame), clamped so his ω stays at screen y
 * 430–690 (the clamp drags the camera and gives the spring no momentum: when he stops dead on a bottom, so does the world) — but a bottom
 * gives to 706 and the camera is pulled after him (RIDE_CLAMP.give, GIVE_TAU), and his ω never moves more than RATE px a frame on
 * screen; the bank is a spring (ω₀ 0.4 / frame) toward −0.3 × the track's slope, clamped to ±9°. Integrated once, in 32 steps a frame,
 * from the reveal's own end state — its position and its speed, so the world keeps moving as it did across 6.1& — and tabulated.
 */
const SUB = 32;
const RIDE_TABLE: { c: Float64Array; r: Float64Array } = (() => {
  const n = (RIDE.to - RIDE.from) * SUB;
  const C = new Float64Array(n + 1);
  const R = new Float64Array(n + 1);
  const Y = new Float64Array(n + 1);
  // His ω's y along the ride in ride time (the table is read at rideT: on the ratchet's notches the camera jumps with him, and holds
  // with him): his seat with the playhead at t, unratcheted.
  const seat = (t: number) => (t < YANK ? seatOf(carOnRail((t - G0) * TRACK.pxPerFrame))[1] : omegaAt(t)[1]);
  let c = seat(RIDE.from) - (REVEAL_END.omega[1] - 540) / REVEAL_END.zoom;
  // The reveal tracks his ω exactly at its end (its zoom and screen point have come to rest): the camera moves as he does.
  let v = (seat(RIDE.from) - seat(RIDE.from - 1e-4)) / 1e-4;
  let r = 0;
  let rv = 0;
  const dt = 1 / SUB;
  const w = 0.35;
  const wr = 0.4;
  C[0] = c;
  R[0] = r;
  Y[0] = REVEAL_END.omega[1];
  for (let k = 0; k < n; k++) {
    const t = RIDE.from + k * dt;
    v += (w * w * (seat(t) - c) - 2 * w * v) * dt;
    c += v * dt;
    const t1 = t + dt;
    const z = rideZoom(t1);
    const s1 = seat(t1);
    /** The camera y that puts his ω at screen y. */
    const at = (y: number): number => s1 - (y - 540) / z;
    if (c < at(RIDE_CLAMP.bottom)) c += (at(RIDE_CLAMP.bottom) - c) * (1 - Math.exp(-dt / GIVE_TAU));
    if (k + 1 >= SUB) c = clamp(c, at(Y[k + 1 - SUB] + RATE), at(Y[k + 1 - SUB] - RATE));
    c = clamp(c, at(RIDE_CLAMP.give), at(RIDE_CLAMP.top));
    const target = clamp(-0.3 * pathSlope(t), -9, 9);
    rv += (wr * wr * (target - r) - 2 * wr * rv) * dt;
    r += rv * dt;
    C[k + 1] = c;
    R[k + 1] = r;
    Y[k + 1] = (s1 - c) * z + 540;
  }
  return { c: C, r: R };
})();
const ride = (f: number): { c: number; r: number } => {
  const k = clamp((f - RIDE.from) * SUB, 0, RIDE_TABLE.c.length - 1);
  const i = Math.min(Math.floor(k), RIDE_TABLE.c.length - 2);
  const u = k - i;
  return { c: lerp(RIDE_TABLE.c[i], RIDE_TABLE.c[i + 1], u), r: lerp(RIDE_TABLE.r[i], RIDE_TABLE.r[i + 1], u) };
};

/** A camera whose centre is solved so that `anchor` lands on screen point s, turned `roll` about it: C = anchor − R(−roll)·(s − (960, 540)) / Z. */
const solve = (anchor: V2, s: V2, zoom: number, roll: number): BreakCam => {
  const [dx, dy] = rotate(s[0] - 960, s[1] - 540, -roll);
  return { zoom, cx: anchor[0] - dx / zoom, cy: anchor[1] - dy / zoom, roll, dy: 0 };
};

/**
 * The reveal and the ride, as a camera solved so that the anchor (playhead x, his ω's y) lands on a screen point, the bank pivoting
 * there: the graph scrolls past a fixed playhead while he swings about it in his tilting car.
 *   The reveal (6.1 → 6.1&): Z 1.60 → 0.80 (L); the anchor eases (F) from his ω — the selection's (960, 540) — to the playhead's at
 *   (740, 434).
 *   The ride (6.1& → the click): the playhead locked at screen x 740, y the clamped spring on his ω, the spring bank — all in the
 *   camera's ride time (camT), so on the lift hill the world ratchets with him and holds still while he creeps on.
 */
function rideCam(f: number): BreakCam {
  const w = omegaAt(f);
  if (f < RIDE.from) {
    const t = f - G0;
    const u = flow(t / (RIDE.from - G0));
    return solve([lerp(w[0], playX(f), u), w[1]], [lerp(960, REVEAL_END.omega[0], u), lerp(540, REVEAL_END.omega[1], u)], 1.6 - (1.6 - REVEAL_END.zoom) * launchL(t), 0);
  }
  const t = camT(f);
  const st = ride(t);
  const zoom = rideZoom(t);
  // His ω where the camera's ride time has him (in a hold he has crept on from there).
  const wc = t === rideT(f) ? w : seatOf(carOnRail((t - G0) * TRACK.pxPerFrame));
  return solve([(t - G0) * TRACK.pxPerFrame, wc[1]], [RIDE_CLAMP.x, (wc[1] - st.c) * zoom + 540], zoom, st.r);
}

/**
 * THE CLICK: FRAME SELECTED (6.4e; round 1 F1, SYNC-2). On the fill's kick the cursor clicks k10 and the antivirus frames its selection,
 * the way an editor's "frame selected" does: the view snaps from the ride to a still framing of the curve's last two segments (Z
 * SELECT.zoom, his ω on the rewind's kick at SELECT.at) — an outCubic over a frame from half a frame before the kick, so the kick's one sharp
 * instant is 7/8 there — and holds still through the rattle. He dives with the elastic (0xE2 → 0x80 and past it over three frames:
 * RATTLE_ELASTIC) and settles inside the still frame, on HERO_SHUTTER, the jolts on the kick and its 32nd knock the car and its section
 * against a still world, and the yank launches from stillness. (The design's swing on 6.4& smeared the hook it was meant to show; round
 * 1's rattle lock had the world dive past him in a blur.) SELECT is set so his whole rattle stays in the ride's window: the crest (+558)
 * at y ≈ 409, the dive's floor (+561 →) at ≈ 620–675 (round 2: Z 0.82 → 0.78 and y 668 → 676 — on +558 the old dive had already
 * pulled his car's chord down; the three-frame one leaves him on the crest, 25 px higher).
 */
export const CLICK_SNAP = { from: RATTLE.from - 0.5, frames: 1 } as const;
export const SELECT = { zoom: 0.78, at: [900, 676] as V2 } as const;
/** His ω on screen from full draw to the hidden cut (the sling side's whip tail opens on it: C7's eye trace is 0 px). */
export const WHIP_AT: V2 = [1000, 580];
/** The still framing the click snaps to: his ω at SELECT.at on the yank's first instant, Z SELECT.zoom, level. */
const SELECT_CAM: BreakCam = solve(omegaAt(YANK), SELECT.at, SELECT.zoom, 0);
/** The snap and the still framing, before RATE. */
function clickRaw(f: number): BreakCam {
  const a = rideCam(CLICK_SNAP.from);
  const u = ease.outCubic(clamp((f - CLICK_SNAP.from) / CLICK_SNAP.frames));
  return { zoom: lerp(a.zoom, SELECT_CAM.zoom, u), cx: lerp(a.cx, SELECT_CAM.cx, u), cy: lerp(a.cy, SELECT_CAM.cy, u), roll: a.roll * (1 - u), dy: 0 };
}
/** A point's screen y under camera c. */
const screenY = (c: BreakCam, p: V2): number => rotate(c.zoom * (p[0] - c.cx), c.zoom * (p[1] - c.cy), c.roll)[1] + 540;
/**
 * RATE in the click's framing (review round 2, G-1: the ride capped his ω's step on screen, the click did not, and the elastic's dive
 * moved it 269 px in a frame). The still framing is dragged after him — first order, no momentum, as the ride's clamp — wherever he
 * would move more than RATE px a frame on screen; the drag (world px added to the camera's y) is integrated once, 32 steps a frame, from
 * the snap to the yank, and held. With the rattle's three-frame dive (RATTLE_ELASTIC) it is dormant: a cap, not a camera move.
 */
const CLICK_DRAG: Float64Array = (() => {
  const n = Math.ceil((YANK - CLICK_SNAP.from) * SUB);
  const D = new Float64Array(n + 1);
  const Y = new Float64Array(n + 1);
  let d = 0;
  for (let k = 0; k <= n; k++) {
    const t = CLICK_SNAP.from + k / SUB;
    const c = clickRaw(t);
    const w = omegaAt(t);
    const prev = k >= SUB ? Y[k - SUB] : screenY(rideCam(t - 1), omegaAt(t - 1));
    const k1 = c.zoom * Math.cos((c.roll * Math.PI) / 180);
    const y = screenY({ ...c, cy: c.cy + d }, w);
    if (y > prev + RATE) d += (y - prev - RATE) / k1;
    else if (y < prev - RATE) d -= (prev - RATE - y) / k1;
    D[k] = d;
    Y[k] = screenY({ ...c, cy: c.cy + d }, w);
  }
  return D;
})();
function clickCam(f: number): BreakCam {
  const c = clickRaw(f);
  const k = clamp((f - CLICK_SNAP.from) * SUB, 0, CLICK_DRAG.length - 1);
  const i = Math.min(Math.floor(k), CLICK_DRAG.length - 2);
  return { ...c, cy: c.cy + lerp(CLICK_DRAG[i], CLICK_DRAG[i + 1], k - i) };
}
/** Where the click's framing has him on screen as the yank starts (SELECT.at, unless RATE dragged it): the yank eases from there. */
const YANK_FROM: V2 = (() => {
  const c = clickCam(YANK);
  const [x, y] = rotate(c.zoom * (omegaAt(YANK)[0] - c.cx), c.zoom * (omegaAt(YANK)[1] - c.cy), c.roll);
  return [x + 960, y + 540];
})();

/**
 * The camera at instant f (a BreakCam), where it puts his ω on screen, and the playhead's screen x:
 *   the reveal and the ride (rideCam) to the click on 6.4e; the click's snap and its still framing (clickCam) to the yank;
 *   the yank and the whip (6.4& → the hidden cut): level, the camera tracks his ω as the cursor yanks him to full draw, easing his screen
 *   place from SELECT.at to WHIP_AT and the zoom to 1 with the yank (cubic out, DRAW_FRAMES) — he stays put and sharp, the world snaps and
 *   streaks past him (the widget's grammar) — then whips with him, crashing in (whipZoom).
 */
export function graphCam(f: number): GraphCam {
  const w = omegaAt(f);
  let cam: BreakCam;
  if (f < CLICK_SNAP.from) cam = rideCam(f);
  else if (f < YANK) cam = clickCam(f);
  else {
    const u = ease.outCubic(clamp((f - YANK) / DRAW_FRAMES));
    cam = solve(w, [lerp(YANK_FROM[0], WHIP_AT[0], u), lerp(YANK_FROM[1], WHIP_AT[1], u)], lerp(SELECT.zoom, 1, u) * whipZoom(f), 0);
  }
  const toS = (p: V2): V2 => {
    const [rx, ry] = rotate(cam.zoom * (p[0] - cam.cx), cam.zoom * (p[1] - cam.cy), cam.roll);
    return [rx + 960, ry + 540];
  };
  return { ...cam, omega: toS(w), head: toS([playX(Math.min(f, YANK)), w[1]])[0] };
}

/** His speed along the track (world px a frame), for the rail roar (the audio builder): the playhead's 24 px a frame and the track's fall or climb. */
export function railSpeed(f: number): number {
  const h = 0.01;
  return Math.hypot(TRACK.pxPerFrame, (railY(f + h) - railY(f - h)) / (2 * h));
}

// ——— Him, his car, the train ——————————————————————————————————————————————————————————————————————————————————————————————————

/** The G-squash of a bottom: 1 on the beat and the frame after, then a damped ring, 0 from +14. */
const gSquash = (e: number): number => (e < 0 || e >= 14 ? 0 : e < 2 ? 1 : Math.exp(-(e - 2) / 2.5) * Math.cos((e - 2) * 0.7));

/** The bottoms' impacts at instant f: where (the bottom key, world) and how far in (frames from the beat frame's shutter opening, < 12). */
export function impactsAt(f: number): { x: number; y: number; e: number }[] {
  return BOTTOMS.flatMap((b) => {
    const e = f - b + HIT_LEAD;
    return e >= 0 && e < 12 ? [{ x: playX(b), y: railY(b), e }] : [];
  });
}

/** His face at instant f (taken at the output frame: discrete swaps never double-expose). */
export function heroFace(f: number): string {
  const o = frameOf(f);
  const F = HERO_FACES_V2;
  if (o < ARMS_UP[0]) return F.seated;
  if (o < CHAIN_CLICKS[0]) return F.armsUp;
  if (o < CREST) return F.lift;
  if (o < ARMS_UP[1]) return F.airtime;
  if (o < RATTLE.from) return F.armsUp;
  if (o < RATTLE.to) return F.rattle[Math.floor((o - RATTLE.from) / 3) % 2];
  return F.rewound;
}

/** His em at instant f: 220 on the cut, settling to 150 with the reveal (L, by 6.1&). */
export const emAt = (f: number): number => (f < RIDE.from ? CUT_EM + (RIDE_EM - CUT_EM) * launchL(f - G0) : RIDE_EM);

export const AIR = { up: 2, hold: 8, down: 12, height: 70 } as const;
/**
 * Airtime over the crest (6.3's kick): the car tips over and he keeps going up — thrown 70 px out of his seat off the kick (cubic out, 2 f,
 * from the beat frame's shutter opening), floating, and pulled back in by the second plunge's top (F, 8 → 12 f). (The design's sine about
 * the crest put his slowest instant on the kick: nothing happened on 6.3; round 1's 30 px in 3 f was 1 % of the frame: SYNC-2.)
 */
export function airAt(f: number): number {
  const e = f - CREST + HIT_LEAD;
  if (e < 0 || e >= AIR.down) return 0;
  if (e < AIR.up) return AIR.height * ease.outCubic(e / AIR.up);
  if (e < AIR.hold) return AIR.height;
  return AIR.height * (1 - flow((e - AIR.hold) / (AIR.down - AIR.hold)));
}
/**
 * His face pops on the hits that are his alone: (✪ω✪) on the crest's kick (+12 %), each eye swap of the elastic rattle (+10 %), and
 * Σ(⊙ω⊙) yanked on the rewind's kick (+20 %, round 1 F1) — a size jolt decaying over 6 / 3 / 4 frames from the beat frame's shutter
 * opening.
 */
export function facePopAt(f: number): number {
  const jolt = (at: number, amp: number, len: number): number => {
    const e = f - at + HIT_LEAD;
    return e >= 0 && e < len ? amp * (1 - e / len) ** 2 : 0;
  };
  return 1 + Math.max(jolt(CREST, 0.12, 6), jolt(RATTLE.from, 0.1, 3), jolt(RATTLE.from + 3, 0.1, 3), jolt(REWIND.from, 0.2, 4));
}

/**
 * Him at instant f: his ω placement point (world), em, his squash (sx, sy about the ω), his tilt (degrees clockwise: 0.6 × his car's,
 * at most 50°: he leans with it, a little less; leaning back once flung), the face, his airtime lift (along the car's normal, in x / y).
 */
export type HeroPose = { face: string; x: number; y: number; em: number; sx: number; sy: number; rot: number; air: number };
export function heroAt(f: number): HeroPose {
  const [x, y] = omegaAt(f);
  const g = Math.max(gSquash(f - BOTTOMS[0] + HIT_LEAD), gSquash(f - BOTTOMS[1] + HIT_LEAD));
  const air = airAt(f);
  const settle = f < ARMS_UP[0] ? 1 - 0.04 * (1 - flow((f - G0) / (ARMS_UP[0] - G0))) : 1;
  const car = carAt(f);
  const n = up(car.th);
  const rot = f >= FLUNG ? -8.6 : clamp(((car.th * 180) / Math.PI) * 0.6, -50, 50);
  return { face: heroFace(f), x: x + air * n[0], y: y + air * n[1] + car.jerk, em: emAt(f) * facePopAt(f), sx: 1 + 0.08 * g, sy: (1 - 0.1 * g) * settle, rot, air };
}

/** The train's four copies of him, in yellow, mint, coral and violet, this far apart along the rail (world px of arc). */
export const TRAIN_GAP = 330;
export const TRAIN_COLORS = ['yellow', 'mint', 'coral', 'violet'] as const;
export type TrainCar = Seat & { color: (typeof TRAIN_COLORS)[number]; spin: number; face: V2 };
/**
 * The train behind him: half-size cars on the rail at his car's arc minus TRAIN_GAP each, through the ride; held behind k9 while the hook
 * drags him back; rolling off after him on the fling — each half a frame after the one before, tumbling left into the blur. `face` is
 * each copy's ω.
 */
export function trainAt(f: number): TrainCar[] {
  const base = arcOfX(f < YANK ? playX(f) : KEYS[8].x);
  return TRAIN_COLORS.map((color, i) => {
    const c = carOnRail(xOfArc(base - TRAIN_GAP * (i + 1)), 0.5);
    // Left alone on the fling, they roll off after him a beat behind each other (½ f apart), lagging his flight: still behind him (to his
    // right) when the hidden cut hands them to the sling side, where they ram his back.
    const e = Math.max(0, f - FLUNG - 0.5 * i);
    const n = up(c.th);
    const lift = (TRACK.seat - CAR.lift) * 0.5;
    // The crest's airtime: the whole train hops off the rail with him on the kick.
    const air = trainAirAt(f);
    const dx = -0.85 * flungX(FLUNG + e) + air * n[0];
    const dy = 10 * e * e + air * n[1];
    return { x: c.x + dx, y: c.y + dy, th: c.th, color, spin: -0.35 * e, face: [c.x + lift * n[0] + dx, c.y + lift * n[1] + dy] as V2 };
  });
}
/**
 * The train's airtime on the crest (6.3, round 1 F3): the four cars hop TRAIN_AIR px off the rail on the kick (cubic out over 2 f from
 * the beat frame's shutter opening), hang, and are back on it by 6.3& (F, +6 → +12).
 */
export const TRAIN_AIR = 24;
export function trainAirAt(f: number): number {
  const e = f - CREST + HIT_LEAD;
  if (e < 0 || e >= 12) return 0;
  if (e < 2) return TRAIN_AIR * ease.outCubic(e / 2);
  if (e < 6) return TRAIN_AIR;
  return TRAIN_AIR * (1 - flow((e - 6) / 6));
}

// ——— The keys' chips and the segment labels ——————————————————————————————————————————————————————————————————————————————————————

/** A hex chip's scale and its fold (y scale), or null when it is not up. */
export type ChipState = { s: number; sy: number };
/**
 * Key i's hex chip: all five of k1–k5 together through the reveal (popping 1 f apart), folding over the next 16th — but k3's, which he
 * passes there; from then on each pops only as he passes its key (pop, up to 12 f, folding over 6 f) — folded by the time the key after
 * next is passed, so never more than two are up. The keys passed during the reveal (k1, k2) do not pop again. k10 has none (T9 is its tag).
 */
export function chipAt(i: number, f: number): ChipState | null {
  if (i === 9) return null;
  if (i < 5 && f >= CHIPS_REVEAL.from && f < CHIPS_REVEAL.to) return f >= G0 + i ? { s: pop(f - G0 - i), sy: 1 } : null;
  if (i < 5 && i !== 2 && f >= CHIPS_FOLD.from && f < CHIPS_FOLD.to) return { s: 1, sy: 1 - flow((f - CHIPS_FOLD.from) / (CHIPS_FOLD.to - CHIPS_FOLD.from)) };
  if (KEYS[i].frame < CHIPS_FOLD.from) return null;
  const e = f - KEYS[i].frame;
  const hold = i + 2 < KEYS.length ? Math.min(12, KEYS[i + 2].frame - KEYS[i].frame - 6) : 12;
  if (e >= 0 && e < hold) return { s: pop(e), sy: 1 };
  if (e >= hold && e < hold + 6) return { s: 1, sy: 1 - flow((e - hold) / 6) };
  return null;
}

/** A segment label (world): `easeInQuart` and `easeInCubic` on the two plunges, the red `easeInBack` on the rewind's hook. */
export type Label = { text: string; x: number; y: number; s: number; sy: number; red: boolean; rot: number };
/** Up for this long (pop in, held), then folding over a 16th: gone before the next label. */
const LABEL_UP = 18;
export function labelsAt(f: number): Label[] {
  const out: Label[] = [];
  const plunges: readonly [number, string, number][] = [
    [LABELS[0], 'easeInQuart', 2],
    [LABELS[1], 'easeInCubic', 5],
  ];
  for (const [a, text, i] of plunges) {
    const e = f - a;
    if (e < 0 || e >= LABEL_UP + 6) continue;
    const fm = (KEYS[i].frame + KEYS[i + 1].frame) / 2;
    out.push({ text, x: (fm - G0) * TRACK.pxPerFrame + 150, y: railY(fm) - 20, s: e < LABEL_UP ? pop(e) : 1, sy: e < LABEL_UP ? 1 : 1 - flow((e - LABEL_UP) / 6), red: false, rot: 0 });
  }
  const H = hookAt(f);
  if (H && f >= LABELS[2]) {
    const e = f - LABELS[2];
    const p = bez(H, 0.5);
    const torn = Math.max(0, e - (FLUNG - LABELS[2]));
    out.push({ text: 'easeInBack', x: p[0] + 230 - 90 * torn, y: p[1] + 10 + 40 * torn, s: pop(e), sy: 1, red: true, rot: -6 * torn });
  }
  return out;
}

// ——— The screen: the selection carried across C6, the cursor, the chrome ———————————————————————————————————————————————————————

/** The red marquee (screen) on break 5.4& and 6.1 (C6, the flat world's last frame and the graph's first: pixel for pixel). */
export const SELECTION = { x0: 300, y0: 250, x1: 1620, y1: 830 } as const;
/**
 * The marquee on an output frame: its screen rect, alpha (the dim and T8 fold with it), the scale it has shrunk by and the point it
 * shrinks about (his ω on screen). The drawing (src/shots/breakGraphDraw.ts) is the flat world's own selection (src/shots/breakDefender.ts
 * selectMarquee / selectChip) under this transform: identical on the cut (s 1 about (960, 540)).
 */
export type Marquee = { x0: number; y0: number; x1: number; y1: number; alpha: number; s: number; about: V2 };
/**
 * The selection carried into the editor: identical on the cut, then it shrinks with him (it keeps hugging his face as the reveal pulls
 * back and he settles into his seat: scaled by his apparent em over the cut's, about his ω on screen) and folds away with T8 (6.1a → 6.1&:
 * 30 % smaller, fading).
 */
export function marqueeAt(f: number): Marquee | null {
  if (f < G0 || f >= SELECT_FOLD.to) return null;
  const c = graphCam(f);
  const fold = f < SELECT_FOLD.from ? 0 : flow((f - SELECT_FOLD.from) / (SELECT_FOLD.to - SELECT_FOLD.from));
  const s = ((emAt(f) * c.zoom) / (CUT_EM * 1.6)) * (1 - 0.3 * fold);
  const alpha = f < SELECT_FOLD.from ? 1 : 1 - clamp((f - SELECT_FOLD.from) / (SELECT_FOLD.to - SELECT_FOLD.from));
  const P = (x: number, y: number): V2 => [c.omega[0] + (x - 960) * s, c.omega[1] + (y - 540) * s];
  const [x0, y0] = P(SELECTION.x0, SELECTION.y0);
  const [x1, y1] = P(SELECTION.x1, SELECTION.y1);
  return { x0, y0, x1, y1, alpha, s, about: c.omega };
}

/** The red cursor's arrow (the antivirus's hand; screen px from its tip, y down): 72 px tall, a 4 px ink outline, a (6, 6) ink shadow. */
export const CURSOR_SHAPE: readonly V2[] = [
  [0, 0],
  [0, 54],
  [13, 42],
  [23, 63],
  [33, 58],
  [23, 38],
  [40, 38],
].map(([x, y]) => [x * 1.15, y * 1.15] as V2);
/** Where the cursor lets go on the cut (the marquee's bottom-right handle it drew on 5.4&) and where it parks, top right under the toggles. */
export const CURSOR_LET_GO: V2 = [1628, 838];
export const CURSOR_PARK: V2 = [1780, 120];
/** Where its living hold has drifted to by the swoop (screen): closer to him, still clear of his face and the track's top. */
export const CURSOR_HOVER: V2 = [1400, 236];
/** Its hover's shake: ±3 px in x, flipping every 2 frames (bar 7's HOVER grammar, taken at the output frame). */
export const HOVER_SHAKE = 3;
/**
 * Where its tip holds a key from (screen px from the key): under it. On the rattle the key k10 is under his right eye (he rides into
 * it), so a tip on the key put the antivirus's hand on his face on the beat his face is the focus (round 1 CURSOR-EYE); from under the
 * ◆ it aims at the key, ≥ 60 px under his eye, its arrow hanging below.
 */
export const GRAB: V2 = [10, 62];
export type Cursor = { x: number; y: number; s: number; rot: number };
/** The cursor's twitch on each bottom (frames from the backbeat, taken at the output frame): a jab toward him, then back. */
const TWITCH = [1, 0.55, 0.2, 0.06] as const;
/** The cursor's living hold at instant f (6.1& → the swoop): drifting from the park toward him (F), shaking, twitching on each bottom. */
function hoverAt(f: number): Cursor {
  const o = frameOf(f);
  const u = flow((f - RIDE.from) / (SWOOP.from - RIDE.from));
  const shake = Math.floor((o - RIDE.from) / 2) % 2 ? HOVER_SHAKE : -HOVER_SHAKE;
  const k = BOTTOMS.reduce((m, b) => Math.max(m, o - b >= 0 && o - b < TWITCH.length ? TWITCH[o - b] : 0), 0);
  return { x: lerp(CURSOR_PARK[0], CURSOR_HOVER[0], u) + shake - 22 * k, y: lerp(CURSOR_PARK[1], CURSOR_HOVER[1], u) + 16 * k, s: 1, rot: -12 * k };
}
/**
 * The cursor (screen): it lets go on the cut and parks top-right (L); a living hold through the ride (hoverAt; round 1 F6: parked dead
 * for 70 frames, red — the antivirus's colour — it pulled the eye); it swoops on the 32nd before the fill's kick (cubic in) and lands on
 * k10 on 6.4e — the click (pressed 2 frames) — holding it from under it (GRAB) through the rattle; drags it through the rewind (pressed
 * again for the yank's 2 frames); flicks k10 on the fling and is thrown off up-right, spinning, before the hidden cut.
 */
export function cursorAt(f: number): Cursor | null {
  if (f < RIDE.from) {
    const u = launchL(f - G0);
    return { x: lerp(CURSOR_LET_GO[0], CURSOR_PARK[0], u), y: lerp(CURSOR_LET_GO[1], CURSOR_PARK[1], u), s: 1, rot: 0 };
  }
  if (f < SWOOP.from) return hoverAt(f);
  const screenOf = (f2: number, p: V2): V2 => {
    const c = graphCam(f2);
    const [rx, ry] = rotate(c.zoom * (p[0] - c.cx), c.zoom * (p[1] - c.cy), c.roll);
    return [rx + 960 + GRAB[0], ry + 540 + GRAB[1]];
  };
  if (f < RATTLE.from) {
    const from = hoverAt(SWOOP.from);
    const k = screenOf(f, keyPoint(9));
    const u = clamp((f - SWOOP.from) / (SWOOP.to - SWOOP.from)) ** 3;
    return { x: lerp(from.x, k[0], u), y: lerp(from.y, k[1], u), s: 1, rot: 0 };
  }
  const pressed = (at: number) => f >= at - HIT_LEAD && f < at + 2 - HIT_LEAD;
  if (f < YANK) {
    const k = screenOf(f, keyPoint(9));
    return { x: k[0], y: k[1], s: pressed(RATTLE.from) ? 0.9 : 1, rot: 0 };
  }
  const d = screenOf(f, hookAt(f)![3]);
  if (f < FLUNG) return { x: d[0], y: d[1], s: pressed(REWIND.from) ? 0.9 : 1, rot: 0 };
  const e = f - FLUNG;
  return { x: d[0] + 360 * e, y: d[1] - 300 * e, s: 1, rot: 28 * e };
}

/** The editor's chrome at instant f (screen): where each panel is (assembling on the cut, torn off by the fling), the status line, the playhead. */
export type Chrome = {
  title: { dy: number; rot: number };
  axis: { dx: number; rot: number };
  ruler: { dy: number; rot: number };
  /** The status line (red, on the ruler, right-aligned) and how many of its characters are typed. */
  status: string;
  typed: number;
  /** The playhead's pentagon: the film bar of break 6 and the beat (no 16ths). */
  beat: string;
};
const STATUS = ['[DEFENDER] easing (•ω•) → 0 px/f', '[DEFENDER] rewind (•ω•)'] as const;
/**
 * The chrome assembles on the kick (L, staggered 1 f: the title bar drops in, the axis slides in, the ruler rises) and is torn off at the
 * frame edges on the fling (quadratic in, off the frame by the hidden cut). The status types `[DEFENDER] easing (•ω•) → 0 px/f` at 3
 * characters a frame from the cut, and `[DEFENDER] rewind (•ω•)` at 4 a frame from the rewind.
 */
export function chromeAt(f: number): Chrome {
  const e = f - G0;
  const tear = f <= FLUNG ? 0 : ease.inCubic(clamp((f - FLUNG) / (WHIP_CUT - 0.5 - FLUNG))) ** (2 / 3);
  const rewound = f >= REWIND.from;
  const status = STATUS[rewound ? 1 : 0];
  const typed = rewound ? Math.min(status.length, Math.floor((f - REWIND.from + 1) * 4)) : Math.min(status.length, Math.floor((e + 1) * 3));
  const beat = `${partBar('break', 6)}.${clamp(Math.floor(e / FRAMES_PER_BEAT), 0, 3) + 1}`;
  return {
    title: { dy: -70 * (1 - launchL(e)) - 240 * tear, rot: -1.7 * tear },
    axis: { dx: -120 * (1 - launchL(e - 1)) - 280 * tear, rot: -3.4 * tear },
    ruler: { dy: 130 * (1 - launchL(e - 2)) + 300 * tear, rot: 2.3 * tear },
    status: status.slice(0, typed),
    typed,
    beat,
  };
}

// ——— Sampling, look ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

const inside = (f: number, a: number, b: number): boolean => f >= a && f <= b;
/**
 * Sub-frames (sheet §6.3): 32 through the bar (the ride camera moves > 20 px a frame almost everywhere), 64 on the big plunge into its
 * bottom (6.1a → 6.2 + 3) and from the second plunge's last half (6.3a) through the spike, the dive, the yank and the whip to the cut;
 * shutter 0.5, but the bottoms' beat frames (IMPACT_SHUTTER). Groups that take a shorter shutter or print one instant: groupShutter.
 */
export function graphTemporal(frame: number): Temporal {
  const fast = inside(frame, KEYS[2].frame, BOTTOMS[0] + 3) || frame >= BOTTOMS[1] - 6;
  return { samples: fast ? 64 : 32, shutter: BOTTOMS.includes(frame) ? IMPACT_SHUTTER : 0.5, persistence: 0 };
}
/**
 * Each group's shutter (sheet §6.3; review round 2, G-1). Round 1 printed the track and him ONE instant per output frame (its F3: at
 * 20–40 px a frame the half-frame shutter greyed the rails' 6 px ink edges and the hex chips; its F1: the spike, the dive and the yank
 * left the bar's story beat smeared): crisp, but stop-motion — from the second bottom he jumped 60 → 149 → 128 → … → 269 px a frame
 * with nothing between, a local strobe at his face, and the 48 px ties scrolling half their pitch a frame read backwards. Now a group
 * that must stay legible takes a SHORT shutter centred on the output instant, sampled by all of the frame's sub-frames (64 there):
 *   track   the paper, the rails, ties, supports, keys, chips, labels and clacks: TRACK_SHUTTER (0.15) from the cut through the rewind's
 *           kick — at 40 px a frame a 6 px ink edge smears 6 px, not 20. On the bottoms' beat frames one sharp instant: the world
 *           slams to a stop with him there, and under even the impact frame's 0.12 the stop lost its kick (6.4 read "miss +2": the
 *           spike's next frames changed the picture more). From the yank's second frame the world streaks past him at the frame's 0.5
 *           (the widget's grammar).
 *   hero    him, his car, k10's handles and T9: HERO_SHUTTER (0.2) from the frame after the second bottom through the rewind's kick (the
 *           spike, the click's dive, the yank): at 149 px a frame a 30 px smear, the face whole; on the bottoms' beat frames the impact
 *           frame's own IMPACT_SHUTTER (0.12). From full draw to the hidden cut (+565 → the cut) one sharp instant, as the sling side
 *           prints him across C7 (he is held still on screen there: the camera tracks him).
 *   cursor  one sharp instant from its swoop to the fling: its landing on the click and its grip on the key read crisp.
 *   world   the train and the sparks: one sharp instant on the snaps only (SNAPS), else the frame's shutter, as the panels always.
 * On the snaps (SNAPS: the ratchet's three notches, the click's "frame selected", the rewind's yank) the track, him and the world print
 * one instant: each carries the whole world a long way in one frame, on its kick — a UI snap is discrete, and its frame is the kick's
 * picture (round 1, kept; under a short shutter the click's frame smeared his face and the rails 30–40 px).
 */
export const TRACK_SHUTTER = 0.15;
export const HERO_SHUTTER = 0.2;
export const SNAPS: readonly number[] = [...NOTCHES, RATTLE.from, REWIND.from];
export type ShutterGroup = 'track' | 'hero' | 'cursor' | 'world';
/** Group g's shutter on output frame o (frames, centred on o; 0 = one sharp instant; never longer than the frame's own). */
export function groupShutter(g: ShutterGroup, o: number): number {
  const frame = graphTemporal(o).shutter;
  if (g === 'world') return SNAPS.includes(o) ? 0 : frame;
  if (g === 'cursor') return o >= SWOOP.from && o < FLING ? 0 : frame;
  if (SNAPS.includes(o)) return 0;
  if (g === 'track') return BOTTOMS.includes(o) ? 0 : o >= GRAPH.from && o <= REWIND.from ? Math.min(TRACK_SHUTTER, frame) : frame;
  if (o > REWIND.from) return 0;
  return o > BOTTOMS[1] ? Math.min(HERO_SHUTTER, frame) : frame;
}
/** Whether group g prints one sharp instant on output frame o. */
export const isSharp = (g: ShutterGroup, o: number): boolean => groupShutter(g, o) === 0;
/**
 * The instant group g draws at for sub-frame instant f: its shutter is the frame's own squeezed about the output instant, so the frame's
 * sub-frames (all of them) sample the group's shorter shutter evenly; the output frame's own instant where it prints sharp.
 */
export function groupAt(g: ShutterGroup, f: number): number {
  const o = frameOf(f);
  const frame = graphTemporal(o).shutter;
  const s = groupShutter(g, o);
  return s >= frame ? f : o + (f - o) * (s / frame);
}
/**
 * The two bottoms' beat frames print with a short shutter: the impact frame. Between a plunge and a stop (or, on the second, the spike's
 * launch) half a frame's shutter smeared him into a ghost on the very frame the backbeat lands; at 0.12 he lands sharp and the frames
 * either side carry the speed.
 */
export const IMPACT_SHUTTER = 0.12;
/**
 * The rattle's two jolts (round 1 SYNC-2): on the fill's kick and on its 32nd (+558, +561) the car, him and the elastic section of the
 * track under him (k8 → k9) are knocked JOLT px on screen — the whole frame, the next frame 40 % — taken at the output frame (both
 * groups print one sharp instant there). Screen px, (x, y).
 */
export const JOLTS: readonly { at: number; d: V2 }[] = [
  { at: RATTLE.from, d: [8, -8] },
  { at: RATTLE.from + THIRTY_SECOND, d: [-8, 8] },
];
export function joltAt(f: number): V2 {
  const o = frameOf(f);
  for (const j of JOLTS) {
    if (o === j.at) return j.d;
    if (o === j.at + 1) return [0.4 * j.d[0], 0.4 * j.d[1]];
  }
  return [0, 0];
}
/** How much of the jolt a track point at world x takes: the elastic section k8 → k9, tapering to nothing over 48 px either side. */
export function joltWeight(x: number): number {
  const a = KEYS[7].x;
  const b = KEYS[8].x;
  return x < a ? clamp(1 - (a - x) / 48) : x > b ? clamp(1 - (x - b) / 48) : 1;
}
/**
 * The crest's key (k5, 6.3; round 1 SYNC-2): its ◆ pops 1.6× (decaying over 8 f) and an ink ring runs out of it (radius 50 → 280,
 * cubic out over 8 f, fading from the 3rd) — from the beat frame's shutter opening. Null outside.
 */
export function crestPopAt(f: number): { s: number; r: number; alpha: number } | null {
  const e = f - CREST + HIT_LEAD;
  if (e < 0 || e >= 8) return null;
  return { s: 1 + 0.6 * (1 - e / 8) ** 2, r: 50 + 230 * ease.outCubic(e / 8), alpha: 1 - clamp((e - 3) / 5) };
}
/**
 * The click (6.4e): the cursor selects k10 and the curve's last segment (k9 → k10) — red-edged rails and a red ring round the key — from
 * the kick's shutter opening until the yank folds that segment into the red hook.
 */
export const selectedAt = (f: number): boolean => f >= RATTLE.from - HIT_LEAD && f < YANK;
/**
 * The click's marquee (6.4e → the yank; round 1 F1 / SYNC-2): on the fill's kick the antivirus's red marquee — C6's, the object the bar
 * opened on — snaps round what the click has framed (the curve's last two segments k8 → k10 with k10's handles, him on them, the
 * cursor's grip), with a dim outside it; on the yank it is gone. Screen px, taken at the output frame. The dim is SELECT_DIM black (in
 * linear light: cream's relative luminance 0.90 → 0.83): half C6's 15 %, so that as a swing it stays under check-flash's 0.1 in every
 * block — the click's picture event, not a flash. (In v02 the click's frame changed the picture barely more than the ride before it:
 * 6.4e scraped a hit by 2 %.)
 */
export const SELECT_DIM = 0.08;
export type SelectRect = { x0: number; y0: number; x1: number; y1: number };
let selectRectMemo: SelectRect | null = null;
/** The marquee's rect (screen): the bounds of k8, k9, k10 (± its handles), his face and his car over the hold, 40 px clear. */
export function selectRect(): SelectRect {
  if (selectRectMemo) return selectRectMemo;
  const xs: number[] = [];
  const ys: number[] = [];
  const add = (p: V2): void => {
    xs.push(p[0]);
    ys.push(p[1]);
  };
  // The frames it is up on, as they print: the click's own instant (7/8 of the snap) and the still framing to the yank.
  for (let f = RATTLE.from; f < YANK; f = f === RATTLE.from ? CLICK_SNAP.from + CLICK_SNAP.frames : f + 0.25) {
    const c = graphCam(f);
    const S = (p: V2): V2 => {
      const [rx, ry] = rotate(c.zoom * (p[0] - c.cx), c.zoom * (p[1] - c.cy), c.roll);
      return [rx + 960, ry + 540];
    };
    for (const i of [7, 8, 9]) {
      const [x, y] = keyPoint(i);
      add(S([x - 96, y]));
      add(S([x + 96, y]));
    }
    const h = heroAt(f);
    // His face (about 2.6 em either side of his ω, 0.75 em up, 0.35 down) and his car's underside.
    for (const [dx, dy] of [[-2.6, -0.75], [2.6, -0.75], [-2.6, 0.35], [2.6, 0.35]]) add(S([h.x + dx * h.em, h.y + dy * h.em]));
    const k = carAt(f);
    add(S([k.x, k.y + CAR.h / 2 + CAR.wheelR]));
    const cur = cursorAt(f);
    if (cur) add([cur.x + 46, cur.y + 72]);
  }
  selectRectMemo = { x0: Math.min(...xs) - 40, y0: Math.min(...ys) - 40, x1: Math.max(...xs) + 40, y1: Math.max(...ys) + 40 };
  return selectRectMemo;
}
/** The marquee on output frame o (6.4e → the yank) with its dim, or null. */
export function selectionAt(f: number): (SelectRect & { dim: number }) | null {
  const o = frameOf(f);
  return o >= RATTLE.from && o < REWIND.from ? { ...selectRect(), dim: SELECT_DIM } : null;
}
/** One segment, break 6.1 → the whip's hidden cut (C6 and C7 are both hard cuts). */
export const graphSegment = (): Segment => ({ from: GRAPH.from, to: GRAPH.to });
/** The break's flat look (only HDR highlights bloom; no aberration, no shake, no white flash). */
export const graphLook = (): Look => BREAK_LOOK;
