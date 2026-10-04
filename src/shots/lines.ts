// Club bars 1–3 (and the flip into bar 4), flat motion graphics in neon (the
// direction of 2026-10-01: a crowd of kaomoji dancing in tidy queues, several
// lanes across the screen in different directions, then one wine glass and a
// table flip; the core is flat motion design, no set; hypnotic and on the beat;
// the queues in flat pseudo-3D perspective, a zoom into the kaomoji in the
// middle, then the lanes switching to a cross and an eight-way star). The galaxy has shrunk to a point; on club 1.1 that point is the
// guest at the far end of a tunnel of dancing lanes, drawn flat in
// pseudo-perspective, and the camera flies in on him, the dancers streaming
// past faster and faster; on club 1.3 he is full size and the perspective snaps
// flat. Every line dances in unison — a hop on every kick, a pose swap on
// every clap — and flows along itself like a conveyor; every two beats the
// formation snaps to a new one, each with more lines: a cross through him
// (club 1.3), a 米 star (club 2.1), sixteen spokes all streaming in towards him with
// shorter spokes between them (club 2.3). Smaller echo lines weave the other way
// beside each line, a faint lattice of tiny dancers fills the back, a neon ring
// pulses out on every kick, sparks flicker on the hats. In the middle, the
// one still point: (￣▽￣) with a cocktail. On club 3.1 (•ω•) kicks the glass over
// him; on club 3.2 everything freezes and the lights die but his, red: (╯°□°)╯,
// and his hand lands on (•ω•) on the and; on club 3.3 he throws him at us and the
// shock runs out through the lines as a wave.
//
// Lit things are neon tubes (thinned glyphs, white-hot in the middle) with
// their other pose in unlit glass; cyan and pink for the dancers, amber for
// (•ω•), red only for the flip. (•ω•) is a sign on a black body in front of
// the club, so he hides what he passes. Every change made on a drum is taken
// at the output frame (frameOf), so the drum's frame shows it whole. Screen px
// at 1080p, origin at the centre, y up. Every position is part-local
// (src/score/film.ts). Pure.
import { CROWD_FACES, FILLER, FLIPPER, FLIPPER_CALM, HERO as PROTAGONIST, PANIC } from '../content/castDrop1.ts';
import { type RGB, linear, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import { slam, strike } from '../motion/hit.ts';
import { BUILD_KICKS, CLAPS, FLIP, GRAB, HATS, HIT, KICKS, LEVELS, LIGHTS_OUT, ROLL, SIDE, SPLASH } from '../score/drop1.ts';
import { partFrame, seedFrame } from '../score/film.ts';

// ── Palette and tubes ─────────────────────────────────────────────────────
export const VOID = linear('#07060C');
const GHOST = linear('#1C1A24');
export const NEON = { cyan: linear('#3FE0FF'), pink: linear('#FF3D8B'), amber: linear('#FFB23E'), red: linear('#FF4A1C') } as const;
/** How much a glyph's strokes are thinned to read as a tube (ems); thin glyphs (box drawing, half-width kana, waves) keep their whole stroke. */
const TUBE = 0.018;
const THIN = /[─-╿｡-ﾟヽ〜~︵ノ＼／/|]/u;
const tubeOf = (ch: string): number => (THIN.test(ch) ? 0.001 : TUBE);

export type ClubLayout = { advance: Advance };
/** A frame: dark (unlit glass; normal blend), light (lit tubes; added), fore (nothing here; kept for the scene's layer order); in front of the club, (•ω•): his body (normal blend) and his tubes (added), drawn last. */
export type ClubFrame = { dark: FlatContent; light: FlatContent; fore: FlatContent; front: { dark: FlatContent; light: FlatContent } };
type Out = { darkU: Shape[]; darkG: Glyph[]; lightU: Shape[]; lightG: Glyph[]; lightO: Shape[]; bodyU: Shape[]; heroG: Glyph[] };

/** A neon sign of `text` centred on (x, y), `size` px: lit tube at `level` in `hue` (above 1 blooms), and — when `ghost` — its unlit glass. */
function sign(o: Out, adv: Advance, text: string, x: number, y: number, size: number, hue: RGB, level: number, rot = 0, ghost = true): void {
  const line = typeset(text, adv);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (const ch of line.chars) {
    if (ch.ch.trim() === '') continue;
    const dx = (ch.x - line.width / 2) * size;
    const g: Glyph = { ch: ch.ch, x: x + dx * c, y: y + dx * s, size, rot, color: GHOST, tube: tubeOf(ch.ch) };
    if (ghost) o.darkG.push(g);
    if (level > 0.01) o.lightG.push({ ...g, color: scaleRGB(hue, level) });
  }
}

/** A straight tube (ghost glass, and lit when `level` > 0). */
function tube(o: Out, x0: number, y0: number, x1: number, y1: number, w: number, hue: RGB, level: number): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const shape: Shape = { kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: len + w, h: w, rot: Math.atan2(y1 - y0, x1 - x0), color: GHOST };
  o.darkU.push(shape);
  if (level > 0.01) {
    o.lightU.push({ ...shape, h: w * 2.8, color: scaleRGB(hue, 0.12 * level), soft: w * 1.4 });
    o.lightU.push({ ...shape, color: scaleRGB(hue, level) });
    o.lightU.push({ ...shape, h: w * 0.4, w: len + w * 0.4, color: scaleRGB(hue, 0.9 * level) });
  }
}

