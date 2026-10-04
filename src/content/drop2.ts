// What drop 2 draws (drop2 bars 1–20): every on-screen string, for scripts/check-glyphs.mjs and for drop 2's shots to import (strings live
// here; the shots import them, never the other way round). The faces come from src/content/castDrop2.ts (scripts/castDrop2.mjs);
// the timing of every line is in src/score/drop2.ts and the build sheet (notes/bid2/drop2-sheet2.md; the as-built bars:
// notes/d2build/sheet.md). Roles are the type each string is really drawn in: the S27 master and the neon / interlude / space hero
// in M PLUS Rounded (`rounded`), the Swiss and Riso hero and the cast in Noto Sans JP Black (`jp`), LED and the arcade in DotGothic16
// (`dot`), Swiss numerals and Defender's big type in Inter Tight (`display`), the game's labels in Space Grotesk (`ui`), and the system —
// the monitor, the logs, the readouts, the character cells — in JetBrains Mono (`mono`).
// The colour of a line is its speaker's (the bible's 颜色逻辑; src/shots/drop2Shared.ts LAW): Defender red, his amber, the system neutral.
import { RAMP } from '../actors/asciiFace.ts';
import * as D from '../score/drop2.ts';
import { partBar, partBars } from '../score/film.ts';
import { TOTAL_BARS } from '../score/tempo.ts';
import { WINDOW_TEXTS } from './break.ts';
import {
  CAT,
  GUEST,
  GUEST_INFECTED,
  GUEST_V1,
  GUEST_VARIANTS,
  GUEST_WAVE_INFECTED,
  REEL_CAST,
  S27_CAST,
  S28_CAST,
  S30_CLAP,
  S30_KICK,
  S30_VOX,
  S31_GAUGE,
  type CastFace,
} from './castDrop2.ts';
import type { TextItem } from './text.ts';

// ——— The hero's faces in drop 2 ————————————————————————————————————————————————————————————————————————————————————————————

/** (•ω•)'s faces in drop 2 (no wink: the film's only wink is the ending's). */
export const HERO2 = {
  base: '(•ω•)',
  /** The break's slingshot face, caught on drop2 1.1 (its brows are the spacing ˋ ˊ, dropped in; its speed lines streak off on the launch). */
  slingshot: '─=≡Σ((( つ•̀ω•́)つ',
  speedLines: '─=≡Σ(((',
  brows: ['ˋ', 'ˊ'] as const,
  /** S27's arms (outside the brackets): ヽ ノ from drop2 1.2, ＼ ／ from drop2 1.4. */
  arms: ['ヽ', 'ノ', '＼', '／'] as const,
  cheer: 'ヽ(•ω•)ノ',
  jump: '＼(•ω•)／',
  /** S28's poses, swapped on each landing. */
  danceL: '┌(•ω•)┘',
  danceR: '└(•ω•)┐',
  tremble: '(•ω•;)',
  surf: 'ᕕ(•ω•)ᕗ',
  squeeze: '(>ω<)',
  crashed: '(×ω×)',
  /** The design's new poses: the hardened face (the switch's flood, the kaleidoscope's ∞), the wave rider on the crest. */
  hard: '(•̀ω•́)',
  ride: '〜(•ω•)〜',
} as const;

// ——— S27: the terminal region's log column, the Swiss numerals ——————————————————————————————————————————————————————————————

/** The log column of S27's terminal region: one line a 16th from drop2 1.1 + 6 (JetBrains Mono 22 px, faces in pink). */
export const DROP2_S27_LOG: readonly string[] = [
  '[   41.600000] party: drop 2 · key of F♯ major',
  '[ OK ] screen.film popped · 2000 droplets',
  '[ OK ] slingshot fired · band → blade',
  '[ OK ] world terminal mounted',
  `${S27_CAST[0].face} joined the party`,
  '[ OK ] world swiss mounted · 12 columns',
  '[ OK ] world riso mounted · pink · blue',
  `${S27_CAST[1].face} taking notes`,
  '[ OK ] world neon mounted · tubes warm',
  '[ OK ] world led mounted · 5x7',
  '[ OK ] 6 costumes registered on 1 face',
  '[ OK ] ω aligned across 6 worlds',
  '[ OK ] style frame 27 ready',
  '[ .. ] folding the frame into a cube',
  '[ OK ] rims on kick + 18',
  '[ OK ] next: 4 faces, 1 per kick',
];

