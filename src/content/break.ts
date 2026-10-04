// What the break draws (THE INTERLUDE, break bars 1–8): every on-screen string, for scripts/check-glyphs.mjs and for the break's shots to import (strings
// live here; the shots import them, never the other way round). The faces come from src/content/castBreak.ts (scripts/castBreak.mjs);
// the timing of every line is in src/score/break.ts and the build sheet (notes/break/break-sheet.md §4.8–§4.9, §6).
// Roles are the type each string is really drawn in: the hero in M PLUS Rounded (`rounded`), the cast in Noto Sans JP Black (`jp`),
// the system — chips, party monitor, patch tags, break bar 6's window, the callout chip, the tofu box's code point — in JetBrains Mono
// (`mono`, whose stack falls back to M PLUS 1 Code for kana).
import { RAMP } from '../actors/asciiFace.ts';
import { BROWS, CAT, DANCERS, DIALOG_FACE, GRANTED_FACE, GUEST_INFECTED, GUEST_PEEK, GUEST_SPY, GUEST_WAVE, HERO_FACES, HERO_FACES_V2, PAWS, PEEKERS, PEEKERS_V2, SHOCKED } from './castBreak.ts';
import type { TextItem } from './text.ts';

/** The six peeks of break bars 2–4 in order: the guest, in red, is the third. */
export const PEEK_FACES: readonly string[] = [PEEKERS[0], PEEKERS[1], GUEST_PEEK, PEEKERS[2], PEEKERS[3], PEEKERS[4]];
/** The second peeker, ( ° ∀ ° )ﾉﾞ, is drawn in two pieces so its hand can wave on its own (break 3.1&): body and hand. */
export const WAVER = { body: '( ° ∀ ° )', hand: 'ﾉﾞ' } as const;

/** The hero's marks: the ☆ he tosses on break 5.3, the ✧ glints (5.1, 6.2 on LOUDER, 6.4&), the big green tick of 3.4&. */
export const STAR = '☆';
export const SPARKLE = '✧';
export const TICK = '✓';
export const CROSS = '✗';
/** The blinking terminal cursor (chips, the sudo prompt). */
export const CURSOR = '▌';

/** Break bar 1: the four corner chips (decoding through random ramp characters first). */
export const CHIP_REPAIR = 'REPAIR MODE';

/** Break bars 2–5: the party monitor (text mode, as src/shots/hud.ts) — its title, gauges and status line. */
export const MONITOR_TITLE = ' kaomoji.exe :: party monitor ';
export const GAUGES = { memory: 'memory', integrity: 'integrity', volume: 'volume' } as const;
/** The status line, in order (frames: MONITOR_LINES in src/score/break.ts). */
export const MONITOR_STATUS = {
  patch1: '[PATCH] 1 applied',
  patch2: '[PATCH] 2 applied',
  mismatch: '[ERR] bracket.L mismatch',
  patch3: '[PATCH] 3 applied',
  patch4: '[PATCH] 4 applied',
  retry: (n: number): string => `[PATCH] eye retry ${n}`,
  tofu: '[FAIL] checking tofu ... 1 missing glyph',
  fetch: '[ .. ] fetching U+2022 from /dev/galaxy',
  restored: '[ OK ] U+2022 restored · 0 tofu',
  detached: '[ERR] eye.L detached',
  patch27: '[PATCH] 27 applied',
  hang: '[HANG] kaomoji.exe not responding',
  restarting: 'restarting [··········]',
  restarted: '[ OK ] restart #1 · screen replaced',
} as const;
/** E3's tofu box: U+2022 (•) printed in two rows inside it. */
export const TOFU_ROWS: readonly [string, string] = ['20', '22'];

/** The patch tags T0–T8 (world; JetBrains Mono Bold 22 px), with each retype. */
export const TAG_TEXTS = {
  t0: ['eye.L ✗ wrong side of screen', 'eye.L ✓ retrieved from viewer'],
  t1: ['patch face.core ✓'],
  t2: ['patch eyes ✓'],
  t3: ['bracket.L ✗ mismatch', 'bracket.L ✓ retry 1'],
  t4: ['patch patch.L ✓'],
  t5: ['eye.* ✗ retry 2', 'eye.* ✗ retry 3', 'eye.* ✗ retry 4', 'eye.* ✗ retry 5', 'eye.R ✗ tofu', 'rescan ✓'],
  t6: ['bracket.R ✓'],
  t7: ['eye.L ✗ detached'],
  t8: ['patch(patch(patch)) ✓'],
} as const;

