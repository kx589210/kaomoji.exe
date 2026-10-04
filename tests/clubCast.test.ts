// The comic club INK's strings and cast (src/content/club.ts, src/content/castClub.ts, scripts/castClub.mjs; build sheet
// notes/b58/club-sheet.md §6–§8): his signature exact, the readout's lines verbatim from threads.md, every string on the glyph
// check's list in the role it is drawn in, and the cast — 26 friends each shown once in the film, infected as his ω, the file exactly
// what the cast script writes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { HAS_COLLECTION, NO_COLLECTION, readCollection } from './lib/collection.ts';
import { SCREEN_TEXTS } from '../src/content/all.ts';
import * as CAST from '../src/content/castClub.ts';
import * as BREAK from '../src/content/castBreak.ts';
import * as DROP1 from '../src/content/castDrop1.ts';
import * as DROP2 from '../src/content/castDrop2.ts';
import { CAPTION, CLUB_INK_TEXTS, COVER, FACES, INDICIA, INK_ATLASES, LETTERING, PAGE_NUMBER, READOUT_LINES, SCAN_CELLS, SCAN_LOCKED, SIGNATURE, STAMP, SERIAL, scanBalloon } from '../src/content/club.ts';
import { SIGNATURE as OUTRO_SIGNATURE } from '../src/content/outro.ts';
import { LOCK, ROLL, SCANNER_TICKS } from '../src/score/club.ts';
import { partBar } from '../src/score/film.ts';

const key = (face: string) => face.normalize('NFKC').replace(/\s/gu, '');
const collection = readCollection<{ face: string; renders: boolean }>();
const entry = new Map(collection.map((e) => [e.face, e]));
const FRIENDS = [...CAST.CROWD, CAST.GIRL, CAST.FLEXER, ...CAST.RINGS.map((r) => r.friend), ...CAST.LENS_FACES, ...CAST.REACTIONS];

test('his signature is • ω • in UTF-8, as every world prints it (the ending decodes the same bytes)', () => {
  assert.equal(SIGNATURE, 'E2 80 A2 20 CF 89 20 E2 80 A2');
  assert.equal(SIGNATURE, OUTRO_SIGNATURE);
  assert.ok(INDICIA.endsWith(SIGNATURE) && INDICIA.startsWith(`KAOMOJI.EXE · VOL.1 No.${partBar('club')} · PRINTED IN RAM`), 'the issue number is the club’s film bar');
  assert.ok(!INDICIA.includes('•') && !INDICIA.includes('ω'), 'never decoded in the club (rule 2: no • or ω beside the bytes)');
  assert.equal(SERIAL, 'QRN-0x2022', 'U+2022 is his •: a hint, not a decode');
});

test('the copy: the readout’s lines verbatim from threads.md (c), the stamp, the caption, the cover; the issue and page numbers are the club’s film bars', () => {
  assert.deepEqual({ ...READOUT_LINES }, {
    cuteness: '[WARN] cuteness exceeds safe limits',
    scanFloor: '[SCAN] dance floor … threats: ∞',
    honeypot: '[WARN] honeypot triggered',
    quarantine: '[QUARANTINE] (•ω•)',
    fatal: '[FATAL] screen integrity 0%',
  });
  assert.equal(STAMP, '[QUARANTINE] (•ω•)');
  assert.equal(CAPTION, 'MEANWHILE, AT THE BAR…');
  assert.deepEqual({ ...COVER }, { masthead: 'KAOMOJI.EXE', issue: `No. ${partBar('club')} · 150 BPM`, tagline: 'THE VIRUS THAT DANCED!' });
  assert.equal(PAGE_NUMBER, String(partBar('club', 6)));
  assert.equal(scanBalloon(0), '[SCAN] ░░░░░░░░');
  assert.equal(scanBalloon(SCANNER_TICKS.length), '[SCAN] ▓▓▓▓▓▓▓░', 'a cell a scanner tick …');
  assert.equal(SCANNER_TICKS.length + 1, SCAN_CELLS, '… and the eighth on the LOCK');
  assert.ok(LOCK > SCANNER_TICKS[SCANNER_TICKS.length - 1]);
  assert.equal(SCAN_LOCKED, '[SCAN] 1 threat');
  assert.equal(LETTERING.brrr.length, ROLL.length, 'BRRR: one letter per roll hit');
});

test('every string the club draws is on the glyph check’s list, in the role it is drawn in; every atlas holds exactly its role’s characters', () => {
  const listed = new Set(SCREEN_TEXTS.map((t) => `${t.role}|${t.text}`));
  for (const t of CLUB_INK_TEXTS) assert.ok(listed.has(`${t.role}|${t.text}`), `${t.role}: ${t.text}`);
  for (const [id, a] of Object.entries(INK_ATLASES)) {
    const covered = new Set(CLUB_INK_TEXTS.filter((t) => t.role === a.role).flatMap((t) => [...t.text]));
    for (const ch of a.chars) assert.ok(covered.has(ch) || '0123456789%╔═╗║╚╝ .:-=+*#@'.includes(ch) || id === 'readout', `${id}: ${ch}`);
  }
  assert.ok(FACES.length > 40);
});

test('26 friends, each a collection face that draws, printed infected — its mouth re-inked as his ω (or already wearing one) — none twice', () => {
  assert.equal(FRIENDS.length, 26);
  assert.deepEqual(FRIENDS.map((f) => f.n).sort((a, b) => a - b), Array.from({ length: 26 }, (_, i) => i + 1));
  const seen = new Set<string>();
  for (const f of FRIENDS) {
    if (HAS_COLLECTION) assert.ok(entry.get(f.host)?.renders, `${f.host}`);
    assert.ok(f.infected.includes('ω'), `${f.infected}`);
    assert.ok(!seen.has(key(f.infected)), `${f.infected} twice`);
    seen.add(key(f.infected));
    assert.ok(!/[￣⊙＞＜]|•\s*ω\s*•/u.test(f.infected), `${f.infected}: the guest's or the hero's eyes`);
  }
  assert.deepEqual(CAST.RINGS.map((r) => r.count), [6, 10, 16], 'the chorus lines repeat one face each, by design');
  assert.equal(CAST.DARK_EYES.length, 8);
  assert.equal(CAST.FEATURED[0], CAST.GIRL.infected, 'the curtain call’s club headliner');
});

test('no friend is cast anywhere else in the film’s cast lists (Drop 1, the break, drop 2); only the hero, the guest and the cat come back', () => {
  const strings = (mod: Record<string, unknown>) => Object.values(mod).flatMap((v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flat(3).filter((x) => typeof x === 'string') : v && typeof v === 'object' ? Object.values(v).flat(3).filter((x) => typeof x === 'string') : []));
  const others = new Set([DROP1, BREAK, DROP2].flatMap((m) => strings(m as Record<string, unknown>)).map(key));
  for (const f of FRIENDS) for (const face of new Set([f.host, f.infected])) if (face === f.infected || face === CAST.GIRL.host || face === CAST.FLEXER.host) assert.ok(!others.has(key(face)), `${face}`);
  assert.ok(others.has(key(CAST.CAT_INK)) && others.has(key(CAST.GUEST_INK.calm)), 'the cat and the guest are the recurring ones');
});

test('the cast file is what castClub.mjs writes (its checks — the collection, the font, the one-face rule across the whole film — pass)', { skip: NO_COLLECTION }, () => {
  const file = fs.readFileSync(new URL('../src/content/castClub.ts', import.meta.url), 'utf8');
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/castClub.mjs', import.meta.url)), '--print'], { encoding: 'utf8' });
  assert.equal(file, out);
});
