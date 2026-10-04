// Drop 2, the part 'drop2' (its 20 bars: "THE VIRUS WAR"; bounds and every event in src/score/drop2.ts; the build sheet is
// notes/bid2/drop2-sheet2.md). Drop2Scene is the dispatcher: it owns no picture of its own. It hands each instant to the part whose
// DROP2_PARTS row holds it (src/shots/drop2Shared.ts) — by the sub-frame instant for render and by the output frame for look, temporal,
// segment and the screen overlay:
//   act 1, KEPT (the approved bars, moved by the score): Drop2Slash (drop2 1.1–3.1 − 1: E6's pop, S27 SLASH, S28 STYLE CUBE), Drop2Zbuf
//   (3.1–5.1 − 1: S29), Drop2Game (5.1–8.1 − 1: S30 opened to two bars, S31 OVERFLOW); new: Drop2Kernel (8);
//   the switch: Drop2Switch (9); act 2, new: Drop2Wave (10–11), Drop2Arcade (12), Drop2Voxel (13), Drop2Memphis (14), Drop2Picto (15),
//   Drop2Kaleido (16–17);
//   the finale: Drop2Overload (18.1–19.4& − 1: the reel, the stuck bar, the crash, KEPT), Drop2Bullet (19.4&–20.4& − 1, new), Drop2Overload
//   again for the built drain (20.4&–21.1 − 1). v08: the bullet time draws drop 2's last beat (its tape stop, landing on 21.1) and
//   hands its last sub-frames to Drop2Overload; the drain is bridge B's (src/scenes/bridgeB.ts draws Drop2Overload on its own clocks).
// Every part is built (round 1, 2026-10-02: the kernel landed; src/scenes/drop2Stub.ts keeps only the ScenePart type): each builder owns
// its own file. Segments break only at the hard cuts, two world-slams and the freeze (SEGMENT_CUTS: drop2 5.1, 9.1, 10.1, 14.1, 18.2, 18.3,
// 18.4, 19.3; the kernel starts its own segment on 8.1, so the whip's landing frame is crisp); every other hand-off
// blends inside one segment, so its sub-frames cross from one part to the next. The dispatcher makes the helpers two parts share and
// initialises and disposes them itself: Drop2Worlds (the world drawers) for Drop2Slash and Drop2Overload, and Drop2Zbuf, which is also
// the S29 part, for Drop2Slash's pre-roll. Each renderer is initialised and disposed once, however many rows it draws. Drop2MonitorLayer
// draws the party monitor, the act-1 hairline and the v1 slot over every frame, then Drop2SlotLayer Defender v2.0's scoreboard (816–1624, empty
// elsewhere); E9's fps line
// is Drop2Overload's own screenOverlay. `next` is the outro's scene: drop 2 ends in its own field and the outro decodes it (H5), so drop 2
// never draws it and leaves its init and dispose to the Director. The sheet agent owns this file; each part's file is its builder's.
import type * as THREE from 'three';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { mochiHeroRect } from '../shots/drop2Mochi.ts';
import { DROP2_PARTS, drop2PartIndex } from '../shots/drop2Shared.ts';
import { DROP2_THREADS, type Drop2Threads } from '../shots/drop2Threads.ts';
import { Drop2Arcade } from './drop2Arcade.ts';
import { Drop2Bullet } from './drop2Bullet.ts';
import { Drop2Game } from './drop2Game.ts';
import { Drop2Kaleido } from './drop2Kaleido.ts';
import { Drop2Kernel } from './drop2Kernel.ts';
import { Drop2Memphis } from './drop2Memphis.ts';
import { Drop2MonitorLayer } from './drop2Monitor.ts';
import { Drop2Overload } from './drop2Overload.ts';
import { Drop2Picto } from './drop2Picto.ts';
import { Drop2Slash } from './drop2Slash.ts';
import type { ScenePart } from './drop2Stub.ts';
import { Drop2Switch } from './drop2Switch.ts';
import { Drop2SlotLayer } from './drop2SwitchSlot.ts';
import { Drop2Voxel } from './drop2Voxel.ts';
import { Drop2Wave } from './drop2Wave.ts';
import { Drop2WaveMochi } from './drop2WaveMochi.ts';
import { Drop2Worlds } from './drop2Worlds.ts';
import { Drop2Zbuf } from './drop2Zbuf.ts';

