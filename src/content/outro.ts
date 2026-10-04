// What the ending draws (the part 'outro', its 5 bars, CURTAIN CALL): every on-screen string, for scripts/check-glyphs.mjs and for the
// ending's shots to import (strings live here; the shots import them, never the other way round). Build sheet
// notes/b58/ending-sheet.md §6 (the cast and the strings), design notes/extend/ending-final.md §5, §7, §9. The numbers in the
// copy are the film's own, read from the map and the score (the promise's frame, the stamps, the bar count, the backtrace's line
// numbers), so they stay true if a frame moves. Roles: the terminal and the blue screen in JetBrains Mono (`mono`), the hero in
// M PLUS Rounded ExtraBold (`rounded`), the blue screen's one body line in Inter Tight 300 (`display`); the company, the guest and the cat
// on stage are set in the terminal's `mono` stack like every face of the curtain call.
// Never used (the homage borrows the crash screen's layout, never its words): BLUE_SCREEN_BANNED, checked by tests/outro.test.ts.
import { COMMAND, CURSOR, DECODE, PROMPT } from './boot.ts';
import type { TextItem } from './text.ts';
import { type PartId, partBars } from '../score/film.ts';
import { WINK } from '../score/outro.ts';
import { BPM, FPS, TOTAL_BARS, TOTAL_FRAMES } from '../score/tempo.ts';

/** A kernel-log timestamp of film frame `frame` (the film's real time), in the boot log's format: the wink's frame (WINK, 5592 on the 61-bar map) → `[   93.200000]`. */
export const stamp = (frame: number): string => `[${(frame / FPS).toFixed(6).padStart(12)}]`;

// ——— The virus signature (the threads' map, row 9: the reveal) ————————————————————————————————————————————————————————————————

/** `• ω •` in UTF-8: hidden in every world, decoded here for the first time. */
export const SIGNATURE_TEXT = '• ω •';
export const SIGNATURE_BYTES: readonly number[] = [0xe2, 0x80, 0xa2, 0x20, 0xcf, 0x89, 0x20, 0xe2, 0x80, 0xa2];
/** The bytes as the film prints them everywhere: upper-case hex, one space apart. */
export const SIGNATURE = SIGNATURE_BYTES.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
/**
 * The decoder's reading, byte by byte: which glyph of his face each byte belongs to (0 the left •, 1 the ω, 2 the right •; −1 a space
 * `20`, which collapses to the gap between them). Group g flips on FLIPS[g] (src/score/outro.ts).
 */
export const SIG_GROUP: readonly number[] = [0, 0, 0, -1, 1, 1, -1, 2, 2, 2];
export const SIG_GLYPHS: readonly string[] = ['•', 'ω', '•'];

// ——— The principals (the only faces that act; each may appear in more than one world: the cast rule's exemption) ————————————————

/** The hero in the ending (rounded, phosphor amber): every face his rig shows, in order of appearance. */
export const HERO_OUT = {
  crashed: '(×ω×)',
  alive: '(•ω•)',
  /** outro 1.4: his right × flicks to • for a 16th (still here). */
  flick: '(×ω•)',
  /** Inside the closing ring: one 32nd of twitch. */
  twitch: '(+ω+)',
  /** Prying the circle open; the wink with his arms up; the wink's star. */
  arms: 'ヽ(•ω•)ﾉ',
  armsWink: 'ヽ(•ω<)ﾉ',
  wink: '(•ω<)',
  star: '✧',
  /** His bow: his blink, both eyes (the closed eyes of his Swiss grid copy and the interlude's sedated face). */
  bow: '(－ω－)',
} as const;
/** The table he sets back (the boot log's `negotiating with table ┻━┻`, answered; small print line 12). */
export const TABLE_BACK = '┬─┬ノ(•ω•ノ)';
/** The guest, the antivirus: its registered signature (out of date: log line 2 only), infected since the interlude (red, the ω amber), on stage with his arm up holding the empty glass, and his table flip. */
export const GUEST_OUT = { registered: '(￣▽￣)', infected: '(￣ω￣)', onStage: 'ヽ(￣ω￣)', flip: '(╯°□°)╯︵ ┻━┻' } as const;
/** The cat: the footnote and the stage; its bow is its own blink from the Riso flipbook. */
export const CAT_OUT = { face: '(=^･ω･^=)', bow: '(=^-ω-^=)' } as const;

