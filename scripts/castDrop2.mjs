// Casts drop 2's and the ending's kaomoji (build sheet notes/bid2/drop2-sheet2.md §8; the as-built picks: notes/d2build/sheet.md
// §7.2) and checks them: every face is in the collection (docs/reference/kaomoji-collection.json) and marked `renders`, every character
// is in the font stack of the role that draws it, no rude gesture, no face twice in drop 2 and the ending, and none already cast
// elsewhere in the film — Drop 1 (src/content/castDrop1.ts), the break (src/content/castBreak.ts) or any other on-screen string —
// compared by NFKC key (spaces aside) and by a near-twin skeleton (combining marks, brows and quotes stripped), except the three who come
// back on purpose: the hero, the guest and the cat. The 20-bar drop 2 adds no new face but the guest's: Defender is the guest, so its
// avatar's states, the rowers, the cannon and the athlete are his variants (GUEST_VARIANTS), and the guest is infected from the interlude
// on ((￣ω￣)). A composed variant (the infected guest's wave) is not in the collection: it is checked for its glyphs and for the guest's
// face inside it. The picks are by hand (the sheet's), in the order the shots use them. Writes src/content/castDrop2.ts.
//   node scripts/castDrop2.mjs [--print | --check]
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readCoverage } from './lib/cmap.mjs';
import { readCollection } from './lib/collection.mjs';

const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FONT_FILES, STACKS } = await import('../src/engine/fonts.ts');
const collection = readCollection(KX);

// ——— The picks (sheet §7.2): [face, font role, where] ——————————————————————————————————————————————————————————————————————————

