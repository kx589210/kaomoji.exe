// The break, the film part 'break' (8 bars: THE INTERLUDE). Bounds and events in src/score/break.ts; build sheet
// notes/bid2/break-sheet2.md (the design notes/extend/interlude-final.md). One span, drawn by four parts (BREAK_PARTS), each a
// BreakPart:
//   fall    break 1         BreakFall (src/scenes/breakFall.ts, as built): the cracked glass lets go a pane at a time — real 3D glass —
//                           into a rising pool of flat paint; the 35 face cells slap flat on break 2.1; E2's shard stays on our side.
//   flat    break 2–5       BreakFlat (src/scenes/breakFlat.ts, as built; its builder adds the v2 layers: the travelling camera, the
//                           depths, the floor band and the mess, the work orders and the red cursor, the POV, the guest infected).
//   graph   break 6 → 6.4a  BreakGraph (src/scenes/breakGraph.ts): the graph-editor rollercoaster — he rides his own signature, the rewind
//                           draws the slingshot; C6 carries the selection in, C7 whips out under a hidden cut.
//   launch  6.4a → the end  BreakLaunch (src/scenes/breakLaunch.ts), native: the catch, the concertina into the as-built extrude stack, the
//                           braced Y and the notches (v04's bar 6 one bar later, its reused code unchanged); the reverse angle, the dome,
//                           the look, the black hole drop 2 pops.
// The v2 switches (src/score/break.ts FLAT_V2 / GRAPH_V2 / LAUNCH_V2, off only in a KEEP-FIRST proof bundle) bring back the skeleton's
// stubs below: the graph a hold of the flat world's last frame, the launch v04's slingshot one bar later and then held (RemapPart).
// Each part's maker is ONE line of PARTS below; the stub classes stay for the switch-off proofs.
// Every part boundary is a segment boundary (no output frame mixes two parts); break 2.1 is continuous (R2-03). A part may keep drawing
// in front of the next one for a while (BreakPart.over / renderOver: the fall's shard) and put its screen readout up past its own frames
// (BreakPart.overlay: the fall's chips folding into their corners). `next` is drop 2's scene (shared), handed to the launch.
// Constructible in Node (tests build BreakScene): no GL before init().
import type * as THREE from 'three';
import { DEFAULT_TEMPORAL, type Segment, type Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { BREAK_END, BREAK_PARTS, type BreakPartName, CARRIED, FLAT, MATCH_CUT, WHIP_CUT, breakPartAt } from '../score/break.ts';
import { FRAMES_PER_BAR, FPS, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { BreakFall } from './breakFall.ts';
import { BreakFlat } from './breakFlat.ts';
import { BreakGraph } from './breakGraph.ts';
import { GRAPH_V2 } from '../shots/breakGraph.ts';
import { BreakLaunch } from './breakLaunch.ts';
import { LAUNCH_V2 } from '../shots/breakLaunch.ts';

/** One part of the break: a Renderable for its own frames, which may keep drawing over the part after it. */
export interface BreakPart extends Renderable {
  /**
   * Sub-frame instants at which the part also draws, in front of whichever part holds them, through renderOver() (its own frames
   * included: there renderOver runs after its own render). Its temporal() is consulted there too, so those frames get the sub-frames
   * its content needs. The fall's shard on our side of the screen: [SHARD_STAYS, break 2.2a).
   */
  readonly over?: Segment;
  /** Draws the carried-over content at instant `ctx` into `target`, in front of what the part holding `ctx.frame` drew. */
  renderOver?(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void;
  /** Output frames at which this part's screenOverlay() runs (default: its own frames). The fall's chips fold away on break 2.1 and the 5 frames after. */
  readonly overlay?: Segment;
}

const inside = (f: number, w: Segment): boolean => f >= w.from && f < w.to;
/** The widest shutter a held frame keeps (as src/scenes/hold.ts): a hold tells its sub-frames by rounding, so they stay within half a frame. */
const MAX_HOLD_SHUTTER = 0.96;

/**
 * A stretch of a stub part drawn from another part's instants: `hold` shows that one instant (its sub-frames kept, clamped into the inner
 * part's own segment there, as a held tail does), `shift` shows the instant `shift` frames earlier (a whole stretch moved, sub-frames
 * and all).
 */
export type Remap = { from: number; to: number } & ({ hold: number } | { shift: number });

/**
 * A stub part: draws `inner` (a built part) at other instants, region by region (Remap). Its look, temporal, segment and screen overlay
 * are the inner part's at the mapped output frame; the segment is moved back to the output frame and cut to the region, so a region
 * boundary is a segment boundary. Used for the graph (a hold of the flat world's last frame) and the carried-over launch.
 */
export class RemapPart implements BreakPart {
  readonly inner: BreakPart;
  readonly regions: readonly Remap[];
  /** What the stub stands in for, and who replaces it (for tests and the sheet). */
  readonly stub: string;

  constructor(inner: BreakPart, regions: readonly Remap[], stub: string) {
    this.inner = inner;
    this.regions = regions;
    this.stub = stub;
  }

  /** The region holding instant (or output frame) f; instants outside every region go to the nearer end. */
  region(f: number): Remap {
    return this.regions.find((r) => inside(f, r)) ?? (f < this.regions[0].from ? this.regions[0] : this.regions[this.regions.length - 1]);
  }

  /** The inner instant drawn for instant f (sub-frames kept; a hold's clamped into the inner's segment at the held frame). */
  instant(f: number): number {
    const r = this.region(f);
    if ('shift' in r) return f - r.shift;
    const s = this.inner.segment?.(r.hold) ?? { from: -Infinity, to: Infinity };
    return Math.min(Math.max(r.hold + (f - Math.round(f)), s.from), s.to - 1e-3);
  }

  /** The inner output frame whose look, temporal and overlay output frame `frame` takes. */
  frameOf(frame: number): number {
    const r = this.region(frame);
    return 'shift' in r ? frame - r.shift : r.hold;
  }

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await this.inner.init(gl, size);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const frame = this.instant(ctx.frame);
    this.inner.render(gl, { ...ctx, frame, cam: this.instant(ctx.cam), t: frame / FPS, beat: frame / FRAMES_PER_BEAT }, target);
  }

  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.inner.screenOverlay?.(gl, target, this.frameOf(frame));
  }

  look(frame: number): Look {
    return this.inner.look(this.frameOf(frame));
  }

  temporal(frame: number): Temporal {
    const r = this.region(frame);
    const t = this.inner.temporal?.(this.frameOf(frame)) ?? DEFAULT_TEMPORAL;
    return 'shift' in r ? t : { ...t, shutter: Math.min(t.shutter, MAX_HOLD_SHUTTER), persistence: 0 };
  }

  segment(frame: number): Segment {
    const r = this.region(frame);
    const at = this.frameOf(frame);
    const d = Math.round(frame) - at;
    const s = this.inner.segment?.(at) ?? { from: -Infinity, to: Infinity };
    return { from: Math.max(s.from + d, r.from), to: Math.min(s.to + d, r.to) };
  }

  dispose(): void {
    // The inner part belongs to whoever made it (the dispatcher disposes each part once).
  }
}

/** What the dispatcher builds its parts from: the built parts it shares with the stubs, and drop 2's scene. */
type Makers = { fall: BreakFall; flat: BreakFlat; v04Launch: BreakLaunch };

/**
 * Who draws each part. A builder who lands a part replaces its line (and only its line):
 *   graph  → `graph: () => new BreakGraph(),`  (src/scenes/breakGraph.ts, the graph builder)
 *   launch → `launch: (m) => m.v04Launch,`     (once src/scenes/breakLaunch.ts draws break 6.4a → 9.1 natively: the sling / fake-drop builder)
 */
const PARTS: Record<BreakPartName, (m: Makers) => BreakPart> = {
  fall: (m) => m.fall,
  flat: (m) => m.flat,
  // The graph (the graph builder): native (src/scenes/breakGraph.ts, GRAPH_V2); with the switch off, the skeleton's stub — the flat
  // world's last frame, held (the selection round (⊙ω⊙) that C6 carries into the editor).
  graph: (m) => (GRAPH_V2 ? new BreakGraph() : new RemapPart(m.flat, [{ from: MATCH_CUT, to: WHIP_CUT, hold: FLAT.to - 1 }], 'graph: hold of the flat world’s last frame, until src/scenes/breakGraph.ts')),
  // The launch (the sling / fake-drop builder): native from 6.4a (src/scenes/breakLaunch.ts, LAUNCH_V2); with the switch off, the
  // skeleton's stub — v04's launch carried over: its first frame through the whip's tail, its bar 6 one bar later, its last frame held.
  launch: (m) =>
    LAUNCH_V2 ? m.v04Launch : new RemapPart(
      m.v04Launch,
      [
        { from: WHIP_CUT, to: CARRIED.from, hold: MATCH_CUT },
        { from: CARRIED.from, to: CARRIED.to, shift: FRAMES_PER_BAR },
        { from: CARRIED.to, to: BREAK_PARTS[3].to, hold: BREAK_END - 1 },
      ],
      'launch: v04’s slingshot one bar later, then held, until the sling / fake-drop builder re-times src/scenes/breakLaunch.ts',
    ),
};

export class BreakScene implements Renderable {
  readonly fall: BreakFall;
  readonly flat: BreakFlat;
  /** v04's launch (its bar 6 and soap film), drawn through the launch stub until the launch is native. */
  readonly v04Launch: BreakLaunch;
  readonly graph: BreakPart;
  readonly launch: BreakPart;
  /** The parts in BREAK_PARTS order (fall, flat, graph, launch), each with its span. */
  readonly parts: readonly { name: BreakPartName; part: BreakPart; span: Segment }[];

  /** `next` is drop 2's scene (made on first call), for the launch: E6's pop is drawn by drop 2 itself, from src/shots/breakFilm.ts. */
  constructor(next?: () => Renderable) {
    this.fall = new BreakFall();
    this.flat = new BreakFlat();
    this.v04Launch = new BreakLaunch(next);
    const m: Makers = { fall: this.fall, flat: this.flat, v04Launch: this.v04Launch };
    const made = Object.fromEntries(BREAK_PARTS.map((p) => [p.name, PARTS[p.name](m)])) as Record<BreakPartName, BreakPart>;
    this.graph = made.graph;
    this.launch = made.launch;
    this.parts = BREAK_PARTS.map((p) => ({ name: p.name, part: made[p.name], span: { from: p.from, to: p.to } }));
  }

  /** The part that holds instant (or output frame) `frame`; instants outside the break go to the nearer end. */
  private at(frame: number): BreakPart {
    const name = breakPartAt(frame);
    return this.parts.find((p) => p.name === name)!.part;
  }

  /** Every part and every part a stub draws through, once (each is initialised and disposed once). */
  private unique(): BreakPart[] {
    return [...new Set(this.parts.flatMap(({ part }) => (part instanceof RemapPart ? [part, part.inner] : [part])))];
  }

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    // A stub's init only inits its inner part, which is in the list itself: init the real parts once.
    await Promise.all(this.unique().filter((p) => !(p instanceof RemapPart)).map((p) => p.init(gl, size)));
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.at(ctx.frame).render(gl, ctx, target);
    for (const { part } of this.parts) if (part.renderOver && part.over && inside(ctx.frame, part.over)) part.renderOver(gl, ctx, target);
  }

  /** Each part's screen readout over output frame `frame` (chips, the party monitor, the callout), for the frames it declares. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    for (const { part, span } of this.parts) if (part.screenOverlay && inside(frame, part.overlay ?? span)) part.screenOverlay(gl, target, frame);
  }

  look(frame: number): Look {
    return this.at(frame).look(frame);
  }

  /** The holding part's sampling, with as many sub-frames as any part drawing over it there asks for. */
  temporal(frame: number): Temporal {
    const active = this.at(frame);
    let t = active.temporal?.(frame) ?? DEFAULT_TEMPORAL;
    for (const { part } of this.parts) {
      if (part === active || !part.over || !inside(frame, part.over)) continue;
      const o = part.temporal?.(frame);
      if (o && o.samples > t.samples) t = { ...t, samples: o.samples };
    }
    return t;
  }

  /**
   * The holding part's segment, cut to the part's own frames: every part boundary is a segment boundary, so no output frame mixes
   * two parts. On break 2.1 that makes its frame (the slap) wholly the flat world's — its shutter used to reach back into the fall's
   * last quarter frame, whose glass-born pieces never matched the flat world's typeset ones and printed a pale double (R2-03).
   */
  segment(frame: number): Segment {
    const { part, span } = this.parts.find((p) => p.part === this.at(frame))!;
    const s = part.segment?.(frame) ?? span;
    return { from: Math.max(s.from, span.from), to: Math.min(s.to, span.to) };
  }

  dispose(): void {
    for (const p of this.unique()) if (!(p instanceof RemapPart)) p.dispose();
  }
}
