// The strings of the mochi wave (drop2 10–11 with DROP2_THREADS.waveStyle 'mochi': src/shots/drop2Mochi.ts), for its atlases and for
// scripts/check-glyphs.mjs (merged into src/content/all.ts). No new face: the rowers are the guest's variants (src/content/castDrop2.ts),
// the poses are his (•ω•) with arms.
import { GUEST, GUEST_INFECTED, GUEST_VARIANTS } from './castDrop2.ts';

/** His poses as left arm, face, right arm (the arms are split pieces that wave); 'base' is the mothership's face, arms tucked. */
export const MOCHI_POSES = {
  jump: ['＼', '(•ω•)', '／'],
  ride: ['〜', '(•ω•)', '〜'],
  mie: ['(ง', '•ω•', ')ง'],
  squint: ['＼', '(>ω<)', '／'],
  cheer: ['ヽ', '(•ω•)', 'ノ'],
  base: ['', '(•ω•)', ''],
} as const;
/** The crash's lettering (DROP2_THREADS.mochiSfx), one katakana a letter. */
export const MOCHI_SFX = ['ザ', 'ッ', 'パ', 'ー', 'ン'] as const;
/** The rowers: at rest, looking up from the crash, infected (an amber ω). */
export const MOCHI_ROWERS = { rest: GUEST.face, shock: GUEST_VARIANTS[1].face, inf: GUEST_INFECTED.face } as const;
/** The cartouche's two columns, Defender's seal, his byte seal's rows (R1-T10 order). */
export const MOCHI_CARTOUCHE = { title: 'DEFENDER', version: 'v2.0', seal: '防', bytes: ['E2 80 A2', '20', 'CF 89', '20', 'E2 80 A2'] } as const;
/** The Fuji's faces. */
export const MOCHI_FUJI_FACE = '(•ω•)';

export const MOCHI_TEXTS: readonly { role: 'rounded'; text: string; where: string }[] = [
  ...Object.values(MOCHI_POSES).map((p) => ({ role: 'rounded' as const, text: p.join(''), where: 'the mochi wave (drop2 10–11, waveStyle mochi): the hero' })),
  { role: 'rounded', text: MOCHI_SFX.join(''), where: 'the mochi wave: the crash’s lettering (mochiSfx)' },
  { role: 'rounded', text: `${MOCHI_ROWERS.rest}${MOCHI_ROWERS.shock}${MOCHI_ROWERS.inf}`, where: 'the mochi wave: the rowers' },
  { role: 'rounded', text: `${MOCHI_CARTOUCHE.title} ${MOCHI_CARTOUCHE.version} ${MOCHI_CARTOUCHE.seal}`, where: 'the mochi wave: the cartouche and Defender’s seal' },
  { role: 'rounded', text: MOCHI_CARTOUCHE.bytes.join(' '), where: 'the mochi wave: his byte seal' },
  { role: 'rounded', text: MOCHI_FUJI_FACE, where: 'the mochi wave: the small kaomoji mountain' },
];