// ——— E1 BLUE: the blue screen's copy ————————————————————————————————————————————————————————————————————————————————————————

/** A run of characters [from, to) (code points) drawn in a role's ink: the shots map each role to its colour (sheet §7, the colour law). */
export type Ink = 'text' | 'dim' | 'red' | 'redChip' | 'amber' | 'green';
export type InkRun = { from: number; to: number; ink: Ink };
/** A staged line (JetBrains Mono 56 px, one a beat on LINES): `inverse` is blue type on a light bar; the runs colour its marks. */
export type StagedLine = { text: string; style: 'inverse' | 'plain'; inks: readonly InkRun[] };

const len = (s: string): number => [...s].length;
/** The run of `part` inside `text` (its first occurrence), in `ink`. */
const run = (text: string, part: string, ink: Ink): InkRun => {
  const i = text.indexOf(part);
  if (i < 0) throw new Error(`outro: "${part}" is not in "${text}"`);
  const from = len(text.slice(0, i));
  return { from, to: from + len(part), ink };
};

const PROMISE = `next wink at frame ${WINK}`;
const REMOVED = '[DEFENDER] threat removed ✓';
/** The crash log, staged one line a beat (LINES): cute dumped (outro 1.2), the liquid and its registered culprit (1.3), the promise of the wink's frame (1.4), the antivirus's last word (2.1). */
export const STAGED: readonly StagedLine[] = [
  { text: 'Segmentation fault (cute dumped)', style: 'inverse', inks: [] },
  { text: `liquid detected on /dev/keyboard ${GUEST_OUT.registered}`, style: 'plain', inks: [run(`liquid detected on /dev/keyboard ${GUEST_OUT.registered}`, GUEST_OUT.registered, 'redChip')] },
  { text: PROMISE, style: 'plain', inks: [run(PROMISE, String(WINK), 'amber')] },
  { text: REMOVED, style: 'plain', inks: [run(REMOVED, '[DEFENDER]', 'redChip'), run(REMOVED, '✓', 'red')] },
];
/** The one body line (Inter Tight 300, 44 px), typed in as he slides into the slot. */
export const BODY_COPY = 'kaomoji.exe partied a little too hard.';

const PARTIAL = '▏▎▍▌▋▊▉';
/** How many steps the progress line takes (PROGRESS in src/score/outro.ts: one a 16th from the first flip to outro 1.4a). */
export const PROGRESS_STEPS = 14;
/** The progress line after `step` of its steps (0 at the seam … 14 = 100 %): `saving friends [█████▋    ]  57%`. */
export function progressText(step: number): string {
  const s = Math.max(0, Math.min(PROGRESS_STEPS, step));
  const fill = (s / PROGRESS_STEPS) * 10;
  const full = Math.floor(fill);
  const part = Math.round((fill - full) * 8);
  const bar = ('█'.repeat(full) + (part > 0 && full < 10 ? PARTIAL[part - 1] : '')).padEnd(10, ' ');
  return `saving friends [${bar}] ${String(Math.round((s / PROGRESS_STEPS) * 100)).padStart(3, ' ')}%`;
}
/** The footnotes beside the 2D code (22 px, dim): the signature, the invitation to scan it, the cat. */
export const FOOTNOTES: readonly string[] = [`culprit   ${SIGNATURE}`, 'scan to meet the culprit', `questions? ask the cat ${CAT_OUT.face}`];

/** `exit`, typed by the antivirus a key a 32nd (KEYS), red; the prompt in the blue screen's dim. */
export const EXIT_TYPED = 'exit';
export const EXIT_LINE = `${PROMPT}${EXIT_TYPED}`;

// ——— E1's small print (16 px, dim texture for pausers: exactly 14 lines) ——————————————————————————————————————————————————————

