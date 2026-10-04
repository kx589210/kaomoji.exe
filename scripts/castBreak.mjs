// Casts the break, THE INTERLUDE (break bars 1–8), from its build sheet (notes/bid2/break-sheet2.md §8; design
// notes/extend/interlude-final.md §9). Two layers, as in src/score/break.ts:
//   - v04: the as-built picks (notes/break/break-sheet.md §6), exported unchanged — the carried-over code draws them;
//   - v2: the design's — the hero's new expressions (the coaster, the slingshot, the fake drop, the look ( ・ω・)?), the guest spying and
//     infected, the peekers without the two cut for clutter. BREAK_CAST is the v2 cast (every face the finished interlude draws), for the
//     other sections to exclude and the curtain call to credit.
// The faces are picked by hand for their moment, and this script checks every pick before writing src/content/castBreak.ts:
//   - every friend (peekers, shocked faces, dancers) is a face of docs/reference/kaomoji-collection.json that draws (`renders`), in
//     the type it is drawn in (Noto Sans JP Black, the `jp` stack), with no combining marks;
//   - many different faces: none twice in the break, and none anywhere else in the film — every face-like string literal in src/ and
//     scripts/ outside the break's own files (and the retired v04 drop 1) counts, both ways (the face inside a literal, a literal inside
//     the face), NFKC with whitespace stripped. Only the hero, the guest and the cat come back on purpose, plus the system's own faces
//     (the boot log's warning face, the named friend cheering `access granted`: both kept, 2026-10-01), the curtain call's
//     headliners (the ending reprints one face per world, the interlude's first peeker among them) and drop 2's spares;
//   - every face the hero wears keeps his ω, never winks (the film's one wink is the ending's), and draws in his type (M PLUS Rounded,
//     the `rounded` stack); faces with combining accents are drawn without them (his brows ˋ ˊ drop in as their own glyphs);
//   - the guest's faces draw in the cast's type (`jp`); the system's faces in the terminal's (`mono`).
// It throws on the first failure and writes nothing. Re-run it whenever another section casts: a collision it then reports is a recast
// there (the interlude's picks are the approved v04 ones).
//   node scripts/castBreak.mjs [--print]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCoverage } from './lib/cmap.mjs';
import { readCollection } from './lib/collection.mjs';

const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FONT_FILES, STACKS } = await import('../src/engine/fonts.ts');
const collection = readCollection(KX);
const entry = new Map(collection.map((e) => [e.face, e]));

const byFamily = new Map();
for (const f of FONT_FILES) {
  const cov = readCoverage(fs.readFileSync(path.join(KX, 'public', f.file)));
  byFamily.set(f.family, new Set([...(byFamily.get(f.family) ?? []), ...cov]));
}
const SPACE = new Set([0x20, 0x3000]);
/** Every character of `face` is in some family of `role`'s stack. */
const draws = (face, role) => [...face].filter((c) => !SPACE.has(c.codePointAt(0))).every((c) => STACKS[role].some((fam) => byFamily.get(fam)?.has(c.codePointAt(0))));
/** No combining marks, variation selectors or joiners: the atlas places characters one by one. */
const plain = (face) => [...face].every((c) => !/[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︀-️︠-︯​-‏]/u.test(c));
/** The identity of a face: NFKC with whitespace stripped. */
const key = (face) => face.normalize('NFKC').replace(/\s/gu, '');
const fail = (why) => {
  throw new Error(`castBreak: ${why}`);
};

// ——— The picks, v04 (break-sheet §6): as built, drawn by the carried-over code ——————————————————————————————————————————————————————

