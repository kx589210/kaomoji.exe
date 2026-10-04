// OutroCompany, outro 4.1 → 5.4 (E4 CURTAIN CALL + E5 BOWS → DIVE; build sheet notes/b58/ending-sheet.md r4 §3.4–§3.6, §4 4.1 /
// 5.4, §5.1, §7 E4 / E5; U5b): the burst into the stage, the wall printing in, the friends flying out of their spots (the spots' worlds
// frozen at the burst, popping away), the roll call on the 8ths (each call flashing its world), the hop, the leads walking on last, the
// three bows, the last drop onto W5, the button and the company's line bow, the held tableau; then the power-down (no hem: the stage's
// own light falls onto him, U6), the company streaming home into him one after another, the fold, and the dive (64 sub-frames, the
// push's speed carried in) onto S01's pose at frame −24, where OutroCursor takes over on 5.4.
// The stage is drawn into the aperture's picture under the stage camera and put through the burst; the stream comes home over it in
// screen space; he is drawn last, never dimmed; W5, the drop and its splash are screen overlays. Pure content: src/shots/outroCompany.ts
// (and outroIris.ts at BURST − 1, outroSpots.ts, outroW5.ts, outroWall.ts, outroBows.ts).
import type * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { BURST } from '../score/outro.ts';
import { FOV, FRONT_DISTANCE } from '../shots/intro.ts';
import { mixRGB } from '../engine/color.ts';
import { PLINK, companyAperture, companyFriends, companyLook, companySegment, companyTemporal, dropAt, heroContent, plinkRule, splash, stageCam, stageContent, stagePose, streamers, swallow, w5Level } from '../shots/outroCompany.ts';
import { counterContent, promptContent } from '../shots/outroIris.ts';
import { INKS, X, Y } from '../shots/outroKit.ts';
import type { CharPlan, OmegaPlan } from '../shots/outroKit.ts';
import { W5_BOX } from '../shots/outroShared.ts';
import { w5Content } from '../shots/outroW5.ts';
import { OutroAperturePass } from './outroAperture.ts';
import { OutroLayers, measureChars, measureOmegas } from './outroKit.ts';
import { type OutroSpots, acquireSpots, releaseSpots } from './outroSpots.ts';
import type { OutroPart } from './outroStub.ts';

const SCREEN = frontal(FRONT_DISTANCE, 0, 0, FOV);

export class OutroCompany implements OutroPart {
  private readonly kit = new OutroLayers(['mono', 'rounded', 'faces', 'wall'], ['add', 'normal'], { shapes: 512, glyphs: 2048 });
  private readonly aperture = new OutroAperturePass();
  private spots: OutroSpots | null = null;
  private plan: OmegaPlan | null = null;
  private wallPlan: OmegaPlan | null = null;
  private chars: CharPlan | null = null;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await this.kit.init(size);
    this.aperture.init(size);
    this.spots = await acquireSpots(size);
    this.plan = measureOmegas('faces');
    this.wallPlan = measureOmegas('wall');
    this.chars = measureChars('faces');
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    const L = { rounded: this.kit.advance('rounded'), mono: this.kit.advance('mono'), plan: this.plan!, wallPlan: this.wallPlan!, chars: this.chars! };
    const pose = stagePose(stageCam(ctx.cam));
    const add = this.kit.layer('add');
    // The stage, in the aperture's picture (the terminal's glass: S01's ground and haze; the stage's light on it).
    this.aperture.clearGlass(gl);
    const st = stageContent(f, L);
    add.draw(gl, this.aperture.pic, pose, { under: [...st.under, ...st.light], glyphs: { wall: st.glyphs.wall, faces: st.glyphs.faces, mono: st.glyphs.mono }, over: st.over }, null);
    // The iris's prompt and counter, swallowed (drawn as they stood on BURST − 1).
    const sw = swallow(f);
    if (sw > 0) {
      const prompt = promptContent(BURST - 1, L.mono);
      const fade = <T extends { alpha?: number }>(x: T): T => ({ ...x, alpha: (x.alpha ?? 1) * sw });
      add.draw(gl, this.aperture.pic, pose, { under: prompt.under.map(fade), glyphs: { mono: [...prompt.glyphs, ...counterContent(BURST - 1, L.mono)].map(fade) }, over: [] }, null);
    }
    // The burst, the spots' frozen worlds popping away (their friends have flown out of them).
    this.spots!.render(gl, BURST - 1, false);
    this.aperture.draw(gl, target, companyAperture(f), { spotPlain: this.spots!.plain!.texture, spotFx: this.spots!.fx!.texture });
    // The company coming home (U1, U6): everyone streaming into him from the button (screen space).
    const home = streamers(f, L);
    if (home.wall.length + home.faces.length + home.shapes.length > 0) add.draw(gl, target, SCREEN, { under: home.shapes, glyphs: { wall: home.wall, faces: home.faces }, over: [] }, null);
    // Him, never dimmed: his face, the ✧ popping off, the arms folding back, then the █ he folds into.
    const hero = heroContent(f, L.rounded);
    add.draw(gl, target, pose, { under: hero.glint, glyphs: { rounded: hero.rounded, mono: hero.cursor ? [hero.cursor] : [] }, over: [] }, null);
  }

  /** W5 (powering down with the tube from the button, out by the fold; its title rule dipping and flaring pink under the plink), the last drop and its splash: fixed to the screen. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const level = w5Level(frame);
    if (level > 0) {
      const w5 = w5Content(frame, this.kit.advance('mono'), companyFriends, { level });
      const title = Y(W5_BOX.rows.title);
      const mono = (w5.glyphs.mono ?? []).map((g) => {
        if (Math.abs(g.y - title) > 0.5) return g;
        const r = plinkRule(frame, g.x + 960);
        return r.dip > 0 || r.flare > 0 ? { ...g, y: g.y - r.dip, color: mixRGB(g.color, INKS.pink, 0.8 * r.flare) } : g;
      });
      this.kit.layer('normal').draw(gl, target, SCREEN, { ...w5, glyphs: { ...w5.glyphs, mono } }, null);
    }
    const drop = dropAt(frame);
    const shapes: Shape[] = [...splash(frame)];
    if (drop) {
      // A 15 px teardrop (A6: 1.5 × the r4 drop), stretched along its fall, with a white-hot core.
      const d = PLINK.drop;
      const len = d + Math.min(45, drop.vy * 0.75);
      shapes.push({ kind: 'segment', x: X(drop.x), y: Y(drop.y - len / 2 + d / 2), w: len, h: d, rot: Math.PI / 2, color: INKS.pink });
      shapes.push({ kind: 'segment', x: X(drop.x), y: Y(drop.y - len / 2 + d / 2), w: len * 0.6, h: 4.5, rot: Math.PI / 2, color: INKS.hot });
    }
    if (shapes.length) this.kit.layer('add').draw(gl, target, SCREEN, { under: shapes, glyphs: {}, over: [] }, null);
  }

  look(frame: number): Look {
    return companyLook(frame);
  }

  temporal(frame: number): Temporal {
    return companyTemporal(frame);
  }

  segment(): Segment {
    return companySegment();
  }

  dispose(): void {
    this.kit.dispose();
    this.aperture.dispose();
    if (this.spots) releaseSpots();
  }
}
