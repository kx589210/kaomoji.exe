// The film's scenes: SPANS (src/score/spans.ts) names a scene for each span,
// and filmScenes() builds them, fresh for every Director (each mount of the
// Stage). A scene that a span and a transition share is made once (shared()),
// and so is a part's scene that both draws its content and holds its last
// frame over its unbuilt tail (a `held` span: HeldScene). The v08 bridges are
// scenes of their own (bridgeA.ts, bridgeB.ts); a stub is handed the scene
// before it, which it holds (src/score/film.ts STUBS). Bridge A is built.
import { type SceneSpan, shared } from '../director.ts';
import type { Renderable } from '../engine/types.ts';
import { FLIP } from '../score/build.ts';
import { type SceneKey, SPANS } from '../score/spans.ts';
import { type Drop2Threads, threadsOf } from '../shots/drop2Threads.ts';
import { BreakScene } from './break.ts';
import { BridgeAScene } from './bridgeA.ts';
import { BridgeBScene } from './bridgeB.ts';
import { ClubInkScene } from './clubInk.ts';
import { CosmosScene } from './cosmos.ts';
import { Drop2Scene } from './drop2.ts';
import { HeldScene } from './hold.ts';
import { IntroScene } from './intro.ts';
import { OutroScene } from './outro.ts';
import { RisoScene } from './riso.ts';
import { SwissScene } from './swiss.ts';
import { TransitionScene } from './transition.ts';
import { TileFlip } from '../transitions/tileFlip.ts';

/** `drop2Threads`: drop 2's picture switches (src/shots/drop2Threads.ts), the film's default when absent (a preview composition sets them). */
export function filmScenes(drop2Threads?: Partial<Drop2Threads>): SceneSpan[] {
  const swiss = shared(() => new SwissScene());
  const riso = shared(() => new RisoScene());
  // From break 1.1 on each section's scene is handed the next section's, made on first call, for the transition at the end of its range
  // (T6 at the end of the break, T7 at the end of drop 2). Shared, so it is made and initialised once however many hold it; only forward
  // (break → drop 2 → outro), so no two scenes ever wait on each other's init.
  const outro = shared(() => new OutroScene());
  // Drop 2's scene itself, kept for bridge B (v08), which draws drop 2's crash shot on its own clocks (the shared wrapper hides it).
  let drop2Scene: Drop2Scene | null = null;
  const drop2 = shared(() => (drop2Scene = new Drop2Scene(outro, threadsOf(drop2Threads))));
  // Shared too, as a held tail draws them again (HeldScene).
  // The cosmos (VERTIGO ∞ · LIGHTSPEED PRESS: src/scenes/cosmos.ts dispatches its renderers); v04's KosmosScene is retired, its code kept.
  const kosmos = shared(() => new CosmosScene());
  // The comic club INK (src/scenes/clubInk.ts, club 1.1 → break 1.1); v04's neon ClubScene is retired, its code kept (INK's last beat is
  // its glass, drawn through the same code path).
  const club = shared(() => new ClubInkScene());
  const brk = shared(() => new BreakScene(drop2));
  const make: Record<SceneKey, () => Renderable> = {
    intro: () => new IntroScene(),
    swiss,
    t2: () => new TileFlip(swiss(), riso(), FLIP.to),
    riso,
    // eslint-disable-next-line @remotion/non-pure-animation -- the film part 'transition', not a CSS transition
    transition: () => new TransitionScene(),
    kosmos,
    // Bridge A is built (src/scenes/bridgeA.ts): it prints the club's splash world round his eye itself and needs no neighbour's scene.
    bridgeA: () => new BridgeAScene(),
    club,
    break: brk,
    drop2,
    // Bridge B is built (src/scenes/bridgeB.ts): drop 2's crash shot (Drop2Overload) on the bridge's clocks; drop 2's shared scene inits it.
    bridgeB: () => new BridgeBScene(drop2, () => {
      drop2();
      return drop2Scene!.byName.overload;
    }),
    outro,
  };
  return SPANS.map((s) => ({ from: s.from, to: s.to, make: s.held ? () => new HeldScene(make[s.key]) : make[s.key] }));
}