const widthOf = (adv: Advance, text: string): number => typeset(text, adv).width;
/** Text kept upright: an angle folded into (−90°, 90°]. */
const upright = (a: number): number => {
  let x = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (x > Math.PI / 2 && x <= (3 * Math.PI) / 2) x -= Math.PI;
  return x;
};

// ── The cast ─────────────────────────────────────────────────────────────
/** One dance per line: two poses, swapped on every clap. */
const DANCES: readonly (readonly [string, string])[] = [
  ['┏(＾0＾)┛', '┗(＾0＾)┓'], ['(〜￣▽￣)〜', '〜(￣▽￣〜)'], ['└(＾＾)┐', '┌(＾＾)┘'], ['(ﾉ≧∀≦)ﾉ', 'ヽ(≧∀≦ヽ)'],
  ['ヽ(°〇°)ﾉ', '┐(°〇°)┌'], ['♪(ﾉ^^)ﾉ', 'ヽ(^^ヽ)♪'], ['(ノ^o^)ノ', 'ヽ(^o^ヽ)'], ['(~˘▽˘)~', '~(˘▽˘~)'],
];
const ECHO_DANCES: readonly (readonly [string, string])[] = [['└(•ω•)┘', '┌(•ω•)┐'], ['＼(^o^)／', '／(^o^)＼'], ['ヾ(・ω・)ノ', 'ヽ(・ω・)ﾉ']];
const LATTICE: readonly (readonly [string, string])[] = [['(•ω•)', '(•ᴗ•)'], ['(^_^)', '(^o^)']];
const GUEST = { calm: FLIPPER_CALM, wet: '(・_・)', flip: FLIPPER } as const;
/**
 * The protagonist: dancing, kicking the glass over, sweating, panicking in flight (a face a beat, his ω stays; on the last beat he screws his
 * eyes shut for the glass — a face symmetric about its ω, so the ω he flies in on is the ω that hits the glass's middle), dying on the glass.
 */
export const HERO = { dance: [PROTAGONIST, 'ヽ(•ω•)ノ'], kick: 'ε=┌(•ω•)┘', sweat: '(•ω•;)', panic: ['Σ(°ω°;)', '(°ω°)', '(ﾟωﾟ;)', '(⊙ω⊙)', '(>ω<)'], dying: '(×ω×)' } as const;
/** Every string drawn, for the atlas. */
export const CLUB_TEXTS: readonly string[] = [...DANCES.flat(), ...ECHO_DANCES.flat(), ...LATTICE.flat(), ...Object.values(GUEST), ...HERO.dance, HERO.kick, HERO.sweat, ...HERO.panic, HERO.dying, '︵', '✦', ...PANIC, ...[...CROWD_FACES, ...FILLER].slice(0, 20)];

// ── Time ─────────────────────────────────────────────────────────────────
const START = LEVELS.cosmos;
/** The formation snaps, each on a kick: the tunnel snapping flat into a cross (club 1.3), the 米 (club 2.1), the spokes (club 2.3). */
export const FORMATIONS = [partFrame('club', 1, 2), LEVELS.table, partFrame('club', 2, 2)] as const;
const PHASES = [START, ...FORMATIONS] as const;
/** The formation in force at instant `f` (0: the tunnel). */
const phaseAt = (f: number): number => PHASES.reduce((p, at, k) => (f >= at ? k : p), 0);
/**
 * The output frame instant `f` belongs to: its nearest whole frame. Every change made on a drum — a pose or a face swapped, the lights dying
 * or coming back, a ring or a spark appearing — and every step of a jitter is taken from it: the change falls half a frame early, between
 * two output frames' shutters (any shutter shorter than a frame), so the drum's frame shows only the new state, whole, and no frame mixes two.
 */
