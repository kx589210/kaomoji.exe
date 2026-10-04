// Casts the comic club "INK" (club bars 1–6) from its build sheet (notes/b58/club-sheet.md §7; design notes/club3/final.md §9):
// the 26 friends are picked by hand for their moment — a crowd that cheers, a Lichtenstein girl, a Kirby flexer, three Busby Berkeley
// chorus lines, the carriers the antivirus tags, the reaction balloons — and this script checks every pick before writing
// src/content/castClub.ts:
//   - every friend is a face of docs/reference/kaomoji-collection.json that draws (`renders`); the face the club prints is the friend
//     infected — its mouth re-inked as his ω (`infected`: the face with each mouth glyph swapped for ω, spaces aside), or the face
//     itself when it already wears an ω;
//   - every face draws in the club's kaomoji type (M PLUS Rounded 1c ExtraBold and its fallbacks: the `rounded` stack), with no
//     combining marks (the atlas places characters one by one);
//   - no friend wears the guest's ￣ eyes (the antivirus's family; (￣ω￣) is saved for the interlude), the hero's panic eyes (⊙, ＞ ＜,
//     > … <) or his own •ω•;
//   - no face twice: none twice in the club (a Berkeley chorus line repeats one face on purpose), and none anywhere else in the film —
//     every face-like string literal in src/ and scripts/ outside the club's own files counts, both ways (the face inside a literal, a
//     literal inside the face), NFKC with whitespace stripped. Only the hero, the guest and the cat come back, on purpose;
//   - the eye pairs that are all that is left of the friends in the dark (club 5.2) are each a friend's own eyes.
// It throws on the first failure and writes nothing. Re-run it whenever another section casts (the cosmos's castCosmos.mjs, drop 2,
// the ending): a collision it then reports is a recast here or there.
//   node scripts/castClub.mjs [--print]
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
/** No combining marks, variation selectors or joiners. */
const plain = (face) => [...face].every((c) => !/[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︀-️︠-︯​-‏]/u.test(c));
/** The identity of a face: NFKC with whitespace stripped. */
const key = (face) => face.normalize('NFKC').replace(/\s/gu, '');
const fail = (why) => {
  throw new Error(`castClub: ${why}`);
};

// ——— The picks (build sheet §7) ————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The friends, by where they are seen. `host` is the collection face; the club prints `infected` (his ω on their mouth), which is the
 * host itself when it already wears an ω. `why` is the pick's reason.
 */
