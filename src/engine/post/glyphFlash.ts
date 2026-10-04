import { Effect, EffectAttribute } from 'postprocessing';
import * as THREE from 'three';
import { cssStack } from '../fonts.ts';

/**
 * The characters a cell can become, sparse to dense. The terminal's ASCII ramp (src/actors/asciiFace.ts RAMP) with kaomoji parts
 * mixed in — ·, ~, ^ and ω — so the flash reads as this film's characters, not a generic ASCII filter. The atlas measures each
 * glyph's ink and orders them by it (so the order here is only a starting point); the blank comes first, so black stays black.
 */
export const GLYPH_RAMP = ' .·:~^-=+*ω#%@';

/** Cell width over height: the advance of a mono font (JetBrains Mono is 600/1000 em), so the characters sit like a terminal's. */
export const GLYPH_ASPECT = 0.6;

/** The size of a character cell in device px: `cell` px tall at 1080p, scaled to a frame `height` px tall, rounded to whole px. */
export function glyphCellPx(cell: number, height: number): { w: number; h: number } {
  const h = Math.max(2, Math.round((cell * height) / 1080));
  return { w: Math.max(1, Math.round(h * GLYPH_ASPECT)), h };
}

/** A row of `chars` (one per slot, `w` × `h` device px each, ink in the red channel), ordered by ink; `count` slots. */
export type GlyphAtlasMaker = (chars: string, w: number, h: number) => { texture: THREE.Texture; count: number };

const MONO = 'KX JetBrains Mono';

/**
 * Draws the ramp with the mono role, white on black, at exactly the device cell size (sampled 1:1, so the browser's own text
 * rasterising is what shows). Throws if JetBrains Mono is not loaded — a silent fallback font would change the film between render
 * chunks (the Director loads the fonts when its energy carries the flash).
 */