/** The score file a part's events live in today (the backtrace's file names follow the score files: change a row if a part gets its own). */
const SCORE_FILE: Readonly<Record<PartId, string>> = {
  intro: 'intro.ts',
  swiss: 'build.ts',
  riso: 'build.ts',
  // eslint-disable-next-line @remotion/non-pure-animation -- the film part 'transition', not a CSS transition
  transition: 'transition.ts',
  cosmos: 'drop1.ts',
  bridgeA: 'bridgeA.ts',
  club: 'drop1.ts',
  break: 'break.ts',
  drop2: 'drop2.ts',
  bridgeB: 'bridgeB.ts',
  outro: 'outro.ts',
};
/** The backtrace's frames, the film's sections in reverse; each line number is the part's last film bar (read from the map). */
const TRACE: readonly { part: PartId; fn: string; note?: string }[] = [
  { part: 'drop2', fn: 'splash()', note: `the last drop ${GUEST_OUT.infected}` },
  { part: 'break', fn: 'slingshot()' },
  { part: 'club', fn: 'throw(•ω•)', note: '(╯°□°)╯︵' },
  { part: 'cosmos', fn: 'bigbang()' },
  { part: 'transition', fn: 'stargate()' },
  { part: 'riso', fn: 'print(riso)', note: 'pink · blue' },
  { part: 'swiss', fn: 'grid(12)' },
  { part: 'intro', fn: 'main()', note: `${COMMAND}` },
];
const traceLine = (t: (typeof TRACE)[number], i: number): string => {
  const loc = `${SCORE_FILE[t.part]}:${String(partBars(t.part).at(-1)).padStart(2, '0')}`;
  return `#${i} ${t.fn.padEnd(12)} ${loc.padEnd(16)} ${t.note ?? ''}`.trimEnd();
};

/** The film's numbers (generated from the map, so they follow it): `61/61 bars · 5856 frames · 150 bpm · 0 tofu · friends online: 1` on the 61-bar map. */
export const FILM_STATS = `${TOTAL_BARS}/${TOTAL_BARS} bars · ${TOTAL_FRAMES} frames · ${BPM} bpm · 0 tofu · friends online: 1`;
/** The xxd line: the one gutter in the film that decodes. */
export const XXD_LINE = `0x7ffd3a40  ${SIGNATURE.toLowerCase()}  |${SIGNATURE_TEXT}|`;
/** Line 14, printed alone on DUB_MISSING (outro 2.1e): where the dub should have been. */
export const HEARTBEAT_LOST_LINE = `[FATAL] heartbeat lost: ${HERO_OUT.alive}`;
/** The 14 lines, top to bottom: lines 1–13 print one a frame from SMALL_PRINT (outro 1.2&), line 14 on HEARTBEAT_LOST. Faces keep their owner's ink. */
export const SMALL_PRINT_LINES: readonly { text: string; inks: readonly InkRun[] }[] = (() => {
  const plain = (text: string) => ({ text, inks: [] as InkRun[] });
  const lines = [
    { text: XXD_LINE, inks: [run(XXD_LINE, SIGNATURE_TEXT, 'amber')] },
    ...TRACE.map((t, i) => {
      const text = traceLine(t, i);
      const inks: InkRun[] = [];
      if (text.includes(GUEST_OUT.infected)) {
        const r = run(text, GUEST_OUT.infected, 'red');
        const w = r.from + [...GUEST_OUT.infected].indexOf('ω');
        inks.push({ from: r.from, to: w, ink: 'red' }, { from: w, to: w + 1, ink: 'amber' }, { from: w + 1, to: r.to, ink: 'red' });
      }
      if (text.includes('(•ω•)')) inks.push(run(text, '(•ω•)', 'amber'));
      if (text.includes('(╯°□°)╯︵')) inks.push(run(text, '(╯°□°)╯︵', 'red'));
      return { text, inks };
    }),
    plain('[FAIL] stopping blink-scheduler.service: still blinking'),
    plain(`${stamp(WINK)} blink-scheduler: next wink`),
    (() => {
      const text = `[EXIT] ${GUEST_OUT.flip}   [ OK ] ${TABLE_BACK}`;
      return { text, inks: [run(text, GUEST_OUT.flip, 'red'), run(text, '[ OK ]', 'green'), run(text, TABLE_BACK, 'amber')] };
    })(),
    plain(FILM_STATS),
    { text: HEARTBEAT_LOST_LINE, inks: [run(HEARTBEAT_LOST_LINE, '[FATAL]', 'red'), run(HEARTBEAT_LOST_LINE, HERO_OUT.alive, 'amber')] },
  ];
  return lines;
})();

// ——— E3 IRIS: the prompt, the counter, W5 ———————————————————————————————————————————————————————————————————————————————————