/** The faces (•ω•) wears in the break, and where each comes from (a collection face, or the film's own). */
const HERO = {
  /** club 3.4 → break 2.3: on the glass, falling, slapped flat in pieces (the film's own HERO.dying). */
  dying: { face: '(×ω×)', from: null },
  /** break 2.3: the iris locks — pain. */
  pain: { face: '(>ω<)', from: 'o(>ω<)o' },
  /** break 3.3: the wrong bracket — dizzy; ＠ eyes from (＠_＠) on his ω. */
  dizzy: { face: '(＠ω＠)', from: '(＠_＠)' },
  /** break 4.2: the re-roll, one eye pair per 32nd, from (◎_◎;), (⊙_⊙), (●_●) and (×_×): four shapes that read apart at a glance (double ring, ring and dot, solid, cross; ☉ was ⊙'s twin, R1-14). */
  reroll: { face: ['(◎ω◎)', '(⊙ω⊙)', '(●ω●)', '(×ω×)'], from: ['(◎_◎;)', '(⊙_⊙)', '(●_●)', '(×_×)'] },
  /** break 4.2&: the re-roll stops on tofu — his left eye •, his right a drawn tofu box tagged 20 22 (never a missing glyph). */
  tofu: { face: '(•ω•)', from: null },
  /** break 4.3 → 5.1&: dazed, restarting. */
  dazed: { face: '(－ω－)', from: '(－ω－) zzZ' },
  /** break 5.1&: awake (the film's PROTAGONIST). */
  awake: { face: '(•ω•)', from: null },
  /** break 5.2: the fan. */
  starstruck: { face: '(☆ω☆)', from: '(☆ω☆)' },
  /** break 5.3: he waves and tosses a ☆ off the frame (the sheet's wink, replaced: one wink in the whole film). */
  wave: { face: '(⌒ω⌒)ﾉ', from: '(⌒ω⌒)ﾉ' },
  /** break 5.4: the ripple. */
  squee: { face: '(*≧ω≦*)', from: '(*≧ω≦*)' },
  /** break 6.1–6.2 (v2: break 7.1–7.2): (ง•̀ω•́)ง✧ — drawn without its accents; the brows ˋ ˊ drop in on 6.1e and 6.1&. */
  ready: { face: '(ง•ω•)ง✧', from: '(ง•̀ω•́)ง✧' },
  /** break 6.3–6.4 (v2: break 7.3–7.4): ─=≡Σ((( つ•̀ω•́)つ — the same brows. */
  zoom: { face: '─=≡Σ((( つ•ω•)つ', from: '─=≡Σ((( つ•̀ω•́)つ' },
};
/** His brows, from ⸜(*ˊᗜˋ*)⸝: spacing letters, so the engine can place them (it cannot position U+0300 / U+0301). */
const BROWS = ['ˋ', 'ˊ'];
const BROW_SOURCE = '⸜(*ˊᗜˋ*)⸝';

/** One at a time, slid out from behind a block's edge or the frame's: break 2.4& (dog), 3.1& (waves), 3.4& (uneasy), 4.2& (behind a wall), 4.3& (worried). */
const PEEKERS = ['▼・ᴥ・▼', '( ° ∀ ° )ﾉﾞ', '(・_・;)', '┬┴┬┴┤(･_├┬┴┬┴', '(´･_･`)'];
/** break 4.4: the gasp — four at once, popping out from behind the blocks. */
const SHOCKED = ['(」゜ロ゜)」', '＼(º □ º l|l)/', '／(=☉ x ☉=)＼', 'ʕ ˵• ₒ •˵ ʔ'];
/** Break bar 5, on the block tops, in order of appearance: coral (5.2 pair, 5.3 pair, 5.4 pair), mint (5.2 pair — swapping places on 5.3 — then 5.4's), yellow (5.2, then 5.3 on). */
const DANCERS = {
  coral: ['♪(┌・。・)┌', '┌(★o☆)┘', '⁽⁽◝( • ω • )◜⁾⁾', '✺◟( • ω • )◞✺', '┐(︶▽︶)┌', '╮(︶▽︶)╭'],
  mint: ['└(＾＾)┐', '┌(＾＾)┘', '₍₍ (ง ˘ω˘ )ว ⁾⁾', 'ʚ(｡˃ ᵕ ˂ )ɞ'],
  yellow: ['♪♪♪ ヽ(ˇ∀ˇ )ゞ', '⸜( *ˊᵕˋ* )⸝'],
};
/** Recur on purpose: the cocktail guest (v04: guilty, peeking in red on break 3.3&; forgiven, waving back on break 5.4) and the Riso cat (dancing on the violet block). */
const GUEST_PEEK = '|_￣))';
const GUEST_WAVE = '(￣▽￣)ノ';
const CAT = '(=^･ω･^=)';
/** The system's own faces (the window, E5): the boot log's warning face on the dialog, and the named friend (spec §4) cheering `access granted` (director's ruling 5). Both kept (2026-10-01). */
const DIALOG_FACE = '(；・∀・)';
const GRANTED_FACE = 'ヽ(°〇°)ﾉ';

