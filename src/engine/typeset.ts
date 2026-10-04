// Proportional typesetting from per-character advances (in ems), so pure shot
// code can place every character as its own glyph exactly where the browser
// would draw the whole string. Pure; Node tests pin it.

/** Advance of a character in ems. */
export type Advance = (ch: string) => number;

export type Line = { chars: { ch: string; x: number; w: number }[]; width: number };

/** Characters left to right: each one's centre `x` and advance `w`, `tracking` ems between characters; `width` is the whole line. */
export function typeset(text: string | readonly string[], advance: Advance, tracking = 0): Line {
  const chars: Line['chars'] = [];
  let x = 0;
  for (const ch of typeof text === 'string' ? [...text] : text) {
    const w = advance(ch);
    chars.push({ ch, x: x + w / 2, w });
    x += w + tracking;
  }
  return { chars, width: chars.length > 0 ? x - tracking : 0 };
}