const PICKS = {
  S27_CAST: [
    ['°˖✧◝(⁰▿⁰)◜✧˖°', 'mono', 'S27 terminal region: the log column (pink)'],
    ['....φ(・∀・*)', 'mono', 'S27 terminal region: the log column (pink), taking notes'],
    ['( ´ ∀ `)ノ～ ♡', 'jp', 'S27 Swiss region: the face in a grid cell, waving on the open hats through 27.2'],
  ],
  S28_CAST: [
    ['ヽ(∀° )人( °∀)ノ', 'jp', 'S28 Swiss face: friend groups'],
    ['＼(＾∀＾)メ(＾∀＾)ノ', 'jp', 'S28 Swiss face: friend groups'],
    ['(*＾ω＾)人(＾ω＾*)', 'jp', 'S28 Swiss face: friend groups'],
    ['o(^^o)(o^^o)(o^^o)(o^^)o', 'jp', 'S28 Swiss face: friend groups'],
    ['(((￣(￣(￣▽￣)￣)￣)))', 'jp', 'S28 Riso face: the pink nested faces'],
    ['(°(°ω(°ω°(☆ω☆)°ω°)ω°)°)', 'jp', 'S28 Riso face: the blue nested faces'],
    ['☆*:.｡.o(≧▽≦)o.｡.:*☆', 'dot', 'S28 LED face: the second marquee row'],
    ['ヽ( ⌒o⌒)人(⌒-⌒ )ﾉ', 'dot', 'S28 LED face: the third marquee row'],
    ['♪♬((d⌒ω⌒b))♬♪', 'rounded', 'S28 neon face: tube dancers'],
    ['♬♫♪◖(● o ●)◗♪♫♬', 'rounded', 'S28 neon face: tube dancers'],
    ['ヽ(≧◡≦)八(o^ ^o)ノ', 'rounded', 'S28 neon face: tube dancers'],
  ],
  S30_VOX: [
    ['(ﾉ´ヮ´)ﾉ*:･ﾟ✧', 'jp', 'S30 VOX note 2880'],
    ['˚✧₊⁎(˃ᴗ˂)⁎⁺˳✧', 'jp', 'S30 VOX note 2892'],
    ['(*˘︶˘*).｡.:*♡', 'jp', 'S30 VOX note 2898'],
    ['(∩˃o˂∩)♡', 'jp', 'S30 VOX note 2916'],
    ['｡ﾟ( ﾟ^∀^ﾟ)ﾟ｡', 'jp', 'S30 VOX note 2928'],
    ['(⊃｡•́‿•̀｡)⊃', 'jp', 'S30 VOX note 2952'],
    ['\\( ˙▿˙ )/( ˙▿˙ )/', 'jp', 'S30 VOX note 2964'],
  ],
  S30_KICK: [
    ['(๑•̀ㅁ•́๑)✧', 'jp', 'S30 KICK note 2880'],
    ['ᕦ( ͡° ͜ʖ ͡°)ᕤ', 'jp', 'S30 KICK note 2904'],
    ['ヽ(≧Д≦)ノ', 'jp', 'S30 KICK note 2928'],
    ['(☞ ͡° ͜ʖ ͡°)☞', 'jp', 'S30 KICK note 2952'],
  ],
  S30_CLAP: [
    ['(*・∀・)爻(・∀・*)', 'jp', 'S30 CLAP note 2904'],
    ['Ψ( `∀)(∀´ )Ψ', 'jp', 'S30 CLAP note 2952'],
  ],
  S31_GAUGE: [
    ['(x_x)', 'jp', 'S31 gauge fill: dizzy faces'],
    ['(☆_@)', 'jp', 'S31 gauge fill: dizzy faces'],
    ['☆(＃××)', 'jp', 'S31 gauge fill: dizzy faces'],
    ['(×_×)⌒☆', 'jp', 'S31 gauge fill: dizzy faces'],
    ['(ﾒ﹏ﾒ)', 'jp', 'S31 gauge fill: dizzy faces'],
    ['(×﹏×)', 'jp', 'S31 gauge fill: dizzy faces'],
    ['@_@', 'jp', 'S31 gauge fill: dizzy faces'],
    ['[ ± _ ± ]', 'jp', 'S31 gauge fill: dizzy faces'],
  ],
  REEL_CAST: [
    ['ヽ(￣д￣;)ノ=3=3=3', 'rounded', 'bar 33 neon card: the cyan tube runner'],
    ['─=≡Σ((( つ＞＜)つ', 'dot', 'bar 33 LED card: the marquee'],
    ['ε=ε=┌( >_<)┘', 'dot', 'bar 33 LED card: the marquee'],
    ['( ´ ω ` )ノﾞ', 'jp', 'bar 33 Swiss card: waving in a cell'],
  ],
};
/** The three who come back on purpose (ruling 10): the hero is the film's own; the guest and the cat are named here. */
const RETURNING = {
  GUEST: ['(￣▽￣)', 'rounded', 'E10: the guest with a fresh cocktail (amber neon tube), bars 34.1–34.2'],
  GUEST_FLIP: ['(╯°□°)╯︵ ┻━┻', 'mono', 'the crash log: the guest flips the table and leaves'],
  GUEST_WAVE: ['(￣▽￣)/♫•*¨*•.¸¸♪', 'dot', 'S28 LED face: the first marquee row, the guest waving'],
  CAT: ['(=^･ω･^=)', 'jp', 'bar 33 Riso card: the cat in the blue plate'],
  GUEST_INFECTED: ['(￣ω￣)', 'rounded', 'E10 (drop2 19.1–19.3): the guest, infected since the interlude — a red neon tube with an amber ω, the reticle as a party hat; Defender’s avatar after the touché (drop2 15.2)'],
  GUEST_V1: ['(￣ω￣;)', 'mono', 'Defender v1 (infected, sweating): W1’s red row (drop2 1.2) and the kernel’s slot (drop2 8)'],
};
/**
 * Defender is the guest: its avatar's states in the v2.0 scoreboard (sweating on the first breach, shocked on the line clear, giving up),
 * the rowers of the wave's boats, the arcade's cannon, the pictograms' red athlete. Drawn red; an ω on them amber.
 */