// ——— The picks, v2 (design §9): the hero's new expressions, the guest spying and infected, the peekers de-cluttered ———————————————————

/** His faces in the new and changed beats (all his own expressions: the one-face rule exempts the hero). `from`: the collection face it is taken from (verbatim when equal). */
const HERO_V2 = {
  /** break 5.4& → 6.1: selected ("uh-oh"), seated at the top of the track (the re-roll's ⊙ eyes; carried across C6 pixel-identical). */
  seated: { face: '(⊙ω⊙)', from: '(⊙ω⊙)' },
  // The design's (★ω★), (｀・ω・´), (✧ω✧) and (´⊙ω⊙`)！ are the cosmos's (its ream and slips, castCosmos.ts): no face twice in the film,
  // so the coaster's faces are his own constructions from them (sheet §8.2; logged in §4.4).
  /** break 6.1a and 6.3e: arms up, the coaster pose — \(★ω★)/ with sparkles ✦ for its stars. */
  armsUp: { face: '\\(✦ω✦)/', from: '\\(★ω★)/' },
  /** break 6.2e: the lift hill — determined: his own •ω• under the ｀ ´ of (｀・ω・´). */
  lift: { face: '(｀•ω•´)', from: '(｀・ω・´)' },
  /** break 6.3: airtime on the crest — (✧ω✧)'s sparkle eyes as ✪. */
  airtime: { face: '(✪ω✪)', from: '(✧ω✧)' },
  /** break 6.4e: the elastic rattle — his eyes swap ✦ ↔ ⊙ every 3 frames. */
  rattle: { face: ['(✦ω✦)', '(⊙ω⊙)'], from: ['\\(★ω★)/', '(⊙ω⊙)'] },
  /** break 6.4& → 6.4a: rewound (carried backward down the hook) — his panic eyes ⊙ with a shock mark. */
  rewound: { face: 'Σ(⊙ω⊙)', from: '(´⊙ω⊙`)！' },
  /** break 8.1 → 8.3: frontal, fists up, aimed at you — (ง•̀ω•́)ง without the ✧, drawn without its accents (his BROWS). */
  frontal: { face: '(ง•ω•)ง', from: '(ง•̀ω•́)ง✧' },
  /** break 8.3 → 8.3e: flying at the camera (the speed lines of ε===(っ≧ω≦)っ dropped). */
  flying: { face: '(っ≧ω≦)っ', from: 'ε===(っ≧ω≦)っ' },
  /** break 8.3e → 8.3a: squashed into the film; his っ っ splayed flat on it (PAWS). */
  squashed: { face: '(≧ω≦)', from: 'ε===(っ≧ω≦)っ' },
  /** break 8.3a → 8.4&: THE LOOK (2026-10-01): verbatim, the ? popping a 32nd later. */
  look: { face: '( ・ω・)?', from: '( ・ω・)?' },
  /** break 8.4& → the end: he gets it — (•ω•) with the brows ˋ ˊ dropping in: (•̀ω•́). */
  getsIt: { face: '(•ω•)', from: null },
};
/** His hands, splayed flat on the film from the splat (break 8.3e) to the end: two っ, drawn on their own (they never turn with his head). */
const PAWS = 'っ';
/** The peekers of v2, in order: the dog (2.4&), the waver (3.1&), the uneasy one (3.4&); the guest peeks third (3.2&). v04's 4.2& and 4.3& peekers are cut (clutter) and released for other sections. */
const PEEKERS_V2 = PEEKERS.slice(0, 3);
const RELEASED = PEEKERS.slice(3);
/** The guest, the antivirus's avatar (v2, break 5.3 → 5.4&): spying beside the cat (em 112), then infected — his ▽ flipped to an amber ω, waving once. */
const GUEST_SPY = '(￣▽￣)';
const GUEST_INFECTED = '(￣ω￣)ノ';

