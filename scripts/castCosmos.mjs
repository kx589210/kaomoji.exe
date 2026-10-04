// Casts the transition and the cosmos (bars 13–20 on the 58-bar map, "VERTIGO ∞ · LIGHTSPEED PRESS") from the design's cast
// (notes/cosmos3/final.md §10, the prototype's arrays in cosmos3/w/j1.js; build sheet notes/bcos/sheet.md §8) and checks
// every pick before writing src/content/castCosmos.ts:
//   - every face is a face of docs/reference/kaomoji-collection.json that draws (`renders`), or one the film keeps on purpose (his own
//     forms, the Defender, the spec's named friends in src/content/text.ts CAST), and every character draws in the role it is drawn in:
//     the print films and gates of bars 13–14 in Noto Sans JP Black (`jp`), every face of 15–20 in M PLUS Rounded 1c ExtraBold
//     (`rounded`), each drawn whole as one card (a combining mark rides with its base);
//   - ω is his: no host (film, gate, Earth, galaxy, web, the Sun's card, the Moon's, a crowd) wears it, every infected face does (Neptune,
//     the cat, already does); a named host flips to the design's twin (an ω face of its family) unless a slip below gives it another, a
//     crowd host to its real twin (its mouth glyphs swapped for ω) when the collection has one; no host wears the Defender's ￣ or his
//     panic eyes (⊙, ＞ ＜, > … <); no ￣ω￣ or (￣(ω)￣) anywhere (the interlude's spoiler); nothing rude;
//   - many different faces: none already on screen elsewhere in the film — every face-like string literal in src/ and scripts/ outside
//     the cosmos's own files counts, both ways (the face inside a literal, a literal inside the face), NFKC with whitespace stripped —
//     except the faces that come back on purpose (his forms, the Defender, the cat, the spec's named friends, the ending's curtain-call
//     headliners, drop 2's undrawn SPARES). The v04 drop 1 (src/content/castDrop1.ts and drop1.ts, src/shots/kosmos.ts, voyage.ts,
//     burst.ts, galaxies.ts, lines.ts, glass.ts, scripts/cast.mjs) is retired by the new cosmos and the comic club and does not count. A
//     cast script whose generated file exists counts through that file;
//   - the crowds (Earth's 24k cards, the galaxy's 60k stars, the web's 300 nodes) are hosts taken in FNV-1a hash order from the happy,
//     surprised, neutral and cute moods, none repeated in the cosmos, each flipping to its real twin or a hashed pick of the free ω faces;
//     a face wider than 7 characters is marked `wide` (kept off cards under 28 px).
// The design's list was checked against the collection only; the faces it shares with sections cast since are swapped (SLIPS, each
// with its reason). It throws on the first failure and writes nothing. Re-run it whenever another section casts.
//   node scripts/castCosmos.mjs [--print]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCoverage } from './lib/cmap.mjs';
import { readCollection } from './lib/collection.mjs';

const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FONT_FILES, STACKS } = await import('../src/engine/fonts.ts');
const { CAST } = await import('../src/content/text.ts');
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
/** The identity of a face: NFKC with whitespace stripped. */
const key = (face) => face.normalize('NFKC').replace(/\s/gu, '');
/** The face without combining marks and spaces (his •ω• with brows is still his). */
const bare = (face) => face.normalize('NFD').replace(/[̀-ͯ]/gu, '').replace(/\s/gu, '');
const plain = (face) => [...face].every((c) => !/[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︀-️︠-︯​-‏]/u.test(c));
const fnv = (s) => {
  let h = 0x811c9dc5;
  for (const b of Buffer.from(s, 'utf8')) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h;
};
const fail = (why) => {
  throw new Error(`castCosmos: ${why}`);
};

// ——— The design's cast (final.md §10), as designed ——————————————————————————————————————————————————————————————————————————————