/** The prompt under him (COMMAND_LINE, 36 px): the ↑ keycap, the antivirus's `exit` recalled (red), then his own first command. */
export const RECALL_LINES: readonly string[] = [`${PROMPT}↑`, `${PROMPT}${EXIT_TYPED}`, `${PROMPT}${COMMAND}${CURSOR}`];
/** The big counter under the prompt from Enter (outro 3.4): `friends` (36 px, dim) and the doublings (56 px, green), arrows between. */
export const COUNTER_TEXT = { label: 'friends', steps: ['1', '2', '4', '8'], arrow: '→' } as const;

/** W5, the party monitor's slot (style B, src/shots/hud.ts): its title, and its rows' label column (values from column 12). */
export const W5_TITLE = ' kaomoji.exe :: party monitor ';
const label = (name: string): string => name.padEnd(10);
/** `friends   n`: 1 from 3.1&, 1 → 2 → 4 → 8 with the counter, then counted honestly as the company prints in. */
export const w5Friends = (n: number): string => `${label('friends')}${n}`;
/** `frame     5388`: the live output frame (one a frame). */
export const w5Frame = (frame: number): string => `${label('frame')}${frame}`;
/** The wink's frame, held for an 8th in amber: `frame     5592 ✧ · 93.200000 s` on the 61-bar map. */
export const W5_WINK_ROW = `${label('frame')}${WINK} ${HERO_OUT.star} · ${(WINK / FPS).toFixed(6)} s`;
/** The antivirus's row: `defender  0 threats ✓` (the boot's verdict, bookended), `1 threat` on the wink, 2 / 4 / 8, `∞`, and its last: `0 threats (•ω•)`. */
export const w5Defender = (threats: number | '∞', tail = ''): string => `${label('defender')}${threats} ${threats === 1 ? 'threat' : 'threats'}${tail ? ` ${tail}` : ''}`;
export const W5_DEFENDER = {
  clean: w5Defender(0, '✓'),
  wink: w5Defender(1),
  doubling: [1, 2, 4, 8].map((n) => w5Defender(n)),
  infinite: w5Defender('∞'),
  friendly: w5Defender(0, HERO_OUT.alive),
} as const;
/** The line under the box on outro 3.2&. */
export const W5_SURVIVED = `[ OK ] ${HERO_OUT.alive} survived`;
/** W5's frame (double-line box drawing, as the party monitor). */
export const W5_FRAME_CHARS = '╔═╗║╚╝';

// ——— E3 / E4: the curtain call (exempt from the one-face rule by design, outro 3.4e → 5.2a) —————————————————————————————————————

export type World = 'boot' | 'swiss' | 'riso' | 'transition' | 'cosmos' | 'club' | 'interlude' | 'drop2';
/** A headliner: its world's most recognisable face, in its last on-screen form there; its seat on the risers; the spot it waits in (none for the boot's, which prints in on the burst). */
export type Headliner = { world: World; face: string; source: string; seat: 'A1' | 'A2' | 'A3' | 'A4' | 'B1' | 'B2' | 'B3' | 'B4'; spot: number | null };
/**
 * The default headliners, one per world in film order (the design's §9: today's finals, chosen to dodge the known cross-section
 * clashes). scripts/castCurtain.mjs (the company builder) replaces each by its section's FEATURED[0] once the sections export it, after
 * checking it is on screen in the final film and ≤ 6 em wide; until then these stand.
 */
export const HEADLINERS: readonly Headliner[] = [
  { world: 'boot', face: '(；・∀・)', source: 'the boot log: [WARN] cuteness exceeds safe limits', seat: 'A1', spot: null },
  { world: 'swiss', face: '(≧∀≦)', source: 'S06: the 64-face grid', seat: 'A2', spot: 1 },
  // N1: S10's Σ(°ロ°) became Σ(・ロ・) (only the eyes), so its curtain call matches.
  { world: 'riso', face: 'Σ(・ロ・)', source: 'S10: the burst-through mouths', seat: 'A3', spot: 2 },
  { world: 'transition', face: '(◕‿◕)', source: 'bar 13: the register plates (cosmos final)', seat: 'A4', spot: 3 },
  { world: 'cosmos', face: 'ʕ•̀ω•́ʔ✧', source: 'Jupiter, infected (cosmos final)', seat: 'B1', spot: 4 },
  { world: 'club', face: '(◕ω◕✿)', source: 'P1, the Lichtenstein close-up, infected (club final)', seat: 'B2', spot: 5 },
  { world: 'interlude', face: '▼・ᴥ・▼', source: 'the first peeker (src/content/castBreak.ts PEEKERS)', seat: 'B3', spot: 6 },
  { world: 'drop2', face: 'ヽ(≧Д≦)ノ', source: 'bar 39: the rhythm game’s KICK note', seat: 'B4', spot: 7 },
];

