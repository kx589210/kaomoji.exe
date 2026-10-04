// Sub-frame sampling of one output frame: motion blur from a box shutter, plus
// an optional exponential tail into the past (CRT phosphor persistence).
// Pure, so Node tests pin the weights.

export type Temporal = {
  /** Sub-frames per output frame; 1 = no blur. */
  samples: number;
  /** Shutter length in frames (0.5 = 180°), centred on the frame. */
  shutter: number;
  /** Phosphor decay time in frames; 0 = none. The tail reaches back 3 × persistence. */
  persistence: number;
  /** Strength of the tail against the shutter (default 1). Below 1 a long tail stays a faint trail instead of a double exposure. */
  afterglow?: number;
};

export const DEFAULT_TEMPORAL: Temporal = { samples: 16, shutter: 0.5, persistence: 0 };

/**
 * How early (frames) a discrete change keyed to a drum is taken: half the
 * default shutter. The shutter is centred on the output frame, so a swap taken
 * on the drum's own instant shows in only half the sub-frames of the drum
 * frame (a double exposure, whole one frame late); taken this early, every
 * sub-frame of the drum frame shows it and none of the frame before does.
 */
export const SWAP_LEAD = DEFAULT_TEMPORAL.shutter / 2;

/** Whether the drum at frame `at` has struck by sub-frame instant `f`, taken SWAP_LEAD early (see above). */
export const struck = (at: number, f: number): boolean => at - SWAP_LEAD <= f;

/** Frames of time an output frame's samples cover: the shutter plus the persistence tail (3 × persistence). */
export const windowOf = (t: Temporal): number => t.shutter + (t.persistence > 0 ? 3 * t.persistence : 0);

/**
 * A spec with enough samples for `perFrame` per frame of its window. The tail
 * is sampled as densely as the shutter, so a moving glyph leaves a streak
 * rather than a row of separate copies.
 */
export const withDensity = (t: Omit<Temporal, 'samples'>, perFrame: number): Temporal => ({
  ...t,
  samples: Math.ceil(windowOf({ ...t, samples: 1 }) * perFrame - 1e-9),
});

/** One sub-frame: its instant, its weight, and the instant its camera (and screen-space rig) is taken at — the shutter-open instant for the phosphor tail, so a moving camera leaves no ghost of an earlier framing; its own instant inside the shutter. */
export type Sample = { frame: number; weight: number; cam: number };

/** A shot's span [from, to): sub-frames of an output frame never leave it. */
export type Segment = { from: number; to: number };

/**
 * Instants to render for output `frame`, oldest first, with weights summing to 1.
 * The shutter spans frame ± shutter/2. With persistence, instants before the
 * shutter opens fade by afterglow × exp(−Δ/persistence). Instants are clamped into
 * `segment`, so a hard cut is never exposed from both sides.
 */
export function temporalSamples(frame: number, t: Temporal, segment?: Segment): Sample[] {
  const n = Math.max(1, Math.round(t.samples));
  if (n === 1) return [{ frame, weight: 1, cam: frame }];
  const open = frame - t.shutter / 2;
  const close = frame + t.shutter / 2;
  const start = t.persistence > 0 ? open - 3 * t.persistence : open;
  const span = close - start;
  const out: Sample[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const f = start + ((i + 0.5) / n) * span;
    const w = f >= open ? 1 : (t.afterglow ?? 1) * Math.exp(-(open - f) / t.persistence);
    out.push({ frame: f, weight: w, cam: Math.max(f, open) });
    sum += w;
  }
  for (const s of out) {
    s.weight /= sum;
    if (segment) {
      s.frame = Math.min(Math.max(s.frame, segment.from), segment.to - 1e-3);
      s.cam = Math.min(Math.max(s.cam, segment.from), segment.to - 1e-3);
    }
  }
  return out;
}