export const frameOf = (f: number): number => Math.floor(f + 0.5);
/** The pose of everyone in unison at output frame `d`: swapped on every clap until the lights die. */
const pose = (d: number): number => CLAPS.filter((c) => c <= Math.min(d, LIGHTS_OUT)).length % 2;
/** A hop on every kick: up fast, down by the and (px). */
const hop = (f: number): number => {
  const k = KICKS.filter((x) => x <= f && x < LIGHTS_OUT).pop();
  if (k === undefined) return 0;
  const t = f - k;
  return t < 14 ? 16 * Math.sin(Math.PI * clamp(t / 13) ** 0.8) : 0;
};
/** Flow time: running until the lights die, crawling after the flip. */
const flow = (f: number): number => (f < LIGHTS_OUT ? f - START : LIGHTS_OUT - START + (f > FLIP ? 0.15 * (f - FLIP) : 0));

// ── Formations ───────────────────────────────────────────────────────────
/** A line: its direction of flow, its offset from the centre (along its normal), on/off, and how much of the half beyond the centre is gone (1: a spoke, only the half streaming in). */
type Slot = { th: number; o: number; on: number; half: number };
const P = Math.PI;
const SLOTS = 16;
const OFF: Slot = { th: 0, o: 1400, on: 0, half: 0 };
const line = (th: number, o = 0): Slot => ({ th, o, on: 1, half: 0 });
const pad = (slots: readonly Slot[]): Slot[] => [...slots, ...Array.from({ length: SLOTS - slots.length }, () => OFF)];
const FORMS: readonly (readonly Slot[])[] = [
  pad([]),
  pad([line(0), OFF, line(P / 2)]),
  pad([line(0), line(P / 4), line(P / 2), line((3 * P) / 4), line(P, 470), line(0, 470)]),
  // Sixteen spokes, each the half of a line streaming in towards him: the star's six lines spin round into six of them, ten more swing in.
  Array.from({ length: SLOTS }, (_, k): Slot => ({ th: ((k % 8) * P) / 4 + P + (k < 8 ? 0 : P / 8), o: 0, on: 1, half: 1 })),
];
/**
 * Slot `i` at `f` (output frame `d`): snapping from one formation to the next on its beat (a launch, most of it in three frames), entering
 * lines sliding in along themselves. The formation is the output frame's: its snap has not moved anything before its kick, so the new
 * formation's lines are there, whole, on every sub-frame of the kick's frame.
 */
function slot(f: number, d: number, i: number): Slot & { enter: number } {
  const p = phaseAt(d);
  const prev = FORMS[Math.max(0, p - 1)][i];
  const next = FORMS[p][i];
  const w = p === 0 ? 1 : clamp(strike(f, PHASES[p], 2.5, 1), 0, 1.04);
  let dth = next.th - prev.th;
  while (dth > P) dth -= 2 * P;
  while (dth < -P) dth += 2 * P;
  const entering = next.on > prev.on;
  // Out of the tunnel (club 1.3) the cross is simply there: the perspective collapses flat onto it.
  if (p === 1 && entering) return { ...next, on: clamp((f - PHASES[1] + 1) / 3), enter: 1 };
  return {
    th: prev.th + dth * w,
    o: lerp(prev.o, next.o, w),
    on: entering ? 1 : lerp(prev.on, next.on, w),
    half: entering ? next.half : lerp(prev.half, next.half, clamp(w)),
    enter: entering ? clamp(strike(f, PHASES[p], 4, 0)) : 1,
  };
}
/** The echo lines: their dancers' em (px; a little bigger as spokes), how bright they are lit, and how far out from the guest the echo spokes start (px). */
const ECHO = { size: 24, spoke: 27, level: 0.6, inner: 360 } as const;
/** Line `i`'s hue and dance: cyan and pink in turn; each of the spokes 8–15 (between the first eight) the other hue and another dance than the spoke before it. */
const hueOf = (i: number): RGB => ((i % 2 === 1) !== i >= 8 ? NEON.pink : NEON.cyan);
const danceOf = (i: number): readonly [string, string] => DANCES[(i < 8 ? i : i + 3) % DANCES.length];

/** Club 1.1–1.2: the camera flies in on the guest down a tunnel of dancing lanes (drawn flat, in pseudo-perspective): his distance, 30 → 1, faster and faster, arriving on club 1.3. */
export const TUNNEL = { from: START, to: PHASES[1] } as const;
const guestDistance = (f: number): number => (f >= TUNNEL.to ? 1 : 30 ** (1 - clamp((f - TUNNEL.from) / (TUNNEL.to - TUNNEL.from)) ** 1.7));
/** How much everything round the guest is magnified by the zoom (1 from club 1.3). */
const zoomAt = (f: number): number => 1 / guestDistance(f);