// ——— The checks ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const friends = [...PEEKERS, ...SHOCKED, ...Object.values(DANCERS).flat()];
const seen = new Map();
for (const f of friends) {
  const e = entry.get(f);
  if (!e) fail(`${f} is not in the collection`);
  if (!e.renders) fail(`${f} does not render`);
  if (!plain(f)) fail(`${f} has combining marks`);
  if (!draws(f, 'jp')) fail(`${f} does not draw in the jp stack`);
  if (/[凸🖕︻═]/u.test(f)) fail(`${f} is rude`);
  if (seen.has(key(f))) fail(`${f} repeats ${seen.get(key(f))}`);
  seen.set(key(f), f);
}
for (const f of [GUEST_PEEK, GUEST_WAVE, CAT, GUEST_SPY]) {
  if (!entry.get(f)?.renders) fail(`${f} is not a face of the collection that draws`);
  if (!draws(f, 'jp')) fail(`${f} does not draw in the jp stack`);
}
if (!draws(GUEST_INFECTED, 'jp') || !GUEST_INFECTED.includes('ω') || key(GUEST_INFECTED.replace('ω', '▽')) !== key(`${GUEST_SPY}ノ`)) fail(`${GUEST_INFECTED}: the guest's own face, his ▽ swapped for an ω, drawn in the jp stack`);
for (const [name, h] of [...Object.entries(HERO), ...Object.entries(HERO_V2)]) {
  const faces = [h.face].flat();
  const from = [h.from].flat();
  for (const f of faces) {
    if (!f.includes('ω')) fail(`${name}: ${f} has no ω`);
    if (!plain(f)) fail(`${name}: ${f} has combining marks`);
    if (!draws(f, 'rounded')) fail(`${name}: ${f} does not draw in the rounded stack`);
    if (entry.get(f)?.moods.includes('wink & smug')) fail(`${name}: ${f} winks`);
  }
  for (const s of from) if (s !== null && !entry.get(s)?.renders) fail(`${name}: its source ${s} is not a face of the collection that draws`);
}
if (!draws(PAWS, 'rounded') || !draws('?', 'rounded')) fail('his paws and the ? draw in the rounded stack');
if (!entry.get(BROW_SOURCE)?.renders || !BROWS.every((b) => BROW_SOURCE.includes(b) && draws(b, 'rounded'))) fail('the brows');
for (const f of [DIALOG_FACE, GRANTED_FACE]) if (!draws(f, 'mono')) fail(`${f} does not draw in the mono stack`);

// ——— None anywhere else in the film ————————————————————————————————————————————————————————————————————————————————————————————————

/** The break's own files (skipped when looking for its faces elsewhere) and the retired v04 drop 1 (the cosmos and the club replace it). */
const OWN = (rel) =>
  /^src\/(score|content)\/(break|castBreak)\.ts$/u.test(rel) ||
  /^src\/(scenes|shots)\/break[^/]*\.ts$/u.test(rel) ||
  /^scripts\/(castBreak\.mjs|audio\/(sections\/break\.mjs|breakVoices\.mjs))$/u.test(rel);