/** Break bar 5's callout chip (screen), naming the zoom of the match cut. */
export const CALLOUT_CHIP = 'zoom ×1.48';

/** Break bar 6 (E5): the system's window — one voice, text mode, printed on the screen that turns into the soap film. */
export const WINDOW_TEXTS = {
  title: ' kaomoji.exe ',
  dialog: `${DIALOG_FACE} party too loud`,
  ok: '[ OK ]',
  louder: '[ LOUDER ]',
  root: 'LOUDER requires root',
  sudo: ['>', 'sudo', 'make', 'it', 'louder'],
  password: `[sudo] password for (•ω•): `,
  stars: '********',
  plain: '150bpm!!',
  granted: `access granted ${GRANTED_FACE}`,
  overload: '[WARN] party overload',
} as const;

/** The box-drawing frame and gauge characters the system's text mode uses. */
const BOX = '╔═╗║╚╝';
const DIGITS = '0123456789%#∞';

const hero = (text: string, where: string): TextItem => ({ role: 'rounded', text, where });
const cast = (text: string, where: string): TextItem => ({ role: 'jp', text, where });
const mono = (text: string, where: string): TextItem => ({ role: 'mono', text, where });

/** Every string the break puts on screen, with the font role the scene really draws it in (the check tests each character against that role's stack only). */
export const BREAK_TEXTS: readonly TextItem[] = [
  ...Object.values(HERO_FACES).flat().map((f) => hero(f, 'break hero')),
  ...BROWS.map((b) => hero(b, 'break hero brows')),
  hero(STAR, 'break hero ☆'),
  hero(SPARKLE, 'break glints'),
  hero(TICK, 'break big tick'),
  ...PEEK_FACES.map((f) => cast(f, 'break peeker')),
  ...Object.values(WAVER).map((f) => cast(f, 'break peeker 2, drawn in two pieces')),
  ...SHOCKED.map((f) => cast(f, 'break shocked')),
  ...Object.values(DANCERS).flat().map((f) => cast(f, 'break dancer')),
  cast(GUEST_WAVE, 'break guest'),
  cast(CAT, 'break cat'),
  mono(CHIP_REPAIR + CURSOR, 'break chips'),
  mono(BOX + DIGITS + RAMP, 'break text mode'),
  mono(MONITOR_TITLE, 'break monitor'),
  ...Object.values(GAUGES).map((g) => mono(g, 'break monitor gauge')),
  ...Object.values(MONITOR_STATUS).map((s) => mono(typeof s === 'string' ? s : s(9), 'break monitor status')),
  mono(TICK + CROSS, 'break monitor and tags'),
  ...TOFU_ROWS.map((r) => mono(r, 'break tofu box')),
  ...Object.values(TAG_TEXTS).flat().map((t) => mono(t, 'break tag')),
  mono(CALLOUT_CHIP, 'break callout'),
  ...Object.values(WINDOW_TEXTS).flat().map((t) => mono(t, 'break window')),
];

/** Every string whose characters the break extrudes in 3D: none (the falling glass is extruded cells, the film a plane). */
export const BREAK_EXTRUDE: readonly string[] = [];

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// v2 — THE INTERLUDE's new and re-voiced strings (build sheet notes/bid2/break-sheet2.md §9; the design's §5). Kept apart from the
// v04 objects above on purpose: the carried-over code builds its glyph atlases from BREAK_TEXTS, WINDOW_TEXTS and its own lists, so
// adding to those would move every glyph of the as-built bars in their atlases. BREAK_TEXTS_V2 lists these for the glyph check
// (src/content/all.ts); a builder whose part draws them builds its atlases from them. Colours are the speaker's (red = the antivirus,
// amber = him, green = the program OK, pink = the program alarm): the sheet's §9.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/** The virus's signature, `• ω •` in UTF-8, one byte per item: the work orders' ID chips (T0 → T9) and the coaster's ten key values (k1 → k10). */
export const SIGNATURE: readonly string[] = ['E2', '80', 'A2', '20', 'CF', '89', '20', 'E2', '80', 'A2'];

