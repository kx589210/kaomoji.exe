// E3 IRIS, outro 3.1 → 4.1 (OutroIris; build sheet notes/b58/ending-sheet.md §3.3, §4 3.1 / 4.1, §5.1, §7 E3, §7.1). Pure.
// The film's first tonic: he pries the antivirus's red dot open from inside into a circle (springL; the cartoon iris-out reversed), his
// fingertips on the dot becoming his hands on the rim, his arms drawn from his shoulders to them — the v04 pry-open's `ヽ(•ω•)ﾉ`, wink
// and ✧, kept and carried onto the circle; on outro 3.2, the frame the log promised, he winks (•ω<) and the ✧ spins in outside the ﾉ;
// the readout (W5) types in calm and counts the wink's frame honestly; a 16th before 3.3 his left hand lets go of the rim (it dents and
// trembles where he held it) and swings down round the outside of his face onto ↑ on 3.3: the antivirus's own `exit`, in red; ↑ again:
// his own first command, and he rises; on 3.4 Enter: the hand goes back up, both arms push, and friends 1 → 2 → 4 → 8 in big type while
// seven spots open onto the worlds he infected (src/shots/outroSpots.ts). The interior is pushed 1.00 → 1.04 about the centre; the spots
// and W5 are screen-space. Exports the pure state OutroCompany reads at BURST − 1 (§4): irisHero, armEnds / layArm (his arms), irisRadius,
// the spots (outroSpots.ts) and W5 (outroW5.ts).
import { CURSOR, DECODE, PROMPT } from '../content/boot.ts';
import { COUNTER_TEXT, EXIT_TYPED, HERO_OUT, RECALL_LINES } from '../content/outro.ts';
import type { Pose } from '../engine/camera.ts';
import { linear, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { SWAP_LEAD, type Segment, type Temporal, struck } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { aimPose } from '../motion/hit.ts';
import { seedFrame } from '../score/film.ts';
import { BURST, COUNTER, IRIS_PUSH, LET_GO, OPEN, OUTRO_SEGMENT, RECALL, RUN, SURVIVED, TWINKLES, WINK } from '../score/outro.ts';
import { FRAMES_PER_BAR, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { TERMINAL_CURVATURE, terminalLook } from '../worlds/terminal.ts';
import { FOV, FRONT_DISTANCE } from './intro.ts';
import { APERTURE_NONE, type ApertureState, irisRadiusAt } from './outroAperture.ts';
import { INKS, X, Y, faceOffsets, glow, monoLine, monoWidth, pop } from './outroKit.ts';
import { DOT_AT_OPEN, IRIS, flow, impact, springL } from './outroShared.ts';
import { spotsAt } from './outroSpots.ts';

const EIGHTH = FRAMES_PER_BEAT / 2;
const SIXTEENTH = FRAMES_PER_BEAT / 4;

// ——— The iris: r(θ) ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The push: 1.00 → 1.04 about (960, 540), linear from the tonic to the burst. */
export const irisZoom = (f: number): number => 1 + 0.04 * clamp((f - IRIS_PUSH.from) / (IRIS_PUSH.to - IRIS_PUSH.from));
/** How settled the opening is (0 at the pry, 1 by + 14): the living hold's breath and strain come in with it. */
const settled = (f: number): number => smoothstep(OPEN + 4, OPEN + 14, f);
/**
 * The iris's base radius (layout px, before the push): pried open from the dot (half its width) on the tonic — a launch, 75 % by + 3,
 * past round to ≈ 430 near + 5, settled on 400 by + 14; on Enter both arms push it to ≈ 440 and it springs back to 420; on the last
 * doubling it strains out to 440 for the burst. Then a living hold: ±6 px a beat (breath), ±2 px a 16th (strain).
 */
export function irisRadius(f: number): number {
  const r0 = DOT_AT_OPEN.w / 2;
  let r = r0 + (IRIS.open - r0) * springL(f, OPEN, 0.6);
  // Enter: both arms shove it out to ≈ 440 (up in 3 frames, back over the next 8) as it settles on 420.
  const t = f - (RUN - 1);
  const shove = t <= 0 ? 0 : t < 3 ? Math.sin((Math.PI / 2) * (t / 3)) : Math.exp(-(t - 3) / 3);
  r += (IRIS.run - IRIS.open) * springL(f, RUN, 0.6) + (IRIS.strained - IRIS.run) * shove;
  r += (IRIS.strained - IRIS.run) * springL(f, COUNTER[3], 0.75);
  const s = settled(f);
  r += s * (6 * Math.sin((2 * Math.PI * (f - OPEN - 12)) / FRAMES_PER_BEAT) + 2 * Math.sin((2 * Math.PI * (f - OPEN)) / SIXTEENTH));
  return r;
}
/**
 * Where his hands hold the rim (from the top, clockwise positive; ending fixer a, round 2, R2-ARMS-ATTACH): the ヽ at −50°, the line of
 * its own stroke from his left shoulder; the ﾉ hands-up at +36°, near upright beside his `)` so the ✧ sits outside it, as in v04. On the pry
 * they spread out from his fingertips on the dot (±30°, outroMonitor's notches). See ARMS.
 */
const GRIPS = { L: (-50 * Math.PI) / 180, R: (36 * Math.PI) / 180, knock: Math.PI / 6 } as const;
/** Where his left hand held the rim, the ヽ arm's tip: the rim dents there when it lets go. */
export const GRIP = GRIPS.L;
/** The dent where the left hand let go (from a 16th before 3.3, as the hand leaves for the ↑, to 3.4): 40 px, trembling ±4 px on the 32nds; it pops out on Enter. */
export function irisDent(f: number): number {
  if (f < LET_GO.from - PRESS.lead) return 0;
  const held = impact(f, LET_GO.from, PRESS.lead) * (1 - springL(f, LET_GO.to, 0.6));
  return held * (40 + 4 * Math.sin((2 * Math.PI * (f - LET_GO.from)) / 3));
}
/**
 * The aperture at instant f (screen space): the main iris, its dent, the spots. The window itself is not pushed — the push dollies the
 * picture inside it (a parallax between the rim and him), so the rim's widest (440 + its breath) keeps the spots clear.
 */
export function irisAperture(f: number): ApertureState {
  return { ...APERTURE_NONE, mode: 'iris', inside: 1, irisR: irisRadius(f), dent: irisDent(f), dentAt: GRIP, rimWidth: 3, rimLevel: glow(f, OPEN, 0.8, 6) * glow(f, RUN, 0.4, 4), spots: spotsAt(f) };
}
/** The interior's camera: the push about the centre (the flat world under aimPose). */
export const irisPose = (f: number): Pose => aimPose({ zoom: irisZoom(f), x: 0, y: 0, roll: 0 }, FRONT_DISTANCE, FOV);

// ——— Him: ヽ(•ω•)ﾉ → ヽ(•ω<)ﾉ ✧ (the v04 wink, kept) ——————————————————————————————————————————————————————————————————————————————

/** The wink's morph (v04): the right • grows into a dot-sized circle (the layer's circlePerEm) that becomes the <, whole by WINK − SWAP_LEAD. */
const WINK_FROM = WINK - 4 - SWAP_LEAD;
const WINK_SWAP = WINK - 2;
const WINK_DONE = WINK - SWAP_LEAD;
export function rightEye(f: number): { ch: string; morph: number } {
  if (f <= WINK_FROM) return { ch: '•', morph: 0 };
  if (f < WINK_SWAP) return { ch: '•', morph: ease.inOutSine((f - WINK_FROM) / (WINK_SWAP - WINK_FROM)) };
  if (f < WINK_DONE) return { ch: '<', morph: 1 - ease.inOutSine((f - WINK_SWAP) / (WINK_DONE - WINK_SWAP)) };
  return { ch: '<', morph: 0 };
}
const winkSpacing = (f: number): number => ease.inOutSine(clamp((f - WINK_FROM) / (WINK_DONE - WINK_FROM)));
/** His centre's y (layout): 540, rising to 505 on the second ↑ (a launch). */
export const heroY = (f: number): number => lerp(IRIS.hero.centre[1], IRIS.hero.risen, springL(f, RECALL[1]));
/** He breathes ±1.5 % a beat, a quarter beat behind the iris's breath. */
const heroSize = (f: number): number => IRIS.hero.em * (1 + 0.015 * settled(f) * Math.sin((2 * Math.PI * (f - OPEN - 18)) / FRAMES_PER_BEAT));

// ——— His arms: drawn from his shoulders to the rim (ending fixer a, round 2: R2-ARMS-ATTACH, R2-ARM-PRESS, R2S-ARM-OVER-FACE) ————————

/** [x0, y0, x1, y1]. */
export type Box = readonly [number, number, number, number];
type Pt = readonly [number, number];
/**
 * M PLUS Rounded 1c ExtraBold's ink, measured from public/fonts/mplus-rounded-1c-extrabold.ttf (opentype.js; notes/
 * b58/ending-a-r2/ink2.mjs), in ems from the atlas quad's centre — the advance box's middle, Canvas `textBaseline = 'middle'`, 0.3775 em
 * above the alphabetic baseline (hhea ascent 1.075, descent 0.320) — x right, y UP. `box` is [x0, y0, x1, y1]. For the arms: the hand's
 * and the shoulder's ink extremes along the stroke (`tip`, `base`) and the ink's convex hull (the ﾉ's hull is a little fatter than its
 * curve: the tests' clearances are conservative). Checked against v08 5604: the `(` lands within 2 px of its measured ink.
 */
export const ROUNDED_INK: Readonly<Record<'(' | ')' | '•' | 'ω' | '<', { box: Box }>> = {
  '(': { box: [-0.145, -0.5625, 0.1707, 0.3925] },
  ')': { box: [-0.1701, -0.5625, 0.145, 0.3925] },
  '•': { box: [-0.147, -0.1595, 0.147, 0.1345] },
  ω: { box: [-0.365, -0.3875, 0.365, 0.1425] },
  '<': { box: [-0.2885, -0.3641, 0.2585, 0.1891] },
};
export const ARM_INK: Readonly<Record<'ヽ' | 'ﾉ', { tip: Pt; base: Pt; hull: readonly Pt[] }>> = {
  ヽ: {
    tip: [-0.1747, 0.2807],
    base: [0.1693, -0.3063],
    hull: [
      [-0.251, 0.1967], [-0.2478, 0.1792], [0.1033, -0.2898], [0.1166, -0.3021], [0.1335, -0.3095], [0.1518, -0.3112], [0.1693, -0.3063],
      [0.2353, -0.2649], [0.2474, -0.2509], [0.2545, -0.2335], [0.256, -0.2149], [0.2515, -0.1972], [0.1646, -0.0594], [0.0191, 0.1348],
      [-0.1059, 0.2712], [-0.1219, 0.2815], [-0.1405, 0.2862], [-0.1602, 0.2854], [-0.1782, 0.279], [-0.2349, 0.2351], [-0.2458, 0.2212],
      [-0.2507, 0.2043],
    ],
  },
  ﾉ: {
    tip: [0.1248, 0.3681],
    base: [-0.1241, -0.4061],
    hull: [
      [-0.1781, -0.3026], [-0.174, -0.3265], [-0.1472, -0.392], [-0.1308, -0.4037], [-0.111, -0.4077], [-0.0929, -0.4015], [-0.0281, -0.3455],
      [0.0336, -0.2678], [0.0827, -0.1722], [0.1215, -0.0516], [0.15, 0.0959], [0.168, 0.2731], [0.1686, 0.3245], [0.159, 0.3449],
      [0.1421, 0.3607], [0.1209, 0.3689], [0.0679, 0.3719], [0.0489, 0.3629], [0.0344, 0.3464], [-0.1766, -0.2868],
    ],
  },
};
/** An arm glyph's placement in the flat world: centre, size (the glyph's y scale), stretch (its x scale over size), rotation. */
export type ArmLay = { x: number; y: number; size: number; stretch: number; rot: number };
/** How hard the arm's two scales may differ against how much its stroke may thicken (see layArm). */
const ARM_ANISO = 0.1;
/**
 * The arm glyph laid from its shoulder to its hand (flat world, y up): its shoulder's ink extreme on `base`, its hand's on `tip`,
 * rotated onto that line and scaled along it — the prototype's arm() (ending-harness.html), which stretches the glyph along its stroke.
 * The glyph field scales only along the glyph's own x (`stretch`) and uniformly (`size`), so the stretch is split between them: of the
 * scalings that give the exact length, the one that best keeps the stroke's weight at `em` without squashing its round caps by more
 * than ARM_ANISO allows (cost (ln weight)² + ARM_ANISO·(ln x/y)²; at ×1.3 the ヽ keeps its weight within ≈ 6 %, its caps within 1.3 : 1).
 */
export function layArm(ch: 'ヽ' | 'ﾉ', base: Pt, tip: Pt, em: number): ArmLay {
  const ink = ARM_INK[ch];
  const [vx, vy] = [ink.tip[0] - ink.base[0], ink.tip[1] - ink.base[1]];
  const v = Math.hypot(vx, vy);
  const [wx, wy] = [tip[0] - base[0], tip[1] - base[1]];
  const L = Math.max(1e-3, Math.hypot(wx, wy));
  const lambda = L / (em * v);
  const [c2, s2] = [(vx / v) ** 2, (vy / v) ** 2];
  const cost = (t: number) => (Math.log(lambda) - Math.log(Math.exp(t) * c2 + Math.exp(-t) * s2)) ** 2 + ARM_ANISO * t * t;
  // The cost is smooth with one minimum in reach: a coarse scan, then a golden-section refinement round the best sample.
  let best = 0;
  for (let t = -1; t <= 1.0001; t += 0.05) if (cost(t) < cost(best)) best = t;
  let [lo, hi] = [best - 0.05, best + 0.05];
  const g = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 24; i++) {
    const [m1, m2] = [hi - g * (hi - lo), lo + g * (hi - lo)];
    if (cost(m1) < cost(m2)) hi = m2;
    else lo = m1;
  }
  const t = (lo + hi) / 2;
  const k = L / Math.sqrt(Math.exp(t) * vx * vx + Math.exp(-t) * vy * vy);
  const [a, b] = [k * Math.exp(t / 2), k * Math.exp(-t / 2)];
  const rot = Math.atan2(wy, wx) - Math.atan2(b * vy, a * vx);
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  const [bx, by] = [a * ink.base[0], b * ink.base[1]];
  return { x: base[0] - (c * bx - s * by), y: base[1] - (s * bx + c * by), size: b, stretch: a / b, rot };
}
/** An arm's ink hull where `lay` puts it (flat world, y up): for the clearances. */
export function armHull(ch: 'ヽ' | 'ﾉ', lay: ArmLay): Pt[] {
  const [c, s] = [Math.cos(lay.rot), Math.sin(lay.rot)];
  return ARM_INK[ch].hull.map(([hx, hy]) => {
    const [qx, qy] = [hx * lay.size * lay.stretch, hy * lay.size];
    return [lay.x + c * qx - s * qy, lay.y + s * qx + c * qy] as const;
  });
}

/** His face at instant f (layout px): centre, size, the glyph of each slot and its centre's x, and its ink box (y down: [x0, top, x1, bottom]). */
export function irisFace(f: number, rounded: Advance): { centre: [number, number]; size: number; slots: { ch: string; morph: number; x: number; box: Box }[] } {
  const cy = heroY(f);
  const cx = IRIS.hero.centre[0];
  const size = heroSize(f);
  const eye = rightEye(f);
  const base = ['(', '•', 'ω', '•', ')'];
  const widths = base.map((ch) => rounded(ch));
  widths[3] = lerp(rounded('•'), rounded('<'), winkSpacing(f));
  const offs = faceOffsets(base, rounded, widths);
  const slots = base.map((slot, i) => {
    const ch = i === 3 ? eye.ch : slot;
    const x = cx + offs[i] * size;
    const b = ROUNDED_INK[ch as keyof typeof ROUNDED_INK].box;
    return { ch, morph: i === 3 ? eye.morph : 0, x, box: [x + b[0] * size, cy - b[3] * size, x + b[2] * size, cy - b[1] * size] as Box };
  });
  return { centre: [cx, cy], size, slots };
}

/**
 * The arms (R2-ARMS-ATTACH: v04's `ヽ(•ω<)ﾉ`, each arm bridging its bracket and the rim), each laid from its shoulder — just above and
 * outside its bracket's top, `shoulder` px from the bracket's ink box (at em 160; they ride his breath and his rise) — to its hand on the
 * rim at its grip (`tuck` px under the rim's line, so the rim's stroke holds the fingertips), stretched along the stroke. `scale`: each
 * glyph's em over his (the ヽ's stroke is 0.17 em, the ﾉ's 0.13: both ≈ 27 px, a little over his face's 21, as v04's arms were). The
 * ヽ's shoulder stands 18 px clear above the `(` so its whole arm stays off his face when it swings down to press ↑.
 */
export const ARMS = { scale: { ヽ: 1, ﾉ: 1.3 }, grips: GRIPS, shoulder: { L: [2, -18], R: [-14, -16] }, tuck: 3 } as const;
/**
 * Where the ヽ arm goes when it lets go of the rim (R2-ARM-PRESS / R2S-ARM-OVER-FACE): it leaves the rim a 16th before 3.3 and slams onto
 * the ↑ ON 3.3 (I: the impact lands on the key's beat), turning about its shoulder through "pointing left", round the outside of the `(`,
 * never across him: the shoulder slides out over the bracket's top and down its outside (`drop` of its height), keeping its ink `clear`
 * px off the bracket's box plus the arm's own half-spread across its stroke (`spread`, at its angle); the fingertip lands on the
 * prompt's `>` (`tip` from the line's left edge and baseline, just over the type), dips `dip` px on each ↑, and goes back up on Enter (L).
 */
const PRESS = { lead: 6, clear: 16, spread: 12, drop: 0.12, tip: [-4, -34] as Pt, dip: 14 } as const;
const armPress = (f: number): number => impact(f, LET_GO.from, PRESS.lead) * (1 - springL(f, LET_GO.to));
/** How far the ヽ is from its hold on the rim toward the key (0 = on the rim, 1 = at the key). */
export const pressing = (f: number): number => clamp(armPress(f));
/** A press of ↑: the hand dips on each key (6 f). */
const keyDip = (f: number): number => Math.max(...RECALL.map((at) => (f >= at - 1 && f < at + 5 ? Math.sin((Math.PI * (f - at + 1)) / 6) : 0)));
/** A hand's point on the rim at angle θ (layout px), placed inside the pushed picture so that on screen it lands `tuck` px under the rim. */
function rimHand(f: number, theta: number): Pt {
  const R = irisRadiusAt({ irisR: irisRadius(f), dent: irisDent(f), dentAt: GRIP }, theta) + ARMS.tuck;
  const z = irisZoom(f);
  return [960 + (R * Math.sin(theta)) / z, 540 - (R * Math.cos(theta)) / z];
}
/** The angle each hand holds the rim at: spreading on the pry from his fingertips on the dot (±30°) to its grip (L, overshooting a touch). */
const gripAt = (f: number, k: -1 | 1): number => lerp(k * GRIPS.knock, k < 0 ? GRIPS.L : GRIPS.R, springL(f, OPEN));
/** The arms' shoulder and hand at instant f (layout px, y down), from his face. */
export function armEnds(f: number, face: ReturnType<typeof irisFace>): { ch: 'ヽ' | 'ﾉ'; base: Pt; tip: Pt }[] {
  const q = face.size / IRIS.hero.em;
  const [bl, br] = [face.slots[0].box, face.slots[4].box];
  const restL: Pt = [bl[0] + ARMS.shoulder.L[0] * q, bl[1] + ARMS.shoulder.L[1] * q];
  const restR: Pt = [br[2] + ARMS.shoulder.R[0] * q, br[1] + ARMS.shoulder.R[1] * q];
  let left = { base: restL, tip: rimHand(f, gripAt(f, -1)) };
  const p = pressing(f);
  if (p > 0) {
    // The shoulder's x beside the bracket for an arm at angle a: its ink `clear` px off the box, plus the arm's spread across its stroke
    // (none when it points straight out to the left, all of it when it hangs).
    const sideX = (a: number): number => bl[0] - (PRESS.clear + PRESS.spread * Math.abs(Math.sin(a))) * q;
    const pressY = bl[1] + PRESS.drop * (bl[3] - bl[1]);
    const pressTip: Pt = [PROMPT_X + PRESS.tip[0], PROMPT_LINE.baseline + PRESS.tip[1]];
    const pressBase: Pt = [sideX(Math.PI / 2), pressY];
    // The arm turns about its shoulder from the rim to the key, counter-clockwise on screen (through pointing left).
    const a0 = Math.atan2(left.tip[1] - restL[1], left.tip[0] - restL[0]);
    const a1 = Math.atan2(pressTip[1] - pressBase[1], pressTip[0] - pressBase[0]);
    let turn = (a1 - a0) % (2 * Math.PI);
    if (turn > 0) turn -= 2 * Math.PI;
    const a = a0 + turn * p;
    // The shoulder: out to the left first (above the bracket), then down its outside; on the key exactly where the key's line starts.
    const out = smoothstep(0, 0.4, p);
    const x = lerp(restL[0], lerp(sideX(a), pressBase[0], smoothstep(0.85, 1, p)), out);
    const base: Pt = [x, lerp(restL[1], pressY, smoothstep(0.35, 1, p))];
    const l0 = Math.hypot(left.tip[0] - restL[0], left.tip[1] - restL[1]);
    const l1 = Math.hypot(pressTip[0] - pressBase[0], pressTip[1] - pressBase[1]);
    const l = lerp(l0, l1, p) + PRESS.dip * keyDip(f) * p;
    left = { base, tip: [base[0] + l * Math.cos(a), base[1] + l * Math.sin(a)] };
  }
  return [
    { ch: 'ヽ', ...left },
    { ch: 'ﾉ', base: restR, tip: rimHand(f, gripAt(f, 1)) },
  ];
}

/** Him at instant f (flat world, unpushed; the scene draws him under irisPose): his face glyph by glyph, his arms, the ✧. */
export function irisHero(f: number, rounded: Advance): { glyphs: Glyph[]; centre: [number, number]; arms: number; star: ReturnType<typeof starAt> } {
  const face = irisFace(f, rounded);
  const [cx, cy] = face.centre;
  const light = glow(f, OPEN, 0.5, 10);
  const ink = scaleRGB(INKS.hero, light);
  const glyphs: Glyph[] = face.slots.map((s) => ({ ch: s.ch, x: X(s.x), y: Y(cy), size: face.size, color: ink, morph: s.morph }));
  // The arms: from the pry on (his fingertips on the dot become his hands on the rim; the aperture shows what of them is inside it).
  for (const e of armEnds(f, face)) {
    const lay = layArm(e.ch, [X(e.base[0]), Y(e.base[1])], [X(e.tip[0]), Y(e.tip[1])], IRIS.hero.em * ARMS.scale[e.ch]);
    glyphs.push({ ch: e.ch, ...lay, color: ink });
  }
  return { glyphs, centre: [cx, cy], arms: 1, star: starAt(f) };
}

// ——— The ✧ (v04's: popped on the wink, spinning in, twinkling on the 8ths) ————————————————————————————————————————————————————————

const POP = { peak: 4, settled: 12 } as const;
function swell(f: number, at: number): number {
  const u = f - at + 1;
  if (u <= 0 || u >= EIGHTH) return 0;
  return u < 3 ? Math.sin((Math.PI / 2) * (u / 3)) : 1 - flow((u - 3) / (EIGHTH - 3));
}
const SPIN = (0.6 * Math.PI) / 180;
const SPIN_IN = (45 * Math.PI) / 180;
const TWINKLE_TURN = (15 * Math.PI) / 180;
/**
 * Where the ✧ sits and how big it is (ending fixer a, round 1, review F1: the as-built ✧ — #FFE3A8 at 110 px, low under his ) — read as
 * a dull sticker). It keeps the amber (the decision of 2026-10-01 to go with the new look: the orange ✧, not v04's pink) and takes v04's
 * place and weight back: v04's 118 px beside his winking eye, outside the ﾉ (round 2, R2-ARMS-ATTACH: dx 294 / dy −36 from his centre,
 * now that the ﾉ stands near-upright beside his `)` — its ink ≥ 19.6 px off the ﾉ and ≥ 25.5 px inside the rim), rising with him on the
 * second ↑.
 */
export const STAR = { at: [1254, 504] as const, risen: [1248, 474] as const, size: 118, base: (20 * Math.PI) / 180 } as const;
/** The ✧ at instant f (layout px): popped on the wink (keyed a frame early, 0 → 1.25 by + 3, settling by + 12), riding his rise. */
export function starAt(f: number): { x: number; y: number; size: number; rot: number; twinkle: number; pop: number } | null {
  const t = f - (WINK - 1);
  if (t <= 0) return null;
  const k = t < POP.peak ? 1.25 * ease.outCubic(t / POP.peak) : lerp(1.25, 1, flow((t - POP.peak) / (POP.settled - POP.peak)));
  const tw = TWINKLES.reduce((a, at) => Math.max(a, swell(f, at)), 0);
  const turns = TWINKLES.reduce((a, at) => a + flow((f - at + 1) / EIGHTH), 0);
  const rise = springL(f, RECALL[1]);
  return {
    x: lerp(STAR.at[0], STAR.risen[0], rise),
    y: lerp(STAR.at[1], STAR.risen[1], rise),
    size: STAR.size * k * (1 + 0.15 * tw),
    rot: STAR.base - SPIN_IN * (1 - ease.outCubic(clamp(t / POP.settled))) + SPIN * t + TWINKLE_TURN * turns,
    twinkle: tw,
    pop: Math.max(0, 1 - t / 6),
  };
}
/**
 * The ✧'s light (linear): his amber at full heat. The body is a saturated amber well over his face's ×1.9 with a thick outline of the
 * same gas (the glyph's strokes are hairlines: the outline gives them v04's weight), a hot cream core laid over its middle, and a soft
 * amber halo — so it is the brightest thing in the iris and reads by heat and shape, not by hue (the amber is his).
 */
export const STAR_INK = { body: linear('#FFA51F', 2.6), core: linear('#FFE3A8', 1.6), halo: linear('#FFB23E', 1.4), glint: linear('#FFD27A', 2.2) } as const;
/** The ✧ as glyphs (rounded atlas): halo, amber body with its outline, hot core; `alpha` fades all three (the pop-off on the burst). */
export function starGlyphs(s: { x: number; y: number; size: number; rot: number } | null, alpha = 1): Glyph[] {
  if (!s || alpha <= 0) return [];
  const g = { ch: HERO_OUT.star, x: X(s.x), y: Y(s.y), rot: s.rot };
  return [
    { ...g, size: s.size * 1.32, color: STAR_INK.halo, alpha: 0.32 * alpha },
    { ...g, size: s.size, color: STAR_INK.body, outline: 0.075, outlineColor: STAR_INK.body, alpha },
    { ...g, size: s.size, color: STAR_INK.core, alpha: 0.85 * alpha },
  ];
}
/**
 * The ✧'s glint: on the pop and on every twinkle two soft streaks of light cross at its centre along its tips (a sparkle's flare), as
 * long as 2.6 × its size at the twinkle's peak — the twinkle seen, not only its 15 % swell. Shapes for the additive layer.
 */
export function starGlint(s: { x: number; y: number; size: number; rot: number; twinkle: number; pop: number } | null, alpha = 1): Shape[] {
  if (!s) return [];
  const k = Math.max(s.twinkle, s.pop) * alpha;
  if (k <= 0.01) return [];
  const len = s.size * (1.2 + 1.4 * k);
  return [0, Math.PI / 2].map((a) => ({ kind: 'ellipse' as const, x: X(s.x), y: Y(s.y), w: len, h: 7, rot: s.rot + a, color: STAR_INK.glint, alpha: 0.8 * k, soft: 3.5 }));
}

// ——— The prompt: ↑ recalls the antivirus's exit, then his own first command ——————————————————————————————————————————————————————

export const PROMPT_LINE = { size: IRIS.prompt.size, baseline: IRIS.prompt.baseline } as const;
/**
 * The prompt's left edge (layout x): where the long command starts when centred on x 960 in JetBrains Mono's 0.6 em cells (≈ 701,
 * v04's and the prototype's place). Every prompt state is set from here (R2-ARM-PRESS: the short `> █`, `> ↑` and `> exit` were centred,
 * which put the ↑ keycap, and the hand pressing it, under his face); the ↑ keycap then sits at x ≈ 744–766.
 */
export const PROMPT_X = 960 - monoWidth(RECALL_LINES[2], IRIS.prompt.size, () => 0.6) / 2;
const DECODE_LIST = [...DECODE];
/** The keycap's three frames on each ↑. */
const KEYCAP = 3;
/** What the prompt reads at instant f: waiting (`> █`) from the survived line, `> ↑`, `> exit` (red), `> ↑`, his command. */
export function promptState(f: number): { text: string; kind: 'wait' | 'key' | 'exit' | 'command'; since: number } | null {
  if (!struck(SURVIVED, f)) return null;
  if (!struck(RECALL[0], f)) return { text: `${PROMPT}${CURSOR}`, kind: 'wait', since: SURVIVED };
  if (!struck(RECALL[0] + KEYCAP, f)) return { text: RECALL_LINES[0], kind: 'key', since: RECALL[0] };
  if (!struck(RECALL[1], f)) return { text: RECALL_LINES[1], kind: 'exit', since: RECALL[0] + KEYCAP };
  if (!struck(RECALL[1] + KEYCAP, f)) return { text: RECALL_LINES[0], kind: 'key', since: RECALL[1] };
  return { text: RECALL_LINES[2], kind: 'command', since: RECALL[1] + KEYCAP };
}
/** The cursor blinks on the 8ths (6 frames on, 6 off), never while a line is being recalled. */
const cursorOn = (F: number): boolean => Math.floor(F / (EIGHTH / 2)) % 2 === 0;
/** The prompt's glyphs and the ↑ keycap (flat world, unpushed: the scene draws it under irisPose), every state set from PROMPT_X. */
export function promptContent(f: number, mono: Advance): { under: Shape[]; glyphs: Glyph[] } {
  const s = promptState(f);
  if (!s) return { under: [], glyphs: [] };
  const F = Math.round(f);
  const shimmer = (s.kind === 'exit' || s.kind === 'command') && F < s.since + 2;
  const flare = s.kind === 'command' ? glow(f, RUN, 0.6, 3) * (struck(RUN, f) && F < RUN + 4 ? 1.6 : 1) : 1;
  const chars = [...s.text];
  const glyphs = monoLine(s.text, {
    x: PROMPT_X,
    baseline: PROMPT_LINE.baseline,
    size: PROMPT_LINE.size,
    advance: mono,
    swap: shimmer ? (j, ch) => (j < PROMPT.length ? ch : DECODE_LIST[Math.floor(hash(j, seedFrame(F), 57) * DECODE_LIST.length)]) : undefined,
    ink: (j, ch) => {
      if (j < PROMPT.trimEnd().length) return INKS.green;
      if (ch === CURSOR) return scaleRGB(INKS.green, cursorOn(F) ? 1 : 0.08);
      if (s.kind === 'exit') return scaleRGB(INKS.red, shimmer ? 1.4 : glow(f, s.since + 2, 0.6, 4));
      if (s.kind === 'key') return INKS.mint;
      return scaleRGB(INKS.mint, (shimmer ? 1.5 : glow(f, s.since + 2, 0.5, 4)) * flare);
    },
    scale: s.kind === 'key' ? (j) => (j === chars.length - 1 ? pop(f, s.since, 1.3, 3) : 1) : undefined,
  });
  const under: Shape[] = [];
  if (s.kind === 'key') {
    // The keycap round the ↑: a mint outline, its face lit.
    const w = monoWidth(s.text, PROMPT_LINE.size, mono);
    const x = PROMPT_X + w - (mono('0') * PROMPT_LINE.size) / 2;
    const y = PROMPT_LINE.baseline - 0.3 * PROMPT_LINE.size;
    const k = pop(f, s.since, 1.25, 3);
    under.push({ kind: 'rect', x: X(x), y: Y(y), w: 40 * k, h: 44 * k, r: 7, color: scaleRGB(INKS.mint, 0.18), outline: 2, outlineColor: INKS.mint });
  }
  return { under, glyphs };
}

// ——— The counter: friends 1 → 2 → 4 → 8 ———————————————————————————————————————————————————————————————————————————————————————

/** The counter's layout (design §7 E3): `friends` 36 px mint 55 % from x 655, baseline 770; the doublings 56 px green ×1.4 in fixed slots. */
export const COUNTER_LAYOUT = { label: { x: 655, size: 36 }, baseline: 770, size: 56, slots: [828, 962, 1097, 1231], arrow: 36 } as const;
/** How many doublings show at instant f (1 on Enter … 4 on 3.4a). */
export const counterStep = (f: number): number => COUNTER.filter((at) => struck(at, f)).length;
/** The counter (flat world, unpushed). The current number at 100 %, older ones 45 %; each new one pops 1.4 → 1 with the arrow drawing in before it (L, 3 f). */
export function counterContent(f: number, mono: Advance): Glyph[] {
  const n = counterStep(f);
  if (n === 0) return [];
  const L = COUNTER_LAYOUT;
  const glyphs = monoLine(COUNTER_TEXT.label, { x: L.label.x, baseline: L.baseline, size: L.label.size, advance: mono, ink: () => INKS.mintDim, alpha: clamp((f - RUN + 1) / 3) });
  const cell = mono('0') * L.size;
  for (let k = 0; k < n; k++) {
    const at = COUNTER[k];
    const x = L.slots[k] + cell / 2;
    const current = k === n - 1;
    const ink = scaleRGB(INKS.green, (current ? 1 : 0.45) * glow(f, at, 0.8, 4));
    glyphs.push(...monoLine(COUNTER_TEXT.steps[k], { x, centre: true, baseline: L.baseline, size: L.size * pop(f, at, 1.4, 5), advance: mono, ink: () => ink }));
    if (k > 0) {
      const ax = (L.slots[k - 1] + cell + L.slots[k]) / 2;
      const draw = clamp(springL(f, at));
      glyphs.push({ ch: COUNTER_TEXT.arrow, x: X(ax - (1 - draw) * 14), y: Y(L.baseline - 0.36 * L.size), size: L.arrow, stretch: Math.max(0.05, draw), color: scaleRGB(INKS.green, 0.7), alpha: draw });
    }
  }
  return glyphs;
}

// ——— The frame ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The interior at instant f (flat world, drawn under irisPose): him and his ✧ (rounded), the prompt and the counter (mono). */
export function irisInterior(f: number, L: { rounded: Advance; mono: Advance }): FlatContent {
  const hero = irisHero(f, L.rounded);
  const prompt = promptContent(f, L.mono);
  return { under: [...prompt.under, ...starGlint(hero.star)], glyphs: { rounded: [...hero.glyphs, ...starGlyphs(hero.star)], mono: [...prompt.glyphs, ...counterContent(f, L.mono)] }, over: [] };
}
/** The friends W5 counts in the iris: 1 from 3.1&, then the doublings. */
export const irisFriends = (F: number): number => [1, 2, 4, 8][Math.max(0, COUNTER.filter((at) => F >= at).length - 1)];

/** The CRT inside the iris (the as-built lens's): scanlines 0.3, curvature 0.045, the band once a bar; the bloom swells on the tonic. */
export function irisLook(frame: number): Look {
  const F = Math.round(frame);
  const band = (((F % FRAMES_PER_BAR) + FRAMES_PER_BAR) % FRAMES_PER_BAR) / FRAMES_PER_BAR;
  const look = terminalLook(1, 0, band, TERMINAL_CURVATURE);
  const swell = glow(F, OPEN, 0.3, 8);
  return { ...look, bloom: { ...look.bloom, radius: Math.min(1, look.bloom.radius * swell), intensity: look.bloom.intensity * (1 + 0.25 * (swell - 1) / 0.3) } };
}
/** 32 sub-frames through the pry, the wink, the arm's swings, Enter and the spots; 16 elsewhere. */
export function irisTemporal(frame: number): Temporal {
  const fast = [
    [OPEN - 1, OPEN + 14],
    [WINK - 5, WINK + 6],
    [LET_GO.from - PRESS.lead - 1, LET_GO.from + 10],
    [RECALL[1] - 1, RECALL[1] + 10],
    [RUN - 1, BURST],
  ].some(([a, b]) => frame >= a && frame <= b);
  return { samples: fast ? 32 : 16, shutter: 0.5, persistence: 0 };
}
export const irisSegment = (): Segment => ({ from: OUTRO_SEGMENT.from, to: OUTRO_SEGMENT.to });

/** Every string the iris draws, per atlas (rounded: his faces and the ✧; mono: the prompt, the counter). */
export const IRIS_STRINGS = { rounded: [HERO_OUT.arms, HERO_OUT.armsWink, HERO_OUT.star, '<'], mono: [...RECALL_LINES, `${PROMPT}${CURSOR}`, EXIT_TYPED, COUNTER_TEXT.label, ...COUNTER_TEXT.steps, COUNTER_TEXT.arrow] } as const;