/** The clearing round the guest. */
const CLEAR = 250;
const GUEST_AT = { x: 0, y: 0 } as const;

/** An instant of the club: `f` itself (everything that moves), `d` its output frame (every change made on a drum), and where (•ω•) is, while the dancers make room for him. */
type At = { f: number; d: number; me: HeroPose | null };

/** One line's dancers: flowing along it, every one in step; from `inner` px out from the guest (0: from the clearing round him). */
function dancers(o: Out, L: ClubLayout, at: At, s: Slot & { enter: number }, size: number, level: number, dance: readonly [string, string], hue: RGB, speed: number, seed: number, inner = 0): void {
  const { f, d, me } = at;
  const dx = Math.cos(s.th);
  const dy = Math.sin(s.th);
  const nx = -Math.sin(s.th);
  const ny = Math.cos(s.th);
  const w = widthOf(L.advance, dance[0]) * size + 0.45 * size;
  const n = Math.ceil(4000 / w);
  const run = flow(f) * speed;
  const p = pose(d);
  const flipped = d >= FLIP;
  const frozen = d >= LIGHTS_OUT;
  const rot = upright(s.th);
  for (let k = 0; k < n; k++) {
    const sv = ((((k * w + run) % (n * w)) + n * w) % (n * w)) - (n * w) / 2 - (1 - s.enter) * 2000;
    let x = nx * s.o + dx * sv;
    let y = ny * s.o + dy * sv;
    let a = s.on * level;
    // A spoke keeps the half streaming in: the half past the centre goes as the line becomes one.
    if (s.half > 0) a *= lerp(1, clamp(-sv / 80), s.half);
    const rr = Math.hypot(x - GUEST_AT.x, y - GUEST_AT.y);
    a *= clamp((rr - CLEAR) / 70) * clamp((rr - inner) / 120);
    if (me) a *= clamp((Math.hypot(x - me.x, y - me.y) - 150) / 50);
    if (flipped) {
      const out = 1.1 * Math.max(0, f - FLIP) * (0.5 + hash(seed, k));
      x += ((x - GUEST_AT.x) / (rr + 1)) * out;
      y += ((y - GUEST_AT.y) / (rr + 1)) * out;
    }
    if (a < 0.01 || Math.abs(x) > 2600 || Math.abs(y) > 1200) continue;
    // The shock runs out from the guest, reaching each dancer on a frame of its own; the scared ones jitter, a new jolt every third frame.
    const shocked = flipped && (d - FLIP) * 26 > rr;
    const face = shocked ? PANIC[(seed * 7 + k * 3) % PANIC.length] : dance[p];
    const shake = shocked ? 3 * (2 * hash(seed + k, Math.floor(seedFrame(d) / 3)) - 1) : 0;
    const yy = y + (frozen ? 0 : hop(f));
    const lit = frozen && !flipped ? a * 0.18 : flipped ? a * 0.7 : a;
    sign(o, L.advance, face, x + shake, yy + shake, size, hue, lit, rot, false);
    // The tube's glow on the haze round it: every dancer is a lit sign.
    if (lit > 0.05) o.lightU.push({ kind: 'ellipse', x: x + shake, y: yy + shake, w: w * 1.05, h: size * 1.6, rot, color: scaleRGB(hue, 0.075 * lit), soft: size * 0.75 });
    // The other pose in unlit glass behind: the tubes that are off.
    if (!shocked && level > 0.5) sign(o, L.advance, dance[1 - p], x, yy, size, hue, 0, rot, true);
  }
}

/**
 * The tunnel: twelve lanes of dancers on its walls, standing still in the
 * world while the camera flies in, so they stream past faster and faster;
 * each a card facing us, sized by its depth, hopping in unison; the guest at
 * the far end, where the lanes meet.
 */