export const canvasGlyphAtlas: GlyphAtlasMaker = (chars, w, h) => {
  const loaded = [...document.fonts].some((f) => f.family.replace(/["']/g, '') === MONO && f.status === 'loaded');
  if (!loaded) throw new Error(`the character flash needs ${MONO}: call loadFonts() before the first frame that flashes`);
  const list = [...chars];
  const canvas = document.createElement('canvas');
  canvas.width = list.length * w;
  canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  const draw = (order: readonly string[]) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#fff';
    g.font = `700 ${h}px ${cssStack('mono')}`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    // The em is the cell height; @ runs from about −0.2 em to 0.75 em, so a baseline at 0.77 h centres the ramp's ink in the cell.
    order.forEach((ch, i) => g.fillText(ch, i * w + w / 2, Math.round(h * 0.77)));
  };
  draw(list);
  const px = g.getImageData(0, 0, canvas.width, canvas.height).data;
  const ink = list.map((_, i) => {
    let s = 0;
    for (let y = 0; y < h; y++) for (let x = i * w; x < (i + 1) * w; x++) s += px[(y * canvas.width + x) * 4];
    return s;
  });
  const order = list.map((ch, i) => ({ ch, i, ink: ink[i] })).sort((a, b) => a.ink - b.ink || a.i - b.i).map((e) => e.ch);
  draw(order);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return { texture, count: list.length };
};

/**
 * The 字符闪 character flash (spec §3; src/score/cuts.ts): the finished picture redrawn as coloured characters on black. The frame is
 * cut into a terminal grid centred on the frame (`cell` px tall at 1080p, scaled with the render); per cell it averages a 3 × 3 grid
 * of taps of the display-space picture (the brightest tap weighs 0.7 against the average, so a thin neon stroke still reads as ink), picks a character
 * of GLYPH_RAMP by that brightness, and draws it in the cell's colour snapped to the film's palette (the terminal's green, amber and
 * pink, the club's cyan, pink and red, the Riso yellow, the neo-brutal violet; near-greys take the terminal's text colour), bright
 * enough to read on black. `amount` below 1 turns only that share of the cells (a fixed scattered set: T7's crumble).
 *
 * It samples other pixels, so it is a convolution effect: it runs in its own pass after the main one (after tone mapping, the flash,
 * vignette and grain, so it sees display colours) and before the CRT, which then bends the characters like any picture. The pipeline
 * skips that pass entirely at amount 0.
 */
export class GlyphFlashEffect extends Effect {
  private readonly makeAtlas: GlyphAtlasMaker;
  private readonly atlases = new Map<string, { texture: THREE.Texture; count: number }>();
  private height = 1080;

  constructor(makeAtlas: GlyphAtlasMaker = canvasGlyphAtlas) {
    super(
      'GlyphFlashEffect',
      /* glsl */ `
      uniform float amount;
      uniform vec2 cellPx;
      uniform sampler2D atlas;
      uniform float count;

      const vec3 GF_LUMA = vec3(0.2126, 0.7152, 0.0722);
      const float GF_FLOOR = 0.07;
      const float GF_FULL = 0.5;
      // The film's palette in display (sRGB) values: green, amber, pink (terminal); cyan, red (club); yellow (Riso); violet (neo-brutal).
      const vec3 GF_PALETTE[7] = vec3[7](
        vec3(0.298, 0.941, 0.549), vec3(1.0, 0.698, 0.243), vec3(1.0, 0.373, 0.635), vec3(0.247, 0.878, 1.0),
        vec3(1.0, 0.290, 0.110), vec3(1.0, 0.910, 0.0), vec3(0.655, 0.545, 0.980));
      // Near-greys: the terminal's text colour.
      const vec3 GF_NEUTRAL = vec3(0.847, 0.961, 0.882);

      uint gfPcg(uint v) {
        uint state = v * 747796405u + 2891336453u;
        uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
        return (word >> 22u) ^ word;
      }

      vec3 gfShown(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 centre = floor(resolution * 0.5);
        vec2 cell = floor((gl_FragCoord.xy - centre) / cellPx);
        ivec2 ic = ivec2(cell) + 65536;
        float pick = float(gfPcg(uint(ic.x) ^ gfPcg(uint(ic.y) ^ 0x9e3779b9u)) >> 8) / 16777216.0;
        if (pick >= amount) {
          outputColor = inputColor;
          return;
        }
        vec2 origin = centre + cell * cellPx;
        vec3 sum = vec3(0.0);
        float peak = 0.0;
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 3; i++) {
            vec2 p = origin + cellPx * (vec2(float(i), float(j)) + 0.5) / 3.0;
            vec3 c = gfShown(texture2D(inputBuffer, p / resolution).rgb);
            sum += c;
            peak = max(peak, dot(c, GF_LUMA));
          }
        }
        vec3 avg = sum / 9.0;
        // Brightness: the brightest tap counts more than the average (a thin neon stroke is ink, not a dim cell); dark haze below
        // GF_FLOOR stays blank, and the ramp is spread over what a picture really spans.
        float lum = smoothstep(GF_FLOOR, GF_FULL, mix(dot(avg, GF_LUMA), peak, 0.7));
        float slot = min(floor(lum * count), count - 1.0);
        vec2 local = (gl_FragCoord.xy - origin) / cellPx;
        float ink = texture2D(atlas, vec2((slot + local.x) / count, local.y)).r;
        // Colour: the cell's hue (its chroma direction, so a pale cyan is still cyan) snapped to the nearest palette colour; greys
        // (low saturation) take the terminal's text colour.
        float hi = max(avg.r, max(avg.g, avg.b));
        float lo = min(avg.r, min(avg.g, avg.b));
        vec3 hue = (avg - lo) / max(hi - lo, 1e-4);
        vec3 best = GF_PALETTE[0];
        float near = 1e9;
        for (int k = 0; k < 7; k++) {
          vec3 p = GF_PALETTE[k];
          float phi = max(p.r, max(p.g, p.b));
          float plo = min(p.r, min(p.g, p.b));
          vec3 q = (p - plo) / (phi - plo);
          float d = dot(hue - q, hue - q);
          if (d < near) {
            near = d;
            best = GF_PALETTE[k];
          }
        }
        vec3 tint = mix(GF_NEUTRAL, best, smoothstep(0.1, 0.3, (hi - lo) / max(hi, 1e-4)));
        vec3 shown = tint * mix(0.6, 1.0, lum) * ink;
        outputColor = vec4(pow(shown, vec3(2.2)), inputColor.a);
      }`,
      {
        attributes: EffectAttribute.CONVOLUTION,
        uniforms: new Map<string, THREE.Uniform>([
          ['amount', new THREE.Uniform(0)],
          ['cellPx', new THREE.Uniform(new THREE.Vector2(9, 15))],
          ['atlas', new THREE.Uniform(null)],
          ['count', new THREE.Uniform(1)],
        ]),
      },
    );
    this.makeAtlas = makeAtlas;
  }

  override setSize(_width: number, height: number): void {
    this.height = height;
  }

  /**
   * Sets up the flash of one output frame; returns whether it draws anything (the pipeline skips the pass when not). The atlas for
   * the frame's cell size is built on first use — after the scenes' init, so the fonts are in.
   */
  configure(g: { amount: number; cell: number } | undefined): boolean {
    const amount = Math.min(1, Math.max(0, g?.amount ?? 0));
    this.uniforms.get('amount')!.value = amount;
    if (amount <= 0 || !g) return false;
    const { w, h } = glyphCellPx(g.cell, this.height);
    const key = `${w}x${h}`;
    let atlas = this.atlases.get(key);
    if (!atlas) {
      atlas = this.makeAtlas(GLYPH_RAMP, w, h);
      this.atlases.set(key, atlas);
    }
    (this.uniforms.get('cellPx')!.value as THREE.Vector2).set(w, h);
    this.uniforms.get('atlas')!.value = atlas.texture;
    this.uniforms.get('count')!.value = atlas.count;
    return true;
  }

  override dispose(): void {
    for (const a of this.atlases.values()) a.texture.dispose();
    this.atlases.clear();
    super.dispose();
  }
}
