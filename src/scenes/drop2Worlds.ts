// The world drawers drop 2's parts share (builder W · WORLDS; build sheet notes/d2build/sheet.md §3.1, §3.5, §5.3, §5.5,
// §5.9, §8.1). STUB: holds nothing until its builder fills it.
// What goes here: one render target per world — TERMINAL, SWISS, RISO, NEON, LED (the LED drawer: DotGothic16 strings and glyph masks
// rasterised at init to a 12 px dot grid, ShapeField ellipses with glow), INTERLUDE (the break's bar-26 world, read-only from the
// break's shot module if it exports one), FLAT SPACE — each drawn on demand for an instant with its motif (src/shots/drop2Worlds.ts)
// and, when asked, the hero in that world's dress (S27_TREATMENTS / CUBE_DRESS / REEL_DRESS from src/shots/drop2Shared.ts); and the
// region compositor (src/scenes/drop2Regions.ts: a BSP of ≤ 5 half-planes, a shear per region, seams, the reveal behind a blade's
// tip). Used by Drop2Slash (S27, the cube's faces) and Drop2Overload (drop2 bar 7's cards, the blade wipe). Drop2Scene makes one,
// initialises it before the parts and disposes it after them; the parts only call it. Tests: tests/drop2Worlds.test.ts,
// tests/drop2Regions.test.ts.
export class Drop2Worlds {
  /** Builds the world targets at the device size, init(gl, size), after loadFonts(). STUB: nothing. */
  async init(): Promise<void> {}

  dispose(): void {}
}