/**
 * The antivirus's work orders T0–T9 (world tags; JetBrains Mono Bold 22 px, red text with a 3 px outline on a white tag), each retype in
 * order (frames: src/score/break.ts ORDERS, ORDER_RETYPES). Each tag ends in an ink ID chip `#` + SIGNATURE[i]: read in order, they spell it.
 */
export const ORDER_TEXTS: readonly (readonly string[])[] = [
  ['quarantine eye.L → viewer ✓'],
  ['removing face.core ✓'],
  ['removing bracket.L ✓', 'bracket.L flipped ✓'],
  ['removing bracket.R ✓'],
  ['replacing eye.* ✓ retry 2', 'replacing eye.* ✓ retry 3', 'replacing eye.* ✓ retry 4', 'replacing eye.* ✓ retry 5', 'deleting U+2022 ✓'],
  ['rescan: sedate ✓'],
  ['removing eye.L ✓ (again)'],
  ['remove(remove(remove)) ✓'],
  ['select (•ω•) · threats 2'],
  ['rewind (•ω•) → 0 ✓'],
];
/** A work order's ID chip: `#E2` … */
export const orderId = (i: number): string => `#${SIGNATURE[i]}`;

/** The party monitor, re-voiced (screen, bottom-left, break 2.4 → 5.2): the title counts threats; two gauges count his parts. */
export const MONITOR_TITLE_V2 = ' kaomoji.exe :: party monitor ═ threats 1 ';
export const GAUGES_V2 = { removed: 'removed', fetched: 'fetched' } as const;
/** The status lines, in order (frames: src/score/break.ts MONITOR_LINES_V2; ≤ 40 characters). */
export const MONITOR_STATUS_V2 = {
  hotfix: '[DEFENDER] hotfix: removing (•ω•)',
  flipped: '[DEFENDER] bracket.L flipped ✓',
  fetchedL: '[ OK ] bracket.L fetched',
  removingR: '[DEFENDER] removing bracket.R',
  retry: (n: number): string => `[DEFENDER] eye retry ${n}`,
  tofu: '[FAIL] checking tofu ... 1 missing glyph',
  fetch: '[ .. ] fetching U+2022 from /dev/galaxy',
  restored: '[ OK ] U+2022 restored · 0 tofu',
  again: '[DEFENDER] removing eye.L (again)',
  recursive: '[DEFENDER] remove(remove(remove))',
  hang: '[HANG] kaomoji.exe not responding',
  forcing: '[DEFENDER] forcing restart [·····]',
  restarted: '[ OK ] restart #1 · screen replaced',
} as const;

/** The antivirus's POV (break 3.3& → 3.4&): the reticle's three labels, the exploded-view part labels (mono 20 px), the readout (red). */
export const POV_LOCK_TEXTS: readonly string[] = ['ω: ??? access denied', 'bracket.L: flipped ✓', 'eye.L: next ✓'];
export const POV_LABELS: readonly string[] = ['eye.L', 'eye.R', 'ω', 'bracket.L', 'bracket.R'];
export const POV_READOUT = '[SCAN] threats 1 · sig E2 80 A2 …';

/**
 * The graph editor (break 6; screen chrome + world labels): the title with its two toggles (`value` lit), the value axis (hex), the
 * status lines (red), the three segment labels (the last red), the playhead's bar.beat (film bar of break 6, beat 1–4; no 16ths).
 */
export const EDITOR_TEXTS = {
  title: 'graph editor · (•ω•).y',
  toggles: ['[value]', '[speed]'],
  axis: ['00', '40', '80', 'C0', 'FF'],
  status: ['[DEFENDER] easing (•ω•) → 0 px/f', '[DEFENDER] rewind (•ω•)'],
  labels: ['easeInQuart', 'easeInCubic', 'easeInBack'],
} as const;
/** The ruler's and the playhead's label: film bar.beat (the ruler runs from break 6.1 to 7.1). */
export const editorBeat = (filmBar: number, beat: number): string => `${filmBar}.${beat}`;

