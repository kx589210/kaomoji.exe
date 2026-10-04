// The flat-layer test frame (KX-TestFlat) and the colours check-flat expects
// to read back from it. Pure: the composition draws this, the script compares.
import { type RGB, linear, multiplyRGB, srgb8, transmit } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Shape } from '../engine/shapeField.ts';

const PAPER = linear('#F2EDE3');
const PINK = transmit(linear('#FF48B0'), 0.85);
const BLUE = transmit(linear('#0078BF'), 0.85);
const SHEET = multiplyRGB(PAPER, PINK);
const pinkRect = (x: number, y: number): Shape => ({ kind: 'rect', x, y, w: 400, h: 300, color: PINK });
const blueDisc = (x: number, y: number): Shape => ({ kind: 'ellipse', x, y, w: 340, h: 340, color: BLUE });
const mean = (a: RGB, b: RGB): [number, number, number] => [0, 1, 2].map((i) => (srgb8(a)[i] + srgb8(b)[i]) / 2) as [number, number, number];

export type Patch = { name: string; x: number; y: number; want: readonly number[]; tol: number };
/** An outlined disc glyph to scan outward from its centre: fill, then an ink band `outline` × `size` wide, then paper. */
export type OutlineProbe = { x: number; y: number; size: number };

const MINT = linear('#BFEBDD');
const OUTLINE_INK = linear('#16161A');
const FILL = linear('#FFD6E0');

/** A zigzag of four joined capsules from x 560 to 880, its joints hidden by stroking every capsule in ink before any in colour. */
function zigzag(color: RGB): Shape[] {
  const pts = [0, 1, 2, 3, 4].map((i): [number, number] => [560 + 80 * i, i % 2 ? -340 : -420]);
  const caps = pts.slice(1).map((b, i) => {
    const a = pts[i];
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, w: Math.hypot(b[0] - a[0], b[1] - a[1]), rot: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  });
  return [
    ...caps.map((c): Shape => ({ kind: 'segment', ...c, h: 14 + 14, color: OUTLINE_INK })),
    ...caps.map((c): Shape => ({ kind: 'segment', ...c, h: 14, color })),
  ];
}

/** Frame 1 of KX-TestFlat: Pop outlines at two sizes (the band must keep its share of the em) and an outlined shape. */
export const TEST_OUTLINES: { paper: RGB; ink: RGB; fill: RGB; outline: number; content: FlatContent; probes: readonly OutlineProbe[] } = {
  paper: MINT,
  ink: OUTLINE_INK,
  fill: FILL,
  outline: 0.07,
  content: {
    under: [
      { kind: 'rect', x: -500, y: -330, w: 300, h: 160, color: linear('#FFD23F'), outline: 7, outlineColor: OUTLINE_INK },
      // Joined capsules (a zigzag), stroked ink first: all in ink, then all in colour on top.
      ...zigzag(linear('#5B8DEF')),
    ],
    glyphs: {
      rounded: [
        { ch: '●', x: -560, y: 200, size: 120, color: FILL, outline: 0.07, outlineColor: OUTLINE_INK },
        { ch: '●', x: 260, y: 0, size: 720, color: FILL, outline: 0.07, outlineColor: OUTLINE_INK },
      ],
    },
    over: [],
  },
  probes: [
    { x: -560, y: 200, size: 120 },
    { x: 260, y: 0, size: 720 },
  ],
};

export const TEST_FLAT: { paper: RGB; glyphs: readonly string[]; ink: FlatContent; solid: FlatContent; patches: readonly Patch[] } = {
  paper: PAPER,
  glyphs: ['●', 'ω'],
  // Multiply layer: pink drawn before blue on the left, after it in the middle; a 50% blue halftone on the right; a stretched ω; a blue disc for the sheet to hide.
  ink: {
    under: [
      pinkRect(-720, 200), blueDisc(-600, 150), blueDisc(-100, 150), pinkRect(-220, 200),
      { kind: 'rect', x: 500, y: 200, w: 400, h: 300, color: BLUE, tint: 0.5, screen: 8, angle: 0.26 },
      { kind: 'ellipse', x: 150, y: -250, w: 200, h: 200, color: BLUE },
    ],
    glyphs: { rounded: [{ ch: 'ω', x: 520, y: -330, size: 160, color: BLUE, stretch: 5 }] },
    over: [],
  },
  // Normal layer over it: a Swiss-red disc, and a pink paper sheet (x ±253, y −583…−77) with a round hole that hides the blue disc behind it.
  solid: {
    under: [{ kind: 'ellipse', x: -500, y: -300, w: 300, h: 300, color: linear('#E8402B') }],
    glyphs: { rounded: [{ ch: '●', x: 0, y: -330, size: 240, color: SHEET, invert: true, sheet: 1.3 }] },
    over: [],
  },
  patches: [
    { name: 'pink', x: -850, y: 300, want: srgb8(multiplyRGB(PAPER, PINK)), tol: 3 },
    { name: 'blue', x: -600, y: 20, want: srgb8(multiplyRGB(PAPER, BLUE)), tol: 3 },
    { name: 'pink then blue', x: -640, y: 170, want: srgb8(multiplyRGB(multiplyRGB(PAPER, PINK), BLUE)), tol: 3 },
    { name: 'blue then pink', x: -140, y: 170, want: srgb8(multiplyRGB(multiplyRGB(PAPER, PINK), BLUE)), tol: 3 },
    { name: '50% halftone', x: 500, y: 200, want: mean(PAPER, multiplyRGB(PAPER, BLUE)), tol: 6 },
    { name: 'red disc', x: -500, y: -300, want: [0xe8, 0x40, 0x2b], tol: 2 },
    { name: 'hole', x: 0, y: -330, want: srgb8(PAPER), tol: 3 },
    { name: 'sheet over the blue disc', x: 150, y: -250, want: srgb8(SHEET), tol: 3 },
  ],
};