/**
 * His forms (cast.ts, content/build.ts, content/drop2.ts, content/castBreak.ts): the sun he hides in, the point, the printed face, his card
 * and ream, his city light, Earth's face, the chase hero, his node, the disc rider. `look`: his look back at us on the warp's first glance
 * (4.1&), ( ・ω・)? (story bible, 2026-10-01: his look into the lens), in place of the design's (•ω•)ノ.
 */
const HERO = { face: '(•ω•)', wave: 'ヽ(•ω•)ノ', look: '( ・ω・)?', top: '(>ω<)', sun: '✺◟( • ω • )◞✺' };
/** The antivirus: the web node (cosmos 5), the sandbox post (6). Never infected. */
const DEFENDER = '(￣▽￣)';
const CAT = '(=^･ω･^=)';
/** Bars 13–14: the print films' knocked-out faces, B and P films only, swapping pose in unison on the waltz steps; the gate faces. */
const FILM_POSES = [
  ['(＾▽＾)', '(☆▽☆)'],
  ['(◕‿◕)', '(≧▽≦)'],
  ['(・_・)', '(°o°)'],
];
const GATES = ['(☆▽☆)', '(≧▽≦)', '(°o°)'];
/** Cosmos 1: the bang's face-part cards (single glyphs, no ω: ω is his) and the ✦. */
const PARTS = ['(', ')', '•', '・', '°', '＾', '▽', '◕', '‿', '≧', '≦', '☆', '✧', '♡', '∀', 'ᴥ', '〇', '□', '✦'];
/** Cosmos 1: the ream's layers and the fountain (no repeat inside 24 layers; the front sheet is always him); the CME's ~300 faces. */
const REAM = ['(´・ω・`)', '(o･ω･o)', '(✧ω✧)', '(☆ω☆)', '(●´ω｀●)', '(｡･ω･｡)', '(◡ ω ◡)', '(´• ω •`)', '(＾ω＾)', '( ˘ω˘ )', '∪･ω･∪', '( Φ ω Φ )', '(=ФωФ=)', '(´,,•ω•,,)♡', '(♥ω♥)', '(=゜ω゜)ノ', '(⌒ω⌒)', '(* ^ ω ^)', '(*≧ω≦*)', 'o(>ω<)o', '(★ω★)', '(⊙ω⊙)', '(´｡• ω •｡`)', '(｀・ω・´)'];
/** Cosmos 2: Earth's named hosts and their twins (cards, blue ocean / pink land; the back is the amber twin). */
const EARTH = [
  ['(・_・)', '(・ω・)'],
  ['(＾▽＾)', '(＾ω＾)'],
  ['(´∀｀)', '(´ω｀)'],
  ['(*´∀`*)', '(*´ω`*)'],
  ['(•‿•)', '(´• ω •`)'],
  ['(◕‿◕)', '(^˵◕ω◕˵^)'],
  ['(⌒‿⌒)', '(⌒ω⌒)'],
  ['(◠‿◠)', '(◡ ω ◡)'],
  ['(o^▽^o)', '(o･ω･o)'],
  ['(｡•ᴗ•｡)', '(｡･ω･｡)'],
];
/** Cosmos 2.2: the faces ahead of the wave flinch (host → flinch) and stay flinched until the front reaches them. */
const FLINCH = [
  ['(・_・)', 'Σ(O_O)'],
  ['(＾▽＾)', '(⊙_⊙)'],
  ['(´∀｀)', '(°o°)'],
];
const MOON = ['(－_－) zzZ', '(－ω－) zzZ'];
/** Cosmos 3: the Sun's card, and him (✺◟( • ω • )◞✺) when it turns over. */
const SUN = '(⌒▽⌒)☆';
/** Cosmos 3: the planets' rings of kinetic type: name, host, its real ω twin (Neptune is the cat, already ω), ring radius. */
const PLANETS = [
  ['MERCURY', 'ヽ(°〇°)ﾉ', 'ヽ(*・ω・)ﾉ', 0.8],
  ['VENUS', '(°▽°)/', '(*・ω・)ﾉ', 1.25],
  ['EARTH', HERO.face, HERO.face, 1.75],
  ['MARS', '(ง •̀_•́)ง', '(ง•̀ω•́)ง✧', 2.3],
  ['JUPITER', 'ʕ•ᴥ•ʔ', 'ʕ•̀ω•́ʔ✧', 3.4],
  ['SATURN', '(¯▿¯)', '( ˘ω˘ )', 4.3],
  ['URANUS', 'ᕕ( ᐛ )ᕗ', '⁽⁽◝( • ω • )◜⁾⁾', 5.2],
  ['NEPTUNE', CAT, CAT, 6.0],
];
/** Cosmos 4: the galaxy's named stars (host → twin; the last two hosts only, readable on the glances). */
const GALAXY = [
  ['(☆▽☆)', '(☆ω☆)'],
  ['(✯◡✯)', '(★ω★)'],
  ['(o^▽^o)', '(o･ω･o)'],
  ['(*^▽^*)', '(* ^ ω ^)'],
  ['(｡•ᴗ•｡)', '(｡･ω･｡)'],
  ['(≧▽≦)', '(*≧ω≦*)'],
  ['(◕‿◕✿)', null],
  ['(✿◠‿◠)', null],
];
/** Cosmos 5: the web's named nodes (host → twin); on the scan (5.4) each flips back to its host. */
const WEB = [
  ['(⊙_⊙)', '(⊙ω⊙)'],
  ['(;_;)', '(;ω;)'],
  ['(=_=)', '(=ω=)'],
  ['(T_T)', '(｡T ω T｡)'],
  ['(╥_╥)', '( ╥ω╥ )'],
  ['(`ー´)', '( `ω´ )'],
  ['(*´▽`*)', '(*´ω`*)'],
  ['(・∀・)', '(・ω・)ノ'],
  ['(´-_-`)', '(´-ω-`)'],
  ['(>_<)', 'o(>ω<)o'],
  ['(ᵔᴥᵔ)', '∪･ω･∪'],
  ['(o_O)', '(´⊙ω⊙`)！'],
];
/** Cosmos 5.4&: every infected face relights with a wink (the crowd's, never his: the film's one wink of his is the ending's). */
const WINKS = ['(^ω~)', '(>ω^)', '(･ω<)☆', '(・ω<)☆', '(*ゝω・)ﾉ☆'];