/**
 * Swiss numerals — the Swiss world's real film bar number (as the build's corner counter): the cropped bar number on S27 (drop2 1) and on
 * S28's Swiss face (drop2 2), and the reel's Swiss card (drop2 18): bar / TOTAL_BARS. Defender's world counts the bars, so they stay red.
 */
export const SWISS_NUMERALS = { s27: String(partBar('drop2', 1)), s28: String(partBar('drop2', 2)), reel: `${partBar('drop2', 18)}/${TOTAL_BARS}` } as const;

// ——— S28: the LED face's marquee rows ————————————————————————————————————————————————————————————————————————————————————————

/**
 * The LED face's three marquee rows (DotGothic16, 7 dots tall); the first is the real timecode, ticking (mm:ss.cc). The guest waving in the
 * second row is infected since the interlude (the bible's 25: (￣ω￣)): logged change 1.2 (sheet §1.3).
 */
export const LED_ROWS = {
  nowPlaying: (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds - 60 * m;
    return `NOW PLAYING · DROP 2 · ${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
  },
  second: `${S28_CAST[6].face}  ${GUEST_WAVE_INFECTED.face}`,
  third: S28_CAST[7].face,
} as const;

// ——— The party monitor (as built; W1's line logged change 1.1) ————————————————————————————————————————————————————————————————

/** The monitor's rows and its lines, window by window. */
export const MONITOR2 = {
  title: ' kaomoji.exe :: party monitor ',
  rows: ['friends', 'memory', 'hype'] as const,
  /** threads.md (c) 35.1e: he runs as root since the interlude's sudo (the built `(•ω•) v2.0` would be a second v2.0 beside Defender's). */
  w1: '[ OK ] party resumed · running as root',
  w2: ['[ OK ] costume 3/4 · led', '[WARN] costume cache full (4/4)'] as const,
  w3: '[ERR] unexpected dimension: z',
  w4: ['[WARN] combo exceeds safe limits', '[ OK ] FULL COMBO · memory 255% (0xFF)'] as const,
  /** S31's full-screen box: friends, the odometer's values, hype, the warnings. */
  friends: ['∞', '∞+1', '∞×2', '∞^∞', 'NaN'] as const,
  memory: ['256', '65,536', '16,777,216', '2,147,483,647', '-2,147,483,648'] as const,
  hype: ['∞', 'ERR'] as const,
  overflow: ['[ERR] memory 65536%', '[FATAL] memory 2147483647%', '[FATAL] integer overflow → -2147483648'] as const,
  /** The crack in the top border, the box glyphs that bow and fly. */
  boxGlyphs: '╔═╗║╚╝╪╬',
  /** The reel's terminal card: the monitor's copy. */
  copy: ['NaN', '-2147483648%', 'ERR', '[ERR] world conflict ×8'] as const,
  /** The stuck bar: the monitor inside the character field. */
  saturated: ['NaN', '@@@@@@@@%', '@@@', '[FATAL] @@@@@@@@@@'] as const,
} as const;

/** E9's honest fps line: `fps 60.0 · dropped 0`, then `fps 0.0 · not responding` from the freeze. */
export const fpsLine = (fps: number, dropped: number, frozen: boolean): string => (frozen ? 'fps 0.0 · not responding' : `fps ${fps.toFixed(1)} · dropped ${dropped}`);
/** The bullet time's second line, under the first (20.1): the program is frozen; the film isn't. */
export const CAMERA_FPS_LINE = 'camera 60.0 fps · still rolling';

// ——— S29: the dialects' glyphs ———————————————————————————————————————————————————————————————————————————————————————————————

/** The glyphs each dialect draws by luminance (JetBrains Mono, except the Swiss digits). */
export const DIALECT_GLYPHS = {
  terminal: RAMP,
  donut: '.,-~:;=!*#$@',
  led: '·•●',
  neon: '─│╱╲┼',
  brutal: ' ░▒▓█',
  swiss: ' 1742356908',
  blink: '-',
} as const;

// ——— S30: the game ———————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The lanes' labels and the hit tag (Space Grotesk Bold). */
export const GAME_LABELS = { lanes: ['KICK', 'CLAP', 'HAT', 'VOX'] as const, perfect: 'PERFECT' } as const;
/** The film bars down S30's highway (drop 2's from its bar 5, bridge B's, then the outro's), labelled `bar/TOTAL_BARS`. */
// v08 (integrator): bridge B's bar too, or the ladder skips 58/63 between 57 and 59.
const HIGHWAY_BARS = [...partBars('drop2').slice(4), ...partBars('bridgeB'), ...partBars('outro')];
/** Bar 5's VOX chips: the five vowels the hook's chops sing (Noto Sans JP Black), on VOX_KANA. */
export const VOX_KANA_TEXT = ['あ', 'い', 'う', 'え', 'お'] as const;

/** Inter Tight: the COMBO numerals, the score, FULL COMBO, the bar labels down the highway. */
export const GAME_TYPE = {
  combo: 'COMBO',
  full: 'FULL',
  score: (n: number): string => `SCORE ${String(Math.floor(n / 1000)).padStart(3, '0')} ${String(n % 1000).padStart(3, '0')}`,
  bars: HIGHWAY_BARS.map((b) => `${b}/${TOTAL_BARS}`),
  /** The highway's horizon callouts, the song's future (E8): Defender v2.0's switch (a red barrier ridge), the crash, the film's last bar. */
  horizon: { defender: `${partBar('drop2', 9)} · DEFENDER v2.0`, crash: `${partBar('drop2', 19)} · CRASH`, end: `${TOTAL_BARS}/${TOTAL_BARS} · END` },
} as const;

// ——— The signature (threads.md (b); design §7.3) ————————————————————————————————————————————————————————————————————————————

/**
 * `E2 80 A2 20 CF 89 20 E2 80 A2`, the UTF-8 of `• ω •`. Rules: at least one appearance per world, in its own voice, small, never the
 * subject; never decoded before the ending (no • or ω printed beside the bytes); read by the antivirus exactly once (the switch, 9.2&);
 * no colour of its own (SIGNATURE_MATCH is the one red: it is Defender reading).
 */
export const SIGNATURE_BYTES = ['E2', '80', 'A2', '20', 'CF', '89', '20', 'E2', '80', 'A2'] as const;
const BYTES = SIGNATURE_BYTES.join(' ');
export const SIGNATURE = {
  /** The switch, 9.2& (the only read): one byte a frame, red on a #0B1650 chip, its leader to the reticle ring. */
  match: `SIGNATURE MATCH  ${BYTES}  100%`,
  /** The game (5.2& on): the HAT lane's squares, one byte each (Space Grotesk). */
  hat: SIGNATURE_BYTES,
  /** The wave (11.2): the cartouche, top right, vertical, block by block (Noto Sans JP, sumi). */
  cartouche: ['E2 80 A2', '20 CF 89', '20 E2 80 A2'] as const,
  /** The arcade (12): the HUD's high score; the voxel well (13): the line counter (DotGothic16). */
  hiScore: 'HI-SCORE E280A2',
  lines: 'LINES CF89',
  /** Memphis (14): round the lemon disc's rim (Inter Tight Bold, black). */
  rim: `${SIGNATURE_BYTES.join('·')}·`,
  /** The pictograms (15): the ten lane numbers painted at the start line (Inter Tight Bold 40 px, white). */
  lanes: SIGNATURE_BYTES,
  /** The mirror trap (16–17): the tube's brass rim, one byte per sector, outside the fold (Inter Tight Bold, engraved). */
  brass: SIGNATURE_BYTES,
} as const;

// ——— The readout script (design §7.2; threads.md (c), drop 2's rows) ——————————————————————————————————————————————————————————

/** Who speaks a line (its colour): Defender red, the system's green / yellow / pink, his amber. */
export type Voice = 'defender' | 'ok' | 'warn' | 'program' | 'hero' | 'neutral';
/** Where a line is drawn: the act-1 monitor windows, the hairline's tag, the game's ticker, the overflow's box, the slot (v1, then v2.0's scoreboard), the install bar, Defender's big type, the callout, the fps lines. */
export type ReadoutSite = 'W1' | 'W2' | 'W3' | 'hairline' | 'scanline' | 'ticker' | 'monitor' | 'slot' | 'install' | 'big' | 'callout' | 'title' | 'fps';
export type ReadoutLine = { at: number; site: ReadoutSite; text: string; voice: Voice };

/** The hairline's tag at `pct` %, and when full. */
export const hairlineTag = (pct: number): string => (pct >= 100 ? 'defender v2.0 downloaded' : `defender updating ${pct}%`);
/** The scoreboard's pips: `n` of 5 layers left. */
export const pips = (n: number): string => `${'▮'.repeat(n)}${'▯'.repeat(5 - n)} ${n}/5`;
/** Defender's five layers (one a world), their deploy and breach lines. */
export const LAYERS = ['ukiyoe.print', '8bit.rom', 'memphis.css', 'pictograms.svg', 'mirror.trap'] as const;
export const deploying = (k: number): string => `L${k + 1} ${LAYERS[k]} ▸ deploying`;
export const breached = (k: number): string => `L${k + 1} breached ✗`;
/** Defender's avatar in the slot, by state (the guest's variants, castDrop2.ts GUEST_VARIANTS). */
export const AVATAR = { v1: GUEST_V1.face, clean: GUEST.face, sweat: GUEST_VARIANTS[0].face, shock: GUEST_VARIANTS[1].face, infected: GUEST_INFECTED.face, givingUp: GUEST_VARIANTS[2].face } as const;

/**
 * Every readout line of drop 2 with its frame (one new readable line a beat at most). The ladder agrees with threads.md (c): `[SCAN]` →
 * `[QUARANTINE]` → `quarantine failed` → `giving up` (17.4); `threat removed ✓` is the ending's.
 */
export const READOUT2: readonly ReadoutLine[] = [
  { at: D.W1.from, site: 'W1', text: MONITOR2.w1, voice: 'ok' },
  { at: D.DEFENDER_ROWS[0], site: 'W1', text: `[DEFENDER] sandbox breached ${AVATAR.v1}`, voice: 'defender' },
  { at: D.W2.from, site: 'W2', text: MONITOR2.w2[0], voice: 'ok' },
  { at: D.W2.from + 24, site: 'W2', text: MONITOR2.w2[1], voice: 'warn' },
  { at: D.DEFENDER_ROWS[1], site: 'W2', text: '[DEFENDER] 4 scans · 0 matches', voice: 'defender' },
  { at: D.ZBUF2.scan.from, site: 'scanline', text: 'scan 2D · z?', voice: 'defender' },
  { at: D.W3.from, site: 'W3', text: MONITOR2.w3, voice: 'defender' },
  { at: D.DEFENDER_ROWS[2], site: 'W3', text: '[DEFENDER] 2D scanner · axis z unsupported', voice: 'defender' },
  { at: D.PROBES[0], site: 'ticker', text: '[SCAN] probe 1 · caught', voice: 'defender' },
  { at: D.PROBES[1], site: 'ticker', text: '[SCAN] incoming', voice: 'defender' },
  { at: D.DISC.from - 9, site: 'ticker', text: '[SCAN] lens · full power', voice: 'defender' },
  { at: D.FULL_COMBO, site: 'ticker', text: '[SCAN] caught 0 / 10', voice: 'defender' },
  { at: D.CRACK, site: 'monitor', text: MONITOR2.overflow[0], voice: 'defender' },
  { at: D.SURF[3], site: 'monitor', text: MONITOR2.overflow[1], voice: 'defender' },
  { at: D.WRAP, site: 'monitor', text: MONITOR2.overflow[2], voice: 'defender' },
  { at: D.KERNEL.from, site: 'slot', text: `defender.sys v1.0 ${AVATAR.v1}`, voice: 'defender' },
  { at: D.KERNEL_SCAN, site: 'slot', text: '[SCAN] 1 threat', voice: 'defender' },
  { at: D.KERNEL_DOLLY.to, site: 'slot', text: '[ERR] 16 processes down', voice: 'defender' },
  { at: D.HANG.from, site: 'slot', text: '[FATAL] defender.sys not responding', voice: 'defender' },
  { at: D.INSTALL.from, site: 'install', text: 'installing Defender v2.0', voice: 'defender' },
  { at: D.SWITCH.from, site: 'big', text: 'DEFENDER v2.0', voice: 'defender' },
  { at: D.SIGNATURE_MATCH.from, site: 'callout', text: SIGNATURE.match, voice: 'defender' },
  { at: D.BOX, site: 'slot', text: `DEFENDER v2.0 ${AVATAR.clean}`, voice: 'defender' },
  { at: D.CONTAINED, site: 'big', text: 'THREAT CONTAINED ✓', voice: 'defender' },
  { at: D.SPILL[0], site: 'big', text: 'quarantine failed ×2', voice: 'defender' },
  { at: D.FLOOD, site: 'slot', text: deploying(0), voice: 'defender' },
  { at: D.CREST, site: 'slot', text: '[QUARANTINE] wave', voice: 'defender' },
  { at: D.CREST + 12, site: 'slot', text: 'quarantine failed ×64', voice: 'defender' },
  { at: D.SEAL + 24, site: 'slot', text: breached(0), voice: 'defender' },
  { at: D.SEAL + 36, site: 'slot', text: deploying(1), voice: 'defender' },
  { at: D.SPLITS[0], site: 'slot', text: '[QUARANTINE] hit 1 → 2', voice: 'defender' },
  { at: D.STOMP, site: 'slot', text: 'quarantine failed ×80', voice: 'defender' },
  { at: D.GARBAGE[0], site: 'slot', text: '[DEFENDER] garbage ×2', voice: 'defender' },
  { at: D.LINE_CLEAR, site: 'slot', text: breached(1), voice: 'defender' },
  { at: D.VOXEL_MORPH.from, site: 'slot', text: deploying(2), voice: 'defender' },
  { at: D.PANELS[0], site: 'slot', text: '[QUARANTINE] firewall.css', voice: 'defender' },
  { at: D.SET_ROTATE.to, site: 'slot', text: 'quarantine failed ×3', voice: 'defender' },
  { at: D.SET_ROTATE.to + 12, site: 'slot', text: breached(2), voice: 'defender' },
  { at: D.CRANE_UP.from, site: 'slot', text: deploying(3), voice: 'defender' },
  { at: D.TOUCHE, site: 'slot', text: '[QUARANTINE] athlete · disqualified', voice: 'defender' },
  { at: D.WORLD_ROLL[2], site: 'slot', text: 'quarantine failed', voice: 'defender' },
  { at: D.SHEET, site: 'slot', text: breached(3), voice: 'defender' },
  { at: D.HINGE.from, site: 'slot', text: deploying(4), voice: 'defender' },
  { at: D.RETICLES_IN, site: 'slot', text: '[SCAN] 12 threats', voice: 'defender' },
  { at: D.MIRRORS[2].at, site: 'slot', text: '[SCAN] 16 threats', voice: 'defender' },
  { at: D.MIRRORS[3].at, site: 'slot', text: '[SCAN] 24 threats', voice: 'defender' },
  { at: D.TARGET_LOCKS[0], site: 'slot', text: '[DEFENDER] target lock ×10 → ×20 → ×40', voice: 'defender' },
  { at: D.WALLPAPER.from, site: 'slot', text: '[SCAN] ∞ threats', voice: 'defender' },
  { at: D.CLAMP.from, site: 'slot', text: '[DEFENDER] last resort ▣', voice: 'defender' },
  { at: D.GIVING_UP, site: 'big', text: `[DEFENDER] giving up ${AVATAR.givingUp}`, voice: 'defender' },
  { at: D.GIVING_UP, site: 'slot', text: `${pips(0)} · ${breached(4)}`, voice: 'defender' },
  { at: D.CAMERA_LINE.from, site: 'fps', text: CAMERA_FPS_LINE, voice: 'ok' },
];
/** The scoreboard's pips, by frame: 5/5 when the slot opens (the box), a layer lost on each breach. */
export const SCOREBOARD: readonly { at: number; left: number }[] = [
  { at: D.BOX, left: 5 },
  { at: D.SEAL + 24, left: 4 },
  { at: D.LINE_CLEAR, left: 3 },
  { at: D.SET_ROTATE.to + 12, left: 2 },
  { at: D.SHEET, left: 1 },
  { at: D.GIVING_UP, left: 0 },
];

/** Defender's own words in the picture: the switch's blueprint tags (drafting texture, code points: a hint, not the bytes), the drawing's title block. */
export const SWITCH_TEXT = {
  rec: '● REC',
  tags: ['U+0028 U+0029', 'U+2022', 'U+03C9'] as const,
  dims: ['1.000 em', 'Ø 0.31 em'] as const,
  titleBlock: 'DWG 1/5 · WAVE',
  failed: (n: number): string => `quarantine failed ×${n}`,
} as const;

/** The kernel (8): the floor's addresses, the pillars' process names (left row, right row), the core's label. */
export const KERNEL_TEXT = {
  address: (n: number): string => `0x${(0x80000000 + 16 * n).toString(16).toUpperCase().replace(/^(.{4})/, '$1 ')}`,
  base: '0x80000000',
  left: ['scan()', 'heal()', 'sandbox()', 'quarantine()', 'patch()', 'restore()', 'rescan()', 'trust()'] as const,
  right: ['firewall()', 'update()', 'log()', 'watchdog()', 'signature()', 'isolate()', 'report()', 'main()'] as const,
  core: 'defender.sys v1.0',
  hang: 'defender.sys v1.0 (not responding)',
  glyphs: '═║╔╗╬ω',
} as const;

/** The arcade's HUD (DotGothic16). */
export const ARCADE_TEXT = { score: 'SCORE 000000', hi: SIGNATURE.hiScore, defender: 'DEFENDER v2.0 ▲▲▲', lives: ['▲▲▲', '▲▲▯'] as const, lines: SIGNATURE.lines } as const;

// ——— The stubs' slates (src/scenes/drop2Stub.ts: until its builder lands, each new part shows its slate) ——————————————————————

/** A new part's slate: its shot, title and one idea, its ground and ink, and where the hero stands on its first beat (HANDOFFS). */
export type Slate = { shot: string; title: string; idea: string; ground: string; ink: string; hero: { face: string; x: number; y: number; width: number } };
export const DROP2_SLATES: Readonly<Record<'kernel' | 'switch' | 'wave' | 'arcade' | 'voxel' | 'memphis' | 'picto' | 'kaleido', Slate>> = {
  kernel: { shot: 'S31K', title: 'KERNEL · drop2 8', idea: 'the wrap lands him at 0x80000000: 16 processes fall like dominoes', ground: '#07090A', ink: '#D8F5E1', hero: { face: HERO2.base, x: 960, y: 640, width: 600 } },
  switch: { shot: 'S31S', title: 'SWITCH · drop2 9', idea: 'Defender v2.0: scanned, read, boxed, and spilling amber', ground: '#0B2350', ink: '#DCE8F7', hero: { face: HERO2.base, x: 960, y: 540, width: 600 } },
  wave: { shot: 'S31U', title: 'UKIYO-E · drop2 10-11', idea: 'layer 1/5: the print turns into him; a small kaomoji mountain', ground: '#F2E8D5', ink: '#1F3F78', hero: { face: HERO2.jump, x: 960, y: 540, width: 760 } },
  arcade: { shot: 'S31E', title: '8-BIT · drop2 12', idea: 'layer 2/5: shooting him makes more of him', ground: '#000000', ink: '#F2F2F2', hero: { face: HERO2.base, x: 960, y: 230, width: 546 } },
  voxel: { shot: 'S31V', title: 'VOXEL · drop2 13', idea: 'the arcade stands up: his face in the well, a four-line clear', ground: '#050608', ink: '#3BD6FF', hero: { face: HERO2.base, x: 960, y: 230, width: 520 } },
  memphis: { shot: 'S31M', title: 'MEMPHIS · drop2 14', idea: 'layer 3/5: the firewall becomes his shelves', ground: '#FFFFFF', ink: '#111111', hero: { face: HERO2.base, x: 960, y: 420, width: 600 } },
  picto: { shot: 'S31P', title: 'PICTOGRAMS · drop2 15', idea: 'layer 4/5: touché, the flop, the world rolls', ground: '#62B6E8', ink: '#FFFFFF', hero: { face: HERO2.base, x: 960, y: 300, width: 240 } },
  kaleido: { shot: 'S31X', title: 'MIRROR TRAP · drop2 16-17', idea: 'layer 5/5: the brightest frame, infinity, giving up', ground: '#FFF6E0', ink: '#120E2A', hero: { face: HERO2.base, x: 960, y: 540, width: 520 } },
};
/** The stub's beat counter: `drop2 B.b` with the 16th as e & a. */
export const beatLabel = (bar: number, beat: number, sixteenth: number): string => `drop2 ${bar}.${beat}${['', 'e', '&', 'a'][sixteenth]}`;
/** Every character a slate can draw (its atlas). */
export const SLATE_CHARS: string = [...new Set([...Object.values(DROP2_SLATES).flatMap((s) => [s.shot, s.title, s.idea, s.hero.face]), 'drop2 0123456789.ea&'].join(''))].join('');

// ——— Every string, with its role ———————————————————————————————————————————————————————————————————————————————————————————

const face = (c: CastFace): TextItem => ({ role: c.role, text: c.face, where: c.where });
const DIGITS = '0123456789';
const mono = (text: string, where: string): TextItem => ({ role: 'mono', text, where });

/** Every string drop 2 puts on screen, with the font role the scene really draws it in (the check tests each character against that role's stack only). */
export const DROP2_TEXTS: readonly TextItem[] = [
  // The hero.
  ...[HERO2.base, HERO2.slingshot, HERO2.speedLines, ...HERO2.brows, ...HERO2.arms, HERO2.cheer, HERO2.jump, HERO2.danceL, HERO2.danceR, HERO2.surf, HERO2.squeeze, HERO2.crashed, HERO2.hard, HERO2.ride].map((text) => ({ role: 'rounded' as const, text, where: 'the hero (S27 master, neon, interlude, space, S31, the field’s source, T7; the new worlds: kernel, switch, wave, Memphis, kaleidoscope)' })),
  ...[HERO2.base, HERO2.danceL, HERO2.danceR, HERO2.cheer, HERO2.jump, HERO2.tremble].map((text) => ({ role: 'jp' as const, text, where: 'the hero (S28 Swiss and Riso, S30, the reel’s Swiss and Riso)' })),
  ...[HERO2.base, HERO2.danceL, HERO2.danceR].map((text) => ({ role: 'dot' as const, text, where: 'the hero in LED dots (S28, the reel)' })),
  // The cast (the guest's variants: his avatar, the rowers, the cannon, the athlete, the infected guest).
  ...[...S27_CAST, ...S28_CAST, ...S30_VOX, ...S30_KICK, ...S30_CLAP, ...S31_GAUGE, ...REEL_CAST, GUEST_WAVE_INFECTED, CAT, GUEST, GUEST_INFECTED, GUEST_V1, ...GUEST_VARIANTS].map(face),
  { role: 'jp', text: GUEST.face, where: 'Defender v2.0’s avatar, clean (the switch’s slot), the rowers, the red athlete (Noto Sans JP)' },
  // S27.
  ...DROP2_S27_LOG.map((text) => mono(text, 'S27 terminal region: the log column')),
  { role: 'display', text: `${SWISS_NUMERALS.s27} ${SWISS_NUMERALS.s28} ${SWISS_NUMERALS.reel}`, where: 'Swiss numerals (S27, S28, the reel)' },
  // S28.
  { role: 'dot', text: LED_ROWS.nowPlaying(44), where: 'S28 LED face: the timecode row' },
  { role: 'dot', text: `${DIGITS}:.·`, where: 'S28 LED face: the timecode’s digits' },
  { role: 'dot', text: LED_ROWS.second, where: 'S28 LED face: the second row' },
  { role: 'dot', text: LED_ROWS.third, where: 'S28 LED face: the third row' },
  { role: 'dot', text: `${REEL_CAST[1].face}  ${REEL_CAST[2].face}`, where: 'the reel’s LED card: the marquee' },
  // The monitor and the fps lines.
  mono(`╔═${MONITOR2.title}═╗ ║ ╚═╝ ${MONITOR2.rows.join(' ')} ${DIGITS} % @`, 'the monitor’s box'),
  ...[MONITOR2.w1, ...MONITOR2.w2, MONITOR2.w3, ...MONITOR2.w4, ...MONITOR2.overflow, ...MONITOR2.copy, ...MONITOR2.saturated].map((text) => mono(text, 'the monitor’s lines')),
  mono([...MONITOR2.friends, ...MONITOR2.memory, ...MONITOR2.hype, MONITOR2.boxGlyphs].join(' '), 'S31: the odometer, the counters, the box glyphs'),
  mono(fpsLine(60, 0, false), 'E9: the fps line'),
  mono(fpsLine(0, 0, true), 'E9: the fps line, frozen'),
  mono(CAMERA_FPS_LINE, 'the bullet time: the camera’s fps line'),
  // The character cells.
  ...Object.entries(DIALECT_GLYPHS).map(([k, text]) => ({ role: (k === 'swiss' ? 'display' : 'mono') as TextItem['role'], text, where: `S29: the ${k} dialect’s glyphs` })),
  // E6: the break's window text, torn off with the film.
  ...[WINDOW_TEXTS.title, WINDOW_TEXTS.dialog, WINDOW_TEXTS.ok, WINDOW_TEXTS.louder, WINDOW_TEXTS.root, WINDOW_TEXTS.sudo.join(' '), WINDOW_TEXTS.password, WINDOW_TEXTS.stars, WINDOW_TEXTS.granted, WINDOW_TEXTS.overload].map((text) => mono(text, 'E6: the break’s window text, torn off with the film')),
  // S30.
  ...[...GAME_LABELS.lanes, GAME_LABELS.perfect].map((text) => ({ role: 'ui' as const, text, where: 'S30: lane labels and the hit tag' })),
  { role: 'display', text: `${GAME_TYPE.full} ${GAME_TYPE.combo} ${GAME_TYPE.score(255255)} ${DIGITS} ${GAME_TYPE.bars.join(' ')} ${GAME_TYPE.horizon.defender} ${GAME_TYPE.horizon.crash} ${GAME_TYPE.horizon.end}`, where: 'S30: FULL COMBO, the score, the combo numerals, the bar labels, the horizon callouts' },
  { role: 'jp', text: VOX_KANA_TEXT.join(''), where: 'S30 bar 5: the VOX lane’s kana' },
  { role: 'ui', text: SIGNATURE.hat.join(' '), where: 'S30 bar 5: the HAT lane’s bytes' },
  // The readout (every line, by its site's type).
  ...READOUT2.map((l) => (l.site === 'big' ? { role: 'display' as const, text: l.text, where: `drop 2's big type (${l.site})` } : mono(l.text, `drop 2's readout (${l.site})`))),
  ...[1, 2, 4, 8, 16, 23, 38, 52, 67, 81, 94, 100].map((p) => mono(hairlineTag(p), 'act 1: the hairline’s tag')),
  ...[0, 1, 2, 3, 4, 5].map((n) => mono(pips(n), 'the v2.0 scoreboard’s pips')),
  ...LAYERS.flatMap((_, k) => [mono(deploying(k), 'the scoreboard: a layer deploys'), mono(breached(k), 'the scoreboard: a layer breached')]),
  { role: 'display', text: 'DEFENDER v2.0', where: 'the scoreboard’s title row' },
  // The switch.
  mono([SWITCH_TEXT.rec, ...SWITCH_TEXT.tags, ...SWITCH_TEXT.dims, SWITCH_TEXT.titleBlock, SWITCH_TEXT.failed(16), SWITCH_TEXT.failed(8), SWITCH_TEXT.failed(4)].join(' '), 'the switch: the POV’s labels and the blueprint’s tags'),
  // The kernel.
  mono([KERNEL_TEXT.address(0), KERNEL_TEXT.address(17), KERNEL_TEXT.base, '0x9 0xA 0xC 0xE', ...KERNEL_TEXT.left, ...KERNEL_TEXT.right, KERNEL_TEXT.core, KERNEL_TEXT.hang, KERNEL_TEXT.glyphs].join(' '), 'the kernel: addresses, the pillars’ processes, the core'),
  // Act 2's worlds: the signature in each world's voice, the arcade's HUD.
  { role: 'jp', text: SIGNATURE.cartouche.join(' '), where: 'the wave: the cartouche' },
  { role: 'jp', text: 'つ', where: 'the wave: the claws’ hands' },
  { role: 'dot', text: [ARCADE_TEXT.score, ARCADE_TEXT.hi, ARCADE_TEXT.defender, ...ARCADE_TEXT.lives, ARCADE_TEXT.lines].join(' '), where: 'the arcade and the voxel well: the HUD' },
  { role: 'display', text: `${SIGNATURE.rim} firewall.css ${SIGNATURE.lanes.join(' ')} ${SIGNATURE.brass.join(' ')}`, where: 'Memphis’s rim and tag, the pictograms’ lane numbers, the brass rim' },
  // The stubs' slates (until each new part is built).
  ...Object.values(DROP2_SLATES).flatMap((s) => [mono(`${s.shot} ${s.title}`, 'a stub’s slate: its title'), mono(s.idea, 'a stub’s slate: its idea'), mono(s.hero.face, 'a stub’s slate: the hero’s place')]),
  mono(beatLabel(20, 4, 3), 'a stub’s slate: the beat counter'),
];

/** Every string whose characters drop 2 extrudes in 3D: S29 is raymarched from the glyph's SDF, but its fallback (`extrudeText`) is pre-checked. */
export const DROP2_EXTRUDE: readonly string[] = ['(•ω•)', '-'];
