// The comic-book post pass (ComicInkEffect, ./comicInk.ts), pure parts: what a scene puts in its Look, the palette, and the
// shader's per-pixel model in TypeScript (comicInkAt), function for function, so Node can test the maths.
//
// The picture is re-inked as a printed comic (the club's look, story bible §舞池; Lichtenstein, Spider-Verse):
// - posterised to a comic palette: every chromatic pixel takes the process ink nearest its hue; greys take the key (K);
// - shaded with Ben-Day dots by tone: lighter than its ink, the ink prints as dots on paper; darker, shade dots (NIGHT) print
//   over the ink; greys are K dots on paper (on the key plate); the tone can snap to a few flat tints (`levels`);
// - keyed: bold K outlines on the darker side of every colour edge (the picture has no depth or normals by the time it reaches
//   a post pass, so the edges are colour edges: luminance and hue);
// - out of register: the colour plates (cyan, magenta, yellow: the red, green and blue channels) land where their offsets put
//   them; the key plate (keylines and the greys' dots) stays in register on top, as on a press;
// - optional speed lines over it (focus lines from a point, or parallel streaks), drawn in the key ink.
import { type RGB, linear } from '../color.ts';
import { DOT_SHAPE, SCREEN_FIXED, type ScreenAnchor, type Vec2, encodeRGB, hash2, luma, planePoint, screenInk, screenPx, uvOf } from './dotScreen.ts';

// ---------------------------------------------------------------------------------------------------------------------------
// The palette (the club's, club3 §7.1).

export const COMIC_PALETTE = {
  paper: '#FDF3D8',
  key: '#111111',
  night: '#23215E',
  cyan: '#19B8E6',
  pink: '#F2499B',
  lemon: '#FFF0A0',
  amber: '#FFB23E',
  red: '#E8402B',
} as const;

/** A process ink: its colour (linear RGB) and the angle (radians) its dots are screened at. */
export type ComicInk = { color: RGB; angle: number };

const deg = (d: number): number => (d * Math.PI) / 180;

/** The inks pixels snap to, by hue: cyan 15°, magenta 75°, amber 0°, red 30°, lemon 0°, night 45° (club3 §7.3). At most COMIC_MAX_INKS. */
export const COMIC_INKS: readonly ComicInk[] = [
  { color: linear(COMIC_PALETTE.cyan), angle: deg(15) },
  { color: linear(COMIC_PALETTE.pink), angle: deg(75) },
  { color: linear(COMIC_PALETTE.amber), angle: 0 },
  { color: linear(COMIC_PALETTE.red), angle: deg(30) },
  { color: linear(COMIC_PALETTE.lemon), angle: 0 },
  { color: linear(COMIC_PALETTE.night), angle: deg(45) },
];
export const COMIC_MAX_INKS = 8;

// ---------------------------------------------------------------------------------------------------------------------------
// What a scene puts in its Look.

/**
 * Speed lines over the frame, in screen space (they do not ride the screen anchor). `focus`: 集中线, tapered wedges converging on
 * (x, y), thin near it and widest at the frame edge. `parallel`: streaks along `angle` in random dashes, tapered at both ends.
 * Lengths are 1080p px from the frame centre, y up.
 */
export type SpeedLines = {
  kind: 'focus' | 'parallel';
  /** Focus: the vanishing point. Parallel: the subject the streaks keep clear of. */
  x: number;
  y: number;
  /** Parallel: the direction of travel, radians (0 = along +x). Ignored by focus lines. */
  angle?: number;
  /** Focus: lines around the full circle. Parallel: lines per 1080 px across the streaks. */
  count: number;
  /** The widest a line gets, 1080p px. */
  width: number;
  /** Clear radius around (x, y), 1080p px (focus: where the lines start; parallel: the streaks fade out inside it). */
  inner: number;
  /** A new seed is a new set of lines (step it on the drums for the re-jitter); integer ≥ 0. */
  seed: number;
  /** Share of the lines drawn, 0–1; lines join in a fixed scattered order as it rises. */
  amount: number;
  /** Line colour, linear RGB; the key ink when absent. */
  ink?: RGB;
};

/**
 * The comic look of one output frame (Look.comic once the integrator adds it). Only `amount` is required (COMIC_INK_DEFAULTS).
 * Colours are linear RGB (engine/color.ts `linear('#hex')`); lengths 1080p px, offsets y up.
 */