// ——— Slips: the design's faces that other sections have cast since (2026-10-01), swapped ——————————————————————————————————————

/** [where, design face, cast face, reason]. Applied in order to the tables above before any check. */
const SLIPS = [
  ['film pose 1, gate 1', '(☆▽☆)', '(★^O^★)', 'in src/content/build.ts (the approved Swiss/Riso bars); star eyes kept'],
  ['film pose 2, gate 2', '(≧▽≦)', '(o´▽`o)', 'in src/content/build.ts and castDrop2.ts'],
  ['film pose 3', '(・_・)', '(´･ᴗ･`)', 'the club’s wet guest (castClub.ts GUEST_INK.wet)'],
  ['film pose 3, gate 3, flinch 3', '(°o°)', '(○o○)', 'in src/content/build.ts'],
  ['Earth 1', '(・_・) → (・ω・)', '(/_＼) → (/ω＼)', 'the club’s wet guest; the one free real-twin pair left in the collection'],
  ['Earth 3', '(´∀｀) → (´ω｀)', '(o´∀`o) → (o´ω`o)ﾉ', 'both in castDrop2.ts; its twin is the collection’s waving one'],
  ['Earth 7 twin', '(⌒ω⌒)', '(っ˘ω˘ς )', 'castBreak.ts (the guest’s wave (⌒ω⌒)ﾉ)'],
  ['flinch 1, flinch 2', '(・_・) → Σ(O_O), (＾▽＾) → (⊙_⊙)', '(＾▽＾) → Σ(O_O), (•‿•) → (๏Д๏)', '(・_・) is the wet guest; ⊙ is his panic eyes (the break’s re-roll, the club’s flight)'],
  ['flinch 3 host', '(´∀｀)', '(o´∀`o)', 'follows Earth 3'],
  ['galaxy 1', '(☆▽☆) → (☆ω☆)', '(★^O^★) → (つ✧ω✧)つ', 'build.ts; (☆ω☆) is in castBreak.ts and castDrop2.ts'],
  ['galaxy 4 twin', '(* ^ ω ^)', '☆ﾐ(o*･ω･)ﾉ', 'castDrop2.ts ((*＾ω＾)人(＾ω＾*))'],
  ['galaxy 6', '(≧▽≦) → (*≧ω≦*)', '(o´▽`o) → ヾ(・ω・*)ノ', 'build.ts, castDrop2.ts; (*≧ω≦*) is in castBreak.ts'],
  ['web 1', '(⊙_⊙) → (⊙ω⊙)', '(O.O) → (・ω・)', '⊙ is his panic eyes (castBreak.ts re-roll, castClub.ts flight)'],
  ['web 10', '(>_<) → o(>ω<)o', '(ﾉ_ヽ) → (ノωヽ)', 'o(>ω<)o is in castBreak.ts; > … < is his top-note face, so the host goes too'],
  ['ream', '(☆ω☆)', '(//ω//)', 'castBreak.ts, castDrop2.ts'],
  ['ream', '(⌒ω⌒)', '(=♡ω♡=)', 'castBreak.ts'],
  ['ream', '(* ^ ω ^)', '(^・ω・^ )', 'castDrop2.ts'],
  ['ream', '(*≧ω≦*)', '(・`ω´・)', 'castBreak.ts'],
  ['ream', 'o(>ω<)o', '(´ ω `♡)', 'castBreak.ts; > … < is his'],
  ['ream', '(⊙ω⊙)', '(*ﾉωﾉ)', 'castBreak.ts, castClub.ts (his panic eyes)'],
  ['Uranus twin', '⁽⁽◝( • ω • )◜⁾⁾', '(♡ω♡ ) ~♪', 'a dancer of the break’s (castBreak.ts) in his own •ω• eyes: an infected planet is a friend, not him'],
  ['Moon twin', '(－ω－) zzZ', '( ˘ω˘ )', 'story bible, 2026-10-01: the Moon’s sleeping face repeated his closed eyes (－ω－); the one free sleepy ω face; the card keeps its zzZ as type (content/cosmos.ts MOON_ZZZ)'],
  ['Saturn twin', '( ˘ω˘ )', '♡(.◜ω◝.)♡', 'the Moon’s now; its ♡ … ♡ ring the face as Saturn’s rings do'],
  ['ream', '( ˘ω˘ )', '(o･ω･)ﾉ))', 'the Moon’s now'],
];
const setPair = (list, i, host, twin) => {
  list[i] = [host, twin];
};
// Applied by hand, row by row, so each slip reads as one line above.
FILM_POSES[0][1] = '(★^O^★)';
FILM_POSES[1][1] = '(o´▽`o)';
FILM_POSES[2] = ['(´･ᴗ･`)', '(○o○)'];
GATES.splice(0, 3, '(★^O^★)', '(o´▽`o)', '(○o○)');
setPair(EARTH, 0, '(/_＼)', '(/ω＼)');
setPair(EARTH, 2, '(o´∀`o)', '(o´ω`o)ﾉ');
EARTH[6][1] = '(っ˘ω˘ς )';
FLINCH.splice(0, 3, ['(＾▽＾)', 'Σ(O_O)'], ['(•‿•)', '(๏Д๏)'], ['(o´∀`o)', '(○o○)']);
setPair(GALAXY, 0, '(★^O^★)', '(つ✧ω✧)つ');
GALAXY[3][1] = '☆ﾐ(o*･ω･)ﾉ';
setPair(GALAXY, 5, '(o´▽`o)', 'ヾ(・ω・*)ノ');
setPair(WEB, 0, '(O.O)', '(・ω・)');
setPair(WEB, 9, '(ﾉ_ヽ)', '(ノωヽ)');
PLANETS[6][2] = '(♡ω♡ ) ~♪';
MOON[1] = '( ˘ω˘ )';
PLANETS[5][2] = '♡(.◜ω◝.)♡';
for (const [, from, to] of SLIPS.filter((s) => s[0] === 'ream')) REAM[REAM.indexOf(from)] = to;