const FRIENDS = [
  // Club 1.2&, the splash crowd behind him on an arc, left to right (cast 7, 3, 4, 2, 5, 6, 9, 1, 8): NIGHT strokes, a PAPER keyline,
  // their only colour the amber ω.
  { n: 7, where: 'crowd', host: "☆⌒ヽ(*'､^*)chu", infected: "☆⌒ヽ(*'ω^*)chu", why: 'blowing a kiss' },
  { n: 3, where: 'crowd', host: 'ヽ( ˋ(ｴ)´ )ﾉ', infected: 'ヽ( ˋ(ω)´ )ﾉ', why: 'the bear' },
  { n: 4, where: 'crowd', host: '／(=⌒ x ⌒=)＼', infected: '／(=⌒ω⌒=)＼', why: 'the bunny, eyes closed in bliss' },
  { n: 2, where: 'crowd', host: '(ﾉ´ヮ`)ﾉ*: ･ﾟ', infected: '(ﾉ´ω`)ﾉ*: ･ﾟ', why: 'throwing sparkles' },
  { n: 5, where: 'crowd', host: 'ヽ(`д´*)ノ', infected: 'ヽ(`ω´*)ノ', why: 'arms up, fired up (replaces ( `ω´ ), a cosmos web node)' },
  { n: 6, where: 'crowd', host: '(ノ)`ω´(ヾ)', infected: '(ノ)`ω´(ヾ)', why: 'hands up, already ω' },
  { n: 9, where: 'crowd', host: '(｡・//ε//・｡)', infected: '(｡・//ω//・｡)', why: 'blushing' },
  { n: 1, where: 'crowd', host: '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', infected: '(ﾉ◕ω◕)ﾉ*:･ﾟ✧', why: 'throwing stars' },
  { n: 8, where: 'crowd', host: '(〃・ω・)つ由(＾ω＾〃)', infected: '(〃・ω・)つ由(＾ω＾〃)', why: 'a pair passing a gift, already ω' },
  // Club 2.1–2.2&, P1, the Lichtenstein close-up: in tears, infected on 2.2& (her ︿ inks to a blot, resolves as ω).
  { n: 10, where: 'girl', host: '(◕︿◕✿)', infected: '(◕ω◕✿)', why: 'the Lichtenstein girl' },
  // Club 2.3–2.4e, P2, the Kirby panel: flexing, infected on 2.4e.
  { n: 11, where: 'flexer', host: 'ᕦ(ò_óˇ)ᕤ', infected: 'ᕦ(òωóˇ)ᕤ', why: 'the Kirby flexer' },
  // Club 3, THE RECORD: three Busby Berkeley chorus lines (one face repeated round each ring: 6, 10, 16), heads out.
  { n: 12, where: 'ring1', host: '(∩︵∩)', infected: '(∩ω∩)', why: 'ring 1 ×6, eyes shut, then the pinwheel' },
  { n: 13, where: 'ring2', host: '／(=✿ x ✿=)＼', infected: '／(=✿ω✿=)＼', why: 'ring 2 ×10: the FLOWER' },
  { n: 14, where: 'ring3', host: 'v( ‘.’ )v', infected: 'v( ‘ω’ )v', why: 'ring 3 ×16, arms up: the star points' },
  // Club 4.3, inside the lens: the dancers the antivirus sees as carriers (PAPER X-ray silhouettes); hops 1–3 tagged `carrier`.
  { n: 15, where: 'lens', host: 'Σ>―(〃°ω°〃)♡→', infected: 'Σ>―(〃°ω°〃)♡→', why: 'hop 1: cupid, already ω' },
  { n: 16, where: 'lens', host: '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', infected: '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', why: 'hop 2: shy, already ω' },
  { n: 17, where: 'lens', host: '(*´ー)ﾉ(ノд`)', infected: '(*´ω)ﾉ(ノω`)', why: 'hop 3: one consoles the other, both infected' },
  { n: 18, where: 'lens', host: '(-ω-、)', infected: '(-ω-、)', why: 'dozing on the floor, already ω (replaces (´-ω-`), a cosmos web node)' },
  { n: 19, where: 'lens', host: '(｡ŏ﹏ŏ)', infected: '(｡ŏωŏ)', why: 'worried' },
  { n: 20, where: 'lens', host: '(ｔ▽ｔ)', infected: '(ｔωｔ)', why: 'happy tears' },
  // Club 5.4, the reaction balloons popping round the frame as he is thrown (with "!!" and "?!").
  { n: 21, where: 'reaction', host: '(((( ;°Д°))))', infected: '(((( ;°ω°))))', why: 'shaking' },
  { n: 22, where: 'reaction', host: 'o(〒﹏〒)o', infected: 'o(〒ω〒)o', why: 'wailing (replaces (ᗒᗩᗕ), which renders as the hero’s >ω< eyes)' },
  { n: 23, where: 'reaction', host: '(个_个)', infected: '(个ω个)', why: 'streaming tears' },
  { n: 24, where: 'reaction', host: '(ｏ・_・)ノ”(ノ_<、)', infected: '(ｏ・ω・)ノ”(ノω<、)', why: 'patting a crier' },
  { n: 25, where: 'reaction', host: '(◞‸◟)', infected: '(◞ω◟)', why: 'crestfallen' },
  { n: 26, where: 'reaction', host: '｡ﾟ(｡ﾉωヽ｡)ﾟ｡', infected: '｡ﾟ(｡ﾉωヽ｡)ﾟ｡', why: 'crying into its hands, already ω (replaces (っ´ω`)ﾉ(╥ω╥), which holds a cosmos node)' },
];
/** Club 5.2, lights out: the friends we met, left only as their own eyes (from cast 10, 11, 4, 12, 13, 14, 19, 2), one pair blinking a sixteenth. */
const DARK_EYES = [
  { n: 10, eyes: '◕◕' },
  { n: 11, eyes: 'òó' },
  { n: 4, eyes: '⌒⌒' },
  { n: 12, eyes: '∩∩' },
  { n: 13, eyes: '✿✿' },
  { n: 14, eyes: '‘’' },
  { n: 19, eyes: 'ŏŏ' },
  { n: 2, eyes: '´`' },
];
/** The faces (•ω•) wears in the club (his type; amber; ε=┌(•ω•)┘ kicks the cocktail; the flight's faces a beat each; the glass's (×ω×) is v04's neon). */
const HERO = {
  inked: '(•ω•)',
  cheer: 'ヽ(•ω•)ノ',
  point: '(•ω•)ノ',
  flex: 'ᕦ(•ω•)ᕤ',
  kick: 'ε=┌(•ω•)┘',
  drop: 'ヽ(•ω•)',
  sweat: '(•ω•;)',
  flight: ['Σ(°ω°;)', '(°ω°)', '(ﾟωﾟ;)', '(⊙ω⊙)', '(>ω<)'],
  dying: '(×ω×)',
};
/** The guest, the antivirus: calm (sunglasses drawn), wet under the cherry, his eyes igniting red in the dark, red by overprint; the ︵ of the throw. */
const GUEST = { calm: '(￣▽￣)', wet: '(・_・)', redEyes: '(°_°)', rage: '(╯°□°)╯', arc: '︵' };
/** The cat DJ (headphones drawn), peeking over the inset. */
const CAT = '(=^･ω･^=)';
/** The balloons' marks: her thought "…" → "♪", the guest's "…", his "!", the reaction balloons' "!!" and "?!". */
const MARKS = ['…', '♪', '!', '!!', '?!'];
/** The club's most recognisable friends for the ending's curtain call, best first: the Lichtenstein girl, the flexer, the FLOWER. */
const FEATURED = ['(◕ω◕✿)', 'ᕦ(òωóˇ)ᕤ', '／(=✿ω✿=)＼'];

