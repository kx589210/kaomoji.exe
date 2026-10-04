// The ending's GPU kit (the ending builder's; build sheet notes/b58/ending-sheet.md §2): the atlases every part draws with, built
// once per tab and shared by the five parts (reference-counted, so each part's dispose releases its share), the measured ω places
// inside whole faces (the colour law: an infected ω is the hero's amber), and the flat layers a part paints with.
// Atlases: `mono` (JetBrains Mono 500, every terminal and blue-screen character), `bold` (JetBrains Mono 800: the staged lines),
// `rounded` (M PLUS Rounded 1c ExtraBold 160 px: his faces), `display` (Inter Tight 300: the body copy), `faces` (whole faces in the
// mono stack: the headliners, the guest, the cat — one entry each, so combining marks and kerning are the browser's) and, for the
// company only, `wall` (the curtain call's ≈ 900 whole faces, small).
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Blend } from '../engine/shapeField.ts';
import type { Advance } from '../engine/typeset.ts';
import type { CharPlan, OmegaPlan } from '../shots/outroKit.ts';
import { OUTRO_ATLAS } from '../shots/outroStrings.ts';

export type AtlasKey = 'mono' | 'bold' | 'rounded' | 'display' | 'faces' | 'wall';
const FONTS: Readonly<Record<AtlasKey, (px: number) => string>> = {
  mono: (px) => `500 ${px}px ${cssStack('mono')}`,
  bold: (px) => `700 ${px}px ${cssStack('mono')}`,
  rounded: (px) => `800 ${px}px ${cssStack('rounded')}`,
  display: (px) => `300 ${px}px ${cssStack('display')}`,
  faces: (px) => `500 ${px}px ${cssStack('mono')}`,
  wall: (px) => `500 ${px}px ${cssStack('mono')}`,
};
const OPTS: Readonly<Record<AtlasKey, { fontPx: number; radius: number; size: number }>> = {
  mono: { fontPx: 96, radius: 12, size: 4096 },
  bold: { fontPx: 96, radius: 12, size: 2048 },
  rounded: { fontPx: 160, radius: 20, size: 2048 },
  display: { fontPx: 96, radius: 10, size: 2048 },
  faces: { fontPx: 72, radius: 10, size: 2048 },
  wall: { fontPx: 30, radius: 5, size: 4096 },
};

/**
 * JetBrains Mono's code ligatures fused characters inside the whole faces (ending fixer a, round 1, review F6: the cat's bow (=^-ω-^=)
 * set `^=` as one joined glyph; ==, ->, <=, --, >> would do the same on the wall). A non-zero letter-spacing turns Chrome's optional
 * ligatures and contextual alternates off on a canvas (the harness's NOLIG): it is set before every measure and fill while the
 * whole-face atlases rasterise, and on the canvases their characters are measured on. 0.01 px a character moves nothing visible.
 */
const NOLIG = '0.01px';
const WHOLE_FACES: ReadonlySet<AtlasKey> = new Set<AtlasKey>(['faces', 'wall']);
type Spaced = CanvasRenderingContext2D & { letterSpacing: string };
function withoutLigatures<T>(build: () => T): T {
  const P = CanvasRenderingContext2D.prototype as Spaced;
  if (!('letterSpacing' in P)) return build();
  const fill = P.fillText;
  const measure = P.measureText;
  P.fillText = function (this: Spaced, text: string, x: number, y: number, maxWidth?: number) {
    this.letterSpacing = NOLIG;
    if (maxWidth === undefined) fill.call(this, text, x, y);
    else fill.call(this, text, x, y, maxWidth);
  };
  P.measureText = function (this: Spaced, text: string) {
    this.letterSpacing = NOLIG;
    return measure.call(this, text);
  };
  try {
    return build();
  } finally {
    P.fillText = fill;
    P.measureText = measure;
  }
}
/** A 2D context for measuring whole faces in atlas `key`'s font at `px`, ligatures off. */
function measurer(key: 'faces' | 'wall', px: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  ctx.font = FONTS[key](px);
  if ('letterSpacing' in ctx) (ctx as Spaced).letterSpacing = NOLIG;
  return ctx;
}

type Shared = { atlas: GlyphAtlas; users: number };
const SHARED = new Map<AtlasKey, Shared>();