// ——— The checks ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Mouth glyphs a host may swap for ω (spaces aside). */
const MOUTH = new Set([...'_ー︿︵ε､▽ヮДд﹏‸.xｴ‿ᴗ∀o〇◡ロ□∇ᗜ']);
/** `twin` is `host` with mouth glyphs swapped for ω (spaces aside). */
const realTwin = (host, twin) => {
  const a = [...host.replace(/\s/gu, '')];
  const b = [...twin.replace(/\s/gu, '')];
  if (a.length !== b.length) return false;
  let swapped = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!MOUTH.has(a[i]) || b[i] !== 'ω') return false;
    swapped++;
  }
  return swapped > 0;
};
const isHero = (face) => /•ω•/u.test(bare(face)) || face === HERO.top || face === HERO.look;
/** No host wears the Defender's ￣, his panic eyes or his top-note face; nobody wears ￣ω￣, (￣(ω)￣) or a rude gesture. */
const hostForbidden = (face) => /[￣‾⊙＞＜◎]|>[^<]*<|°□°|°ロ°/u.test(face) || face.includes('ω');
const forbidden = (face) => /￣ω￣|\(￣\(ω\)￣\)|\*￣▽￣\)b|[凸🖕︻═]/u.test(face.replace(/\s/gu, '')) || ['(•ω•)☆', '(ﾟoﾟ)', '(◎_◎)'].includes(face);