// ——— The checks ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Mouth glyphs a host may swap for ω (spaces aside): the collection's mouths. */
const MOUTH = new Set([...'_ー︿︵ε､▽ヮДд﹏‸.xｴ']);
/** `infected` is `host` with mouth glyphs swapped for ω (spaces aside), or `host` itself when it already wears ω. */
const twin = (host, infected) => {
  const a = [...host.replace(/\s/gu, '')];
  const b = [...infected.replace(/\s/gu, '')];
  if (host === infected) return host.includes('ω');
  if (a.length !== b.length) return false;
  let swapped = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!MOUTH.has(a[i]) || b[i] !== 'ω') return false;
    swapped++;
  }
  return swapped > 0;
};
/** The guest's family (￣), the hero's panic eyes (⊙, ＞ ＜, > then <) and his own •ω•. */
const forbidden = (face) => /[￣⊙＞＜]|>[^<]*<|•\s*ω\s*•/u.test(face);

/** The club's own files, skipped when looking for the faces elsewhere. */
const OWN = new Set(['src/score/club.ts', 'src/content/club.ts', 'src/content/castClub.ts', 'scripts/castClub.mjs']);
const isOwn = (rel) => OWN.has(rel) || /^src\/(shots|scenes)\/clubInk[^/]*\.ts$/u.test(rel) || /^src\/compositions\/ClubInk\.tsx$/u.test(rel);
const LIT = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/gu;
const literals = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(path.join(KX, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|mjs)$/u.test(e.name) && !isOwn(rel)) {
      for (const m of fs.readFileSync(path.join(KX, rel), 'utf8').matchAll(LIT)) literals.push({ text: m[1] ?? m[2] ?? m[3], file: rel });
    }
  }
};
walk('src');
walk('scripts');
const faceKeys = new Set(collection.map((e) => key(e.face)));
/** A literal counts as a face if it is one of the collection's, or a bracketed non-ASCII string; at least 4 characters either way. */
const elsewhere = literals.map((l) => ({ ...l, key: key(l.text) })).filter((l) => l.key.length >= 4 && (faceKeys.has(l.key) || (/[()（）ʕʔ]/u.test(l.key) && /[^\x00-\x7f]/u.test(l.key))));
const recurring = new Set([...Object.values(HERO).flat(), ...Object.values(GUEST), CAT].map(key));
/** The ending's curtain call brings every world's headliner back on stage by design (src/content/outro.ts HEADLINERS, castCurtain.ts). */
const OUTRO = await import('../src/content/outro.ts');
const curtainFile = path.join(KX, 'src', 'content', 'castCurtain.ts');
const CURTAIN = fs.existsSync(curtainFile) ? await import('../src/content/castCurtain.ts') : {};
const curtain = new Set([...(OUTRO.HEADLINERS ?? []).map((h) => h.face), ...Object.values(CURTAIN).flatMap((v) => (Array.isArray(v) ? v.flat(2) : [v])).filter((v) => typeof v === 'string')].map(key));
const usedElsewhere = (face) => elsewhere.find((l) => !curtain.has(l.key) && (l.key.includes(key(face)) || key(face).includes(l.key)));