function tunnel(o: Out, L: ClubLayout, { f, d }: At): void {
  if (f >= TUNNEL.to + 4) return;
  const D = guestDistance(Math.min(f, TUNNEL.to));
  const gone = clamp((f - TUNNEL.to + 1) / 4);
  const p = pose(d);
  const rho = 520;
  for (let lane = 0; lane < 16; lane++) {
    const a = ((lane + 0.5) * P) / 8;
    const dance = DANCES[lane % DANCES.length];
    const hue = lane % 2 ? NEON.pink : NEON.cyan;
    for (let j = 0; j < 46; j++) {
      // Denser towards him, so the lanes stay full right up to the snap.
      const world = 30 - 29.7 * ((j + 0.5 * (lane % 2)) / 46) ** 2.4 - 0.004 * (f - START);
      const z = world - 30 + D;
      if (z < 0.22 || z > D) continue;
      const r = rho / z;
      const size = 40 / z;
      const x = GUEST_AT.x + r * Math.cos(a);
      const y = GUEST_AT.y + r * Math.sin(a) + hop(f) / z;
      const a0 = clamp((z - 0.22) / 0.25) * clamp((D - z) / (0.25 * D)) * clamp((size - 2) / 5) * (1 - gone);
      if (a0 < 0.01 || Math.abs(x) > 1300 || Math.abs(y) > 800) continue;
      sign(o, L.advance, dance[p], x, y, size, hue, 1.15 * a0, 0, size > 20 && a0 > 0.5);
      if (a0 > 0.1) o.lightU.push({ kind: 'ellipse', x, y, w: size * 3.4, h: size * 1.6, color: scaleRGB(hue, 0.07 * a0), soft: size * 0.75 });
    }
  }
  // Club 1.1: the point bursts open — a ring of light from him.
  const t = f - START;
  if (t >= 0 && t < 16) {
    const r = 20 + 1100 * (1 - (1 - t / 16) ** 2.5);
    o.lightU.push({ kind: 'ring', x: GUEST_AT.x, y: GUEST_AT.y, w: 2 * r, h: 2 * r, r: 8, color: scaleRGB(NEON.amber, 1.4 * (1 - t / 16)) });
    o.lightU.push({ kind: 'ellipse', x: GUEST_AT.x, y: GUEST_AT.y, w: 260 * (1 - t / 16), h: 260 * (1 - t / 16), color: scaleRGB([1, 0.85, 0.6], 2 * (1 - t / 16)), soft: 130 * (1 - t / 16) + 1 });
  }
}

// ── The guest, his table, the glass ──────────────────────────────────────
/** The cocktail in the guest's hand (right of his face), before the kick. */
const GLASS_AT = { x: 150, y: -30, h: 70 } as const;

function guest(o: Out, L: ClubLayout, { f, d }: At): void {
  // The guest: calm and still; wet and deadpan once the drink lands (on the and of club 3.1); red from the lights dying (club 3.2), flickering on
  // as they die, leaning back to throw and snapping upright on the throw.
  const face = d < SPLASH ? GUEST.calm : d < LIGHTS_OUT ? GUEST.wet : GUEST.flip;
  const red = d >= LIGHTS_OUT;
  const stutter = red && d < LIGHTS_OUT + 5 ? (d % 2 ? 0.2 : 1) : 1;
  const lean = red && d < FLIP ? 0.14 * smoothstep(LIGHTS_OUT + 8, FLIP - 2, f) : 0;
  const level = (red ? 1.35 : 1.15) * stutter * (f >= FLIP ? lerp(1, 0.55, smoothstep(FLIP + 10, FLIP + 40, f)) : 1);
  const z = zoomAt(f);
  sign(o, L.advance, face, GUEST_AT.x, GUEST_AT.y, (red ? 92 : 80) * z, red ? NEON.red : NEON.amber, level, lean);
  if (d >= SPLASH && d < LIGHTS_OUT) for (const x of [-60, 40]) tube(o, GUEST_AT.x + x, GUEST_AT.y - 32, GUEST_AT.x + x, GUEST_AT.y - 56, 5, NEON.pink, 0.6);
  if (d >= FLIP && f < FLIP + 12) sign(o, L.advance, '︵', GUEST_AT.x + 70, GUEST_AT.y + 200, 200, NEON.red, 1.3 * (1 - Math.max(0, f - FLIP) / 12), 0.25, false);
}

export type HeroPose = { x: number; y: number; size: number; face: string; rot: number; stretch: number; level: number };
/** Where (•ω•) kicks the glass from, beside the guest; where the guest's hand holds him up, over his head; and how far it winds him back to throw. */
const BESIDE = { x: GUEST_AT.x + 300, y: GUEST_AT.y - 20 } as const;
const HELD = { x: GUEST_AT.x - 10, y: GUEST_AT.y + 180 } as const;
const WOUND = { x: HELD.x - 40, y: HELD.y - 15, rot: -0.3 } as const;
/** His em when thrown, and when he reaches the glass on the hit (px). */
const THROWN = 58;
export const AT_GLASS = 1800;
/** The drums that jolt him in flight: the throw's kicks and the roll. */
const DRUMS: readonly number[] = [...new Set([...BUILD_KICKS, ...ROLL])].sort((a, b) => a - b);