/** The cosmos's own files (skipped when looking for its faces elsewhere) and the retired v04 drop 1. */
const OWN = (rel) =>
  /^src\/(score|content)\/(cosmos|transition|castCosmos)\.ts$/u.test(rel) ||
  /^src\/(scenes|shots)\/(cosmos|transition)[^/]*\.ts$/u.test(rel) ||
  /^scripts\/(castCosmos\.mjs|audio\/(sections\/(cosmos|transition)\.mjs|(lift|cosmos)Voices\.mjs))$/u.test(rel);
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
/** The faces that come back on purpose: his forms, the Defender, the cat, the spec's named friends, the curtain call, drop 2's spares. */
const OUTRO = await import('../src/content/outro.ts');
const D2 = await import('../src/content/castDrop2.ts');
const recurring = new Set([DEFENDER, CAT, ...CAST, ...(OUTRO.HEADLINERS ?? []).map((h) => h.face)].map(key));
const spares = new Set((D2.SPARES ?? []).map(key));
const usedElsewhere = (face) => (isHero(face) || recurring.has(key(face)) ? undefined : elsewhere.find((l) => !spares.has(l.key) && !recurring.has(l.key) && !isHero(l.text) && (l.key.includes(key(face)) || key(face).includes(l.key))));

/** Checks one face in its role: drawn, allowed, not cast elsewhere. `host` faces must not wear ω; `infected` ones must. */
function check(face, role, kind, where) {
  const known = entry.get(face)?.renders || isHero(face) || face === DEFENDER || recurring.has(key(face));
  if (!known) fail(`${where}: ${face} is not a rendering face of the collection`);
  if (!draws(face, role)) fail(`${where}: ${face} does not draw in the ${role} stack`);
  if (forbidden(face)) fail(`${where}: ${face} is forbidden (￣ω￣, a Defender-shaped ω, a constructed or non-rendering face, or rude)`);
  if (kind === 'host' && hostForbidden(face)) fail(`${where}: the host ${face} wears ω, the Defender's ￣ or his eyes`);
  if (kind === 'infected' && !face.includes('ω')) fail(`${where}: the infected ${face} has no ω`);
  const hit = usedElsewhere(face);
  if (hit) fail(`${where}: ${face} is already in the film: ${JSON.stringify(hit.text)} in ${hit.file}`);
}
/** A named host and its twin: the design's pairs (its twins are the collection's ω faces of the host's family; a slip's are picks). */
const pair = (host, twin, where) => {
  check(host, 'rounded', 'host', where);
  if (twin !== null) check(twin, 'rounded', 'infected', where);
};