if (FRIENDS.length !== 26 || new Set(FRIENDS.map((f) => f.n)).size !== 26) fail('26 friends, numbered 1–26 once each');
const seen = new Map();
for (const f of FRIENDS) {
  const e = entry.get(f.host);
  if (!e) fail(`${f.host} is not in the collection`);
  if (!e.renders) fail(`${f.host} does not render`);
  if (!twin(f.host, f.infected)) fail(`${f.infected} is not ${f.host} with its mouth re-inked as ω`);
  for (const face of new Set([f.host, f.infected])) {
    if (!plain(face)) fail(`${face} has combining marks`);
    if (!draws(face, 'rounded')) fail(`${face} does not draw in the rounded stack`);
    if (forbidden(face)) fail(`${face} wears the guest's or the hero's eyes`);
    if (/[凸🖕︻═]/u.test(face)) fail(`${face} is rude`);
    if (recurring.has(key(face))) fail(`${face} is the hero's, the guest's or the cat's`);
    const hit = usedElsewhere(face);
    if (hit) fail(`${face} is already in the film: ${JSON.stringify(hit.text)} in ${hit.file}`);
    if (seen.has(key(face)) && seen.get(key(face)) !== f.n) fail(`${face} repeats cast ${seen.get(key(face))}`);
    seen.set(key(face), f.n);
  }
}
for (const d of DARK_EYES) {
  const f = FRIENDS.find((x) => x.n === d.n);
  if (!f || ![...d.eyes].every((c) => f.infected.includes(c))) fail(`${d.eyes} are not cast ${d.n}'s eyes`);
  if (!draws(d.eyes, 'rounded')) fail(`${d.eyes} do not draw in the rounded stack`);
}
for (const [name, faces] of Object.entries(HERO)) {
  for (const f of [faces].flat()) {
    if (!f.includes('ω')) fail(`hero ${name}: ${f} has no ω`);
    if (!draws(f, 'rounded')) fail(`hero ${name}: ${f} does not draw in the rounded stack`);
    if (entry.get(f)?.moods.includes('wink & smug')) fail(`hero ${name}: ${f} winks (the film has one wink: the ending's)`);
  }
}
for (const f of [...Object.values(GUEST), CAT, ...MARKS]) if (!draws(f, 'rounded')) fail(`${f} does not draw in the rounded stack`);
if (!entry.get(GUEST.calm)?.renders || !entry.get(CAT)?.renders) fail('the guest and the cat are collection faces that draw');