/** The atlas `key`, built on first use (after the fonts), shared; call releaseAtlas once per acquire. */
export async function acquireAtlas(key: AtlasKey): Promise<GlyphAtlas> {
  await loadFonts();
  let s = SHARED.get(key);
  if (!s) {
    const build = () => buildGlyphAtlas(OUTRO_ATLAS[key], FONTS[key], OPTS[key]);
    s = { atlas: WHOLE_FACES.has(key) ? withoutLigatures(build) : build(), users: 0 };
    SHARED.set(key, s);
  }
  s.users++;
  return s.atlas;
}
export function releaseAtlas(key: AtlasKey): void {
  const s = SHARED.get(key);
  if (!s) return;
  s.users--;
  if (s.users <= 0) {
    s.atlas.texture.dispose();
    SHARED.delete(key);
  }
}

export const advanceOf = (atlas: GlyphAtlas): Advance => (ch) => atlas.entries.get(ch)?.advance ?? 0.28;

/** The ω centres inside whole faces as the browser sets them (prefix widths in the faces' font), measured once per face (ligatures off, as the atlas sets them). */
export function measureOmegas(key: 'faces' | 'wall'): OmegaPlan {
  const px = 100;
  const ctx = measurer(key, px);
  const cache = new Map<string, number[]>();
  return (face) => {
    let hit = cache.get(face);
    if (!hit) {
      const total = ctx.measureText(face).width;
      hit = [];
      const chars = [...face];
      let prefix = '';
      for (const ch of chars) {
        if (ch === 'ω') {
          const a = ctx.measureText(prefix).width;
          const b = ctx.measureText(prefix + ch).width;
          hit.push(((a + b) / 2 - total / 2) / px);
        }
        prefix += ch;
      }
      cache.set(face, hit);
    }
    return hit;
  };
}

/** Every character's centre inside whole faces as the browser sets them (prefix widths in the faces' font, ligatures off), measured once per face. */
export function measureChars(key: 'faces' | 'wall'): CharPlan {
  const px = 100;
  const ctx = measurer(key, px);
  const cache = new Map<string, number[]>();
  return (face) => {
    let hit = cache.get(face);
    if (!hit) {
      const total = ctx.measureText(face).width;
      let prefix = '';
      hit = [...face].map((ch) => {
        const a = ctx.measureText(prefix).width;
        prefix += ch;
        const b = ctx.measureText(prefix).width;
        return ((a + b) / 2 - total / 2) / px;
      });
      cache.set(face, hit);
    }
    return hit;
  };
}

/** A part's set of flat layers over the shared atlases: one per blend it paints with. */
export class OutroLayers {
  readonly keys: readonly AtlasKey[];
  readonly atlases: Partial<Record<AtlasKey, GlyphAtlas>> = {};
  readonly layers: Partial<Record<Blend, FlatLayer>> = {};
  private readonly blends: readonly Blend[];
  private readonly capacity: { shapes: number; glyphs: number };

  constructor(keys: readonly AtlasKey[], blends: readonly Blend[], capacity = { shapes: 2048, glyphs: 4096 }) {
    this.keys = keys;
    this.blends = blends;
    this.capacity = capacity;
  }

  async init(size: { width: number; height: number }, circlePerEm?: number): Promise<void> {
    for (const k of this.keys) this.atlases[k] = await acquireAtlas(k);
    const atlases = Object.fromEntries(this.keys.map((k) => [k, this.atlases[k]!])) as Record<string, GlyphAtlas>;
    for (const b of this.blends) this.layers[b] = new FlatLayer({ atlases, blend: b, aspect: size.width / size.height, shapes: this.capacity.shapes, glyphs: this.capacity.glyphs, circlePerEm });
  }

  advance(k: AtlasKey): Advance {
    return advanceOf(this.atlases[k]!);
  }

  layer(b: Blend): FlatLayer {
    const l = this.layers[b];
    if (!l) throw new Error(`outro: no '${b}' layer`);
    return l;
  }

  dispose(): void {
    for (const l of Object.values(this.layers)) l?.dispose();
    for (const k of this.keys) if (this.atlases[k]) releaseAtlas(k);
  }
}