for (const f of Object.values(HERO)) check(f, 'rounded', 'hero', 'hero');
check(DEFENDER, 'rounded', 'defender', 'the Defender');
FILM_POSES.flat().forEach((f) => check(f, 'jp', 'host', 'print film'));
GATES.forEach((f) => check(f, 'jp', 'host', 'gate'));
for (const p of PARTS) if (!draws(p, 'rounded') || p === 'ω') fail(`bang part ${p}: drawn in the rounded stack, never ω`);
REAM.forEach((f) => check(f, 'rounded', 'infected', 'ream'));
if (new Set(REAM.map(key)).size !== 24) fail('the ream has 24 different layers');
EARTH.forEach(([h, t]) => pair(h, t, 'Earth'));
FLINCH.forEach(([h, f]) => {
  check(h, 'rounded', 'host', 'flinch');
  check(f, 'rounded', 'host', 'flinch');
});
check(MOON[0], 'rounded', 'host', 'Moon');
check(MOON[1], 'rounded', 'infected', 'Moon');
check(SUN, 'rounded', 'host', 'the Sun');
for (const [name, host, twin] of PLANETS) {
  if (!draws(name, 'display')) fail(`${name} does not draw in the display stack`);
  if (host === CAT) continue;
  if (host === HERO.face) continue;
  pair(host, twin, name);
}
GALAXY.forEach(([h, t]) => pair(h, t, 'galaxy'));
WEB.forEach(([h, t]) => pair(h, t, 'web'));
WINKS.forEach((f) => check(f, 'rounded', 'infected', 'wink'));

// ——— The crowds ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A crowd face is nobody in particular: none of the Defender's ￣, his eyes (⊙, ◎, > … <), the guest's °□° / °ロ°, the cat or a named friend. */
/** His look into the lens (story bible, 2026-10-01): his alone, whoever casts. */
const HIS_LOOK = '( ・ω・)?';
const crowdBad = (face) => /[￣‾⊙☉＞＜◎]|>[^<]*<|°□°|°ロ°/u.test(face) || [...recurring].some((k) => key(face).includes(k)) || key(face) === key(HIS_LOOK);
const named = new Set([...FILM_POSES.flat(), ...GATES, ...REAM, ...EARTH.flat(), ...FLINCH.flat(), ...MOON, SUN, ...PLANETS.flatMap((p) => [p[1], p[2]]), ...GALAXY.flat().filter(Boolean), ...WEB.flat(), ...WINKS, ...Object.values(HERO), DEFENDER].map(key));
const MOODS = ['happy', 'surprised & scared', 'shrug & indifferent', 'cute'];
const ok = (face) => {
  try {
    check(face, 'rounded', 'host', 'crowd');
    return plain(face) && [...face].length <= 10;
  } catch {
    return false;
  }
};
const hosts = collection
  .filter((e) => e.renders && e.moods.some((m) => MOODS.includes(m)) && !e.moods.includes('wink & smug') && !named.has(key(e.face)))
  .map((e) => e.face)
  .filter((f) => ok(f) && !crowdBad(f))
  .sort((a, b) => fnv(a) - fnv(b));