/**
 * Where (•ω•) is at instant `f` (from club 1.3), with what changes on a drum — his face, the jolt of a drum — taken at instant `drum` (the club
 * draws him with `drum` = the output frame, so each change is whole on its drum's frame): dancing on the right of the cross and the star,
 * walking in along the right-hand spoke, kicking the glass (club 3.1), grabbed (the guest's hand lands on the and of club 3.2) and held up
 * shaking while the guest winds up, thrown at us (club 3.3 on). His jitter steps between output frames (frameOf), so no shutter straddles a jolt.
 */
export function heroAt(f: number, drum = f): HeroPose | null {
  if (drum < FORMATIONS[0]) return null;
  const face =
    drum < SIDE ? HERO.dance[pose(drum)]
    : drum < SPLASH ? HERO.kick
    : drum < LIGHTS_OUT ? HERO.dance[0]
    : drum < FLIP ? HERO.sweat
    : HERO.panic[Math.min(HERO.panic.length - 1, Math.floor((drum - FLIP) / 24))];
  const level = drum < FLIP ? 1.45 : 1.6;
  // Where he is: continuous in `f`.
  let x: number;
  let y: number;
  let size = 46;
  let rot = 0;
  let u = 0;
  if (f < PHASES[3]) {
    x = 560;
    y = hop(f);
  } else if (f < SIDE) {
    const w = clamp((f - PHASES[3]) / (SIDE - 6 - PHASES[3]));
    x = lerp(560, BESIDE.x, w);
    y = lerp(0, BESIDE.y, w) + hop(f);
  } else if (f < FLIP) {
    // Beside the guest until the lights die; then his hand yanks (•ω•) up over his head, an impact landing on the and of club 3.2 (faster and
    // faster from the lights dying, a small rebound); held there while the guest winds up to throw.
    const grab = slam(f, GRAB, GRAB - LIGHTS_OUT);
    const lean = smoothstep(GRAB, FLIP, f);
    x = lerp(BESIDE.x, HELD.x + (WOUND.x - HELD.x) * lean, grab);
    y = lerp(BESIDE.y, HELD.y + (WOUND.y - HELD.y) * lean, grab);
    size = lerp(46, THROWN, grab);
    rot = WOUND.rot * lean;
  } else {
    // Thrown in one continuous flight straight at us from where he was wound back: steady speed in depth, so he grows slowly, then faster
    // and faster (perspective) until he fills the screen on the hit; an arc up and over that closes on the centre; one turn of tumble whose
    // spin dies away so he lands face-on.
    const v = clamp((f - FLIP) / (HIT - FLIP));
    u = 0.8 * v + 0.2 * (1 - (1 - v) ** 3);
    size = THROWN / (1 - (1 - THROWN / AT_GLASS) * u);
    x = WOUND.x * (1 - u) + 230 * Math.sin(P * u) * (1 - u);
    y = WOUND.y * (1 - u) ** 2 + 150 * Math.sin(P * u) * (1 - u);
    rot = WOUND.rot + (2 * P - WOUND.rot) * (1 - (1 - u) ** 2);
  }
  // How he shakes: held, sideways every two frames; in flight — panic, and speed — jolts every two frames that grow with him, a jittering
  // tilt, and a jump on every drum of the throw.
  const step = Math.floor(frameOf(seedFrame(f)) / 2);
  if (drum >= FLIP) {
    const amp = 3 + 0.035 * size;
    const roll = DRUMS.filter((r) => r <= drum).pop();
    const kick = roll === undefined ? 0 : 1 - clamp((f - roll) / 6);
    const jolt = kick * (0.02 * size + 4);
    const rs = roll === undefined ? 0 : seedFrame(roll);
    x += amp * (2 * hash(9, step) - 1) + jolt * (2 * hash(10, rs) - 1);
    y += amp * (2 * hash(11, step) - 1) + jolt * (2 * hash(12, rs) - 1);
    rot += (0.035 + 0.05 * u) * (2 * hash(13, step) - 1);
    size *= 1 + 0.04 * kick * (1 - u);
  } else if (drum >= GRAB) {
    x += 4 * (2 * hash(7, step) - 1);
  }
  return { x, y, size, face, rot, stretch: 1, level };
}

