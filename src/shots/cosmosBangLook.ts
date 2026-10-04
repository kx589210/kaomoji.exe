// Renderer A's finishing per output frame (pure; build sheet notes/bcos/sheet.md §9.2–§9.3): the cosmos's look (the Riso night print
// with the power dial, bloom, grain, vignette by bar: src/shots/cosmosKit.ts cosmosLook) with the one override the sheet gives A — the
// bang's white (1.1 → 1.1e) prints with the plates in register, because his Y/P/B ghosts are drawn into the picture — and the score's
// sub-frames, raised to 32 where the flyover cruises faster than the house rule allows at 16. Plain Node loads this file.
import type { Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { OUTRUN, REAM, SHELL, SUNRISE, TIME } from '../score/cosmos.ts';
import { cosmosLook, cosmosTemporal } from './cosmosKit.ts';

/** The look of output frame `frame` on bars 1–2. */
export function aLook(frame: number): Look {
  const look = cosmosLook(frame);
  if (frame < TIME.freeze && look.riso) {
    const { offsets: _offsets, ...riso } = look.riso;
    void _offsets;
    return { ...look, riso };
  }
  return look;
}

/**
 * The sub-frames of output frame `frame` on bars 1–2: the score's, raised where the camera moves faster than the house rule allows
 * (≥ 32 sub-frames on any frame moving more than 20 px): the dolly back into bullet time (1.1e → 1.2), step 2b's launch (64), the
 * flyover's cruise (2.2 → 2.3).
 */
export function aTemporal(frame: number): Temporal {
  const t = cosmosTemporal(frame);
  const at = (n: number): Temporal => (t.samples >= n ? t : { ...t, samples: n });
  if (frame >= TIME.freeze && frame < SHELL) return at(32);
  if (frame >= REAM && frame < REAM + 6) return at(64);
  if (frame >= OUTRUN && frame < SUNRISE.at) return at(32);
  return t;
}