const GUEST_VARIANTS = [
  ['(；￣Д￣)', 'jp', 'Defender v2.0’s avatar after the first breach (drop2 11.3); the arcade’s cannon (drop2 12, in pixels)'],
  ['(￣□￣」)', 'jp', 'the wave’s rowers looking up (drop2 10.3); Defender v2.0’s avatar after the line clear (drop2 13.4)'],
  ['╮(￣ω￣;)╭', 'jp', 'Defender giving up (drop2 17.4): the big type and the avatar'],
];
/** Composed variants of a returning face (not in the collection: checked for their glyphs and for the guest's face inside). */
const COMPOSED = {
  GUEST_WAVE_INFECTED: ['(￣ω￣)/♫•*¨*•.¸¸♪', 'dot', 'S28 LED face: the first marquee row, the guest waving — infected since the interlude (logged change)'],
};
/**
 * Fresh, checked, unused: for a builder who needs one more (each still to be listed with its role when used). The first four were S27's
 * Riso bear, neon dancer and LED marquee pair until iteration 2 (ruling 11) took the friends out of drop2 1.3–1.4's panels.
 */
const SPARES = ['ʕ•̀ω•́ʔ✧', '( ˘ ɜ˘) ♬♪♫', '♪♪(o*゜∇゜)o～♪♪', '(((o(*°▽°*)o)))', '(ﾉ≧∇≦)ﾉ ﾐ ┸┸', 'ʕ •̀ o •́ ʔ', '＼( ˋ Θ ´ )／', '(｡•́︿•̀｡)', '(┬┬﹏┬┬)', 'ψ(▼へ▼メ)～→', '(＃＞＜)', '▓▒░(°◡°)░▒▓', '(⊙︿⊙)', '{{ (>_<) }}', '(ʘ ͟ʖ ʘ)', '(｡╯︵╰｡)', '(◞︿◟)', 'ε===(っ≧ω≦)っ'];

// ——— The checks ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

const key = (face) => face.normalize('NFKC').replace(/\s/gu, '');
const MARKS = /\p{M}/gu;
/**
 * A face's near-twin skeleton: its key with combining marks, brows and quote-like strokes stripped. The guest's eyes ￣ are kept (as =):
 * NFKC turns ￣ into a space and a combining macron, so stripping marks would make every (￣ω￣)… the twin of a friend with the same mouth.
 */
