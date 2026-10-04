// Renderer A's shared GPU kit (the cosmos, bars 1–2): the atlases (faces in M PLUS Rounded 1c ExtraBold, his giant face, the display type
// in Inter Tight Black, the system voice in JetBrains Mono, the party monitor's box at weight 600), the sprite sheet (ink splats, torn
// strips of type), the lock's label `10⁻⁷ m` as a texture to cut into fragments, the screen layers (normal, light and multiply), and the
// helpers that fit a glyph into a card and point a three camera along a pose. Built once in init(), after the fonts.
import * as THREE from 'three';
import { BANG_PARTS, CROWDS, EARTH_HOSTS, FLINCH_FACES, HERO_FACES, MOON_FACES, REAM_FACES } from '../content/castCosmos.ts';
import { INFINITY_SIGN, LEVEL_TYPE, MINUS, MOON_ZZZ, SIGNATURE, THREAT_WORD, edition, plain } from '../content/cosmos.ts';
import type { Pose } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { type AtlasEntry, type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { hash } from '../engine/random.ts';
import type { Advance } from '../engine/typeset.ts';
import { LOCK_LABEL } from '../shots/cosmosBang.ts';
import { advanceOf } from './swiss.ts';

const unique = (xs: readonly string[]): string[] => [...new Set(xs)].filter((s) => s.trim() !== '');

/** Every face renderer A draws on a card. */
export const A_FACES: readonly string[] = unique([
  HERO_FACES.face,
  HERO_FACES.wave,
  HERO_FACES.top,
  ...BANG_PARTS,
  ...REAM_FACES,
  ...EARTH_HOSTS.flatMap((e) => [e.host, e.infected ?? e.host]),
  ...CROWDS.earth.flatMap((c) => [c.host, c.infected]),
  ...FLINCH_FACES.flatMap((f) => [f.host, f.flinch]),
  MOON_FACES.host,
  MOON_FACES.infected ?? MOON_FACES.host,
  MOON_ZZZ,
]);
/** The display type A sets: digits, the counts' marks, the labels' m and minus, THREAT(S), the ring's dot, ∞. */
export const A_DISPLAY: readonly string[] = unique([...'0123456789,.k×m·', MINUS, ...THREAT_WORD.many, ...THREAT_WORD.one, INFINITY_SIGN, ...[...'THREATS']]);
/** The mono type A sets into the picture: the captions and legends of the bang and Earth, the torn strips' type. */
export const A_MONO: readonly string[] = unique([...[LEVEL_TYPE.bang, LEVEL_TYPE.earth].flatMap((l) => [...plain(`${l.caption ?? ''}${l.legend}`)]), ...'0123456789']);

export type AKit = {
  face: GlyphAtlas;
  hero: GlyphAtlas;
  display: GlyphAtlas;
  mono: GlyphAtlas;
  readout: GlyphAtlas;
  advDisplay: Advance;
  advMono: Advance;
  advReadout: Advance;
  sprites: THREE.CanvasTexture;
  label: THREE.CanvasTexture;
  /** Sprite rects (u0, v0 top, u1, v1 bottom) on the sprite sheet: 4 splats, 2 strips. */
  splats: readonly (readonly [number, number, number, number])[];
  strips: readonly (readonly [number, number, number, number])[];
  /** Screen layers (1 unit = 1 px at 1080p through the frontal pose). */
  screen: FlatLayer;
  light: FlatLayer;
  ink: FlatLayer;
  type: FlatLayer;
  owned: { dispose(): void }[];
};

/** A glyph fitted into a card: its quad's half-height (card-local: the card is 2 high) and the quad's aspect (ACard glyph / aspect). */
export function fitGlyph(atlas: GlyphAtlas, s: string, cardAspect: number, fill = 0.78): { glyph: number; aspect: number; uv: [number, number, number, number] } {
  const e = atlas.entries.get(s);
  if (!e) throw new Error(`"${s}" is not in renderer A's atlas`);
  const quadEm = atlas.cellH / atlas.fontPx;
  // local units per em: the ink (≈ 1 em tall) fills `fill` of the card's height, and its advance at most `fill` of its width
  const perEm = Math.min(2 * fill, (2 * cardAspect * fill) / Math.max(0.2, e.advance));
  return { glyph: (perEm * quadEm) / 2, aspect: e.aspect, uv: uvOf(e) };
}
export const uvOf = (e: AtlasEntry): [number, number, number, number] => [e.u0, e.v0, e.u1, e.v1];

/** Points a three camera along `pose` (vertical FOV in the pose), with its near and far planes. */
export function aim(camera: THREE.PerspectiveCamera, pose: Pose, near: number, far: number, aspect: number): void {
  camera.position.set(...pose.position);
  camera.up.set(...pose.up);
  camera.lookAt(...pose.target);
  camera.fov = pose.fov;
  camera.near = near;
  camera.far = far;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/** The sprite sheet: four ink splats with satellites (white: tinted per card) and two torn paper strips with type. */
function spriteSheet(scale: number): { tex: THREE.CanvasTexture; splats: [number, number, number, number][]; strips: [number, number, number, number][] } {
  const W = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = W;
  const x = c.getContext('2d')!;
  const uv = (px: number, py: number, w: number, h: number): [number, number, number, number] => [px / W, 1 - py / W, (px + w) / W, 1 - (py + h) / W];
  const splats: [number, number, number, number][] = [];
  for (let v = 0; v < 4; v++) {
    const ox = v * 256;
    x.fillStyle = '#ffffff';
    x.beginPath();
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const r = 70 + 34 * hash(v, i, 1) ** 2;
      x.lineTo(ox + 128 + r * Math.cos(a), 128 + r * Math.sin(a));
    }
    x.fill();
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 2 * hash(v, i, 2);
      const r = 96 + 26 * hash(v, i, 3);
      x.beginPath();
      x.arc(ox + 128 + r * Math.cos(a), 128 + r * Math.sin(a), 5 + 11 * hash(v, i, 4), 0, Math.PI * 2);
      x.fill();
    }
    splats.push(uv(ox, 0, 256, 256));
  }
  const strips: [number, number, number, number][] = [];
  for (let v = 0; v < 2; v++) {
    const oy = 288 + v * 136;
    x.fillStyle = '#EDE6D6';
    x.beginPath();
    x.moveTo(0, oy + 24);
    for (let i = 0; i <= 16; i++) x.lineTo(i * 64, oy + 10 + 16 * hash(v, i, 5));
    x.lineTo(1024, oy + 104);
    for (let i = 16; i >= 0; i--) x.lineTo(i * 64, oy + 102 + 16 * hash(v, i, 6));
    x.fill();
    x.fillStyle = v ? '#FF48B0' : '#0078BF';
    x.font = `700 ${Math.round(40 * scale) / scale}px ${cssStack('mono')}`;
    x.textBaseline = 'middle';
    x.fillText(v ? `kaomoji.exe · ${edition(343)}` : SIGNATURE, 24, oy + 62);
    strips.push(uv(0, oy, 1024, 128));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return { tex, splats, strips };
}

/** The lock's label `10⁻⁷ m` (Inter Tight Black 413 px, cap 300; a pink misregistered shadow +8, −8), laid as on screen at V*. */
function labelTexture(): THREE.CanvasTexture {
  const k = 2;
  const c = document.createElement('canvas');
  c.width = LOCK_LABEL.width * k;
  c.height = LOCK_LABEL.height * k;
  const x = c.getContext('2d')!;
  x.scale(k, k);
  x.textBaseline = 'alphabetic';
  const s = LOCK_LABEL.size;
  const font = (px: number) => `900 ${px}px ${cssStack('display')}`;
  const draw = (col: string, dx: number, dy: number) => {
    x.fillStyle = col;
    x.font = font(s);
    x.fillText('10', 20 + dx, LOCK_LABEL.baseline + dy);
    const w = x.measureText('10').width;
    x.font = font(s * 0.55);
    x.fillText(`${MINUS}7`, 20 + w + 8 + dx, LOCK_LABEL.baseline - s * 0.38 + dy);
    const w2 = x.measureText(`${MINUS}7`).width;
    x.font = font(s);
    x.fillText(' m', 20 + w + w2 + 20 + dx, LOCK_LABEL.baseline + dy);
  };
  draw('#FF48B0', 8, 8);
  draw('#F6EFDF', 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/** Builds the kit (fonts first). */
export async function buildAKit(size: { width: number; height: number }): Promise<AKit> {
  await loadFonts();
  const scale = size.height / 1080;
  const face = buildGlyphAtlas(A_FACES, (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 96, radius: 12, size: 4096 });
  const hero = buildGlyphAtlas([HERO_FACES.face, HERO_FACES.wave], (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 256, radius: 28, size: 2048 });
  // his card is seen at grazing angles as the orbit turns it edge-on: filter the field anisotropically, or it prints as moiré
  hero.texture.anisotropy = 8;
  face.texture.anisotropy = 8;
  const display = buildGlyphAtlas(A_DISPLAY, (px) => `900 ${px}px ${cssStack('display')}`, { fontPx: 160, radius: 24, size: 2048 });
  const mono = buildGlyphAtlas(A_MONO, (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 64, radius: 8, size: 1024 });
  const readout = buildGlyphAtlas(
    unique([...'kaomoji.exe :: party monitor friends memory cpu 0123456789,.e% ∞╔═╗║╚╝', ...' .:-=+*#%@']),
    (px) => `600 ${px}px ${cssStack('mono')}`,
    { fontPx: 96, radius: 14, size: 2048 },
  );
  const sheet = spriteSheet(scale);
  const label = labelTexture();
  const aspect = size.width / size.height;
  const atlases = { display, mono };
  const screen = new FlatLayer({ atlases: { hero, face, display, mono }, blend: 'normal', aspect, shapes: 2048, glyphs: 512 });
  const light = new FlatLayer({ atlases: {}, blend: 'add', aspect, shapes: 2048, glyphs: 16 });
  const ink = new FlatLayer({ atlases: { hero }, blend: 'multiply', aspect, shapes: 512, glyphs: 16 });
  const type = new FlatLayer({ atlases: { ...atlases, readout }, blend: 'normal', aspect, shapes: 256, glyphs: 1024 });
  return {
    face,
    hero,
    display,
    mono,
    readout,
    advDisplay: advanceOf(display),
    advMono: advanceOf(mono),
    advReadout: advanceOf(readout),
    sprites: sheet.tex,
    label,
    splats: sheet.splats,
    strips: sheet.strips,
    screen,
    light,
    ink,
    type,
    owned: [face.texture, hero.texture, display.texture, mono.texture, readout.texture, sheet.tex, label, screen, light, ink, type],
  };
}