export type ComicInkLook = {
  /** 0 off … 1 the comic; between, the comic over the picture. With `lines`, the pass also runs at amount 0 to draw them. */
  amount: number;
  /** Ben-Day dot pitch, 1080p px on the plane (coarse: Lichtenstein's dots read as dots). */
  pitch?: number;
  /** Tints per ink: 0 continuous dot sizes, 1 flat colour only, n: n steps of dots (comic printing's flat tints). */
  levels?: number;
  /** Keyline width, 1080p px; 0 = no keylines. Detail thinner than this on the darker side of an edge fills with key. */
  outline?: number;
  /** The colour difference (display RGB distance, 0–√3) where a keyline starts and where it is solid. */
  edge?: readonly [number, number];
  /** Colour plates out of register: cyan (the red channel), magenta (green), yellow (blue), 1080p px, y up. The key stays put. */
  offsets?: Readonly<Partial<Record<'c' | 'm' | 'y', Vec2>>>;
  /** The page, the key (K) and the shade ink. */
  paper?: RGB;
  key?: RGB;
  shade?: RGB;
  /** The process inks pixels snap to by hue (up to COMIC_MAX_INKS). */
  inks?: readonly ComicInk[];
  /** Angle of the shade dots and of the key's dots on greys, radians. */
  shadeAngle?: number;
  /** The plane the dots are printed on (dotScreen.ts ScreenAnchor); fixed to the screen when absent. */
  screen?: ScreenAnchor;
  /** Speed lines over everything. */
  lines?: SpeedLines;
};

export type ComicInkSettings = {
  amount: number;
  pitch: number;
  levels: number;
  outline: number;
  edge: readonly [number, number];
  offsets: Readonly<Record<'c' | 'm' | 'y', Vec2>>;
  paper: RGB;
  key: RGB;
  shade: RGB;
  inks: readonly ComicInk[];
  shadeAngle: number;
  screen: ScreenAnchor;
  lines: SpeedLines | null;
};

export const COMIC_INK_DEFAULTS: Omit<ComicInkSettings, 'amount'> = {
  pitch: 16,
  levels: 4,
  outline: 6,
  edge: [0.15, 0.35],
  offsets: { c: [1.5, -1], m: [1.5, -1], y: [1.5, -1] },
  paper: linear(COMIC_PALETTE.paper),
  key: linear(COMIC_PALETTE.key),
  shade: linear(COMIC_PALETTE.night),
  inks: COMIC_INKS,
  shadeAngle: deg(45),
  screen: SCREEN_FIXED,
  lines: null,
};

const unit = (x: number): number => Math.min(1, Math.max(0, x));

/** `look` with the defaults filled in; amounts clamped to 0–1, the line count and seed made whole, at most COMIC_MAX_INKS inks. */
export function resolveComic(look: ComicInkLook): ComicInkSettings {
  const d = COMIC_INK_DEFAULTS;
  const l = look.lines;
  return {
    amount: unit(look.amount),
    pitch: Math.max(1, look.pitch ?? d.pitch),
    levels: Math.max(0, Math.round(look.levels ?? d.levels)),
    outline: Math.max(0, look.outline ?? d.outline),
    edge: look.edge ?? d.edge,
    offsets: { c: look.offsets?.c ?? d.offsets.c, m: look.offsets?.m ?? d.offsets.m, y: look.offsets?.y ?? d.offsets.y },
    paper: look.paper ?? d.paper,
    key: look.key ?? d.key,
    shade: look.shade ?? d.shade,
    inks: (look.inks ?? d.inks).slice(0, COMIC_MAX_INKS),
    shadeAngle: look.shadeAngle ?? d.shadeAngle,
    screen: look.screen ?? d.screen,
    lines: l ? { ...l, count: Math.max(1, Math.round(l.count)), seed: Math.max(0, Math.round(l.seed)), amount: unit(l.amount) } : null,
  };
}

/** Whether the pass draws anything: the comic, or speed lines on their own. */
export const comicActive = (look: ComicInkLook | undefined): boolean => !!look && (look.amount > 0 || (!!look.lines && look.lines.amount > 0 && look.lines.count > 0));

/**
 * A comic between `a` (t = 0) and `b` (t = 1), for mixLook: the numbers blend (a side without one fades its amount from 0 with the
 * other side's settings); the palette and the speed lines come from the nearer side. Neither side: undefined.
 */