/** (•ω•) in front of the club: his tubes on an opaque body in the club's black (so he hides whatever he passes), his light pooling round it. */
function hero(o: Out, L: ClubLayout, { f, d }: At): void {
  const h = f < HIT ? heroAt(f, d) : null;
  if (!h) return;
  const line = typeset(h.face, L.advance);
  const c = Math.cos(h.rot);
  const s2 = Math.sin(h.rot);
  for (const ch of line.chars) {
    if (ch.ch.trim() === '') continue;
    const dx = (ch.x - line.width / 2) * h.size * h.stretch;
    o.heroG.push({ ch: ch.ch, x: h.x + dx * c, y: h.y + dx * s2, size: h.size, rot: h.rot, color: scaleRGB(NEON.amber, h.level), tube: tubeOf(ch.ch), stretch: h.stretch });
  }
  o.bodyU.push({ kind: 'rect', x: h.x, y: h.y, w: (line.width * h.stretch + 0.9) * h.size, h: 1.35 * h.size, r: 0.5 * h.size, rot: h.rot, color: VOID, soft: 0.08 * h.size });
  o.lightU.push({ kind: 'ellipse', x: h.x, y: h.y, w: h.size * 4.4, h: h.size * 2.4, color: scaleRGB(NEON.amber, 0.12), soft: h.size * 1.1 });
}

function glassAndKick(o: Out, { f, d }: At): void {
  // The cocktail in his hand; on club 3.1 (•ω•) kicks it out of it, and it flips over onto his face; gone when the lights die.
  const z = zoomAt(f);
  const gx = GUEST_AT.x + GLASS_AT.x * z;
  const gy = GUEST_AT.y + GLASS_AT.y * z;
  const tumble = f < SIDE ? 0 : clamp((f - SIDE) / 12);
  if (d < LIGHTS_OUT) {
    const x = lerp(gx, GUEST_AT.x + 10, tumble);
    const y = lerp(gy, GUEST_AT.y + 70, tumble) + 150 * Math.sin(Math.PI * tumble);
    const r = -7 * tumble;
    const h = GLASS_AT.h * z;
    const pts: [number, number, number, number][] = [[-0.5, 1, 0, 0.45], [0.5, 1, 0, 0.45], [-0.5, 1, 0.5, 1], [0, 0.45, 0, 0.04], [-0.28, 0.02, 0.28, 0.02]];
    for (const [u0, v0, u1, v1] of pts) {
      const c = Math.cos(r);
      const s = Math.sin(r);
      tube(o, x + (u0 * c - v0 * s) * h, y + (u0 * s + v0 * c) * h, x + (u1 * c - v1 * s) * h, y + (u1 * s + v1 * c) * h, 5, NEON.pink, 1);
    }
  }
}

// ── Around: echo lines, the lattice, rings, sparks, stardust ─────────────
function lattice(o: Out, L: ClubLayout, { f, d }: At): void {
  // Turning a twelfth of a turn with each formation (a launch on its kick), its dance swapped with it.
  const p = phaseAt(d);
  const turn = (P / 6) * p + (P / 6) * (p > 0 ? clamp(strike(f, PHASES[p], 3, 1), 0, 1.03) - 1 : 0);
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const run = flow(f) * 0.6;
  const dance = LATTICE[p % 2];
  const frozen = d >= LIGHTS_OUT;
  for (let i = -14; i <= 14; i++) {
    for (let j = -12; j <= 12; j++) {
      const u = ((((j * 150 + run + (i % 2) * 75) % 3750) + 3750) % 3750) - 1875;
      const v = i * 68;
      const x = u * c - v * s;
      const y = u * s + v * c;
      if (Math.abs(x) > 2400 || Math.abs(y) > 1100) continue;
      const rr = Math.hypot(x - GUEST_AT.x, y - GUEST_AT.y);
      const a = 0.17 * clamp((rr - CLEAR - 60) / 120) * (frozen ? 0.4 : 1) * clamp((f - TUNNEL.to + 2) / 4);
      if (a < 0.01) continue;
      sign(o, L.advance, d >= FLIP && (d - FLIP) * 26 > rr ? PANIC[(i * 13 + j * 7 + 400) % PANIC.length] : dance[pose(d)], x, y + (frozen ? 0 : 0.5 * hop(f)), 15, (i + j) % 2 ? NEON.cyan : NEON.pink, a, 0, false);
    }
  }
}

/** A ring of light out from the guest on every kick, there whole from the kick's frame. */
function rings(o: Out, { f, d }: At): void {
  for (const k of KICKS) {
    if (k < TUNNEL.to || k >= LIGHTS_OUT || d < k) continue;
    const t = Math.max(0, f - k);
    if (t > 22) continue;
    const r = CLEAR + 900 * (1 - (1 - t / 22) ** 2.2);
    const hue = (k / 24) % 2 ? NEON.pink : NEON.cyan;
    o.lightU.push({ kind: 'ring', x: GUEST_AT.x, y: GUEST_AT.y, w: 2 * r, h: 2 * r, r: 5, color: scaleRGB(hue, 0.7 * (1 - t / 22)) });
    o.lightU.push({ kind: 'ring', x: GUEST_AT.x, y: GUEST_AT.y, w: 2 * r + 18, h: 2 * r + 18, r: 18, color: scaleRGB(hue, 0.06 * (1 - t / 22)), soft: 9 });
  }
}

