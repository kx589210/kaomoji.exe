// What the comic club "INK" draws (the part 'club', its 6 bars): every on-screen string, for scripts/check-glyphs.mjs and for the club's
// shots to import (strings live here; the shots import them, never the other way round). Build sheet notes/b58/club-sheet.md §8,
// design notes/club3/final.md §2.2, §6, §7.4. Roles are the faces the club draws them in (check-glyphs tests each character against
// its role's stack only): kaomoji, balloons and the hero in M PLUS Rounded 1c ExtraBold (`rounded`); the lettering (SFX) in Noto Sans JP
// Black (`jp`); the caption, the tagline and the FREE flag in Space Grotesk Bold (`ui`); the masthead and the page number in Inter Tight
// Black (`display`); the system's voice inside the comic (the scan balloon, the tags, the stamp, the hex, the indicia) and the party
// monitor in JetBrains Mono (`mono`). The numbers in the copy are the film's own (the issue is the club's first film bar, the page its
// last), so they stay true if the map moves.
import { partBar } from '../score/film.ts';
import { CAT_INK, CROWD, DARK_EYES, FLEXER, GIRL, GUEST_INK, HERO_INK, LENS_FACES, MARKS, REACTIONS, RINGS } from './castClub.ts';
import type { TextItem } from './text.ts';

// ——— The signature (threads.md (b) row 6) ————————————————————————————————————————————————————————————————————————————————————————

/** His bytes: `• ω •` in UTF-8, upper-case hex one space apart (E2 80 A2 20 CF 89 20 E2 80 A2). Printed, never decoded, in the club. */
export const SIGNATURE = [...new TextEncoder().encode('• ω •')].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

// ——— The comic's lettering (design §2.2: at most 1 tier A, 2 tier B, 2 tier C a bar) ——————————————————————————————————————————————

/** The sound effects, Noto Sans JP Black, one letter at a time on its drum; `brrr` gets one letter per roll hit (14). */
export const LETTERING = {
  /** Club 1.3 out of the floor (A); the bands on 2.1 (A) and 2.3 + flam (B); the record on 3.1 (A) and 3.3 (B); mirrored in the lens on 4.3 (C, reads MOOB). */
  boom: 'BOOM',
  /** Club 4.1, heard from the bar: outline only, 30 % (B). */
  boomMuffled: 'boom',
  /** Club 1.4 and 2.2 in burst balloons (B). */
  clap: 'CLAP!',
  /** Club 1.1& and 3.1& / 3.3& (C). */
  tss: 'tss',
  /** Club 2.3&, red: the spark on the guest's sunglasses (C). */
  ting: 'ting!',
  /** Club 2.4&: stamped round the inset's rim, one letter a frame; the dive passes through it (C). */
  wikka: 'WIKKA-WIKKA',
  /** Club 5.1 at the impact star (B). */
  clink: 'CLINK!',
  /** Club 5.1&, arched between them (A). */
  splash: 'SPLASH!',
  /** Club 6.1 → 6.3: one letter per roll hit, growing (B). */
  brrr: `B${'R'.repeat(13)}`,
} as const;

// ——— The cover, the caption, the props ——————————————————————————————————————————————————————————————————————————————————————————

/** Club 1.3e–1.3a: the corner box (masthead, issue line, barcode with his bytes) and the tagline ribbon. */
export const COVER = {
  masthead: 'KAOMOJI.EXE',
  issue: `No. ${partBar('club')} · 150 BPM`,
  tagline: 'THE VIRUS THAT DANCED!',
} as const;
/** Club 4.1: the one MEANWHILE (LEMON box, Space Grotesk Bold caps). */
export const CAPTION = 'MEANWHILE, AT THE BAR…';
/** The honeypot's flag on the cherry pick. */
export const FREE_FLAG = 'FREE';
/** Club 4.2 → 4.4: the guest's thought balloon: `[SCAN]` and eight cells, one filled per scanner tick, `1 threat` on the LOCK. */
export const SCAN_CELLS = 8;
export const scanBalloon = (filled: number): string => `[SCAN] ${'▓'.repeat(Math.min(SCAN_CELLS, filled))}${'░'.repeat(Math.max(0, SCAN_CELLS - filled))}`;
export const SCAN_LOCKED = '[SCAN] 1 threat';
/** Club 4.3: the red tag on each carrier the reticle hops to. */
export const CARRIER = 'carrier';
/** Club 5.3: the quarantine stamp and its serial (U+2022 is his •: a hint, not a decode). */
export const STAMP = '[QUARANTINE] (•ω•)';
export const SERIAL = 'QRN-0x2022';
/** The receding page's foot: the indicia (with his bytes) and the page number, the club's last film bar. */
export const INDICIA = `KAOMOJI.EXE · VOL.1 No.${partBar('club')} · PRINTED IN RAM · ${SIGNATURE}`;
export const PAGE_NUMBER = String(partBar('club', 6));