export type { ScenePart } from './drop2Stub.ts';
/** What the dispatcher needs of a helper it shares between parts: built at the device size, disposed once. */
export type SharedHelper = { init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void>; dispose(): void };
/** A helper that also draws over every frame, fixed to the screen. */
export type ScreenLayer = SharedHelper & { draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void };

/** The renderer of each DROP2_PARTS name. */
export type PartName = 'slash' | 'zbuf' | 'game' | 'kernel' | 'switch' | 'wave' | 'arcade' | 'voxel' | 'memphis' | 'picto' | 'kaleido' | 'overload' | 'bullet';

export class Drop2Scene implements Renderable {
  /** The outro's scene, made on first call: never drawn here (see the header). */
  readonly next: (() => Renderable) | undefined;
  /** The world drawers, shared by Drop2Slash and Drop2Overload. */
  readonly worlds = new Drop2Worlds();
  private readonly shared: SharedHelper = this.worlds;
  /** S29's part, also handed to Drop2Slash for the pre-roll. */
  readonly zbuf = new Drop2Zbuf();
  /** The party monitor's corner windows (W1–W3), over every frame (empty outside them). */
  readonly monitor = new Drop2MonitorLayer();
  private readonly overlay: ScreenLayer = this.monitor;
  /** Defender v2.0's scoreboard (the slot, drop2 9.3 → 17.4 + 17; builder S, R1-T02), over the monitor on every frame (empty outside it). */
  readonly slot: Drop2SlotLayer;
  /** The picture's switches (src/shots/drop2Threads.ts): the film's default, or a preview's. */
  readonly threads: Drop2Threads;
  /** Every renderer, by part name. */
  readonly byName: Readonly<Record<PartName, ScenePart>>;
  /** The renderer of each DROP2_PARTS row, in its order. */
  readonly parts: readonly ScenePart[];
  /** Each renderer once (init and dispose). */
  private readonly renderers: readonly ScenePart[];

  constructor(next?: () => Renderable, threads: Drop2Threads = DROP2_THREADS) {
    this.next = next;
    this.threads = threads;
    const mochi = threads.waveStyle === 'mochi';
    this.slot = new Drop2SlotLayer(mochi ? { heroRect: (g) => mochiHeroRect(g) } : {});
    const overload = new Drop2Overload({ worlds: this.worlds });
    this.byName = {
      slash: new Drop2Slash({ worlds: this.worlds, zbuf: this.zbuf }),
      zbuf: this.zbuf,
      game: new Drop2Game(),
      kernel: new Drop2Kernel(),
      switch: new Drop2Switch(mochi ? { draft: 'mochi' } : {}),
      wave: mochi ? new Drop2WaveMochi({ sfx: threads.mochiSfx }) : new Drop2Wave(),
      arcade: new Drop2Arcade(),
      voxel: new Drop2Voxel(),
      memphis: new Drop2Memphis(),
      picto: new Drop2Picto(),
      kaleido: new Drop2Kaleido(),
      overload,
      bullet: new Drop2Bullet({ overload }),
    };
    this.parts = DROP2_PARTS.map((p) => {
      const r = this.byName[p.name as PartName];
      if (!r) throw new Error(`drop2: no renderer for the part '${p.name}'`);
      return r;
    });
    this.renderers = [...new Set(this.parts)];
  }

  private part(frame: number): ScenePart {
    return this.parts[drop2PartIndex(frame)];
  }

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await this.shared.init(gl, size);
    await Promise.all([...this.renderers.map((p) => p.init(gl, size)), this.overlay.init(gl, size), this.slot.init(gl, size)]);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.part(ctx.frame).render(gl, ctx, target);
  }

  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.part(frame).screenOverlay?.(gl, target, frame);
    this.overlay.draw(gl, target, frame);
    this.slot.draw(gl, target, frame);
  }

  look(frame: number): Look {
    return this.part(frame).look(frame);
  }

  temporal(frame: number): Temporal {
    return this.part(frame).temporal(frame);
  }

  segment(frame: number): Segment {
    return this.part(frame).segment(frame);
  }

  dispose(): void {
    for (const p of this.renderers) p.dispose();
    this.shared.dispose();
    this.overlay.dispose();
    this.slot.dispose();
  }
}