/** Sparks on every closed hat, there whole from the hat's frame. */
function sparks(o: Out, { f, d }: At): void {
  for (const h of HATS) {
    if (h < TUNNEL.to || h >= LIGHTS_OUT || d < h) continue;
    const t = Math.max(0, f - h);
    if (t > 7) continue;
    for (let k = 0; k < 4; k++) {
      const x = (hash(seedFrame(h), k, 1) - 0.5) * 1800;
      const y = (hash(seedFrame(h), k, 2) - 0.5) * 1000;
      if (Math.hypot(x - GUEST_AT.x, y - GUEST_AT.y) < CLEAR + 40) continue;
      const g: Glyph = { ch: '✦', x, y, size: 26 * (1 - t / 9), color: scaleRGB(k % 2 ? NEON.cyan : NEON.pink, 1.4 * (1 - t / 7)), tube: 0.01 };
      o.lightG.push(g);
    }
  }
}

function stardust(o: Out, f: number): void {
  for (let k = 0; k < 140; k++) {
    const x = (((hash(k, 31) * 2200 + 0.4 * (f - START) * (hash(k, 32) - 0.3)) % 2200) + 2200) % 2200 - 1100;
    const y = (hash(k, 33) - 0.5) * 1150;
    const b = 0.08 + 0.25 * hash(k, 34) ** 4;
    o.lightU.push({ kind: 'ellipse', x, y, w: 3, h: 3, color: scaleRGB(k % 3 ? NEON.cyan : [1, 1, 1], b) });
  }
}

// ── The frame ─────────────────────────────────────────────────────────────
/** Club bars 1–4 at instant `f` (club 1.1 ≤ f < the hit); without (•ω•) when `withHero` is false (the dancers still make room for him). */
export function linesFrame(f: number, L: ClubLayout, withHero = true): ClubFrame {
  const o: Out = { darkU: [], darkG: [], lightU: [], lightG: [], lightO: [], bodyU: [], heroG: [] };
  const d = frameOf(f);
  const at: At = { f, d, me: d < LIGHTS_OUT ? heroAt(f, d) : null };
  stardust(o, f);
  lattice(o, L, at);
  rings(o, at);
  tunnel(o, L, at);
  for (let i = 0; i < SLOTS; i++) {
    const s = slot(f, d, i);
    if (s.on < 0.01) continue;
    const hue = hueOf(i);
    const other = hue === NEON.cyan ? NEON.pink : NEON.cyan;
    // Echo lines either side, smaller, weaving the other way. As a line becomes a spoke, its echoes turn into two shorter spokes in the gap
    // after it (at a third and two thirds of the way to the next), streaming in with it from further out.
    const h = s.half;
    for (const side of [-1, 1]) {
      const echo = { th: s.th + P * (1 - h) + ((side < 0 ? 1 : 2) * P * h) / 24, o: -(s.o + side * 115) * (1 - h), on: s.on, half: h, enter: s.enter };
      dancers(o, L, at, echo, lerp(ECHO.size, ECHO.spoke, h), ECHO.level, ECHO_DANCES[(i + (side > 0 ? 1 : 0)) % ECHO_DANCES.length], other, 1.9, 100 + i * 2 + (side > 0 ? 1 : 0), ECHO.inner * h);
    }
    dancers(o, L, at, s, 40, 1.2, danceOf(i), hue, 2.6, i);
  }
  sparks(o, at);
  guest(o, L, at);
  glassAndKick(o, at);
  if (withHero) hero(o, L, at);
  return {
    dark: { under: o.darkU, glyphs: { neon: o.darkG }, over: [] },
    light: { under: o.lightU, glyphs: { neon: o.lightG }, over: o.lightO },
    fore: { under: [], glyphs: {}, over: [] },
    front: { dark: { under: o.bodyU, glyphs: {}, over: [] }, light: { under: [], glyphs: { neon: o.heroG }, over: [] } },
  };
}

/** The finishing: a bloom only the white-hot cores cross. */
export const CLUB_BLOOM = { intensity: 1.15, threshold: 0.75, smoothing: 0.3, radius: 0.75 } as const;
