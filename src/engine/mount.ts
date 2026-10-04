// One mount of a scene. Stage makes a fresh Renderable for every run of its
// setup effect (Studio re-runs it when a prop such as `quality` changes) and
// disposes it once, so a disposed root is never initialised a second time.
import type { Renderable } from './types.ts';

export type Mounted = { root: Renderable; release: () => void };

export function mountRoot(create: () => Renderable): Mounted {
  const root = create();
  let released = false;
  return {
    root,
    release: () => {
      if (released) return;
      released = true;
      root.dispose();
    },
  };
}