// ——— The file ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const q = (s) => JSON.stringify(s);
const list = (faces) => `[${faces.map(q).join(', ')}]`;
const at = (where) => FRIENDS.filter((f) => f.where === where);
const one = (where) => at(where)[0];
const drawn = [...new Set([...FRIENDS.flatMap((f) => [f.host, f.infected]).filter((face) => face === one('girl').host || face === one('flexer').host || FRIENDS.some((f) => f.infected === face)), ...Object.values(HERO).flat(), ...Object.values(GUEST), CAT])];
const out = `// Generated by scripts/castClub.mjs from the club's build sheet (notes/b58/club-sheet.md §7) — do not edit by hand; change the picks
// there and re-run it. The comic club's cast: 26 friends, each a collection face shown once in the film (infected: its mouth re-inked as
// his amber ω), none anywhere else in the film (NFKC, spaces aside); only the hero, the guest and the cat come back, on purpose.

/** A friend: cast number (the sheet's), the collection face, and the face the club prints (its ω twin, or itself when it already wears ω). */
export type Friend = { readonly n: number; readonly host: string; readonly infected: string };

/** Club 1.2&: the splash crowd, left to right on its arc (infected from the start). */
export const CROWD: readonly Friend[] = [
${at('crowd').map((f) => `  { n: ${f.n}, host: ${q(f.host)}, infected: ${q(f.infected)} },`).join('\n')}
];
/** Club 2.1–2.2&: P1's Lichtenstein girl, infected on 2.2&. */
export const GIRL: Friend = { n: ${one('girl').n}, host: ${q(one('girl').host)}, infected: ${q(one('girl').infected)} };
/** Club 2.3–2.4e: P2's Kirby flexer, infected on 2.4e. */
export const FLEXER: Friend = { n: ${one('flexer').n}, host: ${q(one('flexer').host)}, infected: ${q(one('flexer').infected)} };
/** Club bar 3: the Busby Berkeley rings (inner to outer) and how many dancers each holds. */
export const RINGS: readonly { readonly friend: Friend; readonly count: number }[] = [
${['ring1', 'ring2', 'ring3'].map((w, i) => `  { friend: { n: ${one(w).n}, host: ${q(one(w).host)}, infected: ${q(one(w).infected)} }, count: ${[6, 10, 16][i]} },`).join('\n')}
];
/** Club 4.3: the dancers inside the lens (the first three are the reticle's hops, tagged \`carrier\`). */
export const LENS_FACES: readonly Friend[] = [
${at('lens').map((f) => `  { n: ${f.n}, host: ${q(f.host)}, infected: ${q(f.infected)} },`).join('\n')}
];
/** Club 5.4: the reaction balloons (with "!!" and "?!", REACTION_MARKS), in the order they pop. */
export const REACTIONS: readonly Friend[] = [
${at('reaction').map((f) => `  { n: ${f.n}, host: ${q(f.host)}, infected: ${q(f.infected)} },`).join('\n')}
];
export const REACTION_MARKS: readonly string[] = ["!!", "?!"];
/** Club 5.2, lights out: the friends as their own eye pairs only, at fixed spots, one pair blinking on each sixteenth. */
export const DARK_EYES: readonly string[] = ${list(DARK_EYES.map((d) => d.eyes))};
/** The faces (•ω•) wears in the club; the flight's a beat each from the throw; the glass's (×ω×) is v04's neon (src/shots/lines.ts HERO.dying). */
export const HERO_INK = {
${Object.entries(HERO).map(([k, v]) => `  ${k}: ${Array.isArray(v) ? list(v) : q(v)},`).join('\n')}
} as const;
/** The guest (the antivirus): calm with his sunglasses up, wet under the cherry, his eyes red in the dark, red by overprint; the throw's arc. */
export const GUEST_INK = {
${Object.entries(GUEST).map(([k, v]) => `  ${k}: ${q(v)},`).join('\n')}
} as const;
/** The cat DJ. */
export const CAT_INK = ${q(CAT)};
/** The balloons' marks. */
export const MARKS: readonly string[] = ${list(MARKS)};
/** Every face the club draws, for the later sections' casts to exclude. */
export const CLUB_CAST: readonly string[] = ${list(drawn)};
/** The club's most recognisable friends, best first (all ≤ 6 em wide), for the ending's curtain call (scripts/castCurtain.mjs takes FEATURED[0]). */
export const FEATURED: readonly string[] = ${list(FEATURED)};
`;
if (process.argv.includes('--print')) process.stdout.write(out);
else {
  fs.writeFileSync(path.join(KX, 'src', 'content', 'castClub.ts'), out);
  console.log(`26 friends (${new Set(FRIENDS.map((f) => key(f.infected))).size} faces printed), ${DARK_EYES.length} eye pairs, the hero, the guest, the cat: ${drawn.length} faces drawn, none elsewhere in the film`);
}