const RETIRED = new Set(['src/content/castDrop1.ts', 'src/content/drop1.ts', 'src/shots/kosmos.ts', 'src/shots/voyage.ts', 'src/shots/burst.ts', 'src/shots/galaxies.ts', 'src/shots/lines.ts', 'src/shots/glass.ts', 'scripts/cast.mjs']);
/** A cast script whose generated file exists is read through that file (its comments and reasons are not the cast). */
const generated = (rel) => {
  const m = /^scripts\/cast(\w+)\.mjs$/u.exec(rel);
  return m !== null && fs.existsSync(path.join(KX, 'src', 'content', `cast${m[1]}.ts`));
};
/** The string literals of a source file, comments skipped. */
function literals(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i + 2);
      i = i < 0 ? src.length : i + 2;
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') {
          s += src[j + 1] ?? '';
          j += 2;
        } else {
          if (c !== '`' && src[j] === '\n') break;
          s += src[j++];
        }
      }
      out.push(s);
      i = j + 1;
    } else i++;
  }
  return out;
}
const found = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(path.join(KX, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|mjs)$/u.test(e.name) && !OWN(rel) && !RETIRED.has(rel) && !generated(rel)) {
      for (const text of literals(fs.readFileSync(path.join(KX, rel), 'utf8'))) found.push({ text, file: rel });
    }
  }
};
walk('src');
walk('scripts');
const faceKeys = new Set(collection.map((e) => key(e.face)));
/** A literal counts as a face if it is one of the collection's, or a bracketed non-ASCII string; at least 4 characters either way. */
const elsewhere = found.map((l) => ({ ...l, key: key(l.text) })).filter((l) => l.key.length >= 4 && (faceKeys.has(l.key) || (/[()（）ʕʔ]/u.test(l.key) && /[^\x00-\x7f]/u.test(l.key))));
/** The faces that come back on purpose: the guest's and the cat's, the system's two, the curtain call's headliners, drop 2's spares. */
const OUTRO = await import('../src/content/outro.ts');
const D2 = await import('../src/content/castDrop2.ts');
const recurring = new Set([GUEST_PEEK, GUEST_WAVE, GUEST_SPY, GUEST_INFECTED, CAT, DIALOG_FACE, GRANTED_FACE, ...(OUTRO.HEADLINERS ?? []).map((h) => h.face), ...(D2.SPARES ?? [])].map(key));
/** His own face (•ω•) in any form is his, wherever it is printed (the infected dancers wear it inside theirs). */
const isHero = (k) => /•ω•/u.test(k);
const usedElsewhere = (face) => elsewhere.find((l) => !recurring.has(l.key) && !isHero(l.key) && (l.key.includes(key(face)) || key(face).includes(l.key)));
for (const f of [...PEEKERS_V2, ...SHOCKED, ...Object.values(DANCERS).flat()]) {
  const hit = usedElsewhere(f);
  if (hit) fail(`${f} is already in the film: ${JSON.stringify(hit.text)} in ${hit.file}`);
}