// ——— The party monitor (threads.md (c), rows 23.2–26.4; the box and its rows as src/shots/hud.ts draws them) ————————————————————————————

/** The warning line under the box, by id (src/score/club.ts READOUT_WARNINGS times them). `fatal` is word for word hud.ts's last warning: the break's falling monitor reads it. */
export const READOUT_LINES = {
  cuteness: '[WARN] cuteness exceeds safe limits',
  scanFloor: '[SCAN] dance floor … threats: ∞',
  honeypot: '[WARN] honeypot triggered',
  quarantine: '[QUARANTINE] (•ω•)',
  fatal: '[FATAL] screen integrity 0%',
} as const;
/** The box's rows (friends ∞; memory and cpu gauges, filled with the ASCII face's density ramp: src/shots/hud.ts meter()). */
export const READOUT_ROWS = ['friends  ∞', 'memory   ', 'cpu      '] as const;

// ——— Atlases and the glyph check ——————————————————————————————————————————————————————————————————————————————————————————————

/** Every face the club draws in its kaomoji type: the friends as printed (the girl and the flexer also before their infection), the hero, the guest, the cat, the marks, the eye pairs, the spark's ω. */
export const FACES: readonly string[] = [
  ...new Set([
    ...CROWD.map((f) => f.infected),
    GIRL.host,
    GIRL.infected,
    FLEXER.host,
    FLEXER.infected,
    ...RINGS.map((r) => r.friend.infected),
    ...LENS_FACES.map((f) => f.infected),
    ...REACTIONS.map((f) => f.infected),
    ...Object.values(HERO_INK).flat(),
    ...Object.values(GUEST_INK),
    CAT_INK,
    ...MARKS,
    ...DARK_EYES,
    'ω',
  ]),
];
/** The system voice inside the comic (mono, drawn on paper). */
export const SYSTEM_TEXTS: readonly string[] = [COVER.issue, SIGNATURE, ...Array.from({ length: SCAN_CELLS + 1 }, (_, n) => scanBalloon(n)), SCAN_LOCKED, CARRIER, STAMP, SERIAL, INDICIA];

const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');

/**
 * The club's atlases: what each holds and the type it is cut in (src/scenes/clubInk.ts builds them once). `face`, `sfx`, `ui`, `display`
 * and `mono` are drawn into the picture; `readout` is the party monitor's screen overlay (as src/scenes/hud.ts, weight 600).
 */
export const INK_ATLASES = {
  face: { role: 'rounded', weight: 800, chars: chars(FACES) },
  sfx: { role: 'jp', weight: 900, chars: chars(Object.values(LETTERING)) },
  ui: { role: 'ui', weight: 700, chars: chars([COVER.tagline, CAPTION, FREE_FLAG]) },
  display: { role: 'display', weight: 900, chars: chars([COVER.masthead, PAGE_NUMBER]) },
  mono: { role: 'mono', weight: 800, chars: chars(SYSTEM_TEXTS) },
  readout: { role: 'mono', weight: 600, chars: chars([...Object.values(READOUT_LINES), ...READOUT_ROWS, 'kaomoji.exe :: party monitor', ' .:-=+*#%@', '0123456789%', '╔═╗║╚╝']) },
} as const;
export type InkAtlasId = keyof typeof INK_ATLASES;

/** Every string the club puts on screen, with the role it is drawn in. */
export const CLUB_INK_TEXTS: readonly TextItem[] = [
  ...FACES.map((text): TextItem => ({ role: 'rounded', text, where: 'club: faces, marks and eyes' })),
  ...Object.values(LETTERING).map((text): TextItem => ({ role: 'jp', text, where: 'club: lettering' })),
  ...[COVER.tagline, CAPTION, FREE_FLAG].map((text): TextItem => ({ role: 'ui', text, where: 'club: tagline, caption, flag' })),
  ...[COVER.masthead, PAGE_NUMBER].map((text): TextItem => ({ role: 'display', text, where: 'club: masthead, page number' })),
  ...SYSTEM_TEXTS.map((text): TextItem => ({ role: 'mono', text, where: 'club: the system voice' })),
  ...[...Object.values(READOUT_LINES), ...READOUT_ROWS].map((text): TextItem => ({ role: 'mono', text, where: 'club: the party monitor' })),
];
