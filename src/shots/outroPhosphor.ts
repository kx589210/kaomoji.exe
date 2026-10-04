// The hero's material on the terminal (iteration 2, ruling 15: the review saw him as flat UI orange pasted on the CRT). On the screen
// he is what the intro’s bars are made of: phosphor — the terminal's own amber (INK.amber is the same hue at 1.7) driven past the bloom's
// threshold (terminalLook: 0.85 + 0.25 smoothing), so he glows like the boot log's amber with the CRT's scanlines over him. Drawn
// additively. Plain amber all the way through: a white-hot core (the glyph field's lit tube) read as a cream neon sign, not a CRT, and
// its bloom lifted the black round the lens to grey. The log (src/shots/outroLog.ts) lights him into it over the decode; the lens
// (src/shots/outroLens.ts) keeps him in it to the last frame. Pure.
import { type RGB, linear } from '../engine/color.ts';
import { PALETTE } from '../worlds/terminal.ts';

/** Phosphor amber: #FFB23E at 1.9× (luminance ≈ 1.01: into the bloom's knee, where the boot log's 1.7× only grazes it; 2.1× washed the black round the lens amber on the tonic). */
export const HERO_PHOSPHOR: { readonly ink: RGB } = { ink: linear(PALETTE.amber, 1.9) };