// ——— The file ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const q = (s) => JSON.stringify(s);
const list = (faces) => `[${faces.map(q).join(', ')}]`;
const faces = (o) => Object.entries(o).map(([k, h]) => `  ${k}: ${Array.isArray(h.face) ? list(h.face) : q(h.face)},`).join('\n');
const heroAll = (o) => Object.values(o).flatMap((h) => [h.face].flat());
const v04 = [...new Set([...heroAll(HERO), ...friends, GUEST_PEEK, GUEST_WAVE, CAT, DIALOG_FACE, GRANTED_FACE])];
const v2 = [...new Set([...heroAll(HERO), ...heroAll(HERO_V2), ...PEEKERS_V2, ...SHOCKED, ...Object.values(DANCERS).flat(), GUEST_PEEK, GUEST_SPY, GUEST_INFECTED, CAT, DIALOG_FACE, GRANTED_FACE])];
const out = `// Generated by scripts/castBreak.mjs from the break's build sheet (notes/bid2/break-sheet2.md §8) — do not edit by hand; change
// the picks there and re-run it. The interlude's cast: many different faces, none twice in the break and none anywhere else in the film
// (NFKC, spaces aside), but the hero, the guest and the cat, who come back on purpose, and the system's own faces. Two layers, as in
// src/score/break.ts: the v04 exports (as built, drawn by the carried-over code) and the v2 ones (the design's).

// ——— v04 (as built) ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The faces (•ω•) wears in the break (his type: M PLUS Rounded). \`tofu\`: his right eye is a drawn tofu box tagged 20 22, never a missing glyph. \`ready\` and \`zoom\` are drawn without their accents: his BROWS drop in. */
export const HERO_FACES = {
${faces(HERO)}
} as const;
/** His brows, from ⸜(*ˊᗜˋ*)⸝, dropped over his eyes (v04: break 6.1e, left ˋ, and 6.1&, right ˊ; v2: 7.1e / 7.1& and 8.4& / 8.4& + 3). */
export const BROWS: readonly [string, string] = [${BROWS.map(q).join(', ')}];
/** The peekers of v04's break bars 2–4, in order of appearance (the guest peeks third: GUEST_PEEK). */
export const PEEKERS: readonly string[] = ${list(PEEKERS)};
/** The gasp of break 4.4: four at once. */
export const SHOCKED: readonly string[] = ${list(SHOCKED)};
/** Break bar 5's dancers per block, in order of appearance (break-sheet §4.9). */
export const DANCERS = {
${Object.entries(DANCERS).map(([k, v]) => `  ${k}: ${list(v)},`).join('\n')}
} as const;
/** The cocktail guest: guilty, peeking in red (v04 3.3&; v2 3.2&); v04: forgiven, waving back on break 5.4 (v2: spying, then infected). */
export const GUEST_PEEK = ${q(GUEST_PEEK)};
export const GUEST_WAVE = ${q(GUEST_WAVE)};
/** The Riso cat, dancing on the violet block. */
export const CAT = ${q(CAT)};
/** The system's faces in the window (E5), kept on purpose. */
export const DIALOG_FACE = ${q(DIALOG_FACE)};
export const GRANTED_FACE = ${q(GRANTED_FACE)};
/** Every face v04's break drew. */
export const BREAK_CAST_V04: readonly string[] = ${list(v04)};

// ——— v2 (the design) ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** His new faces (design §9.2): the coaster (seated, armsUp, lift, airtime, rattle, rewound), the fake drop (frontal, flying, squashed, look, getsIt). \`frontal\` and \`getsIt\` are drawn without accents: his BROWS drop in. \`look\` is ( ・ω・)?, its ? popping a 32nd after the eyes. */
export const HERO_FACES_V2 = {
${faces(HERO_V2)}
} as const;
/** His hands splayed flat on the film (break 8.3e → the end): two of these, drawn on their own. */
export const PAWS = ${q(PAWS)};
/** The peekers of v2, in order (the guest peeks third, on 3.2&: GUEST_PEEK). */
export const PEEKERS_V2: readonly string[] = ${list(PEEKERS_V2)};
/** v04's peekers cut from the interlude for clutter (design §9.3): released for other sections. */
export const RELEASED: readonly string[] = ${list(RELEASED)};
/** The guest spying beside the cat (break 5.3), then infected — his ▽ an amber ω — waving once (5.4e). */
export const GUEST_SPY = ${q(GUEST_SPY)};
export const GUEST_INFECTED = ${q(GUEST_INFECTED)};
/** Every face the interlude draws (v2), for the other sections' casts to exclude and the curtain call to credit. */
export const BREAK_CAST: readonly string[] = ${list(v2)};
`;
if (process.argv.includes('--print')) process.stdout.write(out);
else {
  fs.writeFileSync(path.join(KX, 'src', 'content', 'castBreak.ts'), out);
  console.log(`v04: ${v04.length} faces; v2: hero ${heroAll(HERO).length} + ${heroAll(HERO_V2).length} faces, ${PEEKERS_V2.length} peekers (${RELEASED.length} released), ${SHOCKED.length} shocked, ${Object.values(DANCERS).flat().length} dancers, the guest ×3, the cat, 2 system faces: ${v2.length} distinct, none elsewhere in the film`);
}