export function mixComicInk(a: ComicInkLook | undefined, b: ComicInkLook | undefined, t: number): ComicInkLook | undefined {
  if (!a && !b) return undefined;
  const A = resolveComic(a ?? { ...b!, amount: 0, lines: undefined });
  const B = resolveComic(b ?? { ...a!, amount: 0, lines: undefined });
  const m = (x: number, y: number) => x + (y - x) * t;
  const v = (x: Vec2, y: Vec2): Vec2 => [m(x[0], y[0]), m(x[1], y[1])];
  const near = t < 0.5 ? A : B;
  return {
    amount: m(A.amount, B.amount),
    pitch: m(A.pitch, B.pitch),
    levels: near.levels,
    outline: m(A.outline, B.outline),
    edge: [m(A.edge[0], B.edge[0]), m(A.edge[1], B.edge[1])],
    offsets: { c: v(A.offsets.c, B.offsets.c), m: v(A.offsets.m, B.offsets.m), y: v(A.offsets.y, B.offsets.y) },
    paper: near.paper,
    key: near.key,
    shade: near.shade,
    inks: near.inks,
    shadeAngle: near.shadeAngle,
    screen: { x: m(A.screen.x, B.screen.x), y: m(A.screen.y, B.screen.y), zoom: m(A.screen.zoom, B.screen.zoom), roll: m(A.screen.roll, B.screen.roll) },
    ...(near.lines ? { lines: near.lines } : {}),
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// The per-pixel model (the shader in ./comicInk.ts, function for function). Decisions are made on display (sRGB) colours, as the
// eye sees the palette; the inks are mixed in linear light.

/** The pass input at a texture uv (0–1, y up), linear RGB; the caller clamps uv to the edge like the GPU. */
export type Sampler = (u: number, v: number) => RGB;

const smooth = (a: number, b: number, x: number): number => {
  const t = unit((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const sub = (a: RGB, b: RGB): RGB => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: RGB, b: RGB): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mix3 = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** The input hue-clamped and display-encoded (ciSource). */
export function comicSource(sample: Sampler, s: Vec2, res: Vec2): RGB {
  const [u, v] = uvOf(s, res);
  const c = sample(u, v).map((x) => Math.max(x, 0));
  const peak = Math.max(1, c[0], c[1], c[2]);
  return encodeRGB([c[0] / peak, c[1] / peak, c[2] / peak]);
}

/** Where `x` sits on the line from `a` (0) to `b` (1), unclamped (ciTone). */
export function comicTone(x: RGB, a: RGB, b: RGB): number {
  const ab = sub(b, a);
  return dot3(sub(x, a), ab) / Math.max(dot3(ab, ab), 1e-4);
}

/** A tone clamped to 0–1 and snapped to `levels` steps (0: continuous) (ciLevels). */
export const comicLevels = (a: number, levels: number): number => {
  const c = unit(a);
  return levels > 0.5 ? Math.floor(c * levels + 0.5) / levels : c;
};

/** A colour's chroma direction: (x − min) / (max − min), so a pale and a deep colour of one hue match. */
export function chromaDirection(x: RGB): RGB {
  const mx = Math.max(x[0], x[1], x[2]);
  const mn = Math.min(x[0], x[1], x[2]);
  const d = Math.max(mx - mn, 1e-4);
  return [(x[0] - mn) / d, (x[1] - mn) / d, (x[2] - mn) / d];
}

/** Index of the ink whose hue is nearest a display colour's (the first on a tie). */
export function nearestInk(x: RGB, inks: readonly ComicInk[]): number {
  const hue = chromaDirection(x);
  let best = 0;
  let near = Infinity;
  inks.forEach((ink, k) => {
    const h = sub(hue, chromaDirection(encodeRGB(ink.color)));
    const d = dot3(h, h);
    if (d < near) {
      near = d;
      best = k;
    }
  });
  return best;
}

/**
 * Chroma (display units) from which a colour counts as an ink's rather than a grey, fully at the second value. The chroma is the
 * smaller of its distance from the page's own greys (the segment from paper to key, so the cream paper is neutral) and its
 * max − min (so white, black and true greys are neutral too).
 */
export const COMIC_CHROMA = [0.06, 0.14] as const;

/**
 * Where a display colour sits on the page's greys (`tone`: 0 paper … 1 key) and how much it counts as an ink's colour (`chroma`,
 * 0–1). Greys are judged against the page's own greys (cream paper to key), so the paper is neutral and a pale tint of an ink is
 * not (ciNeutral).
 */
export function comicNeutral(x: RGB, st: ComicInkSettings): { tone: number; chroma: number } {
  const paperShown = encodeRGB(st.paper);
  const keyShown = encodeRGB(st.key);
  const tone = unit(comicTone(x, paperShown, keyShown));
  const off = sub(x, mix3(paperShown, keyShown, tone));
  const spread = Math.max(x[0], x[1], x[2]) - Math.min(x[0], x[1], x[2]);
  return { tone, chroma: smooth(COMIC_CHROMA[0], COMIC_CHROMA[1], Math.min(Math.sqrt(dot3(off, off)), spread)) };
}

/**
 * The colour plates at screen point `s`, linear RGB (ciPlate): a chromatic pixel's ink, as dots on the page when lighter than
 * the ink or under shade dots when darker. Greys leave the page bare here: their dots print on the key plate (comicKeyDotsAt).
 */
export function comicPlateAt(sample: Sampler, s: Vec2, res: Vec2, st: ComicInkSettings, px: number): RGB {
  const x = comicSource(sample, s, res);
  const { chroma } = comicNeutral(x, st);
  if (chroma <= 0 || st.inks.length === 0) return st.paper;
  const q = planePoint(s, st.screen);
  const paperShown = encodeRGB(st.paper);
  const shadeShown = encodeRGB(st.shade);
  const ink = st.inks[nearestInk(x, st.inks)];
  const shown = encodeRGB(ink.color);
  const a = comicTone(x, paperShown, shown);
  const chrom =
    a < 1
      ? mix3(st.paper, ink.color, screenInk(q, comicLevels(a, st.levels), st.pitch, ink.angle, DOT_SHAPE.round, px))
      : mix3(ink.color, st.shade, screenInk(q, comicLevels(comicTone(x, shown, shadeShown), st.levels), st.pitch, st.shadeAngle, DOT_SHAPE.round, px));
  return mix3(st.paper, chrom, chroma);
}

/** The key plate's dots at screen point `s` (in register): greys as key dots on the page, by their tone (ciKeyDots). */
export function comicKeyDotsAt(sample: Sampler, s: Vec2, res: Vec2, st: ComicInkSettings, px: number): number {
  const { tone, chroma } = comicNeutral(comicSource(sample, s, res), st);
  return (1 - chroma) * screenInk(planePoint(s, st.screen), comicLevels(tone, st.levels), st.pitch, st.shadeAngle, DOT_SHAPE.round, px);
}

/** Key ink (0–1) at screen point `s`: on the darker side of a colour edge within `outline` px (ciKey). */
export function comicKeyAt(sample: Sampler, s: Vec2, res: Vec2, st: ComicInkSettings): number {
  if (st.outline <= 0) return 0;
  const c0 = comicSource(sample, s, res);
  const l0 = luma(c0);
  let key = 0;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const d: Vec2 = [Math.cos(a) * st.outline, Math.sin(a) * st.outline];
    for (let j = 1; j <= 2; j++) {
      const c = comicSource(sample, [s[0] + d[0] * 0.5 * j, s[1] + d[1] * 0.5 * j], res);
      const diff = sub(c, c0);
      key = Math.max(key, smooth(st.edge[0], st.edge[1], Math.sqrt(dot3(diff, diff))) * smooth(-0.06, 0, luma(c) - l0));
    }
  }
  return key;
}

/** Share of a device pixel covered by a line of half-width `hw` whose centre is `d` away (both device px): a box filter (ciCover). */
export const lineCover = (hw: number, d: number): number => unit(Math.min(hw, d + 0.5) - Math.max(-hw, d - 0.5));

/** How far focus lines from (x, y) must reach: to the farthest frame corner, 1080p px. */
export const lineReach = (l: SpeedLines): number => Math.max(...[[-960, -540], [960, -540], [-960, 540], [960, 540]].map(([cx, cy]) => Math.hypot(cx - l.x, cy - l.y)));

/** Speed-line ink (0–1) at screen point `s` (1080p px), `px` device px per 1080p px (ciLines). */
export function speedLineInk(l: SpeedLines, s: Vec2, px: number, reach = lineReach(l)): number {
  if (l.amount <= 0 || l.count <= 0) return 0;
  const dx = s[0] - l.x;
  const dy = s[1] - l.y;
  const n = l.count;
  let ink = 0;
  if (l.kind === 'focus') {
    const r = Math.hypot(dx, dy);
    let th = Math.atan2(dy, dx);
    if (th < 0) th += 2 * Math.PI;
    const i0 = Math.floor((th / (2 * Math.PI)) * n);
    for (let j = -1; j <= 1; j++) {
      const i = i0 + j;
      const iw = ((i % n) + n) % n;
      if (hash2(iw, 3, l.seed) >= l.amount) continue;
      const ti = (2 * Math.PI * (i + 0.5 + 0.7 * (hash2(iw, 0, l.seed) - 0.5))) / n;
      const dt = th - ti;
      if (Math.cos(dt) <= 0) continue;
      const start = l.inner * (1 + 0.5 * hash2(iw, 1, l.seed));
      const hw = 0.5 * l.width * (0.35 + 0.65 * hash2(iw, 2, l.seed)) * unit((r - start) / Math.max(reach - start, 1));
      ink = Math.max(ink, lineCover(hw * px, r * Math.abs(Math.sin(dt)) * px));
    }
  } else {
    const a = l.angle ?? 0;
    const u = dx * Math.cos(a) + dy * Math.sin(a);
    const v = -dx * Math.sin(a) + dy * Math.cos(a);
    const spacing = 1080 / n;
    const i0 = Math.floor(v / spacing);
    const clear = smooth(l.inner, l.inner * 1.5 + 1, Math.hypot(dx, dy));
    for (let j = -1; j <= 1; j++) {
      const i = i0 + j;
      if (hash2(i, 4, l.seed) >= l.amount) continue;
      const vi = (i + 0.5 + 0.6 * (hash2(i, 0, l.seed) - 0.5)) * spacing;
      const centre = (hash2(i, 1, l.seed) - 0.5) * 1600;
      const len = 260 + 520 * hash2(i, 2, l.seed);
      const along = unit((Math.min(u - (centre - len), centre + len - u) / len) * 2);
      const hw = 0.5 * l.width * (0.35 + 0.65 * hash2(i, 3, l.seed)) * along * clear;
      ink = Math.max(ink, lineCover(hw * px, Math.abs(v - vi) * px));
    }
  }
  return ink;
}

/** The effect's output at fragment `frag` (device px, gl_FragCoord) of a `res` frame, linear RGB: the shader's mainImage. */
export function comicInkAt(sample: Sampler, frag: Vec2, res: Vec2, st: ComicInkSettings): RGB {
  const input = sample(frag[0] / res[0], frag[1] / res[1]);
  const s = screenPx(frag, res);
  const scale = res[1] / 1080;
  let col: RGB = input;
  if (st.amount > 0) {
    const px = scale * Math.max(st.screen.zoom, 1e-3);
    const { c, m, y } = st.offsets;
    const at = (o: Vec2): Vec2 => [s[0] - o[0], s[1] - o[1]];
    let plate = comicPlateAt(sample, at(c), res, st, px);
    const inRegister = c[0] === m[0] && c[1] === m[1] && c[0] === y[0] && c[1] === y[1];
    if (!inRegister) plate = [plate[0], comicPlateAt(sample, at(m), res, st, px)[1], comicPlateAt(sample, at(y), res, st, px)[2]];
    const key = Math.max(comicKeyDotsAt(sample, s, res, st, px), comicKeyAt(sample, s, res, st));
    const comic = mix3(plate, st.key, key);
    col = mix3(col, comic, st.amount);
  }
  if (st.lines) col = mix3(col, st.lines.ink ?? st.key, speedLineInk(st.lines, s, scale));
  return col;
}

/** The palette as the shader takes it: display colours for the decisions, linear for the mixing, each ink's chroma direction. */
export function comicUniformPalette(st: ComicInkSettings): { shown: RGB[]; linear: RGB[]; hue: RGB[]; angle: number[] } {
  const shown = st.inks.map((i) => encodeRGB(i.color));
  return { shown, linear: st.inks.map((i) => i.color), hue: shown.map(chromaDirection), angle: st.inks.map((i) => i.angle) };
}