const seenKey = new Set();
const uniqueHosts = hosts.filter((f) => (seenKey.has(key(f)) ? false : (seenKey.add(key(f)), true)));
const omegaPool = collection
  .filter((e) => e.renders && e.face.includes('ω') && !e.moods.includes('wink & smug') && !named.has(key(e.face)))
  .map((e) => e.face)
  .filter((f) => {
    try {
      check(f, 'rounded', 'infected', 'crowd ω');
      return plain(f) && [...f].length <= 10 && !isHero(f) && !crowdBad(f);
    } catch {
      return false;
    }
  })
  .sort((a, b) => fnv(a) - fnv(b));
if (omegaPool.length < 8) fail(`only ${omegaPool.length} free ω faces for the crowds`);
/** Hosts a crowd level: 20 of the ~70 free ones, leaving room for the sections that cast after the cosmos. */
const POOL = 20;
if (uniqueHosts.length < 3 * POOL) fail(`only ${uniqueHosts.length} free crowd hosts for 3 × ${POOL}`);
const crowd = (k) =>
  uniqueHosts.slice(k * POOL, (k + 1) * POOL).map((host) => {
    const real = collection.find((e) => e.renders && realTwin(host, e.face) && omegaPool.includes(e.face));
    const infected = real ? real.face : omegaPool[fnv(host) % omegaPool.length];
    return { host, infected, wide: [...host].length > 7 || [...infected].length > 7 };
  });
const CROWDS = { earth: crowd(0), galaxy: crowd(1), web: crowd(2) };