// ——— What the homage never says ———————————————————————————————————————————————————————————————————————————————————————————————

/** The crash screen's own words, and its sad face: borrowed layout only (the design's §6). tests/outro.test.ts fails on any of them. */
export const BLUE_SCREEN_BANNED: readonly string[] = ['ran into a problem', 'needs to restart', 'collecting error info', '% complete', 'stop code', 'what failed', 'for more information', ':('];

// ——— Every string the ending puts on screen ——————————————————————————————————————————————————————————————————————————————————

const mono = (text: string, where: string): TextItem => ({ role: 'mono', text, where });
const rounded = (text: string, where: string): TextItem => ({ role: 'rounded', text, where });

/** Every string the ending puts on screen, with the font role the scene really draws it in (check-glyphs tests each character against that role's stack only). */
export const OUTRO_TEXTS: readonly TextItem[] = [
  // The hero, in his rounded phosphor (E1–E4): every face of his rig, and the glyphs the bytes flip into.
  ...Object.values(HERO_OUT).map((t) => rounded(t, 'the hero (E1–E4)')),
  rounded(`()${SIG_GLYPHS.join('')}`, 'E1: the bytes flip into his glyphs'),
  // E1 BLUE.
  mono(SIGNATURE, 'E1: his bytes (76 px) and the footnote'),
  ...STAGED.map((l) => mono(l.text, 'E1: the staged lines')),
  { role: 'display', text: BODY_COPY, where: 'E1: the body copy' },
  ...Array.from({ length: PROGRESS_STEPS + 1 }, (_, s) => mono(progressText(s), 'E1: the progress line')),
  ...FOOTNOTES.map((t) => mono(t, 'E1: the footnotes')),
  ...SMALL_PRINT_LINES.map((l) => mono(l.text, 'E1: the small print')),
  mono(EXIT_LINE, 'E1: exit, typed'),
  mono(DECODE, 'E1: the decode flicker (the seam, the static copy, the bytes)'),
  // E3 IRIS.
  ...RECALL_LINES.map((t) => mono(t, 'E3: the prompt (↑ ↑)')),
  mono([COUNTER_TEXT.label, ...COUNTER_TEXT.steps, COUNTER_TEXT.arrow].join(' '), 'E3: the counter'),
  mono(`╔═${W5_TITLE}═╗║╚╝`, 'E3/E4: W5’s frame'),
  mono(w5Friends(1234567890), 'E3/E4: W5 friends (every digit)'),
  mono(w5Frame(WINK), 'E3/E4: W5 frame'),
  mono(W5_WINK_ROW, 'E3: W5 on the wink'),
  ...[W5_DEFENDER.clean, W5_DEFENDER.wink, ...W5_DEFENDER.doubling, W5_DEFENDER.infinite, W5_DEFENDER.friendly].map((t) => mono(t, 'E3/E4: W5 defender')),
  mono(W5_SURVIVED, 'E3: under W5'),
  // E3 / E4: the curtain call. The wall's faces are WALL_TEXTS (src/shots/outroWall.ts, which reads every section's cast and these
  // principals), appended to SCREEN_TEXTS in src/content/all.ts: never imported here, so the two modules never cycle.
  ...HEADLINERS.map((h) => mono(h.face, `E3/E4: the ${h.world} headliner`)),
  mono(GUEST_OUT.onStage, 'E4: the guest on stage'),
  mono(CAT_OUT.face, 'E4: the cat on stage'),
  mono(CAT_OUT.bow, 'E4: the cat’s bow'),
  mono(CURSOR, 'E4/E5: the cursor he folds into'),
];
/** Every string whose characters the ending extrudes in 3D: none. */
export const OUTRO_EXTRUDE: readonly string[] = [];