const skeleton = (face) => key(face.replace(/￣/gu, '=')).normalize('NFD').replace(MARKS, '').replace(/[ˋˊ`´'‘’]/gu, '');
const RUDE = /凸|╭∩╮|︻|═一|🖕/u;
const SPACE = new Set([0x20, 0x3000]);
const byKey = new Map(collection.map((e) => [key(e.face), e]));
const byFamily = new Map();
for (const f of FONT_FILES) {
  const cov = readCoverage(fs.readFileSync(path.join(KX, 'public', f.file)));
  byFamily.set(f.family, new Set([...(byFamily.get(f.family) ?? []), ...cov]));
}
const tofu = (face, role) => [...face].filter((c) => !SPACE.has(c.codePointAt(0)) && !STACKS[role].some((fam) => byFamily.get(fam)?.has(c.codePointAt(0))));

/** Every string elsewhere in the film: Drop 1's and the break's casts and every other section's on-screen strings. */
const elsewhere = [];
const collect = (value, where) => {
  for (const x of [value].flat(3)) {
    if (typeof x === 'string') elsewhere.push([x, where]);
    else if (x && typeof x === 'object' && typeof x.text === 'string') elsewhere.push([x.text, where]);
    else if (x && typeof x === 'object' && !Array.isArray(x)) for (const v of Object.values(x)) collect(v, where);
  }
};
for (const mod of ['castDrop1', 'castBreak', 'text', 'boot', 'build', 'drop1', 'break']) {
  const file = path.join(KX, 'src', 'content', `${mod}.ts`);
  if (!fs.existsSync(file)) continue;
  const m = await import(`../src/content/${mod}.ts`);
  for (const [name, value] of Object.entries(m)) collect(value, `${mod}.${name}`);
}
/** Faces that may already be in the film: the guest's two (his calm face and his table flip) and the cat. */
const ALLOWED = new Set([RETURNING.GUEST, RETURNING.GUEST_FLIP, RETURNING.CAT, RETURNING.GUEST_INFECTED, RETURNING.GUEST_V1, ...GUEST_VARIANTS].map(([f]) => key(f)));

const problems = [];
const seen = new Map();
const check = (face, role, where, own = true) => {
  const e = byKey.get(key(face));
  if (!e) problems.push(`${face}: not in the collection (${where})`);
  else if (!e.renders) problems.push(`${face}: the collection says it does not render (${where})`);
  const missing = tofu(face, role);
  if (missing.length) problems.push(`${face}: ${missing.join(' ')} missing from the ${role} stack (${where})`);
  if (RUDE.test(face)) problems.push(`${face}: rude (${where})`);
  if (!own) return;
  for (const [k2, w2] of seen) {
    if (k2 === key(face)) problems.push(`${face}: twice in drop 2 and the ending (${where}; ${w2.where})`);
    else if (w2.skeleton === skeleton(face)) problems.push(`${face}: a near twin of ${w2.face} (${where}; ${w2.where})`);
  }
  seen.set(key(face), { face, where, skeleton: skeleton(face) });
  if (ALLOWED.has(key(face))) return;
  for (const [s, w] of elsewhere) {
    if (key(s) === key(face)) problems.push(`${face}: already in the film (${w})`);
    else if (skeleton(s) === skeleton(face)) problems.push(`${face}: a near twin of ${s} (${w})`);
    else if (key(face).length >= 5 && key(s).includes(key(face))) problems.push(`${face}: already on screen inside "${s}" (${w})`);
  }
};
for (const [list, picks] of Object.entries(PICKS)) for (const [face, role, where] of picks) check(face, role, `${list}: ${where}`);
for (const [name, [face, role, where]] of Object.entries(RETURNING)) check(face, role, `${name}: ${where}`);
for (const [face, role, where] of GUEST_VARIANTS) check(face, role, `GUEST_VARIANTS: ${where}`);
for (const [name, [face, role, where]] of Object.entries(COMPOSED)) {
  const missing = tofu(face, role);
  if (missing.length) problems.push(`${face}: ${missing.join(' ')} missing from the ${role} stack (${name})`);
  if (!/￣[ω▽]￣/u.test(face)) problems.push(`${face}: a composed variant must carry the guest's face (${name})`);
  if (RUDE.test(face)) problems.push(`${face}: rude (${name})`);
}
// A spare that clashes with anything is dropped from the list rather than failing the cast.
for (const face of [...SPARES]) {
  const before = problems.length;
  check(face, 'jp', 'spare');
  if (problems.length > before) {
    problems.length = before;
    seen.delete(key(face));
    SPARES.splice(SPARES.indexOf(face), 1);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`CAST  ${p}`);
  process.exit(1);
}

// ——— The file ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const entry = ([face, role, where]) => `  { face: ${JSON.stringify(face)}, role: '${role}', where: ${JSON.stringify(where)} },`;
const list = (name, doc, picks) => `/** ${doc} */\nexport const ${name}: readonly CastFace[] = [\n${picks.map(entry).join('\n')}\n];\n`;
const one = (name, doc, pick) => `/** ${doc} */\nexport const ${name}: CastFace = ${entry(pick).trim().replace(/,$/, '')};\n`;
const DOCS = {
  S27_CAST: 'S27: the quiet motifs through drop2 1.2 (the log column’s two friends, the Swiss cell’s); from drop2 1.3 his face is the subject.',
  S28_CAST: 'S28: the cube faces’ motifs — Swiss friend groups, Riso nested faces, LED marquee rows, neon tube dancers.',
  S30_VOX: 'S30: the VOX lane’s notes, in hit order (the hook’s notes of drop2 bar 5).',
  S30_KICK: 'S30: the KICK lane’s notes, in hit order.',
  S30_CLAP: 'S30: the CLAP lane’s notes, in hit order.',
  S31_GAUGE: 'S31: the dizzy faces packed into the overflowing gauge (cycling, 22 px).',
  REEL_CAST: 'The reel (drop2 18, as built): the cards’ motifs (neon, LED, Swiss); the Riso card’s cat is CAT.',
};
const out = `// Generated by scripts/castDrop2.mjs from the build sheet's picks (notes/d2build/sheet.md §7.2) — do not edit by hand; change the
// picks there and re-run it. Drop 2's and the ending's cast: many different faces, none twice and none already cast in Drop 1 or the
// break (NFKC and near twins), but the hero, the guest and the cat, who come back on purpose. Each face is drawn whole, as one atlas
// key, in the font role listed (check-glyphs checks it through src/content/drop2.ts and outro.ts).
import type { FontRole } from '../engine/fonts.ts';

export type CastFace = { face: string; role: FontRole; where: string };

${Object.entries(PICKS).map(([name, picks]) => list(name, DOCS[name], picks)).join('\n')}
${one('GUEST', 'The guest (drop 1’s cocktail guest), back with a fresh cocktail for the last drop (E10).', RETURNING.GUEST)}
${one('GUEST_FLIP', 'The guest flips the table and leaves: a line of the crash log.', RETURNING.GUEST_FLIP)}
${one('GUEST_WAVE', 'The guest waving in S28’s LED marquee, as built (the marquee now shows GUEST_WAVE_INFECTED).', RETURNING.GUEST_WAVE)}
${one('CAT', 'The Riso cat, home on the reel’s Riso card (drop2 18).', RETURNING.CAT)}
${one('GUEST_INFECTED', 'The guest infected (since the interlude): E10’s face, red with an amber ω, wearing the reticle hat; Defender’s avatar after the touché.', RETURNING.GUEST_INFECTED)}
${one('GUEST_V1', 'Defender v1, infected and sweating: W1’s red row and the kernel’s slot.', RETURNING.GUEST_V1)}
${one('GUEST_WAVE_INFECTED', 'The guest waving in S28’s LED marquee, infected (a composed variant of GUEST_WAVE).', COMPOSED.GUEST_WAVE_INFECTED)}
${list('GUEST_VARIANTS', 'Defender is the guest: its avatar’s states, the rowers, the cannon, the athlete. Not in CAST_DROP2 (the curtain wall leaves the guest out; its principal() test does not catch ￣Д￣ or ￣□￣).', GUEST_VARIANTS)}
/** Fresh, checked, unused faces, for a builder who needs one more. */
export const SPARES: readonly string[] = ${JSON.stringify(SPARES)};

/** Every face drop 2 draws, each once: the guest (his infected faces too) and the cat included, the guest's other variants, the hero and the ending's log not. */
export const CAST_DROP2: readonly string[] = [...${Object.keys(PICKS).join(', ...')}, GUEST_WAVE_INFECTED, CAT, GUEST, GUEST_INFECTED, GUEST_V1].map((c) => c.face);
`;
if (process.argv.includes('--print')) process.stdout.write(out);
else if (process.argv.includes('--check')) console.log(`cast OK: ${seen.size} faces, ${SPARES.length} spares`);
else {
  fs.writeFileSync(path.join(KX, 'src', 'content', 'castDrop2.ts'), out);
  console.log(`castDrop2.ts: ${seen.size} faces checked, ${SPARES.length} spares`);
}