// ——— The file ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const q = (s) => JSON.stringify(s);
const list = (faces) => `[${faces.map(q).join(', ')}]`;
const pairs = (ps) => `[\n${ps.map(([h, t]) => `  { host: ${q(h)}, infected: ${t === null ? 'null' : q(t)} },`).join('\n')}\n]`;
const crowdList = (cs) => `[\n${cs.map((c) => `  { host: ${q(c.host)}, infected: ${q(c.infected)}, wide: ${c.wide} },`).join('\n')}\n]`;
const drawn = [...new Set([...Object.values(HERO), DEFENDER, ...FILM_POSES.flat(), ...GATES, ...REAM, ...EARTH.flat(), ...FLINCH.flat(), ...MOON, SUN, ...PLANETS.flatMap((p) => [p[1], p[2]]), ...GALAXY.flat().filter(Boolean), ...WEB.flat(), ...WINKS, ...Object.values(CROWDS).flat().flatMap((c) => [c.host, c.infected])])];
const out = `// Generated by scripts/castCosmos.mjs from the design's cast (notes/cosmos3/final.md §10; build sheet notes/bcos/sheet.md §8)
// — do not edit by hand; change the picks there and re-run it. The transition's and the cosmos's faces: his forms; the Defender; the print
// films and gates of bars 13–14 (Noto Sans JP Black: \`jp\`); every face of 15–20 drawn whole on a card (M PLUS Rounded 1c ExtraBold:
// \`rounded\`). Hosts never wear ω; each infected face does (his). None is on screen elsewhere in the film but the faces that come back on
// purpose; SLIPS lists the design's faces swapped for that.

/** A host and the face it flips to when infected (its real ω twin, or a slip's pick); null: a host only. */
export type Infection = { readonly host: string; readonly infected: string | null };
/** A crowd member: \`wide\` faces (over 7 characters) stay off cards under 28 px. */
export type CrowdFace = { readonly host: string; readonly infected: string; readonly wide: boolean };

/** His forms: the face; the wave (1.2, 4.1a); his look back at us (4.1&, into the lens); the top note (>ω<); the Sun when it turns over (3.3). */
export const HERO_FACES = { face: ${q(HERO.face)}, wave: ${q(HERO.wave)}, look: ${q(HERO.look)}, top: ${q(HERO.top)}, sun: ${q(HERO.sun)} } as const;
/** The antivirus (cosmos 5's red-shielded node, cosmos 6's sandbox operator). */
export const DEFENDER_FACE = ${q(DEFENDER)};
/** Bars 13–14: the print films' pose pairs (B and P films only; Y films carry light), swapping in unison on each waltz step. */
export const FILM_POSES: readonly (readonly [string, string])[] = [${FILM_POSES.map((p) => list(p)).join(', ')}];
/** Bars 13–14: the gates' 320 px knocked-out faces, in turn. */
export const GATE_FACES: readonly string[] = ${list(GATES)};
/** Cosmos 1: the bang's face-part cards (single glyphs; no ω) and the ✦. */
export const BANG_PARTS: readonly string[] = ${list(PARTS)};
/** Cosmos 1: the ream's 24 layers (the front sheet is always him), the card fountain and the CME's loops of faces. */
export const REAM_FACES: readonly string[] = ${list(REAM)};
/** Cosmos 2: Earth's named hosts and their twins. */
export const EARTH_HOSTS: readonly Infection[] = ${pairs(EARTH)};
/** Cosmos 2.2: host → flinch, ahead of the wave. */
export const FLINCH_FACES: readonly { readonly host: string; readonly flinch: string }[] = [${FLINCH.map(([h, f]) => `{ host: ${q(h)}, flinch: ${q(f)} }`).join(', ')}];
/** Cosmos 2.3&: the Moon's card, before and after the beam. */
export const MOON_FACES: Infection = { host: ${q(MOON[0])}, infected: ${q(MOON[1])} };
/** Cosmos 3: the Sun's card (his ✺ face when it turns over: HERO_FACES.sun). */
export const SUN_FACE = ${q(SUN)};
/** Cosmos 3: the planets' rings of kinetic type (name, host, twin, ring radius in Earth-ring units of the design's 1.75). */
export const PLANETS: readonly { readonly name: string; readonly host: string; readonly infected: string; readonly r: number }[] = [
${PLANETS.map(([n, h, t, r]) => `  { name: ${q(n)}, host: ${q(h)}, infected: ${q(t)}, r: ${r} },`).join('\n')}
];
/** Cosmos 4: the galaxy's named stars (the last two hosts only). */
export const GALAXY_STARS: readonly Infection[] = ${pairs(GALAXY)};
/** Cosmos 5: the web's named nodes; on the scan each flips back to its host. */
export const WEB_NODES: readonly Infection[] = ${pairs(WEB)};
/** Cosmos 5.4&: the relight's winks, by hash (the crowd's; he never winks here). */
export const WINKS: readonly string[] = ${list(WINKS)};
/** The crowds, ${POOL} hosts a level (FNV-1a order from the happy, surprised, neutral and cute moods; none twice in the cosmos). */
export const CROWDS: { readonly earth: readonly CrowdFace[]; readonly galaxy: readonly CrowdFace[]; readonly web: readonly CrowdFace[] } = {
  earth: ${crowdList(CROWDS.earth).replace(/\n/gu, '\n  ')},
  galaxy: ${crowdList(CROWDS.galaxy).replace(/\n/gu, '\n  ')},
  web: ${crowdList(CROWDS.web).replace(/\n/gu, '\n  ')},
};
/** The design's faces swapped because another section cast them first: where, the design's face, the cast face, why. */
export const SLIPS: readonly (readonly [string, string, string, string])[] = [
${SLIPS.map((s) => `  ${list(s)},`).join('\n')}
];
/** Every face the transition and the cosmos draw, for the later sections' casts to exclude. */
export const COSMOS_CAST: readonly string[] = ${list(drawn)};
`;
if (process.argv.includes('--print')) process.stdout.write(out);
else {
  fs.writeFileSync(path.join(KX, 'src', 'content', 'castCosmos.ts'), out);
  console.log(`cosmos cast: ${drawn.length} faces (${CROWDS.earth.length + CROWDS.galaxy.length + CROWDS.web.length} crowd hosts, ${SLIPS.length} slips), none elsewhere in the film`);
}