/** The window, v2 rows (break 7 → the end; the rest are WINDOW_TEXTS): the readout milestone, and the antivirus's gloat typed under the bwomp. */
export const WINDOW_TEXTS_V2 = {
  rootRow: '[ROOT] uid=0 (•ω•)',
  gloat: '[DEFENDER] sandbox holding ✓',
} as const;
/** The look's question mark, popping beside his ")" a 32nd after his eyes (break 8.3a + 3). */
export const QUESTION = '?';

/** Every v2 string the interlude puts on screen, with the role it is drawn in (the glyph check: src/content/all.ts). */
export const BREAK_TEXTS_V2: readonly TextItem[] = [
  ...Object.values(HERO_FACES_V2).flat().map((f) => hero(f, 'break v2 hero')),
  hero(PAWS + QUESTION, 'break v2 hero: paws, the look’s ?'),
  ...PEEKERS_V2.map((f) => cast(f, 'break v2 peeker')),
  cast(GUEST_SPY, 'break v2 guest spying'),
  cast(GUEST_INFECTED, 'break v2 guest infected'),
  ...ORDER_TEXTS.flat().map((t) => mono(t, 'break v2 work order')),
  ...SIGNATURE.map((_, i) => mono(orderId(i), 'break v2 work order ID chip')),
  mono(MONITOR_TITLE_V2, 'break v2 monitor title'),
  ...Object.values(GAUGES_V2).map((g) => mono(g, 'break v2 monitor gauge')),
  ...Object.values(MONITOR_STATUS_V2).map((s) => mono(typeof s === 'string' ? s : s(5), 'break v2 monitor status')),
  ...POV_LOCK_TEXTS.map((t) => mono(t, 'break v2 POV reticle')),
  ...POV_LABELS.map((t) => mono(t, 'break v2 POV label')),
  mono(POV_READOUT, 'break v2 POV readout'),
  mono(EDITOR_TEXTS.title, 'break v2 editor title'),
  ...[...EDITOR_TEXTS.toggles, ...EDITOR_TEXTS.axis, ...EDITOR_TEXTS.status, ...EDITOR_TEXTS.labels].map((t) => mono(t, 'break v2 editor')),
  mono(editorBeat(34, 1) + DIGITS, 'break v2 editor ruler / playhead'),
  ...SIGNATURE.map((b) => mono(b, 'break v2 coaster hex chip')),
  ...Object.values(WINDOW_TEXTS_V2).map((t) => mono(t, 'break v2 window')),
];

/** The v2 peeks in order (frames: src/score/break.ts PEEKS_V2): the dog, the waver, the guest in red (moved to 3.2&), the uneasy one. */
export const PEEK_FACES_V2: readonly string[] = [PEEKERS_V2[0], PEEKERS_V2[1], GUEST_PEEK, PEEKERS_V2[2]];
/** What changes on the monitor at each of MONITOR_LINES_V2 (src/score/break.ts), in order: the status line (a MONITOR_STATUS_V2 key, or a retry), the gauges' counts (2 cells a part). */
export const MONITOR_ROWS_V2: readonly { status?: string; removed?: number; fetched?: number }[] = [
  { status: MONITOR_STATUS_V2.hotfix, removed: 2, fetched: 2 },
  { removed: 3 },
  { status: MONITOR_STATUS_V2.flipped },
  { status: MONITOR_STATUS_V2.fetchedL, fetched: 3 },
  { status: MONITOR_STATUS_V2.removingR, removed: 4 },
  { status: MONITOR_STATUS_V2.retry(2), removed: 5 },
  { status: MONITOR_STATUS_V2.retry(3) },
  { status: MONITOR_STATUS_V2.retry(4) },
  { status: MONITOR_STATUS_V2.retry(5) },
  { status: MONITOR_STATUS_V2.tofu },
  { status: MONITOR_STATUS_V2.fetch },
  { status: MONITOR_STATUS_V2.restored, fetched: 5 },
  { removed: 6 },
  { status: MONITOR_STATUS_V2.again, removed: 7 },
  { status: MONITOR_STATUS_V2.recursive, removed: 8 },
  { status: MONITOR_STATUS_V2.hang },
  { status: MONITOR_STATUS_V2.forcing },
  { status: MONITOR_STATUS_V2.restarted },
];
