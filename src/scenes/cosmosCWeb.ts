// Cosmos 5's picture on the GPU (renderer C; the pure shot is src/shots/cosmosWeb.ts): the web's printed space, its filaments of
// signature text, its node impostors and faces, the arcs and the sparks, all as light in screen px (the shot's camera projects the 3D
// web itself, lens included). Drawn into the HDR target the Riso print then re-prints as neon (cosmosLook: night, p 0.9).
import type * as THREE from 'three';
import { type RGB, linear, scaleRGB } from '../engine/color.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { GlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Shape } from '../engine/shapeField.ts';
import { FOV, FRONT, GROUNDS, HEX } from '../shots/cosmosKit.ts';
import { BAND_INK, type Ink, type WebPicture, webPicture } from '../shots/cosmosWeb.ts';
import { webLights } from '../shots/cosmosWebLight.ts';
import { type RunInstance, SpriteField, type SpriteInstance, TextRunField } from './cosmosCFields.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);

/** Each ink as light (linear; the print re-separates it: amber lights the yellow tube, cyan the blue, pink the pink). */
export const INK_LIGHT: Readonly<Record<Ink, RGB>> = {
  amber: linear(HEX.AMBER, 1.25),
  cyan: linear(HEX.CYAN, 1.05),
  pink: linear(HEX.NEON_PINK, 1.1),
  cream: linear('#FFF1DC', 1.15),
  core: linear('#FFE9C0', 2.6),
  violet: linear('#3A4A9A', 0.9),
  band: linear(BAND_INK),
};
export const inkLight = (ink: Ink, gain: number): RGB => scaleRGB(INK_LIGHT[ink], gain);

/** The web's printed space: bar 5's ground. */
export const WEB_GROUND: RGB = linear(GROUNDS[4]);

export class WebRenderer {
  private layer: FlatLayer | null = null;
  private runs: TextRunField | null = null;
  private sprites: SpriteField | null = null;
  private readonly owned: { dispose(): void }[] = [];

  init(atlases: { face: GlyphAtlas }, size: { width: number; height: number }): void {
    this.layer = new FlatLayer({ atlases: { face: atlases.face }, blend: 'add', aspect: size.width / size.height, shapes: 9000, glyphs: 2048 });
    this.runs = new TextRunField(2400);
    this.sprites = new SpriteField(8192);
    this.runs.mesh.renderOrder = 0.4;
    this.sprites.mesh.renderOrder = 0.6;
    this.layer.scene.add(this.runs.mesh, this.sprites.mesh);
    this.owned.push(this.layer, this.runs, this.sprites);
  }

  /** The web at instant `f`, through lens point `lens` (null: the pinhole), into `target` (its ground first). */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number, lens: { x: number; y: number } | null): WebPicture {
    const pic = webPicture(f, lens);
    this.write(pic);
    const lights = webLights(f, pic);
    const glyphs: Glyph[] = [
      ...pic.faces.map((x) => ({ ch: x.text, x: x.x, y: x.y, size: x.em, color: inkLight(x.ink, x.glow), alpha: x.alpha })),
      ...lights.faces.map((x) => ({ ch: x.text, x: x.x, y: x.y, size: x.em, color: inkLight(x.ink, x.glow), alpha: x.alpha, ...(x.rot ? { rot: x.rot } : {}) })),
    ];
    const under: Shape[] = [
      ...pic.strokes.map((s): Shape => {
        const dx = s.x1 - s.x0;
        const dy = s.y1 - s.y0;
        return { kind: 'segment', x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2, w: Math.hypot(dx, dy) + s.w, h: s.w, rot: Math.atan2(dy, dx), color: inkLight(s.ink, s.gain), ...(s.soft > 0 ? { soft: s.soft } : {}) };
      }),
      ...lights.shapes.map((s): Shape => ({ ...s.shape, color: inkLight(s.ink, s.gain) })),
    ];
    this.layer!.draw(gl, target, SCREEN, { under, glyphs: { face: glyphs }, over: [] }, { color: WEB_GROUND, grain: 0 });
    return pic;
  }

  private write(pic: WebPicture): void {
    const runs: RunInstance[] = pic.runs.map((r) => ({ ...r, color: inkLight(r.ink, r.alpha) }));
    this.runs!.write(runs);
    const sprites: SpriteInstance[] = pic.sprites.map((s) => ({ kind: s.kind, x: s.x, y: s.y, r: s.r, rot: s.rot, color: inkLight(s.ink, s.gain) }));
    this.sprites!.write(sprites);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
